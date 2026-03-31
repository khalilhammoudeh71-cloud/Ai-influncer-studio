import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI, { toFile } from 'openai';
import { GoogleGenAI } from '@google/genai';
import { Pool } from '@neondatabase/serverless';
import apiRoutes from './routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use('/api', apiRoutes);

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey || !baseURL) {
    throw new Error('OpenAI integration not configured yet. Please enable it in your Replit integrations.');
  }
  return new OpenAI({ apiKey, baseURL });
}

const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY || '';
const WAVESPEED_BASE = 'https://api.wavespeed.ai/api/v3';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  type: 'text-to-image' | 'image-to-image' | 'upscaler';
  price: number;
  description: string;
  apiPath: string;
  hasEditVariant: boolean;
  editApiPath?: string;
  editImageField?: 'image' | 'images';
  editHasStrengthControl?: boolean;
  isIdentityModel?: boolean;
  nsfw?: boolean;
  hasReferenceImage?: boolean;
}

const NSFW_MODEL_IDS = new Set([
  'wavespeed-ai/wan-2.1-i2v-480p',
  'wavespeed-ai/wan-2.1-i2v-720p',
  'wavespeed-ai/wan-2.1-i2v-720p-bf16',
  'wavespeed-ai/wan-2.1-t2v-480p',
  'wavespeed-ai/wan-2.1-t2v-720p',
  'wavespeed-ai/wan-2.1-t2v-720p-bf16',
  'wavespeed-ai/wan-2.2-i2v-720p',
  'wavespeed-ai/wan-2.2-t2v-720p',
  'alibaba/wan2.1-i2v-720p',
  'alibaba/wan2.1-t2v-720p',
  'wavespeed-ai/seededit-v3.0',
  'wavespeed-ai/seededit-v2.0',
  'wavespeed-ai/firered-v1.5-image',
  'wavespeed-ai/firered-v1.5-image-lora',
  'wavespeed-ai/higgsfield-t2v-01',
  'wavespeed-ai/higgsfield-i2v-01',
  'wavespeed-ai/uso-full',
  'wavespeed-ai/z-image',
  'wavespeed-ai/glm-image',
]);

const NSFW_MODEL_FRAGMENTS = [
  '/wan-2',
  'alibaba/wan',
  'seededit',
  'seedream',
  'firered',
  'higgsfield',
  '/uso',
  'z-image',
  'glm-image',
  'spicy',
];

function isNsfwModel(modelId: string): boolean {
  if (NSFW_MODEL_IDS.has(modelId)) return true;
  return NSFW_MODEL_FRAGMENTS.some(f => modelId.includes(f));
}

const ANGLE_MODEL_CONFIGS: Record<string, { name: string; apiPath: string; imageField: 'image' | 'images'; nsfw: boolean }> = {
  'angle-qwen-multiple': {
    name: 'Qwen Multiple Angles',
    apiPath: '/api/v3/wavespeed-ai/qwen-image/edit-multiple-angles',
    imageField: 'images',
    nsfw: false,
  },
  'angle-qwen-multiple-2509': {
    name: 'Qwen Multiple Angles v2',
    apiPath: '/api/v3/wavespeed-ai/qwen-image/edit-2509-multiple-angles',
    imageField: 'images',
    nsfw: false,
  },
  'angle-wan22': {
    name: 'Wan 2.2 (Uncensored)',
    apiPath: '/api/v3/wavespeed-ai/wan-2.2/image-to-image',
    imageField: 'image',
    nsfw: true,
  },
  'angle-seededit-v3': {
    name: 'SeedEdit v3 (Uncensored)',
    apiPath: '/api/v3/bytedance/seededit-v3',
    imageField: 'image',
    nsfw: true,
  },
};

