import type{RunStep}from'../shared/agentRun';import type{GenerationQuote}from'./creditPricing';
export type PlanPricer=(model:string,type:'image'|'video',count?:number,options?:{duration?:number;resolution?:string})=>Promise<GenerationQuote>;
export async function quotePlan(steps:RunStep[],price:PlanPricer,balance:number,creator:boolean){
 const items=await Promise.all(steps.map(async(step,index)=>{const model=step.params.modelId||(step.type==='generate_video'?'wavespeed-i2v:alibaba/wan-3.0/image-to-video':'wavespeed:bytedance/seedream-v5.0-pro');const q=await price(model,step.type==='generate_video'?'video':'image',1,{duration:step.params.duration,resolution:step.params.resolution});const reviewCredits=step.type==='generate_video'?0:1;return{index,model,providerCostUsd:q.providerCostUsd,credits:creator?0:q.credits+reviewCredits,usageCredits:q.credits+reviewCredits,reviewCredits,source:q.quoteSource};}));
 const estimatedCredits=items.reduce((s,i)=>s+i.credits,0),estimatedUsage=items.reduce((s,i)=>s+i.usageCredits,0);
 return{estimatedProviderCostUsd:items.reduce((sum,item)=>sum+item.providerCostUsd,0),providerCostIsEstimate:true,steps:items,estimatedCredits,estimatedUsage,recommendedLimit:Math.max(10,estimatedUsage*2+3),complete:true,balance,insufficientCredits:!creator&&estimatedCredits>balance,providerChargesApply:creator};
}
