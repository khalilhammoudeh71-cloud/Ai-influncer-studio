import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { VoiceRemixes, createVoiceRemixRouter } from './voiceRemixes';
import { VoiceLifecycleError } from './personaVoiceLifecycle';
import type { VoiceRemixInput, SaveRemixedVoiceInput } from '../shared/voiceRemix';

const input: VoiceRemixInput = { operationId: 'd1b51ff6-f811-4b50-b983-5af6bec60a99', voiceId: 'original_owned_voice', description: 'Preserve this voice with a natural Jordanian Arabic accent.' };
const saveInput: SaveRemixedVoiceInput = { operationId: input.operationId, generatedVoiceId: 'remix_preview_1', name: 'Levantine voice', description: input.description };
function fixture(options: { previewTimeout?: boolean; saveTimeout?: boolean; previewStatus?: number; saveStatus?: number; invalidPreview?: boolean; denySource?: boolean; failPersistence?: boolean } = {}) {
  const rows = new Map<string, any>(), calls: { url: string; init: RequestInit; body: any }[] = [], remote: any[] = [], authorized: string[] = [];
  const key = (owner: string, id: string) => `${owner}|${id}`;
  const store = {
    async get(owner: string, id: string) { return structuredClone(rows.get(key(owner,id))); },
    async claim(owner: string, id: string, value: unknown) { if (rows.has(key(owner,id))) return false; rows.set(key(owner,id),structuredClone(value)); return true; },
    async put(owner: string, id: string, value: any) {
      if (options.failPersistence && id.startsWith('remix-save:') && value.voiceId) { options.failPersistence = false; throw new Error('internal database credentials must not leak'); }
      rows.set(key(owner,id),structuredClone(value));
    },
    async replace(owner: string, id: string, previous: unknown, next: unknown) { if (JSON.stringify(rows.get(key(owner,id))) !== JSON.stringify(previous)) return false; rows.set(key(owner,id),structuredClone(next)); return true; },
  };
  const provider = { async account(apiKey: string) { return apiKey === 'key-other' ? 'provider-b' : 'provider-a'; }, async list() { return structuredClone(remote); } };
  const transport: typeof fetch = async (url, init) => {
    const body = JSON.parse(init?.body as string); calls.push({url:String(url),init:init!,body});
    assert.equal(new URL(String(url)).origin, 'https://api.elevenlabs.io');
    assert.equal((init?.headers as Record<string,string>)['xi-api-key'], 'fixture-secret');
    assert.equal(init?.redirect,'error');
    assert.equal(JSON.stringify(body).includes('fixture-secret'),false);
    if (String(url).includes('/remix?')) {
      if (options.previewTimeout) throw new Error('provider exception includes fixture-secret');
      if (options.previewStatus) return Response.json({detail:'fixture-secret provider raw payload'},{status:options.previewStatus});
      return Response.json({previews:[{generated_voice_id:'remix_preview_1',audio_base_64:options.invalidPreview?'not audio':Buffer.alloc(300,1).toString('base64'),media_type:'audio/mpeg'}],text:'The generated sample text.'});
    }
    assert.equal(String(url),'https://api.elevenlabs.io/v1/text-to-voice');
    if (options.saveStatus) return Response.json({detail:'fixture-secret provider raw payload'},{status:options.saveStatus});
    remote.push({voice_id:'remixed_saved_voice',name:body.voice_name,description:body.voice_description,labels:body.labels});
    if (options.saveTimeout) throw new Error('provider exception includes fixture-secret');
    return Response.json({voice_id:'remixed_saved_voice',name:body.voice_name,private_provider_detail:'fixture-secret'});
  };
  const service = new VoiceRemixes(store,provider,transport);
  const authorize = async (id: string) => { authorized.push(id); if(options.denySource) throw new VoiceLifecycleError('Private voice unavailable.',403); };
  const remix = (values=input, owner='alice') => service.remix(owner,'fixture-secret',values,authorize);
  const save = (values=saveInput, owner='alice') => service.save(owner,'fixture-secret',values);
  return {service,store,rows,calls,remote,authorized,authorize,remix,save,options};
}

