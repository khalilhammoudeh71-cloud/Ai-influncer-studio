import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReferenceSpeechInput, renderReferenceSpeech } from './referenceSpeech';

test('each restored Wiro model receives the selected reference and model-specific inputs',()=>{
 for(const id of ['openmoss/moss-tts-v1-5','k2-fsa/omnivoice','resemble-ai/chatterbox-multilingual','openbmb/voxcpm2','fishaudio/s2-pro']){
  const request=buildReferenceSpeechInput('wiro-voice:'+id,'أهلين',{reference:'https://example.com/voice.wav',referenceText:'مرحبا',speed:.9});
  assert.equal(request.model,id);assert.equal(request.input.inputAudio,'https://example.com/voice.wav');
  assert.match(String(request.input.prompt),/أهلين/);
  if(id.includes('chatterbox'))assert.equal(request.input.language,'ar');
  if(id==='k2-fsa/omnivoice')assert.equal(request.input.referenceText,'مرحبا');
 }
});
test('Qwen preset requests use the published voice property',()=>{
 const request=buildReferenceSpeechInput('qwen-tts','Hello',{voiceId:'Ryan'});
 assert.deepEqual(request.input,{text:'Hello',voice:'Ryan',language:'auto'});
});
test('missing Fish transcript fails before sending any provider request',async()=>{
 let requests=0;
 await assert.rejects(()=>renderReferenceSpeech('wiro-voice:fishaudio/s2-pro','Hello',{reference:'https://example.com/voice.wav'},{env:{WIRO_API_KEY:'fixture'},fetchImpl:async()=>{requests++;return Response.json({});}}),/transcript/i);
 assert.equal(requests,0);
});
test('F5 is sent to Fal and legacy aliases never select an ElevenLabs speaker',()=>{
 const request=buildReferenceSpeechInput('elevenlabs:f5-tts','Hello',{reference:'https://example.com/a.wav'});
 assert.equal(request.provider,'Fal');assert.equal(request.model,'fal-ai/f5-tts');
 assert.equal(request.input.ref_audio_url,'https://example.com/a.wav');
 assert.equal(request.input.model_type,'F5-TTS');
 assert.throws(()=>buildReferenceSpeechInput('elevenlabs:playht','Hello',{}),/PlayHT/);
});
test('Wiro waits for successful completion and never accepts early output or failed tasks',async()=>{
 const requests:any[]=[];let polls=0;
 const fetchImpl:typeof fetch=async(url,init)=>{
  requests.push({url:String(url),init});
  if(String(url).includes('/Run/'))return Response.json({result:true,taskid:'task-fixture'});
  polls++;
  return Response.json({result:true,tasklist:[polls===1?{status:'task_processing',outputs:[{url:'https://example.com/early.wav'}]}:{status:'task_postprocess_end',pexit:0,outputs:[{url:'https://example.com/done.wav'}]}]});
 };
 const result=await renderReferenceSpeech('wiro-voice:openbmb/voxcpm2','Hello',{reference:'https://example.com/input.wav'},{env:{WIRO_API_KEY:'key',WIRO_API_SECRET:'secret'},fetchImpl,pollMs:0});
 assert.equal(result,'https://example.com/done.wav');assert.equal(polls,2);
 assert.match(requests[0].url,/\/Run\/openbmb\/voxcpm2$/);
 assert.equal(requests[0].init.body.get('inputAudio'),'https://example.com/input.wav');
 assert.equal(requests[0].init.headers['Content-Type'],undefined);
});
test('WaveSpeed uploads data audio then uses only the chosen model and canonical polling URL',async()=>{
 const urls:string[]=[];let payload:any;
 const fetchImpl:typeof fetch=async(url,init)=>{
  urls.push(String(url));
  if(String(url).includes('/files/upload'))return Response.json({data:{download_url:'https://cdn.wavespeed.ai/ref.wav'}});
  if(String(url).includes('/voice-clone')){payload=JSON.parse(String(init?.body));return Response.json({code:200,data:{id:'prediction',urls:{get:'https://untrusted.invalid/leak'}}});}
  return Response.json({code:200,data:{status:'completed',outputs:['https://cdn.wavespeed.ai/out.wav']}});
 };
 const result=await renderReferenceSpeech('wavespeed:qwen3-clone','Hello',{reference:'data:audio/wav;base64,'+Buffer.alloc(120).toString('base64'),referenceText:'Source words'},{env:{WAVESPEED_API_KEY:'key'},fetchImpl,pollMs:0});
 assert.equal(result,'https://cdn.wavespeed.ai/out.wav');
 assert.equal(payload.audio,'https://cdn.wavespeed.ai/ref.wav');assert.equal(payload.reference_text,'Source words');
 assert.deepEqual(urls,['https://api.wavespeed.ai/api/v3/files/upload','https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen3-tts/voice-clone','https://api.wavespeed.ai/api/v3/predictions/prediction/result']);
});
test('a terminal provider failure is surfaced without retry or fallback',async()=>{
 let calls=0;
 await assert.rejects(()=>renderReferenceSpeech('wavespeed:omnivoice','Hello',{reference:'https://example.com/a.wav'},{env:{WAVESPEED_API_KEY:'key'},pollMs:0,fetchImpl:async()=>{calls++;return Response.json({code:200,data:{status:'failed',error:'Reference too short'}});}}),/Reference too short/);
 assert.equal(calls,1);
});
