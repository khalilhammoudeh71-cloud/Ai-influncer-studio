export const DEFAULT_PERSONA_LLM_ID = 'grok';

export const PERSONA_LLM_OPTIONS = [
  {
    id: 'grok',
    name: 'xAI Grok 4.20 Non-Reasoning',
    badge: 'Default',
    description: 'Best overall balance of human dialogue, intelligence, and low latency.',
  },
  {
    id: 'wiro',
    name: 'Wiro Seed 2.1 Turbo',
    badge: 'Unrestricted',
    description: 'Fast persona dialogue through the configured Wiro account.',
  },
  {
    id: 'runware',
    name: 'Runware DeepSeek V4 Pro',
    badge: 'Human quality',
    description: 'High-quality conversational fallback through Runware.',
  },
  {
    id: 'deepseek',
    name: 'WaveSpeed DeepSeek V4 Flash',
    badge: 'Low cost',
    description: 'Fast, inexpensive dialogue through WaveSpeed.',
  },
  {
    id: 'venice',
    name: 'Venice Uncensored 1.2',
    badge: 'Roleplay',
    description: 'Venice-hosted uncensored persona conversation.',
  },
  {
    id: 'atlas-qwen',
    name: 'Atlas Qwen 3.6 Plus',
    badge: 'Creative',
    description: 'Creative and multilingual conversation through Atlas Cloud.',
  },
  {
    id: 'atlas-deepseek',
    name: 'Atlas DeepSeek V3.2',
    badge: 'Reasoning',
    description: 'Detailed dialogue and reasoning through Atlas Cloud.',
  },
  {
    id: 'atlas-glm',
    name: 'Atlas GLM-4.6',
    badge: 'Alternate',
    description: 'An alternate conversational model through Atlas Cloud.',
  },
  {
    id: 'gemini',
    name: 'Gemini 2.5 Flash',
    badge: 'Fast',
    description: 'Low-latency general conversation through Google.',
  },
] as const;

export type PersonaLlmId = typeof PERSONA_LLM_OPTIONS[number]['id'];

const PERSONA_LLM_IDS = new Set<string>(PERSONA_LLM_OPTIONS.map(option => option.id));

export function normalizePersonaLlmId(value: unknown): PersonaLlmId {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || normalized === 'default' || normalized === 'auto') return DEFAULT_PERSONA_LLM_ID;
  if (normalized === 'qwen') return 'atlas-qwen';
  if (normalized === 'atlas' || normalized === 'atlascloud') return 'atlas-deepseek';
  if (PERSONA_LLM_IDS.has(normalized)) return normalized as PersonaLlmId;
  return DEFAULT_PERSONA_LLM_ID;
}

export function getAtlasPersonaModelId(value: unknown): string | undefined {
  switch (normalizePersonaLlmId(value)) {
    case 'atlas-qwen':
      return 'qwen/qwen3.6-plus';
    case 'atlas-glm':
      return 'zai-org/GLM-4.6';
    case 'atlas-deepseek':
      return 'deepseek-ai/deepseek-v3.2';
    default:
      return undefined;
  }
}
