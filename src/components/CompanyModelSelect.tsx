import {Children,isValidElement,useEffect,useId,useMemo,useRef,useState,type ChangeEvent,type ReactNode,type SelectHTMLAttributes} from 'react';
import {createPortal} from 'react-dom';
import {ChevronDown,Check,X,Search} from 'lucide-react';
import {groupCompanyModels,modelCompany,type CompanyModel} from '../../shared/modelCompanies';
import './CompanyModelSelect.css';
function text(node:ReactNode):string{return Children.toArray(node).map(child=>isValidElement<{children?:ReactNode}>(child)?text(child.props.children):String(child)).join('')}
export function companyOptions(children:ReactNode,provider?:string):CompanyModel[]{
 return Children.toArray(children).flatMap(child=>{
  if(!isValidElement<{children?:ReactNode;value?:string|number;disabled?:boolean;label?:string}>(child))return[];
  if(child.type==='option')return[{id:String(child.props.value??text(child.props.children)),name:text(child.props.children).replace(/^\d+\.\s*/,''),disabled:child.props.disabled,provider}];
  return companyOptions(child.props.children,child.type==='optgroup'?child.props.label:provider);
 });
}
type Props=SelectHTMLAttributes<HTMLSelectElement>&{items?:CompanyModel[];pickerLabel?:string};
export default function CompanyModelSelect({children,items,value,defaultValue,onChange,disabled,className,id,pickerLabel,...props}:Props){
 const choices=useMemo(()=>items||companyOptions(children),[items,children]);
 const [uncontrolled,setUncontrolled]=useState(String(defaultValue??'')),[open,setOpen]=useState(false),[query,setQuery]=useState(''),[company,setCompany]=useState('');
 const selected=String(value??uncontrolled),current=choices.find(m=>m.id===selected);
 const dialog=useRef<HTMLDialogElement>(null),modelList=useRef<HTMLElement>(null),trigger=useRef<HTMLButtonElement>(null),uid=useId();
 const dataProps=Object.fromEntries(Object.entries(props).filter(([key])=>key.startsWith('data-')));
 const label=pickerLabel||props['aria-label']||props.title||'Choose model';
 const defaults=choices.filter(m=>m.id===''&&!m.disabled||/^(default|auto|automatic)$/i.test(m.id)||/^default\b|^.*automatic\b/i.test(m.name));
 const defaultIds=new Set(defaults.map(m=>m.id));
 const groups=groupCompanyModels(choices.filter(m=>!(m.id===''&&m.disabled)&&!defaultIds.has(m.id)&&`${m.name} ${m.provider||''} ${modelCompany(m)} ${m.description||''}`.toLowerCase().includes(query.toLowerCase())));
 const active=groups.find(g=>g.company===company)||groups[0];
 useEffect(()=>{if(open){setCompany(current&&!defaultIds.has(current.id)?modelCompany(current):'');setQuery('');dialog.current?.showModal()}return()=>{dialog.current?.close()}},[open]);
 useEffect(()=>{if(modelList.current)modelList.current.scrollTop=0},[active?.company,query]);
 function close(){dialog.current?.close();setOpen(false);trigger.current?.focus()}
 function choose(item:CompanyModel){if(item.disabled||disabled)return;setUncontrolled(item.id);onChange?.({target:{value:item.id},currentTarget:{value:item.id}} as ChangeEvent<HTMLSelectElement>);close()}
 return <>
  <button {...dataProps} ref={trigger} id={id} type="button" disabled={disabled} className={`${className||''} company-model-trigger`} aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-describedby={[props['aria-describedby'],`${uid}-value`].filter(Boolean).join(' ')} aria-haspopup="dialog" aria-expanded={open} title={props.title||current?.name} onClick={()=>setOpen(true)}><span id={`${uid}-value`}>{current?.name||'Choose model'}</span><ChevronDown size={14} aria-hidden="true"/></button>
  {open&&createPortal(<dialog ref={dialog} aria-labelledby={`${uid}-title`} className="company-model-dialog" onCancel={event=>{event.preventDefault();close()}} onClose={()=>setOpen(false)}>
   <header><h2 id={`${uid}-title`}>{label}</h2><button type="button" onClick={close} aria-label="Close model picker"><X size={20}/></button></header>
   <div className="company-model-search"><Search size={16}/><input type="search" aria-label="Search companies or models" placeholder="Search companies or models" value={query} onChange={e=>setQuery(e.target.value)}/></div>
   {defaults.length>0&&<div className="company-model-defaults">{defaults.map(m=><button type="button" key={m.id} disabled={m.disabled} aria-pressed={selected===m.id} onClick={()=>choose(m)}><span>{m.name}</span>{selected===m.id&&<Check size={16}/>}</button>)}</div>}
   <div className="company-model-columns">
    <nav aria-label="Model companies">{groups.map(g=><button type="button" key={g.company} aria-pressed={active?.company===g.company} onClick={()=>setCompany(g.company)}>{g.company}<span>{g.models.length}</span></button>)}</nav>
    <section ref={modelList} aria-label={active?`${active.company} models`:'Models'}><h3>{active?.company||'Models'}</h3>{active?.models.map(m=><article key={m.id}><button type="button" aria-label={m.name} disabled={m.disabled} aria-pressed={selected===m.id} onClick={()=>choose(m)}><span>{m.name}</span>{selected===m.id&&<Check size={16}/>}<small>{m.detail||m.provider||''}{m.disabled?' · Unavailable':''}</small>{m.description&&<p>{m.description}</p>}</button>{m.documentation&&<a href={m.documentation} target="_blank" rel="noopener noreferrer">Provider details</a>}</article>)}{!active&&<p className="company-model-empty">No matching models.</p>}</section>
   </div>
  </dialog>,document.body)}
 </>;
}
