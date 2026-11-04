export interface HiggsfieldModelInfo {
  id: string;
  name: string;
  provider: 'Higgsfield';
  type: 'text-to-image' | 'image-to-image' | 'text-to-video' | 'image-to-video';
  price: number;
  description: string;
  apiPath: string;
  hasEditVariant: boolean;
  hasReferenceImage?: boolean;
  supportedProperties?: string[];
  catalogSource: 'curated';
}

export const HIGGSFIELD_IMAGE_MODELS: HiggsfieldModelInfo[] = [
  {
    id: 'higgsfield-image:marketing-studio/image',
    name: 'Higgsfield Marketing Studio',
    provider: 'Higgsfield',
    type: 'text-to-image',
    price: 0.0121,
    description: 'Campaign-ready image generation and editing with optional reference images.',
    apiPath: 'marketing-studio/image',
    hasEditVariant: true,
    hasReferenceImage: true,
    supportedProperties: ['prompt', 'image_urls', 'resolution', 'aspect_ratio'],
    catalogSource: 'curated',
  },
  {
    id: 'higgsfield-image:higgsfield-ai/soul/v2/standard',
    name: 'Higgsfield Soul 2',
    provider: 'Higgsfield',
    type: 'text-to-image',
    price: 0.0032,
    description: 'Fast, stylized image generation tuned for polished portraits and editorial imagery.',
    apiPath: 'higgsfield-ai/soul/v2/standard',
    hasEditVariant: false,
    supportedProperties: ['prompt', 'batch_size', 'resolution', 'aspect_ratio'],
    catalogSource: 'curated',
  },
];

export const HIGGSFIELD_VIDEO_MODELS: HiggsfieldModelInfo[] = [
  {
    id: 'higgsfield-video:bytedance/seedance-2.5/text-to-video',
    name: 'Higgsfield Seedance 2.5 Text to Video',
    provider: 'Higgsfield',
    type: 'text-to-video',
    price: 0.144,
    description: 'Seedance 2.5 text-to-video generation with optional generated audio.',
    apiPath: 'bytedance/seedance-2.5/text-to-video',
    hasEditVariant: false,
    supportedProperties: ['prompt', 'duration', 'resolution', 'aspect_ratio', 'generate_audio'],
    catalogSource: 'curated',
  },
  {
    id: 'higgsfield-video:bytedance/seedance-2.5/image-to-video',
    name: 'Higgsfield Seedance 2.5 Image to Video',
    provider: 'Higgsfield',
    type: 'image-to-video',
    price: 0.144,
    description: 'Animate a source image with Seedance 2.5 and optional generated audio.',
    apiPath: 'bytedance/seedance-2.5/image-to-video',
    hasEditVariant: false,
    hasReferenceImage: true,
    supportedProperties: ['prompt', 'image_url', 'duration', 'resolution', 'aspect_ratio', 'generate_audio'],
    catalogSource: 'curated',
  },
];

interface ImageInputOptions {
  prompt: string;
  imageUrls?: string[];
  resolution?: string;
  aspectRatio?: string;
  count?: number;
}

interface VideoInputOptions {
  prompt?: string;
  imageUrl?: string;
  endImageUrl?: string;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  generateAudio?: boolean;
}

const IMAGE_ASPECT_RATIOS = ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16'];
const VIDEO_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];

function pick(value: string | undefined, allowed: string[], fallback: string): string {
  return value && allowed.includes(value) ? value : fallback;
}

export function buildHiggsfieldImageInput(modelId: string, options: ImageInputOptions): Record<string, unknown> {
  if (modelId === 'higgsfield-image:marketing-studio/image') {
    return {
      prompt: options.prompt,
      ...(options.imageUrls?.length ? { image_urls: options.imageUrls } : {}),
      quality: 'high',
      moderation: 'auto',
      resolution: pick(options.resolution, ['1k', '2k', '4k'], '1k'),
      aspect_ratio: pick(options.aspectRatio, IMAGE_ASPECT_RATIOS, '1:1'),
      enhance_prompt: false,
    };
  }

  if (modelId === 'higgsfield-image:higgsfield-ai/soul/v2/standard') {
    return {
      prompt: options.prompt,
      batch_size: options.count === 4 ? 4 : 1,
      resolution: pick(options.resolution, ['720p', '1080p'], '1080p'),
      aspect_ratio: pick(options.aspectRatio, IMAGE_ASPECT_RATIOS, '4:3'),
      enhance_prompt: true,
    };
  }

  throw new Error(`Unsupported Higgsfield image model: ${modelId}`);
}

