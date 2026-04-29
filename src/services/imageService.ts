import { Persona } from '../types';
import { supabase } from '../lib/supabase';
import { compressForUpload } from '../utils/imageProcessing';

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
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
  additionalInstructions?: string;
  additionalImages?: string[];
  isChatContext?: boolean;
  chatPrompt?: string;
  imageWeight?: number;
  aspectRatio?: string;
  resolution?: 'standard' | 'hd';
  naturalLook?: boolean;
  identityLock?: boolean;
  count?: number;
}

export interface GenerateImageResult {
  imageUrl: string;
  model: string;
  promptUsed: string;
}

export async function fetchAvailableModels(): Promise<ModelInfo[]> {
  const response = await fetch('/api/models');
  if (!response.ok) {
    throw new Error('Failed to fetch available models');
  }
  const data = await response.json();
  return data.models || [];
}

export async function fetchEditModels(): Promise<ModelInfo[]> {
  const response = await fetch('/api/models');
  if (!response.ok) {
    throw new Error('Failed to fetch edit models');
  }
  const data = await response.json();
  return data.editModels || [];
}

export async function fetchUpscaleModels(): Promise<ModelInfo[]> {
  const response = await fetch('/api/models');
  if (!response.ok) {
    throw new Error('Failed to fetch upscale models');
  }
  const data = await response.json();
  return data.upscaleModels || [];
}

export async function fetchAllModelTypes(): Promise<{ models: ModelInfo[]; editModels: ModelInfo[]; upscaleModels: ModelInfo[]; videoModels: ModelInfo[] }> {
  const response = await fetch('/api/models');
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  const data = await response.json();
  return {
    models: data.models || [],
    editModels: data.editModels || [],
    upscaleModels: data.upscaleModels || [],
    videoModels: data.videoModels || [],
  };
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
    referenceImage: persona.referenceImage || null,
    faceDescriptor: persona.faceDescriptor || null,
    ...(imageWeight !== undefined ? { imageWeight } : {}),
    ...(count && count > 1 ? { count } : {}),
    ...restParams,
  };

  let response: Response;
  try {
    response = await fetch('/api/generate-image', {
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

export async function editImage(sourceImage: string, prompt: string, modelId: string, additionalImage?: string): Promise<{ imageUrl: string; model: string }> {
  const body: Record<string, string> = { sourceImage, prompt, modelId };
  if (additionalImage) body.additionalImage = additionalImage;
  const response = await fetch('/api/edit-image', {
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

export async function upscaleImage(sourceImage: string, modelId: string): Promise<{ imageUrl: string; model: string }> {
  const response = await fetch('/api/upscale-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceImage, modelId }),
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

export async function generateVideo(prompt: string, modelId: string, sourceImage?: string, identityLock?: boolean, naturalLook?: boolean): Promise<{ videoUrl: string; model: string }> {
  const body: Record<string, unknown> = { prompt, modelId };
  if (sourceImage) body.sourceImage = sourceImage;
  if (identityLock !== undefined) body.identityLock = identityLock;
  if (naturalLook !== undefined) body.naturalLook = naturalLook;
  const response = await fetch('/api/generate-video', {
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
  const response = await fetch('/api/create-prompts', {
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
  const response = await fetch('/api/enhance-prompt', {
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

  const response = await fetch('/api/generate-content', {
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
  horizontalAngle: string;
  verticalAngle: string;
  distance: string;
}): Promise<{ imageUrl: string; model: string }> {
  const response = await fetch('/api/angle-image', {
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
  const response = await fetch('/api/generate-reference', {
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

export async function faceSwap(targetImage: string, swapImage: string, faceEnhance = true): Promise<{ imageUrl: string; model: string }> {
  const compressedTarget = await compressForUpload(targetImage);
  const compressedSwap = await compressForUpload(swapImage);
  const response = await authFetch('/api/face-swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetImage: compressedTarget, swapImage: compressedSwap, faceEnhance }),
  });
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    if (response.status === 413) throw new Error('Request too large — try with smaller images.');
    throw new Error(text ? `Server error (${response.status}): ${text.substring(0, 150)}` : `Server error (${response.status}). Please try again.`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Face swap failed.');
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

export const TTS_VOICES = [
  { id: 'Aoede', name: 'Aoede', gender: 'Female', desc: 'Warm, bright' },
  { id: 'Charon', name: 'Charon', gender: 'Male', desc: 'Deep, authoritative' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Male', desc: 'Smooth, modern' },
  { id: 'Kore', name: 'Kore', gender: 'Female', desc: 'Clear, natural' },
  { id: 'Puck', name: 'Puck', gender: 'Male', desc: 'Energetic, youthful' },
] as const;

export async function textToSpeech(params: {
  text: string;
  voiceName?: string;
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
  portraitImage: string;
  audioUrl?: string;
  script?: string;
  voiceName?: string;
}): Promise<{ videoUrl: string; model: string }> {
  const compressed = await compressForUpload(params.portraitImage);
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
