import React, { useEffect, useRef, useState } from 'react';
import { PersonalitySettings, normalizePersonality, TRAIT_BEHAVIORS, traitsFor } from '../../shared/personality';
import { Persona } from '../types';
import { authFetch } from '../services/imageService';
import { api } from '../services/apiService';

type Props = { persona: Partial<Persona>; onChange: (settings: PersonalitySettings) => void };
export default function PersonalityControls({ persona, onChange }: Props) {
 const settings=normalizePersonality(persona), traits=traitsFor(persona);
 const [message,setMessage]=useState('I had a long day. What should we do tonight?');
 const [reply,setReply]=useState(''), [audio,setAudio]=useState(''), [error,setError]=useState('');
 const [busy,setBusy]=useState<'text'|'audio'|null>(null);
 const revision=useRef(0);
 const signature=JSON.stringify(persona);
 useEffect(()=>{revision.current++;setReply('');setAudio('');setError('');setBusy(null);},[signature,message]);
 useEffect(()=>()=>{revision.current++;},[]);
 const preview=async (spoken=false)=>{
   const current=++revision.current;
   setError('');setBusy(spoken?'audio':'text');
   try {
     if(spoken){
       const result=await api.voice.generateSpeech({text:reply,voiceId:persona.voiceId,engine:persona.voiceEngine || 'elevenlabs',personaName:persona.name,voiceReference:persona.voiceSampleUrl,activePersona:persona,voicePrompt:persona.voicePrompt,voiceLikeness:persona.voiceLikeness,voiceStability:persona.voiceStability,voiceStyleExaggeration:persona.voiceStyleExaggeration,voiceSpeakingSpeed:persona.voiceSpeakingSpeed,voiceSettings:{stability:(persona.voiceStability ?? 50)/100,similarity_boost:(persona.voiceLikeness ?? 85)/100,style:(persona.voiceStyleExaggeration ?? 30)/100,speed:persona.voiceSpeakingSpeed ?? 1},isPreview:true});
       if(!result.audioUrl)throw new Error('No audio was returned. Check the selected voice and try again.');
       if(current===revision.current)setAudio(result.audioUrl);
     } else {
       const response=await authFetch('/api/personality-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({persona,message})});
       const data=await response.json();
       if(!response.ok || !data.text)throw new Error(data.error || 'Could not generate a preview. Try again.');
       if(current===revision.current){setReply(data.text);setAudio('');}
     }
   }catch(e:any){if(current===revision.current)setError(e.message || 'Preview failed. Try again.');}
   finally{if(current===revision.current)setBusy(null);}
 };
 return <div className="space-y-5">
  {traits.length>0 && <div className="divide-y divide-white/10">
   <p className="text-xs text-slate-400 pb-3">Choose a primary trait to lead the personality. Supporting traits add nuance; three or four usually give a clearer result.</p>
   {traits.map(trait=><div key={trait} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
    <div className="flex-1"><strong className="text-sm text-white">{trait}</strong><p className="text-xs text-slate-400 mt-1">{TRAIT_BEHAVIORS[trait] || `Express ${trait} naturally in conversation.`}</p></div>
    <button type="button" aria-pressed={settings.primary===trait} onClick={()=>onChange({...settings,primary:trait})} className={`shrink-0 rounded-lg px-3 py-2 text-xs border ${settings.primary===trait?'border-[#E7C477] text-[#E7C477]':'border-white/15 text-slate-400'}`}>{settings.primary===trait?'Primary':'Make primary'}</button>
    <label className="text-xs text-slate-400">Intensity<select aria-label={`${trait} intensity`} value={settings.intensities[trait]} onChange={e=>onChange({...settings,intensities:{...settings.intensities,[trait]:e.target.value as 'subtle'|'balanced'|'strong'}})} className="luxury-input block mt-1 px-3 py-2"><option value="subtle">Subtle</option><option value="balanced">Balanced</option><option value="strong">Strong</option></select></label>
   </div>)}
  </div>}
  <label className="flex items-start gap-3 text-sm text-white"><input type="checkbox" className="mt-1 accent-[#E7C477]" checked={settings.voiceEnabled} onChange={e=>onChange({...settings,voiceEnabled:e.target.checked})}/><span>Match spoken delivery to personality<span className="block text-xs text-slate-400 mt-1">Adjusts pacing and expression on supported voices. Keeps the selected speaker. Turn off to use your existing voice settings.</span></span></label>
  <div className="rounded-xl border border-[#E7C477]/25 p-4 space-y-3">
   <h4 className="text-sm font-bold text-[#E7C477]">Test personality</h4>
   <p className="text-xs text-slate-400">Try the current choices before saving. This preview does not enter your chat history. AI and voice previews use the configured providers.</p>
   <label className="block text-xs text-slate-300">Say something to {persona.name || 'your persona'}<textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={1000} rows={2} className="luxury-input w-full mt-2 p-3"/></label>
   <button type="button" disabled={!!busy || !message.trim()} onClick={()=>preview()} className="btn-gold-primary px-4 py-2 text-xs disabled:opacity-50">{busy==='text'?'Generating…':'Test personality'}</button>
   {reply && <><p className="text-sm text-white whitespace-pre-wrap" aria-live="polite">{reply}</p><button type="button" disabled={!!busy || !persona.voiceId} onClick={()=>preview(true)} className="rounded-lg border border-white/20 px-4 py-2 text-xs text-white disabled:opacity-50">{busy==='audio'?'Preparing voice…':'Preview voice'}</button>{!persona.voiceId && <p className="text-xs text-slate-400">Choose a voice in the Voice tab to hear this reply.</p>}</>}
   {audio && <audio key={audio} controls src={audio} className="w-full"/>}
   {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
  </div>
 </div>;
}
