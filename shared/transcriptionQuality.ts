const words=(text:string)=>text.toLowerCase().normalize('NFKC').replace(/[\u064b-\u065f]/g,'').replace(/[^\p{L}\p{N}\s]/gu,' ').trim().split(/\s+/u).filter(Boolean);
/** Confidence is a review hint, not proof the transcript is correct. */
export function requiresTranscriptConfirmation(data:any,draft='') {
  const probs=Array.isArray(data?.logprobs)?data.logprobs.filter((p:any)=>Number.isFinite(p.logprob)):[];
  if(typeof data?.text!=='string'||!data.text.trim())return true;
  if(!probs.length && !draft.trim()) return true;
  // Some transcription providers omit token logprobs. Missing confidence is
  // not evidence that a usable transcript is wrong; compare it with the
  // captured draft below and only require confirmation for a real mismatch.
  if(probs.length && (probs.reduce((n:number,p:any)=>n+p.logprob,0)/probs.length<-.65||probs.some((p:any)=>p.logprob<-2.5)))return true;
  const original=words(draft),verified=words(data.text);
  if(original.length<3||verified.length<3)return false;
  const shared=verified.filter(word=>original.includes(word)).length;
  return shared/Math.max(original.length,verified.length)<.25;
}
