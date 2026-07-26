import dotenv from 'dotenv';

// Load environment variables from process.cwd()
dotenv.config();

const ATLASCLOUD_API_KEY = process.env.ATLASCLOUD_API_KEY || '';
const ATLASCLOUD_BASE = 'https://api.atlascloud.ai';

async function run() {
  console.log('ATLASCLOUD_API_KEY length:', ATLASCLOUD_API_KEY.length);
  if (!ATLASCLOUD_API_KEY) {
    console.error('Error: ATLASCLOUD_API_KEY is not set');
    process.exit(1);
  }

  try {
    const res = await fetch(`${ATLASCLOUD_BASE}/v1/models`, {
      headers: { Authorization: `Bearer ${ATLASCLOUD_API_KEY}` },
    });
    console.log('Status code:', res.status);
    const json = await res.json() as any;
    const rawModels = json.data || [];
    console.log('Total models available:', rawModels.length);

    const imageModelIds = new Set([
      'google/gemini-2.5-flash-image',
      'google/gemini-3-pro-image-preview',
      'google/gemini-3.1-flash-image-preview',
      'openai/gpt-image-2',
      'google/gemini-3.1-flash-image',
    ]);

    const mapped = rawModels
      .filter((m: any) => imageModelIds.has(m.id))
      .map((m: any) => ({
        id: `atlascloud:${m.id}`,
        name: m.name || m.id,
      }));

    console.log('Mapped Image Models:', mapped);
    console.log('Integration Test Successful!');
  } catch (err) {
    console.error('Integration Test Failed:', err);
    process.exit(1);
  }
}

run();
