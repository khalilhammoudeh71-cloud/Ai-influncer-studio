import test from 'node:test';import assert from 'node:assert/strict';import{EventEmitter}from'node:events';
let router:any;
class Reply extends EventEmitter {
 statusCode=200;headers:Record<string,string>={};data:any;writableEnded=false;headersSent=false;chunks:Uint8Array[]=[];
 status(n:number){this.statusCode=n;return this;}setHeader(k:string,v:string){this.headers[k]=v;return this;}
 json(data:any){this.data=data;this.writableEnded=true;return this;}write(data:Uint8Array){this.headersSent=true;this.chunks.push(data);return true;}end(){this.writableEnded=true;}destroy(error?:Error){throw error||Error('stream destroyed');}
}
const call=async(path:string,body:any)=>{const res=new Reply();const route:any=router.stack.find((l:any)=>l.route?.path===path&&l.route.methods.post);await route.route.stack[0].handle({body,user:{id:'fixture',email:process.env.CREATOR_EMAIL||'khalilhammoudeh71@gmail.com'}},res,()=>{throw Error('Unexpected provider bypass');});return res;};
test('real preview and playback routes preserve voice/settings; stream is audio with identity',async()=>{
 const prior=globalThis.fetch;const requests:any[]=[];
 const priorKey=process.env.ELEVENLABS_API_KEY;process.env.ELEVENLABS_API_KEY='synthetic-test';
 globalThis.fetch=async(url:any,init:any)=>{
  if(String(url).includes('/text-to-speech/')){requests.push({url:String(url),body:JSON.parse(init.body)});return new Response(new Uint8Array(200),{headers:{'content-type':'audio/mpeg'}});}
  return Response.json({voice_id:'fixturevoice123456789',category:'premade',name:'Fixture'});
 };
 try{
  router=(await import('./routes')).default;
  const input={voiceId:'fixturevoice123456789',engine:'elevenlabs',text:'We can take our time.',emotion:'comforting',voiceSettings:{stability:.64,similarity_boost:.92,style:0,speed:.95}};
  const preview=await call('/persona-voice-preview',input);const playback=await call('/generate-speech',input);
  assert.equal(preview.statusCode,200);assert.equal(playback.statusCode,200);assert.equal(preview.data.voiceId,input.voiceId);assert.equal(playback.data.voiceId,input.voiceId);
  assert.deepEqual(requests[0].body.voice_settings,requests[1].body.voice_settings);assert.equal(requests[0].body.model_id,requests[1].body.model_id);
  const stream=await call('/generate-speech',{...input,stream:true});assert.equal(stream.headers['X-Voice-Id'],input.voiceId);assert.equal(stream.chunks.length,1);assert.equal(stream.data,undefined);assert.ok(requests.at(-1).url.endsWith('/stream'));
  const count=requests.length;const unsupported=await call('/agent/test-voice-clone',{model:'wiro-voice:fishaudio/s2-pro',sampleBase64:'fixture',text:'Hello.'});assert.equal(unsupported.statusCode,422);assert.equal(requests.length,count);
 }finally{globalThis.fetch=prior;if(priorKey===undefined)delete process.env.ELEVENLABS_API_KEY;else process.env.ELEVENLABS_API_KEY=priorKey;}
});
