import { Persona } from '../types';
import { supabase } from '../lib/supabase';
import { compressForUpload } from '../utils/imageProcessing';

export async function authFetch(url: string, options: RequestInit = {}) {
  let token = null;
  try {
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve({ data: { session: null } }), 600));
    const sessionRes = await Promise.race([sessionPromise, timeoutPromise]);
    token = sessionRes?.data?.session?.access_token;
  } catch {}
  const headers: Record<string, string> = { ...options.headers as Record<string, string> };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  type: string;
  price: number;
  description: string;
  hasEditVariant: boolean;
  hasReferenceImage?: boolean;
  editHasStrengthControl?: boolean;
  isIdentityModel?: boolean;
  nsfw?: boolean;
  supportedProperties?: string[];
}

export function canUseReference(model: ModelInfo, allModels: ModelInfo[]): boolean {
  if (model.hasEditVariant || model.hasReferenceImage) return true;
  if (model.id.endsWith('/sequential')) {
    const baseId = model.id.replace(/\/sequential$/, '');
    const base = allModels.find(m => m.id === baseId);
    if (base && (base.hasEditVariant || base.hasReferenceImage)) return true;
  }
  return false;
}

export const ANGLE_MODELS: { id: string; name: string; price: number; nsfw: boolean }[] = [
  { id: 'angle-qwen-multiple',     name: 'Qwen Multiple Angles',        price: 0.025, nsfw: false },
  { id: 'angle-qwen-multiple-2509', name: 'Qwen Multiple Angles v2',    price: 0.025, nsfw: false },
  { id: 'angle-wan22',             name: 'Wan 2.2',                     price: 0.02,  nsfw: true  },
  { id: 'angle-seededit-v3',       name: 'SeedEdit v3',                 price: 0.027, nsfw: true  },
];

export interface GenerateImageParams {
  persona: Persona;
  modelId: string;
  environment?: string;
  outfitStyle?: string;
  framing?: string;
  mood?: string;
  prompt?: string;
  additionalInstructions?: string;
  additionalImages?: string[];
  isChatContext?: boolean;
  chatPrompt?: string;
  imageWeight?: number;
  aspectRatio?: string;
  resolution?: string;
  naturalLook?: boolean;
  identityLock?: boolean;
  count?: number;
  lora?: Array<{ model: string; weight: number }>;
}

export interface GenerateImageResult {
  imageUrl: string;
  model: string;
  promptUsed: string;
}

export async function fetchAvailableModels(): Promise<ModelInfo[]> {
  const response = await authFetch('/api/models');
  if (!response.ok) {
    throw new Error('Failed to fetch available models');
  }
  const data = await response.json();
  return data.models || [];
}

export async function fetchEditModels(): Promise<ModelInfo[]> {
  const response = await authFetch('/api/models');
  if (!response.ok) {
    throw new Error('Failed to fetch edit models');
  }
  const data = await response.json();
  return data.editModels || [];
}

export async function fetchUpscaleModels(): Promise<ModelInfo[]> {
  const response = await authFetch('/api/models');
  if (!response.ok) {
    throw new Error('Failed to fetch upscale models');
  }
  const data = await response.json();
  return data.upscaleModels || [];
}

export async function fetchVideoModels(): Promise<ModelInfo[]> {
  const response = await authFetch('/api/models');
  if (!response.ok) {
    throw new Error('Failed to fetch video models');
  }
  const data = await response.json();
  return data.videoModels || [];
}

export async function fetch3DModels(): Promise<ModelInfo[]> {
  const response = await authFetch('/api/models');
  if (!response.ok) {
    throw new Error('Failed to fetch 3D models');
  }
  const data = await response.json();
  return data.threeDModels || [];
}

