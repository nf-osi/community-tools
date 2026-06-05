import { Idea, IdeaFormData } from './types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body as T;
}

export const fetchIdeas = (): Promise<Idea[]> =>
  request<Idea[]>('/ideas');

export const createIdea = (data: IdeaFormData): Promise<Idea> =>
  request<Idea>('/ideas', { method: 'POST', body: JSON.stringify(data) });

export const voteForIdea = (id: string): Promise<{ id: string; votes: number }> =>
  request<{ id: string; votes: number }>(`/ideas/${id}/vote`, { method: 'POST' });
