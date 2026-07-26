import 'dotenv/config';

async function checkModels() {
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

    const uniqueTypes = new Set<string>();
    const videoModels: any[] = [];
    const allModels: any[] = json.data;

    allModels.forEach((m) => {
      uniqueTypes.add(m.type);
      if (m.type.includes('video') || m.model_id.includes('video') || m.type.includes('edit')) {
        videoModels.push(m);
      }
    });

    console.log('Unique Model Types:', Array.from(uniqueTypes));
    console.log('\n--- Video & Edit Models list ---');
    videoModels.forEach((m) => {
      // Find api_path
      const apiPath = m.api_schema?.api_schemas?.[0]?.api_path || '';
      const requestSchema = m.api_schema?.api_schemas?.[0]?.request_schema?.properties || {};
      const fields = Object.keys(requestSchema);
      console.log(`- ID: ${m.model_id} | Type: ${m.type} | Path: ${apiPath} | Input Fields: ${fields.join(', ')}`);
    });

  } catch (err: any) {
    console.error('Error fetching Wavespeed models:', err.message);
  }
}

checkModels();
