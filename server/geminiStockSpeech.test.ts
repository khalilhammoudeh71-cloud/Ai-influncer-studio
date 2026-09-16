import test from 'node:test';
import assert from 'node:assert/strict';
import { geminiStockSpeech, pcmWave } from './geminiStockSpeech';

test('PCM is wrapped in a playable mono WAV with the supplied sample rate', () => {
  const pcm = Buffer.from([1, 2, 3, 4]);
  const wav = pcmWave(pcm, 24000);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.readUInt32LE(24), 24000);
  assert.equal(wav.readUInt32LE(40), pcm.length);
  assert.deepEqual(wav.subarray(44), pcm);
});

test('unknown Gemini voice is rejected before any provider request', async () => {
  await assert.rejects(geminiStockSpeech('Hello', 'invalid'), /Choose an available Gemini voice/);
});

test('Gemini preview sends the selected voice and returns browser-playable audio', async (t) => {
  const previous = process.env.Gemini_api_key;
  process.env.Gemini_api_key = 'test';
  t.after(() => { if (previous === undefined) delete process.env.Gemini_api_key; else process.env.Gemini_api_key = previous; });
  const pcm = Buffer.from([1, 2, 3, 4]);
  t.mock.method(globalThis, 'fetch', async (_url: unknown, options: RequestInit) => {
    const request = JSON.parse(String(options.body));
    assert.equal(request.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Kore');
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: {
      data: pcm.toString('base64'), mimeType: 'audio/L16;rate=24000',
    } }] } }] }));
  });
  assert.equal(await geminiStockSpeech('Hello', 'Kore'), `data:audio/wav;base64,${pcmWave(pcm).toString('base64')}`);
});
