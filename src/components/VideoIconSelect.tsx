import type {ReactNode} from 'react';
export default function VideoIconSelect({label,value,options,onChange,icon,disabled=false}:{label:string;value:string;options:readonly {value:string;label:string}[];onChange:(value:string)=>void;icon:ReactNode;disabled?:boolean}){
 const selected=options.find(option=>option.value===value)?.label||value;
 return <label className={`video-icon-control ${disabled?'is-disabled':''}`} title={`${label}: ${selected}`}>{icon}<select aria-label={label} disabled={disabled} value={value} onChange={event=>onChange(event.target.value)}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
