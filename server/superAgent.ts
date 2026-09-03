export type SuperAgentEffort = 'fast' | 'smart' | 'deep';
export type SuperAgentProvider = 'runware' | 'wiro' | 'atlas' | 'wavespeed' | 'venice';

export interface SuperAgentResearchRequest {
  deepResearch?: boolean;
  socialResearch?: boolean;
  webpageResearch?: boolean;
  webpageUrl?: string;
}

export interface SuperAgentModelEntry {
  provider: SuperAgentProvider;
  id: string;
  supportsFunctionCalling?: boolean;
  supportsReasoning?: boolean;
  supportsReasoningEffort?: boolean;
  supportsVision?: boolean;
  supportsWebSearch?: boolean;
  promptCostPerToken?: number;
  completionCostPerToken?: number;
}

export interface SuperAgentCandidate {
  provider: SuperAgentProvider;
  model: string;
}

export interface SuperAgentRoute {
  effort: SuperAgentEffort;
  modelCandidates: SuperAgentCandidate[];
  reasoningEffort: 'low' | 'medium' | 'high';
  enableWebSearch: 'off' | 'auto' | 'on';
  enableWebScraping: boolean;
  includeCitations: boolean;
  maxToolRounds: number;
}

const COMPLEX_TASK_TERMS = /\b(?:research|investigate|analy[sz]e|compare|strategy|campaign|debug|audit|plan|storyboard|workflow|multi[- ]?step|optimi[sz]e|forecast|architecture|launch)\b/i;
const SIMPLE_CHAT_TERMS = /^(?:hi|hello|hey|thanks|thank you|okay|ok|yes|no|how are you|what's up)[.!?\s]*$/i;
const SUPPORTED_STEP_TYPES = new Set([
  'create_persona', 'generate_content_plan', 'generate_image', 'generate_video',
  'generate_3d', 'generate_voice', 'generate_talking_head', 'stitch_video',
  'clone_voice', 'storyboard_sequence', 'edit_image', 'log_revenue',
]);

const candidate = (provider: SuperAgentProvider, model: string): SuperAgentCandidate => ({ provider, model });

// Ordered by expected value for each workload. Runtime catalog discovery removes
// unavailable entries before a request is sent, and request failures advance to
// the next provider without changing the user's selected effort mode.
const MODE_CANDIDATES: Record<SuperAgentEffort | 'uncensored', SuperAgentCandidate[]> = {
  fast: [
    candidate('runware', process.env.RUNWARE_SUPER_AGENT_FAST_MODEL || 'deepseek:v4@flash'),
    candidate('wavespeed', process.env.WAVESPEED_SUPER_AGENT_FAST_MODEL || 'deepseek/deepseek-v4-flash'),
    candidate('atlas', process.env.ATLAS_SUPER_AGENT_FAST_MODEL || 'deepseek-ai/deepseek-v3.2'),
    candidate('wiro', process.env.WIRO_SUPER_AGENT_FAST_MODEL || 'bytedance/seed-v2-1-turbo'),
    candidate('venice', process.env.VENICE_SUPER_AGENT_FAST_MODEL || 'deepseek-v4-flash'),
  ],
  smart: [
    candidate('runware', process.env.RUNWARE_SUPER_AGENT_SMART_MODEL || 'minimax:m2.7@0'),
    candidate('wiro', process.env.WIRO_SUPER_AGENT_SMART_MODEL || 'bytedance/seed-v2-pro'),
    candidate('atlas', process.env.ATLAS_SUPER_AGENT_SMART_MODEL || 'qwen/qwen3.6-plus'),
    candidate('runware', process.env.RUNWARE_SUPER_AGENT_DEEP_MODEL || 'deepseek:v4@pro'),
    candidate('venice', process.env.VENICE_SUPER_AGENT_SMART_MODEL || 'zai-org-glm-5-1'),
  ],
  deep: [
    candidate('runware', process.env.RUNWARE_SUPER_AGENT_DEEP_MODEL || 'deepseek:v4@pro'),
    candidate('wiro', process.env.WIRO_SUPER_AGENT_DEEP_MODEL || 'openai/gpt-5-6-sol'),
    candidate('atlas', process.env.ATLAS_SUPER_AGENT_DEEP_MODEL || 'zai-org/GLM-5.1'),
    candidate('venice', process.env.VENICE_SUPER_AGENT_DEEP_MODEL || 'zai-org-glm-5-1'),
  ],
  uncensored: [
    candidate('wiro', process.env.WIRO_SUPER_AGENT_UNCENSORED_MODEL || 'bytedance/seed-v2-pro-uncensored'),
    candidate('wiro', 'bytedance/seed-v2-1-turbo-uncensored'),
    candidate('wiro', 'qwen/qwen3-8-27b-uncensored'),
    candidate('venice', process.env.VENICE_SUPER_AGENT_UNCENSORED_MODEL || 'venice-uncensored-1-2'),
    candidate('venice', 'venice-uncensored'),
    candidate('runware', process.env.RUNWARE_SUPER_AGENT_DEEP_MODEL || 'deepseek:v4@pro'),
    candidate('wavespeed', process.env.WAVESPEED_SUPER_AGENT_FAST_MODEL || 'deepseek/deepseek-v4-flash'),
    candidate('atlas', process.env.ATLAS_SUPER_AGENT_UNCENSORED_MODEL || 'deepseek-ai/DeepSeek-V3.1'),
  ],
};

function uniqueCandidates(items: SuperAgentCandidate[]): SuperAgentCandidate[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.provider}:${item.model}`;
    if (!item.model || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function numberOrUndefined(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeSuperAgentModelCatalog(
  provider: SuperAgentProvider,
  value: unknown,
): SuperAgentModelEntry[] {
  const data = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as { data?: unknown[] }).data)
      ? (value as { data: unknown[] }).data
      : [];

  return data.flatMap((entry): SuperAgentModelEntry[] => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as Record<string, any>;
    const id = typeof record.id === 'string' ? record.id.replace(/^\(Wiro\)\s*/i, '').trim() : '';
    if (!id) return [];
    const capabilities = record.model_spec?.capabilities || record.capabilities || {};
    const parameters = Array.isArray(record.supported_parameters) ? record.supported_parameters : [];
    const output = Array.isArray(capabilities.output) ? capabilities.output : [];
    const inputs = Array.isArray(record.architecture?.input_modalities)
      ? record.architecture.input_modalities
      : Array.isArray(capabilities.input_modalities)
        ? capabilities.input_modalities
        : [];
    return [{
      provider,
      id,
      supportsFunctionCalling: capabilities.supportsFunctionCalling === true
        || capabilities.function_tools === true
        || parameters.includes('tools')
        || output.includes('function_calls'),
      supportsReasoning: capabilities.supportsReasoning === true
        || parameters.includes('reasoning')
        || parameters.includes('include_reasoning')
        || output.includes('reasoning'),
      supportsReasoningEffort: capabilities.supportsReasoningEffort === true
        || parameters.includes('reasoning_effort')
        || (Array.isArray(capabilities.generation_controls) && capabilities.generation_controls.includes('reasoning_effort')),
      supportsVision: capabilities.supportsVision === true || inputs.includes('image'),
      supportsWebSearch: capabilities.supportsWebSearch === true,
      promptCostPerToken: numberOrUndefined(record.pricing?.prompt),
      completionCostPerToken: numberOrUndefined(record.pricing?.completion),
    }];
  });
}

// Compatibility alias retained for existing imports and older tests.
export function normalizeVeniceModelCatalog(value: unknown): SuperAgentModelEntry[] {
  return normalizeSuperAgentModelCatalog('venice', value);
}

function catalogHas(catalog: SuperAgentModelEntry[], item: SuperAgentCandidate): boolean {
  const providerEntries = catalog.filter(entry => entry.provider === item.provider);
  return providerEntries.length === 0 || providerEntries.some(entry => entry.id === item.model);
}

function candidatesForRequestedProvider(
  requestedModel: string,
  effort: SuperAgentEffort,
  adultCreative: boolean,
): SuperAgentCandidate[] | null {
  const provider = (['runware', 'wiro', 'atlas', 'wavespeed', 'venice'] as SuperAgentProvider[])
    .find(name => requestedModel === name || requestedModel.startsWith(`${name}-`));
  if (!provider) return null;
  const pool = adultCreative ? MODE_CANDIDATES.uncensored : MODE_CANDIDATES[effort];
  const providerModels = [...pool, ...MODE_CANDIDATES.uncensored]
    .filter(item => item.provider === provider);
  return providerModels.length > 0 ? providerModels : null;
}

export function selectSuperAgentRoute(input: {
  prompt: string;
  requestedModel?: string;
  allowNsfw?: boolean;
  attachmentCount?: number;
  research?: SuperAgentResearchRequest;
  catalog?: SuperAgentModelEntry[];
  configuredProviders?: SuperAgentProvider[];
}): SuperAgentRoute {
  const prompt = input.prompt.trim();
  const requestedModel = (input.requestedModel || 'adaptive').toLowerCase();
  const researchRequested = Boolean(
    input.research?.deepResearch
    || input.research?.socialResearch
    || input.research?.webpageResearch,
  );
  const isAdultCreative = Boolean(input.allowNsfw);
  const isComplex = researchRequested
    || COMPLEX_TASK_TERMS.test(prompt)
    || prompt.length > 420
    || (input.attachmentCount || 0) > 1;

  let effort: SuperAgentEffort = SIMPLE_CHAT_TERMS.test(prompt)
    ? 'fast'
    : isComplex
      ? 'deep'
      : 'smart';

  if (requestedModel.includes('fast')) effort = 'fast';
  if (requestedModel.includes('smart')) effort = 'smart';
  if (requestedModel.includes('deep')) effort = 'deep';

  let preferred = isAdultCreative ? MODE_CANDIDATES.uncensored : MODE_CANDIDATES[effort];
  preferred = candidatesForRequestedProvider(requestedModel, effort, isAdultCreative) || preferred;
  if (requestedModel === 'venice') {
    preferred = MODE_CANDIDATES.uncensored.filter(item => item.provider === 'venice');
  }
  if (requestedModel === 'deepseek') {
    preferred = [candidate('runware', 'deepseek:v4@pro'), candidate('runware', 'deepseek:v4@flash'), ...preferred];
  }
  if (requestedModel === 'qwen') {
    preferred = [candidate('atlas', 'qwen/qwen3.6-plus'), candidate('wiro', 'qwen/qwen3-8-27b-uncensored'), ...preferred];
  }
  if (requestedModel === 'llama3.3') {
    preferred = [candidate('venice', 'llama-3.3-70b'), ...preferred];
  }

  const configured = new Set(input.configuredProviders || []);
  const hasConfiguredFilter = input.configuredProviders !== undefined;
  const providerFiltered = hasConfiguredFilter
    ? preferred.filter(item => configured.has(item.provider))
    : preferred;
  const catalog = input.catalog || [];
  const available = providerFiltered.filter(item => catalogHas(catalog, item));
  let modelCandidates = uniqueCandidates(available).slice(0, 8);
  if (researchRequested) {
    modelCandidates = modelCandidates.sort((left, right) => {
      const leftSearch = left.provider === 'venice' ? 1 : 0;
      const rightSearch = right.provider === 'venice' ? 1 : 0;
      return rightSearch - leftSearch;
    });
  }

  return {
    effort,
    modelCandidates,
    reasoningEffort: effort === 'deep' ? 'high' : effort === 'smart' ? 'medium' : 'low',
    enableWebSearch: researchRequested ? 'on' : isComplex ? 'auto' : 'off',
    enableWebScraping: Boolean(input.research?.webpageResearch && input.research.webpageUrl),
    includeCitations: researchRequested,
    maxToolRounds: effort === 'deep' ? 4 : effort === 'smart' ? 3 : 2,
  };
}

export function modelSupportsNativeTools(
  candidateOrModelId: SuperAgentCandidate | string,
  catalog: SuperAgentModelEntry[],
): boolean {
  const item = typeof candidateOrModelId === 'string'
    ? { model: candidateOrModelId, provider: undefined }
    : candidateOrModelId;
  const entry = catalog.find(model => model.id === item.model && (!item.provider || model.provider === item.provider));
  if (entry) return entry.supportsFunctionCalling === true;
  return /(?:deepseek:v4@flash|minimax:m2\.7|glm-5|glm-4\.7|qwen3-4b|mistral-31-24b)/i.test(item.model);
}

export function estimateSuperAgentCost(
  usage: { prompt_tokens?: number; completion_tokens?: number } | undefined,
  model: SuperAgentModelEntry | undefined,
): number | undefined {
  if (!usage || !model) return undefined;
  if (model.promptCostPerToken === undefined || model.completionCostPerToken === undefined) return undefined;
  const cost = (usage.prompt_tokens || 0) * model.promptCostPerToken
    + (usage.completion_tokens || 0) * model.completionCostPerToken;
  return Number.isFinite(cost) ? cost : undefined;
}

export function parseAgentToolArguments(value: unknown): Record<string, any> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, any>
      : null;
  } catch {
    return null;
  }
}

export function normalizeSuperAgentPlanSteps(value: unknown): Array<{
  type: string;
  params: Record<string, any>;
  status: 'pending';
}> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((step) => {
    if (!step || typeof step !== 'object') return [];
    const candidate = step as Record<string, any>;
    const type = typeof candidate.type === 'string' ? candidate.type.trim() : '';
    if (!SUPPORTED_STEP_TYPES.has(type)) return [];
    const params = candidate.params && typeof candidate.params === 'object' && !Array.isArray(candidate.params)
      ? normalizeSuperAgentMediaRouting(type, candidate.params)
      : {};
    return [{ type, params, status: 'pending' as const }];
  });
}

export function normalizeSuperAgentMediaRouting(
  stepType: string,
  rawParams: Record<string, any>,
): Record<string, any> {
  const params = { ...rawParams };
  const modelId = typeof params.modelId === 'string' ? params.modelId : '';
  if ((stepType === 'generate_image' || stepType === 'edit_image') && /seedream/i.test(modelId)) {
    params.modelId = stepType === 'edit_image'
      ? 'wavespeed-edit:bytedance/seedream-v5.0-pro/edit'
      : 'wavespeed:bytedance/seedream-v5.0-pro';
  }
  if (stepType === 'generate_video' && /seedance/i.test(modelId)) {
    const version = /seedance[- ]?2\.0/i.test(modelId) ? '2.0' : '2.5';
    const editMode = /(?:edit|v2v|video-to-video)/i.test(modelId) || Boolean(params.sourceVideo);
    params.modelId = editMode
      ? `wavespeed-v2v:bytedance/seedance-${version}/edit`
      : `wavespeed-i2v:bytedance/seedance-${version}`;
  }
  if (stepType === 'storyboard_sequence' && Array.isArray(params.scenes)) {
    params.scenes = params.scenes.map((scene: unknown) => {
      if (!scene || typeof scene !== 'object' || Array.isArray(scene)) return scene;
      return normalizeSuperAgentMediaRouting('generate_video', scene as Record<string, any>);
    });
  }
  return params;
}

export const SUPER_AGENT_PLAN_TOOL = {
  type: 'function',
  function: {
    name: 'create_studio_plan',
    description: 'Create a validated execution plan using the AI Influencer Studio tools. Call this whenever the user asks the studio to perform an action.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'steps'],
      properties: {
        summary: { type: 'string', description: 'A concise natural-language summary of what will be done.' },
        steps: {
          type: 'array',
          minItems: 1,
          maxItems: 20,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'params'],
            properties: {
              type: {
                type: 'string',
                enum: [
                  'create_persona', 'generate_content_plan', 'generate_image', 'generate_video',
                  'generate_3d', 'generate_voice', 'generate_talking_head', 'stitch_video',
                  'clone_voice', 'storyboard_sequence', 'edit_image', 'log_revenue',
                ],
              },
              params: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
  },
} as const;
