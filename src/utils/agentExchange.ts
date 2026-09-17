export function visibleAgentExchange<T extends {role:string;campaign?:unknown;planningFailed?:boolean}>(messages:T[]):T[] {
 const start=messages.map(m=>m.role).lastIndexOf('user');
 if(start<0)return [];
 const exchange=messages.slice(start);
 if(!exchange.some(m=>m.planningFailed))return exchange;
 const previous=messages.slice(0,start).reverse().find(m=>m.campaign);
 return previous?[previous,...exchange]:exchange;
}
export function reuseCampaignAssets<T extends {type:string;status?:string;resultUrl?:string;quality?:{status:string}}>(steps:{type:string}[],previous:T[]|undefined,request:string):T[]|undefined {
 if(!/\b(?:do not|don't|without)\s+(?:execute or )?(?:regenerate|generate|rerender)\s+(?:the )?images\b/i.test(request))return undefined;
 if(!previous?.length||steps.length!==previous.length||!steps.every((s,i)=>s.type===previous[i].type))return undefined;
 if(!previous.every(s=>s.status==='success'&&s.resultUrl&&(!s.quality||['passed','accepted'].includes(s.quality.status))))return undefined;
 return previous;
}
