import type { NativeCallCallbacks } from './nativeVoiceCall';
import { CallTranscript } from './callTranscript';
export class HumeAudioQueue {
  private epoch=0;
  private pending=Promise.resolve();
  private sources=new Set<AudioBufferSourceNode>();
  private next=0;
  private decoding=0;
  get busy(){return this.decoding>0 || this.sources.size>0;}
  constructor(private context:AudioContext,private started:()=>void,private stopped:()=>void){}
  enqueue(data:string){
    const epoch=this.epoch;
    this.decoding++;
    this.pending=this.pending.then(async()=>{
      const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
      const buffer=await this.context.decodeAudioData(bytes.buffer);
      if(epoch!==this.epoch)return;
      const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.context.destination);
      this.sources.add(source);const at=Math.max(this.next,this.context.currentTime);this.next=at+buffer.duration;
      source.onended=()=>{source.disconnect();this.sources.delete(source);if(!this.busy && epoch===this.epoch)this.stopped();};
      source.start(at);this.started();
    }).finally(()=>{if(epoch===this.epoch)this.decoding--;});
    return this.pending;
  }
  clear(){this.epoch++;this.decoding=0;for(const source of this.sources){source.onended=null;try{source.stop();}catch{}source.disconnect();}this.sources.clear();this.next=0;this.pending=Promise.resolve();}
}
const PCM_WORKLET=`class Capture extends AudioWorkletProcessor {
 constructor(){super();this.frames=[];this.count=0;this.muted=false;this.port.onmessage=e=>this.muted=!!e.data.muted;}
 process(inputs){const channel=inputs[0]?.[0];if(!channel)return true;
  const copy=new Float32Array(channel.length);if(!this.muted)copy.set(channel);this.frames.push(copy);this.count+=copy.length;
  if(this.count>=sampleRate/10){const bytes=new ArrayBuffer(this.count*2),view=new DataView(bytes);let i=0;for(const frame of this.frames)for(const x of frame)view.setInt16((i++)*2,Math.round(Math.max(-1,Math.min(1,x))*(x<0?32768:32767)),true);this.port.postMessage(bytes,[bytes]);this.frames=[];this.count=0;}return true;
 }} registerProcessor('hume-pcm-capture',Capture);`;
