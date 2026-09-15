import test from 'node:test';
import assert from 'node:assert/strict';
import { loadVoiceUploadReferences } from './voiceUploadReferences';
const origin = 'https://workspace.supabase.co';
const url = `${origin}/storage/v1/object/sign/workspace-media/owner/audio/sample.wav?token=test`;
test('large audio travels by URL and is hydrated only on the server', async () => {
 const bytes = Buffer.alloc(6 * 1024 * 1024, 1);
 const refs = await loadVoiceUploadReferences([url], 'owner', origin, (async () => new Response(bytes, {headers:{'content-type':'audio/wav'}})) as typeof fetch);
 assert.equal(Buffer.from(refs[0].split(',')[1], 'base64').length, bytes.length);
 assert.ok(JSON.stringify({sampleBase64s:[url]}).length < 1024);
});
test('rejects foreign storage and another owner before fetching', async () => {
 for (const invalid of [url.replace('owner/', 'other/'),url.replace(origin,'https://attacker.example')]) {
  await assert.rejects(loadVoiceUploadReferences([invalid], 'owner', origin, (async () => { throw new Error('must not fetch'); }) as typeof fetch), /not in your workspace/);
 }
});
test('enforces total size while reading and rejects non-audio responses', async () => {
 await assert.rejects(loadVoiceUploadReferences([url], 'owner', origin, (async () => new Response(Buffer.alloc(21 * 1024 * 1024),{headers:{'content-type':'audio/wav'}})) as typeof fetch), /20 MB/);
 await assert.rejects(loadVoiceUploadReferences([url], 'owner', origin, (async () => new Response('html',{headers:{'content-type':'text/html'}})) as typeof fetch), /not audio/);
});