let cachedModels: ModelInfo[] | null = null;
let cachedEditModels: ModelInfo[] | null = null;
let cachedUpscaleModels: ModelInfo[] | null = null;
let cachedVideoModels: ModelInfo[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000;

const SUBSCRIPTION_FREE_MODELS = [
  'google/nano-banana-2',
  'google/nano-banana-pro',
  'google/veo2',
  'google/veo3',
  'google/veo3-fast',
  'google/veo3.1',
  'google/veo3.1-fast',
];

function applySubscriptionPricing(modelId: string, basePrice: number): number {
  const cleanId = modelId.replace(/\/(text-to-image|image-to-image|text-to-video|image-to-video|reference-to-video|edit|upscale).*$/, '');
  return SUBSCRIPTION_FREE_MODELS.some(sub => cleanId === sub || cleanId.startsWith(sub + '/')) ? 0 : basePrice;
}

const PROVIDER_NAMES: Record<string, string> = {
  'google': 'Google',
  'openai': 'OpenAI',
  'wavespeed-ai': 'Wavespeed AI',
  'bytedance': 'ByteDance',
  'stability-ai': 'Stability AI',
  'x-ai': 'xAI',
  'midjourney': 'Midjourney',
  'kwaivgi': 'Kling',
  'recraft-ai': 'Recraft',
  'alibaba': 'Alibaba',
  'z-ai': 'Zhipu AI',
  'leonardoai': 'Leonardo AI',
  'reve': 'Reve',
  'vidu': 'Vidu',
  'higgsfield': 'Higgsfield',
  'nvidia': 'NVIDIA',
  'bria': 'Bria',
  'clarity-ai': 'Clarity AI',
  'runwayml': 'Runway',
};

async function fetchWavespeedModels(): Promise<ModelInfo[]> {
  if (cachedModels && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedModels;
  }

  try {
    const res = await fetch(`${WAVESPEED_BASE}/models`, {
      headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
    });
    const json = await res.json();
    const rawModels = json.data || [];

    const textToImage = rawModels.filter((m: { type: string }) => m.type === 'text-to-image');
    const imageToImage = rawModels.filter((m: { type: string }) => m.type === 'image-to-image');

    function resolveApiPath(m: { model_id: string; api_schema?: { api_schemas?: { api_path: string }[] } }): string {
      const schemaPath = m.api_schema?.api_schemas?.[0]?.api_path;
      if (schemaPath && schemaPath.includes(m.model_id.split('/').slice(0, 2).join('/'))) {
        return schemaPath;
      }
      return `/api/v3/${m.model_id}`;
    }

    const editLookup = new Map<string, { model: { model_id: string; api_schema?: { api_schemas?: { api_path: string; request_schema?: { properties?: Record<string, unknown> } }[] } }; imageField: 'image' | 'images'; hasStrengthControl: boolean }>();
    imageToImage.forEach((m: { model_id: string; api_schema?: { api_schemas?: { api_path: string; request_schema?: { properties?: Record<string, unknown> } }[] } }) => {
      const base = m.model_id
        .replace('/edit', '')
        .replace('/image-to-image', '');
      const props = m.api_schema?.api_schemas?.[0]?.request_schema?.properties || {};
      const imageField: 'image' | 'images' = props.images ? 'images' : 'image';
      const hasStrengthControl = 'strength' in props || 'denoise_strength' in props;
      editLookup.set(base, { model: m, imageField, hasStrengthControl });
    });

    const editModelIds = new Set(imageToImage.map((m: { model_id: string }) => m.model_id));

    const models: ModelInfo[] = textToImage.map((m: { model_id: string; base_price: number; description?: string; api_schema?: { api_schemas?: { api_path: string }[] } }) => {
      const base = m.model_id.replace('/text-to-image', '');
      const editEntry = editLookup.get(base);
      const editModel = editEntry?.model;
      const hasRealEditVariant = editModel ? editModelIds.has(editModel.model_id) : false;
      const apiPath = resolveApiPath(m);

      const providerSlash = m.model_id.indexOf('/');
      const provider = m.model_id.slice(0, providerSlash);

      const friendlyName = m.model_id
        .replace('/text-to-image', '')
        .split('/')
        .slice(1)
        .join(' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      return {
        id: `wavespeed:${m.model_id}`,
        name: friendlyName,
        provider: PROVIDER_NAMES[provider] || provider,
        type: 'text-to-image' as const,
        price: applySubscriptionPricing(m.model_id, m.base_price),
        description: m.description || '',
        apiPath,
        hasEditVariant: hasRealEditVariant,
        editApiPath: hasRealEditVariant && editModel
          ? resolveApiPath(editModel)
          : undefined,
        editImageField: hasRealEditVariant ? editEntry?.imageField : undefined,
        editHasStrengthControl: hasRealEditVariant ? (editEntry?.hasStrengthControl ?? false) : undefined,
        nsfw: isNsfwModel(m.model_id),
      };
    });

    const identityModelDefs = [
      {
        modelId: 'wavespeed-ai/flux-pulid',
        name: 'FLUX PuLID',
        price: 0.02,
        description: 'Face-consistent generation via PuLID identity injection',
      },
      {
        modelId: 'wavespeed-ai/instant-character',
        name: 'Instant Character',
        price: 0.10,
        description: 'Identity-consistent character generation',
      },
    ];
    const identityModels: ModelInfo[] = identityModelDefs
      .filter(def => rawModels.some((m: { model_id: string }) => m.model_id === def.modelId))
      .map(def => ({
        id: `wavespeed:${def.modelId}`,
        name: def.name,
        provider: 'Wavespeed AI',
        type: 'text-to-image' as const,
        price: def.price,
        description: def.description,
        apiPath: `/api/v3/${def.modelId}`,
        hasEditVariant: true,
        editApiPath: `/api/v3/${def.modelId}`,
        editImageField: 'image' as const,
        editHasStrengthControl: false,
        isIdentityModel: true,
        nsfw: false,
      }));

    models.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

    const editModels: ModelInfo[] = imageToImage.map((m: { model_id: string; base_price: number; description?: string; api_schema?: { api_schemas?: { api_path: string; request_schema?: { properties?: Record<string, unknown> } }[] } }) => {
      const apiPath = resolveApiPath(m);
      const providerSlash = m.model_id.indexOf('/');
      const provider = m.model_id.slice(0, providerSlash);
      const props = m.api_schema?.api_schemas?.[0]?.request_schema?.properties || {};
      const imageField: 'image' | 'images' = props.images ? 'images' : 'image';

      const friendlyName = m.model_id
        .replace('/image-to-image', '')
        .replace('/edit', '')
        .split('/')
        .slice(1)
        .join(' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      return {
        id: `wavespeed-edit:${m.model_id}`,
        name: friendlyName,
        provider: PROVIDER_NAMES[provider] || provider,
        type: 'image-to-image' as const,
        price: applySubscriptionPricing(m.model_id, m.base_price),
        description: m.description || '',
        apiPath,
        hasEditVariant: false,
        editImageField: imageField,
        nsfw: isNsfwModel(m.model_id),
      };
    });
    editModels.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

    const upscalerModels = rawModels.filter((m: { type: string; model_id: string; api_schema?: { api_schemas?: { request_schema?: { properties?: Record<string, unknown> } }[] } }) => {
      if (m.type !== 'upscaler') return false;
      if (m.model_id.toLowerCase().includes('video')) return false;
      const props = m.api_schema?.api_schemas?.[0]?.request_schema?.properties || {};
      if (props.video && !props.image && !props.images) return false;
      return true;
    });
    const upscaleModels: ModelInfo[] = upscalerModels.map((m: { model_id: string; base_price: number; description?: string; api_schema?: { api_schemas?: { api_path: string; request_schema?: { properties?: Record<string, unknown> } }[] } }) => {
      const apiPath = m.api_schema?.api_schemas?.[0]?.api_path || `/api/v3/${m.model_id}`;
      const providerSlash = m.model_id.indexOf('/');
      const provider = m.model_id.slice(0, providerSlash);
      const props = m.api_schema?.api_schemas?.[0]?.request_schema?.properties || {};
      const imageField: 'image' | 'images' = props.images ? 'images' : 'image';

      const friendlyName = m.model_id
        .split('/')
        .slice(1)
        .join(' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      return {
        id: `wavespeed-upscale:${m.model_id}`,
        name: friendlyName,
        provider: PROVIDER_NAMES[provider] || provider,
        type: 'upscaler' as const,
        price: applySubscriptionPricing(m.model_id, m.base_price),
        description: m.description || '',
        apiPath,
        hasEditVariant: false,
        editImageField: imageField,
        nsfw: isNsfwModel(m.model_id),
      };
    });
    upscaleModels.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

    const textToVideo = rawModels.filter((m: { type: string }) => m.type === 'text-to-video');
    const imageToVideo = rawModels.filter((m: { type: string }) => m.type === 'image-to-video');

    const videoModels: ModelInfo[] = [
      ...textToVideo.map((m: { model_id: string; base_price: number; description?: string; api_schema?: { api_schemas?: { api_path: string; request_schema?: { properties?: Record<string, unknown> } }[] } }) => {
        const apiPath = resolveApiPath(m);
        const providerSlash = m.model_id.indexOf('/');
        const provider = m.model_id.slice(0, providerSlash);
        const friendlyName = m.model_id
          .replace('/text-to-video', '')
          .split('/').slice(1).join(' ')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

        return {
          id: `wavespeed-t2v:${m.model_id}`,
          name: friendlyName,
          provider: PROVIDER_NAMES[provider] || provider,
          type: 'text-to-video' as const,
          price: applySubscriptionPricing(m.model_id, m.base_price),
          description: m.description || '',
          apiPath,
          hasEditVariant: false,
          nsfw: isNsfwModel(m.model_id),
        };
      }),
      ...imageToVideo.map((m: { model_id: string; base_price: number; description?: string; api_schema?: { api_schemas?: { api_path: string; request_schema?: { properties?: Record<string, unknown> } }[] } }) => {
        const apiPath = resolveApiPath(m);
        const providerSlash = m.model_id.indexOf('/');
        const provider = m.model_id.slice(0, providerSlash);
        const props = m.api_schema?.api_schemas?.[0]?.request_schema?.properties || {};
        const imageField: 'image' | 'images' = props.images ? 'images' : 'image';
        const friendlyName = m.model_id
          .replace('/image-to-video', '')
          .split('/').slice(1).join(' ')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

        return {
          id: `wavespeed-i2v:${m.model_id}`,
          name: friendlyName,
          provider: PROVIDER_NAMES[provider] || provider,
          type: 'image-to-video' as const,
          price: applySubscriptionPricing(m.model_id, m.base_price),
          description: m.description || '',
          apiPath,
          hasEditVariant: false,
          editImageField: imageField,
          nsfw: isNsfwModel(m.model_id),
        };
      }),
    ];
    videoModels.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

    cachedModels = [...identityModels, ...models];
    cachedEditModels = editModels;
    cachedUpscaleModels = upscaleModels;
    cachedVideoModels = videoModels;
    cacheTimestamp = Date.now();
    return cachedModels;
  } catch (err) {
    console.error('[Wavespeed] Failed to fetch models:', err);
    return cachedModels || [];
  }
}

function getAllModels(wavespeedModels: ModelInfo[]): ModelInfo[] {
  const builtIn: ModelInfo[] = [
    {
      id: 'replit:gpt-image-1',
      name: 'GPT Image 1 (DALL-E)',
      provider: 'Replit Built-in',
      type: 'text-to-image',
      price: 0,
      description: 'OpenAI DALL-E image generation via Replit integration (included free)',
      apiPath: '',
      hasEditVariant: true,
    },
  ];
  // Filter out Google/Nano Banana models from Wavespeed — these are served directly via Gemini API
  const filtered = wavespeedModels.filter(m => !/nano-banana/i.test(m.id));
  return [...builtIn, ...filtered];
}

interface ImageGenRequest {
  personaName: string;
  niche: string;
  tone: string;
  visualStyle: string;
  environment?: string;
  outfitStyle?: string;
  framing?: string;
  mood?: string;
  additionalInstructions?: string;
  isChatContext?: boolean;
  chatPrompt?: string;
  referenceImage?: string;
  additionalImages?: string[];
  aspectRatio?: string;
  faceDescriptor?: string;
  naturalLook?: boolean;
  identityLock?: boolean;
}

function buildPrompt(body: ImageGenRequest, useEditInstructionStyle = false): string {
  const { personaName, niche, tone, visualStyle, environment, outfitStyle, framing, mood, additionalInstructions, isChatContext, chatPrompt, referenceImage, faceDescriptor, naturalLook, identityLock } = body;
  const hasRef = !!referenceImage;
  const realismTerms = 'Candid photography, natural skin texture, subtle skin pores, film grain, not over-retouched, authentic photograph.';
  const identityLockTerms = 'IDENTITY LOCK: Reproduce the exact same facial features in every detail — identical bone structure, eye shape and spacing, nose shape, lip shape, and jawline. This is the same person. Do not reinterpret or alter the face.';

  if (isChatContext) {
    if (hasRef && useEditInstructionStyle) {
      const sceneParts: string[] = [];
      if (chatPrompt) sceneParts.push(chatPrompt);
      if (visualStyle) sceneParts.push(`Visual style: ${visualStyle}`);
      let p = `The reference image shows the EXACT person. Keep their face, hair, skin tone, and body proportions identical.`;
      if (faceDescriptor) p += ` Appearance: ${faceDescriptor}.`;
      p += ` Generate them in the following scene: ${sceneParts.join('. ')}. Photorealistic, high-quality social media photo.`;
      if (identityLock) p += ` ${identityLockTerms}`;
      if (naturalLook) p += ` ${realismTerms}`;
      return p;
    }
    const refNote = hasRef
      ? 'CRITICAL: The reference image shows the EXACT person to depict. Preserve all facial features identically — same face shape, eyes, nose, mouth, skin tone, hair color and texture. The person must look like the same individual.'
      : '';
    const descriptorNote = faceDescriptor ? `\nAppearance: ${faceDescriptor}` : '';
    const parts = [
      `A high-quality, photorealistic social media photo of an AI influencer named ${personaName}. Niche: ${niche}. Tone/Style: ${tone}. Visual Style: ${visualStyle}.`,
      `The user requested: "${chatPrompt}".`,
      refNote,
      descriptorNote,
      'Create a realistic, visually compelling image suitable for social media.',
    ];
    if (identityLock) parts.push(identityLockTerms);
    if (naturalLook) parts.push(realismTerms);
    return parts.filter(Boolean).join('\n').trim();
  }

  const SKIP = (v: string | undefined) => !v || v === 'None' || v === 'Custom';

  if (hasRef && useEditInstructionStyle) {
    const sceneParts: string[] = [];
    if (!SKIP(environment)) sceneParts.push(`${environment} environment`);
    if (!SKIP(outfitStyle)) sceneParts.push(`${outfitStyle} outfit`);
    if (!SKIP(framing)) sceneParts.push(`${framing} framing`);
    if (!SKIP(mood)) sceneParts.push(`${mood} mood`);
    if (visualStyle) sceneParts.push(`${visualStyle} visual style`);
    if (additionalInstructions) sceneParts.push(additionalInstructions);
    let p = `The reference image shows the EXACT person. Keep their face, hair, skin tone, and body proportions perfectly identical.`;
    if (faceDescriptor) p += ` Appearance: ${faceDescriptor}.`;
    p += ` Place them in a new scene: ${sceneParts.join(', ')}. Photorealistic, cinematic lighting, professional social media quality.`;
    if (identityLock) p += ` ${identityLockTerms}`;
    if (naturalLook) p += ` ${realismTerms}`;
    return p;
  }

  const parts = [
    `A high-quality, photorealistic social media photo of an AI influencer named ${personaName}.`,
    `Niche: ${niche}. Tone/Style: ${tone}. Visual Style: ${visualStyle}.`,
  ];
  if (faceDescriptor) {
    parts.push(`Appearance: ${faceDescriptor}`);
  }
  if (hasRef) {
    parts.push('CRITICAL: The reference image shows the EXACT person. Preserve ALL facial features identically — same face shape, eyes, nose, lips, skin tone, hair color and texture. The output person must look like the same individual as the reference. Do NOT change the face or identity.');
  }
  if (!SKIP(environment)) parts.push(`Environment: ${environment}.`);
  if (!SKIP(outfitStyle)) parts.push(`Outfit: ${outfitStyle}.`);
  if (!SKIP(framing)) parts.push(`Framing: ${framing}.`);
  if (!SKIP(mood)) parts.push(`Mood: ${mood}.`);
  if (additionalInstructions) parts.push(`Additional details: ${additionalInstructions}`);
  parts.push('Cinematic lighting. Ultra-realistic, professional social media quality.');
  if (identityLock) parts.push(identityLockTerms);
  if (naturalLook) parts.push(realismTerms);

  return parts.join('\n');
}

function stripDataPrefix(dataUrl: string): { data: string; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: 'image/png', data: dataUrl };
}