export async function fetchAllModelTypes(): Promise<{ models: ModelInfo[]; editModels: ModelInfo[]; upscaleModels: ModelInfo[]; videoModels: ModelInfo[]; threeDModels: ModelInfo[] }> {
  const response = await authFetch('/api/models');
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  const data = await response.json();
  const rawModels: ModelInfo[] = data.models || [];
  const rawEditModels: ModelInfo[] = data.editModels || [];

  const sortSeedreamTop = (list: ModelInfo[]) => {
    const nonLocal = list.filter(m => !m.id.toLowerCase().includes('local') && !m.provider.toLowerCase().includes('local'));
    const getPriority = (m: ModelInfo): number => {
      const id = (m.id || '').toLowerCase();
      const name = (m.name || '').toLowerCase();
      // 1. Seedream 5.0 Pro from Wavespeed (Specifically PRO, not Lite)
      if ((id.includes('seedream-v5.0-pro') || id.includes('seedream-5.0-pro') || id.includes('seedream-v5-pro') || name.includes('seedream 5.0 pro') || name.includes('seedream 5 pro')) && !name.includes('lite') && !id.includes('lite')) return 1;
      // 2. Seedream 5.0 general (non-lite)
      if ((id.includes('seedream-v5') || name.includes('seedream 5')) && !name.includes('lite') && !id.includes('lite')) return 2;
      // 3. Other Seedream variants
      if (id.includes('seedream') || name.includes('seedream')) return 3;
      // 4. Qwen 3.0 Pro
      if (id.includes('qwen-3.0-pro') || id.includes('qwen-3-pro') || name.includes('qwen 3.0 pro') || name.includes('qwen 3')) return 4;
      // 5. GPT Image 2 / Nano Banana Pro
      if (id.includes('gpt-image-2') || name.includes('gpt image 2') || id.includes('nano-banana-pro') || name.includes('nano banana pro')) return 5;
      // 6. Wan 3.0 Pro
      if (id.includes('wan-3.0') || id.includes('wan-3-pro') || id.includes('wan-2.7-pro') || name.includes('wan')) return 6;
      return 100;
    };
    return [...nonLocal].sort((a, b) => getPriority(a) - getPriority(b) || a.name.localeCompare(b.name));
  };

  const sortWavespeedVideoTop = (list: ModelInfo[]) => {
    const nonLocal = list.filter(m => !m.id.toLowerCase().includes('local') && !m.provider.toLowerCase().includes('local'));
    const getPriority = (m: ModelInfo): number => {
      const id = (m.id || '').toLowerCase();
      const name = (m.name || '').toLowerCase();
      // 1. ByteDance Seedance 2.0 Mini / Seedance 2.0 (Wavespeed - Uncensored)
      if (id.includes('wavespeed') && (id.includes('seedance-2-mini') || id.includes('seedance-2.0-mini') || id.includes('seedance-mini') || name.includes('seedance 2.0 mini') || name.includes('seedance 2 mini') || id.includes('seedance-2.0') || name.includes('seedance 2.0'))) return 1;
      // 2. Wavespeed Seedance other variants
      if (id.includes('wavespeed') && (id.includes('seedance') || name.includes('seedance'))) return 2;
      // 3. Other Seedance models
      if (id.includes('seedance') || name.includes('seedance')) return 3;
      // 4. Wavespeed Wan 2.1 I2V (Uncensored / Fast)
      if (id.includes('wavespeed') && (id.includes('wan-2.1') || id.includes('wan2.1') || name.includes('wan 2.1'))) return 4;
      // 5. Any other Wavespeed video models
      if (id.startsWith('wavespeed') || id.includes('wavespeed')) return 5;
      // 6. Wan models
      if (id.includes('wan') || name.includes('wan')) return 6;
      return 100;
    };
    return [...nonLocal].sort((a, b) => getPriority(a) - getPriority(b) || a.name.localeCompare(b.name));
  };

  return {
    models: sortSeedreamTop(rawModels),
    editModels: sortSeedreamTop(rawEditModels),
    upscaleModels: (data.upscaleModels || []).filter((m: any) => !m.id.toLowerCase().includes('local')),
    videoModels: sortWavespeedVideoTop(data.videoModels || []),
    threeDModels: (data.threeDModels || []).filter((m: any) => !m.id.toLowerCase().includes('local')),
  };
}

