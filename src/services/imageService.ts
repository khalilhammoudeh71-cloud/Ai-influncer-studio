import { Persona } from '../types';

export type ImageModel = 'fast' | 'pro';

export interface GenerateImageParams {
  persona: Persona;
  environment?: string;
  outfitStyle?: string;
  framing?: string;
  mood?: string;
  additionalInstructions?: string;
  isChatContext?: boolean;
  chatPrompt?: string;
  model?: ImageModel;
}

export interface GenerateImageResult {
  imageUrl: string;
  promptUsed: string;
  model?: string;
}

export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const { persona, ...restParams } = params;

  const payload = {
    personaId: persona.id,
    personaName: persona.name,
    niche: persona.niche,
    tone: persona.tone,
    visualStyle: persona.visualStyle || 'Realistic, highly detailed',
    model: params.model || 'fast',
    ...restParams
  };

  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Image API not reachable. Make sure the backend server is running.');
  }

  if (!response.ok) {
    let errorMessage = 'Image generation failed.';
    try {
      const errorData = await response.json();
      if (errorData.error) errorMessage = errorData.error;
    } catch {
      errorMessage = `HTTP Error ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (!data.imageUrl) {
    throw new Error('Image API returned an invalid response.');
  }

  return {
    imageUrl: data.imageUrl,
    promptUsed: data.promptUsed || '',
    model: data.model
  };
}