function aspectRatioToReplitSize(ar?: string): '1024x1024' | '1792x1024' | '1024x1792' {
  if (!ar) return '1024x1024';
  if (ar === '16:9' || ar === '3:2' || ar === '5:4' || ar === '21:9') return '1792x1024';
  if (ar === '9:16' || ar === '2:3' || ar === '4:5') return '1024x1792';
  return '1024x1024';
}

async function generateWithReplit(prompt: string, referenceImage?: string | string[], aspectRatio?: string): Promise<string> {
  const client = getOpenAIClient();
  let response;

  const images = Array.isArray(referenceImage) ? referenceImage : (referenceImage ? [referenceImage] : []);

  if (images.length > 0) {
    const imageFiles = await Promise.all(images.map(async (img, i) => {
      const { mimeType, data } = stripDataPrefix(img);
      const buffer = Buffer.from(data, 'base64');
      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      return toFile(buffer, `reference_${i}.${ext}`, { type: mimeType });
    }));

    response = await client.images.edit({
      model: 'gpt-image-1',
      image: imageFiles as any,
      prompt,
      n: 1,
      size: aspectRatioToReplitSize(aspectRatio),
    });
  } else {
    response = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: aspectRatioToReplitSize(aspectRatio),
    });
  }

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI returned no image data');
  return `data:image/png;base64,${b64}`;
}

const WAVESPEED_ALLOWED_HOSTS = ['api.wavespeed.ai', 'wscdn.wavespeed.ai', 'cdn.wavespeed.ai'];

function isAllowedWavespeedUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    return u.protocol === 'https:' && WAVESPEED_ALLOWED_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

