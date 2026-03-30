import { Persona } from '../types';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  type: string;
  price: number;
  description: string;
  hasEditVariant: boolean;
  editHasStrengthControl?: boolean;
  isIdentityModel?: boolean;
  nsfw?: boolean;
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
  isChatContext?: boolean;
  chatPrompt?: string;
  imageWeight?: number;
  aspectRatio?: string;
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

export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const { persona, modelId, imageWeight, ...restParams } = params;

  const payload = {
    modelId,
    personaId: persona.id,
    personaName: persona.name,
    niche: persona.niche,
    tone: persona.tone,
    visualStyle: persona.visualStyle || 'Realistic, highly detailed',
    referenceImage: persona.referenceImage || null,
    ...(imageWeight !== undefined ? { imageWeight } : {}),
    ...restParams,
  };

  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Image API not reachable. Make sure the backend server is running.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Image generation failed.');
  }

  return {
    imageUrl: data.imageUrl,
    model: data.model,
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

export async function generateVideo(prompt: string, modelId: string, sourceImage?: string): Promise<{ videoUrl: string; model: string }> {
  const body: Record<string, string> = { prompt, modelId };
  if (sourceImage) body.sourceImage = sourceImage;
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
