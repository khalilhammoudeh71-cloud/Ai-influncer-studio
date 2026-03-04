import { OpenAI } from 'openai';

// SETUP INSTRUCTIONS for the Backend API:
// 1. This file is intended to run as a Serverless Function (e.g., Vercel /api route) or Node.js Express route.
// 2. You MUST set the environment variable OPENAI_API_KEY in your server environment (.env).
// 3. Do NOT expose this key to the Vite client.
// 4. If deploying to Vercel, this file will automatically map to the /api/generate-image endpoint.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY environment variable");
    return res.status(500).json({ error: 'Image API not connected. Missing OPENAI_API_KEY configuration on the server.' });
  }

  try {
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
      chatPrompt
    } = req.body;

    const openai = new OpenAI({ apiKey });

    // Assemble the prompt based on the provided parameters
    let prompt = '';

    if (isChatContext) {
      prompt = `A photo of an AI influencer named ${personaName}. Niche: ${niche}. Tone: ${tone}. Visual Style: ${visualStyle}. 
      The user requested the following: "${chatPrompt}". 
      Ensure the image looks like a real social media post or high-quality creator content. Highly realistic, consistent facial features.`;
    } else {
      prompt = `A photo of an AI influencer named ${personaName}. Niche: ${niche}. Tone: ${tone}. Visual Style: ${visualStyle}.
      Environment: ${environment}.
      Outfit: ${outfitStyle}.
      Framing: ${framing}.
      Mood: ${mood}.
      ${additionalInstructions ? `Additional instructions: ${additionalInstructions}` : ''}
      Ensure the image looks like a real social media post or high-quality creator content. Highly realistic, consistent facial features.`;
    }

    // Call OpenAI DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt.substring(0, 4000), // DALL-E 3 has a 4000 character limit
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No image generated from OpenAI.");
    }

    const imageUrl = response.data[0].url;

    return res.status(200).json({ 
      imageUrl, 
      promptUsed: prompt 
    });

  } catch (error: any) {
    console.error("OpenAI Image Generation Error:", error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate image from API.' 
    });
  }
}
