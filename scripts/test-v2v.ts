import 'dotenv/config';

async function testLocalV2VModels() {
  const PORT = process.env.PORT || 3001;
  const baseUrl = `http://localhost:${PORT}`;
  console.log(`--- Testing local backend V2V model loading at ${baseUrl} ---`);

  try {
    const res = await fetch(`${baseUrl}/api/models`);
    if (!res.ok) {
      throw new Error(`Failed to fetch models from local backend, status: ${res.status}`);
    }
    const json = await res.json() as any;
    const videoModels = json.videoModels || [];
    const v2vModels = videoModels.filter((m: any) => m.id.startsWith('wavespeed-v2v:'));

    console.log(`Total video models returned: ${videoModels.length}`);
    console.log(`Video-to-Video (V2V) models filtered: ${v2vModels.length}`);

    if (v2vModels.length > 0) {
      console.log('\nList of V2V models loaded:');
      v2vModels.forEach((m: any) => {
        console.log(`- ID: ${m.id} | Name: ${m.name} | Path: ${m.apiPath}`);
      });
      console.log('\nSUCCESS: V2V models successfully fetched and parsed by local backend server.');
    } else {
      console.warn('\nWARNING: No V2V models found. Ensure the Wavespeed API key is valid and backend caches models.');
    }
  } catch (err: any) {
    console.error('Error running V2V verification script:', err.message);
  }
}

testLocalV2VModels();
