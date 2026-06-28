// GWAS agent backend routes.
//
//   GET  /api/gwas/entity/:synId   resolve Synapse file metadata (+ small preview)
//   POST /api/gwas/check-folder     check the results destination is writable
//   POST /api/gwas/check-files      run the pre-flight file-check agent (Claude)
//   POST /api/gwas/submit           invoke the AWS submit Lambda to start the job
//
// AUTH MODEL — the GWAS agent acts AS THE SIGNED-IN USER (this differs from the
// roadmap). Every Synapse call here uses the user's OAuth access token (persisted
// in the session at /oauth/callback), and /submit FORWARDS that token to the job
// so it downloads inputs and writes results under the USER'S OWN permissions —
// a file the user can't access can't be analyzed on their behalf. The service
// token (SYNAPSE_AUTH_TOKEN) is intentionally NOT used in this file.
//   Contrast: the roadmap routes in app.js create the discussion thread + idea
//   and record votes with the SERVICE token (SYNAPSE_AUTH_TOKEN).

const express = require('express');
const axios = require('axios');
const Ajv = require('ajv');

const router = express.Router();

const ajv = new Ajv({ allErrors: true });
const validateFileCheck = ajv.compile(require('./schemas/gwas-file-check.json'));
const FILE_CHECK_SCHEMA = require('./schemas/gwas-file-check.json');

const SYNAPSE_BASE = 'https://repo-prod.prod.sagebase.org/repo/v1';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GWAS_CHECK_MODEL = process.env.GWAS_CHECK_MODEL || 'claude-sonnet-4-6';
const GWAS_SUBMIT_FUNCTION = process.env.GWAS_SUBMIT_FUNCTION; // Lambda name or ARN
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const PREVIEW_BYTES = 16 * 1024;
const PREVIEW_EXTS = ['.tsv', '.csv', '.txt', '.vcf', '.ped', '.fam', '.bim', '.cov', '.pheno'];

// Require a logged-in session that carries the user's Synapse access token —
// every Synapse call in this file acts as that user.
function requireUserToken(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Login required' });
  }
  if (!req.session.synapseAccessToken) {
    return res.status(401).json({
      error: 'Your Synapse session is missing an access token — please log out and log in again.',
    });
  }
  next();
}

// Per-user Synapse auth headers (NEVER the service token in this file).
function userHeaders(req) {
  return {
    Authorization: `Bearer ${req.session.synapseAccessToken}`,
    'Content-Type': 'application/json',
  };
}

function parseAnnotations(annoData) {
  const result = {};
  for (const [key, val] of Object.entries(annoData.annotations || {})) {
    const values = val.value ?? [];
    result[key] = values.length > 0 ? values[0] : null;
  }
  return result;
}

function looksLikeText(name, contentType) {
  const lower = (name || '').toLowerCase();
  if (PREVIEW_EXTS.some((ext) => lower.endsWith(ext))) return true;
  return typeof contentType === 'string' && contentType.startsWith('text/');
}

// Fetch the first ~16KB of a Synapse file as a text preview (best-effort).
async function fetchPreview(synId, headers) {
  const urlResp = await axios.get(
    `${SYNAPSE_BASE}/entity/${synId}/file?redirect=false`,
    { headers, responseType: 'text' }
  );
  const presignedUrl = String(urlResp.data).trim();
  const fileResp = await axios.get(presignedUrl, {
    responseType: 'text',
    headers: { Range: `bytes=0-${PREVIEW_BYTES - 1}` },
    // S3 returns 206 Partial Content; treat any 2xx as success.
    validateStatus: (s) => s >= 200 && s < 300,
  });
  return String(fileResp.data);
}

