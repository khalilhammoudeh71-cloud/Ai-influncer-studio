export const DEFAULT_PERSONA_LLM_ID = 'grok';

export const PERSONA_LLM_OPTIONS = [
  {
    id: 'grok',
    name: 'xAI Grok 4.20 Non-Reasoning',
    simpleLabel: 'Best overall conversation',
    badge: 'Default',
    description: 'Best overall balance of human dialogue, intelligence, and low latency.',
  },
  {
    id: 'atlas-seed-character',
    name: 'Atlas Doubao Seed Character',
    simpleLabel: 'Most immersive roleplay',
    badge: 'Immersive',
    description: 'Character-focused conversation with strong emotional reactions and low latency.',
  },
  {
    id: 'atlas-deepseek',
    name: 'Atlas DeepSeek V3.2',
    simpleLabel: 'Fast detailed conversation',
    badge: 'Fast',
    description: 'Fast, detailed dialogue and reasoning through Atlas Cloud.',
  },
  {
    id: 'runware',
    name: 'Runware DeepSeek V4 Pro',
    simpleLabel: 'Most natural conversation',
    badge: 'Natural',
    description: 'High-quality conversational fallback through Runware.',
  },
  {
    id: 'venice',
    name: 'Venice Uncensored 1.2',
    simpleLabel: 'Unrestricted roleplay alternative',
    badge: 'Roleplay',
    description: 'Venice-hosted uncensored persona conversation.',
  },
  {
    id: 'gemini',
    name: 'Gemini 2.5 Flash',
    simpleLabel: 'Everyday general conversation',
    badge: 'General',
    description: 'General-purpose conversation through Google.',
  },
  {
    id: 'deepseek',
    name: 'WaveSpeed DeepSeek V4 Flash',
    simpleLabel: 'Lowest-cost replies',
    badge: 'High latency',
    description: 'Inexpensive dialogue through WaveSpeed, ranked lower because of measured latency.',
  },
  {
    id: 'wiro',
    name: 'Wiro Seed 2.1 Turbo',
    simpleLabel: 'Experimental unrestricted route',
    badge: 'High latency',
    description: 'Slower task-based dialogue. Allows up to 30 seconds when selected, then uses a fallback if unavailable.',
  },
  {
    id: 'atlas-qwen',
    name: 'Atlas Qwen 3.6 Plus',
    simpleLabel: 'Creative and multilingual',
    badge: 'Experimental',
    description: 'Creative multilingual route; recent persona benchmark did not return a usable reply.',
  },
  {
    id: 'atlas-glm',
    name: 'Atlas GLM-4.6',
    simpleLabel: 'Balanced alternative',
    badge: 'Experimental',
    description: 'Alternate route; recent persona benchmark did not return a usable reply.',
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
    case 'atlas-seed-character':
      return 'bytedance/doubao-seed-character-260628';
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
