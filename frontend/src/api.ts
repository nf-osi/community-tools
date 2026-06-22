import { Idea, IdeaFormData, User } from './types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  const body = await res.json();
  if (!res.ok) {
    const detail = Array.isArray(body.details) ? ` (${body.details.join('; ')})` : '';
    const fallback =
      res.status === 401 ? 'Please log in to continue.' :
      res.status === 409 ? 'You have already voted for this idea.' :
      res.status >= 500 ? 'Something went wrong on our end. Please try again later.' :
      `Request failed (${res.status}).`;
    throw new Error((body.error ? `${body.error}${detail}` : fallback));
  }
  return body as T;
}

export const fetchIdeas = (): Promise<Idea[]> =>
  request<Idea[]>('/ideas');

export const createIdea = (data: IdeaFormData): Promise<Idea> =>
  request<Idea>('/ideas', { method: 'POST', body: JSON.stringify(data) });

export const voteForIdea = (id: string): Promise<{ id: string; votes: number }> =>
  request<{ id: string; votes: number }>(`/ideas/${id}/vote`, { method: 'POST' });

export const fetchSession = (): Promise<{ user: User | null }> =>
  request<{ user: User | null }>('/auth/session');

export const logout = (): Promise<{ ok: boolean }> =>
  request<{ ok: boolean }>('/auth/logout', { method: 'POST' });
