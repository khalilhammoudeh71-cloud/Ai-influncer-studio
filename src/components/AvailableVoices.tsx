import { useState } from 'react';
import { STOCK_VOICES, voiceFilterLabel, type StockVoice } from '../../shared/stockVoices';
const filterLabel = (key: string, value: string) => key === 'provider' ? value : voiceFilterLabel(value);
export default function AvailableVoices({voices,selectedId,selectedEngine,onSelect,disabled}:{voices:StockVoice[];selectedId:string;selectedEngine:string;onSelect:(voice:StockVoice)=>void;disabled:boolean}) {
 const [filters,setFilters]=useState({provider:'',gender:'',accent:'',tone:''});const [search,setSearch]=useState('');
 const all=[...voices,...STOCK_VOICES];
 const visible=all.filter(v=>Object.entries(filters).every(([k,value])=>!value||filterLabel(k,v[k as keyof typeof filters])===value)&&`${v.name} ${v.provider} ${v.tone}`.toLowerCase().includes(search.toLowerCase()));
 return <div className="space-y-3">
 <input aria-label="Search available voices" placeholder="Search voices" value={search} onChange={e=>setSearch(e.target.value)} className="luxury-input w-full p-3 text-sm"/>
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">{(Object.keys(filters) as Array<keyof typeof filters>).map(key=><label key={key} className="text-xs capitalize text-slate-400">{key}<select aria-label={`Filter voices by ${key}`} className="luxury-input mt-1 w-full p-2 text-xs" value={filters[key]} onChange={e=>setFilters({...filters,[key]:e.target.value})}><option value="">All</option>{[...new Set(all.map(v=>filterLabel(key,v[key])))].sort().map(value=><option key={value}>{value}</option>)}</select></label>)}</div>
 <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">{visible.map(v=><button type="button" disabled={disabled} key={`${v.engine}:${v.id}`} onClick={()=>onSelect(v)} aria-pressed={selectedId===v.id&&selectedEngine===v.engine} className={`rounded-xl border p-3 text-left ${selectedId===v.id&&selectedEngine===v.engine?'border-[#E7C477] bg-[#E7C477]/10':'border-white/10 bg-[#0E0E10]'}`}><span className="block text-sm font-semibold text-white">{v.name}</span><span className="block text-xs text-[#E7C477]">{v.provider}</span><span className="block text-xs text-slate-400">{[v.gender,v.accent,v.tone].filter(x=>x!=='Not specified').join(' · ')||'Stock voice'}</span></button>)}</div>
 {!visible.length&&<p className="text-sm text-slate-400">No voices match these filters.</p>}
 </div>;
}
