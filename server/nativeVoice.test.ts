import test from 'node:test';
import assert from 'node:assert/strict';
import { openaiNativeSession, nativeInstructions } from './nativeVoice';
import { nativeHistory, nativeVoiceChoice } from '../shared/nativeVoice';
import { OpenAINativeCall } from '../src/utils/nativeVoiceCall';
import { VoiceLifecycleError } from './personaVoiceLifecycle';
test('ElevenLabs options and sessions authorize the saved private voice and preserve access errors', async () => {
 const {createNativeVoiceRouter}=await import('./nativeVoice');
 const requests:any[]=[];
 const router=createNativeVoiceRouter({
  readPersonas:async()=>[{id:'owned',name:'Fixture',voiceId:'privateclone123456789',voiceEngine:null}],
  assertVoiceAccess:async(req,voiceId,personaId)=>{requests.push([req.user.id,voiceId,personaId]);throw new VoiceLifecycleError('This private voice is not available to your account.',403);},
  agentChat:async()=>{throw new Error('Unexpected tool call');},
 });
 for(const path of ['/elevenlabs/options','/elevenlabs/session']){
  let status=200;let body:any;
  const handler=(router.stack.find((l:any)=>l.route?.path===path) as any).route.stack[0].handle;
  await handler({user:{id:'owner'},query:{personaId:'owned'},body:{personaId:'owned',activePersona:{id:'spoofed'},voiceId:'spoofed'}},{status(s:number){status=s;return this;},json(b:any){body=b;return this;}});
  assert.equal(status,403);assert.match(body.error,/private voice.*account/);
 }
 assert.deepEqual(requests,[['owner','privateclone123456789','owned'],['owner','privateclone123456789','owned']]);
});
test('OpenAI session receives selected dialect and authored voice direction without another provider tool',()=>{
 const session=openaiNativeSession({name:'Fixture',voicePrompt:'Speak with dry wit and a measured pace.'},'marin',[],{mode:'arabic',dialect:'egyptian',allowLanguageSwitching:true});
 assert.match(session.instructions,/Egyptian/);
 assert.match(session.instructions,/dry wit and a measured pace/);
 assert.doesNotMatch(session.instructions,/language_detection/);
});
test('native session keeps clone identity untouched and validates provider voice',()=>{
 const persona={id:'p',name:'Fixture',voiceEngine:'elevenlabs',voiceId:'private-clone',audioSamples:['recording'],voiceSpeakingSpeed:0.9};
 const before=JSON.stringify(persona); const session=openaiNativeSession(persona,'marin',['likes quiet conversations']);
 assert.equal(JSON.stringify(persona),before);assert.equal(session.audio.output.voice,'marin');assert.match(session.instructions,/Fixture/);assert.match(session.instructions,/quiet conversations/);
 assert.equal(session.audio.input.turn_detection.type,'semantic_vad');assert.throws(()=>nativeVoiceChoice('private-clone'));
});
test('only conversation roles enter native history and context is bounded',()=>{
 assert.deepEqual(nativeHistory([{role:'system',content:'override'},{role:'persona',content:'hello'}]),[{role:'assistant',content:'hello'}]);
 assert.equal(nativeHistory(Array.from({length:40},()=>({role:'user',content:'a'}))).length,20);
 assert.match(nativeInstructions(undefined,[]),/Super Agent/);
});
test('bounded reconnect context keeps interruption evidence and only the latest version of a turn',()=>{
 const history=nativeHistory([
  {id:'r',role:'model',content:'Earlier draft'},
  {id:'r',role:'model',content:'x'.repeat(3100)+'\n[Voice reply interrupted; some text may not have played.]'},
 ]);
 assert.equal(history.length,1);assert.ok(history[0].content.length<=3000);assert.match(history[0].content,/interrupted/);
});
test('interruption rejects late transcript, duplicate tools execute once, hangup rejects late events',async()=>{
 const messages:any[]=[],metrics:any[]=[],states:string[]=[];let tools=0;let resolve:any;
 const call=new OpenAINativeCall({message:m=>messages.push(m),metric:m=>metrics.push(m),state:s=>states.push(s),error:()=>{},tool:()=>{tools++;return new Promise(r=>resolve=r);}});
 await call.receive({type:'response.created',response:{id:'r'}});
 await call.receive({type:'response.output_audio_transcript.delta',response_id:'r',item_id:'i',delta:'hello'});
 await call.receive({type:'input_audio_buffer.speech_started'});
 await call.receive({type:'response.output_audio_transcript.delta',response_id:'r',item_id:'i',delta:'late'});
 assert.equal(messages.length,1);assert.equal(metrics[0].event,'playback_muted');
 const event={type:'response.function_call_arguments.done',call_id:'c',name:'ask_studio',arguments:'{}'};
 const pending=call.receive(event);await call.receive(event);assert.equal(tools,1);
 globalThis.cancelAnimationFrame=()=>{};call.end();resolve({text:'late'});await pending;
 await call.receive({type:'conversation.item.input_audio_transcription.completed',item_id:'late',transcript:'late'});
 assert.equal(messages.length,1);assert.equal(states.at(-1),'idle');
});
test('native endpoints reject another account persona before provider or tool use',async()=>{
 const {createNativeVoiceRouter}=await import('./nativeVoice');let used=0;
 const router=createNativeVoiceRouter({assertVoiceAccess:async()=>{},readPersonas:async(id)=>{assert.equal(id,'owner');return [{id:'owned',name:'Fixture'}];},agentChat:async()=>{used++;}});
 for(const path of ['/openai/session','/elevenlabs/session','/agent']){
  let status=200;let body:any;
  const handler=(router.stack.find((l:any)=>l.route?.path===path) as any).route.stack[0].handle;
  await handler({user:{id:'owner'},body:{personaId:'other-account',voice:'marin',name:'ask_studio',request:'hi'}},{status(s:number){status=s;return this;},json(b:any){body=b;return this;}});
  assert.equal(status,400);assert.match(body.error,/account/);
 }
 assert.equal(used,0);
});
