import { Persona } from '../types';

export interface GenerateImageParams {
  persona: Persona;
  environment?: string;
  outfitStyle?: string;
  framing?: string;
  mood?: string;
  additionalInstructions?: string;
  isChatContext?: boolean;
  chatPrompt?: string;
}

export interface SingleImageResult {
  imageUrl: string | null;
  model: string;
  error: string | null;
}

export interface DualImageResult {
  gemini: SingleImageResult;
  openai: SingleImageResult;
  promptUsed: string;
}

export async function generateDualImage(params: GenerateImageParams): Promise<DualImageResult> {
  const { persona, ...restParams } = params;

  const payload = {
    personaId: persona.id,
    personaName: persona.name,
    niche: persona.niche,
    tone: persona.tone,
    visualStyle: persona.visualStyle || 'Realistic, highly detailed',
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

  const data = await response.json();

  if (!response.ok && !data.gemini && !data.openai) {
    throw new Error(data.error || 'Image generation failed.');
  }

  return {
    gemini: data.gemini,
    openai: data.openai,
    promptUsed: data.promptUsed || '',
  };
}
