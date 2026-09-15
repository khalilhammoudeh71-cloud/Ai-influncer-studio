import { personaVoiceIdentity, type SavedPersonaVoice } from '../../shared/personaVoiceLibrary';

interface Props {
  voices: SavedPersonaVoice[];
  current: Parameters<typeof personaVoiceIdentity>[0];
  onSelect: (voice: SavedPersonaVoice) => void;
  disabled?: boolean;
  actionLabel?: string;
}

export default function SavedPersonaVoices({ voices, current, onSelect, disabled, actionLabel = 'Select voice' }: Props) {
  return (
    <section aria-label="Saved persona voices" className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div>
        <h4 className="text-sm font-semibold text-white">Saved voices</h4>
        <p className="mt-1 text-xs text-slate-400">Every voice saved as this persona’s default stays here, with its recordings and settings, so you can switch back.</p>
      </div>
      {voices.length === 0 ? <p className="text-xs text-slate-400">Save a default voice to add it to this library.</p> : (
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {voices.map(voice => {
            const selected = personaVoiceIdentity(voice) === personaVoiceIdentity(current);
            return (
              <li key={voice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 p-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-white">{voice.name}</p>
                  <p className="mt-0.5 break-words text-xs text-slate-400">{voice.voiceEngine || 'Original voice'} · Saved {new Date(voice.savedAt).toLocaleDateString()}</p>
                </div>
                <button type="button" aria-label={`${actionLabel}: ${voice.name}`} aria-pressed={selected} disabled={disabled || selected} onClick={() => onSelect(voice)} className="shrink-0 rounded-lg border border-[#E7C477]/30 px-3 py-2 text-xs font-semibold text-[#E7C477] hover:bg-[#E7C477]/10 disabled:opacity-50">
                  {selected ? 'Selected' : actionLabel}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
