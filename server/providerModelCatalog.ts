import nodeCrypto from 'node:crypto';

export type MediaModelType =
  | 'text-to-image'
  | 'image-to-image'
  | 'upscaler'
  | 'text-to-video'
  | 'image-to-video'
  | 'video-to-video'
  | 'reference-to-video'
  | 'text-to-3d'
  | 'image-to-3d';

export interface CatalogInputMap {
  prompt?: string;
  image?: string;
  video?: string;
  aspectRatio?: string;
  resolution?: string;
  duration?: string;
  outputFormat?: string;
  count?: string;
}

export interface DiscoveredModelInfo {
  id: string;
  name: string;
  provider: string;
  type: MediaModelType;
  price: number;
  description: string;
  apiPath: string;
  hasEditVariant: boolean;
  editApiPath?: string;
  hasReferenceImage?: boolean;
  editImageField?: 'image' | 'images';
  editHasStrengthControl?: boolean;
  isIdentityModel?: boolean;
  nsfw?: boolean;
  supportedProperties?: string[];
  requiredProperties?: string[];
  inputMap?: CatalogInputMap;
  inputDefaults?: Record<string, unknown>;
  inputOptions?: Record<string, unknown[]>;
  arrayInputFields?: string[];
  catalogSource?: 'live' | 'curated';
  catalogUpdatedAt?: string;
  isNew?: boolean;
  isUpgrade?: boolean;
  releaseLabel?: string;
}

export interface ProviderCatalogStatus {
  configured: boolean;
  ok: boolean;
  discovered: number;
  compatible: number;
  pendingAdapters: number;
  error?: string;
}

export interface ProviderCatalogSnapshot {
  checkedAt: string;
  models: DiscoveredModelInfo[];
  editModels: DiscoveredModelInfo[];
  videoModels: DiscoveredModelInfo[];
  pendingModels: Array<{ provider: string; id: string; reason: string }>;
  providers: Record<string, ProviderCatalogStatus>;
}

type JsonSchemaProperty = {
  type?: string | string[];
  default?: unknown;
  enum?: unknown[];
  anyOf?: JsonSchemaProperty[];
  items?: JsonSchemaProperty;
};

type InputSchema = {
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
};

const FIELD_ALIASES: Record<keyof CatalogInputMap, string[]> = {
  prompt: ['prompt', 'positive_prompt', 'positivePrompt', 'text', 'description'],
  image: ['image', 'images', 'image_url', 'image_urls', 'input_image', 'input_images', 'inputImage', 'reference_image', 'reference_images', 'start_image_url', 'first_frame_image'],
  video: ['video', 'videos', 'video_url', 'video_urls', 'input_video', 'input_videos', 'inputVideo', 'reference_video', 'reference_videos'],
  aspectRatio: ['aspect_ratio', 'aspectRatio', 'ratio'],
  resolution: ['resolution', 'quality', 'image_size', 'size'],
  duration: ['duration', 'seconds', 'length'],
  outputFormat: ['output_format', 'outputFormat', 'format'],
  count: ['num_images', 'number_results', 'numberResults', 'count'],
};

const RUNTIME_DEFAULTS: Record<string, unknown> = {
  aspect_ratio: '1:1',
  aspectRatio: '1:1',
  ratio: '1:1',
  resolution: '1k',
  quality: 'standard',
  image_size: 'square_hd',
  size: 'square_hd',
  duration: 5,
  seconds: 5,
  length: 5,
  output_format: 'jpeg',
  outputFormat: 'jpeg',
  format: 'jpeg',
  num_images: 1,
  number_results: 1,
  numberResults: 1,
  count: 1,
  seed: 0,
  watermark: 'false',
  enable_audio: false,
  enable_prompt_expansion: true,
  enable_sync_mode: true,
  enable_base64_output: true,
};

function firstAlias(properties: Record<string, JsonSchemaProperty>, key: keyof CatalogInputMap): string | undefined {
  return FIELD_ALIASES[key].find(alias => alias in properties);
}

function schemaDefault(property: JsonSchemaProperty | undefined): unknown {
  if (!property) return undefined;
  if (property.default !== undefined) return property.default;
  const nested = property.anyOf?.find(item => item.default !== undefined)?.default;
  return nested;
}

