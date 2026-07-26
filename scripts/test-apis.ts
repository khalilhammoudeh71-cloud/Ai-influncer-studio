import 'dotenv/config';

const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY || '';
const WAVESPEED_BASE = 'https://api.wavespeed.ai/api/v3';

const VENICE_API_KEY = process.env.Veniceai_api_key || process.env.veniceai_api_key || process.env.VENICEAI_API_KEY || process.env.VENICE_API_KEY || '';
const VENICE_BASE = 'https://api.venice.ai/api/v1';

async function testWavespeed() {
  console.log('--- Testing Wavespeed ---');
  console.log('API Key length:', WAVESPEED_API_KEY.length);
  console.log('API Key preview:', WAVESPEED_API_KEY.substring(0, 8) + '...');
  
  try {
    const url = `${WAVESPEED_BASE}/models`;
    console.log('Fetching from URL:', url);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
    });
    console.log('Status code:', res.status);
    const json = await res.json() as any;
    console.log('JSON structure:', Object.keys(json));
    if (json.data) {
      console.log('Data length:', json.data.length);
      if (json.data.length > 0) {
        console.log('First model example:', JSON.stringify(json.data[0], null, 2));
      }
    } else {
      console.log('Response body:', JSON.stringify(json, null, 2));
    }
  } catch (err: any) {
    console.error('Wavespeed error:', err.message, err.stack);
  }
}

async function testVenice() {
  console.log('\n--- Testing Venice ---');
  console.log('API Key length:', VENICE_API_KEY.length);
  console.log('API Key preview:', VENICE_API_KEY.substring(0, 8) + '...');
  
  try {
    const url = `${VENICE_BASE}/models?type=image`;
    console.log('Fetching from URL:', url);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${VENICE_API_KEY}` },
    });
    console.log('Status code:', res.status);
    const json = await res.json() as any;
    console.log('JSON structure:', Object.keys(json));
    if (json.data) {
      console.log('Data length:', json.data.length);
      if (json.data.length > 0) {
        console.log('First model example:', JSON.stringify(json.data[0], null, 2));
      }
    } else if (json.models) {
      console.log('Models length:', json.models.length);
      if (json.models.length > 0) {
        console.log('First model example:', JSON.stringify(json.models[0], null, 2));
      }
    } else {
      console.log('Response body:', JSON.stringify(json, null, 2));
    }
  } catch (err: any) {
    console.error('Venice error:', err.message, err.stack);
  }
}

async function main() {
  await testWavespeed();
  await testVenice();
}

main();