export async function generate3DModel(prompt: string, modelId: string, sourceImage?: string): Promise<{ modelUrl: string; model: string }> {
  const response = await authFetch('/api/generate-3d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, modelId, sourceImage }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '3D generation failed.');
  }
  return { modelUrl: data.modelUrl, model: data.model };
}

export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult | GenerateImageResult[]> {
  const { persona, modelId, imageWeight, count, ...restParams } = params;

  const payload = {
    modelId,
    personaId: persona.id,
    personaName: persona.name,
    niche: persona.niche,
    tone: persona.tone,
    visualStyle: persona.visualStyle || 'Realistic, highly detailed',
    referenceImage: persona.referenceImage || persona.avatar || persona.alternateReferenceImage || null,
    faceDescriptor: persona.faceDescriptor || null,
    ...(imageWeight !== undefined ? { imageWeight } : {}),
    ...(count && count > 1 ? { count } : {}),
    ...restParams,
  };

  let response: Response;
  try {
    response = await authFetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (fetchErr) {
    throw new Error('Could not reach the server. It may have restarted — please try again.');
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    console.error('[ImageService] Non-JSON response:', response.status, text.substring(0, 200));
    if (response.status === 413) {
      throw new Error('Request too large. Try using fewer or smaller reference images.');
    }
    throw new Error(text
      ? `Server error (${response.status}): ${text.substring(0, 100)}`
      : `Server error (${response.status}). Please try again.`
    );
  }

  let data: { imageUrl?: string; images?: { imageUrl: string; model: string; promptUsed: string }[]; model?: string; promptUsed?: string; error?: string };
  try {
    data = await response.json();
  } catch {
    throw new Error(`Server returned invalid response (${response.status}). Please try again.`);
  }

  if (!response.ok) {
    throw new Error(data.error || 'Image generation failed.');
  }

  if (data.images && data.images.length > 0) {
    return data.images.map(img => ({
      imageUrl: img.imageUrl,
      model: img.model,
      promptUsed: img.promptUsed || '',
    }));
  }

  return {
    imageUrl: data.imageUrl!,
    model: data.model!,
    promptUsed: data.promptUsed || '',
  };
}

async function padImageForExtend(sourceBase64: string, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(sourceBase64);

      if (prompt.includes('Extend Downward')) {
        const w = 1024;
        const h = Math.floor(w * (img.height / img.width));
        canvas.width = w;
        canvas.height = Math.floor(h * 1.35);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, w, h);
      } else if (prompt.includes('Extend Upward')) {
        const w = 1024;
        const h = Math.floor(w * (img.height / img.width));
        canvas.width = w;
        canvas.height = Math.floor(h * 1.35);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, Math.floor(h * 0.35), w, h);
      } else if (prompt.includes('Widen')) {
        const h = 1024;
        const w = Math.floor(h * (img.width / img.height));
        canvas.height = h;
        canvas.width = Math.floor(w * 1.35);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, Math.floor(w * 0.175), 0, w, h);
      } else {
        const scale = 0.75;
        const w = 1024;
        const h = Math.floor(w * (img.height / img.width));
        canvas.width = w;
        canvas.height = h;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const targetW = Math.floor(w * scale);
        const targetH = Math.floor(h * scale);
        const x = Math.floor((w - targetW) / 2);
        const y = Math.floor((h - targetH) / 2);
        ctx.drawImage(img, x, y, targetW, targetH);
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(sourceBase64);
    img.src = sourceBase64;
  });
}

export async function editImage(sourceImage: string, prompt: string, modelId: string, additionalImage?: string, maskImage?: string): Promise<{ imageUrl: string; model: string }> {
  const body: Record<string, string> = { sourceImage, prompt, modelId };
  if (additionalImage) body.additionalImage = additionalImage;
  if (maskImage) body.maskImage = maskImage;
  const response = await authFetch('/api/edit-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Image API not reachable. Make sure the backend server is running.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Image editing failed.');
  }
  return { imageUrl: data.imageUrl, model: data.model };
}

