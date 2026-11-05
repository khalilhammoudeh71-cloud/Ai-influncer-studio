export const IDENTITY_FEEDBACK_KEY='identity_trial_feedback_v1';
export type IdentityVerdict='same'|'different'|'uncertain';
export type IdentityFeedback=Record<string,{verdict:IdentityVerdict;source:'human';at:string}>;
export function readIdentityFeedback(raw:string|null):IdentityFeedback {
 try {const value=JSON.parse(raw||'{}');if(!value||Array.isArray(value)||typeof value!=='object')return {};
  return Object.fromEntries(Object.entries(value).filter(([id,row]:[string,any])=>id.length>0&&id.length<200&&row?.source==='human'&&['same','different','uncertain'].includes(row.verdict)&&typeof row.at==='string'&&Number.isFinite(Date.parse(row.at)))) as IdentityFeedback;
 }catch{return {};}
}
export function recordIdentityFeedback(rows:IdentityFeedback,jobId:string,verdict:IdentityVerdict,at=new Date().toISOString()):IdentityFeedback {
 if(!jobId||jobId.length>=200||!['same','different','uncertain'].includes(verdict)||!Number.isFinite(Date.parse(at)))throw new Error('Invalid identity feedback');
 return Object.fromEntries(Object.entries({...rows,[jobId]:{verdict,source:'human' as const,at}}).sort((a,b)=>Date.parse(b[1].at)-Date.parse(a[1].at)).slice(0,500));
}
