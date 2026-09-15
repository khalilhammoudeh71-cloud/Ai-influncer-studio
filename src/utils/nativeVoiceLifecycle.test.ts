import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenAINativeCall } from './nativeVoiceCall';
test('typed OpenAI input enters the same session once and waits for the reply',()=>{
 const sent:any[]=[],messages:any[]=[];
 const call=new OpenAINativeCall({state:()=>{},message:m=>messages.push(m),metric:()=>{},error:()=>{},tool:async()=>({})});
 (call as any).channel={readyState:'open',send:(text:string)=>sent.push(JSON.parse(text)),close(){}};
 assert.equal(call.sendText('  خلينا نكمل  '),true);
 assert.equal(call.sendText('second'),false);
 assert.equal(sent[0].type,'conversation.item.create');assert.equal(sent[0].item.content[0].text,'خلينا نكمل');
 assert.equal(sent[1].type,'response.create');assert.equal(messages.length,1);
 globalThis.cancelAnimationFrame=()=>{};call.end();assert.equal(call.sendText('late'),false);
});
test('OpenAI previews deltas, commits the final transcript once, and retains interruption on late finals',async()=>{
 const messages:any[]=[],preview:any[]=[];
 const call=new OpenAINativeCall({state:()=>{},message:m=>messages.push(m),preview:m=>preview.push(m),metric:()=>{},error:()=>{},tool:async()=>({})});
 await call.receive({type:'response.created',response:{id:'r'}});
 await call.receive({type:'response.output_audio_transcript.delta',response_id:'r',item_id:'i',delta:'أهلين'});
 assert.equal(messages.length,0);assert.equal(preview.at(-1).content,'أهلين');
 const done={type:'response.output_audio_transcript.done',response_id:'r',item_id:'i',transcript:'أهلين، كيفك؟'};
 await call.receive(done);await call.receive(done);assert.equal(messages.length,1);
 call.interrupt();await call.receive(done);
 assert.match(messages.at(-1).content,/interrupted/);assert.equal(new Set(messages.map(m=>m.id)).size,1);
 globalThis.cancelAnimationFrame=()=>{};call.end();
});
test('an older OpenAI playback completion does not finalize the next reply',async()=>{
 const messages:any[]=[];
 const call=new OpenAINativeCall({state:()=>{},message:m=>messages.push(m),metric:()=>{},error:()=>{},tool:async()=>({})});
 await call.receive({type:'response.created',response:{id:'first'}});
 await call.receive({type:'response.output_audio_transcript.done',response_id:'first',item_id:'i1',transcript:'First answer.'});
 await call.receive({type:'output_audio_buffer.started',response_id:'first'});
 await call.receive({type:'response.created',response:{id:'second'}});
 await call.receive({type:'response.output_audio_transcript.delta',response_id:'second',item_id:'i2',delta:'Next answer'});
 await call.receive({type:'output_audio_buffer.stopped',response_id:'first'});
 globalThis.cancelAnimationFrame=()=>{};call.end();
 assert.equal(messages.length,2);assert.match(messages[1].content,/Next answer.*\n.*interrupted/);
});
test('end during permission or authentication stops late tracks and never connects',async()=>{
 let resolve:any,stops=0,auth=0;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(r=>resolve=r)}}});
 globalThis.cancelAnimationFrame=()=>{};
 const call=new OpenAINativeCall({state:()=>{},message:()=>{},metric:()=>{},error:()=>{},tool:async()=>({})});
 const pending=call.start(async()=>{auth++;return {}});call.end();resolve({getTracks:()=>[{stop:()=>stops++}]});await pending;
 assert.equal(stops,1);assert.equal(auth,0);
});
test('microphone denial returns idle and does not mint provider credentials',async()=>{
 const states:string[]=[],errors:string[]=[];let auth=0;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>{throw new Error('Permission denied')}}}});
 const call=new OpenAINativeCall({state:s=>states.push(s),message:()=>{},metric:()=>{},error:s=>errors.push(s),tool:async()=>({})});
 await call.start(async()=>{auth++;return {}});assert.equal(auth,0);assert.equal(states.at(-1),'idle');assert.match(errors[0],/denied/);
});