export function buildCatalogInputMetadata(schema: InputSchema): {
  inputMap: CatalogInputMap;
  inputDefaults: Record<string, unknown>;
  inputOptions: Record<string, unknown[]>;
  arrayInputFields: string[];
  requiredProperties: string[];
} {
  const properties = schema.properties || {};
  const inputMap: CatalogInputMap = {};
  (Object.keys(FIELD_ALIASES) as Array<keyof CatalogInputMap>).forEach(key => {
    const alias = firstAlias(properties, key);
    if (alias) inputMap[key] = alias;
  });

  const inputDefaults: Record<string, unknown> = {};
  const inputOptions: Record<string, unknown[]> = {};
  for (const [name, property] of Object.entries(properties)) {
    const value = schemaDefault(property);
    if (value !== undefined) inputDefaults[name] = value;
    const options = property.enum || property.anyOf?.flatMap(item => item.enum || []) || [];
    if (options.length) inputOptions[name] = options;
  }
  for (const name of schema.required || []) {
    if (!(name in inputDefaults) && name in RUNTIME_DEFAULTS) inputDefaults[name] = RUNTIME_DEFAULTS[name];
  }

  const arrayInputFields = Object.entries(properties)
    .filter(([, property]) => property.type === 'array' || property.anyOf?.some(item => item.type === 'array'))
    .map(([name]) => name);

  return {
    inputMap,
    inputDefaults,
    inputOptions,
    arrayInputFields,
    requiredProperties: schema.required || [],
  };
}

export function catalogCompatibility(type: MediaModelType, schema: InputSchema): { compatible: boolean; reason?: string } {
  const { inputMap, inputDefaults, requiredProperties } = buildCatalogInputMetadata(schema);
  const properties = schema.properties || {};
  const knownRuntimeFields = new Set([
    ...Object.values(inputMap).filter((value): value is string => Boolean(value)),
    ...Object.keys(inputDefaults),
    ...Object.keys(RUNTIME_DEFAULTS),
  ]);
  const unknownRequired = requiredProperties.filter(field => !knownRuntimeFields.has(field));
  if (unknownRequired.length) {
    return { compatible: false, reason: `Unsupported required inputs: ${unknownRequired.join(', ')}` };
  }
  const requiresPrompt = type !== 'upscaler' && type !== 'image-to-3d';
  if (requiresPrompt && !inputMap.prompt && 'prompt' in properties === false) {
    return { compatible: false, reason: 'No recognized prompt input' };
  }
  if ((type === 'image-to-image' || type === 'image-to-video' || type === 'reference-to-video' || type === 'image-to-3d' || type === 'upscaler') && !inputMap.image) {
    return { compatible: false, reason: 'No recognized image input' };
  }
  if (type === 'video-to-video' && !inputMap.video) {
    return { compatible: false, reason: 'No recognized video input' };
  }
  return { compatible: true };
}

export function buildUniversalModelInput(
  model: Pick<DiscoveredModelInfo, 'inputMap' | 'inputDefaults' | 'inputOptions' | 'arrayInputFields'>,
  values: {
    prompt: string;
    image?: string | string[];
    video?: string | string[];
    aspectRatio?: string;
    resolution?: string;
    duration?: number;
    outputFormat?: string;
    count?: number;
  },
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...(model.inputDefaults || {}) };
  const map = model.inputMap || { prompt: 'prompt' };
  const arrays = new Set(model.arrayInputFields || []);
  const assign = (field: string | undefined, value: unknown) => {
    if (!field || value === undefined || value === null || value === '') return;
    const options = model.inputOptions?.[field];
    if (options?.length && !options.some(option => String(option) === String(value))) return;
    if (arrays.has(field) && !Array.isArray(value)) payload[field] = [value];
    else if (!arrays.has(field) && Array.isArray(value)) payload[field] = value[0];
    else payload[field] = value;
  };
  assign(map.prompt || 'prompt', values.prompt);
  assign(map.image, values.image);
  assign(map.video, values.video);
  assign(map.aspectRatio, values.aspectRatio);
  assign(map.resolution, values.resolution);
  assign(map.duration, values.duration);
  assign(map.outputFormat, values.outputFormat);
  assign(map.count, values.count);
  return payload;
}

