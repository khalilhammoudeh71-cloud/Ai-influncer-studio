import { strToU8, zip } from 'fflate';
import { validateCampaign, type AgentCampaign } from '../../shared/agentCampaign';

export type CampaignStep = {type:string;status:string;resultUrl?:string;quality?:{status:string}};
export function campaignReady(campaign:AgentCampaign,steps:CampaignStep[]):boolean {
  try {
    validateCampaign(campaign,steps);
    return steps.every(step=>step.status==='success' && Boolean(step.resultUrl) && (!step.quality || ['passed','accepted'].includes(step.quality.status)));
  } catch { return false; }
}

const MAX_FILE=50*1024*1024, MAX_TOTAL=120*1024*1024;
const extensions:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif','video/mp4':'mp4','video/webm':'webm'};
export async function buildCampaignArchive(campaign:AgentCampaign,steps:CampaignStep[],fetchMedia:typeof fetch=fetch):Promise<Uint8Array> {
  if(!campaignReady(campaign,steps))throw new Error('Finish and review every campaign image and video before downloading.');
  const validated=validateCampaign(campaign,steps)!;
  const files:Record<string,Uint8Array>={},paths:Record<number,string>={};let total=0;
  for(let index=0;index<steps.length;index++) {
    const step=steps[index],url=step.resultUrl!;
    if(!/^https:\/\//.test(url) && !/^data:image\/(jpeg|png|webp|avif);base64,/.test(url))throw new Error('This media download address is not supported.');
    const response=await fetchMedia(url,{credentials:'omit',signal:AbortSignal.timeout(60000)});
    if(!response.ok)throw new Error(`Could not download asset ${index+1}. Your completed results are still saved; try again.`);
    const mime=response.headers.get('content-type')?.split(';')[0].trim()||'';
    const extension=extensions[mime];
    if(!extension || (step.type==='generate_video')!==mime.startsWith('video/'))throw new Error(`Asset ${index+1} did not return a supported media file.`);
    if(Number(response.headers.get('content-length'))>MAX_FILE)throw new Error('An asset is too large for the campaign ZIP. Download it individually.');
    const reader=response.body?.getReader();if(!reader)throw new Error('The media download was empty.');
    const chunks:Uint8Array[]=[];let size=0;
    try {for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;total+=value.length;
      if(size>MAX_FILE || total>MAX_TOTAL){await reader.cancel();throw new Error('This campaign is too large for one ZIP. Download its assets individually.');}chunks.push(value);}}
    finally {reader.releaseLock();}
    if(!size)throw new Error('The media download was empty.');
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const path=`assets/${String(index+1).padStart(2,'0')}.${extension}`;paths[index]=path;files[path]=bytes;
  }
  const posts=validated.posts.map(post=>({...post,assets:post.assets.map(asset=>({file:paths[asset.stepIndex],alt:asset.alt}))}));
  files['campaign.json']=strToU8(JSON.stringify({title:validated.title,platform:validated.platform,posts},null,2));
  files['captions.txt']=strToU8(posts.map(post=>`${post.date} — ${post.title} (${post.format})\n\n${post.caption}\n\n${post.assets.map((asset,i)=>`${i+1}. ${asset.file}\nImage description: ${asset.alt}`).join('\n')}`).join('\n\n--------\n\n'));
  files['README.txt']=strToU8(`${validated.title}\n${validated.platform}\n\nCaptions and image descriptions are in captions.txt. campaign.json lists each post's assets in swipe order. Shared photos are included only once. Review the final images, captions, and dates before posting. Nothing has been published or scheduled automatically.`);
  return new Promise((resolve,reject)=>zip(files,{level:0},(error,data)=>error?reject(error):resolve(data)));
}