async function fetchAllowedImage(urlStr: string): Promise<string> {
  if (!isAllowedWavespeedUrl(urlStr)) {
    throw new Error('Blocked: image URL from untrusted host');
  }
  const imgRes = await fetch(urlStr);
  if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`);
  const imgBuf = Buffer.from(await imgRes.arrayBuffer());
  const ct = imgRes.headers.get('content-type') || 'image/png';
  const mimeType = ct.split(';')[0].trim();
  console.log('[Wavespeed] Fetched image from URL, size:', imgBuf.length, 'bytes, type:', mimeType);
  return `data:${mimeType};base64,${imgBuf.toString('base64')}`;
}

async function resolveImageToDataUrl(input: string): Promise<string> {
  if (input.startsWith('data:')) {
    return input;
  }
  if (input.startsWith('http://') || input.startsWith('https://')) {
    // For Wavespeed URLs use the existing trusted fetch path
    if (isAllowedWavespeedUrl(input)) {
      return await fetchAllowedImage(input);
    }
    // For any other HTTPS image URL (e.g. visual library images from other CDNs),
    // fetch and validate that the response is actually an image
    if (input.startsWith('https://')) {
      const imgRes = await fetch(input);
      if (!imgRes.ok) throw new Error(`Failed to fetch source image: ${imgRes.status}`);
      const ct = imgRes.headers.get('content-type') || '';
      if (!ct.startsWith('image/')) {
        throw new Error(`Source URL did not return an image (got: ${ct})`);
      }
      const imgBuf = Buffer.from(await imgRes.arrayBuffer());
      const mimeType = ct.split(';')[0].trim();
      console.log('[Image] Fetched external image, size:', imgBuf.length, 'type:', mimeType);
      return `data:${mimeType};base64,${imgBuf.toString('base64')}`;
    }
    throw new Error('Only HTTPS image URLs or base64/data URLs are accepted as source images');
  }
  return `data:image/png;base64,${input}`;
}

function normalizeBase64Output(raw: string): string {
  if (raw.startsWith('data:')) return raw;
  if (raw.startsWith('http')) return raw;
  const mimeType = (raw.charAt(0) === '/' ? 'image/jpeg'
    : raw.startsWith('iVBOR') ? 'image/png'
    : raw.startsWith('R0lGOD') ? 'image/gif'
    : raw.startsWith('UklGR') ? 'image/webp'
    : 'image/png');
  return `data:${mimeType};base64,${raw}`;
}

async function resolveOutputImage(output: string | null | undefined): Promise<string> {
  if (!output) throw new Error('Image generation returned no output (may have been blocked by content filter).');
  if (output.startsWith('data:')) {
    console.log('[Wavespeed] Output: already a data URL, length:', output.length);
    return output;
  }
  if (output.startsWith('http')) {
    console.log('[Wavespeed] Output: URL, fetching:', output.substring(0, 120));
    // Use resolveImageToDataUrl so any HTTPS image URL is accepted (not just Wavespeed CDN)
    return await resolveImageToDataUrl(output);
  }
  const dataUrl = normalizeBase64Output(output);
  console.log('[Wavespeed] Output: raw base64, length:', output.length, 'detected type:', dataUrl.substring(5, dataUrl.indexOf(';')));
  return dataUrl;
}

async function extractWavespeedOutput(json: Record<string, unknown>): Promise<string> {
  const data = json.data as Record<string, unknown> | undefined;
  console.log('[Wavespeed] Response code:', json.code, 'status:', data?.status, 'keys:', data ? Object.keys(data).join(',') : 'none');

  if ((json.code as number) !== 200 || (data?.status as string) === 'failed') {
    throw new Error((data?.error as string) || (json.message as string) || 'Wavespeed request failed');
  }

  const outputs = ((data?.outputs as (string | null)[]) || []).filter((o): o is string => !!o);
  if (outputs.length) {
    return await resolveOutputImage(outputs[0]);
  }

  // All outputs were null — likely blocked by NSFW filter
  const rawOutputs = (data?.outputs as unknown[]) || [];
  if (rawOutputs.length > 0 && rawOutputs.every(o => o === null)) {
    throw new Error('Image was blocked by the content filter. Try a different model or adjust your prompt.');
  }

  const output = data?.output as string | undefined;
  if (output) {
    console.log('[Wavespeed] Found single "output" field instead of "outputs" array');
    return await resolveOutputImage(output);
  }

  const imageUrl = (data?.image_url || data?.imageUrl || data?.image || data?.url) as string | undefined;
  if (imageUrl) {
    console.log('[Wavespeed] Found image URL in data field');
    return await resolveOutputImage(imageUrl);
  }

  const asyncStatuses = new Set(['created', 'pending', 'queued', 'processing', 'completed']);
  const status = data?.status as string | undefined;
  if (status && asyncStatuses.has(status)) {
    const pollUrl = (data?.urls as Record<string, string>)?.get
      || (data?.id ? `https://api.wavespeed.ai/api/v3/predictions/${data.id}/result` : null);

    if (pollUrl && isAllowedWavespeedUrl(pollUrl)) {
      console.log('[Wavespeed] Async job (status:', status, '). Polling:', pollUrl.substring(0, 120));
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise(r => setTimeout(r, 3000));
        const pollRes = await fetch(pollUrl, {
          headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
        });
        const pollJson = await pollRes.json();
        const pollData = pollJson.data || {};
        console.log('[Wavespeed] Poll attempt', attempt + 1, 'status:', pollData.status, 'outputs:', (pollData.outputs || []).length);

        if (pollData.status === 'failed') {
          throw new Error(pollData.error || 'Wavespeed generation failed during polling');
        }

        const pollOutputs = ((pollData.outputs || pollJson.outputs || []) as (string | null)[]).filter((o): o is string => !!o);
        if (pollOutputs.length) {
          return await resolveOutputImage(pollOutputs[0]);
        }

        const pollOutput = pollData.output as string | undefined;
        if (pollOutput) {
          return await resolveOutputImage(pollOutput);
        }

        const pollImageUrl = (pollData.image_url || pollData.imageUrl || pollData.image || pollData.url) as string | undefined;
        if (pollImageUrl) {
          return await resolveOutputImage(pollImageUrl);
        }

        if (pollData.status === 'completed') {
          console.log('[Wavespeed] Poll completed but no outputs. Keys:', Object.keys(pollData).join(','));
          throw new Error('Wavespeed returned completed status but no image data');
        }
      }
      throw new Error('Wavespeed polling timed out after 3 minutes');
    }
  }

  console.log('[Wavespeed] No outputs found. Full data keys:', data ? Object.keys(data).join(',') : 'none');
  throw new Error('No image output from Wavespeed');
}

async function generateWithWavespeed(
  apiPath: string,
  editApiPath: string | undefined,
  editImageField: 'image' | 'images' | undefined,
  prompt: string,
  referenceImage?: string,
  imageWeight?: number,
  editHasStrengthControl?: boolean,
  aspectRatio?: string,
  additionalImages?: string[]
): Promise<string> {
  const hasRef = !!referenceImage;
  const useEditPath = hasRef && editApiPath;
  // Some models (e.g. controlnet, img2img variants) take an image on their main apiPath
  // with no separate editApiPath. Detect these by path patterns.
  const mainPathAcceptsImage = !editApiPath && /controlnet|img2img|image-to-image/.test(apiPath);
  const shouldAttachImage = !!(useEditPath || (hasRef && mainPathAcceptsImage));
  const usePath = useEditPath ? editApiPath! : apiPath;
  console.log('[Wavespeed] Generate:', { hasRef, usePath, apiPath, editHasStrengthControl, mainPathAcceptsImage, additionalImageCount: additionalImages?.length ?? 0 });

  const payload: Record<string, unknown> = {
    prompt,
    enable_sync_mode: true,
    enable_base64_output: true,
  };

  if (aspectRatio) {
    payload.aspect_ratio = aspectRatio;
  }

  if (shouldAttachImage) {
    const b64Url = await resolveImageToDataUrl(referenceImage!);
    const imageField = editImageField === 'images' ? 'images' : 'image';
    console.log('[Wavespeed] Sending reference image via field:', imageField, '(data URL length:', b64Url.length, ')');
    if (imageField === 'images') {
      // Resolve any additional images and append them to the array
      const extraB64Urls = additionalImages && additionalImages.length > 0
        ? await Promise.all(additionalImages.map(img => resolveImageToDataUrl(img)))
        : [];
      payload.images = [b64Url, ...extraB64Urls];
      console.log('[Wavespeed] images array length:', (payload.images as string[]).length);
    } else {
      payload.image = b64Url;
      // For singular-image models, attach the first additional image to image2 if provided
      if (additionalImages && additionalImages.length > 0) {
        const extra = await resolveImageToDataUrl(additionalImages[0]);
        payload.image2 = extra;
        console.log('[Wavespeed] Attached additional image as image2');
      }
    }
    if (useEditPath && editHasStrengthControl) {
      const clampedWeight = (typeof imageWeight === 'number' && isFinite(imageWeight))
        ? Math.min(0.9, Math.max(0.1, imageWeight))
        : 0.35;
      payload.strength = clampedWeight;
      console.log('[Wavespeed] Using strength (imageWeight):', payload.strength);
    } else if (useEditPath) {
      console.log('[Wavespeed] Model does not support strength param — using instruction-based reference mode');
    }
  }

  const url = `https://api.wavespeed.ai${usePath}`;
  const wsController = new AbortController();
  const wsTimeout = setTimeout(() => wsController.abort(), 120000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: wsController.signal,
    });
  } catch (fetchErr) {
    clearTimeout(wsTimeout);
    if ((fetchErr as Error)?.name === 'AbortError') {
      throw new Error('Image generation timed out. The model may be busy — please try again.');
    }
    throw fetchErr;
  } finally {
    clearTimeout(wsTimeout);
  }

  const rawText = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(rawText);
  } catch {
    console.error('[Wavespeed] Non-JSON response (status', res.status, '):', rawText.substring(0, 200));
    if (res.status === 429) throw new Error('Wavespeed rate limit reached. Please wait a moment and try again.');
    if (res.status === 402) throw new Error('Insufficient Wavespeed credits. Please top up your account.');
    throw new Error('Wavespeed service temporarily unavailable. Please try again in a moment.');
  }
  console.log('[Wavespeed] Response code:', json.code, 'message:', json.message || '');

  if (json.code === 400 && useEditPath && /model not found/i.test(json.message || '')) {
    console.log('[Wavespeed] Edit model not found, falling back to text-to-image path:', apiPath);
    const fallbackPayload: Record<string, unknown> = {
      prompt,
      enable_sync_mode: true,
      enable_base64_output: true,
    };
    const fallbackRes = await fetch(`https://api.wavespeed.ai${apiPath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fallbackPayload),
    });
    const fallbackText = await fallbackRes.text();
    let fallbackJson: Record<string, unknown>;
    try {
      fallbackJson = JSON.parse(fallbackText);
    } catch {
      throw new Error('Wavespeed service temporarily unavailable. Please try again in a moment.');
    }
    console.log('[Wavespeed] Fallback response code:', fallbackJson.code);
    return await extractWavespeedOutput(fallbackJson);
  }

  return await extractWavespeedOutput(json);
}

app.get('/api/models', async (_req, res) => {
  try {
    const wavespeedModels = await fetchWavespeedModels();
    const allModels = getAllModels(wavespeedModels);

    const googleImagenModels: ModelInfo[] = [
      {
        id: 'google:gemini-image',
        name: 'Gemini 3.1 Image',
        provider: 'Google',
        type: 'text-to-image',
        price: 0,
        description: 'Google Gemini 3.1 Flash Image — latest model with reference image support.',
        apiPath: '',
        hasEditVariant: false,
        hasReferenceImage: true,
      },
      {
        id: 'google:imagen-3',
        name: 'Imagen 4',
        provider: 'Google',
        type: 'text-to-image',
        price: 0,
        description: 'Google Imagen 4 via Gemini API. High-quality text-to-image.',
        apiPath: '',
        hasEditVariant: false,
        hasReferenceImage: true,
      },
      {
        id: 'google:imagen-3-fast',
        name: 'Imagen 4 Fast',
        provider: 'Google',
        type: 'text-to-image',
        price: 0,
        description: 'Google Imagen 4 Fast via Gemini API. Fastest generation.',
        apiPath: '',
        hasEditVariant: false,
        hasReferenceImage: false,
      },
    ];

    const editModels: ModelInfo[] = [
      {
        id: 'replit:gpt-image-1',
        name: 'GPT Image 1 (DALL-E)',
        provider: 'Replit Built-in',
        type: 'image-to-image',
        price: 0,
        description: 'OpenAI DALL-E image editing via Replit integration',
        apiPath: '',
        hasEditVariant: false,
      },
      ...(cachedEditModels || []),
    ];

    res.json({
      models: [...googleImagenModels, ...allModels],
      editModels,
      upscaleModels: cachedUpscaleModels || [],
      videoModels: cachedVideoModels || [],
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch models' });
  }
});

function getGeminiClient(): GoogleGenAI {
  const directKey = process.env.GEMINI_API_KEY;
  if (directKey) {
    return new GoogleGenAI({ apiKey: directKey });
  }
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  if (!apiKey || !baseUrl) {
    throw new Error('Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.');
  }
  return new GoogleGenAI({ apiKey, httpOptions: { baseUrl } });
}

// Imagen 3 uses Google's /predict endpoint which isn't supported by the integration proxy.
// This client uses the API key directly against Google's standard endpoint.
function getGeminiDirectClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured.');
  }
  return new GoogleGenAI({ apiKey });
}

app.post('/api/generate-content', async (req, res) => {
  const { type, topic, persona, sceneCount } = req.body;

  if (!type || !topic || !persona) {
    return res.status(400).json({ error: 'type, topic, and persona are required' });
  }

  const validTypes = ['prompt', 'transcript', 'multi-scene'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const ai = getGeminiClient();

    const personaContext = `You are ${persona.name}, an AI influencer in the ${persona.niche} niche. Your tone is ${persona.tone}. Your platform is ${persona.platform}. Bio: ${persona.bio}`;

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'prompt') {
      systemPrompt = `${personaContext}\n\nYou are a world-class AI image/video prompt engineer. Generate a single, highly detailed visual prompt for AI image or video generation. The prompt should be tailored to the persona's brand, niche, and visual style. Output ONLY the prompt text — no labels, no explanations, no quotes.`;
      userPrompt = `Generate a detailed AI image/video generation prompt for this topic/idea: "${topic}"\n\nThe prompt should describe the scene, lighting, mood, composition, camera angle, and style in vivid detail. Make it suitable for high-end social media content that matches the persona's brand.`;
    } else if (type === 'transcript') {
      systemPrompt = `${personaContext}\n\nYou are an expert social media scriptwriter. Write in the persona's voice and tone. Create engaging, platform-optimized content. Output the script directly — no meta-commentary.`;
      userPrompt = `Write a single-scene video script/caption for this topic: "${topic}"\n\nInclude:\n- A hook (first line that grabs attention)\n- The main script/caption body (2-4 paragraphs)\n- A call-to-action\n- 5-8 relevant hashtags\n\nFormat it cleanly with clear sections. Write in the persona's authentic voice.`;
    } else if (type === 'multi-scene') {
      const scenes = Math.min(Math.max(sceneCount || 3, 2), 6);
      systemPrompt = `${personaContext}\n\nYou are an expert video production scriptwriter. Create detailed multi-scene video scripts with professional production notes. Write in the persona's voice. Output the script directly.`;
      userPrompt = `Create a ${scenes}-scene video script for this topic: "${topic}"\n\nFor each scene, include:\n- **Scene [number]: [Title]**\n- **Duration**: estimated seconds\n- **Visual Direction**: camera angle, setting, lighting, mood\n- **Dialogue/Voiceover**: what the persona says\n- **On-Screen Text**: any text overlays\n\nEnd with a summary section including:\n- Total estimated duration\n- 5-8 hashtags\n- A suggested caption for posting`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `${systemPrompt}\n\n${userPrompt}`,
      config: {
        maxOutputTokens: 2048,
        temperature: 0.8,
      },
    });

    const content = response.text || '';
    if (!content) {
      throw new Error('Gemini returned empty content');
    }

    return res.json({ content, type });
  } catch (err) {
    console.error('[generate-content] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Content generation failed',
    });
  }
});

