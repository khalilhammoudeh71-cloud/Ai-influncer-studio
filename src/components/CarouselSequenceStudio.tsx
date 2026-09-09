import React,{useEffect,useRef,useState} from 'react';
import {Persona} from '../types';
import {CarouselSlide} from '../../shared/carousel';
import {SEQUENCE_STYLES,validateSequence} from '../../shared/carouselSequence';
import {authFetch,fetchAllModelTypes,canUseReference,generateImage,ModelInfo} from '../services/imageService';
import CarouselCoverBuilder from './CarouselCoverBuilder';
import {coverGenerationPrompt} from '../../shared/carouselCover';
import CarouselPhotoPicker from './CarouselPhotoPicker';
import {processImageFile} from '../utils/imageProcessing';

type Suggestions=ReturnType<typeof validateSequence>;
export default function CarouselSequenceStudio({persona,slides,format,onUpdate,onBusy,photos,selected,onSelect}:{selected:number;onSelect:(i:number)=>void;photos:string[];persona:Persona;slides:CarouselSlide[];format:'instagram'|'tiktok';onUpdate:(index:number,patch:Partial<CarouselSlide>)=>void;onBusy:(message:string)=>void}){
 const coverPrompt=slides[0]?.imagePrompt||'';
 const [style,setStyle]=useState<string>('same-shoot'),[instructions,setInstructions]=useState(''),[suggestions,setSuggestions]=useState<Suggestions>([]);
 const [models,setModels]=useState<ModelInfo[]>([]),[modelId,setModelId]=useState(''),[modelError,setModelError]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState('');
 const alive=useRef(true),cover=slides[0]?.image;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false};},[]);
 const loadModels=()=>{setModelError('');fetchAllModelTypes().then(c=>{if(!alive.current)return;const compatible=c.models.filter(m=>canUseReference(m,c.models));setModels(compatible);setModelId(old=>compatible.some(m=>m.id===old)?old:compatible[0]?.id||'');if(!compatible.length)setModelError('No reference-image models are currently available.');}).catch(()=>{if(alive.current)setModelError('Could not load your image models. Try again.');});};
 useEffect(loadModels,[]);
 useEffect(()=>{setSuggestions([]);setStatus('');setError('');},[cover,slides.length]);
 const coverReference=slides[0]?.coverReference||persona.referenceImage||persona.avatar||persona.alternateReferenceImage;
 const coverChoices=slides[0]?.coverChoices||{};
 const hasCoverIdea=!!coverPrompt.trim()||Object.values(coverChoices).some(Boolean);
 const generateCover=async()=>{
  if(!modelId||!hasCoverIdea)return;onBusy('Generating your cover photo…');setError('');setStatus('');
  try{
   const result=await generateImage({persona,modelId,referenceImage:coverReference||'',prompt:coverGenerationPrompt(coverPrompt,coverChoices),preservePromptVerbatim:true,isChatContext:true,identityLock:true,aspectRatio:format==='instagram'?'4:5':'9:16',count:1});
   const photo=Array.isArray(result)?result[0]:result;if(!photo?.imageUrl)throw new Error('No cover image returned.');
   if(alive.current){onUpdate(0,{image:photo.imageUrl,imagePrompt:coverPrompt,imageModel:modelId,layout:'full-photo',cropX:50,cropY:50,zoom:1});setSuggestions([]);setStatus('Cover generated. Request suggestions for your new cover next.');}
  }catch(e:any){if(alive.current)setError(e.message||'Could not generate the cover.');}finally{if(alive.current)onBusy('');}
 };
 const suggest=async()=>{
  if(!cover)return;onBusy('Planning photo sequence…');setError('');setStatus('');
  try{
   const r=await fetch(cover);if(!r.ok)throw new Error('Could not read the cover. Upload a local copy and try again.');
   const blob=await r.blob();const image=await processImageFile(new File([blob],'cover.jpg',{type:blob.type}));
   if(!alive.current)return;
   const response=await authFetch('/api/carousel-sequence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,count:slides.length,style,instructions})});
   const d=await response.json();if(!response.ok)throw new Error(d.error||'Could not suggest a sequence.');const valid=validateSequence(d,slides.length);
   if(alive.current){setSuggestions(valid);onSelect(1);valid.forEach(s=>onUpdate(s.slide,{imagePrompt:s.options[0].prompt}));setStatus('Suggestions are ready. Choose an option or edit the prompt for each slide.');}
  }catch(e:any){if(alive.current)setError(e.message);}finally{if(alive.current)onBusy('');}
 };
 const generate=async(indices:number[])=>{
  if(!cover||!modelId)return;setError('');setStatus('');const failures:string[]=[];let completed=0;
  for(const index of indices){
   if(!alive.current)break;
   const prompt=slides[index]?.imagePrompt?.trim();if(!prompt){failures.push(`Slide ${index+1}: add a photo prompt first.`);continue;}
   onBusy(`Generating photo ${completed+1} of ${indices.length} (slide ${index+1})…`);
   try{
    const result=await generateImage({persona,modelId,referenceImage:cover,prompt:`Use the attached cover as the visual reference. Preserve the same person's identity and a coherent photographic style. Follow these instructions for the next photo: ${prompt}. Produce one photograph, with no added text, watermarks, borders, or collage.`,preservePromptVerbatim:true,isChatContext:true,identityLock:true,aspectRatio:format==='instagram'?'4:5':'9:16',count:1});
    const photo=Array.isArray(result)?result[0]:result;if(!photo?.imageUrl)throw new Error('No image returned.');
    if(alive.current){onUpdate(index,{image:photo.imageUrl,imageModel:modelId,layout:'full-photo',cropX:50,cropY:50,zoom:1});completed++;}
   }catch(e:any){failures.push(`Slide ${index+1}: ${e.message||'Generation failed.'}`);}
  }
  if(alive.current){onBusy('');setStatus(`${completed} photo${completed===1?'':'s'} generated. Your cover is unchanged.`);setError(failures.join('\n'));}
 };
 const targets=slides.map((_,i)=>i).slice(1),ready=!!cover&&!!modelId&&targets.every(i=>slides[i].imagePrompt?.trim());
 return <section aria-label="Photo sequence generator" className="space-y-4 rounded-xl border border-[#E7C477]/40 p-4 sm:p-5">
  <div><h3 className="font-semibold text-lg">Create photos with AI</h3><p className="text-xs text-slate-400 mt-1">Use the cover to plan related photos, then generate them with your existing image models. Your cover stays unchanged. Each generated image uses API credits.</p></div>
  {selected===0&&<details className="rounded-lg border border-white/15 p-3"><summary className="cursor-pointer text-sm">Choose a different cover photo</summary><div className="mt-3"><CarouselPhotoPicker format={format} label="Cover photo" photos={photos} value={cover} onChange={image=>onUpdate(0,{image})}/></div></details>}
  {selected===0&&(cover?<img src={cover} alt="Sequence cover reference" className="w-28 h-32 object-cover rounded-lg"/>:<p className="text-sm text-amber-200">Choose a photo for the cover slide first.</p>)}
  <div className="grid sm:grid-cols-2 gap-4"><label className="text-xs">Sequence direction<select value={style} onChange={e=>setStyle(e.target.value)} className="luxury-input w-full p-3 mt-2">{SEQUENCE_STYLES.map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label><label className="text-xs">Image model<select value={modelId} onChange={e=>setModelId(e.target.value)} className="luxury-input w-full p-3 mt-2"><option value="" disabled>Choose an image model</option>{models.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select><span className="block text-slate-400 mt-2">Available models that support a reference image. Results and identity consistency vary by model.</span></label></div>
  {selected===0&&<div className="rounded-xl border border-white/15 p-4 space-y-3"><h4 className="font-semibold text-sm">Generate a new cover from a reference</h4><CarouselCoverBuilder format={format} reference={coverReference} photos={photos} choices={coverChoices} onReference={coverReference=>onUpdate(0,{coverReference})} onChoices={coverChoices=>onUpdate(0,{coverChoices})} onBusy={onBusy} onError={setError}/><label className="block text-xs">Cover photo prompt<textarea value={coverPrompt} onChange={e=>onUpdate(0,{imagePrompt:e.target.value})} maxLength={1800} rows={3} placeholder="A candid café portrait in warm morning light, wearing a cream jacket." className="luxury-input w-full mt-2 p-3"/></label><button type="button" disabled={!modelId||!hasCoverIdea} onClick={generateCover} className="btn-gold-secondary px-3 py-2 text-sm disabled:opacity-40">Generate cover image</button><p className="text-xs text-slate-400">Uses your selected model, generation reference, style choices, and prompt. Replaces the current cover photo.</p></div>}
  {modelError&&<p role="alert" className="text-sm text-red-300">{modelError} <button type="button" onClick={loadModels} className="underline">Reload models</button></p>}
  <label className="block text-xs">What should happen next? (optional)<textarea rows={2} maxLength={2000} value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Keep the outfit and café. Suggest a close-up, a wider view, then walking away." className="luxury-input w-full p-3 mt-2"/></label>
  <button type="button" disabled={!cover} onClick={suggest} className="btn-gold-secondary px-4 py-2 text-sm disabled:opacity-40">{suggestions.length?'Suggest more photo options':'Suggest next photos from cover'}</button>
  <p className="text-xs text-slate-400">Suggestions use Gemini. You can also write your own prompts below without requesting suggestions.</p>
  <div className="space-y-4">{targets.filter(i=>i===selected).map(i=><div key={i} className="rounded-xl border border-white/15 p-3 space-y-3"><div className="flex items-center gap-3">{slides[i].image&&<img src={slides[i].image} alt={`Current slide ${i+1}`} className="h-20 w-16 object-cover rounded-lg"/>}<h4 className="font-semibold text-sm">Slide {i+1}</h4></div>
   <div className="flex flex-wrap gap-2">{suggestions.find(s=>s.slide===i)?.options.map((o,n)=><button type="button" key={n} aria-pressed={slides[i].imagePrompt===o.prompt} onClick={()=>onUpdate(i,{imagePrompt:o.prompt})} className={`text-xs rounded-lg border px-3 py-2 ${slides[i].imagePrompt===o.prompt?'border-[#E7C477] text-[#E7C477]':'border-white/15'}`}>{o.title}</button>)}</div>
   <label className="block text-xs">Photo prompt for slide {i+1}<textarea maxLength={1800} rows={3} value={slides[i].imagePrompt||''} onChange={e=>onUpdate(i,{imagePrompt:e.target.value})} className="luxury-input w-full mt-2 p-3" placeholder="Describe the next shot, pose, setting, and what to keep from the cover."/></label>
   <button type="button" disabled={!cover||!modelId||!slides[i].imagePrompt?.trim()} onClick={()=>generate([i])} className="btn-gold-secondary px-3 py-2 text-xs disabled:opacity-40">Generate slide {i+1}</button>
  </div>)}</div>
  {selected===0&&<p className="text-sm text-slate-400">When your cover is ready, request suggestions or select another slide in the strip above to describe the next shot.</p>}
  <button type="button" disabled={!ready} onClick={()=>generate(targets)} className="btn-gold-primary px-4 py-3 text-sm disabled:opacity-40">Generate all {targets.length} following slides</button><p className="text-xs text-slate-400">Generation replaces each target slide’s photo. Successful photos remain if another slide fails. Slides generate one after another using the selected model; you can retry individual slides.</p>
  {status&&<p role="status" className="text-sm text-[#E7C477]">{status}</p>}{error&&<p role="alert" className="text-sm text-red-300 whitespace-pre-line">{error}</p>}
 </section>;
}
