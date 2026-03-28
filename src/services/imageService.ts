import { Persona } from '../types';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  type: string;
  price: number;
  description: string;
  hasEditVariant: boolean;
}

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

export async function fetchAllModelTypes(): Promise<{ models: ModelInfo[]; editModels: ModelInfo[]; upscaleModels: ModelInfo[] }> {
  const response = await fetch('/api/models');
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  const data = await response.json();
  return {
    models: data.models || [],
    editModels: data.editModels || [],
    upscaleModels: data.upscaleModels || [],
  };
}

export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const { persona, modelId, ...restParams } = params;

  const payload = {
    modelId,
    personaId: persona.id,
    personaName: persona.name,
    niche: persona.niche,
    tone: persona.tone,
    visualStyle: persona.visualStyle || 'Realistic, highly detailed',
    referenceImage: persona.referenceImage || null,
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

export async function editImage(sourceImage: string, prompt: string, modelId: string): Promise<{ imageUrl: string; model: string }> {
  const response = await fetch('/api/edit-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceImage, prompt, modelId }),
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
