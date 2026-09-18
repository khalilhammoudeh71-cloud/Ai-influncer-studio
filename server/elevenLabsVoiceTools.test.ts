import test from 'node:test';
import assert from 'node:assert/strict';
import {ElevenLabsVoiceTools} from './elevenLabsVoiceTools';
function fixture(timeout=false) {
  const rows=new Map<string,any>(),calls:any[]=[];
  const store={async get(o:string,k:string){return rows.get(o+k);},async put(o:string,k:string,v:any){rows.set(o+k,v);},async claim(o:string,k:string,v:any){if(rows.has(o+k))return false;rows.set(o+k,v);return true;}};
  const service=new ElevenLabsVoiceTools(store,async key=>key==='other'?'other-account':'account',async(url,init)=>{calls.push({url:String(url),init});if(timeout)throw new Error('secret-provider-error');if(String(url).includes('speech-to-speech')||String(url).includes('audio-isolation')||String(url).includes('captcha'))return new Response(new Uint8Array(200),{headers:{'content-type':'audio/mpeg'}});if(String(url).includes('dictionaries'))return Response.json({id:'dictionary',version_id:'version'});return Response.json({voice_id:'professional'});});
  const authorize=async(id:string)=>{if(id==='foreign')throw new Error('denied');};
  return {service,calls,rows,authorize,load:async(refs:string[])=>refs};
}
const audio=`data:audio/wav;base64,${Buffer.alloc(200).toString('base64')}`;
test('multilingual voice conversion sends audio directly and duplicate requests do not charge twice',async()=>{
  const f=fixture(),input={operationId:'op-one',action:'changer',voiceId:'owned',audio:[audio],removeNoise:true};
  const result=await f.service.run('alice','key',input,f.authorize,f.load);
  assert.equal(result.status,'ready');assert.match(result.audioUrl,/^data:audio\/mpeg/);
  assert.equal(f.calls[0].init.body.get('model_id'),'eleven_multilingual_sts_v2');
  assert.equal(f.calls[0].init.body.get('remove_background_noise'),'true');
  assert.equal(f.calls[0].init.body.has('audio'),true);
  await f.service.run('alice','key',input,f.authorize,f.load);assert.equal(f.calls.length,1);
  await assert.rejects(f.service.run('alice','key',{...input,removeNoise:false},f.authorize,f.load),/different inputs/);
});
test('unknown operations stay scoped and are never replayed',async()=>{
  const f=fixture(true),input={operationId:'op-two',action:'isolate',audio:[audio]};
  const result=await f.service.run('alice','key',input,f.authorize,f.load);assert.equal(result.status,'unknown');assert.equal(JSON.stringify(result).includes('secret'),false);
  await f.service.run('alice','key',input,f.authorize,f.load);assert.equal(f.calls.length,1);
  await assert.rejects(f.service.status('bob','key','op-two'),/not found/);
  await assert.rejects(f.service.status('alice','other','op-two'),/not found/);
});
test('professional cloning requires own-voice confirmation and creates an unbound resource',async()=>{
  const f=fixture(),input={operationId:'op-three',action:'pvc-create',name:'My Arabic voice',language:'ar'};
  await assert.rejects(f.service.run('alice','key',input,f.authorize,f.load),/own voice/);assert.equal(f.calls.length,0);
  const result=await f.service.run('alice','key',{...input,ownVoice:true},f.authorize,f.load);assert.equal(result.voiceId,'professional');assert.equal(JSON.parse(f.calls[0].init.body).language,'ar');assert.equal([...f.rows.keys()].some(k=>k.includes('binding:')),false);
});
test('dictionary aliases and IPA are mapped to the official rule contract',async()=>{
  const f=fixture();await f.service.run('alice','key',{operationId:'op-four',action:'dictionary-create',name:'Arabic',rules:[{word:'كيفك',replacement:'كِيفَك',type:'alias'},{word:'word',replacement:'wɜːd',type:'phoneme'}]},f.authorize,f.load);
  const body=JSON.parse(f.calls[0].init.body);assert.equal(body.rules[0].alias,'كِيفَك');assert.equal(body.rules[1].alphabet,'ipa');assert.ok(f.rows.get('aliceeleven-dictionary:dictionary'));
});
test('private voices and arbitrary actions are rejected before contacting provider',async()=>{
  const f=fixture();await assert.rejects(f.service.run('alice','key',{operationId:'op-five',action:'changer',voiceId:'foreign',audio:[audio]},f.authorize,f.load));
  await assert.rejects(f.service.run('alice','key',{operationId:'op-six',action:'arbitrary'},f.authorize,f.load));assert.equal(f.calls.length,0);
});
test('speaker verification challenge stays an audio recording',async()=>{
  const f=fixture();const result=await f.service.read('alice','key','captcha',{voiceId:'owned'},f.authorize);
  assert.match(result.audioUrl,/^data:audio\/mpeg;base64,/);
  await assert.rejects(f.service.read('alice','key','captcha',{voiceId:'foreign'},f.authorize));
  assert.equal(f.calls.length,1);
});
test('an interrupted ownership save recovers without a second provider request',async()=>{
  const rows=new Map<string,any>();let calls=0,fail=true;
  const store={async get(o:string,k:string){return rows.get(o+k);},async claim(o:string,k:string,v:any){if(rows.has(o+k))return false;rows.set(o+k,v);return true;},async put(o:string,k:string,v:any){if(k.startsWith('remix-voice:')&&fail){fail=false;throw new Error('interrupted');}rows.set(o+k,v);}};
  const service=new ElevenLabsVoiceTools(store,async()=> 'account',async()=>{calls++;return Response.json({voice_id:'new_voice'});});
  await assert.rejects(service.run('alice','key',{action:'pvc-create',operationId:'recovery',ownVoice:true,name:'Arabic',language:'ar'},async()=>{},async()=>[]));
  assert.equal((await service.status('alice','key','recovery')).voiceId,'new_voice');
  assert.equal(calls,1);assert.ok([...rows.keys()].some(k=>k.includes('remix-voice:')));
});
