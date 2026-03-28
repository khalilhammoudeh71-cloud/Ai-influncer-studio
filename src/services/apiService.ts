import type { Persona, GeneratedImage, RevenueEntry, PlannedPost } from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  personas: {
    list: () => request<Persona[]>('/personas'),
    create: (p: Persona) => request<Persona>('/personas', { method: 'POST', body: JSON.stringify(p) }),
    update: (p: Persona) => request<Persona>(`/personas/${encodeURIComponent(p.id)}`, { method: 'PUT', body: JSON.stringify(p) }),
    delete: (id: string) => request<void>(`/personas/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  images: {
    listByPersona: (personaId: string) => request<GeneratedImage[]>(`/personas/${encodeURIComponent(personaId)}/images`),
    create: (personaId: string, img: GeneratedImage) =>
      request<GeneratedImage>(`/personas/${encodeURIComponent(personaId)}/images`, { method: 'POST', body: JSON.stringify(img) }),
    delete: (personaId: string, imageId: string) =>
      request<void>(`/personas/${encodeURIComponent(personaId)}/images/${encodeURIComponent(imageId)}`, { method: 'DELETE' }),
  },

  revenue: {
    listByPersona: (personaId: string) => request<RevenueEntry[]>(`/revenue/${encodeURIComponent(personaId)}`),
    create: (entry: RevenueEntry) => request<RevenueEntry>('/revenue', { method: 'POST', body: JSON.stringify(entry) }),
    delete: (id: string) => request<void>(`/revenue/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  plannedPosts: {
    get: (personaId: string, platform: string) =>
      request<PlannedPost[]>(`/planned-posts/${encodeURIComponent(personaId)}?platform=${encodeURIComponent(platform)}`),
    save: (personaId: string, platform: string, posts: PlannedPost[]) =>
      request<PlannedPost[]>(`/planned-posts/${encodeURIComponent(personaId)}`, {
        method: 'PUT',
        body: JSON.stringify({ platform, posts }),
      }),
  },

  migrate: (data: {
    personas: Persona[];
    revenueEntries: Record<string, RevenueEntry[]>;
    plannedPosts: Record<string, Record<string, PlannedPost[]>>;
  }) => request<{ success: boolean }>('/migrate', { method: 'POST', body: JSON.stringify(data) }),
};