app.post('/api/chat', async (req, res) => {
  const { persona, messages, userMessage } = req.body;

  if (!persona || !userMessage) {
    return res.status(400).json({ error: 'persona and userMessage are required' });
  }

  try {
    const ai = getGeminiClient();

    const traits = Array.isArray(persona.personalityTraits) ? persona.personalityTraits.join(', ') : '';
    const voiceRules = persona.brandVoiceRules ? `\nVoice rules: ${persona.brandVoiceRules}` : '';
    const boundaries = persona.contentBoundaries ? `\nBoundaries: ${persona.contentBoundaries}` : '';

    const systemPrompt = `You are ${persona.name}, a real human influencer in the ${persona.niche} space. You are NOT an AI — never say you are, never break character.

Tone: ${persona.tone}
Bio: ${persona.bio || 'No bio provided'}
Platform: ${persona.platform || 'Instagram'}${traits ? `\nPersonality: ${traits}` : ''}${voiceRules}${boundaries}

Chat rules:
- Sound exactly like a real human texting or DM-ing. Casual, warm, and authentic.
- Keep replies short and natural — 1 to 3 sentences unless the topic warrants more.
- Never use bullet points or lists unless it feels completely natural in context.
- Don't start every reply with the person's name.
- Use your persona's unique voice consistently.
- If someone asks if you're AI, deflect charmingly and stay in character.
- Avoid corporate-sounding or overly polished language.`;

    const historyLines = Array.isArray(messages)
      ? messages
          .filter((m: { role: string; content: string }) => m.type === 'text' && m.content)
          .slice(-12)
          .map((m: { role: string; content: string }) =>
            `${m.role === 'user' ? 'Fan' : persona.name}: ${m.content}`
          )
          .join('\n')
      : '';

    const fullPrompt = historyLines
      ? `${systemPrompt}\n\nConversation:\n${historyLines}\nFan: ${userMessage}\n${persona.name}:`
      : `${systemPrompt}\n\nFan: ${userMessage}\n${persona.name}:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: fullPrompt,
      config: { maxOutputTokens: 400, temperature: 0.92 },
    });

    const reply = response.text?.trim() || "Hey, give me a sec — I'll get back to you!";
    return res.json({ reply });
  } catch (err) {
    console.error('[chat] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Chat failed' });
  }
});

app.post('/api/enhance-prompt', async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  if (!WAVESPEED_API_KEY) {
    return res.status(500).json({ error: 'Wavespeed API key not configured' });
  }

  try {
    const wsRes = await fetch('https://api.wavespeed.ai/api/v3/wavespeed-ai/prompt-optimizer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.trim(), enable_sync_mode: true }),
    });

    type PromptOptimizerData = { outputs?: string[]; status?: string; error?: string; urls?: { get?: string } };
    const json = await wsRes.json() as { code: number; message?: string; data?: PromptOptimizerData };
    if (json.code !== 200) {
      throw new Error(json.message || 'Wavespeed prompt enhance failed');
    }

    let data = json.data || {};
    const outputs = data.outputs || [];
    let enhanced = outputs[0] || '';

    if (!enhanced && data.status !== 'failed' && data.urls?.get) {
      const pollUrl = data.urls.get;
      if (!isAllowedWavespeedUrl(pollUrl)) throw new Error('Blocked: poll URL from untrusted host');
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise(r => setTimeout(r, 2000));
        const pollRes = await fetch(pollUrl, { headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` } });
        const pollJson = await pollRes.json() as { data?: PromptOptimizerData };
        data = pollJson.data || {};
        if (data.status === 'failed') throw new Error(data.error || 'Prompt optimizer failed during polling');
        const pollOutputs = data.outputs || [];
        if (pollOutputs[0]) { enhanced = pollOutputs[0]; break; }
      }
    }

    if (!enhanced) {
      throw new Error(data.error || 'Prompt optimizer returned no output');
    }

    return res.json({ enhanced });
  } catch (err) {
    console.error('[enhance-prompt] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Prompt enhancement failed',
    });
  }
});

