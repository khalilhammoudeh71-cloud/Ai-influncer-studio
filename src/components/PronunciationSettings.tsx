import { useEffect, useRef, useState } from 'react';
import { Play, Trash2, Users } from 'lucide-react';
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
  const [applyToAll,setApplyToAll]=useState(false);
  const scope=useRef<AbortController|null>(null);
  useEffect(()=>{
    const controller=new AbortController();scope.current=controller;setError('');setRules([]);setWord('');setSpokenAs('');setBusy(false);setLoading(true);
    void pronunciationApi(personaId,'',{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setRules(data.rules);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[personaId,revision]);
  async function save(remove?:string,share?:PronunciationRule){
    const controller=scope.current;if(!controller||controller.signal.aborted||busy)return;
    setBusy(true);setError('');
    try{
      const data=await pronunciationApi(personaId,remove?`/${encodeURIComponent(remove)}`:'',{method:remove?'DELETE':'PUT',body:remove?undefined:JSON.stringify(share?{word:share.word,spokenAs:share.spokenAs,scope:'all'}:{word,spokenAs,scope:applyToAll?'all':'persona'}),signal:controller.signal});
      if(controller.signal.aborted)return;
      setRules(data.rules);if(!remove&&!share){setWord('');setSpokenAs('');}
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Could not save.');}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  return <details onToggle={event=>setExpanded(event.currentTarget.open)} className="rounded-xl border border-white/10 p-3 text-sm"><summary className="cursor-pointer text-[#E7C477]">Remembered pronunciations {loading?'':`(${rules.length})`}</summary>
    <p className="my-3 text-xs leading-relaxed text-zinc-400">In Voice Call, say “Don’t say X, say Y”, listen, then confirm. For sounds with the same spelling, use phonetic spelling or Arabic vowel marks.{futureCallOnly?' Changes apply when you reconnect this provider call.':' Changes apply to this persona’s future speech.'}</p>
    {loading&&<p role="status" className="text-xs text-zinc-400">Loading pronunciations…</p>}
    <div className="max-h-44 overflow-auto">{rules.map(r=><div key={r.id} className="flex items-center gap-2 border-t border-white/10 py-1"><span dir="auto" className="min-w-0 flex-1 break-words">{r.word} → {r.spokenAs}<span className="mt-1 block text-xs text-zinc-400">{r.scope==='all'?'All my personas':'This persona'}</span></span>{r.scope!=='all'&&<button type="button" disabled={busy||dictating} aria-label={`Apply pronunciation of ${r.word} to all my personas`} title="Apply to all my personas" onClick={()=>void save(undefined,r)} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-[#E7C477] hover:bg-white/5 disabled:opacity-40"><Users size={16}/></button>}{onPreview&&<button type="button" className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/5" onClick={()=>onPreview(r.word)} aria-label={`Play pronunciation of ${r.word}`}><Play size={16}/></button>}<button type="button" disabled={busy} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 disabled:opacity-40" aria-label={`Forget pronunciation of ${r.word}${r.scope==='all'?' for all my personas':''}`} onClick={()=>void save(r.id)}><Trash2 size={16}/></button></div>)}</div>
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2"><input aria-label="Word or phrase" dir="auto" placeholder="Word or phrase" value={word} onChange={e=>setWord(e.target.value)} maxLength={160} className="min-h-11 min-w-0 rounded-lg bg-black/30 p-2"/>{expanded&&<PronunciationMicrophone key={`${personaId}_${revision}`} personaId={personaId} onBusy={setDictating} disabled={busy||loading||!!onPreview||futureCallOnly} onText={setWord}/>}<input aria-label="Say it as" dir="auto" placeholder="Say it as…" value={spokenAs} onChange={e=>setSpokenAs(e.target.value)} maxLength={200} className="col-span-2 min-h-11 min-w-0 rounded-lg bg-black/30 p-2"/></div>
    <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={applyToAll} onChange={e=>setApplyToAll(e.target.checked)} className="size-4 accent-[#E7C477]"/>Apply to all my personas</label><p className="mt-1 text-xs text-zinc-400">Shared corrections also apply to new personas. A correction saved for one persona overrides its shared version.</p>
    <button type="button" className="mt-2 min-h-11 rounded-lg bg-[#E7C477] px-3 py-2 text-black disabled:opacity-40" disabled={busy||loading||dictating||!word.trim()||!spokenAs.trim()} onClick={()=>void save()}>{busy?'Saving…':'Save pronunciation'}</button>{error&&<p role="alert" className="mt-2 text-amber-300">{error}</p>}
  </details>;
}
