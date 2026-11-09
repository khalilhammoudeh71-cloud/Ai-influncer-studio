import {groupCompanyModels} from './modelCompanies';
type VideoModel={id:string;name:string;provider?:string;type?:string};
export function latestVideoModels<T extends VideoModel>(models:T[]):T[]{
 const groups=groupCompanyModels(models.filter(m=>['text-to-video','image-to-video','video-to-video'].includes(m.type||'')));
 const priority=['ByteDance','Google / Gemini','OpenAI','Kuaishou','Alibaba','MiniMax','Luma','Runway'];
 return [...groups].sort((a,b)=>{const ai=priority.indexOf(a.company),bi=priority.indexOf(b.company);return(ai<0?99:ai)-(bi<0?99:bi)}).slice(0,4).map(g=>g.models[0]);
}
