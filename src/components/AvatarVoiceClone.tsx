import { Upload } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import type { CloneResult } from '../../shared/personaVoiceLifecycle';
import { api } from '../services/apiService';
import { readCloneSampleFile } from '../utils/audioUtils';

export default function AvatarVoiceClone({ onReady }: {
  onReady: (voice: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState('');
  const [sample, setSample] = useState<{ name: string; base64: string }>();
  const [authorized, setAuthorized] = useState(false);
  const [result, setResult] = useState<CloneResult>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const sampleInput = useRef<HTMLInputElement>(null);

  async function run(action: 'clone' | 'check' | 'retry') {
    if (pending.current || (action === 'check' ? !result : !sample || !name.trim() || !authorized)) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const next = action === 'check' && result
        ? await api.voice.cloneStatus(result.id)
        : await api.voice.cloneVoice(name.trim(), 'Talking Avatar voice', sample!.base64, authorized, action === 'retry');
      setResult(next);
      if (next.status === 'ready' && next.voiceId) onReady({ id: next.voiceId, name: next.name });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not clone this voice.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result) void run('clone');
  }

  return (
    <details className="rounded-xl border border-white/15 p-3">
      <summary className="cursor-pointer text-sm font-semibold">Clone a voice</summary>
      <form onSubmit={submit} className="mt-3 space-y-3 text-sm">
        <fieldset disabled={busy || Boolean(result)} className="min-w-0 space-y-3">
          <label className="block">Voice name
            <input required maxLength={80} value={name} onChange={event => setName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/20 p-2" />
          </label>
          <div className="space-y-2">
            <p>Voice sample</p>
            <button type="button" onClick={() => sampleInput.current?.click()}
              className="btn-gold-primary flex min-h-11 w-full items-center justify-center gap-2 px-3 py-2">
              <Upload size={16} aria-hidden="true" />
              {sample ? "Replace audio or video" : "Upload audio or video"}
            </button>
            <input ref={sampleInput} type="file" hidden accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.mov,.webm"
              onChange={async event => {
                const file = event.currentTarget.files?.[0];
                if (!file || pending.current) return;
                event.currentTarget.value = '';
                pending.current = true;
                setBusy(true);
                setSample(undefined);
                setError('');
                try {
                  setSample(await readCloneSampleFile(file));
                } catch (failure) {
                  setError(failure instanceof Error ? failure.message : 'Could not read the voice sample.');
                } finally {
                  pending.current = false;
                  setBusy(false);
                }
              }} />
            <p className="text-xs text-[var(--text-secondary)]">For video, the studio uses the audio track.</p>
          </div>
          {sample && <p className="break-words">{sample.name}</p>}
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={authorized} onChange={event => setAuthorized(event.target.checked)} />
            I am the speaker or have permission to clone and use this voice.
          </label>
        </fieldset>
        {error && <p role="alert" className="text-rose-300">{error}</p>}
        {result && <p role="status">{result.status === 'ready' ? 'Voice ready and selected.' : result.message || result.status}</p>}
        {!result && <button type="submit" className="btn-gold-primary px-3 py-2 disabled:opacity-50"
          disabled={busy || !name.trim() || !sample || !authorized}>Create voice clone</button>}
        {result && result.status !== 'ready' && <button type="button" disabled={busy} className="underline"
          onClick={() => void run('check')}>Check status</button>}
        {result?.status === 'failed' && <button type="button" disabled={busy} className="block underline"
          onClick={() => void run('retry')}>Retry clone</button>}
        {result?.status === 'verification_required' && <a className="block underline" href="https://elevenlabs.io/app/voices"
          target="_blank" rel="noreferrer">Verify speaker in ElevenLabs</a>}
        {result && <button type="button" disabled={busy} className="block underline" onClick={() => {
          setResult(undefined);
          setSample(undefined);
          setAuthorized(false);
          setName('');
          setError('');
        }}>Start a new clone</button>}
      </form>
    </details>
  );
}