export function buildHiggsfieldVideoInput(modelId: string, options: VideoInputOptions): Record<string, unknown> {
  const duration = Math.min(30, Math.max(4, Math.round(options.duration || 5)));
  const shared = {
    prompt: options.prompt || '',
    duration,
    resolution: pick(options.resolution, ['480p', '720p'], '720p'),
    ...(options.aspectRatio ? { aspect_ratio: pick(options.aspectRatio, VIDEO_ASPECT_RATIOS, '16:9') } : {}),
    output_format: 'mp4',
    generate_audio: options.generateAudio !== false,
  };

  if (modelId === 'higgsfield-video:bytedance/seedance-2.5/text-to-video') return shared;
  if (modelId === 'higgsfield-video:bytedance/seedance-2.5/image-to-video') {
    if (!options.imageUrl) throw new Error('Higgsfield image-to-video requires a source image.');
    return {
      ...shared,
      image_url: options.imageUrl,
      ...(options.endImageUrl ? { end_image_url: options.endImageUrl } : {}),
    };
  }
  throw new Error(`Unsupported Higgsfield video model: ${modelId}`);
}

export function extractHiggsfieldOutputUrls(result: any): string[] {
  if (result?.status !== 'completed') {
    throw new Error(result?.error || `Higgsfield generation ${result?.status || 'did not complete'}.`);
  }
  const urls = [
    ...(Array.isArray(result.images) ? result.images.map((image: any) => typeof image === 'string' ? image : image?.url) : []),
    typeof result.video === 'string' ? result.video : result.video?.url,
  ].filter((url): url is string => typeof url === 'string' && url.length > 0);
  if (!urls.length) throw new Error('Higgsfield completed without returning media.');
  return urls;
}

type Subscribe = (model: string, options: { input: Record<string, unknown>; withPolling: true }) => Promise<any>;

export async function runHiggsfieldGeneration(options: {
  credentials: string;
  modelId: string;
  input: Record<string, unknown>;
  subscribe?: Subscribe;
}): Promise<string[]> {
  if (!options.credentials) throw new Error('HF_CREDENTIALS is not configured.');
  const model = options.modelId.replace(/^higgsfield-(?:image|video):/, '');
  let subscribe = options.subscribe;
  if (!subscribe) {
    const { createHiggsfieldClient } = await import('@higgsfield/client/v2');
    const client = createHiggsfieldClient({
      credentials: options.credentials,
      timeout: 30_000,
      maxRetries: 2,
      pollInterval: 2_500,
      maxPollTime: 280_000,
    });
    subscribe = (endpoint, request) => client.subscribe(endpoint, request as any);
  }
  return extractHiggsfieldOutputUrls(await subscribe(model, { input: options.input, withPolling: true }));
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export async function ensureHiggsfieldMediaUrl(source: string, credentials: string, fetcher: FetchLike = fetch): Promise<string> {
  if (/^https:\/\//i.test(source)) return source;
  const match = source.match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match) throw new Error('Higgsfield media must be an HTTPS URL or a base64 data URL.');
  if (!credentials) throw new Error('HF_CREDENTIALS is not configured.');

  const contentType = match[1];
  const bytes = Buffer.from(match[2], 'base64');
  const prepare = await fetcher('https://api.higgsfield.ai/files/generate-upload-url', {
    method: 'POST',
    headers: { Authorization: `Key ${credentials}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content_type: contentType }),
  });
  if (!prepare.ok) throw new Error(`Higgsfield upload preparation failed (${prepare.status}): ${await prepare.text()}`);
  const prepared = await prepare.json() as { upload_url?: string; public_url?: string; upload_headers?: Record<string, string> };
  if (!prepared.upload_url || !prepared.public_url) throw new Error('Higgsfield did not return a valid upload URL.');

  const upload = await fetcher(prepared.upload_url, {
    method: 'PUT',
    headers: prepared.upload_headers || { 'Content-Type': contentType },
    body: bytes,
  });
  if (!upload.ok) throw new Error(`Higgsfield media upload failed (${upload.status}): ${await upload.text()}`);
  return prepared.public_url;
}