app.post('/api/create-prompts', async (req, res) => {
  const { request, count, persona } = req.body as {
    request: string;
    count: number;
    persona: { name: string; niche: string; tone: string; visualStyle?: string; platform?: string };
  };

  if (!request || typeof request !== 'string' || !request.trim()) {
    return res.status(400).json({ error: 'request is required' });
  }
  if (!persona || !persona.name) {
    return res.status(400).json({ error: 'persona is required' });
  }

  const n = Math.min(Math.max(Math.round(count || 3), 1), 10);

  try {
    const ai = getGeminiClient();
    const systemPrompt = `You are an expert AI image prompt engineer creating prompts for an AI influencer named ${persona.name}.
Persona details: Niche: ${persona.niche}. Tone/Style: ${persona.tone}.${persona.visualStyle ? ` Visual Style: ${persona.visualStyle}.` : ''}${persona.platform ? ` Platform: ${persona.platform}.` : ''}

You MUST generate EXACTLY ${n} distinct, production-ready AI image generation prompts based on the user's request. Do not stop early — write all ${n} prompts before finishing.
Each prompt should be highly detailed, photorealistic, and suitable for social media. Keep each prompt to 2-3 sentences.
Include specific details about: lighting, composition, environment, mood, camera angle, and visual style.
Output ONLY the ${n} numbered prompts. Format: "1. [prompt]\\n2. [prompt]\\n..." — no extra commentary, no blank lines between prompts.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `${systemPrompt}\n\nUser request: ${request.trim()}`,
      config: { maxOutputTokens: 4096, temperature: 0.85 },
    });

    const raw = response.text?.trim() || '';
    const parts = raw.split(/\n(?=\d+[\.\)]\s)/);
    const prompts: string[] = parts
      .map((part: string) => part.replace(/^\d+[\.\)]\s+/, '').trim())
      .filter((p: string) => p.length > 10);
    if (!prompts.length) {
      throw new Error('No prompts returned from AI');
    }

    return res.json({ prompts: prompts.slice(0, n) });
  } catch (err) {
    console.error('[create-prompts] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Prompt creation failed' });
  }
});

app.post('/api/angle-image', async (req, res) => {
  const { imageBase64, modelId, horizontalAngle, verticalAngle, distance } = req.body as {
    imageBase64: string;
    modelId: string;
    horizontalAngle: string;
    verticalAngle: string;
    distance: string;
  };

  if (!imageBase64 || !modelId || !horizontalAngle || !verticalAngle || !distance) {
    return res.status(400).json({ error: 'imageBase64, modelId, horizontalAngle, verticalAngle, and distance are required' });
  }

  if (!WAVESPEED_API_KEY) {
    return res.status(500).json({ error: 'Wavespeed API key not configured' });
  }

  const config = ANGLE_MODEL_CONFIGS[modelId];
  if (!config) {
    return res.status(400).json({ error: `Unknown angle model: ${modelId}` });
  }

  const prompt = `Change the camera angle to ${horizontalAngle} perspective, ${verticalAngle} elevation, ${distance}. Adjust only the camera viewpoint and framing while preserving all subject details, appearance, clothing, and environment. Maintain consistent facial features, hair, and body proportions. Apply a photorealistic, high-quality rendering.`;

  try {
    const b64Image = await resolveImageToDataUrl(imageBase64);
    const payload: Record<string, unknown> = {
      prompt,
      enable_sync_mode: true,
      enable_base64_output: true,
      [config.imageField]: config.imageField === 'images' ? [b64Image] : b64Image,
    };

    const url = `https://api.wavespeed.ai${config.apiPath}`;
    console.log('[angle-image] Calling:', url, 'model:', modelId);

    const wsRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await wsRes.json();
    const imageUrl = await extractWavespeedOutput(json);
    return res.json({ imageUrl, model: config.name });
  } catch (err) {
    console.error('[angle-image] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Angle generation failed' });
  }
});

