import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Modality } from '@google/genai';
import OpenAI, { toFile } from 'openai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const geminiAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
});

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey || !baseURL) {
    throw new Error('OpenAI integration not configured yet. Please enable it in your Replit integrations.');
  }
  return new OpenAI({ apiKey, baseURL });
}

const GEMINI_MODEL = 'gemini-3.1-flash-image-preview';

function buildPrompt(body: any): string {
  const { personaName, niche, tone, visualStyle, environment, outfitStyle, framing, mood, additionalInstructions, isChatContext, chatPrompt } = body;

  if (isChatContext) {
    return `A high-quality, photorealistic social media photo of an AI influencer named ${personaName}. Niche: ${niche}. Tone/Style: ${tone}. Visual Style: ${visualStyle}.
The user requested: "${chatPrompt}".
Create a realistic, visually compelling image suitable for social media. Maintain consistent, detailed facial features matching any provided reference.`;
  }

  return `A high-quality, photorealistic social media photo of an AI influencer named ${personaName}.
Niche: ${niche}. Tone/Style: ${tone}. Visual Style: ${visualStyle}.
Environment: ${environment || 'Modern setting'}.
Outfit: ${outfitStyle || 'Stylish casual'}.
Framing: ${framing || 'Portrait'}.
Mood: ${mood || 'Confident'}.
${additionalInstructions ? `Additional details: ${additionalInstructions}` : ''}
Create a realistic, highly detailed image suitable for a professional social media post. Maintain consistent facial features matching any provided reference. Cinematic lighting.`;
}

function stripDataPrefix(dataUrl: string): { data: string; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: 'image/png', data: dataUrl };
}

function parseGeminiError(err: any): string {
  try {
    const raw = err?.message || String(err);
    const parsed = JSON.parse(raw);
    const msg: string = parsed?.error?.message || raw;
    if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || err?.status === 429) {
      return 'Gemini quota exceeded — please wait a moment and try again.';
    }
    if (msg.includes('API key not valid') || msg.includes('INVALID_ARGUMENT')) {
      return 'Gemini API key is invalid. Check your GEMINI_API_KEY.';
    }
    if (msg.includes('not found') || msg.includes('NOT_FOUND')) {
      return `Gemini model not available: ${GEMINI_MODEL}`;
    }
    return msg;
  } catch {
    return err?.message || 'Gemini generation failed';
  }
}

async function generateGeminiImage(prompt: string, referenceImage?: string): Promise<{ imageUrl: string; model: string }> {
  const parts: any[] = [];

  if (referenceImage) {
    const { mimeType, data } = stripDataPrefix(referenceImage);
    parts.push({ inlineData: { mimeType, data } });
    parts.push({ text: `Using this reference image to maintain consistent appearance: ${prompt}` });
  } else {
    parts.push({ text: prompt });
  }

  const response = await geminiAI.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: 'user', parts }],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  const candidate = response.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find(
    (part: { inlineData?: { data?: string; mimeType?: string } }) => part.inlineData
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini returned no image data');
  }

  const mimeType = imagePart.inlineData.mimeType || 'image/png';
  return {
    imageUrl: `data:${mimeType};base64,${imagePart.inlineData.data}`,
    model: GEMINI_MODEL,
  };
}

async function generateOpenAIImage(prompt: string, referenceImage?: string): Promise<{ imageUrl: string; model: string }> {
  const client = getOpenAIClient();

  let response;

  if (referenceImage) {
    const { mimeType, data } = stripDataPrefix(referenceImage);
    const buffer = Buffer.from(data, 'base64');
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const imageFile = await toFile(buffer, `reference.${ext}`, { type: mimeType });

    response = await client.images.edit({
      model: 'gpt-image-1',
      image: imageFile,
      prompt,
      n: 1,
    });
  } else {
    response = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
    });
  }

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('OpenAI returned no image data');
  }

  return {
    imageUrl: `data:image/png;base64,${b64}`,
    model: 'gpt-image-1',
  };
}

app.post('/api/generate-image', async (req, res) => {
  const { referenceImage, ...rest } = req.body;
  const prompt = buildPrompt(rest);

  const [geminiResult, openaiResult] = await Promise.allSettled([
    generateGeminiImage(prompt, referenceImage),
    generateOpenAIImage(prompt, referenceImage),
  ]);

  const gemini = geminiResult.status === 'fulfilled'
    ? { imageUrl: geminiResult.value.imageUrl, model: geminiResult.value.model, error: null }
    : { imageUrl: null, model: GEMINI_MODEL, error: parseGeminiError(geminiResult.reason) };

  const openai = openaiResult.status === 'fulfilled'
    ? { imageUrl: openaiResult.value.imageUrl, model: openaiResult.value.model, error: null }
    : { imageUrl: null, model: 'gpt-image-1', error: (openaiResult.reason as any)?.message || 'OpenAI generation failed' };

  if (!gemini.imageUrl && !openai.imageUrl) {
    return res.status(500).json({ error: 'Both generators failed. Please try again.', gemini, openai });
  }

  return res.json({ promptUsed: prompt, gemini, openai });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', geminiModel: GEMINI_MODEL, openaiModel: 'gpt-image-1' });
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[AI Image Server] Listening on port ${PORT}`);
});
