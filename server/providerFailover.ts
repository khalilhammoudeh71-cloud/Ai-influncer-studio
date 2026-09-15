import { isRetryableMediaJobFailure } from './mediaJobs';
export async function runProviderCandidates<T>(candidates:T[], run:(candidate:T)=>Promise<{status:number;payload:any}>) {
 let result: {status:number;payload:any} = {status:503,payload:{error:'No provider is available'}};
 for (const candidate of candidates) {
   result = await run(candidate);
   const message = String(result.payload?.error || result.payload?.message || '');
   if(result.status < 400 || !isRetryableMediaJobFailure(result.status,message)) return result;
 }
 return result;
}
