import {useEffect,useRef} from 'react';
import type {MediaJob} from '../services/mediaJobService';
import {mediaQualityLabel} from '../../shared/mediaQualityLabel';
export default function MediaResultPreview({job,onClose}:{job:MediaJob|null;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current;const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;if(job&&dialog&&!dialog.open)dialog.showModal();return ()=>{dialog?.close();if(previous?.isConnected)previous.focus();};},[job]);
 if(!job?.result?.url)return null;
 const result=job.result;
 const video=result.type==='video'||job.kind==='video'||job.kind==='avatar';
 return <dialog ref={ref} aria-label="Generation preview" onKeyDown={e=>{if(e.key==='Escape')e.stopPropagation();}} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}} className="m-auto w-[min(94vw,1000px)] max-h-[94dvh] overflow-auto rounded-2xl border border-white/20 bg-[#17191c] p-4 text-white backdrop:bg-black/80">
  <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{video?'Video':'Image'} preview</h2><button type="button" autoFocus onClick={onClose} className="rounded-lg bg-[#edca7b] px-4 py-2 font-semibold text-black">Close — back to generations</button></div>
  {video?<video key={result.url} src={result.url} controls playsInline preload="metadata" className="mx-auto max-h-[70dvh] w-full rounded-lg"/>:<img src={result.url} alt="Generated result" className="mx-auto max-h-[70dvh] max-w-full rounded-lg object-contain"/>}
  {result.quality&&<p className="mt-3 text-sm">{mediaQualityLabel(result.quality,result.qualityRetried)}</p>}
  <p className="mt-2 text-xs text-slate-400">Use Close or Escape to return. Your result remains saved.</p>
 </dialog>;
}