function mediaTypeFromCategory(category: string): MediaModelType | null {
  const value = category.toLowerCase().replace(/_/g, '-');
  if (value.includes('video-to-video') || value.includes('video-edit')) return 'video-to-video';
  if (value.includes('reference-to-video')) return 'reference-to-video';
  if (value.includes('image-to-video')) return 'image-to-video';
  if (value.includes('text-to-video')) return 'text-to-video';
  if (value.includes('image-to-image') || value.includes('image-edit')) return 'image-to-image';
  if (value.includes('text-to-image') || value.includes('image-generation')) return 'text-to-image';
  if (value.includes('upscal')) return 'upscaler';
  if (value.includes('image-to-3d')) return 'image-to-3d';
  if (value.includes('text-to-3d')) return 'text-to-3d';
  return null;
}

function prefixFor(type: MediaModelType, provider: 'fal' | 'wiro'): string {
  if (provider === 'fal') return type.includes('video') ? 'fal-video:' : type === 'image-to-image' ? 'fal-edit:' : 'fal:';
  return type.includes('video') ? 'wiro-video:' : type === 'image-to-image' ? 'wiro-edit:' : 'wiro:';
}

function safeDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const numeric = Number(value);
  const date = Number.isFinite(numeric) && numeric > 0
    ? new Date(numeric * (numeric < 10_000_000_000 ? 1000 : 1))
    : new Date(String(value));
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

function recentlyUpdated(value: string | undefined, days = 45): boolean {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp >= Date.now() - days * 86_400_000;
}

function extractFalInputSchema(model: any): InputSchema {
  const schemas = model?.openapi?.components?.schemas || {};
  const path = model?.openapi?.paths?.[`/${model.endpoint_id}`] || Object.entries(model?.openapi?.paths || {})
    .find(([key]) => !key.includes('{request_id}') && key.endsWith(model.endpoint_id))?.[1];
  const requestSchema = (path as any)?.post?.requestBody?.content?.['application/json']?.schema;
  const ref = requestSchema?.$ref;
  if (ref) return schemas[ref.split('/').pop()] || {};
  return requestSchema || {};
}

function parsePrice(dynamicPrice: unknown, fallback: number): number {
  if (typeof dynamicPrice === 'number' && dynamicPrice > 0) return dynamicPrice;
  if (typeof dynamicPrice === 'string') {
    try {
      const parsed = JSON.parse(dynamicPrice);
      const prices = (Array.isArray(parsed) ? parsed : []).map(item => Number(item?.price)).filter(price => price > 0);
      if (prices.length) return Math.min(...prices);
    } catch {}
  }
  return fallback;
}

function normalizeFalModel(raw: any): { model?: DiscoveredModelInfo; reason?: string } {
  const endpoint = String(raw?.endpoint_id || '');
  const metadata = raw?.metadata || {};
  const type = mediaTypeFromCategory(String(metadata.category || ''));
  if (!endpoint || !type || type === 'upscaler') return { reason: 'Unsupported media category' };
  const schema = extractFalInputSchema(raw);
  const compatibility = catalogCompatibility(type, schema);
  if (!compatibility.compatible) return { reason: compatibility.reason };
  const input = buildCatalogInputMetadata(schema);
  const updatedAt = safeDate(metadata.updated_at || metadata.date);
  return {
    model: {
      id: `${prefixFor(type, 'fal')}${endpoint}`,
      name: String(metadata.display_name || endpoint.split('/').pop() || endpoint),
      provider: 'fal.ai',
      type,
      price: type.includes('video') ? 0.25 : 0.04,
      description: String(metadata.description || `Live fal.ai ${type} model`).trim(),
      apiPath: endpoint,
      hasEditVariant: false,
      hasReferenceImage: Boolean(input.inputMap.image),
      editImageField: input.arrayInputFields.includes(input.inputMap.image || '') ? 'images' : 'image',
      supportedProperties: Object.keys(schema.properties || {}),
      ...input,
      catalogSource: 'live',
      catalogUpdatedAt: updatedAt,
      isNew: recentlyUpdated(updatedAt),
    },
  };
}

function wiroSchema(raw: any): InputSchema {
  const items = (raw?.parameters || []).flatMap((group: any) => Array.isArray(group?.items) ? group.items : []);
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];
  for (const item of items) {
    const id = String(item?.id || '');
    if (!id) continue;
    const type = String(item?.type || '').toLowerCase();
    properties[id] = {
      type: type.includes('multiple') || type.includes('combinefile') ? 'array' : type.includes('range') ? 'number' : 'string',
      default: item?.defaultvalue !== '' && item?.defaultvalue !== undefined ? item.defaultvalue : undefined,
      enum: Array.isArray(item?.options) ? item.options.map((option: any) => option?.value).filter((value: unknown) => value !== undefined) : undefined,
    };
    if (item?.required === true || item?.required === 'true') required.push(id);
  }
  return { properties, required };
}

