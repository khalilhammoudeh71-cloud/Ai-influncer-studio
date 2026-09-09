import React from 'react';
export default function CarouselPhotoPicker({label,photos,value,onChange,emptyLabel='No photo',format='instagram'}:{format?:'instagram'|'tiktok';label:string;photos:string[];value?:string;onChange:(value:string|undefined)=>void;emptyLabel?:string}){
 const ratio=format==='instagram'?'4 / 5':'9 / 16';
 const choices=[...new Set([...photos,...(value?[value]:[])])];
 return <fieldset className="space-y-2 min-w-0"><legend className="text-xs text-slate-300 mb-2">{label}</legend><div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1">
 <button type="button" style={{aspectRatio:ratio}} aria-pressed={!value} onClick={()=>onChange(undefined)} className={`rounded-lg border p-2 text-xs ${!value?'border-[#E7C477] text-[#E7C477]':'border-white/15 text-slate-300'}`}>{emptyLabel}</button>
 {choices.map((url,i)=><button type="button" key={url} style={{aspectRatio:ratio,borderWidth:0,outline:value===url?'2px solid #E7C477':undefined,outlineOffset:-2}} aria-label={`${label}: photo ${i+1}`} aria-pressed={value===url} onClick={()=>onChange(url)} className={`relative rounded-lg border-2 overflow-hidden ${value===url?'border-[#E7C477]':'border-transparent'}`}><img loading="lazy" src={url} alt={`Photo ${i+1}`} className="absolute inset-0 w-full h-full object-cover"/><span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-xs py-1">{value===url?'✓ Selected':`Photo ${i+1}`}</span></button>)}
 </div></fieldset>;
}
