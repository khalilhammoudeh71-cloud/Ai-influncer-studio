import { useState } from 'react';
import { VOICE_CLONING_CATALOG, VOICE_CATALOG_NOTES } from '../../shared/voiceCloningCatalog';
import { voiceSamplePolicy, type VoiceCloningModel } from '../../shared/voiceCloningModels';

export function VoiceModelPicker({ selected, disabled, onSelect }: { selected: VoiceCloningModel; disabled: boolean; onSelect: (model: VoiceCloningModel) => void }) {
  const [query, setQuery] = useState('');
  const models = VOICE_CLONING_CATALOG.filter(model => `${model.name} ${model.provider} ${model.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  const providers = [...new Set(models.map(model => model.provider))];
  return <details className="relative rounded-xl border border-white/10 bg-[#0E0E10]" onKeyDown={event => { if (event.key === 'Escape') event.currentTarget.open = false; }}>
    <summary id="voice-model" aria-label="Choose voice model" className="cursor-pointer p-3 text-sm text-white">
      <span className="font-semibold">{selected.name}</span>
      <span className="mt-1 block text-xs text-slate-400">{voiceSamplePolicy(selected).label} · Browse {VOICE_CLONING_CATALOG.length} options</span>
    </summary>
    <div className="border-t border-white/10 p-3">
      <input type="search" aria-label="Search voice models and providers" placeholder="Search models or providers…" value={query} onChange={event => setQuery(event.target.value)} className="luxury-input mb-2 w-full p-2 text-sm" />
      <p className="mb-2 text-xs text-slate-400">Choose a connected model, or inspect other provider options below.</p>
      <div className="max-h-80 overflow-auto" aria-label="Voice model catalog">
        {providers.map(provider => <section key={provider} aria-label={provider}>
          <h5 className="sticky top-0 bg-[#0E0E10] px-2 py-2 text-xs font-semibold text-[#E7C477]">{provider}</h5>
          {models.filter(model => model.provider === provider).map(model => <div key={model.id} className="mb-1 rounded-lg border border-white/5 p-2">
            {model.kind === 'unavailable' ? <p className="text-sm font-semibold text-white">{model.name}</p> : <button type="button" disabled={disabled} aria-pressed={selected.id === model.id} className="w-full text-left text-sm font-semibold text-white hover:text-[#E7C477] disabled:opacity-50" onClick={event => { onSelect(model); event.currentTarget.closest('details')?.removeAttribute('open'); }}>{selected.id === model.id ? '✓ ' : ''}{model.name}</button>}
            <p className="mt-1 text-xs text-[#E7C477]">{model.availability || (model.kind === 'unavailable' ? 'Not connected in this app' : model.kind === 'preset' ? 'Preset voices · not cloning' : model.kind === 'singing' ? 'Connected · singing only' : 'Connected in this app')}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{model.description}</p>
            {model.documentation && <a className="mt-1 inline-block text-xs text-[#E7C477] underline" href={model.documentation} target="_blank" rel="noopener noreferrer">Provider details<span className="sr-only"> for {model.name} (opens a new tab)</span></a>}
          </div>)}
        </section>)}
        {!models.length && <p className="p-3 text-sm text-slate-400">No matching voice models.</p>}
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">{VOICE_CATALOG_NOTES.map(note => <p key={note} className="text-xs leading-relaxed text-slate-400">{note}</p>)}</div>
      </div>
    </div>
  </details>;
}