function normalizeWiroModels(raw: any): { models: DiscoveredModelInfo[]; reasons: string[] } {
  const owner = String(raw?.cleanslugowner || raw?.slugowner || '').toLowerCase();
  const slug = String(raw?.cleanslugproject || raw?.slugproject || '').toLowerCase();
  const categories: string[] = Array.isArray(raw?.categories) ? raw.categories.map(String) : [];
  const types: MediaModelType[] = [];
  for (const category of categories) {
    const type = mediaTypeFromCategory(category);
    if (type && type !== 'upscaler' && !types.includes(type)) types.push(type);
  }
  if (!owner || !slug || !types.length) return { models: [], reasons: ['Unsupported media category'] };
  const schema = wiroSchema(raw);
  const input = buildCatalogInputMetadata(schema);
  const updatedAt = safeDate(raw?.modifiedtime || raw?.time);
  const models: DiscoveredModelInfo[] = [];
  const reasons: string[] = [];
  for (const type of types) {
    const compatibility = catalogCompatibility(type, schema);
    if (!compatibility.compatible) {
      reasons.push(`${type}: ${compatibility.reason || 'Needs adapter'}`);
      continue;
    }
    models.push({
      id: type.includes('video')
        ? `wiro-video:${type}:${owner}/${slug}`
        : `${prefixFor(type, 'wiro')}${owner}/${slug}`,
      name: String(raw?.title || `${owner}/${slug}`),
      provider: `Wiro ${owner.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}`,
      type,
      price: parsePrice(raw?.dynamicprice, Number(raw?.approximatelycost) || (type.includes('video') ? 0.25 : 0.04)),
      description: String(raw?.description || `Live Wiro ${type} model`).trim(),
      apiPath: `${owner}/${slug}`,
      hasEditVariant: false,
      hasReferenceImage: Boolean(input.inputMap.image),
      editImageField: input.arrayInputFields.includes(input.inputMap.image || '') ? 'images' : 'image',
      supportedProperties: Object.keys(schema.properties || {}),
      ...input,
      catalogSource: 'live',
      catalogUpdatedAt: updatedAt,
      isNew: recentlyUpdated(updatedAt),
    });
  }
  return { models, reasons };
}

function releaseFamily(model: Pick<DiscoveredModelInfo, 'id' | 'name'>): string {
  const value = `${model.id} ${model.name}`.toLowerCase();
  const known = value.match(/\b(seedream|seedance|wan|kling|flux|qwen|hunyuan|veo|sora|minimax|hailuo|runway|ideogram|recraft)\b/);
  if (known) return known[1];
  return model.name.toLowerCase()
    .replace(/\b(?:v?\d+(?:\.\d+)*|prime|pro|max|ultra|turbo|fast|edit)\b/g, '')
    .replace(/[^a-z]+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 2)
    .join('-');
}

export function modelReleaseScore(model: Pick<DiscoveredModelInfo, 'id' | 'name'>): number {
  const value = `${model.id} ${model.name}`.toLowerCase();
  const versionMatches = [...value.matchAll(/(?:^|[^a-z])v?(\d+)(?:[.-](\d+))?(?:[.-](\d+))?/g)];
  const version = versionMatches.reduce((best, match) => {
    const score = Number(match[1] || 0) * 10_000 + Number(match[2] || 0) * 100 + Number(match[3] || 0);
    return Math.max(best, score);
  }, 0);
  const tier = /\bprime\b/.test(value) ? 90 : /\bultra\b/.test(value) ? 80 : /\bpro\b/.test(value) ? 70 : /\bmax\b/.test(value) ? 60 : /\bturbo\b/.test(value) ? 40 : /\bfast\b/.test(value) ? 20 : 0;
  return version * 100 + tier;
}