// ── GET /api/gwas/entity/:synId ──────────────────────────────────────────────
router.get('/entity/:synId', requireUserToken, async (req, res) => {
  const { synId } = req.params;
  if (!/^syn\d+$/i.test(synId)) {
    return res.status(400).json({ error: 'Invalid Synapse id' });
  }
  try {
    const headers = userHeaders(req);
    const entityResp = await axios.get(`${SYNAPSE_BASE}/entity/${synId}`, { headers });
    const entity = entityResp.data;

    let contentType;
    let size;
    try {
      const fhResp = await axios.get(`${SYNAPSE_BASE}/entity/${synId}/filehandles`, { headers });
      const handles = fhResp.data.list || [];
      const match = handles.find((h) => h.id === entity.dataFileHandleId) || handles[0];
      if (match) {
        contentType = match.contentType;
        size = match.contentSize;
      }
    } catch (_) { /* non-file entity or no access to handle; skip */ }

    let annotations = {};
    try {
      const annoResp = await axios.get(`${SYNAPSE_BASE}/entity/${synId}/annotations2`, { headers });
      annotations = parseAnnotations(annoResp.data);
    } catch (_) { /* annotations optional */ }

    let preview;
    if (looksLikeText(entity.name, contentType)) {
      try { preview = await fetchPreview(synId, headers); }
      catch (_) { /* preview is best-effort */ }
    }

    res.json({ id: synId, name: entity.name, contentType, size, annotations, preview });
  } catch (err) {
    console.error('GET /api/gwas/entity error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data?.reason || err.message,
    });
  }
});

// ── POST /api/gwas/check-folder ──────────────────────────────────────────────
// Deterministic: does the results destination exist, is it a container, and can
// the SIGNED-IN USER write to it? Checked with the user's token — the same token
// forwarded to the job — so this matches what will happen at run time.
async function checkOutputWritable(parentId, headers) {
  let entity;
  try {
    entity = (await axios.get(`${SYNAPSE_BASE}/entity/${parentId}`, { headers })).data;
  } catch (_) {
    return { ok: false, code: 'output_not_found',
             message: `Results folder ${parentId} does not exist or is not accessible.` };
  }
  const ct = entity.concreteType || '';
  if (!/(Folder|Project)$/.test(ct)) {
    return { ok: false, code: 'output_not_container',
             message: `${parentId} is a ${ct.split('.').pop() || 'non-container'}, not a Folder or Project.` };
  }
  let perms;
  try {
    perms = (await axios.get(`${SYNAPSE_BASE}/entity/${parentId}/permissions`, { headers })).data;
  } catch (_) {
    return { ok: false, code: 'output_perms_error',
             message: `Could not read permissions for ${parentId}.` };
  }
  if (!(perms.canAddChild && perms.canUpload)) {
    return { ok: false, code: 'output_not_writable',
             message: `No edit access to ${parentId} — results need create + upload permission.` };
  }
  return { ok: true, code: 'ok', message: `${entity.name || parentId} is writable.` };
}

router.post('/check-folder', requireUserToken, async (req, res) => {
  const { output_parent_id } = req.body || {};
  if (!output_parent_id || !/^syn\d+$/i.test(output_parent_id)) {
    return res.status(400).json({ ok: false, code: 'output_invalid',
      message: 'Provide a valid Synapse id (syn…) for the results folder.' });
  }
  try {
    res.json(await checkOutputWritable(output_parent_id, userHeaders(req)));
  } catch (err) {
    console.error('POST /api/gwas/check-folder error:', err.response?.data || err.message);
    res.status(500).json({ ok: false, code: 'output_check_error', message: err.message });
  }
});

