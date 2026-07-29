import 'dotenv/config';

async function findUpscaleModels() {
  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY || '';
  const WAVESPEED_BASE = 'https://api.wavespeed.ai/api/v3';

  if (!WAVESPEED_API_KEY) {
    console.error('WAVESPEED_API_KEY is not set');
    return;
  }

  try {
    const res = await fetch(`${WAVESPEED_BASE}/models`, {
      headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
    });
    const json = await res.json() as any;
    if (!json.data) {
      console.log('No data found:', json);
      return;
    }

    const allModels: any[] = json.data;
    console.log('Total models available:', allModels.length);

    const upscaleModels = allModels.filter(m => 
      m.model_id.toLowerCase().includes('upscale') || 
      (m.type && m.type.toLowerCase().includes('upscale'))
    );

    console.log('\n--- Upscale Models ---');
    upscaleModels.forEach((m) => {
      const apiPath = m.api_schema?.api_schemas?.[0]?.api_path || '';
      const requestSchema = m.api_schema?.api_schemas?.[0]?.request_schema?.properties || {};
      const fields = Object.keys(requestSchema);
      console.log(`- ID: ${m.model_id} | Type: ${m.type} | Path: ${apiPath} | Fields: ${fields.join(', ')}`);
    });
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

findUpscaleModels();
