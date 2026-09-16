import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { getAuthHeaders } from '../services/apiService';
import { VoiceAudioBuffer, wavDataUrl } from '../utils/voiceAudioCapture';

/** Short, editable dictation. Never saves a pronunciation or sends a chat turn. */
export function PronunciationMicrophone({ personaId, disabled, onText, onBusy }: {
  personaId: string; disabled?: boolean; onText(text: string): void; onBusy(busy:boolean):void;
}) {
  const [phase, setPhase] = useState<'idle'|'starting'|'recording'|'transcribing'>('idle');
  const [message, setMessage] = useState('');
  const current = useRef<AbortController|null>(null);
  const capture = useRef<{stream?: MediaStream; context: AudioContext; node?: AudioWorkletNode; source?: MediaStreamAudioSourceNode; buffer: VoiceAudioBuffer; timer?: ReturnType<typeof setTimeout>}|null>(null);
  const receive = useRef(onText); receive.current = onText;
  useEffect(()=>{onBusy(phase!=='idle');return()=>onBusy(false);},[phase,onBusy]);
  function release() {
    const value = capture.current; capture.current = null;
    if (!value) return;
    clearTimeout(value.timer);
    value.stream?.getTracks().forEach(track=>track.stop());
    value.node?.port.close(); value.node?.disconnect(); value.source?.disconnect();
    value.buffer.clear(); void value.context.close().catch(()=>{});
  }
  useEffect(()=>()=>{current.current?.abort();current.current=null;release();},[personaId]);
  async function finish(controller: AbortController) {
    if (current.current!==controller || controller.signal.aborted || !capture.current) return;
    const wav = capture.current?.buffer.wavSince(0);
    release(); setPhase('transcribing');
    try {
      if (!wav) throw new Error('No speech captured. Tap the microphone and try again.');
      const response = await fetch('/api/voice-recognition/verify', {
        method:'POST', headers:{'Content-Type':'application/json',...await getAuthHeaders()},
        signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]),
        body:JSON.stringify({personaId,audio:wavDataUrl(wav),context:[],draft:'',preferences:{mode:'arabic',dialect:'levantine',allowLanguageSwitching:true}}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error||'Could not transcribe. Please try again.');
      if (current.current!==controller || controller.signal.aborted) return;
      const text = typeof data.text==='string'?data.text.trim():'';
      if (!text) throw new Error('No words detected. Please try again.');
      receive.current(text.replace(/[.،,!?؟]+$/u,'').slice(0,160));
      setMessage('Word filled in. Check it before saving.');
    } catch (error) {
      if (!controller.signal.aborted && current.current===controller) setMessage(error instanceof Error?error.message:'Could not transcribe. Please try again.');
    } finally {
      if(current.current===controller){current.current=null;setPhase('idle');}
    }
  }
  async function start() {
    if (current.current) return;
    const controller = new AbortController(); current.current = controller;
    setMessage(''); setPhase('starting');
    try {
      // Create/resume inside the click gesture, including Safari's audio permission model.
      const context = new AudioContext();
      capture.current={context,buffer:new VoiceAudioBuffer(context.sampleRate)};
      await context.resume();
      if(controller.signal.aborted)return;
      const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1}});
      if(controller.signal.aborted){stream.getTracks().forEach(track=>track.stop());return;}
      const value = capture.current!; value.stream=stream;
      await context.audioWorklet.addModule('/voice-capture.worklet.js');
      if(controller.signal.aborted)return;
      value.node=new AudioWorkletNode(context,'voice-capture');
      value.node.port.onmessage=event=>{if(current.current===controller)value.buffer.push(new Float32Array(event.data));};
      value.source=context.createMediaStreamSource(stream);
      value.source.connect(value.node); value.node.connect(context.destination);
      setPhase('recording');setMessage('Speak the Arabic word or phrase, then tap Stop.');
      value.timer=setTimeout(()=>void finish(controller),15000);
    } catch(error) {
      if(current.current!==controller)return;
      release();current.current=null;setPhase('idle');
      setMessage(error instanceof DOMException&&error.name==='NotAllowedError'?'Allow microphone access to dictate the word.':'Could not open the microphone. Please try again.');
    }
  }
  return <>
    <button type="button" disabled={disabled||phase==='starting'||phase==='transcribing'} aria-label={phase==='recording'?'Stop word dictation':'Dictate word or phrase in Arabic'} aria-pressed={phase==='recording'} title="Dictate word or phrase in Arabic" onClick={()=>{if(phase==='recording'&&current.current)void finish(current.current);else void start();}} className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[#E7C477]/30 text-[#E7C477] hover:bg-[#E7C477]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7C477] disabled:opacity-40">
      {phase==='recording'?<Square size={16}/>:phase==='starting'||phase==='transcribing'?<Loader2 size={18} className="animate-spin"/>:<Mic size={18}/>}
    </button>
    <span role="status" className="col-span-2 text-xs text-zinc-400">{phase==='transcribing'?'Transcribing…':message}</span>
  </>;
}
