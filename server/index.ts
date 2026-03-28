import express from 'express';
import cors from 'cors';
import OpenAI, { toFile } from 'openai';
import { Pool } from '@neondatabase/serverless';
import apiRoutes from './routes';

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use('/api', apiRoutes);

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey || !baseURL) {
    throw new Error('OpenAI integration not configured yet. Please enable it in your Replit integrations.');
  }
  return new OpenAI({ apiKey, baseURL });
}

const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY || '';
const WAVESPEED_BASE = 'https://api.wavespeed.ai/api/v3';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  type: 'text-to-image' | 'image-to-image' | 'upscaler';
  price: number;
  description: string;
  apiPath: string;
  hasEditVariant: boolean;
  editApiPath?: string;
  editImageField?: 'image' | 'images';
}

let cachedModels: ModelInfo[] | null = null;
let cachedEditModels: ModelInfo[] | null = null;
let cachedUpscaleModels: ModelInfo[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000;

const PROVIDER_NAMES: Record<string, string> = {
  'google': 'Google',
  'openai': 'OpenAI',
  'wavespeed-ai': 'Wavespeed AI',
  'bytedance': 'ByteDance',
  'stability-ai': 'Stability AI',
  'x-ai': 'xAI',
  'midjourney': 'Midjourney',
  'kwaivgi': 'Kling',
  'recraft-ai': 'Recraft',
  'alibaba': 'Alibaba',
  'z-ai': 'Zhipu AI',
  'leonardoai': 'Leonardo AI',
  'reve': 'Reve',
  'vidu': 'Vidu',
  'higgsfield': 'Higgsfield',
  'nvidia': 'NVIDIA',
  'bria': 'Bria',
  'clarity-ai': 'Clarity AI',
  'runwayml': 'Runway',
};

async function fetchWavespeedModels(): Promise<ModelInfo[]> {
  if (cachedModels && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedModels;
  }

  try {
    const res = await fetch(`${WAVESPEED_BASE}/models`, {
      headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
    });
    const json = await res.json();
    const rawModels = json.data || [];

    const textToImage = rawModels.filter((m: { type: string }) => m.type === 'text-to-image');
    const imageToImage = rawModels.filter((m: { type: string }) => m.type === 'image-to-image');

    const editLookup = new Map<string, { model: { model_id: string; api_schema?: { api_schemas?: { api_path: string; request_schema?: { properties?: Record<string, unknown> } }[] } }; imageField: 'image' | 'images' }>();
    imageToImage.forEach((m: { model_id: string; api_schema?: { api_schemas?: { api_path: string; request_schema?: { properties?: Record<string, unknown> } }[] } }) => {
      const base = m.model_id
        .replace('/edit', '')
        .replace('/image-to-image', '');
      const props = m.api_schema?.api_schemas?.[0]?.request_schema?.properties || {};
      const imageField: 'image' | 'images' = props.images ? 'images' : 'image';
      editLookup.set(base, { model: m, imageField });
    });

    const models: ModelInfo[] = textToImage.map((m: { model_id: string; base_price: number; description?: string; api_schema?: { api_schemas?: { api_path: string }[] } }) => {
      const base = m.model_id
        .replace('/text-to-image', '');
      const editEntry = editLookup.get(base) || editLookup.get(base + '/edit');
      const editModel = editEntry?.model;
      const apiPath = m.api_schema?.api_schemas?.[0]?.api_path || `/api/v3/${m.model_id}`;

      const providerSlash = m.model_id.indexOf('/');
      const provider = m.model_id.slice(0, providerSlash);

      const friendlyName = m.model_id
        .replace('/text-to-image', '')
        .split('/')
        .slice(1)
        .join(' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      return {
        id: `wavespeed:${m.model_id}`,
        name: friendlyName,
        provider: PROVIDER_NAMES[provider] || provider,
        type: 'text-to-image' as const,
        price: m.base_price,
        description: m.description || '',
        apiPath,
        hasEditVariant: !!editModel,
        editApiPath: editModel
          ? (editModel.api_schema?.api_schemas?.[0]?.api_path || `/api/v3/${editModel.model_id}`)
          : undefined,
        editImageField: editEntry?.imageField,
      };
    });

    models.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

    const editModels: ModelInfo[] = imageToImage.map((m: { model_id: string; base_price: number; description?: string; api_schema?: { api_schemas?: { api_path: string; request_schema?: { properties?: Record<string, unknown> } }[] } }) => {
      const apiPath = m.api_schema?.api_schemas?.[0]?.api_path || `/api/v3/${m.model_id}`;
      const providerSlash = m.model_id.indexOf('/');
      const provider = m.model_id.slice(0, providerSlash);
      const props = m.api_schema?.api_schemas?.[0]?.request_schema?.properties || {};
      const imageField: 'image' | 'images' = props.images ? 'images' : 'image';

      const friendlyName = m.model_id
        .replace('/image-to-image', '')
        .replace('/edit', '')
        .split('/')
        .slice(1)
        .join(' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      return {
        id: `wavespeed-edit:${m.model_id}`,
        name: friendlyName,
        provider: PROVIDER_NAMES[provider] || provider,
        type: 'image-to-image' as const,
        price: m.base_price,
        description: m.description || '',
        apiPath,
        hasEditVariant: false,
        editImageField: imageField,
      };
    });
    editModels.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

    const upscalerModels = rawModels.filter((m: { type: string; model_id: string }) =>
      m.type === 'upscaler' && !m.model_id.toLowerCase().includes('video')
    );
    const upscaleModels: ModelInfo[] = upscalerModels.map((m: { model_id: string; base_price: number; description?: string; api_schema?: { api_schemas?: { api_path: string; request_schema?: { properties?: Record<string, unknown> } }[] } }) => {
      const apiPath = m.api_schema?.api_schemas?.[0]?.api_path || `/api/v3/${m.model_id}`;
      const providerSlash = m.model_id.indexOf('/');
      const provider = m.model_id.slice(0, providerSlash);
      const props = m.api_schema?.api_schemas?.[0]?.request_schema?.properties || {};
      const imageField: 'image' | 'images' = props.images ? 'images' : 'image';

      const friendlyName = m.model_id
        .split('/')
        .slice(1)
        .join(' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      return {
        id: `wavespeed-upscale:${m.model_id}`,
        name: friendlyName,
        provider: PROVIDER_NAMES[provider] || provider,
        type: 'upscaler' as const,
        price: m.base_price,
        description: m.description || '',
        apiPath,
        hasEditVariant: false,
        editImageField: imageField,
      };
    });
    upscaleModels.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

    cachedModels = models;
    cachedEditModels = editModels;
    cachedUpscaleModels = upscaleModels;
    cacheTimestamp = Date.now();
    return models;
  } catch (err) {
    console.error('[Wavespeed] Failed to fetch models:', err);
    return cachedModels || [];
  }
}

function getAllModels(wavespeedModels: ModelInfo[]): ModelInfo[] {
  const builtIn: ModelInfo[] = [
    {
      id: 'replit:gpt-image-1',
      name: 'GPT Image 1 (DALL-E)',
      provider: 'Replit Built-in',
      type: 'text-to-image',
      price: 0,
      description: 'OpenAI DALL-E image generation via Replit integration (included free)',
      apiPath: '',
      hasEditVariant: true,
    },
  ];
  return [...builtIn, ...wavespeedModels];
}

interface ImageGenRequest {
  personaName: string;
  niche: string;
  tone: string;
  visualStyle: string;
  environment?: string;
  outfitStyle?: string;
  framing?: string;
  mood?: string;
  additionalInstructions?: string;
  isChatContext?: boolean;
  chatPrompt?: string;
  referenceImage?: string;
}

function buildPrompt(body: ImageGenRequest): string {
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

async function generateWithReplit(prompt: string, referenceImage?: string): Promise<string> {
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
  if (!b64) throw new Error('OpenAI returned no image data');
  return `data:image/png;base64,${b64}`;
}

const WAVESPEED_ALLOWED_HOSTS = ['api.wavespeed.ai', 'wscdn.wavespeed.ai', 'cdn.wavespeed.ai'];

function isAllowedWavespeedUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    return u.protocol === 'https:' && WAVESPEED_ALLOWED_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

async function fetchAllowedImage(urlStr: string): Promise<string> {
  if (!isAllowedWavespeedUrl(urlStr)) {
    throw new Error('Blocked: image URL from untrusted host');
  }
  const imgRes = await fetch(urlStr);
  const imgBuf = Buffer.from(await imgRes.arrayBuffer());
  return `data:image/png;base64,${imgBuf.toString('base64')}`;
}

async function resolveImageToDataUrl(input: string): Promise<string> {
  if (input.startsWith('data:')) {
    return input;
  }
  if (input.startsWith('http://') || input.startsWith('https://')) {
    if (!isAllowedWavespeedUrl(input)) {
      throw new Error('Only Wavespeed CDN URLs or base64/data URLs are accepted as source images');
    }
    return await fetchAllowedImage(input);
  }
  return `data:image/png;base64,${input}`;
}

async function extractWavespeedOutput(json: Record<string, unknown>): Promise<string> {
  const data = json.data as Record<string, unknown> | undefined;
  if ((json.code as number) !== 200 || (data?.status as string) === 'failed') {
    throw new Error((data?.error as string) || (json.message as string) || 'Wavespeed request failed');
  }

  const outputs = (data?.outputs as string[]) || [];
  if (outputs.length) {
    const output = outputs[0];
    if (output.startsWith('http')) return await fetchAllowedImage(output);
    return `data:image/jpeg;base64,${output}`;
  }

  if ((data?.status as string) === 'completed' && (data?.urls as Record<string, string>)?.get) {
    const pollUrl = (data!.urls as Record<string, string>).get;
    if (!isAllowedWavespeedUrl(pollUrl)) {
      throw new Error('Blocked: poll URL from untrusted host');
    }
    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
    });
    const pollJson = await pollRes.json();
    const pollOutputs = pollJson.data?.outputs || pollJson.outputs || [];
    if (pollOutputs.length) {
      const img = pollOutputs[0];
      if (img.startsWith('http')) return await fetchAllowedImage(img);
      return `data:image/png;base64,${img}`;
    }
  }

  throw new Error('No image output from Wavespeed');
}

