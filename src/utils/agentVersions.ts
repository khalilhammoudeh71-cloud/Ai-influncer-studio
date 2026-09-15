import { requireOutput } from './agentWorkspace';
export interface ResultVersion { url:string; createdAt:number }
export function withResultVersion<T extends {resultUrl?:string;resultVersions?:ResultVersion[]}>(step:T,url:string):T & {resultUrl:string;resultVersions:ResultVersion[]} {
  requireOutput(url,'Revision');
  const versions=[...(step.resultVersions || [])];
  if(step.resultUrl && !versions.some(v=>v.url===step.resultUrl)) versions.push({url:step.resultUrl,createdAt:Date.now()});
  if(!versions.some(v=>v.url===url)) versions.push({url,createdAt:Date.now()});
  return {...step,resultUrl:url,resultVersions:versions};
}
