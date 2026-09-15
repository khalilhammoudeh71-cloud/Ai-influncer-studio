import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Conversation, type Conversation as ConversationSession } from '@elevenlabs/client';
import { supabase } from '../lib/supabase';
import { SpeechEngineTranscript, type PilotChatMessage } from '../utils/speechEngineTranscript';

type Message = { role: 'user' | 'model'; content: string };
interface Props {
  personaId?: string; disabled?: boolean; history: Message[]; model?: string; memories?: string[];
  onMessage(message: PilotChatMessage): void;
}
export function SpeechEnginePilot({personaId,disabled,history,model,memories,onMessage}: Props) {
  const origin = import.meta.env.VITE_SPEECH_ENGINE_ORIGIN as string | undefined;
  const [status,setStatus] = useState<'idle'|'connecting'|'listening'|'speaking'>('idle');
  const [error,setError] = useState('');
  const [muted,setMuted] = useState(false);
  const [voiceLabel,setVoiceLabel] = useState('');
  const [liveText,setLiveText] = useState('');
  const session = useRef<ConversationSession | null>(null);
  const request = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDivElement | null>(null);
  const endButton = useRef<HTMLButtonElement | null>(null);
  const epoch = useRef(0);
  const messageHandler = useRef(onMessage);
  messageHandler.current = onMessage;
  const stop = useCallback(() => {
    epoch.current++;
    request.current?.abort();request.current=null;
    const current = session.current;
    session.current = null;
    void current?.endSession();
    setStatus('idle');setMuted(false);
  },[]);
  const active=status!=='idle';
  useEffect(()=>{
    if(!active)return;
    const previous=document.activeElement as HTMLElement | null;
    endButton.current?.focus();
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();stop();}
      if(event.key==='Tab'){
        const buttons=Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []);
        const first=buttons[0], last=buttons[buttons.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',onKey);
    return ()=>{document.removeEventListener('keydown',onKey);if(previous?.isConnected)previous.focus();};
  },[active,stop]);
  useEffect(()=>()=>{epoch.current++;request.current?.abort();void session.current?.endSession();session.current=null;},[personaId]);
  useEffect(()=>{setStatus('idle');setMuted(false);setError('');},[personaId]);
  useEffect(()=>{if(disabled)stop();},[disabled]);
  if (!origin) return null;
  const start = async (fixture=false) => {
    if (!personaId && !fixture) {setError('Select a persona with an ElevenLabs voice to try this call.');return;}
    const generation=++epoch.current;
    const transcript=new SpeechEngineTranscript(crypto.randomUUID());
    const controller=new AbortController(); request.current=controller;
    setStatus('connecting');setError('');setLiveText('');setVoiceLabel(fixture?'Stock voice connection test':'');
    try {
      const {data:{session:auth}}=await supabase.auth.getSession();
      if (!auth) throw new Error('Sign in to try the new voice call.');
      const response=await fetch(`${origin}/pilot/token`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${auth.access_token}`},body:JSON.stringify({personaId,history:fixture?[]:history.slice(-20),model,memories:fixture?[]:memories,fixture}),signal:controller.signal});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error || 'Could not start this call.');
      if(generation!==epoch.current)return;
      setVoiceLabel(data.pilotVoice?`${data.personaName} · pilot clone ${data.voiceId.slice(-4)}`:data.personaName);
      const conversation=await Conversation.startSession({conversationToken:data.token,connectionType:'webrtc',textOnly:false,
        onConnect:()=>{if(generation===epoch.current)setStatus('listening');},
        onModeChange:({mode})=>{if(generation===epoch.current)setStatus(mode==='speaking'?'speaking':'listening');},
        onMessage:({source,message,event_id})=>{if(generation===epoch.current){setLiveText(message);if(!fixture)messageHandler.current(transcript.receive(source==='user'?'user':'model',message,event_id));}},
        onInterruption:({event_id})=>{if(generation===epoch.current&&!fixture){const updated=transcript.interrupt(event_id);if(updated)messageHandler.current(updated);}},
        onAgentResponseCorrection:({event_id,original_agent_response,corrected_agent_response})=>{if(generation===epoch.current&&!fixture){const updated=transcript.correct(event_id,original_agent_response,corrected_agent_response);if(updated)messageHandler.current(updated);}},
        onDisconnect:()=>{if(generation===epoch.current){epoch.current++;session.current=null;setStatus('idle');setMuted(false);}},
        onError:()=>{if(generation===epoch.current){setError('The voice connection ended. Your conversation is available as text.');stop();}},
      });
      if(generation!==epoch.current){await conversation.endSession();return;}
      session.current=conversation;
    } catch(err) {
      if(generation===epoch.current){setError(err instanceof Error?err.message:'Call unavailable');stop();}
    }
  };
  return <>
    <button type="button" disabled={disabled || status!=='idle'} onClick={()=>void start()} className="px-3 py-1.5 rounded-xl border border-amber-400/30 text-amber-200 text-xs disabled:opacity-40">Try new voice call</button>
    <button type="button" disabled={disabled || status!=='idle'} onClick={()=>void start(true)} className="px-3 py-1.5 rounded-xl border border-white/10 text-zinc-400 text-xs disabled:opacity-40">Stock voice test</button>
    {error && <p role="alert" className="text-xs text-amber-300 max-w-sm">{error}</p>}
    {status!=='idle' && createPortal(<div ref={dialog} role="dialog" aria-modal="true" aria-label="New voice call" className="fixed inset-0 z-[100] bg-black/80 grid place-items-center">
      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-8 text-center text-white max-w-sm">
        <h2 className="text-xl font-semibold">New voice call</h2>
        <p className="mt-2 text-sm text-zinc-400">{voiceLabel}</p>
        <p aria-live="polite" className="my-5">{status==='connecting'?'Connecting…':status==='speaking'?'Speaking — you can interrupt':'Listening…'}</p>
        <p className="text-sm text-zinc-400 mb-6">Say “end call,” press Escape, or use the red button to hang up. Maximum four minutes.</p>
        {liveText && <p className="text-sm mb-5" aria-live="polite">{liveText}</p>}
        <button type="button" disabled={status==='connecting'} className="px-4 py-2 rounded-lg bg-zinc-700 mr-3" onClick={()=>{session.current?.setMicMuted(!muted);setMuted(!muted);}}>{muted?'Unmute':'Mute'}</button>
        <button ref={endButton} type="button" onClick={stop} className="block w-full mt-4 px-5 py-3 rounded-lg bg-red-600 font-semibold">End call · Esc</button>
      </section>
    </div>,document.body)}
  </>;
}