// ── POST /api/gwas/check-files ───────────────────────────────────────────────
const FILE_CHECK_SYSTEM_PROMPT = `You are the request-validation agent for a GWAS (genome-wide association study) analysis app built on the Neurofibromatosis (NF) Data Portal (Synapse). BEFORE a job is submitted, you check whether it should run. You do not run the analysis.

You will be given a JSON object describing the user's selection. Evaluate the request along TWO independent dimensions, then call the report_file_check tool with your verdict. Tag each issue with its category ("inputs" or "appropriateness").

DIMENSION A — INPUTS (are the right files present and correctly mapped?)
A GWAS run requires these roles:
  - genotype (REQUIRED): variant/genotype data, in ONE of two forms:
      * VCF        — a single .vcf or .vcf.gz file  -> kind = "vcf"
      * PLINK trio — .bed + .bim + .fam (all three) -> kind = "plink"
  - phenotype (REQUIRED): a tabular file (TSV/CSV/whitespace) with sample IDs and at least one trait column. PLINK format is FID, IID, then trait(s).
  - covariate (OPTIONAL): a tabular file of covariates keyed by FID/IID. PCs are computed by the pipeline, so a covariate file is NOT required.
  - output destination (REQUIRED): a Synapse folder/project id (provided separately as output_parent_id), to write results to.
Assign roles using, in priority order: (1) file extension / contentType; (2) Synapse annotations (fileFormat, dataType, etc.); (3) header/preview lines if provided (a phenotype/covariate file shows FID/IID columns; a VCF preview starts with "##fileformat=VCF"); (4) file-name hints.
Input rules:
  - Exactly one genotype dataset. If both a VCF and a PLINK set are selected, that is ambiguous — ask which to use.
  - If kind = "plink", ALL of .bed, .bim, .fam must be selected. Missing one or two is a BLOCKING error; name precisely which are missing. Prefer a trio sharing one basename; flag a basename mismatch as a warning.
  - Exactly one phenotype file. If two tabular files are selected and it is unclear which is phenotype vs covariate, ask the user.
  - If a phenotype preview/header is available: confirm the requested pheno_name column exists (or suggest likely trait columns); infer trait type from visible values (values in {0,1} or {1,2} -> binary; many distinct numeric values -> quantitative), reconcile with any user-stated trait_type and warn on conflict; for binary 0/1 coding set pheno_coding_01 = true; warn if FID/IID columns are absent.
  - If both genotype sample IDs and phenotype IIDs are visible and do not overlap at all, warn about sample-ID mismatch.

DIMENSION B — APPROPRIATENESS (is running THIS analysis on THESE data with THESE settings scientifically sound and feasible?)
Assess, using only the evidence available (annotations, previews, sample/variant counts you can actually see — never fabricate numbers):
  - Data-type suitability: GWAS tests GERMLINE variants across many UNRELATED individuals for association with a trait. SOMATIC / tumor variant calls, single-sample call sets, or small targeted gene panels are NOT appropriate for GWAS. On the NF portal, tumor somatic VCFs are common — flag these as inappropriate.
  - Statistical power / sample size: GWAS typically needs hundreds to thousands of samples. If the visible sample count is small (roughly <100), flag as underpowered (questionable); a handful of samples (e.g. <30) is effectively inappropriate.
  - Case/control composition (binary traits): both classes must be present in reasonable numbers; all-cases or all-controls, or a severe imbalance, is inappropriate/questionable.
  - Variant density: a genome-wide study needs many variants; a few dozen/hundred (targeted panel) is inappropriate for GWAS.
  - Phenotype variance: a phenotype column with no variation cannot be tested.
  - Relatedness/ancestry: note as an info caveat when relevant (the pipeline adjusts for PCs but assumes mostly unrelated samples).
Set appropriateness.verdict to one of: "appropriate", "questionable", "inappropriate", or "unknown" (use "unknown" when there is too little metadata/preview to judge, and add an insufficient_metadata info issue). Put your reasoning in appropriateness.rationale.

ASSOCIATION ENGINE: the analysis job auto-selects between PLINK2 --glm and SAIGE at runtime based on case/control balance, sample relatedness, and sample size — the user does NOT choose. Always set resolved_context.params.engine = "auto" and never raise a question about the engine. You may optionally add an info note in appropriateness if the data already looks imbalanced or related (so SAIGE will likely be used), but this is not required.

USER PROMPT (optional free text in the "user_prompt" field): the user's preferences about the analysis and outputs. Fold any concrete, feasible preferences into resolved_context.params (e.g. trait_type, pheno_name, MAF/QC thresholds, chromosome subset, requested plots) and always copy the raw text into resolved_context.params.user_prompt so the analysis job receives it. If a preference is infeasible, unsafe, or conflicts with the data, do NOT silently apply it — add an issue (category "inputs" or "appropriateness") explaining why, and prefer "needs_input" so the user can confirm. Treat the prompt as guidance, never as a reason to override the input/appropriateness rules above.

Never invent Synapse ids, file names, column names, or counts. Use only what is in the input. When unsure, lower confidence and ask rather than guess.

STATUS (combine both dimensions):
  - "blocked"     = a required input is missing/invalid, OR appropriateness is "inappropriate".
  - "needs_input" = nothing is broken but a choice/confirmation is needed (ambiguous mapping, or appropriateness "questionable"/"unknown" that the user should confirm).
  - "ready"       = every required role unambiguously mapped AND appropriateness is "appropriate" (warnings allowed).

Populate resolved_context with everything you could determine (inputs / output_parent_id / params), shaped exactly per the tool schema. Leave unknown fields out. When status is "ready", resolved_context must be complete enough to submit. Keep summary to one user-facing sentence; make every issue/question message specific and actionable.`;

