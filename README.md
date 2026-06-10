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

Viewing the roadmap requires no login.

**User-facing (OAuth)**: Submitting an idea uses Synapse OAuth so submissions are attributed to the logged-in user. The frontend redirects to the Synapse OAuth authorization endpoint; on callback the backend exchanges the code for a user access token, which is used for that request only (not stored).

**Backend writes (service token)**: All updates — vote counts, idea annotations — are written by the backend using the `SYNAPSE_AUTH_TOKEN` service account token, which stays server-side and is never exposed to the client.

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
Visit http://localhost:3001

**Two-server dev mode** (faster iteration with Vite HMR):
```bash
npm run dev
```
Visit http://localhost:5173

## Architecture

- **Frontend**: Vite + React + TypeScript + Tailwind CSS + lucide-react
- **Backend**: Express.js — proxies all Synapse API calls so the auth token stays server-side
- **Validation**: AJV + `backend/schemas/idea.json` (JSON Schema draft-07)

## Synapse resources

- Ideas parent folder: `syn75281274`
- Discussion project (forum): `syn75279249`
