import type { Persona, GeneratedImage, RevenueEntry, PlannedPost } from '../types';

async function requestWithBody<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

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
    analyzeFace: (id: string, referenceImage?: string) => requestWithBody<{ faceDescriptor: string }>(`/personas/${encodeURIComponent(id)}/analyze-face`, { referenceImage }),
  },

  images: {
    listByPersona: (personaId: string) => request<GeneratedImage[]>(`/personas/${encodeURIComponent(personaId)}/images`),
    create: (personaId: string, img: GeneratedImage) =>
      request<GeneratedImage>(`/personas/${encodeURIComponent(personaId)}/images`, { method: 'POST', body: JSON.stringify(img) }),
    delete: (personaId: string, imageId: string) =>
      request<void>(`/personas/${encodeURIComponent(personaId)}/images/${encodeURIComponent(imageId)}`, { method: 'DELETE' }),
    generateVideo: (params: { prompt: string; modelId: string; sourceImage?: string | null; identityLock?: boolean; naturalLook?: boolean }) =>
      requestWithBody<{ videoUrl: string }>('/generate-video', params),
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

  updatePersonaInVault: async (persona: Persona) => {
    return request<Persona>(`/personas/${encodeURIComponent(persona.id)}`, {
      method: 'PUT',
      body: JSON.stringify(persona),
    });
  },

  getConfigStatus: async () => {
    try {
      return await request<{
        openai: boolean;
        gemini: boolean;
        wavespeed: boolean;
        elevenlabs: boolean;
        database: boolean;
        databaseConnected: boolean;
      }>('/config-status');
    } catch {
      return { openai: false, gemini: false, wavespeed: false, elevenlabs: false, database: false, databaseConnected: false };
    }
  },

  voice: {
    getVoices: () =>
      request<{ voices: Array<{
        voice_id: string;
        name: string;
        category: string;
        description: string;
        preview_url: string;
        labels: Record<string, string>;
        settings: { stability: number; similarity_boost: number; style: number };
      }> }>('/elevenlabs-voices'),
    generateScript: (params: { topic: string; persona: Persona; mode?: string; existingScript?: string; length?: string }) =>
      requestWithBody<{ script: string }>('/generate-voice-script', params),
    generateSpeech: (params: {
      text: string;
      voice?: string;
      performancePrompt?: string;
      backgroundAtmosphere?: string;
      engine?: 'elevenlabs' | 'openai' | 'gemini';
      voiceId?: string;
      voiceSettings?: { stability?: number; similarity_boost?: number; style?: number };
    }) =>
      requestWithBody<{ audioUrl: string; engine?: string }>('/generate-speech', params),
    translateText: (params: { text: string; targetLanguage: string }) =>
      requestWithBody<{ translatedText: string }>('/translate-text', params),
  },
};