export async function upscaleImage(sourceImage: string, modelId: string, targetResolution?: string): Promise<{ imageUrl: string; model: string }> {
  const response = await authFetch('/api/upscale-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceImage, modelId, targetResolution }),
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Image API not reachable. Make sure the backend server is running.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Image upscaling failed.');
  }
  return { imageUrl: data.imageUrl, model: data.model };
}

export async function generateVideo(
  prompt: string, 
  modelId: string, 
  sourceImage?: string, 
  identityLock?: boolean, 
  naturalLook?: boolean,
  aspectRatio?: string,
  duration?: number,
  resolution?: string,
  sourceVideo?: string,
  generateAudio?: boolean,
  strength?: number
): Promise<{ videoUrl: string; model: string }> {
  const body: Record<string, unknown> = { prompt, modelId };
  if (sourceImage) body.sourceImage = sourceImage;
  if (identityLock !== undefined) body.identityLock = identityLock;
  if (naturalLook !== undefined) body.naturalLook = naturalLook;
  if (aspectRatio) body.aspectRatio = aspectRatio;
  if (duration !== undefined) body.duration = duration;
  if (resolution) body.resolution = resolution;
  if (sourceVideo) body.sourceVideo = sourceVideo;
  if (generateAudio !== undefined) body.generateAudio = generateAudio;
  if (strength !== undefined) body.strength = strength;
  const response = await authFetch('/api/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Video API not reachable. Make sure the backend server is running.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Video generation failed.');
  }
  return { videoUrl: data.videoUrl, model: data.model };
}

export async function createPrompts(params: {
  request: string;
  count: number;
  persona: { name: string; niche: string; tone: string; visualStyle?: string; platform?: string };
}): Promise<string[]> {
  const response = await authFetch('/api/create-prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Prompt API not reachable. Make sure the backend server is running.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Prompt creation failed.');
  }
  return data.prompts as string[];
}

export async function enhancePrompt(text: string): Promise<string> {
  const response = await authFetch('/api/enhance-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Prompt API not reachable. Make sure the backend server is running.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Prompt enhancement failed.');
  }
  return data.enhanced as string;
}

export async function generateContent(
  type: 'prompt' | 'transcript' | 'multi-scene',
  topic: string,
  persona: { name: string; niche: string; tone: string; platform: string; bio: string },
  sceneCount?: number
): Promise<string> {
  const body: Record<string, unknown> = { type, topic, persona };
  if (sceneCount) body.sceneCount = sceneCount;

  const response = await authFetch('/api/generate-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Content API not reachable. Make sure the backend server is running.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Content generation failed.');
  }
  return data.content;
}

export async function generateAngleImage(params: {
  imageBase64: string;
  modelId: string;
  horizontalAngle: string | number;
  verticalAngle: string | number;
  distance: string | number;
}): Promise<{ imageUrl: string; model: string }> {
  const response = await authFetch('/api/angle-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Angle API not reachable. Make sure the backend server is running.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Angle generation failed.');
  }
  return { imageUrl: data.imageUrl, model: data.model };
}

export async function generateReferenceImage(prompt: string, modelId: string): Promise<GenerateImageResult> {
  const response = await authFetch('/api/generate-reference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, modelId }),
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Image API not reachable. Make sure the backend server is running.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Reference image generation failed.');
  }

  return {
    imageUrl: data.imageUrl,
    model: data.model,
    promptUsed: data.promptUsed || '',
  };
}

export async function faceSwap(
  targetImage: string, 
  swapImage: string, 
  faceEnhance = true,
  swapMode: 'face' | 'head' | 'body' = 'face'
): Promise<{ imageUrl: string; model: string }> {
  const compressedTarget = await compressForUpload(targetImage);
  const compressedSwap = await compressForUpload(swapImage);
  const response = await authFetch('/api/face-swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetImage: compressedTarget, swapImage: compressedSwap, faceEnhance, swapMode }),
  });
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    if (response.status === 413) throw new Error('Request too large — try with smaller images.');
    throw new Error(text ? `Server error (${response.status}): ${text.substring(0, 150)}` : `Server error (${response.status}). Please try again.`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Swap failed.');
  return { imageUrl: data.imageUrl, model: data.model };
}

