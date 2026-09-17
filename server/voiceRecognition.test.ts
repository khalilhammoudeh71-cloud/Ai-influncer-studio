import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { transcriptionPrompt, createVoiceRecognitionRouter } from './voiceRecognition';
import { VoiceAudioBuffer, wavDataUrl } from '../src/utils/voiceAudioCapture';
async function fixture(run:(base:string,requests:any[])=>Promise<void>) {
 const previous=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test';
 const requests:any[]=[];const app=express();app.use(express.json({limit:'4mb'}));app.use((req:any,_res,next)=>{req.user={id:'owner'};next();});
 app.use(createVoiceRecognitionRouter(async(owner)=>{assert.equal(owner,'owner');return [{id:'owned',personalitySettings:{language:'ar',dialect:'jordanian-syrian'}}];},{fetch:async(_url,options)=>{requests.push(options);return new Response(JSON.stringify({text:'بدي قهوة',logprobs:[{logprob:-.1}]}),{headers:{'Content-Type':'application/json'}});},readRules:async(owner,id)=>{assert.equal(owner,'owner');if(id!=='owned')throw new Error('Unavailable');return [];}}));
 const server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve));
 try{await run(`http://127.0.0.1:${(server.address() as any).port}`,requests);}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous;}
}
test('verification sends real audio, permits language switches, and never forwards an unowned persona',async()=>fixture(async(base,requests)=>{
 const ring=new VoiceAudioBuffer(16000);ring.push(new Float32Array(4000).fill(.1),1000);const audio=wavDataUrl(ring.wavSince(750,1000)!);
 const post=(data:any)=>fetch(base+'/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 assert.equal((await post({personaId:'other',audio})).status,404);assert.equal(requests.length,0);
 assert.equal((await post({personaId:'owned',audio:'data:audio/wav;base64,AAAA'})).status,400);
 const response=await post({personaId:'owned',audio,draft:'بدي قهوة',preferences:{mode:'fr'}});
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).needsConfirmation,false);
 const form=requests[0].body as FormData;assert.equal(form.get('model'),'gpt-4o-transcribe');assert.ok(form.get('file') instanceof Blob);assert.equal(form.get('include[]'),'logprobs');assert.doesNotMatch(String(form.get('prompt')),/speaker uses Jordanian/);
 assert.equal((await fetch(base+'/pronunciations/other')).status,404);
}));

test('audio verification cannot be biased by previous persona dialogue',()=>{const prompt=transcriptionPrompt({personalitySettings:{language:'ar',dialect:'jordanian-syrian'}},[{role:'persona',content:'UNRELATED_OLD_REPLY'},{role:'user',content:'OLD_REQUEST'}]);assert.doesNotMatch(prompt,/UNRELATED_OLD_REPLY|OLD_REQUEST/);assert.match(prompt,/verbatim/);});
