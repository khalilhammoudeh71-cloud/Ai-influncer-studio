import { blocksAgentPlan } from '../shared/agentPlanIntent';
import { validateCampaign, CAMPAIGN_WIRE_SCHEMA } from '../shared/agentCampaign';

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

export function normalizeSuperAgentPlanSteps(value: unknown, request = ''): Array<{
  type: string;
  params: Record<string, any>;
  status: 'pending';
}> {
  if (blocksAgentPlan(request)) return [];
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((step) => {
    if (!step || typeof step !== 'object') return [];
    const candidate = step as Record<string, any>;
    let type = typeof candidate.type === 'string' ? candidate.type.trim() : '';
    if (!SUPPORTED_STEP_TYPES.has(type)) return [];
    const raw = typeof candidate.params === 'string' ? parseAgentToolArguments(candidate.params) : (candidate.params || candidate.parameters || candidate);
    if (type === 'generate_image' && typeof raw?.sourceImage === 'string' && raw.sourceImage.trim()) type = 'edit_image';
    const params = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? normalizeSuperAgentMediaRouting(type, raw) : {};
    delete params.type;
    delete params.status;
    if (['generate_image', 'generate_video'].includes(type) && (typeof params.prompt !== 'string' || !params.prompt.trim())) return [];
    const promptFreeEdit = ['upscale','bg-remover','face-swap','virtual-tryon','beautify'].includes(params.editType);
    if (type === 'edit_image' && !promptFreeEdit && (typeof params.prompt !== 'string' || !params.prompt.trim())) return [];
    return [{ type, params, status: 'pending' as const }];
  });
}

/** Recognize plan-shaped JSON without confusing ordinary data or JSON Schemas for tools. */
function explicitPlanSteps(value: any): unknown {
  if (!value || typeof value !== 'object') return undefined;
  const isStep = (step:any) => step && typeof step === 'object' && typeof step.type === 'string'
    && (SUPPORTED_STEP_TYPES.has(step.type.trim()) || 'params' in step || 'parameters' in step);
  if (Array.isArray(value)) return value.some(isStep) ? value : undefined;
  if ('suggestedSteps' in value) return value.suggestedSteps;
  if ('steps' in value) return value.steps;
  return isStep(value) ? [value] : undefined;
}

