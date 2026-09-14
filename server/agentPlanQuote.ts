import type { RunStep } from '../shared/agentRun';
import type { GenerationQuote } from './creditPricing';
export async function quotePlan(steps:RunStep[], price:(model:string,type:'image'|'video')=>Promise<GenerationQuote>, balance:number, creator:boolean){
 const items=await Promise.all(steps.map(async(step,index)=>{
  const model=step.params.modelId||(step.type==='generate_video'?'wavespeed-i2v:alibaba/wan-3.0/image-to-video':'wavespeed:bytedance/seedream-v5.0-pro');
  if(step.type==='edit_image')return {index,model,credits:null,source:'Edit cost unavailable'};
  const q=await price(model,step.type==='generate_video'?'video':'image');
  return {index,model,credits:creator?0:q.credits,source:q.quoteSource};
 }));
 const estimatedCredits=items.reduce((sum,item)=>sum+(item.credits??0),0);
 return {steps:items,estimatedCredits,complete:items.every(item=>item.credits!==null),balance,insufficientCredits:!creator&&estimatedCredits>balance,providerChargesApply:creator};
}
