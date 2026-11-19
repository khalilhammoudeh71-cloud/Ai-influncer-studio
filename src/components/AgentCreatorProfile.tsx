import { useState } from 'react';
import { creatorProfileFields, maxShotPresets, readCreatorProfile, readShotPresets, shotAspectRatios, type CreatorProfile, type CustomShotPreset } from '../../shared/agentCreatorProfile';

const fieldClass = 'mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-black/25 px-2 py-1.5 text-zinc-100';

export function AgentCreatorProfile({ profile, presets, onSave }: {
  profile: CreatorProfile;
  presets: CustomShotPreset[];
  onSave: (profile: CreatorProfile, presets: CustomShotPreset[]) => void;
}) {
  const [draft, setDraft] = useState(profile);
  const [editing, setEditing] = useState<CustomShotPreset | null>(null);
  const [notice, setNotice] = useState('');

  function savePreset() {
    if (!editing) return;
    const [saved] = readShotPresets([editing]);
    if (!saved) return;
    const next = presets.some(preset => preset.id === saved.id)
      ? presets.map(preset => preset.id === saved.id ? saved : preset)
      : [...presets, saved];
    onSave(profile, next);
    setEditing(null);
    setNotice('Shot preset saved.');
  }

  return <details className="w-full rounded-xl border border-white/10 bg-black/15">
    <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold text-zinc-200">Creator profile &amp; shot presets</summary>
    <div className="space-y-3 border-t border-white/10 p-3 text-xs text-zinc-300">
      <label className="block">{creatorProfileFields[0].label}
        <textarea rows={3} className={fieldClass} placeholder={creatorProfileFields[0].placeholder} maxLength={1200}
          value={draft.brief || ''} onChange={event => setDraft({ ...draft, brief: event.target.value })} />
      </label>
      <details className="rounded-lg border border-white/10 p-2">
        <summary className="cursor-pointer">Audience, goals and production details</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {creatorProfileFields.slice(1).map(({ key, label, placeholder }) => <label key={key} className="block">{label}
            <input className={fieldClass} placeholder={placeholder} maxLength={1200} value={draft[key] || ''}
              onChange={event => setDraft({ ...draft, [key]: event.target.value })} />
          </label>)}
        </div>
      </details>
      <button type="button" className="min-h-10 rounded-lg border border-[#E7C477]/45 px-3 font-semibold text-[#E7C477]"
        onClick={() => { const next = readCreatorProfile(draft); onSave(next, presets); setDraft(next); setNotice('Creator profile saved.'); }}>Save creator profile</button>

      <div className="space-y-2 border-t border-white/10 pt-3">
        <p className="font-semibold text-zinc-100">Saved shot presets</p>
        {presets.map(preset => <div key={preset.id} className="flex items-center justify-between gap-2">
          <span>{preset.name}</span>
          <div className="flex gap-2">
            <button type="button" className="min-h-10 px-2 underline" aria-label={`Edit ${preset.name}`} onClick={() => setEditing({ ...preset })}>Edit</button>
            <button type="button" className="min-h-10 px-2 underline" aria-label={`Remove ${preset.name}`} onClick={() => {
              onSave(profile, presets.filter(item => item.id !== preset.id));
              if (editing?.id === preset.id) setEditing(null);
              setNotice('Shot preset removed.');
            }}>Remove</button>
          </div>
        </div>)}
        {!editing && presets.length < maxShotPresets && <button type="button" className="min-h-10 rounded-lg border border-white/15 px-3"
          onClick={() => setEditing({ id: crypto.randomUUID(), name: '', rules: '', aspectRatio: '9:16' })}>Add shot preset</button>}
        {editing && <div className="space-y-2 rounded-lg border border-white/15 p-2">
          <label className="block">Preset name
            <input className={fieldClass} maxLength={64} value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} />
          </label>
          <label className="block">Shot rules
            <textarea className={fieldClass} rows={3} maxLength={2000} value={editing.rules} onChange={event => setEditing({ ...editing, rules: event.target.value })} />
          </label>
          <label className="block">Default aspect ratio
            <select className={fieldClass} value={editing.aspectRatio || ''} onChange={event => setEditing({ ...editing, aspectRatio: event.target.value })}>
              <option value="">Use the shot’s framing</option>
              {shotAspectRatios.map(ratio => <option key={ratio}>{ratio}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" className="min-h-10 rounded-lg border border-[#E7C477]/45 px-3 text-[#E7C477] disabled:opacity-50"
              disabled={!editing.name.trim() || !editing.rules.trim()} onClick={savePreset}>Save preset</button>
            <button type="button" className="min-h-10 rounded-lg border border-white/15 px-3" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>}
      </div>
      {notice && <p role="status">{notice}</p>}
    </div>
  </details>;
}