async function generateWithWavespeed(
  apiPath: string,
  editApiPath: string | undefined,
  editImageField: 'image' | 'images' | undefined,
  prompt: string,
  referenceImage?: string
): Promise<string> {
  const hasRef = !!referenceImage;
  const usePath = hasRef && editApiPath ? editApiPath : apiPath;

  const payload: Record<string, unknown> = {
    prompt,
    enable_sync_mode: true,
    enable_base64_output: true,
  };

  if (hasRef && editApiPath) {
    const { data } = stripDataPrefix(referenceImage!);
    const b64Url = `data:image/png;base64,${data}`;
    if (editImageField === 'images') {
      payload.images = [b64Url];
    } else {
      payload.image = b64Url;
    }
  }

  const url = `https://api.wavespeed.ai${usePath}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (json.code !== 200 || json.data?.status === 'failed') {
    throw new Error(json.data?.error || json.message || 'Wavespeed generation failed');
  }

  const outputs = json.data?.outputs || [];
  if (!outputs.length) {
    if (json.data?.status === 'completed' && json.data?.urls?.get) {
      const pollUrl = json.data.urls.get;
      if (!isAllowedWavespeedUrl(pollUrl)) {
        throw new Error('Blocked: poll URL from untrusted host');
      }
      const pollRes = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
      });
      const pollJson = await pollRes.json();
      const pollOutputs = pollJson.data?.outputs || pollJson.outputs || [];
      if (pollOutputs.length) {
        const img = pollOutputs[0];
        if (img.startsWith('http')) return await fetchAllowedImage(img);
        return `data:image/png;base64,${img}`;
      }
    }
    throw new Error('No image output from Wavespeed');
  }

  const output = outputs[0];
  if (output.startsWith('http')) return await fetchAllowedImage(output);

  return `data:image/jpeg;base64,${output}`;
}

app.get('/api/models', async (_req, res) => {
  try {
    const wavespeedModels = await fetchWavespeedModels();
    const allModels = getAllModels(wavespeedModels);

    const editModels: ModelInfo[] = [
      {
        id: 'replit:gpt-image-1',
        name: 'GPT Image 1 (DALL-E)',
        provider: 'Replit Built-in',
        type: 'image-to-image',
        price: 0,
        description: 'OpenAI DALL-E image editing via Replit integration',
        apiPath: '',
        hasEditVariant: false,
      },
      ...(cachedEditModels || []),
    ];

    res.json({
      models: allModels,
      editModels,
      upscaleModels: cachedUpscaleModels || [],
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch models' });
  }
});

app.post('/api/generate-image', async (req, res) => {
  const { referenceImage, modelId, ...rest } = req.body as ImageGenRequest & { modelId: string };
  const prompt = buildPrompt(rest);

  if (!modelId) {
    return res.status(400).json({ error: 'modelId is required' });
  }

  try {
    let imageUrl: string;
    let modelName = modelId;

    if (modelId === 'replit:gpt-image-1') {
      imageUrl = await generateWithReplit(prompt, referenceImage);
      modelName = 'gpt-image-1';
    } else if (modelId.startsWith('wavespeed:')) {
      const wavespeedModels = await fetchWavespeedModels();
      const modelInfo = wavespeedModels.find(m => m.id === modelId);
      if (!modelInfo) {
        return res.status(400).json({ error: 'Unknown or unavailable model ID' });
      }
      modelName = modelInfo.name;
      imageUrl = await generateWithWavespeed(modelInfo.apiPath, modelInfo.editApiPath, modelInfo.editImageField, prompt, referenceImage);
    } else {
      return res.status(400).json({ error: 'Unknown model ID' });
    }

    return res.json({
      imageUrl,
      model: modelName,
      promptUsed: prompt,
    });
  } catch (err) {
    console.error('[generate-image] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Image generation failed',
    });
  }
});

app.post('/api/generate-reference', async (req, res) => {
  const { prompt, modelId } = req.body;

  if (!prompt || !modelId) {
    return res.status(400).json({ error: 'prompt and modelId are required' });
  }

  try {
    let imageUrl: string;
    let modelName = modelId;

    if (modelId === 'replit:gpt-image-1') {
      imageUrl = await generateWithReplit(prompt);
      modelName = 'gpt-image-1';
    } else if (modelId.startsWith('wavespeed:')) {
      const wavespeedModels = await fetchWavespeedModels();
      const modelInfo = wavespeedModels.find(m => m.id === modelId);
      if (!modelInfo) {
        return res.status(400).json({ error: 'Unknown or unavailable model ID' });
      }
      modelName = modelInfo.name;
      imageUrl = await generateWithWavespeed(modelInfo.apiPath, undefined, undefined, prompt);
    } else {
      return res.status(400).json({ error: 'Unknown model ID' });
    }

    return res.json({
      imageUrl,
      model: modelName,
      promptUsed: prompt,
    });
  } catch (err) {
    console.error('[generate-reference] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Reference image generation failed',
    });
  }
});

app.post('/api/edit-image', async (req, res) => {
  const { sourceImage, prompt, modelId } = req.body;

  if (!sourceImage || !prompt || !modelId) {
    return res.status(400).json({ error: 'sourceImage, prompt, and modelId are required' });
  }

  try {
    let imageUrl: string;
    let modelName = modelId;

    if (modelId === 'replit:gpt-image-1') {
      const resolvedSource = await resolveImageToDataUrl(sourceImage);
      imageUrl = await generateWithReplit(prompt, resolvedSource);
      modelName = 'GPT Image 1 (DALL-E)';
    } else if (modelId.startsWith('wavespeed-edit:')) {
      await fetchWavespeedModels();
      const editModel = (cachedEditModels || []).find(m => m.id === modelId);
      if (!editModel) {
        return res.status(400).json({ error: 'Unknown edit model ID' });
      }
      modelName = editModel.name;

      const b64Url = await resolveImageToDataUrl(sourceImage);
      const payload: Record<string, unknown> = {
        prompt,
        enable_sync_mode: true,
        enable_base64_output: true,
      };
      if (editModel.editImageField === 'images') {
        payload.images = [b64Url];
      } else {
        payload.image = b64Url;
      }

      const url = `https://api.wavespeed.ai${editModel.apiPath}`;
      const apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const json = await apiRes.json();
      imageUrl = await extractWavespeedOutput(json);
    } else {
      return res.status(400).json({ error: 'Unknown model ID' });
    }

    return res.json({ imageUrl, model: modelName });
  } catch (err) {
    console.error('[edit-image] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Image editing failed' });
  }
});

