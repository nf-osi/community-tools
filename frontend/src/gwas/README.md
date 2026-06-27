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

## Backend endpoints to implement (in `backend/app.js`)

The frontend already calls these; they're the remaining server work:

| Method & path | Body | Returns | Notes |
|---|---|---|---|
| `GET /api/auth/session` | — | `{ user }` | Already exists. |
| `GET /api/gwas/entity/:synId` | — | `SynapseFileSelection` | Fetch entity metadata + a small text/VCF preview (use the session user's token). |
| `POST /api/gwas/check-files` | `{ selected_files, output_parent_id?, user_params? }` | `FileCheckResult` | Call Claude with the file-check system prompt and the JSON schema as a forced tool. |
| `POST /api/gwas/submit` | `{ context }` | `{ job_id, batchJobId? }` | Invoke the `nf-gwas-submit` Lambda with `{ synapse_token: <session token>, context }`. |

Types live in `types.ts`; `FileCheckResult` mirrors
`hackathon/frontend/file-check.schema.json` exactly, so the agent's structured
output deserializes straight through.

## Notes

- The file selector tolerates a missing `entity` endpoint (falls back to a bare
  `{id, name}` reference) so the UI is usable before the backend lands.
- No new npm dependencies — only React + lucide-react, already in the app.
