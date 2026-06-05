const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const Ajv = require('ajv');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ajv = new Ajv({ allErrors: true });
const validateIdea = ajv.compile(require('./schemas/idea.json'));

const app = express();
app.use(cors());
app.use(express.json());

const SYNAPSE_BASE = 'https://repo-prod.prod.sagebase.org/repo/v1';
const IDEAS_PARENT = 'syn75281274';
const DISCUSSION_PROJECT = 'syn75279249';

function getAuthToken() {
  const token = process.env.SYNAPSE_AUTH_TOKEN;
  if (!token) throw new Error('SYNAPSE_AUTH_TOKEN is not set');
  return token;
}

function synapseHeaders() {
  return {
    Authorization: `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json',
  };
}

// Keys that store multiple values and should always be returned as arrays
const MULTI_VALUE_KEYS = new Set(['voters']);

// Flatten Synapse annotations v2 format into a plain object
function parseAnnotations(annoData) {
  const result = {};
  for (const [key, val] of Object.entries(annoData.annotations || {})) {
    const values = val.value ?? [];
    result[key] = MULTI_VALUE_KEYS.has(key) ? values : (values.length > 0 ? values[0] : null);
  }
  return result;
}

// Build Synapse annotations v2 format from a plain object
function buildAnnotations(id, etag, data) {
  const annotations = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      annotations[key] = { type: 'STRING', value: value.map(String) };
    } else if (typeof value === 'boolean') {
      annotations[key] = { type: 'BOOLEAN', value: [value] };
    } else if (typeof value === 'number') {
      annotations[key] = { type: 'LONG', value: [value] };
    } else {
      annotations[key] = { type: 'STRING', value: [String(value)] };
    }
  }
  return { id, etag, annotations };
}

// GET /api/ideas — list all ideas from Synapse
app.get('/api/ideas', async (req, res) => {
  try {
    const headers = synapseHeaders();

    const childrenResp = await axios.post(
      `${SYNAPSE_BASE}/entity/children`,
      {
        parentId: IDEAS_PARENT,
        includeTypes: ['folder'],
        sortBy: 'CREATED_ON',
        sortDirection: 'DESC',
      },
      { headers }
    );

    const children = childrenResp.data.page || [];

    // Fetch annotations for all children in parallel; skip failures
    const results = await Promise.allSettled(
      children.map(async (child) => {
        const annoResp = await axios.get(
          `${SYNAPSE_BASE}/entity/${child.id}/annotations2`,
          { headers }
        );
        const parsed = parseAnnotations(annoResp.data);
        return {
          id: child.id,
          ...parsed,
          votes: Number(parsed.votes ?? 0),
          voters: parsed.voters ?? [],
          communitySubmitted: parsed.communitySubmitted !== false,
        };
      })
    );

    const ideas = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);

    if (results.some((r) => r.status === 'rejected')) {
      console.warn(
        'Some annotation fetches failed:',
        results.filter((r) => r.status === 'rejected').map((r) => r.reason?.message)
      );
    }

    res.json(ideas);
  } catch (err) {
    console.error('GET /api/ideas error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data?.reason || err.message,
    });
  }
});

// POST /api/ideas — create a new idea folder + discussion thread
app.post('/api/ideas', async (req, res) => {
  try {
    const headers = synapseHeaders();
    const {
      title,
      summary,
      submitter,
      priority,
      ideaType,
      focusArea,
      affectedUserType,
      grantTag,
      suggestedFunding,
    } = req.body;

    if (!validateIdea(req.body)) {
      const errors = validateIdea.errors.map((e) => {
        const field = e.instancePath.replace(/^\//, '') || e.params?.missingProperty || 'request';
        return `${field}: ${e.message}`;
      });
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Create folder with short hash name
    const hash = crypto.randomBytes(4).toString('hex');
    const folderResp = await axios.post(
      `${SYNAPSE_BASE}/entity`,
      {
        concreteType: 'org.sagebionetworks.repo.model.Folder',
        name: hash,
        parentId: IDEAS_PARENT,
      },
      { headers }
    );

    const folderId = folderResp.data.id;

    // Set initial annotations (no threadId yet)
    const annotationData = {
      title,
      summary,
      submitter,
      priority: priority || 'Medium',
      status: 'Proposed',
      votes: 0,
      voters: [],
      communitySubmitted: true,
      ...(ideaType && { ideaType }),
      ...(focusArea && { focusArea }),
      ...(affectedUserType && { affectedUserType }),
      ...(grantTag && { grantTag }),
      ...(suggestedFunding && { suggestedFunding }),
    };

    const annoResp1 = await axios.put(
      `${SYNAPSE_BASE}/entity/${folderId}/annotations2`,
      buildAnnotations(folderId, folderResp.data.etag, annotationData),
      { headers }
    );

    // Create discussion thread in the project forum
    let threadId = null;
    try {
      const forumResp = await axios.get(
        `${SYNAPSE_BASE}/project/${DISCUSSION_PROJECT}/forum`,
        { headers }
      );
      const forumId = forumResp.data.id;

      const threadResp = await axios.post(
        `${SYNAPSE_BASE}/thread`,
        {
          forumId,
          title,
          messageMarkdown: `**Idea Summary:** ${summary}\n\n*Submitted by Synapse user: \`${submitter}\`*\n\n---\n*Submitted via the NF-OSI Community Roadmap App. Discuss and upvote at the roadmap.*`,
        },
        { headers }
      );
      threadId = threadResp.data.id;
    } catch (threadErr) {
      console.warn('Failed to create discussion thread:', threadErr.response?.data || threadErr.message);
    }

    // Update annotations to include threadId
    let finalEtag = annoResp1.data.etag;
    if (threadId) {
      const annoResp2 = await axios.put(
        `${SYNAPSE_BASE}/entity/${folderId}/annotations2`,
        buildAnnotations(folderId, finalEtag, { ...annotationData, threadId }),
        { headers }
      );
      finalEtag = annoResp2.data.etag;
    }

    res.json({
      id: folderId,
      ...annotationData,
      votes: 0,
      communitySubmitted: true,
      ...(threadId && { threadId }),
    });
  } catch (err) {
    console.error('POST /api/ideas error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data?.reason || err.message,
    });
  }
});

