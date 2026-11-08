import {useEffect,useRef,useState} from 'react';
import type {Persona} from '../types';
import {api} from '../services/apiService';
import {changePrimaryReference,primaryReferencePhotos} from '../../shared/personaPrimaryReference';
import {isTemporaryBrowserMedia,isWorkspaceMediaReference} from '../services/workspaceMediaService';
export default function PersonaPrimaryReferenceDialog({persona,onClose,onSaved}:{persona:Persona;onClose:()=>void;onSaved:(persona:Persona)=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [selected,setSelected]=useState(persona.referenceImage||persona.avatar||'');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const photos=primaryReferencePhotos(persona).filter(url=>!isTemporaryBrowserMedia(url)&&!isWorkspaceMediaReference(url));
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[]);
 const save=async()=>{
  if(busy||!selected||selected===(persona.referenceImage||persona.avatar))return;
  setBusy(true);setError('');
  try{
   const updated=changePrimaryReference(persona,selected);
   const saved=await api.personas.update({...updated,faceDescriptor:undefined});
   const confirmed={...updated,...saved} as Persona;
   onSaved(confirmed);
   window.dispatchEvent(new CustomEvent('persona-updated',{detail:confirmed}));
   window.dispatchEvent(new CustomEvent('personas-refresh'));
   onClose();
  }catch(err){setError(err instanceof Error?err.message:'Could not save the reference photo. Try again.');setBusy(false)}
 };
 return <dialog ref={dialog} aria-labelledby="primary-reference-title" onCancel={e=>{if(busy)e.preventDefault();else onClose()}} onClose={onClose} className="persona-primary-dialog">
  <header><h2 id="primary-reference-title">Change reference photo</h2><button type="button" disabled={busy} onClick={onClose}>Close</button></header>
  <p>Choose a photo from {persona.name}’s library. This becomes their main identity reference for future generations. Your previous photo stays in the library.</p>
  <div className="persona-primary-grid" role="group" aria-label="Persona library photos">{photos.map((url,index)=><button type="button" key={url} disabled={busy} aria-pressed={selected===url} aria-label={`Use library photo ${index+1}`} onClick={()=>setSelected(url)}><img src={url} alt={`Library photo ${index+1}`} onError={e=>{e.currentTarget.closest('button')!.disabled=true; if(selected===url)setSelected('')}}/><span>{selected===url?'Selected':url===persona.referenceImage?'Current reference':'Choose photo'}</span></button>)}</div>
  {!photos.length&&<p>No saved photos yet. Add photos to this persona’s library first.</p>}
  {error&&<p role="alert">{error}</p>}
  <footer><span>This updates the saved persona.</span><button type="button" className="btn-gold-primary" disabled={busy||!selected||selected===(persona.referenceImage||persona.avatar)} onClick={()=>void save()}>{busy?'Saving…':'Use as reference'}</button></footer>
 </dialog>;
}
