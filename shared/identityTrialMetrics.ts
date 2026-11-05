import type { IdentityFeedback } from './identityFeedback';
type Job={id:string;kind:string;status:string;error?:string|null;createdAt?:string|Date;startedAt?:string|Date|null;completedAt?:string|Date|null};
type Cost={actualProviderCostMicrousd:number|null;estimatedProviderCostMicrousd:number};
const milliseconds=(x:unknown)=>x instanceof Date?x.getTime():typeof x==='string'?Date.parse(x):NaN;
const median=(values:number[])=>{if(!values.length)return null;values.sort((a,b)=>a-b);const n=values.length;return (values[Math.floor(n/2)]+values[Math.floor((n-1)/2)])/2;};
export function identityTrialMetrics(jobs:Job[],feedback:IdentityFeedback,costs:Cost[]){
 const durations=(from:'createdAt'|'startedAt',to:'startedAt'|'completedAt')=>jobs.map(j=>(milliseconds(j[to])-milliseconds(j[from]))/1000).filter(n=>Number.isFinite(n)&&n>=0);
 const labels=jobs.map(j=>feedback[j.id]?.verdict);
 return {jobs:jobs.length,completed:jobs.filter(j=>j.status==='succeeded').length,failed:jobs.filter(j=>j.status==='failed').length,
  pending:jobs.filter(j=>j.status==='running'||j.status==='queued').length,canceled:jobs.filter(j=>j.status==='canceled').length,
  identityBlocks:jobs.filter(j=>j.status==='failed'&&/identity|face consistency|detected \d|expected \d people/i.test(j.error||'')).length,
  confirmedFalseRejections:null,
  medianExecutionSeconds:median(durations('startedAt','completedAt')),medianQueueSeconds:median(durations('createdAt','startedAt')),
  feedback:{same:labels.filter(x=>x==='same').length,different:labels.filter(x=>x==='different').length,uncertain:labels.filter(x=>x==='uncertain').length,unreviewed:labels.filter(x=>!x).length},
  costs:{estimatedUsd:costs.reduce((n,c)=>n+c.estimatedProviderCostMicrousd,0)/1e6,recordedActualUsd:costs.reduce((n,c)=>n+(c.actualProviderCostMicrousd??0),0)/1e6,actualMissing:costs.filter(c=>c.actualProviderCostMicrousd===null).length,records:costs.length},
 };
}
