import React from 'react';
import {CarouselSlide,CarouselLayout} from '../../shared/carousel';
export const LAYOUTS:{id:CarouselLayout;name:string;description:string}[]=[
 {id:'editorial',name:'Mini guide',description:'A photo followed by a clear headline and useful advice.'},
 {id:'full-photo',name:'Photo diary',description:'Full-frame photos with your story on top.'},
 {id:'scrapbook',name:'Scrapbook',description:'Two tilted photo prints on a shared background.'},
 {id:'split',name:'Side by side',description:'Compare two looks, moments, or before-and-after photos.'},
 {id:'panorama',name:'Seamless panorama',description:'One wide photo continues across every swipe.'},
 {id:'minimal',name:'Bold text',description:'A clean text-led story, ranking, or list of tips.'}
];
export default function CarouselDesignControls({slide,photos,onChange,onPanorama}:{slide:CarouselSlide;photos:string[];onChange:(s:Partial<CarouselSlide>)=>void;onPanorama:()=>void}){
 return <section className="space-y-4 rounded-xl border border-white/15 p-4" aria-label="Slide styling"><h3 className="font-semibold">Style this slide</h3>
 <label className="block text-xs">Layout<select className="luxury-input w-full mt-2 p-3" value={slide.layout||'editorial'} onChange={e=>onChange({layout:e.target.value as CarouselLayout})}>{LAYOUTS.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
 {(slide.layout==='split'||slide.layout==='scrapbook')&&<label className="block text-xs">Second photo<select className="luxury-input w-full mt-2 p-3" value={slide.secondImage||''} onChange={e=>onChange({secondImage:e.target.value||undefined})}><option value="">Repeat first photo</option>{photos.map((p,i)=><option value={p} key={p}>Photo {i+1}</option>)}{slide.secondImage&&!photos.includes(slide.secondImage)&&<option value={slide.secondImage}>Saved second photo</option>}</select></label>}
 {(['cropX','cropY','zoom','textScale'] as const).map(k=><label key={k} className="block text-xs">{{cropX:'Photo horizontal position',cropY:'Photo vertical position',zoom:'Photo zoom',textScale:'Text size'}[k]}<input className="block w-full mt-2 accent-[#E7C477]" type="range" min={k==='zoom'?1:k==='textScale'?.7:0} max={k==='zoom'?3:k==='textScale'?1.3:100} step={k==='zoom'||k==='textScale'?.05:1} value={slide[k]??(k==='zoom'||k==='textScale'?1:50)} onChange={e=>onChange({[k]:+e.target.value})}/></label>)}
 <div className="grid grid-cols-2 gap-3"><label className="text-xs">Text alignment<select className="luxury-input w-full mt-2 p-2" value={slide.align||'left'} onChange={e=>onChange({align:e.target.value as 'left'|'center'})}><option value="left">Left</option><option value="center">Centered</option></select></label><label className="text-xs">Font<select className="luxury-input w-full mt-2 p-2" value={slide.font||'serif'} onChange={e=>onChange({font:e.target.value as 'serif'|'sans'})}><option value="serif">Editorial serif</option><option value="sans">Clean sans serif</option></select></label></div>
 {(slide.layout==='full-photo'||slide.layout==='panorama')&&<label className="block text-xs">Text position<select className="luxury-input w-full mt-2 p-2" value={slide.textPosition||'middle'} onChange={e=>onChange({textPosition:e.target.value as 'top'|'middle'|'bottom'})}><option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option></select></label>}
 {slide.layout==='panorama'&&<><p className="text-xs text-slate-400">Use a wide landscape image. Apply the same image and crop across all slides to keep the panorama continuous.</p><button type="button" disabled={!slide.image} className="btn-gold-secondary px-3 py-2 text-xs" onClick={onPanorama}>Apply this panorama to every slide</button></>}
 </section>;
}