export async function lookSwap(params: {
  sourceImage: string;
  faceReferenceImage?: string;
  prompt: string;
  swapType: 'outfit' | 'background' | 'hairstyle' | 'full-scene';
  modelId?: string;
  aspectRatio?: string;
  postProcessFaceSwap?: boolean;
}): Promise<{ imageUrl: string; model: string; promptUsed: string }> {
  const compressedSource = await compressForUpload(params.sourceImage);
  const compressedFaceRef = params.faceReferenceImage ? await compressForUpload(params.faceReferenceImage) : undefined;
  const response = await authFetch('/api/look-swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, sourceImage: compressedSource, faceReferenceImage: compressedFaceRef }),
  });
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    if (response.status === 413) throw new Error('Request too large — try with smaller images.');
    throw new Error(text ? `Server error (${response.status}): ${text.substring(0, 150)}` : `Server error (${response.status}). Please try again.`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Look swap failed.');
  return { imageUrl: data.imageUrl, model: data.model, promptUsed: data.promptUsed || '' };
}

export async function removeBackground(image: string): Promise<{ imageUrl: string; model: string }> {
  const compressed = await compressForUpload(image);
  const response = await authFetch('/api/remove-background', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: compressed }),
  });
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    if (response.status === 413) throw new Error('Request too large — try with a smaller image.');
    throw new Error(text ? `Server error (${response.status}): ${text.substring(0, 150)}` : `Server error (${response.status}).`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Background removal failed.');
  return { imageUrl: data.imageUrl, model: data.model };
}

export interface TTSVoice {
  id: string;
  name: string;
  gender: string;
  desc: string;
  engine: 'gemini' | 'openai' | 'elevenlabs';
  previewUrl?: string;
}

export const TTS_VOICES: TTSVoice[] = [
  // Gemini Voices (Prebuilt)
  { id: 'Aoede', name: 'Aoede', gender: 'Female', desc: 'Warm, bright', engine: 'gemini' },
  { id: 'Charon', name: 'Charon', gender: 'Male', desc: 'Deep, authoritative', engine: 'gemini' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Male', desc: 'Smooth, modern', engine: 'gemini' },
  { id: 'Kore', name: 'Kore', gender: 'Female', desc: 'Clear, natural', engine: 'gemini' },
  { id: 'Puck', name: 'Puck', gender: 'Male', desc: 'Energetic, youthful', engine: 'gemini' },
  
  // OpenAI Voices
  { id: 'alloy', name: 'Alloy', gender: 'Neutral', desc: 'Balanced, versatile', engine: 'openai' },
  { id: 'echo', name: 'Echo', gender: 'Male', desc: 'Warm, relaxed', engine: 'openai' },
  { id: 'fable', name: 'Fable', gender: 'Neutral', desc: 'British, expressive', engine: 'openai' },
  { id: 'onyx', name: 'Onyx', gender: 'Male', desc: 'Deep, confident', engine: 'openai' },
  { id: 'nova', name: 'Nova', gender: 'Female', desc: 'Bright, energetic', engine: 'openai' },
  { id: 'shimmer', name: 'Shimmer', gender: 'Female', desc: 'Clear, soulful', engine: 'openai' },
];

export async function fetchElevenLabsVoices(): Promise<TTSVoice[]> {
  try {
    const response = await authFetch('/api/elevenlabs-voices');
    if (!response.ok) return [];
    const data = await response.json();
    return (data.voices || []).map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      gender: v.labels?.gender || 'Neutral',
      desc: v.labels?.description || v.category || 'ElevenLabs Voice',
      engine: 'elevenlabs',
      previewUrl: v.preview_url,
    }));
  } catch (err) {
    console.error('Failed to fetch ElevenLabs voices:', err);
    return [];
  }
}

export async function textToSpeech(params: {
  text: string;
  voiceName?: string;
  engine?: 'gemini' | 'openai' | 'elevenlabs';
  voiceId?: string;
  speed?: number;
}): Promise<{ audioUrl: string; voice: string; model: string }> {
  const response = await authFetch('/api/text-to-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Text-to-speech failed.');
  return { audioUrl: data.audioUrl, voice: data.voice, model: data.model };
}

