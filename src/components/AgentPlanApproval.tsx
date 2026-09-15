import React, {useState} from 'react';
import {authFetch} from '../services/imageService';
export type PlanApproval = {budgetCredits:number;visualReview:boolean};
export function AgentPlanApproval({steps,onApprove}:{steps:any[];onApprove:(approval:PlanApproval)=>void}){
 const [quote,setQuote]=useState<any>(null);
 const [quotedPlan,setQuotedPlan]=useState('');
 const [limit,setLimit]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const fingerprint=JSON.stringify(steps);
 const current=quotedPlan===fingerprint?quote:null;
 const allowance=Number(limit);
 const valid=Number.isSafeInteger(allowance)&&allowance>=1&&allowance<=100000;
 async function estimate(){
  setBusy(true);setError('');
  try{
   const response=await authFetch('/api/agent-runs/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({steps})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Estimate unavailable');
   setQuote(data);setQuotedPlan(fingerprint);setLimit(String(data.recommendedLimit));
  }catch(e){setError(e instanceof Error?e.message:'Estimate unavailable');}finally{setBusy(false);}
 }
 return <div className="min-w-0 space-y-3 rounded-xl border border-white/15 p-3 text-sm text-zinc-300">
  {current&&<>
   <p className="font-medium text-zinc-100">Review this plan</p>
   <p>{current.providerChargesApply?'Creator account: no account credits charged. Provider charges still apply.':`Estimated ${current.estimatedCredits} credits · Balance ${current.balance}`}</p>
   <details className="text-xs"><summary className="cursor-pointer py-2">Cost by step</summary>{current.steps.map((s:any)=><p key={s.index}>Step {s.index+1}: {s.usageCredits} credits, including {s.reviewCredits} for visual review (estimate)</p>)}</details>
   <label className="block">Task allowance (credits)
    <input aria-label="Task allowance in credits" type="number" min={1} max={100000} step={1} value={limit} onChange={e=>setLimit(e.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-white/15 bg-zinc-900 px-3 text-zinc-100 sm:max-w-48" />
   </label>
   <p className="text-xs text-zinc-400">Every attempt reserves from this limit, including refunded attempts. Image checks use 1 credit; AI repair analysis uses 3. The plan stops before starting work that exceeds your allowance. You can raise it later.</p>
   <p className="text-xs text-zinc-400">This limits studio credits for this plan, including on creator accounts. It is not a cap on provider invoices or earlier planning/chat usage.</p>
   <p className="text-xs text-zinc-400">Images are checked against your instructions. Uncertain results pause for your review. Videos require playback and your acceptance.</p>
   {!valid&&<p role="alert" className="text-amber-200">Choose a whole number from 1 to 100,000.</p>}
   {valid&&allowance<current.estimatedUsage&&<p className="text-amber-200">This is below the estimate. The plan may stop before finishing.</p>}
   {current.insufficientCredits&&<p className="text-amber-200">Add account credits before starting.</p>}
  </>}
  {error&&<p role="alert" className="text-xs text-amber-200">{error}. No generation was started.</p>}
  {!current?<button type="button" disabled={busy} onClick={()=>void estimate()} className="min-h-11 w-full rounded-lg bg-[#E7C477] px-4 py-2 text-sm text-black disabled:opacity-50">{busy?'Checking cost…':'Review cost & allowance'}</button>:<button type="button" disabled={!valid||current.insufficientCredits} onClick={()=>onApprove({budgetCredits:allowance,visualReview:true})} className="min-h-11 w-full rounded-lg bg-[#E7C477] px-4 py-2 text-sm text-black disabled:opacity-50">Approve &amp; run plan</button>}
 </div>;
}
