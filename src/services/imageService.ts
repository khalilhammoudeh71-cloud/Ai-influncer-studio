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

export interface GenerateImageResult {
  imageUrl: string;
  promptUsed: string;
}

/**
 * Calls the secure backend API to generate a real image using OpenAI.
 * This function expects the backend route /api/generate-image to be available and configured
 * with a valid OPENAI_API_KEY.
 */
export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const { persona, ...restParams } = params;

  // Build the payload mapping persona fields
  const payload = {
    personaId: persona.id,
    personaName: persona.name,
    niche: persona.niche,
    tone: persona.tone,
    visualStyle: persona.visualStyle || 'Realistic, highly detailed',
    ...restParams
  };

  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Verify the response is JSON (Vite dev server might return index.html for unknown routes)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Image API not connected. Backend route (/api/generate-image) is missing or not configured correctly.');
    }

    if (!response.ok) {
      let errorMessage = 'Image API not connected or request failed.';
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        errorMessage = `HTTP Error ${response.status}: Failed to reach Image API.`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.imageUrl) {
      throw new Error('Image API returned an invalid response.');
    }

    return {
      imageUrl: data.imageUrl,
      promptUsed: data.promptUsed || 'Backend generated prompt'
    };

  } catch (error: any) {
    console.error('Image Generation Service Error:', error);
    throw error;
  }
}
