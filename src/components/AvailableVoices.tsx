import { useState } from 'react';
import { Check, Loader2, Play, Square } from 'lucide-react';
import { STOCK_VOICES, voiceFilterLabel, type StockVoice } from '../../shared/stockVoices';
import { uniqueVoices } from '../utils/voiceSetupReadiness';

export type AvailableVoice = StockVoice & { sampleUrl?: string };
export type VoicePreviewState = { key: string; status: 'loading' | 'playing' | 'error'; message?: string };
const filterLabel = (key: string, value: string) => key === 'provider' ? value : voiceFilterLabel(value);
export default function AvailableVoices({ voices, selectedId, selectedEngine, onSelect, onListen, preview, disabled }: {
  voices: AvailableVoice[]; selectedId: string; selectedEngine: string; onSelect(voice: AvailableVoice): void;
  onListen(voice: AvailableVoice): void; preview?: VoicePreviewState | null; disabled: boolean;
}) {
  const [filters, setFilters] = useState({ provider: '', gender: '', accent: '', tone: '' });
  const [search, setSearch] = useState('');
  const all = uniqueVoices<AvailableVoice>([...voices, ...STOCK_VOICES]);
  const visible = all.filter(v => Object.entries(filters).every(([k, value]) => !value || filterLabel(k, v[k as keyof typeof filters]) === value)
    && `${v.name} ${v.provider} ${v.tone} ${v.accent}`.toLowerCase().includes(search.trim().toLowerCase()));
  const resetFilters = () => { setFilters({ provider: '', gender: '', accent: '', tone: '' }); setSearch(''); };
  return <div className="space-y-3">
    <input aria-label="Search available voices" placeholder="Search voices" value={search} onChange={e => setSearch(e.target.value)} className="luxury-input min-h-11 w-full p-3 text-sm" />
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{(Object.keys(filters) as Array<keyof typeof filters>).map(key => <label key={key} className="text-xs capitalize text-slate-400">{key}<select aria-label={`Filter voices by ${key}`} className="luxury-input mt-1 min-h-11 w-full p-2 text-sm" value={filters[key]} onChange={e => setFilters({ ...filters, [key]: e.target.value })}><option value="">All</option>{[...new Set(all.map(v => filterLabel(key, v[key])))].sort().map(value => <option key={value}>{value}</option>)}</select></label>)}</div>
    <p className="text-xs leading-relaxed text-slate-400">Listen without changing your selection. Samples are prerecorded; generated auditions use your preview text and may use provider credits.</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visible.map(v => {
      const key = `${v.engine}:${v.id}`;
      const selected = selectedId === v.id && selectedEngine === v.engine;
      const state = preview?.key === key ? preview : null;
      const playing = state?.status === 'playing', loading = state?.status === 'loading';
      return <article key={`${v.provider}:${v.id}`} className={`flex min-w-0 flex-col rounded-xl border p-3 ${selected ? 'border-[#E7C477] bg-[#E7C477]/10' : 'border-white/10 bg-[#0E0E10]'}`}>
        <h4 className="text-sm font-semibold text-white">{v.name}</h4>
        <p className="mt-1 text-xs text-[#E7C477]">{v.provider} voice</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{[v.gender, v.accent, v.tone].filter(x => x !== 'Not specified').join(' · ') || 'Stock voice'}</p>
        <p className="mt-1 text-xs text-slate-400">Compatible with {v.provider} speech</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <button type="button" disabled={disabled} onClick={() => onListen(v)} aria-label={`${loading ? 'Cancel audition for' : playing ? 'Stop' : state?.status === 'error' ? 'Retry listening to' : 'Listen to'} ${v.name}`} className="flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs text-zinc-200 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[#E7C477] disabled:opacity-40">
            {loading ? <Loader2 size={15} className="animate-spin" /> : playing ? <Square size={15} /> : <Play size={15} />}
            {loading ? 'Cancel' : playing ? 'Stop' : state?.status === 'error' ? 'Retry' : v.sampleUrl ? 'Listen sample' : 'Generate audition'}
          </button>
          <button type="button" disabled={disabled} onClick={() => onSelect(v)} aria-pressed={selected} className="flex min-h-11 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-[#E7C477] hover:bg-[#E7C477]/10 focus-visible:ring-2 focus-visible:ring-[#E7C477] disabled:opacity-40">{selected && <Check size={15} />}{selected ? 'Selected' : 'Select'}</button>
        </div>
        {state?.status === 'error' && <p role="alert" className="mt-2 text-xs leading-relaxed text-amber-300">{state.message || 'Sample unavailable. Try again.'}</p>}
      </article>;
    })}</div>
    {!visible.length && <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-400"><p>No voices match these filters.</p><button type="button" onClick={resetFilters} className="mt-2 min-h-11 text-[#E7C477] underline">Reset filters</button></div>}
  </div>;
}
