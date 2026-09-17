import { useState, type ReactNode } from 'react';
import { X, SlidersHorizontal, Brain, RotateCcw } from 'lucide-react';
import { CALL_MODES, CALL_DIALECTS, type CallPreferences } from '../../shared/voiceCallPreferences';

export type ControlChoice = { id: string; name: string; disabled?: boolean };
export function ControlSelect({label,value,onChange,choices,disabled=false}:{label:string;value:string;onChange:(v:string)=>void;choices:ControlChoice[];disabled?:boolean}) {
  return <label className="block min-w-0 text-sm text-zinc-300">{label}<select aria-label={label} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)} className="mt-2 min-h-11 w-full min-w-0 rounded-xl border border-white/10 bg-[#151515] px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#E7C477]/60 disabled:opacity-50">{choices.map(c=><option key={c.id} value={c.id} disabled={c.disabled}>{c.name}</option>)}</select></label>;
}
export function SpeechAccuracySetting({enabled,onChange}:{enabled:boolean;onChange:(v:boolean)=>void}) {
  return <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-white/[0.04] p-3 text-sm text-zinc-100"><span>Recheck speech for accuracy<span className="mt-1 block max-w-sm text-xs leading-relaxed text-zinc-400">Studio calls only. Adds a short pause to recheck your words before replying. Direct provider calls use the provider’s recognition.</span></span><input type="checkbox" checked={enabled} onChange={e=>onChange(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[#E7C477]"/></label>;
}
export function CallLanguageControls({value,onChange}:{value:CallPreferences;onChange:(v:CallPreferences)=>void}) {
  return <div className="space-y-3"><div className="grid grid-cols-2 gap-3">
    <ControlSelect label="Starting language" value={value.mode} onChange={mode=>onChange({...value,mode:mode as CallPreferences['mode']})} choices={CALL_MODES.map(m=>({id:m.id,name:m.label}))}/>
    {value.mode.startsWith('english')?<ControlSelect label="English accent" value={value.englishAccent||'natural'} onChange={englishAccent=>onChange({...value,englishAccent:englishAccent as CallPreferences['englishAccent']})} choices={['natural','american','british','australian','arabic'].map(id=>({id,name:id==='natural'?'Voice’s natural accent':id[0].toUpperCase()+id.slice(1)}))}/>:<ControlSelect label="Arabic accent" value={value.dialect} onChange={dialect=>onChange({...value,dialect:dialect as CallPreferences['dialect']})} choices={CALL_DIALECTS.map(d=>({id:d.id,name:d.label}))}/> }
  </div><label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-zinc-300">Switch language or accent by voice<input type="checkbox" checked={value.allowLanguageSwitching} onChange={e=>onChange({...value,allowLanguageSwitching:e.target.checked})} className="size-5 accent-[#E7C477]"/></label><p className="text-xs leading-relaxed text-zinc-400">Try “Speak French” or “احكي باللهجة السورية”. Your saved voice stays the same; accent fidelity depends on the voice and engine.</p></div>;
}
type Props = {
  personaName:string; voiceName:string; initialTab?:'conversation'|'voice'|'memory';
  onClose():void; mode:string; onMode(v:'chat'|'replies'):void;
  model:string; onModel(v:string):void; models:ControlChoice[];
  engine:string; onEngine(v:string):void; engines:ControlChoice[];
  preferences:CallPreferences; onPreferences(v:CallPreferences):void;
  accuracy:boolean; onAccuracy(v:boolean):void;
  pronunciations:ReactNode; alternatives:ReactNode; media:ReactNode;
  remix?:ReactNode; dialectTeaching?:ReactNode;
  onMemory():void; onNewConversation():void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'pending' | 'error';
  saveMessage?: string; onRetrySave?():void;
};
export function PersonaControls(p:Props) {
  const [tab,setTab]=useState(p.initialTab||'conversation');
  const [voicePanel,setVoicePanel]=useState<'settings'|'teaching'|'remix'>('settings');
  const tabs=[['conversation','Conversation'],['voice','Voice'],['memory','Memory']] as const;
  return <section className="flex max-h-[min(680px,90dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#1b1b1b] text-zinc-100 shadow-2xl">
    <header className="flex shrink-0 items-center justify-between gap-4 px-5 pb-4 pt-5 sm:px-6"><div><p className="mb-1 text-xs text-[#E7C477]">{p.personaName}</p><h2 className="flex items-center gap-2 text-xl font-semibold"><SlidersHorizontal size={18}/>Settings / Controls</h2></div><button type="button" aria-label="Close settings" onClick={p.onClose} className="flex size-11 items-center justify-center rounded-full text-zinc-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7C477]"><X size={20}/></button></header>
    <div role="tablist" aria-label="Settings sections" className="mx-5 mb-4 grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-black/25 p-1 sm:mx-6">
      {tabs.map(([id,label],index)=><button key={id} id={`controls-${id}`} role="tab" aria-selected={tab===id} aria-controls="persona-controls-content" tabIndex={tab===id?0:-1} onClick={()=>setTab(id)} onKeyDown={e=>{let next=index;if(e.key==='ArrowRight')next=(index+1)%3;else if(e.key==='ArrowLeft')next=(index+2)%3;else if(e.key==='Home')next=0;else if(e.key==='End')next=2;else return;e.preventDefault();setTab(tabs[next][0]);document.getElementById(`controls-${tabs[next][0]}`)?.focus();}} className={`min-h-11 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7C477] ${tab===id?'bg-[#33312b] text-[#E7C477]':'text-zinc-400 hover:text-zinc-100'}`}>{label}</button>)}
    </div>
    <div role="tabpanel" id="persona-controls-content" aria-labelledby={`controls-${tab}`} className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
      {tab==='conversation'&&<div className="space-y-5">
        <ControlSelect label="Conversation mode" value={p.mode} onChange={v=>p.onMode(v as 'chat'|'replies')} choices={[{id:'chat',name:'Chat with your persona'},{id:'replies',name:'Draft auto replies'}]}/>
        <ControlSelect label="Conversation model" value={p.model} onChange={p.onModel} choices={p.models}/>
        <details className="rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-sm text-zinc-300">Image & video models</summary><div className="mt-4 space-y-3">{p.media}</div></details>
      </div>}
      {tab==='voice'&&<div className="space-y-3"><div aria-label="Voice tools" className="sticky top-0 z-10 grid grid-cols-3 gap-2 bg-[#1b1b1b] pb-2">{([['settings','Voice settings'],['teaching','Teach dialect'],['remix','Remix voice']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={voicePanel===id} onClick={()=>setVoicePanel(id)} className={`min-h-12 rounded-xl border px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7C477] ${voicePanel===id?'border-[#E7C477]/40 bg-[#E7C477]/15 text-[#E7C477]':'border-white/10 text-zinc-300 hover:bg-white/5'}`}>{label}</button>)}</div>{voicePanel==='teaching'&&p.dialectTeaching}{voicePanel==='remix'&&p.remix}{voicePanel==='settings'&&<>
        <p className="text-xs leading-relaxed text-zinc-400">Studio call · speech recheck available</p>
        <ControlSelect label="Voice engine" value={p.engine} onChange={p.onEngine} choices={p.engines}/>
        <p className="text-xs leading-relaxed text-zinc-400">Selected voice: {p.voiceName}. Changing the engine does not start or reconnect a call.</p>
        <CallLanguageControls value={p.preferences} onChange={p.onPreferences}/>
        <SpeechAccuracySetting enabled={p.accuracy} onChange={p.onAccuracy}/>
        {p.pronunciations}
        <details className="rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-sm text-zinc-300">Direct provider calls</summary><p className="my-3 text-xs leading-relaxed text-zinc-400">Provider recognition · the studio recheck setting does not apply. Choose a provider and save its settings before connecting.</p>{p.alternatives}</details>
      </>} </div>}
      {tab==='memory'&&<div className="space-y-4"><p className="text-sm leading-relaxed text-zinc-400">Choose what {p.personaName} remembers, or start a fresh conversation.</p><button type="button" onClick={p.onMemory} className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-white/5 p-4 text-left text-sm hover:bg-white/10"><Brain size={18} className="text-[#E7C477]"/><span>Manage memories<span className="mt-1 block text-xs text-zinc-400">Review, add, or forget saved details.</span></span></button><button type="button" onClick={p.onNewConversation} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-white/10 p-4 text-left text-sm hover:bg-white/5"><RotateCcw size={18}/><span>Start a fresh conversation<span className="mt-1 block text-xs text-zinc-400">Clear this chat. Saved memories stay available.</span></span></button></div>}
    </div>
    <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-white/10 px-5 py-3 sm:px-6"><div role="status" aria-live="polite" className={`text-xs ${p.saveStatus==='error'?'text-amber-300':'text-zinc-400'}`}>{p.saveMessage || ({idle:'Settings apply as you change them.',saving:'Saving settings…',saved:'Settings saved.',pending:'Saved locally · sync pending.',error:'Settings could not be saved. Your choices remain here.'}[p.saveStatus || 'idle'])}{(p.saveStatus==='error'||p.saveStatus==='pending')&&p.onRetrySave&&<button type="button" onClick={p.onRetrySave} className="ml-2 min-h-11 text-[#E7C477] underline">Retry save</button>}</div><button type="button" onClick={p.onClose} className="min-h-11 shrink-0 rounded-xl bg-[#E7C477] px-6 text-sm font-semibold text-[#19160f] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Done</button></footer>
  </section>;
}