/** Accept explicit JSON plans, never invent a task from ordinary prose. */
export function recoverStructuredAgentPlan(reply: string, request: string) {
  const blocks = [...reply.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(match => match[1]);
  for (const block of [reply, ...blocks]) {
    let value:any;
    try { value=JSON.parse(block); } catch { continue; }
    if (!value || typeof value!=='object') continue;
    const rawSteps=explicitPlanSteps(value);
    if (rawSteps === undefined) continue;
    const steps = validateSuperAgentPlanSteps(rawSteps, request);
    if (steps.length) return steps;
  }
  return [];
}

export function validateSuperAgentPlanSteps(value: unknown, request: string) {
  if (!Array.isArray(value)) throw new Error('The planner returned malformed steps.');
  if (!blocksAgentPlan(request)) {
    for (const step of value) {
      const raw=typeof step?.params==='string'?parseAgentToolArguments(step.params):step?.params ?? step?.parameters ?? step;
      if (!raw || typeof raw!=='object' || Array.isArray(raw)) throw new Error('The planner returned malformed step inputs.');
    }
  }
  const steps=normalizeSuperAgentPlanSteps(value,request);
  if (!blocksAgentPlan(request) && steps.length!==value.length) throw new Error('The planner returned an incomplete or unsupported plan.');
  return steps;
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
    description: 'Prepare one complete studio plan for user review; this does not execute or approve actions. Use for a complete creation/edit brief or an explicit request to draft a plan. Do not call for text-only answers, quoted examples, unfinished briefs or requests to wait. Returns validated pending steps or an actionable validation error; replace the whole invalid plan rather than omitting failed steps.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'steps'],
      properties: {
        campaign: CAMPAIGN_WIRE_SCHEMA,
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
              params: {
                type: 'object', additionalProperties: true,
                description: 'Complete inputs for this step. Image/video generation requires prompt. Never put inputs outside params.',
                properties: {
                  prompt: {type:'string', description:'Full image or video scene, carrying forward all user details.'},
                  modelId: {type:'string'},
                  usePersona: {type:'boolean', description:'False for objects, scenery, or requests without the active persona.'},
                  aspectRatio: {type:'string'},
                  duration: {type:'number',description:'Requested video duration in seconds.'},
                  resolution: {type:'string'},
                  text: {type:'string'},
                  sourceImage: {type:'string'},
                  sourceImageFromStepIndex: {type:'integer', minimum:0, description:'Zero-based index of an earlier image step whose successful output must be edited or animated.'},
                  editType: {type:'string'},
                  name: {type:'string'},
                  theme: {type:'string'},
                  platform: {type:'string'},
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

// The same envelope is used for ordinary answers and reviewable plans. No tool
// runs at this boundary; execution is handled by the existing approval flow.
export const SUPER_AGENT_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['text','suggestedSteps','campaign'],
  properties: {
    campaign: CAMPAIGN_WIRE_SCHEMA,
    text: {type:'string', description:'Natural reply or concise summary of the plan. Do not claim tools have run.'},
    suggestedSteps: {
      ...SUPER_AGENT_PLAN_TOOL.function.parameters.properties.steps,
      minItems: 0,
      items: {
        ...SUPER_AGENT_PLAN_TOOL.function.parameters.properties.steps.items,
        properties: {
          type: SUPER_AGENT_PLAN_TOOL.function.parameters.properties.steps.items.properties.type,
          // Gemini rejects the open-ended params object in this response schema.
          // Serialize only on the wire, then validate and decode before approval.
          params: {type:'string',description:'Complete step parameters as a JSON-encoded object. Include all required inputs described in the system instructions. Preserve booleans and numbers inside the object; carry forward full prompts and source dependencies.'},
        },
      },
      description: 'Complete steps for review, or an empty array for conversation, clarification, text-only advice and unfinished descriptions.',
    },
  },
} as const;

export function decodeAgentReply(reply: string, request: string, deferCampaignReview=false) {
  const blocks = [...reply.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(match=>match[1]);
  for (const block of [reply,...blocks]) {
    let parsed:any;
    try { parsed=JSON.parse(block); } catch { continue; }
    if (!parsed || typeof parsed!=='object') continue;
    const planSteps=explicitPlanSteps(parsed);
    const isEnvelope=planSteps!==undefined || (!Array.isArray(parsed) && ['text','summary','suggestedSteps','steps'].some(key=>key in parsed));
    if (!isEnvelope) return {text:reply.trim(),status:'normal',suggestedSteps:[]};
    const rawSteps=planSteps===undefined ? [] : planSteps;
    let suggestedSteps=validateSuperAgentPlanSteps(rawSteps,request);
    let text=typeof parsed.text==='string'?parsed.text:typeof parsed.summary==='string'?parsed.summary:'';
    if (Array.isArray(rawSteps) && !rawSteps.length && /```/.test(text)) {
      suggestedSteps=recoverStructuredAgentPlan(text,request);
      if(suggestedSteps.length)text='Review the plan below before running it.';
    }
    if (!text.trim() && !suggestedSteps.length) throw new Error('The planner returned no usable response.');
    const campaign=blocksAgentPlan(request)?undefined:deferCampaignReview?parsed.campaign:validateCampaign(parsed.campaign,suggestedSteps);
    return {text:text.trim() || 'Review the plan below before running it.',status:suggestedSteps.length?'clarifying':'normal',suggestedSteps,...(campaign?{campaign}:{})};
  }
  if (!reply.trim() || /^\s*(?:```json\b|\{|\[)/.test(reply)) throw new Error('The planner returned an incomplete response.');
  return {text:reply.trim(),status:'normal',suggestedSteps:[]};
}