export async function generateTalkingHead(params: {
  portraitImage?: string;
  video?: string;
  model?: string;
  audioUrl?: string;
  script?: string;
  voiceName?: string;
  engine?: string;
  heygenEngine?: 'avatar_iv' | 'avatar_v';
  heygenApiKey?: string;
  heygenAvatarId?: string;
  camera?: string;
  expression?: string;
  lighting?: string;
}): Promise<{ videoUrl: string; model: string }> {
  const compressed = params.portraitImage ? await compressForUpload(params.portraitImage) : undefined;
  const response = await authFetch('/api/talking-head', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, portraitImage: compressed }),
  });
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    if (response.status === 413) throw new Error('Request too large — try with a smaller image.');
    throw new Error(text ? `Server error (${response.status}): ${text.substring(0, 150)}` : `Server error (${response.status}).`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Talking head generation failed.');
  return { videoUrl: data.videoUrl, model: data.model };
}

export async function virtualTryOn(
  personImage: string,
  garmentImage: string,
  garmentDescription?: string
): Promise<{ imageUrl: string; model: string }> {
  const compressedPerson = await compressForUpload(personImage);
  const compressedGarment = await compressForUpload(garmentImage);
  const response = await authFetch('/api/virtual-tryon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personImage: compressedPerson, garmentImage: compressedGarment, garmentDescription }),
  });
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    if (response.status === 413) throw new Error('Request too large — try with smaller images.');
    throw new Error(text ? `Server error (${response.status}): ${text.substring(0, 150)}` : `Server error (${response.status}).`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Virtual try-on failed.');
  return { imageUrl: data.imageUrl, model: data.model };
}

export async function generateMotionControl(params: {
  refImage: string;
  motionVideoUrl?: string;
  motionVideoBase64?: string;
  danceId?: string;
  model?: string;
}): Promise<{ videoUrl: string; model: string }> {
  const compressedRef = await compressForUpload(params.refImage);
  const response = await authFetch('/api/motion-control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, refImage: compressedRef }),
  });
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    if (response.status === 413) throw new Error('Request too large — try with smaller assets.');
    throw new Error(text ? `Server error (${response.status}): ${text.substring(0, 150)}` : `Server error (${response.status}).`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Motion control generation failed.');
  return { videoUrl: data.videoUrl, model: data.model };
}

export async function extractLastFrame(videoUrl: string): Promise<string> {
  const response = await authFetch('/api/extract-last-frame', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrl }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to extract last frame');
  return data.frameDataUrl;
}

export async function stitchVideos(videoUrls: string[]): Promise<string> {
  const response = await authFetch('/api/stitch-videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrls }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to stitch video clips');
  return data.videoUrl;
}

export interface BatchEditResult {
  index: number;
  originalUrl: string;
  resultUrl: string;
  status: 'success' | 'error';
  error?: string;
}

export async function processBatchEdit(
  images: string[],
  prompt: string,
  modelId?: string
): Promise<BatchEditResult[]> {
  const response = await authFetch('/api/batch-edit-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images, prompt, modelId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to process batch image edit');
  return data.results;
}

export async function extendVideo(params: {
  originalVideoUrl: string;
  extensionPrompt: string;
  modelId?: string;
}): Promise<{ videoUrl: string; lastFrameUrl: string; extensionSegmentUrl: string; model: string }> {
  const lastFrameUrl = await extractLastFrame(params.originalVideoUrl);
  const modelId = params.modelId || 'wavespeed-i2v:wavespeed-ai/wan-2.2-i2v-720p';
  const genRes = await generateVideo(
    params.extensionPrompt,
    modelId,
    lastFrameUrl,
    true,
    true,
    '16:9',
    5
  );
  const stitchedUrl = await stitchVideos([params.originalVideoUrl, genRes.videoUrl]);
  return {
    videoUrl: stitchedUrl,
    lastFrameUrl,
    extensionSegmentUrl: genRes.videoUrl,
    model: genRes.model
  };
}