export class HumeNativeCall {
 private sessionId=crypto.randomUUID();
 private closed=false;private controller=new AbortController();private socket:WebSocket|null=null;
 private context:AudioContext|null=null;private stream:MediaStream|null=null;private capture:AudioWorkletNode|null=null;private queue:HumeAudioQueue|null=null;
 private timeout:ReturnType<typeof setTimeout>|undefined;private calls=new Set<string>();private audioIds=new Set<string>();private blocked=new Set<string>();
 private manualPause=false;
 private allowAudio=true;private speechEnded:number|undefined;private measured=false;private userIndex=0;
 private transcript:CallTranscript;private assistantIds=new Set<string>();private assistantEnded=false;private playing=false;
 private waiting=false;private pendingTyped?:{key:string;text:string};
 private userAliases=new Map<string,string>();private seenUsers=new Set<string>();private inputKind:'text'|'transcript'='transcript';
 constructor(private callbacks:NativeCallCallbacks){this.transcript=new CallTranscript(m=>callbacks.message(m),m=>callbacks.preview?.(m),this.sessionId);}
 private send(e:object){if(!this.closed&&this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(e));}
 async start(authenticate:(signal:AbortSignal)=>Promise<any>){
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   if(this.closed){stream.getTracks().forEach(t=>t.stop());return;}this.stream=stream;
   this.timeout=setTimeout(()=>this.fail('Hume connection timed out. Reconnect to retry.'),40000);
   const context=this.context=new AudioContext();await context.resume();
   const data=await authenticate(this.controller.signal);if(this.closed)return;
   const params=new URLSearchParams({access_token:data.token,config_id:data.configId,config_version:String(data.configVersion),verbose_transcription:'true'});
   // The validated config fixes the voice and disables greetings. Send per-call
   // settings in the first WebSocket frame, not a JSON query parameter.

   const socket=this.socket=new WebSocket(`wss://api.hume.ai/v0/evi/chat?${params}`);
   this.queue=new HumeAudioQueue(context,()=>{if(this.closed)return;this.playing=true;this.callbacks.state('speaking');if(!this.measured&&this.speechEnded!==undefined){this.measured=true;this.callbacks.metric({event:`${this.inputKind}_to_audio_scheduled`,source:'client-control',at:performance.now(),ms:performance.now()-this.speechEnded});}},()=>{this.playing=false;if(!this.closed && this.assistantEnded){this.waiting=false;this.transcript.finish();this.assistantIds.clear();this.callbacks.state('listening');}});
   socket.onopen=()=>{void (async()=>{
    if(this.closed)return;
    this.send({...data.settings,audio:{encoding:'linear16',sample_rate:context.sampleRate,channels:1}});
    const url=URL.createObjectURL(new Blob([PCM_WORKLET],{type:'application/javascript'}));
    try{await context.audioWorklet.addModule(url);}finally{URL.revokeObjectURL(url);}
    if(this.closed)return;
    const capture=this.capture=new AudioWorkletNode(context,'hume-pcm-capture');
    capture.port.onmessage=e=>{if(this.closed)return;if(socket.bufferedAmount>256000){this.fail('Audio upload cannot keep up with the connection. Reconnect on a faster network.');return;}const bytes=new Uint8Array(e.data);let binary='';for(const x of bytes)binary+=String.fromCharCode(x);this.send({type:'audio_input',data:btoa(binary)});};
    context.createMediaStreamSource(stream).connect(capture);const silence=context.createGain();silence.gain.value=0;capture.connect(silence);silence.connect(context.destination);
    clearTimeout(this.timeout);this.callbacks.state('listening');this.callbacks.metric({event:'connected',source:'client-control',at:performance.now()});
   })().catch(()=>this.fail('Could not start Hume microphone streaming.'));};
   socket.onmessage=e=>{if(!this.closed){try{void this.receive(JSON.parse(e.data)).catch(()=>this.fail('Hume audio processing failed.'));}catch{this.fail('Invalid Hume message.');}}};
   socket.onerror=()=>this.fail('Hume connection failed. Check server credentials, config access and network.');
   socket.onclose=()=>{if(!this.closed)this.fail('Hume call disconnected. Your text conversation remains; reconnect to continue.');};
  }catch(e){if(!this.closed)this.fail(e instanceof Error?e.message:'Hume call unavailable.');}
 }
 async receive(e:any){
  if(this.closed)return;
  if(e.type==='error'){this.fail(`Hume session error${e.code?` (${e.code})`:''}. ${e.code==='E0716' && typeof e.message==='string' ? e.message.slice(0,500).replace(/(?:sk-|Bearer )[A-Za-z0-9_\-]+/g,'[redacted]') : 'Check configuration and account access.'}`);return;}
  if(e.type==='user_interruption' || (e.type==='user_message'&&e.interim)){this.interrupt(false);return;}
  if(e.type==='user_message'){
   const providerKey=String(e.id ?? e.time?.begin ?? ++this.userIndex);
   if(this.pendingTyped && this.pendingTyped.text===e.message.content)this.userAliases.set(providerKey,this.pendingTyped.key);
   const key=this.userAliases.get(providerKey)||providerKey;
   if(this.seenUsers.has(key)){this.transcript.receive(key,'user',e.message.content);if(this.pendingTyped?.key===key)this.pendingTyped=undefined;return;}
   this.seenUsers.add(key);this.inputKind='transcript';
   this.speechEnded=performance.now();this.measured=false;this.allowAudio=true;if(this.manualPause){this.send({type:'resume_assistant_message'});this.manualPause=false;}
   this.callbacks.metric({event:'user_transcript_final',source:'provider-event',at:this.speechEnded});
   this.transcript.receive(key,'user',e.message.content);this.pendingTyped=undefined;this.waiting=true;this.callbacks.state('thinking');
  }
  if(e.type==='assistant_message'&&this.allowAudio&&!this.blocked.has(e.id)){
   this.assistantEnded=false;this.pendingTyped=undefined;const id=e.id || crypto.randomUUID();this.assistantIds.add(id);this.transcript.receive(id,'model',e.message.content);
  }
  if(e.type==='assistant_end'){this.assistantEnded=true;if(!this.queue?.busy){this.waiting=false;this.transcript.finish();this.assistantIds.clear();this.callbacks.state('listening');}}
  if(e.type==='audio_output'){
   if(!this.allowAudio||this.blocked.has(e.id))return;
   this.audioIds.add(e.id);await this.queue?.enqueue(e.data);
  }
  if(e.type==='tool_call'&&!this.calls.has(e.tool_call_id)){
   this.calls.add(e.tool_call_id);
   try{const result=await this.callbacks.tool(e.name,e.parameters,this.controller.signal);if(!this.closed)this.send({type:'tool_response',tool_call_id:e.tool_call_id,content:JSON.stringify(result)});}
   catch{if(!this.closed)this.send({type:'tool_error',tool_call_id:e.tool_call_id,error:'Studio request failed.'});}
  }
 }
 interrupt(manual=true){if(this.closed)return;if(manual){this.send({type:'pause_assistant_message'});this.manualPause=true;}const at=performance.now();this.allowAudio=false;this.waiting=false;for(const id of [...this.audioIds,...this.assistantIds])this.blocked.add(id);this.transcript.interrupt();this.audioIds.clear();this.assistantIds.clear();this.queue?.clear();this.playing=false;this.callbacks.state('listening');this.callbacks.metric({event:'playback_queue_cleared',source:'client-control',at,ms:performance.now()-at});}
 mute(muted:boolean){this.capture?.port.postMessage({muted});this.stream?.getAudioTracks().forEach(t=>{t.enabled=!muted;});}
 sendText(value:string):boolean {
  const text=value.trim();if(this.closed||this.socket?.readyState!==WebSocket.OPEN||this.waiting||this.queue?.busy||this.assistantIds.size||!text||text.length>4000)return false;
  const key=`typed-${++this.userIndex}`;this.pendingTyped={key,text};this.seenUsers.add(key);this.inputKind='text';this.speechEnded=performance.now();this.measured=false;this.allowAudio=true;this.waiting=true;
  this.send({type:'user_input',text});if(this.manualPause){this.send({type:'resume_assistant_message'});this.manualPause=false;}
  this.transcript.receive(key,'user',text);this.callbacks.state('thinking');this.callbacks.metric({event:'text_sent',source:'client-control',at:performance.now()});return true;
 }
 private fail(message:string){if(this.closed)return;this.callbacks.error(message);this.end();}
 end(){if(this.closed)return;this.transcript.interrupt();this.closed=true;this.controller.abort();clearTimeout(this.timeout);this.queue?.clear();this.capture?.disconnect();this.stream?.getTracks().forEach(t=>t.stop());this.socket?.close();void this.context?.close();this.callbacks.state('idle');}
}
