import React,{useState} from 'react';
import {authFetch} from '../services/imageService';
export function AgentRecovery({id,onRecovered}:{id:string;onRecovered:(run:any)=>void}){
 const [detail,setDetail]=useState<any>(null),[prompt,setPrompt]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function inspect(){setBusy(true);setError('');try{const r=await authFetch(`/api/agent-runs/${encodeURIComponent(id)}/recovery`);const d=await r.json();if(!r.ok)throw new Error(d.error);setDetail(d);setPrompt(d.prompt);}catch(e){setError(e instanceof Error?e.message:'Inspection failed');}finally{setBusy(false);}}
 async function retry(){setBusy(true);setError('');try{const r=await authFetch(`/api/agent-runs/${encodeURIComponent(id)}/retry`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,version:detail.version})});const d=await r.json();if(!r.ok)throw new Error(d.error);onRecovered(d.run);}catch(e){setError(e instanceof Error?e.message:'Repair failed');}finally{setBusy(false);}}
 return <div className="space-y-2 rounded-xl border border-white/15 p-3 text-sm text-zinc-300">
 <button disabled={busy} onClick={()=>void inspect()} className="text-[#E7C477] underline">{busy?'Working…':'Inspect failed step'}</button>
 {detail&&<><p>Step {detail.index+1}: {detail.advice.message}</p><p className="text-xs text-zinc-400">Reported error: {detail.error}</p><label className="block">Review or revise this step<textarea aria-label="Repair instructions" value={prompt} onChange={e=>setPrompt(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 p-2" rows={3}/></label><p className="text-xs">Source references and completed results are preserved. Resolve the reported issue before retrying.</p><button disabled={busy||!prompt.trim()} onClick={()=>void retry()} className="rounded-lg bg-[#E7C477] px-3 py-2 text-black disabled:opacity-50">Approve repair &amp; retry (may charge again)</button></>}
 {error&&<p role="alert">{error}</p>}
 </div>;
}
