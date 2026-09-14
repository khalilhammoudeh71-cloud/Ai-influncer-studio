import React, {useState} from 'react';
import {authFetch} from '../services/imageService';
export function AgentPlanApproval({steps,onApprove}:{steps:any[];onApprove:()=>void}){
 const [quote,setQuote]=useState<any>(null);
 const [quotedPlan,setQuotedPlan]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const fingerprint=JSON.stringify(steps);
 const current=quotedPlan===fingerprint?quote:null;
 async function estimate(){
  setBusy(true);setError('');
  try{
   const response=await authFetch('/api/agent-runs/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({steps})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Estimate unavailable');
   setQuote(data);setQuotedPlan(fingerprint);
  }catch(e){setError(e instanceof Error?e.message:'Estimate unavailable');}finally{setBusy(false);}
 }
 return <div className="space-y-2 rounded-xl border border-white/15 p-3">
  {current&&<div role="status" className="space-y-1 text-xs text-zinc-300">
   <p>{current.providerChargesApply?'Creator account: no internal credits charged. Provider charges still apply.':`${current.complete?'Estimated':'Known steps: estimated'} ${current.estimatedCredits} credits · Balance ${current.balance}`}</p>
   {current.steps.map((s:any)=><p key={s.index}>Step {s.index+1}: {s.credits===null?'Cost unavailable':`${s.credits} credits (estimate)`}</p>)}
   <p>{current.complete?'Estimate only; final usage may differ.':'Partial estimate: unpriced steps are excluded.'} Retries may cost extra. Credits are checked again during generation.</p>
   {current.insufficientCredits&&<p className="text-amber-200">Insufficient credits for the estimated steps. Add credits before starting.</p>}
  </div>}
  {error&&<p role="alert" className="text-xs text-amber-200">{error}. No generation was started.</p>}
  {!current?<button type="button" disabled={busy} onClick={()=>void estimate()} className="w-full rounded-lg bg-[#E7C477] px-4 py-2 text-sm text-black disabled:opacity-50">{busy?'Checking cost…':'Review estimated cost'}</button>:<button type="button" disabled={current.insufficientCredits} onClick={onApprove} className="w-full rounded-lg bg-[#E7C477] px-4 py-2 text-sm text-black disabled:opacity-50">Approve &amp; run plan</button>}
 </div>;
}
