// API client for the GWAS agent flow. Follows the same `/api` + cookie-session
// convention as the roadmap app (frontend/src/api.ts).
//
// Backend endpoints expected (to be implemented in backend/app.js):
//   GET  /api/auth/session                  -> { user }            (already exists)
//   GET  /api/gwas/entity/:synId            -> SynapseFileSelection (resolve metadata + preview)
//   POST /api/gwas/check-files              -> FileCheckResult      (runs the file-check agent)
//   POST /api/gwas/submit                   -> SubmitResult         (invokes the submit Lambda)

import type {
  FileCheckResult,
  ResolvedContext,
  SubmitResult,
  SynapseFileSelection,
  UserParams,
  SessionUser,
} from './types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray((body as any).details)
      ? ` (${(body as any).details.join('; ')})`
      : '';
    const fallback =
      res.status === 401 ? 'Please log in with Synapse to continue.' :
      res.status === 404 ? 'Not found.' :
      res.status >= 500 ? 'Something went wrong on our end. Please try again.' :
      `Request failed (${res.status}).`;
    throw new Error((body as any).error ? `${(body as any).error}${detail}` : fallback);
  }
  return body as T;
}

export const fetchSession = (): Promise<{ user: SessionUser | null }> =>
  request<{ user: SessionUser | null }>('/auth/session');

/** Resolve a Synapse id into file metadata (+ a small preview when available). */
export const resolveEntity = (synId: string): Promise<SynapseFileSelection> =>
  request<SynapseFileSelection>(`/gwas/entity/${encodeURIComponent(synId)}`);

/** Run the pre-flight file-check agent over the current selection. */
export const checkFiles = (payload: {
  selected_files: SynapseFileSelection[];
  output_parent_id?: string;
  user_params?: UserParams;
  user_prompt?: string;
}): Promise<FileCheckResult> =>
  request<FileCheckResult>('/gwas/check-files', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/** Submit the GWAS job (backend attaches the user token and invokes the Lambda). */
export const submitJob = (context: ResolvedContext): Promise<SubmitResult> =>
  request<SubmitResult>('/gwas/submit', {
    method: 'POST',
    body: JSON.stringify({ context }),
  });