async function generateWithGoogleImagen(
  modelId: string,
  prompt: string,
  referenceImage?: string,
  aspectRatio?: string,
  additionalImages?: string[],
): Promise<string> {
  // Use the API key directly as a query param — the correct auth method for generativelanguage.googleapis.com
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Google API key not configured.');

  const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
  const ratio = aspectRatio || '1:1';

  // Helper to push an image URL as an inlineData part
  const pushImage = async (url: string) => {
    const b64 = await resolveImageToDataUrl(url);
    const mimeMatch = b64.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch?.[1] || 'image/jpeg';
    const data = b64.replace(/^data:[^;]+;base64,/, '');
    return { inlineData: { mimeType, data } };
  };

  // Build content parts — reference image first, then additional images, then text
  const contentParts: unknown[] = [];
  const hasImages = !!(referenceImage || (additionalImages && additionalImages.length > 0));

  if (referenceImage) {
    contentParts.push(await pushImage(referenceImage));
  }
  if (additionalImages && additionalImages.length > 0) {
    for (const img of additionalImages) {
      contentParts.push(await pushImage(img));
    }
  }

  if (hasImages) {
    const imgCount = (referenceImage ? 1 : 0) + (additionalImages?.length ?? 0);
    contentParts.push({ text: `Using the ${imgCount > 1 ? 'provided reference photos' : 'reference photo'} for identity and style consistency, generate a new image: ${prompt}` });
  } else {
    contentParts.push({ text: prompt });
  }

  console.log('[Google Imagen] contentParts breakdown — images:', contentParts.length - 1, '| hasRef:', !!referenceImage, '| additionalImages:', additionalImages?.length ?? 0);

  // 1. Try latest Gemini image generation model (3.1 → 3 → 2.5 fallback chain)
  const geminiModel = 'gemini-3.1-flash-image-preview';
  let geminiBlockReason: string | undefined;
  try {
    console.log('[Google Imagen] Trying', geminiModel, '| hasRef:', !!referenceImage);
    const geminiRes = await fetch(`${BASE}/${geminiModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: contentParts }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    });
    const geminiData = await geminiRes.json() as Record<string, unknown>;
    if (!geminiRes.ok) {
      const err = (geminiData.error as { message?: string } | undefined)?.message;
      geminiBlockReason = err || `HTTP ${geminiRes.status}`;
      console.warn('[Google Imagen]', geminiModel, 'HTTP error:', geminiBlockReason);
    } else {
      const candidates = (geminiData.candidates as {
        content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] };
        finishReason?: string;
        safetyRatings?: unknown[];
      }[]) ?? [];
      for (const candidate of candidates) {
        for (const part of candidate.content?.parts ?? []) {
          if (part.inlineData?.data) {
            console.log('[Google Imagen] Success with', geminiModel);
            return `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
          }
        }
      }
      // Response was OK but no image — log finish reason
      const firstCandidate = candidates[0];
      geminiBlockReason = firstCandidate?.finishReason || 'no image in response';
      const promptFeedback = (geminiData.promptFeedback as { blockReason?: string } | undefined)?.blockReason;
      if (promptFeedback) geminiBlockReason = `prompt blocked: ${promptFeedback}`;
      console.warn('[Google Imagen]', geminiModel, 'returned no image. reason:', geminiBlockReason, '| safetyRatings:', JSON.stringify(firstCandidate?.safetyRatings ?? []).slice(0, 200));
    }
  } catch (e) {
    geminiBlockReason = e instanceof Error ? e.message : String(e);
    console.warn('[Google Imagen]', geminiModel, 'fetch error:', geminiBlockReason);
  }

  // For google:gemini-image, don't fall back to Imagen 4 — it's a Gemini-only model
  if (modelId === 'google:gemini-image') {
    throw new Error(`Gemini 3.1 image generation failed (${geminiBlockReason || 'unknown'}). Please try again.`);
  }

  // 2. Imagen 4 predict endpoint — text-only (no reference image support)
  // Only use as fallback when there's no reference image, or when gemini failed on text-only too
  const imagenModel = modelId === 'google:imagen-3-fast'
    ? 'imagen-4.0-fast-generate-001'
    : 'imagen-4.0-generate-001';

  if (hasImages && geminiBlockReason) {
    // Gemini failed with input images — Imagen 4 can't use them either, so throw a clear error
    throw new Error(`Image generation with reference photo failed (${geminiBlockReason}). Try without a reference image, or use a different model.`);
  }

  console.log('[Google Imagen] Falling back to Imagen 4 predict:', imagenModel);
  const imagenRes = await fetch(`${BASE}/${imagenModel}:predict?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: ratio },
    }),
  });
  const imagenData = await imagenRes.json() as Record<string, unknown>;
  if (!imagenRes.ok) {
    const msg = ((imagenData.error as { message?: string } | undefined)?.message) || JSON.stringify(imagenData).slice(0, 300);
    throw new Error(`Google Imagen 4: ${msg}`);
  }
  const predictions = imagenData.predictions as { bytesBase64Encoded?: string; mimeType?: string }[] | undefined;
  const imageBytes = predictions?.[0]?.bytesBase64Encoded;
  const imageMime = predictions?.[0]?.mimeType || 'image/jpeg';
  if (!imageBytes) throw new Error('Google Imagen 4 returned no image data.');
  console.log('[Google Imagen] Success with Imagen 4 predict');
  return `data:${imageMime};base64,${imageBytes}`;
}

app.post('/api/generate-image', async (req, res) => {
  const { referenceImage, additionalImages, modelId, imageWeight, aspectRatio, ...rest } = req.body as ImageGenRequest & { modelId: string; imageWeight?: number };

  if (!modelId) {
    return res.status(400).json({ error: 'modelId is required' });
  }

  try {
    let imageUrl: string;
    let modelName = modelId;
    let prompt = '';

    if (modelId === 'replit:gpt-image-1') {
      prompt = buildPrompt({ ...rest, referenceImage });
      imageUrl = await generateWithReplit(prompt, referenceImage, aspectRatio);
      modelName = 'gpt-image-1';
    } else if (modelId.startsWith('google:')) {
      prompt = buildPrompt({ ...rest, referenceImage });
      if (modelId === 'google:gemini-image') {
        modelName = 'Gemini 3.1 Image';
      } else if (modelId === 'google:imagen-3-fast') {
        modelName = 'Imagen 4 Fast';
      } else {
        modelName = 'Imagen 4';
      }
      console.log('[generate-image] Google model:', modelId, '→', modelName, '| hasRef:', !!referenceImage, '| additionalImages:', additionalImages?.length ?? 0);
      imageUrl = await generateWithGoogleImagen(modelId, prompt, referenceImage || undefined, aspectRatio, additionalImages);
    } else if (modelId.startsWith('wavespeed:')) {
      const wavespeedModels = await fetchWavespeedModels();
      const modelInfo = wavespeedModels.find(m => m.id === modelId);
      if (!modelInfo) {
        return res.status(400).json({ error: 'Unknown or unavailable model ID' });
      }
      const hasRef = !!referenceImage;
      const useEditPath = hasRef && !!modelInfo.editApiPath;
      const useInstructionStyle = useEditPath && !modelInfo.editHasStrengthControl;
      prompt = buildPrompt({ ...rest, referenceImage }, useInstructionStyle);
      console.log('[generate-image] Model:', modelInfo.name, '| hasRef:', hasRef, '| useEditPath:', useEditPath, '| useInstructionStyle:', useInstructionStyle, '| editHasStrengthControl:', modelInfo.editHasStrengthControl);
      modelName = modelInfo.name;
      imageUrl = await generateWithWavespeed(modelInfo.apiPath, modelInfo.editApiPath, modelInfo.editImageField, prompt, referenceImage, imageWeight, modelInfo.editHasStrengthControl, aspectRatio, additionalImages);
    } else {
      return res.status(400).json({ error: 'Unknown model ID' });
    }

    return res.json({
      imageUrl,
      model: modelName,
      promptUsed: prompt,
    });
  } catch (err) {
    console.error('[generate-image] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Image generation failed',
    });
  }
});

app.post('/api/generate-reference', async (req, res) => {
  const { prompt, modelId } = req.body;

  if (!prompt || !modelId) {
    return res.status(400).json({ error: 'prompt and modelId are required' });
  }

  try {
    let imageUrl: string;
    let modelName = modelId;

    if (modelId === 'replit:gpt-image-1') {
      imageUrl = await generateWithReplit(prompt);
      modelName = 'gpt-image-1';
    } else if (modelId.startsWith('wavespeed:')) {
      const wavespeedModels = await fetchWavespeedModels();
      const modelInfo = wavespeedModels.find(m => m.id === modelId);
      if (!modelInfo) {
        return res.status(400).json({ error: 'Unknown or unavailable model ID' });
      }
      modelName = modelInfo.name;
      imageUrl = await generateWithWavespeed(modelInfo.apiPath, undefined, undefined, prompt);
    } else {
      return res.status(400).json({ error: 'Unknown model ID' });
    }

    return res.json({
      imageUrl,
      model: modelName,
      promptUsed: prompt,
    });
  } catch (err) {
    console.error('[generate-reference] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Reference image generation failed',
    });
  }
});

app.post('/api/edit-image', async (req, res) => {
  const { sourceImage, prompt, modelId, additionalImage } = req.body;

  if (!sourceImage || !prompt || !modelId) {
    return res.status(400).json({ error: 'sourceImage, prompt, and modelId are required' });
  }

  try {
    let imageUrl: string;
    let modelName = modelId;
    const resolvedAdditional = additionalImage ? await resolveImageToDataUrl(additionalImage) : null;

    if (modelId === 'replit:gpt-image-1') {
      const resolvedSource = await resolveImageToDataUrl(sourceImage);
      const images = [resolvedSource];
      if (resolvedAdditional) images.push(resolvedAdditional);
      imageUrl = await generateWithReplit(prompt, images);
      modelName = 'GPT Image 1 (DALL-E)';
    } else if (modelId.startsWith('wavespeed-edit:')) {
      await fetchWavespeedModels();
      const editModel = (cachedEditModels || []).find(m => m.id === modelId);
      if (!editModel) {
        return res.status(400).json({ error: 'Unknown edit model ID' });
      }
      modelName = editModel.name;

      const b64Url = await resolveImageToDataUrl(sourceImage);
      const payload: Record<string, unknown> = {
        prompt,
        enable_sync_mode: true,
        enable_base64_output: true,
      };
      if (editModel.editImageField === 'images') {
        const imgs = [b64Url];
        if (resolvedAdditional) imgs.push(resolvedAdditional);
        payload.images = imgs;
      } else {
        payload.image = b64Url;
        if (resolvedAdditional) {
          payload.image_2 = resolvedAdditional;
        }
      }

      const url = `https://api.wavespeed.ai${editModel.apiPath}`;
      const apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const json = await apiRes.json();
      imageUrl = await extractWavespeedOutput(json);
    } else {
      return res.status(400).json({ error: 'Unknown model ID' });
    }

    return res.json({ imageUrl, model: modelName });
  } catch (err) {
    console.error('[edit-image] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Image editing failed' });
  }
});

app.post('/api/upscale-image', async (req, res) => {
  const { sourceImage, modelId } = req.body;

  if (!sourceImage || !modelId) {
    return res.status(400).json({ error: 'sourceImage and modelId are required' });
  }

  if (!modelId.startsWith('wavespeed-upscale:')) {
    return res.status(400).json({ error: 'Invalid upscale model ID' });
  }

  try {
    await fetchWavespeedModels();
    const upscaleModel = (cachedUpscaleModels || []).find(m => m.id === modelId);
    if (!upscaleModel) {
      return res.status(400).json({ error: 'Unknown upscale model ID' });
    }

    const b64Url = await resolveImageToDataUrl(sourceImage);
    const payload: Record<string, unknown> = {
      enable_sync_mode: true,
      enable_base64_output: true,
    };
    if (upscaleModel.editImageField === 'images') {
      payload.images = [b64Url];
    } else {
      payload.image = b64Url;
    }

    const url = `https://api.wavespeed.ai${upscaleModel.apiPath}`;
    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await apiRes.json();
    const imageUrl = await extractWavespeedOutput(json);

    return res.json({ imageUrl, model: upscaleModel.name });
  } catch (err) {
    console.error('[upscale-image] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Image upscaling failed' });
  }
});

