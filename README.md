# NF-OSI Community Roadmap App

A public-facing roadmap app for the NF-OSI portal. The community can browse infrastructure proposals and new data requests, upvote priorities, and join Synapse discussion threads.

## Features

- **Browse & filter** roadmap ideas by type, status, focus area, and community vs. team-originated
- **Two idea types**: Infrastructure improvements and New Data proposals, aligned to the [NF-OSI 5-year roadmap](./NF-OSI%205%20year%20roadmap.md) workstreams
- **Focus areas** matching the five roadmap workstreams: Data Contribution, Data Discovery, Data Access & Governance, Analytical Capabilities, Community & Sustainability
- **Upvoting** via a service account (vote counts stored as Synapse annotations)
- **Discussion threads** automatically created in Synapse on idea submission; confirmation modal includes a subscribe tip
- **Status tags**: Proposed, Under Consideration, In Progress, Completed, Won't Pursue
- **Target and completion quarters** (e.g. `Q3 2026`) on each idea
- **Request validation** via JSON Schema (`backend/schemas/idea.json`) before writing to Synapse

## Authentication

Both apps use Synapse OAuth to sign in, but they deliberately use **two different
tokens** to write to Synapse. This distinction matters — keep it straight:

**Roadmap → SERVICE token.** Creating the discussion thread, creating the idea
(folder + annotations), and recording votes are all written by the backend with
the `SYNAPSE_AUTH_TOKEN` service account token (the NF-OSI service account). The
service token stays server-side and is never exposed to the client. The user's
own token is *not* used for these writes — the service account acts on their
behalf. (See the `/api/ideas*` routes in `backend/app.js`.)

**GWAS agent → the USER's token, forwarded.** The agent acts **as the signed-in
user**. At OAuth callback the backend persists the user's access token in the
session; the GWAS routes (`/api/gwas/*` in `backend/gwas.js`) use it for every
Synapse call, and `/submit` **forwards that token to the analysis job**, which
downloads inputs and writes results under the **user's own permissions**. A file
the user can't access can't be analyzed on their behalf. The service token is
*not* used anywhere in the GWAS flow.
- For this, the OAuth login requests Synapse data scopes (`view download
  modify`) — the OAuth client must be registered to allow them.
- **Security note:** the token is held in `cookie-session`, which is signed but
  **not encrypted**. For production, move it to an encrypted/server-side session
  store.

**Local dev without OAuth**: set `DEV_AUTH_BYPASS=true` and a `SYNAPSE_AUTH_TOKEN`
in `.env`. The "Log in" button signs you in as the service token's Synapse user
and uses that token for the GWAS flow too (you're acting as the service account
in dev). Hard-disabled when `NODE_ENV=production`.

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set SYNAPSE_AUTH_TOKEN to the service account token
```

### 3. Run locally

**Single-server mode** (simpler — one URL):
```bash
npm start
```
Visit http://127.0.0.1:9000

**Two-server dev mode** (faster iteration with Vite HMR):
```bash
npm run dev
```
Visit http://127.0.0.1:5173

> Use `127.0.0.1`, not `localhost`, so the session-cookie domain matches the
> OAuth redirect URI (see `.env.example`); otherwise login silently fails.

## Architecture

- **Frontend**: Vite + React + TypeScript + Tailwind CSS + lucide-react
- **Backend**: Express.js — proxies all Synapse API calls so the auth token stays server-side
- **Validation**: AJV + `backend/schemas/idea.json` (JSON Schema draft-07)

## Feature flags

Frontend build-time flags (Vite, `src/features.ts`):

- **`VITE_ENABLE_AGENTS`** — exposes the **Agent Gallery** (landing card + `/agents`
  routes incl. the GWAS agent). Default **off**; the landing shows only the
  Roadmap and `/agents*` routes fall back to the landing. It's `true` in
  `frontend/.env.development` (on for local dev). To expose it in production, set
  `VITE_ENABLE_AGENTS=true` in the deploy env (e.g. Vercel); leave it unset to
  keep agents hidden until they're ready.

## Synapse resources

- Ideas parent folder: `syn75281274`
- Discussion project (forum): `syn75279249`
