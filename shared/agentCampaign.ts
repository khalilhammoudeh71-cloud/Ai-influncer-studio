import { supportsBackground } from './agentRun';
export interface CampaignPost {
  date: string;
  title: string;
  format: 'image' | 'carousel' | 'video' | 'text';
  caption: string;
  assets: Array<{stepIndex:number;alt:string}>;
}
export interface AgentCampaign {title:string;platform:string;posts:CampaignPost[]}
const mediaTypes=new Set(['generate_image','edit_image','generate_video']);
export function validateCampaign(input:unknown,steps:Array<{type:string;params?:Record<string,any>}>):AgentCampaign|undefined {
  if(input===null || input===undefined)return undefined;
  if(steps.length && !supportsBackground(steps))throw new Error('Campaign packages require supported background image and video steps.');
  let value:any=input;
  if(typeof value==='string'){try{value=JSON.parse(value);}catch{throw new Error('Campaign details are incomplete.');}}
  const text=(v:unknown,max:number)=>typeof v==='string' && v.trim().length>0 && v.length<=max;
  if(!value || !text(value.title,160) || !text(value.platform,60) || !Array.isArray(value.posts) || !value.posts.length || value.posts.length>31)throw new Error('Campaign needs a title, platform and dated posts.');
  const seen=new Set<number>();let previous='';
  const posts=value.posts.map((post:any):CampaignPost=>{
    const date=post?.date;
    if(typeof date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date || date<previous)throw new Error('Campaign dates must be real dates in chronological order.');
    previous=date;
    if(!text(post.title,160) || !text(post.caption,5000) || !['image','carousel','video','text'].includes(post.format) || !Array.isArray(post.assets))throw new Error('Each campaign post needs a format, title, caption and asset list.');
    if(post.assets.length>10 || (post.format==='carousel' && post.assets.length<2) || (['image','video'].includes(post.format) && post.assets.length!==1))throw new Error('Campaign media count does not match the post format.');
    const indices=new Set<number>();
    const assets=post.assets.map((asset:any)=>{
      const index=asset?.stepIndex;const step=steps[index];
      if(!Number.isInteger(index) || index<0 || !step || !mediaTypes.has(step.type) || !text(asset.alt,1500) || indices.has(index))throw new Error('Campaign contains a missing or duplicate asset reference.');
      if((post.format==='video') !== (step.type==='generate_video'))throw new Error('Campaign format does not match the referenced media.');
      seen.add(index);indices.add(index);return {stepIndex:index,alt:asset.alt.trim()};
    });
    return {date,title:post.title.trim(),format:post.format,caption:post.caption.trim(),assets};
  });
  if(steps.some((s,i)=>mediaTypes.has(s.type)&&!seen.has(i)))throw new Error('Campaign is missing a planned media deliverable.');
  if(steps.some(s=>!mediaTypes.has(s.type)))throw new Error('Campaign packages currently support image and video steps.');
  return {title:value.title.trim(),platform:value.platform.trim(),posts};
}
export const CAMPAIGN_WIRE_SCHEMA={type:['string','null'],description:'For a requested campaign, a JSON-encoded object {title,platform,posts:[{date:"YYYY-MM-DD",title,format:"image"|"carousel"|"video"|"text",caption,assets:[{stepIndex:0,alt:"Image description"}]}]}. Indexes refer to suggestedSteps in zero-based order. Map every media step to at least one post. A carousel has 2-10 images in swipe order. Reuse indexes for existing campaign photos on later days. Include complete captions and alt text. Use null for ordinary chat and non-campaign tasks.'} as const;
