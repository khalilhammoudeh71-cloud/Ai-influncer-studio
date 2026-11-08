import {pickDefaultImageModel} from './mediaDefaults';
type Model={id:string;name?:string;provider?:string};
function family(m:Model){const text=`${m.name||''} ${m.id}`.toLowerCase();return /gpt[ -]?image/.test(text)?0:/nano[ -]?banana|gemini.*image/.test(text)?1:/seedream/.test(text)?2:3}
function version(m:Model){const text=`${m.name||''} ${m.id}`.toLowerCase();const match=text.match(/(?:gpt[ -]?image|nano[ -]?banana|gemini|seedream)[\sv-]*(\d+(?:\.\d+)*)/);return match?.[1]||'0'}
function googleGeneration(m:Model){const text=`${m.name||''} ${m.id}`.toLowerCase();return /nano[ -]?banana[\s-]*[2-9]/.test(text)?2:/nano[ -]?banana[\s-]*pro/.test(text)?1:0}
function providerRank(m:Model){const text=`${m.provider||''} ${m.id}`.toLowerCase();return m.id.startsWith('openai:')?0:text.includes('wavespeed')?1:m.id.startsWith('google:')?2:text.includes('wiro')?3:text.includes('runware')?4:5}
function compare(a:Model,b:Model){
 const f=family(a)-family(b);if(f)return f;
 if(family(a)===1){const g=googleGeneration(b)-googleGeneration(a);if(g)return g}
 const v=version(b).localeCompare(version(a),undefined,{numeric:true});if(v)return v;
 const sunburst=Number(/sunburst/i.test(b.name||b.id))-Number(/sunburst/i.test(a.name||a.id));if(sunburst)return sunburst;
 return providerRank(a)-providerRank(b)||(a.name||a.id).localeCompare(b.name||b.id);
}
export function imageModelMenu<T extends Model>(models:T[]):{latest:T[];other:T[]}{
 const sorted=[...models].sort(compare),latest:T[]=[];
 for(const f of [0,1,2]){const model=sorted.find(m=>family(m)===f);if(model)latest.push(model)}
 const promoted=new Set(latest.map(m=>m.id));return{latest,other:sorted.filter(m=>!promoted.has(m.id))};
}
export function resolveImageModelChoice<T extends Model>(models:T[],choice:string):string{return choice==='default'?(pickDefaultImageModel(models)?.id||''):choice}
