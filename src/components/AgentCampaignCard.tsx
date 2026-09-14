import React, {useState} from 'react';
import { Download, ChevronDown } from 'lucide-react';
import type { AgentCampaign } from '../../shared/agentCampaign';
import { buildCampaignArchive, campaignReady, type CampaignStep } from '../utils/agentCampaignExport';

export function AgentCampaignCard({campaign,steps}:{campaign:AgentCampaign;steps:CampaignStep[]}) {
  const [downloading,setDownloading]=useState(false),[error,setError]=useState('');
  const ready=campaignReady(campaign,steps);
  const download=async()=>{setDownloading(true);setError('');try {
    const bytes=await buildCampaignArchive(campaign,steps);
    const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/zip'}));
    const a=document.createElement('a');a.href=url;a.download=`${campaign.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,70)||'campaign'}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){setError(e instanceof Error?e.message:'Could not download the campaign. Try again.');}finally{setDownloading(false);}};
  return <section aria-label="Campaign package" className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4">
      <div><p className="text-xs text-zinc-400">{campaign.platform} · {campaign.posts.length} posts</p><h3 className="mt-1 font-semibold text-zinc-100">{campaign.title}</h3></div>
      <button type="button" disabled={!ready||downloading} onClick={()=>void download()} className="flex min-h-10 items-center gap-2 rounded-xl bg-[#E7C477] px-4 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E7C477]"><Download size={16}/>{downloading?'Preparing ZIP…':'Download campaign'}</button>
      <p role="status" className="w-full text-xs text-zinc-400">{ready?'Your media and captions are ready to download. Review before posting.':`${steps.filter(s=>s.status==='success').length} of ${steps.length} assets ready. The download unlocks after all assets are finished and reviewed.`} Nothing is posted automatically.</p>
      {error&&<p role="alert" className="w-full text-sm text-red-300">{error}</p>}
    </div>
    <div className="divide-y divide-white/10">{campaign.posts.map((post,i)=><details key={`${post.date}-${i}`} className="group p-4" open={i===0||undefined}>
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-3 focus-visible:outline focus-visible:outline-[#E7C477]">
        <time dateTime={post.date} className="shrink-0 text-xs text-[#E7C477]">{new Date(`${post.date}T12:00:00Z`).toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'})}</time>
        <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-zinc-100">{post.title}</span><span className="text-xs capitalize text-zinc-400">{post.format==='text'?'Question / text post':post.format}</span></span>
        <ChevronDown size={16} className="shrink-0 text-zinc-400 group-open:rotate-180"/>
      </summary>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{post.caption}</p>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">{post.assets.map((asset,j)=>{const step=steps[asset.stepIndex];return <figure key={asset.stepIndex} className="w-36 shrink-0">
        {step?.resultUrl ? step.type==='generate_video'?<video src={step.resultUrl} controls preload="metadata" aria-label={asset.alt} className="aspect-[4/5] w-full rounded-lg bg-black object-contain"/>:<img src={step.resultUrl} alt={asset.alt} loading="lazy" className="aspect-[4/5] w-full rounded-lg object-cover"/>:<div className="flex aspect-[4/5] items-center justify-center rounded-lg border border-dashed border-white/15 text-xs text-zinc-500">{step?.status==='error'?'Needs attention':'Awaiting image'}</div>}
        <figcaption className="mt-2 text-xs leading-relaxed text-zinc-400">{post.format==='carousel'?`${j+1}. `:''}{asset.alt}</figcaption>
      </figure>;})}</div>
    </details>)}</div>
  </section>;
}
