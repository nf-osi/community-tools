const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const Ajv = require('ajv');
const cookieSession = require('cookie-session');

const ajv = new Ajv({ allErrors: true });
const validateIdea = ajv.compile(require('./schemas/idea.json'));

const OAUTH_CLIENT_ID = process.env.SYNAPSE_OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.SYNAPSE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI_ENV = process.env.OAUTH_REDIRECT_URI;
const POST_LOGIN_URL = process.env.POST_LOGIN_URL || '/';

function getRedirectUri(req) {
  if (REDIRECT_URI_ENV) return REDIRECT_URI_ENV;
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}/oauth/callback`;
}
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieSession({
  name: 'session',
  keys: [SESSION_SECRET],
  maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
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
  console.log('[auth/login] state:', state);
  const claims = JSON.stringify({
    userinfo: {
      userid: null,
      user_name: null,
    },
  });
  const redirectUri = getRedirectUri(req);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'openid profile',
    claims,
    state,
    nonce,
  });
  res.redirect(`https://signin.synapse.org?${params}`);
});

// GET /oauth/callback — exchange code, store user in session
app.get('/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query;
  console.log('[oauth/callback] oauthState:', req.session.oauthState, '| query state:', state, '| code present:', !!code);

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
    const redirectUri = getRedirectUri(req);
    const tokenResp = await axios.post(
      `${SYNAPSE_AUTH_BASE}/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
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

    const { sub, user_name, userid } = userResp.data;
    const synapseId = userid != null ? parseInt(String(userid), 10) || undefined : undefined;
    console.log('[oauth/callback] userinfo:', { sub, user_name, userid, synapseId });
    req.session.user = { id: sub, synapseId, username: user_name || sub };
    console.log('[oauth/callback] session saved, redirecting to', POST_LOGIN_URL);

    res.redirect(POST_LOGIN_URL);
  } catch (err) {
    console.error('[oauth/callback] token exchange error:', err.response?.data || err.message);
    res.redirect(`${POST_LOGIN_URL}?auth_error=token_exchange_failed`);
  }
});

// GET /api/auth/session — return current session user (null if not logged in)
app.get('/api/auth/session', (req, res) => {
  console.log('[auth/session] user:', req.session.user || null);
  res.json({ user: req.session.user || null });
});

// POST /api/auth/logout — clear session
app.post('/api/auth/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
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
          communitySubmitted: parsed.communitySubmitted === true || parsed.communitySubmitted === 'true',
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
    const submitterId = req.session.user.synapseId;

    // Validate user-supplied fields + server-resolved submitter; exclude submitterId
    // (server-generated, not user input)
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
      submitterId,
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
    const userId = req.session.user.synapseId ? String(req.session.user.synapseId) : null;
    if (!userId) {
      return res.status(400).json({ error: 'Could not resolve your Synapse user ID — please log out and log in again' });
    }

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

module.exports = app;