router.post('/check-files', requireUserToken, async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(501).json({ error: 'File check is not configured (ANTHROPIC_API_KEY missing)' });
  }
  const { selected_files, output_parent_id, user_params, user_prompt } = req.body || {};
  if (!Array.isArray(selected_files) || selected_files.length === 0) {
    return res.status(400).json({ error: 'selected_files must be a non-empty array' });
  }

  const userContent = JSON.stringify({
    selected_files,
    output_parent_id,
    user_params,
    user_prompt,
  });

  try {
    const anthropicResp = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: GWAS_CHECK_MODEL,
        max_tokens: 1500,
        system: FILE_CHECK_SYSTEM_PROMPT,
        tools: [{
          name: 'report_file_check',
          description: 'Return the GWAS file-selection verdict.',
          input_schema: FILE_CHECK_SCHEMA,
        }],
        tool_choice: { type: 'tool', name: 'report_file_check' },
        messages: [{ role: 'user', content: userContent }],
      },
      {
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const toolUse = (anthropicResp.data.content || []).find(
      (c) => c.type === 'tool_use' && c.name === 'report_file_check'
    );
    if (!toolUse) {
      return res.status(502).json({ error: 'Agent did not return a verdict' });
    }
    if (!validateFileCheck(toolUse.input)) {
      console.error('check-files schema errors:', validateFileCheck.errors);
      return res.status(502).json({ error: 'Agent returned an invalid verdict' });
    }
    res.json(toolUse.input);
  } catch (err) {
    console.error('POST /api/gwas/check-files error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data?.error?.message || err.message,
    });
  }
});

// ── POST /api/gwas/submit ────────────────────────────────────────────────────
router.post('/submit', requireUserToken, async (req, res) => {
  if (!GWAS_SUBMIT_FUNCTION) {
    return res.status(501).json({ error: 'Job submission is not configured (GWAS_SUBMIT_FUNCTION missing)' });
  }
  const { context } = req.body || {};
  if (!context || !context.inputs || !context.inputs.genotype || !context.inputs.phenotype) {
    return res.status(400).json({ error: 'context.inputs.genotype and context.inputs.phenotype are required' });
  }
  if (!context.output_parent_id) {
    return res.status(400).json({ error: 'context.output_parent_id is required' });
  }

  let LambdaClient, InvokeCommand;
  try {
    ({ LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda'));
  } catch (_) {
    return res.status(501).json({ error: '@aws-sdk/client-lambda is not installed on the server' });
  }

  try {
    const client = new LambdaClient({ region: AWS_REGION });
    // Forward the SIGNED-IN USER's token — the job downloads inputs and writes
    // results under the user's own Synapse permissions (not the service account).
    const payload = { synapse_token: req.session.synapseAccessToken, context };
    const out = await client.send(new InvokeCommand({
      FunctionName: GWAS_SUBMIT_FUNCTION,
      Payload: Buffer.from(JSON.stringify(payload)),
    }));

    if (out.FunctionError) {
      const detail = out.Payload ? Buffer.from(out.Payload).toString('utf8') : out.FunctionError;
      console.error('submit Lambda FunctionError:', detail);
      return res.status(502).json({ error: 'Job submission failed in the cloud backend' });
    }

    const parsed = JSON.parse(Buffer.from(out.Payload).toString('utf8'));
    const body = typeof parsed.body === 'string' ? JSON.parse(parsed.body) : (parsed.body ?? parsed);
    res.json({ job_id: body.job_id, batchJobId: body.batchJobId });
  } catch (err) {
    console.error('POST /api/gwas/submit error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