test('remix uses the official schema and exposes only scoped audio previews', async () => {
  const f=fixture(); const result=await f.remix();
  assert.deepEqual(f.authorized,[input.voiceId]);
  assert.deepEqual(f.calls[0].body,{voice_description:input.description,auto_generate_text:true,stream_previews:false});
  assert.match(f.calls[0].url,/\/v1\/text-to-voice\/original_owned_voice\/remix\?output_format=mp3_44100_128$/);
  assert.equal(result.status,'ready'); assert.equal(result.previews[0].generatedVoiceId,'remix_preview_1');
  assert.match(result.previews[0].audioUrl,/^data:audio\/mpeg;base64,/);
  assert.equal('owner' in result,false); assert.equal('account' in result,false);
  const text='a'.repeat(100);
  await f.remix({...input,operationId:'another_operation_123',text});
  assert.equal(f.calls[1].body.text,text); assert.equal(f.calls[1].body.auto_generate_text,false);
});
test('invalid input and unauthorized original voices never reach a paid provider endpoint', async () => {
  const f=fixture({denySource:true});
  await assert.rejects(f.remix(),(error:any)=>error.statusCode===403);
  for (const values of [{description:'tiny'},{description:'a'.repeat(1001)},{text:'a'.repeat(99)},{text:'a'.repeat(1001)},{operationId:'bad'},{voiceId:'../arbitrary'}]) await assert.rejects(f.remix({...input,...values}));
  assert.equal(f.calls.length,0);assert.equal(f.rows.size,0);
});
test('duplicate preview submissions share one request and an operation cannot change its source or prompt', async () => {
  const f=fixture();await Promise.all([f.remix(),f.remix()]);
  assert.equal(f.calls.length,1);assert.equal((await f.remix()).status,'ready');
  await assert.rejects(f.remix({...input,voiceId:'other_voice'}),/different inputs/);
  await assert.rejects(f.remix({...input,description:'A completely different voice description.'}),/different inputs/);
  assert.equal(f.calls.length,1);
});
test('unknown preview outcomes and malformed responses do not replay and never reveal provider errors', async () => {
  for(const options of [{previewTimeout:true},{previewStatus:502},{invalidPreview:true}]) {
    const f=fixture(options);const result=await f.remix();assert.equal(result.status,'unknown');
    assert.equal((await f.remix()).status,'unknown');assert.equal(f.calls.length,1);
    assert.equal(JSON.stringify(result).includes('fixture-secret'),false);
  }
  const f=fixture({previewStatus:403});const result=await f.remix();assert.equal(result.status,'failed');assert.match(result.message!,/permissions/);assert.equal(JSON.stringify(result).includes('fixture-secret'),false);
});
test('preview and generated IDs are scoped to their owner and stable provider account', async () => {
  const f=fixture();await f.remix();
  await assert.rejects(f.service.status('bob','fixture-secret',input.operationId),/not found/);
  await assert.rejects(f.save(saveInput,'bob'),/not found/);
  await assert.rejects(f.save({...saveInput,generatedVoiceId:'foreign_preview'}),/ready preview/);
  await assert.rejects(f.service.status('alice','key-other',input.operationId),/Reconnect/);
  assert.equal((await f.service.status('alice','rotated-key',input.operationId)).status,'ready');
  assert.equal(f.calls.length,1);
});
test('saving creates one separate library voice and ownership record without replacing the old voice', async () => {
  const f=fixture();await f.remix();
  await f.store.put('alice','binding:persona',{voiceId:input.voiceId});
  const results=await Promise.all([f.save(),f.save()]);
  assert.ok(results.some(result=>result.status==='ready'));
  const saved=await f.save({...saveInput,name:'Duplicate name change'});
  assert.deepEqual({voiceId:saved.voiceId,name:saved.name},{voiceId:'remixed_saved_voice',name:saveInput.name});
  assert.equal(f.calls.length,2);
  assert.equal(f.calls[1].body.generated_voice_id,saveInput.generatedVoiceId);
  assert.equal(f.calls[1].body.voice_description,saveInput.description);
  assert.equal(f.calls[1].body.voice_name,saveInput.name);
  assert.ok(f.calls[1].body.labels.studio_remix);
  const ownership=[...f.rows.entries()].find(([key])=>key.startsWith('alice|remix-voice:'))?.[1];
  assert.equal(ownership.voiceId,'remixed_saved_voice');assert.equal(ownership.account,'provider-a');assert.equal(ownership.status,'ready');
  assert.equal((await f.store.get('alice','binding:persona')).voiceId,input.voiceId);
  assert.equal(JSON.stringify(saved).includes('fixture-secret'),false);
});
test('a lost save response reconciles the same remote voice without another POST', async () => {
  const f=fixture({saveTimeout:true});await f.remix();
  assert.equal((await f.save()).status,'unknown');
  const recovered=await f.service.saveStatus('alice','fixture-secret',input.operationId,saveInput.generatedVoiceId);
  assert.equal(recovered.status,'ready');assert.equal(recovered.voiceId,'remixed_saved_voice');
  assert.equal((await f.save({...saveInput,retryRejected:true})).voiceId,recovered.voiceId);
  assert.equal(f.calls.length,2);assert.equal(f.remote.length,1);
});
test('save persistence interruption is recovered through its marker, with no duplicate submission', async () => {
  const f=fixture({failPersistence:true});await f.remix();await assert.rejects(f.save(),/database/);
  const op=[...f.rows.values()].find(row=>row.generatedVoiceId===saveInput.generatedVoiceId);op.createdAt=new Date(Date.now()-70_000).toISOString();
  const result=await f.service.saveStatus('alice','fixture-secret',input.operationId,saveInput.generatedVoiceId);
  assert.equal(result.voiceId,'remixed_saved_voice');assert.equal(f.calls.length,2);
});
test('save validates fields and explicit rejected retry is atomic; unknown saves cannot be retried', async () => {
  const f=fixture({saveStatus:429});await f.remix();
  await assert.rejects(f.save({...saveInput,description:'too short'}),/20–1000/);await assert.rejects(f.save({...saveInput,name:''}),/Voice name/);
  assert.equal(f.calls.length,1);
  assert.equal((await f.save()).status,'failed');f.options.saveStatus=undefined;
  assert.equal((await f.save()).status,'failed');assert.equal(f.calls.length,2);
  await Promise.all([f.save({...saveInput,retryRejected:true}),f.save({...saveInput,retryRejected:true})]);
  assert.equal(f.calls.length,3);assert.equal((await f.save()).status,'ready');
  const unknown=fixture({saveStatus:503});await unknown.remix();await unknown.save();await unknown.save({...saveInput,retryRejected:true});assert.equal(unknown.calls.length,2);
});
test('authenticated router blocks anonymous calls and sanitizes unexpected errors', async t => {
  const f=fixture();const app=express();app.use(express.json());
  app.use((req:any,_res,next)=>{if(req.headers['x-fixture-user'])req.user={id:req.headers['x-fixture-user']};next();});
  app.use('/voice-remixes',createVoiceRemixRouter({service:f.service,apiKey:()=> 'fixture-secret',authorizeVoice:async()=>{throw new Error('fixture-secret internal transport error');}}));
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));t.after(()=>{server.closeAllConnections();server.close();});
  const base=`http://127.0.0.1:${(server.address() as any).port}/voice-remixes`;
  const anon=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});assert.equal(anon.status,401);
  const denied=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json','x-fixture-user':'alice'},body:JSON.stringify(input)});
  assert.equal(denied.status,503);assert.equal(denied.headers.get('cache-control'),'no-store');assert.equal((await denied.text()).includes('fixture-secret'),false);assert.equal(f.calls.length,0);
});
