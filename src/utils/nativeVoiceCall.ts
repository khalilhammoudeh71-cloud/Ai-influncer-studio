import type { NativeMessage } from '../../shared/nativeVoice';
import { CallTranscript } from './callTranscript';
export type VoiceMetric = { event: string; at: number; ms?: number; source: 'provider-event'|'browser-render'|'client-control' };
export interface NativeCallCallbacks {
  state(value: string): void;
  message(value: NativeMessage): void;
  preview?(value: NativeMessage): void;
  metric(value: VoiceMetric): void;
  tool(name: string, args: string, signal: AbortSignal): Promise<unknown>;
  error(message: string): void;
}
export class OpenAINativeCall {
  private closed=false;
  private pc: RTCPeerConnection | null=null;
  private channel: RTCDataChannel | null=null;
  private stream: MediaStream | null=null;
  private audio: HTMLAudioElement | null=null;
  private context: AudioContext | null=null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private meter=0;
  private connectTimeout: ReturnType<typeof setTimeout> | undefined;
  private controller=new AbortController();
  private blocked=new Set<string>();
  private response='';
  private responding=false;
  private speechEnded: number | undefined;
  private measured=false;
  private userSpeaking=false;
  private calls=new Set<string>();
  private texts=new Map<string,string>();
  private transcript: CallTranscript;
  private playingResponse='';
  private waiting=false;
  private inputKind: 'speech' | 'text' = 'speech';
  private responseItems=new Map<string,Set<string>>();
  constructor(private callbacks: NativeCallCallbacks) {this.transcript=new CallTranscript(m=>callbacks.message(m),m=>callbacks.preview?.(m));}
  private send(event: object) { if(!this.closed && this.channel?.readyState==='open') this.channel.send(JSON.stringify(event)); }
  private metric(event:string,source:VoiceMetric['source'],ms?:number) {this.callbacks.metric({event,source,at:performance.now(),ms});}
  async start(authenticate: (signal:AbortSignal)=>Promise<any>) {
    try {
      // Permission is requested only from the user's Start action, before minting credentials.
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      if(this.closed){stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;
      this.connectTimeout=setTimeout(()=>this.fail('OpenAI connection timed out. Reconnect to retry.'),25000);
      this.context=new AudioContext(); await this.context.resume();
      const data=await authenticate(this.controller.signal);
      if(this.closed)return;
      const pc=this.pc=new RTCPeerConnection();
      const audio=this.audio=new Audio(); audio.autoplay=true;
      const analyser=this.context.createAnalyser();analyser.fftSize=512;
      const gain=this.context.createGain();gain.gain.value=0;analyser.connect(gain);gain.connect(this.context.destination);
      pc.ontrack=e=>{
        if(this.closed)return;
        const remote=e.streams[0] || new MediaStream([e.track]);audio.srcObject=remote;
        this.context!.createMediaStreamSource(remote).connect(analyser);
        void audio.play().catch(()=>this.fail('Browser blocked call playback. End the call and start again.'));
      };
      const samples=new Float32Array(analyser.fftSize);
      const sample=()=>{
        if(this.closed)return;
        analyser.getFloatTimeDomainData(samples);
        const rms=Math.sqrt(samples.reduce((a,x)=>a+x*x,0)/samples.length);
        if(!audio.muted && !audio.paused && rms>0.008 && !this.measured && this.speechEnded!==undefined){
          this.measured=true;this.metric(this.inputKind==='text'?'text_to_output_audio_detected':'response_audio_detected','browser-render',performance.now()-this.speechEnded);
        }
        this.meter=requestAnimationFrame(sample);
      };sample();
      stream.getTracks().forEach(t=>pc.addTrack(t,stream));
      const dc=this.channel=pc.createDataChannel('oai-events');
      dc.onmessage=e=>{if(!this.closed){try{void this.receive(JSON.parse(e.data));}catch{this.fail('Invalid realtime event.');}}};
      dc.onopen=()=>{
        if(this.closed)return;
        for(const m of data.history || []) this.send({type:'conversation.item.create',item:{type:'message',role:m.role,content:[{type:m.role==='user'?'input_text':'text',text:m.content}]}});
        clearTimeout(this.connectTimeout);this.callbacks.state('listening');this.metric('connected','client-control');
      };
      dc.onclose=()=>{if(!this.closed)this.fail('Call disconnected. Your text conversation is saved; reconnect to continue.');};
      pc.onconnectionstatechange=()=>{
        if(this.closed)return;
        if(pc.connectionState==='failed')this.fail('Voice connection failed. Reconnect to continue.');
        if(pc.connectionState==='disconnected')this.timer=setTimeout(()=>{if(pc.connectionState==='disconnected')this.fail('Voice connection lost. Reconnect to continue.');},4000);
        if(pc.connectionState==='connected')clearTimeout(this.timer);
      };
      const offer=await pc.createOffer();await pc.setLocalDescription(offer);
      const response=await fetch('https://api.openai.com/v1/realtime/calls',{method:'POST',headers:{Authorization:`Bearer ${data.token}`,'Content-Type':'application/sdp'},body:offer.sdp,signal:this.controller.signal});
      if(!response.ok)throw new Error(`OpenAI connection failed (HTTP ${response.status}).`);
      const sdp=await response.text();if(this.closed)return;
      await pc.setRemoteDescription({type:'answer',sdp});
    }catch(e){if(!this.closed)this.fail(e instanceof Error?e.message:'Microphone or connection unavailable.');}
  }
  async receive(e:any) {
    if(this.closed)return;
    if(e.type==='error'&&e.error?.code==='response_cancel_not_active')return;
    if(e.type==='error'){this.fail('OpenAI reported a session error. End and reconnect; check provider access if it repeats.');return;}
    if(e.type==='input_audio_buffer.speech_started'){this.userSpeaking=true;this.interrupt(false);this.callbacks.state('listening');}
    if(e.type==='input_audio_buffer.speech_stopped'){this.inputKind='speech';this.userSpeaking=false;this.waiting=true;this.speechEnded=performance.now();this.measured=false;this.metric('speech_end','provider-event');this.callbacks.state('thinking');}
    if(e.type==='response.created'){this.response=e.response.id;this.responding=true;if(this.userSpeaking)this.blocked.add(this.response);}
    if(e.type==='output_audio_buffer.started'){
      if(this.userSpeaking || this.blocked.has(e.response_id || this.response)){this.send({type:'output_audio_buffer.clear'});return;}
      this.playingResponse=e.response_id || this.response;
      if(this.audio)this.audio.muted=false;this.callbacks.state('speaking');
      this.metric(this.inputKind==='text'?'text_to_output_buffer_started':'output_buffer_started','provider-event',this.speechEnded===undefined?undefined:performance.now()-this.speechEnded);
    }
    if(e.type==='response.done' && e.response?.id===this.response)this.responding=false;
    if(e.type==='output_audio_buffer.stopped' && (e.response_id || this.playingResponse)===this.playingResponse){
      this.transcript.finish(this.responseItems.get(this.playingResponse) || []);this.responseItems.delete(this.playingResponse);
      this.playingResponse='';this.waiting=this.responding;this.callbacks.state(this.waiting?'thinking':'listening');
    }
    if(e.type==='conversation.item.input_audio_transcription.completed')this.transcript.receive(e.item_id,'user',e.transcript);
    if(['response.output_audio_transcript.delta','response.output_audio_transcript.done'].includes(e.type) && !this.blocked.has(e.response_id)){
      const items=this.responseItems.get(e.response_id) || new Set<string>();items.add(e.item_id);this.responseItems.set(e.response_id,items);
    }
    if(e.type==='response.output_audio_transcript.delta' && !this.blocked.has(e.response_id)){
      const content=(this.texts.get(e.item_id)||'')+e.delta;this.texts.set(e.item_id,content);this.transcript.receive(e.item_id,'model',content,false);
    }
    if(e.type==='response.output_audio_transcript.done' && !this.blocked.has(e.response_id))this.transcript.receive(e.item_id,'model',e.transcript);
    if(e.type==='response.function_call_arguments.done' && !this.calls.has(e.call_id)){
      this.calls.add(e.call_id);
      try {
        const result=await this.callbacks.tool(e.name,e.arguments,this.controller.signal);
        if(this.closed)return;
        this.send({type:'conversation.item.create',item:{type:'function_call_output',call_id:e.call_id,output:JSON.stringify(result)}});
        // A new user turn owns the floor after an interruption.
        if(!this.userSpeaking && !this.blocked.has(e.response_id))this.send({type:'response.create'});
      }catch{if(!this.closed){this.send({type:'conversation.item.create',item:{type:'function_call_output',call_id:e.call_id,output:'Studio request failed. Nothing was executed.'}});if(!this.userSpeaking && !this.blocked.has(e.response_id))this.send({type:'response.create'});}}
    }
  }
  interrupt(manual=true){
    if(this.closed)return;
    const at=performance.now();if(this.response)this.blocked.add(this.response);
    if(this.playingResponse)this.blocked.add(this.playingResponse);
    this.transcript.interrupt();this.playingResponse='';
    this.waiting=false;
    if(this.audio)this.audio.muted=true;
    if(manual&&this.responding){this.send({type:'response.cancel',response_id:this.response});this.responding=false;}
    // Semantic VAD already cancels the response on speech_start. Explicit buffer clear discards queued media.
    this.send({type:'output_audio_buffer.clear'});
    this.metric('playback_muted','client-control',performance.now()-at);
    this.callbacks.state('listening');
  }
  mute(value:boolean){this.stream?.getAudioTracks().forEach(t=>{t.enabled=!value;});}
  sendText(value:string):boolean {
    const text=value.trim();
    if(this.closed || this.channel?.readyState!=='open' || this.responding || this.playingResponse || this.userSpeaking || this.waiting || !text || text.length>4000)return false;
    const id=`typed_${crypto.randomUUID().replace(/-/g,'')}`;
    this.send({type:'conversation.item.create',item:{id,type:'message',role:'user',content:[{type:'input_text',text}]}});
    this.transcript.receive(id,'user',text);this.waiting=true;this.inputKind='text';this.speechEnded=performance.now();this.measured=false;
    this.send({type:'response.create'});this.callbacks.state('thinking');this.metric('text_sent','client-control');return true;
  }
  private fail(message:string){this.callbacks.error(message);this.end();}
  end(){
    if(this.closed)return;this.transcript.interrupt();this.closed=true;this.controller.abort();clearTimeout(this.timer);clearTimeout(this.connectTimeout);cancelAnimationFrame(this.meter);
    if(this.audio){this.audio.muted=true;this.audio.pause();this.audio.srcObject=null;}
    this.channel?.close();this.pc?.getReceivers().forEach(r=>r.track?.stop());this.pc?.close();
    this.stream?.getTracks().forEach(t=>t.stop());void this.context?.close();this.callbacks.state('idle');
  }
}
