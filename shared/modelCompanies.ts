export type CompanyModel={id:string;name:string;provider?:string;company?:string;disabled?:boolean;description?:string;detail?:string;documentation?:string};
const known:[string,RegExp][]=[
 ['OpenAI',/openai|gpt[ -]?image|gpt[ -]?\d|chatgpt|dall[ -]?e|o[134]-|tts-1/],
 ['Google / Gemini',/google|gemini|nano[ -]?banana|imagen|\bveo\b/],
 ['ByteDance',/bytedance|seedream|seedance|seededit|\bseed[ -]?(?:tts|vc)\b/],
 ['xAI',/\bxai\b|\bgrok\b/],['Anthropic',/anthropic|claude/],
 ['ElevenLabs',/elevenlabs|eleven[_ -]|eleven v|flash v?2\.5|multilingual v2/],['HeyGen',/heygen|avatar[_ -]?(?:iv|v)\b/],
 ['Black Forest Labs',/black forest|\bflux\b/],['Alibaba',/alibaba|qwen|\bwan[\s\d./-]|cosyvoice|fun.audio/],
 ['Kuaishou',/kuaishou|\bkling\b/],['Tencent',/tencent|hunyuan/],['MiniMax',/minimax|hailuo/],
 ['Luma',/\bluma\b|ray[ -]?[23]/],['Stability AI',/stability|stable[ -]?diffusion|sdxl|stable[ -]?audio/],
 ['Bria',/\bbria\b/],['Recraft',/recraft/],['Ideogram',/ideogram/],['PixVerse',/pixverse/],
 ['Runway',/runway|gen-4|gen-3/],['Pika',/\bpika\b/],['Lightricks',/lightricks|ltx/],['Leonardo AI',/leonardo|phoenix/],
 ['Deepgram',/deepgram|aura/],['Cartesia',/cartesia|sonic/],['Hume',/\bhume\b|octave/],['Fish Audio',/fish[ _-]?audio|fish-speech|\bs1\b/],
 ['Resemble AI',/resemble|chatterbox/],['PlayAI',/playai|playht|playdialog/],['Inworld',/inworld/],
 ['Microsoft',/microsoft|\bazure\b/],['Amazon',/amazon|polly/],['Mureka',/mureka/],['Meshy',/meshy/],['Tripo',/tripo/],
 ['Zyphra',/zyphra|zonos/],['DeepSeek',/deepseek/],['Meta',/\bmeta\b|llama/],['NVIDIA',/nvidia|nemotron/],['Meituan',/meituan|longcat/],['MeiGen',/meigen|infinitetalk/],['Tavus',/tavus/],['Synthesia',/synthesia/],['D-ID',/d-id/],['Coqui',/coqui|xtts/],['Bilibili',/bilibili|index[ -]?tts/],
];
export function modelCompany(model:CompanyModel):string{
 if(model.company)return model.company;
 const text=`${model.name} ${model.id}`.toLowerCase();
 const matched=known.find(([,pattern])=>pattern.test(text))?.[0]||known.find(([,pattern])=>pattern.test((model.provider||'').toLowerCase()))?.[0];
 if(matched)return matched;
 const publisher=(model.provider||'').trim();
 const hostOrCategory=/^(wavespeed(?:\s*ai)?|runware(?: community)?|fal(?:\.ai)?|wiro(?: ai)?|venice(?: ai)?|hugging face|openrouter)$|latest|all models|text.to.video|image.to.video|video.to.video|image models|edit models|upscale models/i;
 return publisher&&!hostOrCategory.test(publisher)?publisher:'Other creators';
}
const priority=['OpenAI','Google / Gemini','ByteDance','xAI'];
function version(model:CompanyModel){return model.name.match(/\d+(?:\.\d+)*/)?.[0]||'0'}
export function groupCompanyModels<T extends CompanyModel>(models:T[]):{company:string;models:T[]}[]{
 const map=new Map<string,T[]>();for(const m of models){const company=modelCompany(m);map.set(company,[...(map.get(company)||[]),m])}
 return Array.from(map,([company,items])=>({company,models:[...items].sort((a,b)=>{const nano=(m:CompanyModel)=>company==='Google / Gemini'&&/nano[ -]?banana[ -]*[2-9]/i.test(m.name)?1:0;return nano(b)-nano(a)||version(b).localeCompare(version(a),undefined,{numeric:true})||a.name.localeCompare(b.name,undefined,{numeric:true})})})).sort((a,b)=>{
 const ai=priority.indexOf(a.company),bi=priority.indexOf(b.company);return(ai<0?99:ai)-(bi<0?99:bi)||a.company.localeCompare(b.company);
 });
}