app.post('/api/upscale-image', async (req, res) => {
  const { sourceImage, modelId } = req.body;

  if (!sourceImage || !modelId) {
    return res.status(400).json({ error: 'sourceImage and modelId are required' });
  }

  if (!modelId.startsWith('wavespeed-upscale:')) {
    return res.status(400).json({ error: 'Invalid upscale model ID' });
  }

  try {
    await fetchWavespeedModels();
    const upscaleModel = (cachedUpscaleModels || []).find(m => m.id === modelId);
    if (!upscaleModel) {
      return res.status(400).json({ error: 'Unknown upscale model ID' });
    }

    const b64Url = await resolveImageToDataUrl(sourceImage);
    const payload: Record<string, unknown> = {
      enable_sync_mode: true,
      enable_base64_output: true,
    };
    if (upscaleModel.editImageField === 'images') {
      payload.images = [b64Url];
    } else {
      payload.image = b64Url;
    }

    const url = `https://api.wavespeed.ai${upscaleModel.apiPath}`;
    const apiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await apiRes.json();
    const imageUrl = await extractWavespeedOutput(json);

    return res.json({ imageUrl, model: upscaleModel.name });
  } catch (err) {
    console.error('[upscale-image] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Image upscaling failed' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', wavespeedConfigured: !!WAVESPEED_API_KEY });
});

async function pushSchema() {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS personas (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL DEFAULT '',
        niche TEXT NOT NULL DEFAULT '',
        tone TEXT NOT NULL DEFAULT '',
        platform TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Draft',
        avatar TEXT NOT NULL DEFAULT '',
        reference_image TEXT,
        personality_traits TEXT NOT NULL DEFAULT '[]',
        visual_style TEXT NOT NULL DEFAULT '',
        audience_type TEXT NOT NULL DEFAULT '',
        content_boundaries TEXT NOT NULL DEFAULT '',
        bio TEXT NOT NULL DEFAULT '',
        brand_voice_rules TEXT NOT NULL DEFAULT '',
        content_goals TEXT NOT NULL DEFAULT '',
        persona_notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      CREATE TABLE IF NOT EXISTS generated_images (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL UNIQUE,
        persona_client_id TEXT NOT NULL,
        url TEXT NOT NULL,
        prompt TEXT NOT NULL DEFAULT '',
        timestamp REAL NOT NULL,
        environment TEXT,
        outfit TEXT,
        framing TEXT,
        is_favorite BOOLEAN DEFAULT false,
        model TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      CREATE TABLE IF NOT EXISTS revenue_entries (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL UNIQUE,
        persona_client_id TEXT NOT NULL,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        source TEXT NOT NULL DEFAULT '',
        platform TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      CREATE TABLE IF NOT EXISTS planned_posts (
        id SERIAL PRIMARY KEY,
        persona_client_id TEXT NOT NULL,
        plan_platform TEXT NOT NULL DEFAULT '',
        day INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT '',
        hook TEXT NOT NULL DEFAULT '',
        angle TEXT NOT NULL DEFAULT '',
        cta TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    await pool.end();
    console.log('[DB] Schema tables ensured');
  } catch (err) {
    console.error('[DB] Schema push error:', err);
  }
}

const PORT = 3001;
pushSchema().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Image Server] Listening on port ${PORT}`);
    if (WAVESPEED_API_KEY) {
      fetchWavespeedModels().then(models => {
        console.log(`[Wavespeed] Loaded ${models.length} generation, ${(cachedEditModels || []).length} edit, ${(cachedUpscaleModels || []).length} upscale models`);
      });
    } else {
      console.warn('[Wavespeed] No API key configured — only built-in models available');
    }
  });
});
