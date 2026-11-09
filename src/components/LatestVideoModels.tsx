import {useEffect,useMemo,useState} from 'react';
import {Film} from 'lucide-react';
import {latestVideoModels} from '../../shared/latestVideoModels';
import {modelCompany} from '../../shared/modelCompanies';
type Model={id:string;name:string;provider?:string;type?:string;description?:string};
export default function LatestVideoModels({models}:{models:Model[]}){
 const latest=useMemo(()=>latestVideoModels(models),[models]);const[index,setIndex]=useState(0);
 useEffect(()=>{if(latest.length<2||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const timer=setInterval(()=>setIndex(i=>(i+1)%latest.length),5500);return()=>clearInterval(timer)},[latest.length]);
 const model=latest[index%latest.length];
 return <section className="video-latest-models" aria-label="Latest available video models"><div><p className="video-latest-eyebrow">Latest available models</p><h2>{model?.name||'Loading video models…'}</h2>{model&&<p>{modelCompany(model)} · {model.type==='image-to-video'?'Animate an image':model.type==='video-to-video'?'Edit a video':'Create a video from text'}</p>}<div className="video-latest-dots">{latest.map((m,i)=><button type="button" key={m.id} aria-label={`Show ${m.name}`} aria-pressed={index%latest.length===i} title={m.name} onClick={()=>setIndex(i)}/>)}</div></div><Film size={64} strokeWidth={.8} aria-hidden="true"/></section>;
}
