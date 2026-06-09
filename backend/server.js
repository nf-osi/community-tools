const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const Ajv = require('ajv');
const session = require('express-session');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ajv = new Ajv({ allErrors: true });
const validateIdea = ajv.compile(require('./schemas/idea.json'));

const OAUTH_CLIENT_ID = process.env.SYNAPSE_OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.SYNAPSE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://127.0.0.1:9000/oauth/callback';
const POST_LOGIN_URL = process.env.POST_LOGIN_URL || '/';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

const SYNAPSE_BASE = 'https://repo-prod.prod.sagebase.org/repo/v1';
const SYNAPSE_AUTH_BASE = 'https://repo-prod.prod.sagebase.org/auth/v1';
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

// ── Auth routes ──────────────────────────────────────────────────────────────

// GET /api/auth/login — redirect to Synapse authorization endpoint
app.get('/api/auth/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  console.log('[auth/login] session id:', req.sessionID, '| state:', state);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile',
    state,
    nonce,
  });
  res.redirect(`https://signin.synapse.org?${params}`);
});

// GET /oauth/callback — exchange code, store user in session
app.get('/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query;
  console.log('[oauth/callback] session id:', req.sessionID);
  console.log('[oauth/callback] session oauthState:', req.session.oauthState);
  console.log('[oauth/callback] query state:', state);
  console.log('[oauth/callback] code present:', !!code);

  if (error) {
    console.error('[oauth/callback] error from Synapse:', error);
    return res.redirect(`${POST_LOGIN_URL}?auth_error=access_denied`);
  }

  if (!state || state !== req.session.oauthState) {
    console.error('[oauth/callback] state mismatch — expected:', req.session.oauthState, 'got:', state);
    return res.redirect(`${POST_LOGIN_URL}?auth_error=state_mismatch`);
  }
  delete req.session.oauthState;

  try {
    console.log('[oauth/callback] exchanging code for token...');
    const tokenResp = await axios.post(
      `${SYNAPSE_AUTH_BASE}/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }).toString(),
      {
        auth: { username: OAUTH_CLIENT_ID, password: OAUTH_CLIENT_SECRET },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token } = tokenResp.data;
    console.log('[oauth/callback] token exchange succeeded, fetching userinfo...');

    const userResp = await axios.get(`${SYNAPSE_AUTH_BASE}/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { sub, preferred_username } = userResp.data;
    console.log('[oauth/callback] userinfo:', { sub, preferred_username });
    req.session.user = { id: sub, username: preferred_username || sub };
    console.log('[oauth/callback] session saved, redirecting to', POST_LOGIN_URL);

    res.redirect(POST_LOGIN_URL);
  } catch (err) {
    console.error('[oauth/callback] token exchange error:', err.response?.data || err.message);
    res.redirect(`${POST_LOGIN_URL}?auth_error=token_exchange_failed`);
  }
});

// GET /api/auth/session — return current session user (null if not logged in)
app.get('/api/auth/session', (req, res) => {
  console.log('[auth/session] session id:', req.sessionID, '| user:', req.session.user || null);
  res.json({ user: req.session.user || null });
});

// POST /api/auth/logout — destroy session
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// ── Ideas routes ──────────────────────────────────────────────────────────────

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

// POST /api/ideas — create a new idea folder + discussion thread (requires login)
app.post('/api/ideas', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Login required to submit an idea' });
  }

  try {
    const headers = synapseHeaders();
    const {
      title,
      summary,
      priority,
      ideaType,
      focusArea,
      affectedUserType,
      grantTag,
      suggestedFunding,
    } = req.body;

    const submitter = req.session.user.username;

    // Inject submitter (from session) before schema validation
    const bodyWithSubmitter = { ...req.body, submitter };
    if (!validateIdea(bodyWithSubmitter)) {
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

// POST /api/ideas/:id/vote — record voter and increment count (requires login)
app.post('/api/ideas/:id/vote', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Login required to vote' });
  }

  try {
    const headers = synapseHeaders();
    const { id } = req.params;
    const userId = req.session.user.id;

    const annoResp = await axios.get(
      `${SYNAPSE_BASE}/entity/${id}/annotations2`,
      { headers }
    );

    const currentAnnotations = annoResp.data.annotations || {};
    const currentVoters = currentAnnotations.voters?.value ?? [];

    if (currentVoters.includes(userId)) {
      return res.status(409).json({ error: 'You have already voted for this idea' });
    }

    const newVoters = [...currentVoters, userId];
    const newVotes = newVoters.length;

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
