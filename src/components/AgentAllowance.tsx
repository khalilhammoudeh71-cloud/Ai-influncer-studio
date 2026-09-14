import React, {useState} from 'react';
import {authFetch} from '../services/imageService';
export function AgentAllowance({id,used,limit,onSaved}:{id:string;used:number;limit?:number;onSaved:(run:any)=>void}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(){
  setBusy(true);setError('');
  try{
   const response=await authFetch(`/api/agent-runs/${encodeURIComponent(id)}/allowance`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({budgetCredits:Number(draft)})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not save allowance');
   onSaved(data.run);setEditing(false);
  }catch(e){setError(e instanceof Error?e.message:'Could not save allowance');}finally{setBusy(false);}
 }
 return <section aria-label="Task allowance" className="space-y-2 rounded-lg border border-white/10 p-3 text-sm text-zinc-300">
  <p>{used} / {limit??'not set'} credits reserved for this plan</p>
  {!editing?<button className="min-h-10 text-[#E7C477] underline" onClick={()=>{setDraft(String(limit||Math.max(10,used)));setEditing(true);}}>Change allowance</button>:<div className="flex flex-wrap items-center gap-2">
   <input aria-label="New task allowance" type="number" min={Math.max(1,used)} max={100000} step={1} value={draft} onChange={e=>setDraft(e.target.value)} className="min-h-11 w-32 rounded-lg border border-white/15 bg-zinc-900 px-3" />
   <button disabled={busy||!Number.isSafeInteger(Number(draft))||Number(draft)<Math.max(1,used)||Number(draft)>100000} onClick={()=>void save()} className="min-h-11 rounded-lg bg-[#E7C477] px-3 text-black disabled:opacity-50">{busy?'Saving…':'Save allowance'}</button>
   <button disabled={busy} onClick={()=>setEditing(false)} className="min-h-11 px-2">Cancel</button>
  </div>}
  <p className="text-xs text-zinc-400">Changing the allowance does not restart paused work. Attempts remain counted after refunds. Provider invoices are separate.</p>
  {error&&<p role="alert" className="text-amber-200">{error}</p>}
 </section>;
}
