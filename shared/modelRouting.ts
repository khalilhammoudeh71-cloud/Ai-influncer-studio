/** Compare only the same model/version and operation. Unknown prices are not free. */
export interface RoutableModel { id:string; name:string; type:string; price:number; provider?:string; hasReferenceImage?:boolean; hasEditVariant?:boolean }
export function modelKey(model:RoutableModel):string {
 const name=model.name.toLowerCase()
  .replace(/\((?:wavespeed(?: ai)?|openai|google|fal(?:\.ai)?|runware|wiro|atlascloud|provider)\)/g,'')
  .replace(/^(?:bytedance|alibaba|openai|google|wavespeed(?: ai)?|xai)\s+/,'')
  .replace(/\b(?:latest|new)\b/g,'').replace(/\bv(?=\d)/g,'')
  .replace(/(\d)\.0\b/g,'$1').replace(/[^a-z0-9.]+/g,' ').trim();
 return `${model.type}:${name}`;
}
export function equivalentRoutes<T extends RoutableModel>(selected:T,models:T[]):T[]{
 const key=modelKey(selected);
 const cost=(m:T)=>Number.isFinite(m.price)&&m.price>0?m.price:Infinity;
 return models.filter(m=>modelKey(m)===key).sort((a,b)=>cost(a)-cost(b)||a.id.localeCompare(b.id));
}
export function uniqueModels<T extends RoutableModel>(models:T[]):T[]{
 const groups=new Map<string,T>();
 for(const model of models){const key=modelKey(model);if(!groups.has(key))groups.set(key,equivalentRoutes(model,models)[0]);}
 return [...groups.values()];
}
