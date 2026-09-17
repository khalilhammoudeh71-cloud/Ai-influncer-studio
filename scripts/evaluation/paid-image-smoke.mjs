// Opt-in paid smoke test. Never run as part of the deterministic test suite.
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'node:fs/promises';
dotenv.config({ quiet: true });
if (process.env.STUDIO_PAID_TEST !== 'confirmed') throw new Error('Explicit paid-test opt-in required');
const key = process.env.OPENAI_API_KEY || process.env.Openai_api_key || process.env.openai_api_key;
if (!key) throw new Error('Existing OpenAI key unavailable');
const client = new OpenAI({ apiKey: key, maxRetries: 0, timeout: 120000 });
const directory = '/tmp/studio-api-audit';
await fs.mkdir(directory, { recursive: true });
const results = [];
for (const model of ['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst']) {
  const start = Date.now();
  try {
    const result = await client.images.generate({ model, prompt: 'A gold ceramic teacup on a charcoal table. Studio product photograph. No people or text.', n: 1, size: '1024x1024', quality: 'low' });
    const base64 = result.data?.[0]?.b64_json;
    if (!base64) throw new Error('No base64 image returned');
    const path = `${directory}/${model}.png`;
    await fs.writeFile(path, Buffer.from(base64, 'base64'));
    results.push({ model, success: true, elapsedMs: Date.now() - start, path, usage: result.usage ?? null });
  } catch (error) {
    // Provider messages may contain even partially masked credentials.
    results.push({ model, success: false, elapsedMs: Date.now() - start, status: error.status ?? null, code: error.code ?? null });
  }
  await fs.writeFile(`${directory}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results.at(-1)));
}
