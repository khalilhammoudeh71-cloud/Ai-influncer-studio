import { useEffect, useRef, useState } from 'react';
import { Play, Trash2 } from 'lucide-react';
import { getAuthHeaders } from '../services/apiService';
import type { PronunciationRule } from '../../shared/pronunciation';
import { PronunciationMicrophone } from './PronunciationMicrophone';
export async function pronunciationApi(personaId:string,suffix='',options:RequestInit={}) {
  const response=await fetch(`/api/voice-recognition/pronunciations/${encodeURIComponent(personaId)}${suffix}`,{...options,headers:{'Content-Type':'application/json',...await getAuthHeaders(),...options.headers}});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Pronunciation could not be saved.');return data;
}
export function PronunciationSettings({personaId,onPreview,revision=0,futureCallOnly=false}:{personaId:string;onPreview?:(text:string)=>void;revision?:number;futureCallOnly?:boolean}) {
  const [rules,setRules]=useState<PronunciationRule[]>([]),[word,setWord]=useState(''),[spokenAs,setSpokenAs]=useState(''),[error,setError]=useState('');
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [expanded,setExpanded]=useState(false);
  const [dictating,setDictating]=useState(false);
  const scope=useRef<AbortController|null>(null);
  useEffect(()=>{
    const controller=new AbortController();scope.current=controller;setError('');setRules([]);setWord('');setSpokenAs('');setBusy(false);setLoading(true);
    void pronunciationApi(personaId,'',{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setRules(data.rules);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[personaId,revision]);
  async function save(remove?:string){
    const controller=scope.current;if(!controller||controller.signal.aborted||busy)return;
    setBusy(true);setError('');
    try{
      const data=await pronunciationApi(personaId,remove?`/${encodeURIComponent(remove)}`:'',{method:remove?'DELETE':'PUT',body:remove?undefined:JSON.stringify({word,spokenAs}),signal:controller.signal});
      if(controller.signal.aborted)return;
      setRules(data.rules);if(!remove){setWord('');setSpokenAs('');}
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Could not save.');}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  return <details onToggle={event=>setExpanded(event.currentTarget.open)} className="rounded-xl border border-white/10 p-3 text-sm"><summary className="cursor-pointer text-[#E7C477]">Remembered pronunciations {loading?'':`(${rules.length})`}</summary>
    <p className="my-3 text-xs leading-relaxed text-zinc-400">In Voice Call, say “Don’t say X, say Y”, listen, then confirm. For sounds with the same spelling, use phonetic spelling or Arabic vowel marks.{futureCallOnly?' Changes apply when you reconnect this provider call.':' Changes apply to this persona’s future speech.'}</p>
    {loading&&<p role="status" className="text-xs text-zinc-400">Loading pronunciations…</p>}
    <div className="max-h-44 overflow-auto">{rules.map(r=><div key={r.id} className="flex items-center gap-2 border-t border-white/10 py-1"><span dir="auto" className="min-w-0 flex-1 break-words">{r.word} → {r.spokenAs}</span>{onPreview&&<button type="button" className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/5" onClick={()=>onPreview(r.word)} aria-label={`Play pronunciation of ${r.word}`}><Play size={16}/></button>}<button type="button" disabled={busy} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 disabled:opacity-40" aria-label={`Forget pronunciation of ${r.word}`} onClick={()=>void save(r.id)}><Trash2 size={16}/></button></div>)}</div>
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2"><input aria-label="Word or phrase" dir="auto" placeholder="Word or phrase" value={word} onChange={e=>setWord(e.target.value)} maxLength={160} className="min-h-11 min-w-0 rounded-lg bg-black/30 p-2"/>{expanded&&<PronunciationMicrophone key={`${personaId}_${revision}`} personaId={personaId} onBusy={setDictating} disabled={busy||loading||!!onPreview||futureCallOnly} onText={setWord}/>}<input aria-label="Say it as" dir="auto" placeholder="Say it as…" value={spokenAs} onChange={e=>setSpokenAs(e.target.value)} maxLength={200} className="col-span-2 min-h-11 min-w-0 rounded-lg bg-black/30 p-2"/></div>
    <button type="button" className="mt-2 min-h-11 rounded-lg bg-[#E7C477] px-3 py-2 text-black disabled:opacity-40" disabled={busy||loading||dictating||!word.trim()||!spokenAs.trim()} onClick={()=>void save()}>{busy?'Saving…':'Save pronunciation'}</button>{error&&<p role="alert" className="mt-2 text-amber-300">{error}</p>}
  </details>;
}