export function annotateLatestUpgrades<T extends DiscoveredModelInfo>(models: T[]): T[] {
  const best = new Map<string, number>();
  for (const model of models) {
    const key = `${model.provider.toLowerCase()}:${releaseFamily(model)}:${model.type}`;
    best.set(key, Math.max(best.get(key) || 0, modelReleaseScore(model)));
  }
  return models.map(model => {
    const key = `${model.provider.toLowerCase()}:${releaseFamily(model)}:${model.type}`;
    const score = modelReleaseScore(model);
    const isUpgrade = score > 0 && score === best.get(key) && /\b(?:prime|pro|max|ultra)|(?:^|[^a-z])v?\d+(?:[.-]\d+)+/i.test(`${model.id} ${model.name}`);
    return {
      ...model,
      isUpgrade,
      releaseLabel: model.isNew ? 'New' : isUpgrade ? 'Latest' : undefined,
    };
  });
}

async function fetchJson(url: string, init: RequestInit): Promise<any> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${String(payload?.message || payload?.error || 'catalog request failed')}`);
  return payload;
}

async function discoverFal(falKey: string): Promise<{ raw: number; models: DiscoveredModelInfo[]; pending: ProviderCatalogSnapshot['pendingModels'] }> {
  const categories = ['text-to-image', 'image-to-image', 'text-to-video', 'image-to-video', 'video-to-video'];
  const pageResults = await Promise.allSettled(categories.map(category => fetchJson(
    `https://api.fal.ai/v1/models?limit=8&status=active&category=${encodeURIComponent(category)}&expand=openapi-3.0`,
    { headers: { Authorization: `Key ${falKey}` } },
  )));
  const pages = pageResults.filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled').map(result => result.value);
  if (!pages.length) {
    const firstFailure = pageResults.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    throw firstFailure?.reason || new Error('fal.ai returned no catalog pages');
  }
  const rawModels = [...new Map(pages.flatMap(page => page?.models || []).map((model: any) => [model.endpoint_id, model])).values()];
  const models: DiscoveredModelInfo[] = [];
  const pending: ProviderCatalogSnapshot['pendingModels'] = [];
  for (const raw of rawModels) {
    const normalized = normalizeFalModel(raw);
    if (normalized.model) models.push(normalized.model);
    else pending.push({ provider: 'fal.ai', id: String(raw?.endpoint_id || 'unknown'), reason: normalized.reason || 'Needs adapter' });
  }
  return { raw: rawModels.length, models, pending };
}

function wiroHeaders(key: string, secret: string, nonceOffset = 0): Record<string, string> {
  const nonce = String(Date.now() + nonceOffset);
  const signature = nodeCrypto.createHmac('sha256', key).update(secret + nonce).digest('hex');
  return { 'Content-Type': 'application/json', 'x-api-key': key, 'x-nonce': nonce, 'x-signature': signature };
}

async function discoverWiro(key: string, secret: string): Promise<{ raw: number; models: DiscoveredModelInfo[]; pending: ProviderCatalogSnapshot['pendingModels'] }> {
  const categories = ['text-to-image', 'image-to-image', 'text-to-video', 'image-to-video', 'video-to-video'];
  const pages = await Promise.all(categories.map((category, index) => fetchJson('https://api.wiro.ai/v1/Tool/List', {
    method: 'POST',
    headers: wiroHeaders(key, secret, index),
    body: JSON.stringify({ start: '0', limit: '12', categories: [category], sort: 'time', order: 'DESC', summary: true, hideworkflows: true }),
  })));
  const summaries = [...new Map(pages.flatMap(page => page?.tool || []).map((model: any) => [`${model.cleanslugowner}/${model.cleanslugproject}`, model])).values()].slice(0, 30);
  const detailResults = await Promise.allSettled(summaries.map((model: any, index) => fetchJson('https://api.wiro.ai/v1/Tool/Detail', {
    method: 'POST',
    headers: wiroHeaders(key, secret, 100 + index),
    body: JSON.stringify({ slugowner: model.cleanslugowner, slugproject: model.cleanslugproject }),
  })));
  const detailed = detailResults.map((result, index) => result.status === 'fulfilled' ? result.value?.tool?.[0] : summaries[index]);
  const models: DiscoveredModelInfo[] = [];
  const pending: ProviderCatalogSnapshot['pendingModels'] = [];
  detailed.forEach((raw: any) => {
    const normalized = normalizeWiroModels(raw);
    models.push(...normalized.models);
    normalized.reasons.forEach(reason => pending.push({
      provider: 'Wiro',
      id: `${raw?.cleanslugowner || 'unknown'}/${raw?.cleanslugproject || 'unknown'}`,
      reason,
    }));
  });
  return { raw: summaries.length, models, pending };
}

