# GWAS Agent frontend (scaffold)

A self-contained frontend module for the NF GWAS agent, dropped into the
community-tools app. It reuses the existing Synapse OAuth session and the
`/api` + cookie-session conventions of the roadmap app.

**Routes:** `/` landing → `/agents` gallery → `/agents/gwas` (this agent).
`/gwas` still works as a back-compat alias. Routing is dependency-free in
`src/router.tsx` + `src/main.tsx`.

## Flow

1. **Select files** — user adds Synapse file ids; `resolveEntity` fetches name /
   contentType / preview so the agent has metadata to reason over.
2. **Settings** — trait type, phenotype column, results folder.
3. **Pre-flight check** — `checkFiles` runs the file-check agent (the prompt in
   `hackathon/frontend/file-check-agent.md` + `file-check.schema.json`) and the
   verdict renders in `FileCheckPanel` (role mapping, issues, questions).
4. **Run** — when status is `ready`, `submitJob` posts `resolved_context`; the
   backend attaches the user's token and invokes the GWAS submit Lambda.

## Backend endpoints (implemented in `backend/gwas.js`)

| Method & path | Body | Returns | Notes |
|---|---|---|---|
| `GET /api/auth/session` | — | `{ user }` | In `app.js`. |
| `GET /api/gwas/entity/:synId` | — | `SynapseFileSelection` | Entity metadata + file handle (size/contentType) + a best-effort ~16KB text/VCF preview. |
| `POST /api/gwas/check-files` | `{ selected_files, output_parent_id?, user_params? }` | `FileCheckResult` | Calls Claude with the file-check system prompt and `schemas/gwas-file-check.json` as a forced tool; AJV-validates the verdict. Needs `ANTHROPIC_API_KEY`. |
| `POST /api/gwas/submit` | `{ context }` | `{ job_id, batchJobId? }` | Invokes the `nf-gwas-submit` Lambda. Needs `GWAS_SUBMIT_FUNCTION` + AWS creds. |

**Auth model:** GWAS routes require a logged-in session (gating), but Synapse
reads and the token forwarded to the Lambda use the server-side **service token**
(`SYNAPSE_AUTH_TOKEN`) — this app never persists the user's OAuth token. To run
jobs as the end user instead, persist the user access token at OAuth callback and
forward it from `/submit` in place of the service token.

Types live in `types.ts`; `FileCheckResult` mirrors
`hackathon/frontend/file-check.schema.json` exactly, so the agent's structured
output deserializes straight through.

## Notes

- The file selector tolerates a missing `entity` endpoint (falls back to a bare
  `{id, name}` reference) so the UI is usable before the backend lands.
- No new npm dependencies — only React + lucide-react, already in the app.
