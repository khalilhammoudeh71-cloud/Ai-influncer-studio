import type { Persona, GeneratedImage, RevenueEntry, PlannedPost } from '../types';
import { supabase } from '../lib/supabase';
import { preparePersonaMediaForStorage, resolvePersonaMediaFromStorage } from './workspaceMediaService';

export type SocialPlatform = 'instagram' | 'tiktok';

export interface SocialTrend {
  id: string;
  platform: SocialPlatform;
  title: string;
  description: string;
  sourceUrl: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  authorName: string;
  authorHandle: string;
  authorAvatarUrl: string | null;
  publishedAt: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  engagementRate: number | null;
  trendScore: number;
  region: string | null;
}

export interface SocialCreatorSignal {
  id: string;
  platform: SocialPlatform;
  name: string;
  handle: string;
  avatarUrl: string | null;
  profileUrl: string;
  postsObserved: number;
  averageViews: number | null;
  averageEngagementRate: number | null;
  topPostUrl: string;
}

export interface SocialTrendsResponse {
  trends: SocialTrend[];
  creators: SocialCreatorSignal[];
  collectedAt: string;
  cached: boolean;
  partial: boolean;
  sources: SocialPlatform[];
  errors: Array<{ platform: SocialPlatform; message: string }>;
  credits: Partial<Record<SocialPlatform, { charged: number | null; remaining: number | null }>>;
  methodology: string;
}

export type ChannelPostPerformance = 'top' | 'typical' | 'needs-attention';

export interface SocialChannelPost extends SocialTrend {
  performance: ChannelPostPerformance;
  performanceVsMedian: number | null;
}

export interface SocialChannelAnalysisResponse {
  platform: SocialPlatform;
  handle: string;
  profileUrl: string;
  collectedAt: string;
  cached: boolean;
  postsAnalyzed: number;
  averageViews: number | null;
  medianViews: number | null;
  averageLikes: number | null;
  averageComments: number | null;
  averageShares: number | null;
  averageEngagementRate: number | null;
  posts: SocialChannelPost[];
  topPosts: SocialChannelPost[];
  opportunityPosts: SocialChannelPost[];
  insights: string[];
  credits: { charged: number | null; remaining: number | null };
  methodology: string;
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const sessionRes = await supabase.auth.getSession();
    const token = sessionRes?.data?.session?.access_token;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  } catch (e) {
    console.error('Error fetching Supabase auth session:', e);
    return {};
  }
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    try {
      const err = JSON.parse(text);
      const raw = typeof err === 'string' ? err : (err?.error || err?.message || err?.detail || err?.msg);
      if (raw && typeof raw === 'string' && raw.trim()) return raw;
    } catch {
      if (text && text.trim() && text.length < 200 && !text.includes('<!DOCTYPE')) return text;
    }
  } catch {}
  if (res.status >= 500) {
    return `The service is temporarily unavailable (${res.status} ${res.statusText || 'Server Error'}). Please try again.`;
  }
  return res.statusText ? `${res.statusText} (${res.status})` : `Request failed with status ${res.status}`;
}

