import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Client } = pg;

async function testDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('🔴 DATABASE_URL: Not set');
    return;
  }
  const cleanUrl = url ? url.split('?')[0] : '';
  const client = new Client({ 
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    const res = await client.query('SELECT 1');
    if (res.rows.length > 0) {
      console.log('🟢 DATABASE_URL: Valid (Connected successfully)');
    } else {
      console.log('🔴 DATABASE_URL: Invalid response');
    }
  } catch (err: any) {
    console.log(`🔴 DATABASE_URL: Failed connection - ${err.message || err}`);
  } finally {
    await client.end();
  }
}

async function testOpenAI() {
  const key = process.env.Openai_api_key || process.env.openai_api_key || process.env.OPENAI_API_KEY || '';
  if (!key) {
    console.log('🔴 OpenAI API Key: Not set');
    return;
  }
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` }
    });
    if (res.ok) {
      console.log('🟢 OpenAI API Key: Valid');
    } else {
      const text = await res.text();
      console.log(`🔴 OpenAI API Key: Invalid (${res.status}) - ${text.substring(0, 100)}`);
    }
  } catch (err: any) {
    console.log(`🔴 OpenAI API Key: Fetch failed - ${err.message || err}`);
  }
}

async function testGemini() {
  const key = process.env.Gemini_api_key || process.env.gemini_api_key || process.env.GEMINI_API_KEY || '';
  if (!key) {
    console.log('🔴 Gemini API Key: Not set');
    return;
  }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (res.ok) {
      console.log('🟢 Gemini API Key: Valid');
    } else {
      const text = await res.text();
      console.log(`🔴 Gemini API Key: Invalid (${res.status}) - ${text.substring(0, 100)}`);
    }
  } catch (err: any) {
    console.log(`🔴 Gemini API Key: Fetch failed - ${err.message || err}`);
  }
}

async function testWavespeed() {
  const key = process.env.WAVESPEED_API_KEY || '';
  if (!key) {
    console.log('🔴 Wavespeed API Key: Not set');
    return;
  }
  try {
    const res = await fetch('https://api.wavespeed.ai/api/v3/models', {
      headers: { Authorization: `Bearer ${key}` }
    });
    if (res.ok) {
      console.log('🟢 Wavespeed API Key: Valid');
    } else {
      const text = await res.text();
      console.log(`🔴 Wavespeed API Key: Invalid (${res.status}) - ${text.substring(0, 100)}`);
    }
  } catch (err: any) {
    console.log(`🔴 Wavespeed API Key: Fetch failed - ${err.message || err}`);
  }
}

async function testVenice() {
  const key = process.env.Veniceai_api_key || process.env.veniceai_api_key || process.env.VENICEAI_API_KEY || process.env.VENICE_API_KEY || '';
  if (!key) {
    console.log('🔴 Venice AI API Key: Not set');
    return;
  }
  try {
    const res = await fetch('https://api.venice.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${key}` }
    });
    if (res.ok) {
      console.log('🟢 Venice AI API Key: Valid');
    } else {
      const text = await res.text();
      console.log(`🔴 Venice AI API Key: Invalid (${res.status}) - ${text.substring(0, 100)}`);
    }
  } catch (err: any) {
    console.log(`🔴 Venice AI API Key: Fetch failed - ${err.message || err}`);
  }
}

async function testElevenLabs() {
  const key = process.env.ELEVENLABS_API_KEY || '';
  if (!key) {
    console.log('🔴 ElevenLabs API Key: Not set');
    return;
  }
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': key }
    });
    if (res.ok) {
      console.log('🟢 ElevenLabs API Key: Valid');
    } else {
      const text = await res.text();
      console.log(`🔴 ElevenLabs API Key: Invalid (${res.status}) - ${text.substring(0, 100)}`);
    }
  } catch (err: any) {
    console.log(`🔴 ElevenLabs API Key: Fetch failed - ${err.message || err}`);
  }
}

async function testHeyGen() {
  const key = process.env.HEYGEN_API_KEY || process.env.heygen_api_key || '';
  if (!key) {
    console.log('🔴 HeyGen API Key: Not set');
    return;
  }
  try {
    const res = await fetch('https://api.heygen.com/v2/avatars', {
      headers: { 'X-Api-Key': key }
    });
    if (res.ok) {
      console.log('🟢 HeyGen API Key: Valid');
    } else {
      const text = await res.text();
      console.log(`🔴 HeyGen API Key: Invalid (${res.status}) - ${text.substring(0, 100)}`);
    }
  } catch (err: any) {
    console.log(`🔴 HeyGen API Key: Fetch failed - ${err.message || err}`);
  }
}

async function testAtlasCloud() {
  const key = process.env.ATLASCLOUD_API_KEY || '';
  if (!key) {
    console.log('🔴 Atlas Cloud API Key: Not set');
    return;
  }
  try {
    // Test chat endpoint
    const res = await fetch('https://api.atlascloud.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: 'say hello' }]
      })
    });
    if (res.ok) {
      const data = await res.json() as any;
      const content = data.choices?.[0]?.message?.content?.trim();
      console.log(`🟢 Atlas Cloud API Key: Valid (Chat Response: "${content}")`);
    } else {
      const text = await res.text();
      console.log(`🔴 Atlas Cloud API Key: Invalid (${res.status}) - ${text.substring(0, 100)}`);
    }
  } catch (err: any) {
    console.log(`🔴 Atlas Cloud API Key: Fetch failed - ${err.message || err}`);
  }
}

async function run() {
  console.log('=== Starting Environment Variables Diagnostic Tests ===\n');
  await testDatabase();
  await testOpenAI();
  await testGemini();
  await testWavespeed();
  await testVenice();
  await testElevenLabs();
  await testHeyGen();
  await testAtlasCloud();
  console.log('\n=== Diagnostic Tests Complete ===');
}

run();
