import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHumeConfig,humeSettings,humeToken,validateHumeCallPreferences } from './humeNativeVoice';
import { HumeAudioQueue,HumeNativeCall } from '../src/utils/humeNativeCall';
const config={id:'config',version:0,evi_version:'3',voice:{id:'hume-library',provider:'HUME_AI',name:'Fixture'},language_model:{model_provider:'OPEN_AI',model_resource:'gpt-5-mini'},event_messages:{on_new_chat:{enabled:false}}};
test('typed Hume input resumes a paused session and its echoed transcript commits only once',async()=>{
 const sent:any[]=[],messages:any[]=[];
 const call=new HumeNativeCall({state:()=>{},message:m=>messages.push(m),metric:()=>{},error:()=>{},tool:async()=>({})});
 (call as any).socket={readyState:1,send:(text:string)=>sent.push(JSON.parse(text)),close(){}};
 call.interrupt();assert.equal(call.sendText('نكمل بكرا'),true);assert.equal(call.sendText('second'),false);
 assert.deepEqual(sent.map(e=>e.type),['pause_assistant_message','user_input','resume_assistant_message']);
 assert.equal(sent[1].text,'نكمل بكرا');
  await call.receive({type:'user_message',id:'server-echo',time:{begin:0},message:{content:'نكمل بكرا'}});
  await call.receive({type:'user_message',id:'server-echo',time:{begin:0},message:{content:'نكمل بكرا'}});
 assert.equal(messages.length,1);
 await call.receive({type:'assistant_end'});assert.equal(call.sendText('another turn'),true);
 await call.receive({type:'user_message',id:'server-echo',time:{begin:0},message:{content:'نكمل بكرا'}});
 await call.receive({type:'user_message',id:'next-echo',time:{begin:1},message:{content:'another turn'}});
 assert.equal(messages.length,2);call.end();
});
test('Hume rejects Arabic on EVI 3, including Arabic switching from English',()=>{
 assert.throws(()=>validateHumeCallPreferences('3',{mode:'arabic'}),/4-mini/);
 assert.throws(()=>validateHumeCallPreferences('3',{mode:'english',allowLanguageSwitching:true}),/4-mini/);
 assert.doesNotThrow(()=>validateHumeCallPreferences('3',{mode:'english',allowLanguageSwitching:false}));
 assert.doesNotThrow(()=>validateHumeCallPreferences('4-mini',{mode:'arabic'}));
});
test('Hume marks interrupted messages and rejects late audio with the interrupted message ID',async()=>{
 const messages:any[]=[];
 const call=new HumeNativeCall({state:()=>{},message:m=>messages.push(m),metric:()=>{},error:()=>{},tool:async()=>({})});
 await call.receive({type:'assistant_message',id:'r',message:{content:'We can visit tomorrow.'}});
 call.interrupt();
 await call.receive({type:'user_message',time:{begin:12},message:{content:'Actually, today.'}});
 await call.receive({type:'assistant_message',id:'r',message:{content:'We can visit tomorrow.'}});
 assert.equal(messages.filter(m=>m.role==='model').length,2);
 assert.match(messages.filter(m=>m.role==='model').at(-1).content,/interrupted/);
 call.end();
});
test('Hume validates explicit version, library voice, greeting and tool-capable model',()=>{
 assert.equal(validateHumeConfig(config).voice,'hume-library');
 for(const change of [{evi_version:'2'},{language_model:null},{voice:{id:'el-clone',provider:'CUSTOM_VOICE'}},{event_messages:{}}])assert.throws(()=>validateHumeConfig({...config,...change}));
 const settings=humeSettings('Fixture persona',[{role:'user',content:'hello'}],'hume-library',{name:'ask_studio',description:'plan',parameters:{type:'object'}});
 assert.equal(settings.voice_id,'hume-library');assert.equal(typeof settings.tools[0].parameters,'string');assert.match(settings.context.text,/hello/);
});
test('Hume OAuth uses server Basic credentials and returns only temporary token',async()=>{
 const data=await humeToken((async(url:any,init:any)=>{assert.match(url,/oauth2-cc\/token$/);assert.match(init.headers.Authorization,/^Basic /);assert.equal(init.body,'grant_type=client_credentials');return Response.json({access_token:'temporary',expires_in:1800});}) as typeof fetch);
 assert.equal(data.token,'temporary');assert.deepEqual(Object.keys(data).sort(),['expiresAt','token']);
});
test('Hume interrupted decoding and queued sources never play stale audio',async()=>{
 let resolve:any,starts=0,stops=0;
 const context={currentTime:0,destination:{},decodeAudioData:()=>new Promise(r=>resolve=r),createBufferSource:()=>({connect(){},disconnect(){},start(){starts++;},stop(){stops++;},onended:null})} as any;
 const queue=new HumeAudioQueue(context,()=>{},()=>{});
 const pending=queue.enqueue('AA==');await Promise.resolve();queue.clear();resolve({duration:1});await pending;assert.equal(starts,0);
 const next=queue.enqueue('AA==');await Promise.resolve();resolve({duration:1});await next;assert.equal(starts,1);queue.clear();assert.equal(stops,1);
});
test('Hume queue remains busy while decoding so an early assistant_end cannot finalize unheard text',async()=>{
 let resolve:any;
 const queue=new HumeAudioQueue({currentTime:0,destination:{},decodeAudioData:()=>new Promise(r=>resolve=r),createBufferSource:()=>({connect(){},disconnect(){},start(){},stop(){},onended:null})} as any,()=>{},()=>{});
 const pending=queue.enqueue('AA==');await Promise.resolve();
 assert.equal(queue.busy,true);queue.clear();assert.equal(queue.busy,false);resolve({duration:1});await pending;
});
test('Hume interim transcripts do not pollute history, tool duplicate suppressed, ended events ignored',async()=>{
 const messages:any[]=[],states:string[]=[];let tools=0;
 const call=new HumeNativeCall({state:s=>states.push(s),message:m=>messages.push(m),metric:()=>{},error:()=>{},tool:async()=>{tools++;return {text:'plan'};}});
 await call.receive({type:'user_message',interim:true,message:{content:'part'}});assert.equal(messages.length,0);
 await call.receive({type:'user_message',interim:false,time:{begin:10},message:{content:'complete'}});assert.equal(messages.length,1);
 const e={type:'tool_call',tool_call_id:'t',name:'ask_studio',parameters:'{}'};await call.receive(e);await call.receive(e);assert.equal(tools,1);
 call.end();await call.receive({type:'user_message',message:{content:'late'}});assert.equal(messages.length,1);assert.equal(states.at(-1),'idle');
});

test('Hume tool schema omits unsupported OpenAI keywords without mutating shared tools',()=>{
 const tool={name:'ask_studio',description:'plan',parameters:{type:'object',properties:{request:{type:'string'}},required:['request'],additionalProperties:false}};
 const result=humeSettings('Fixture',[],'hume-library',tool);
 assert.deepEqual(JSON.parse(result.tools[0].parameters),{type:'object',properties:{request:{type:'string'}},required:['request']});
 assert.equal(tool.parameters.additionalProperties,false);
});