// POST /api/ideas/:id/vote — record voter and increment count
app.post('/api/ideas/:id/vote', async (req, res) => {
  try {
    const headers = synapseHeaders();
    const { id } = req.params;
    const { userId } = req.body; // optional until OAuth is wired up

    const annoResp = await axios.get(
      `${SYNAPSE_BASE}/entity/${id}/annotations2`,
      { headers }
    );

    const currentAnnotations = annoResp.data.annotations || {};
    const currentVoters = currentAnnotations.voters?.value ?? [];
    const currentVotes = Number(currentAnnotations.votes?.value?.[0] ?? 0);

    let newVoters = currentVoters;
    let newVotes;

    if (userId) {
      // OAuth mode: append userId if not already present, derive count from list
      if (currentVoters.includes(userId)) {
        return res.status(409).json({ error: 'User has already voted for this idea' });
      }
      newVoters = [...currentVoters, userId];
      newVotes = newVoters.length;
    } else {
      // Prototype mode: anonymous increment only
      newVotes = currentVotes + 1;
    }

    const updatedAnnotations = {
      ...currentAnnotations,
      voters: { type: 'STRING', value: newVoters },
      votes: { type: 'LONG', value: [newVotes] },
    };

    await axios.put(
      `${SYNAPSE_BASE}/entity/${id}/annotations2`,
      { id, etag: annoResp.data.etag, annotations: updatedAnnotations },
      { headers }
    );

    res.json({ id, votes: newVotes, voters: newVoters });
  } catch (err) {
    console.error('POST /api/ideas/:id/vote error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data?.reason || err.message,
    });
  }
});

// Serve built frontend (production / single-server mode)
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
// SPA fallback — must come after all API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Roadmap app running at http://localhost:${PORT}`);
  if (!process.env.SYNAPSE_AUTH_TOKEN) {
    console.warn('WARNING: SYNAPSE_AUTH_TOKEN is not set. API calls will fail.');
  }
});