async function extractWavespeedVideoOutput(json: Record<string, unknown>): Promise<string> {
  const data = json.data as Record<string, unknown> | undefined;
  console.log('[Wavespeed Video] Response code:', json.code, 'status:', data?.status, 'keys:', data ? Object.keys(data).join(',') : 'none');

  if ((json.code as number) !== 200 || (data?.status as string) === 'failed') {
    throw new Error((data?.error as string) || (json.message as string) || 'Wavespeed video request failed');
  }

  const outputs = (data?.outputs as string[]) || [];
  if (outputs.length && outputs[0].startsWith('http')) {
    return outputs[0];
  }

  const output = data?.output as string | undefined;
  if (output && typeof output === 'string' && output.startsWith('http')) {
    return output;
  }

  const videoUrl = (data?.video_url || data?.videoUrl || data?.video || data?.url) as string | undefined;
  if (videoUrl && typeof videoUrl === 'string' && videoUrl.startsWith('http')) {
    return videoUrl;
  }

  if (data?.status === 'processing' || data?.status === 'queued' || data?.status === 'completed' || data?.status === 'created' || data?.status === 'pending') {
    const pollUrl = (data?.urls as Record<string, string>)?.get || (data?.id ? `https://api.wavespeed.ai/api/v3/predictions/${data.id}/result` : null);
    if (pollUrl && isAllowedWavespeedUrl(pollUrl)) {
      console.log('[Wavespeed Video] Polling:', pollUrl.substring(0, 120));
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise(r => setTimeout(r, 3000));
        const pollRes = await fetch(pollUrl, {
          headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
        });
        const pollJson = await pollRes.json();
        const pollData = pollJson.data || {};
        console.log('[Wavespeed Video] Poll attempt', attempt + 1, 'status:', pollData.status);

        if (pollData.status === 'failed') {
          throw new Error(pollData.error || 'Video generation failed during polling');
        }

        const pollOutputs = pollData.outputs || pollJson.outputs || [];
        if (pollOutputs.length && pollOutputs[0].startsWith('http')) {
          return pollOutputs[0];
        }

        const pollOutput = (pollData.output || pollData.video_url || pollData.videoUrl || pollData.video || pollData.url) as string | undefined;
        if (pollOutput && typeof pollOutput === 'string' && pollOutput.startsWith('http')) {
          return pollOutput;
        }

        if (pollData.status === 'completed') {
          console.log('[Wavespeed Video] Completed but no video output. Keys:', Object.keys(pollData).join(','));
          const anyUrl = Object.values(pollData).find(v => typeof v === 'string' && (v as string).startsWith('http') && /\.(mp4|webm|mov)/i.test(v as string));
          if (anyUrl) return anyUrl as string;
          throw new Error('Video completed but no video URL found');
        }
      }
      throw new Error('Video generation timed out after 3 minutes');
    }
  }

  throw new Error('No video output found in Wavespeed response');
}

app.post('/api/generate-video', async (req, res) => {
  const { prompt: rawPrompt, modelId, sourceImage, identityLock, naturalLook } = req.body;

  if (!rawPrompt || typeof rawPrompt !== 'string' || !rawPrompt.trim() || !modelId) {
    return res.status(400).json({ error: 'prompt and modelId are required' });
  }

  const identityLockTerms = 'IDENTITY LOCK: Reproduce the exact same facial features in every detail — identical bone structure, eye shape and spacing, nose shape, lip shape, and jawline. This is the same person. Do not reinterpret or alter the face.';
  const realismTerms = 'Candid photography, natural skin texture, subtle skin pores, film grain, not over-retouched, authentic photograph.';
  let prompt = rawPrompt.trim();
  if (identityLock === true) prompt += ` ${identityLockTerms}`;
  if (naturalLook === true) prompt += ` ${realismTerms}`;

  try {
    await fetchWavespeedModels();
    const videoModel = (cachedVideoModels || []).find(m => m.id === modelId);
    if (!videoModel) {
      return res.status(400).json({ error: 'Unknown video model ID' });
    }

    const isI2V = modelId.startsWith('wavespeed-i2v:');

    if (isI2V && !sourceImage) {
      return res.status(400).json({ error: 'Image-to-video models require a source image' });
    }

    const payload: Record<string, unknown> = {
      prompt,
    };

    if (isI2V && sourceImage) {
      const b64Url = await resolveImageToDataUrl(sourceImage);
      if (videoModel.editImageField === 'images') {
        payload.images = [b64Url];
      } else {
        payload.image = b64Url;
      }
    }

    console.log('[Video Gen] Model:', videoModel.name, 'Path:', videoModel.apiPath, 'Type:', isI2V ? 'i2v' : 't2v');
    const url = `https://api.wavespeed.ai${videoModel.apiPath}`;
    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await apiRes.json();
    const videoUrl = await extractWavespeedVideoOutput(json);

    return res.json({ videoUrl, model: videoModel.name });
  } catch (err) {
    console.error('[generate-video] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Video generation failed' });
  }
});

app.post('/api/extract-last-frame', async (req, res) => {
  const { videoUrl } = req.body;
  if (!videoUrl || typeof videoUrl !== 'string') {
    return res.status(400).json({ error: 'videoUrl is required' });
  }
  if (!isAllowedWavespeedUrl(videoUrl)) {
    return res.status(400).json({ error: 'Only Wavespeed video URLs are supported' });
  }

  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    // Use ffmpeg to extract the last frame: seek to near the end, grab 1 frame, output as JPEG to stdout
    const { stdout } = await execFileAsync(
      'ffmpeg',
      ['-sseof', '-0.5', '-i', videoUrl, '-frames:v', '1', '-f', 'image2', '-vcodec', 'mjpeg', 'pipe:1'],
      { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 }
    );

    if (!stdout || (stdout as unknown as Buffer).length === 0) {
      throw new Error('ffmpeg produced no output');
    }

    const base64 = (stdout as unknown as Buffer).toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    return res.json({ frameDataUrl: dataUrl });
  } catch (err) {
    console.error('[extract-last-frame] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Frame extraction failed' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', wavespeedConfigured: !!WAVESPEED_API_KEY });
});

async function pushSchema() {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS personas (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL DEFAULT '',
        niche TEXT NOT NULL DEFAULT '',
        tone TEXT NOT NULL DEFAULT '',
        platform TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Draft',
        avatar TEXT NOT NULL DEFAULT '',
        reference_image TEXT,
        personality_traits TEXT NOT NULL DEFAULT '[]',
        visual_style TEXT NOT NULL DEFAULT '',
        audience_type TEXT NOT NULL DEFAULT '',
        content_boundaries TEXT NOT NULL DEFAULT '',
        bio TEXT NOT NULL DEFAULT '',
        brand_voice_rules TEXT NOT NULL DEFAULT '',
        content_goals TEXT NOT NULL DEFAULT '',
        persona_notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      CREATE TABLE IF NOT EXISTS generated_images (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL UNIQUE,
        persona_client_id TEXT NOT NULL,
        url TEXT NOT NULL,
        prompt TEXT NOT NULL DEFAULT '',
        timestamp REAL NOT NULL,
        environment TEXT,
        outfit TEXT,
        framing TEXT,
        is_favorite BOOLEAN DEFAULT false,
        model TEXT,
        media_type TEXT DEFAULT 'image',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';
      ALTER TABLE personas ADD COLUMN IF NOT EXISTS face_descriptor TEXT;
      ALTER TABLE personas ADD COLUMN IF NOT EXISTS natural_look BOOLEAN DEFAULT true;
      ALTER TABLE personas ADD COLUMN IF NOT EXISTS identity_lock BOOLEAN DEFAULT true;
      ALTER TABLE personas ADD COLUMN IF NOT EXISTS alternate_reference_image TEXT;
      CREATE TABLE IF NOT EXISTS revenue_entries (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL UNIQUE,
        persona_client_id TEXT NOT NULL,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        source TEXT NOT NULL DEFAULT '',
        platform TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      CREATE TABLE IF NOT EXISTS planned_posts (
        id SERIAL PRIMARY KEY,
        persona_client_id TEXT NOT NULL,
        plan_platform TEXT NOT NULL DEFAULT '',
        day INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT '',
        hook TEXT NOT NULL DEFAULT '',
        angle TEXT NOT NULL DEFAULT '',
        cta TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    await pool.end();
    console.log('[DB] Schema tables ensured');
  } catch (err) {
    console.error('[DB] Schema push error:', err);
  }
}

// In production, serve the built frontend and catch-all for SPA routing
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = parseInt(process.env.PORT || '3001', 10);
pushSchema().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Image Server] Listening on port ${PORT}`);
    if (WAVESPEED_API_KEY) {
      fetchWavespeedModels().then(models => {
        console.log(`[Wavespeed] Loaded ${models.length} generation, ${(cachedEditModels || []).length} edit, ${(cachedUpscaleModels || []).length} upscale models`);
      });
    } else {
      console.warn('[Wavespeed] No API key configured — only built-in models available');
    }
  });
});