async function requestWithBody<T>(url: string, body: unknown): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`/api${url}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errMsg = await extractErrorMessage(res);
    throw new Error(errMsg);
  }
  return res.json();
}

async function hydrateAndMigratePersonaMedia(persona: Persona): Promise<Persona> {
  try {
    const prepared = await preparePersonaMediaForStorage(persona);
    if (JSON.stringify(prepared) !== JSON.stringify(persona)) {
      await request<Persona>(`/personas/${encodeURIComponent(persona.id)}`, {
        method: 'PUT',
        body: JSON.stringify(prepared),
      });

      await Promise.all((prepared.visualLibrary || []).map(async (media, index) => {
        if (JSON.stringify(media) === JSON.stringify(persona.visualLibrary?.[index])) return;
        await request<GeneratedImage>(`/personas/${encodeURIComponent(persona.id)}/images`, {
          method: 'POST',
          body: JSON.stringify(media),
        });
      }));
    }
    return resolvePersonaMediaFromStorage(prepared);
  } catch (error) {
    console.warn('[Persona Media Migration] Using the existing media for this session:', error);
    return persona;
  }
}

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const errMsg = await extractErrorMessage(res);
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  workspaceState: {
    list: () => request<Array<{ key: string; value: string; updatedAt: string }>>('/workspace-state'),
    save: (key: string, value: string) =>
      request<{ key: string; value: string; updatedAt: string }>(`/workspace-state/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      }),
    delete: (key: string) =>
      request<{ success: boolean }>(`/workspace-state/${encodeURIComponent(key)}`, { method: 'DELETE' }),
  },

  personas: {
    list: async () => Promise.all((await request<Persona[]>('/personas')).map(hydrateAndMigratePersonaMedia)),
    create: async (p: Persona) => {
      const prepared = await preparePersonaMediaForStorage(p);
      return resolvePersonaMediaFromStorage(await request<Persona>('/personas', { method: 'POST', body: JSON.stringify(prepared) }));
    },
    update: async (p: Persona) => {
      const prepared = await preparePersonaMediaForStorage(p);
      return resolvePersonaMediaFromStorage(await request<Persona>(`/personas/${encodeURIComponent(p.id)}`, { method: 'PUT', body: JSON.stringify(prepared) }));
    },
    delete: (id: string) => request<void>(`/personas/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    analyzeFace: (id: string, referenceImage?: string) => requestWithBody<{ faceDescriptor: string }>(`/personas/${encodeURIComponent(id)}/analyze-face`, { referenceImage }),
  },

  images: {
    listByPersona: async (personaId: string) =>
      Promise.all((await request<GeneratedImage[]>(`/personas/${encodeURIComponent(personaId)}/images`)).map(resolvePersonaMediaFromStorage)),
    create: async (personaId: string, img: GeneratedImage) => {
      const prepared = await preparePersonaMediaForStorage(img);
      const saved = await request<GeneratedImage>(`/personas/${encodeURIComponent(personaId)}/images`, {
        method: 'POST',
        body: JSON.stringify(prepared),
      });
      return resolvePersonaMediaFromStorage(saved);
    },
    delete: (personaId: string, imageId: string) =>
      request<void>(`/personas/${encodeURIComponent(personaId)}/images/${encodeURIComponent(imageId)}`, { method: 'DELETE' }),
    generateVideo: async (params: { personaClientId?: string; prompt: string; modelId: string; sourceImage?: string | null; sourceVideo?: string | null; strength?: number; identityLock?: boolean; naturalLook?: boolean }) => {
      const { studioVideoJob } = await import('./mediaJobService');
      return studioVideoJob(params.personaClientId, params);
    },
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
    const prepared = await preparePersonaMediaForStorage(persona);
    const saved = await request<Persona>(`/personas/${encodeURIComponent(persona.id)}`, {
      method: 'PUT',
      body: JSON.stringify(prepared),
    });
    return resolvePersonaMediaFromStorage(saved);
  },

  getConfigStatus: async () => {
    try {
      return await request<{
        openai: boolean;
        gemini: boolean;
        wavespeed: boolean;
        elevenlabs: boolean;
        heygen: boolean;
        scrapeCreators: boolean;
        database: boolean;
        databaseConnected: boolean;
      }>('/config-status');
    } catch {
      return { openai: false, gemini: false, wavespeed: false, elevenlabs: false, heygen: false, scrapeCreators: false, database: false, databaseConnected: false };
    }
  },

  social: {
    getTrends: (params?: { platform?: 'all' | SocialPlatform; region?: string; refresh?: boolean }) => {
      const query = new URLSearchParams({
        platform: params?.platform || 'all',
        region: params?.region || 'US',
      });
      if (params?.refresh) query.set('refresh', 'true');
      return request<SocialTrendsResponse>(`/social/trends?${query.toString()}`);
    },
    getChannelAnalysis: (params: { platform: SocialPlatform; handle: string; region?: string; refresh?: boolean }) => {
      const query = new URLSearchParams({
        platform: params.platform,
        handle: params.handle,
        region: params.region || 'US',
      });
      if (params.refresh) query.set('refresh', 'true');
      return request<SocialChannelAnalysisResponse>(`/social/channel-analysis?${query.toString()}`);
    },
    generateTrendScript: (params: {
      trendName: string;
      trendDescription: string;
      trendNiche: string;
      persona: Persona | null;
    }) => requestWithBody<{
      concept: string;
      hook: string;
      voiceoverScript: string;
      visualPrompts: string[];
      hashtags: string[];
    }>('/generate-trend-script', params),
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
    getElevenLabsVoices: () =>
      request<{ voices: Array<{
        voice_id: string;
        name: string;
        category: string;
        description: string;
        preview_url: string;
        labels: Record<string, string>;
        settings: { stability: number; similarity_boost: number; style: number };
      }> }>('/elevenlabs-voices'),
    getHeyGenVoices: () =>
      request<{ voices: Array<{
        voice_id: string;
        name: string;
        language: string;
        gender: string;
        support_pause: boolean;
        support_locale: boolean;
        preview_audio_url: string;
      }>; hasMore: boolean; nextToken: string | null }>('/heygen-voices'),
    cloneVoice: (name: string, description: string, sampleBase64: string | string[]) =>
      requestWithBody<{ voiceId: string; name: string }>('/elevenlabs-clone-voice', {
        name,
        description,
        ...(Array.isArray(sampleBase64) ? { sampleBase64s: sampleBase64 } : { sampleBase64 })
      }),
    generateScript: (params: { topic: string; persona: Persona; mode?: string; existingScript?: string; length?: string }) =>
      requestWithBody<{ script: string }>('/generate-voice-script', params),
    generateSpeech: (params: {
      text: string;
      voice?: string;
      performancePrompt?: string;
      backgroundAtmosphere?: string;
      engine?: 'elevenlabs' | 'heygen' | 'openai' | 'gemini' | 'omnivoice' | 'minimax-clone' | 'qwen3-clone' | 'seed-speech' | 'chatterbox' | 'mureka-vocal' | 'qwen-tts' | string;
      voiceId?: string;
      voiceSettings?: { stability?: number; similarity_boost?: number; style?: number };
      voiceReference?: string;
      voiceReferences?: string[];
      personaName?: string;
      isPreview?: boolean;
      voicePrompt?: string;
      voiceLikeness?: number;
      voiceStability?: number;
      voiceStyleExaggeration?: number;
      voiceSpeakingSpeed?: number;
    }) =>
      requestWithBody<{ audioUrl: string; engine?: string }>('/generate-speech', params),
    translateText: (params: { text: string; targetLanguage: string }) =>
      requestWithBody<{ translatedText: string }>('/translate-text', params),
    testVoiceClone: (params: {
      sampleBase64?: string;
      sampleBase64s?: string[];
      model: string;
      voiceSettings: { stability: number; similarityBoost: number; style: number; speed: number };
      testText?: string;
    }) => requestWithBody<{ audioUrl: string }>('/agent/test-voice-clone', params),
    setDefaultVoice: (params: {
      voiceReference?: string;
      voiceReferences?: string[];
      voiceName: string;
      model: string;
      voiceSettings: { stability: number; similarityBoost: number; style: number; speed: number };
    }) => requestWithBody<{ success: boolean; activeVoice: string; voiceId?: string; model?: string }>('/agent/set-default-voice', params),
  },

  influencer: {
    trending: (platform: 'tiktok' | 'instagram') =>
      request<any[]>(`/influencer/trending?platform=${platform}`),
  },

  runware: {
    getModelsAndLoras: () =>
      request<{
        models: Array<{ id: string; name: string; description: string; price: number }>;
        loras: Array<{ id: string; name: string; category: string; description: string; defaultWeight: number }>;
      }>('/runware/models'),
  },

  wiro: {
    getModels: () =>
      request<{
        models: Array<{ id: string; name: string; description: string; price: number }>;
        videoModels: Array<{ id: string; name: string; description: string; price: number }>;
        voiceModels?: Array<{ id: string; name: string; description: string; provider: string }>;
      }>('/wiro/models'),
  },

  billing: {
    get: () => request<{ email: string; subscriptionStatus: string; credits: number; stripeCustomerId?: string; subscriptionPriceId?: string }>('/billing'),
    createCheckout: (priceId: string, type: 'subscription' | 'credits') => requestWithBody<{ url: string }>('/stripe/create-checkout', { priceId, type }),
    portal: () => request<{ url: string }>('/stripe/portal', { method: 'POST' }),
  },
};