async function discoverRunware(key: string): Promise<{ raw: number; models: DiscoveredModelInfo[]; pending: ProviderCatalogSnapshot['pendingModels'] }> {
  const searches = (process.env.RUNWARE_MODEL_DISCOVERY_SEARCHES || 'image,portrait,photorealistic').split(',').map(value => value.trim()).filter(Boolean);
  const tasks = searches.map(search => ({
    taskType: 'modelSearch',
    taskUUID: nodeCrypto.randomUUID(),
    search,
    category: 'checkpoint',
    visibility: 'public',
    limit: 20,
    offset: 0,
    sort: '-updatedDateUnixTimestamp',
  }));
  const payload = await fetchJson('https://api.runware.ai/v1', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(tasks),
  });
  const results = [...new Map((payload?.data || []).flatMap((entry: any) => entry?.results || []).map((model: any) => [model.air, model])).values()];
  const models = results.map((raw: any): DiscoveredModelInfo => ({
    id: `runware:${raw.air}`,
    name: String(raw.name || raw.air),
    provider: raw.source === 'community' ? 'Runware Community' : 'Runware',
    type: 'text-to-image',
    price: 0.004,
    description: String(raw.shortDescription || `Live Runware ${raw.architecture || ''} image model`).trim(),
    apiPath: String(raw.air),
    hasEditVariant: false,
    hasReferenceImage: Array.isArray(raw.capabilities) && raw.capabilities.some((capability: string) => /image-to-image/i.test(capability)),
    supportedProperties: Array.isArray(raw.capabilities) ? raw.capabilities : [],
    catalogSource: 'live',
    catalogUpdatedAt: safeDate(raw.updatedDateUnixTimestamp || raw.addedUnixTimestamp),
    isNew: recentlyUpdated(safeDate(raw.addedUnixTimestamp)),
  }));
  return { raw: results.length, models, pending: [] };
}

function splitModels(models: DiscoveredModelInfo[]) {
  return {
    models: models.filter(model => model.type === 'text-to-image'),
    editModels: models.filter(model => model.type === 'image-to-image'),
    videoModels: models.filter(model => model.type.includes('video')),
  };
}

export async function discoverProviderMediaModels(credentials: {
  falKey?: string;
  wiroKey?: string;
  wiroSecret?: string;
  runwareKey?: string;
}): Promise<ProviderCatalogSnapshot> {
  const checkedAt = new Date().toISOString();
  const providers: Record<string, ProviderCatalogStatus> = {};
  const pendingModels: ProviderCatalogSnapshot['pendingModels'] = [];
  const allModels: DiscoveredModelInfo[] = [];
  const jobs: Array<{ name: string; configured: boolean; promise?: Promise<{ raw: number; models: DiscoveredModelInfo[]; pending: ProviderCatalogSnapshot['pendingModels'] }> }> = [
    { name: 'fal.ai', configured: Boolean(credentials.falKey), promise: credentials.falKey ? discoverFal(credentials.falKey) : undefined },
    { name: 'Wiro', configured: Boolean(credentials.wiroKey && credentials.wiroSecret), promise: credentials.wiroKey && credentials.wiroSecret ? discoverWiro(credentials.wiroKey, credentials.wiroSecret) : undefined },
    { name: 'Runware', configured: Boolean(credentials.runwareKey), promise: credentials.runwareKey ? discoverRunware(credentials.runwareKey) : undefined },
  ];

  await Promise.all(jobs.map(async job => {
    if (!job.configured || !job.promise) {
      providers[job.name] = { configured: false, ok: false, discovered: 0, compatible: 0, pendingAdapters: 0 };
      return;
    }
    try {
      const result = await job.promise;
      allModels.push(...result.models);
      pendingModels.push(...result.pending);
      providers[job.name] = { configured: true, ok: true, discovered: result.raw, compatible: result.models.length, pendingAdapters: result.pending.length };
    } catch (error) {
      providers[job.name] = { configured: true, ok: false, discovered: 0, compatible: 0, pendingAdapters: 0, error: error instanceof Error ? error.message : String(error) };
    }
  }));

  const split = splitModels(annotateLatestUpgrades(allModels));
  return { checkedAt, ...split, pendingModels, providers };
}

export function mergeModels<T extends { id: string }>(...lists: T[][]): T[] {
  return [...new Map(lists.flat().map(model => [model.id, model])).values()];
}
