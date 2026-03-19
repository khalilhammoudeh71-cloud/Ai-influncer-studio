import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Modality } from '@google/genai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: '',
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const MODELS = {
  fast: 'gemini-2.5-flash-image',
  nano2: 'gemini-3.1-flash-image',
  pro: 'gemini-3-pro-image-preview',
} as const;

type ModelKey = keyof typeof MODELS;

app.post('/api/generate-image', async (req, res) => {
  const {
    personaName,
    niche,
    tone,
    visualStyle,
    environment,
    outfitStyle,
    framing,
    mood,
    additionalInstructions,
    isChatContext,
    chatPrompt,
    model: modelKey = 'fast',
  } = req.body;

  const modelId = MODELS[(modelKey as ModelKey) in MODELS ? (modelKey as ModelKey) : 'fast'];

  let prompt = '';

  if (isChatContext) {
    prompt = `A high-quality, photorealistic social media photo of an AI influencer named ${personaName}. Niche: ${niche}. Tone/Style: ${tone}. Visual Style: ${visualStyle}.
The user requested: "${chatPrompt}".
Create a realistic, visually compelling image suitable for social media. Consistent, detailed facial features.`;
  } else {
    prompt = `A high-quality, photorealistic social media photo of an AI influencer named ${personaName}.
Niche: ${niche}. Tone/Style: ${tone}. Visual Style: ${visualStyle}.
Environment: ${environment || 'Modern setting'}.
Outfit: ${outfitStyle || 'Stylish casual'}.
Framing: ${framing || 'Portrait'}.
Mood: ${mood || 'Confident'}.
${additionalInstructions ? `Additional details: ${additionalInstructions}` : ''}
Create a realistic, highly detailed image suitable for a professional social media post. Consistent facial features, cinematic lighting.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find(
      (part: { inlineData?: { data?: string; mimeType?: string } }) => part.inlineData
    );

    if (!imagePart?.inlineData?.data) {
      return res.status(500).json({ error: 'No image was generated. Please try again.' });
    }

    const mimeType = imagePart.inlineData.mimeType || 'image/png';
    const imageUrl = `data:${mimeType};base64,${imagePart.inlineData.data}`;

    return res.json({ imageUrl, promptUsed: prompt, model: modelId });
  } catch (err: any) {
    console.error('[Gemini Image Error]', err?.message || err);
    return res.status(500).json({
      error: err?.message || 'Image generation failed. Please try again.',
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', models: Object.keys(MODELS) });
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Gemini API Server] Listening on port ${PORT}`);
});
