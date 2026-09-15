import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Phone, Mic, MicOff, PhoneOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HumeNativeCall } from '../utils/humeNativeCall';
import { ElevenLabsCall } from '../utils/elevenLabsCall';
import { OPENAI_NATIVE_VOICES, NATIVE_SCENARIOS, type NativeMessage, type NativeProvider } from '../../shared/nativeVoice';
import { CALL_MODES, CALL_DIALECTS, normalizeCallPreferences, type CallPreferences } from '../../shared/voiceCallPreferences';
import { OpenAINativeCall, type NativeCallCallbacks, type VoiceMetric } from '../utils/nativeVoiceCall';
import { getAuthHeaders } from '../services/apiService';
import { accountLocalStorage } from '../utils/accountStorage';
import { summarizeVoiceMetrics } from '../utils/voiceCallMetrics';

type Props = { personaId?: string; history: { id?: string; role: string; content: string }[]; memories?: string[]; disabled?: boolean; onMessage(message: NativeMessage): void; onPlan?(plan: any): void };
type VoiceOptions = { voice: string; voiceName: string; voiceAccent?: string; personaName?: string; eviVersion?: string };
export function NativeVoiceCall({ personaId, history, memories = [], disabled, onMessage, onPlan }: Props) {
  const [open, setOpen] = useState(false), [status, setStatus] = useState('idle'), [error, setError] = useState(''), [muted, setMuted] = useState(false);
  const [provider, setProvider] = useState<NativeProvider>('elevenlabs');
  const [options, setOptions] = useState<VoiceOptions | null>(null), [loading, setLoading] = useState(false);
  const [voice, setVoice] = useState('marin'), [label, setLabel] = useState(''), [liveText, setLiveText] = useState('');
  const [preferences, setPreferences] = useState<CallPreferences>(() => normalizeCallPreferences());
  const [draft, setDraft] = useState(''), [attempted, setAttempted] = useState(false);
  const [metrics, setMetrics] = useState<VoiceMetric[]>([]);
  const dialog = useRef<HTMLDivElement | null>(null), endButton = useRef<HTMLButtonElement | null>(null);
  const call = useRef<OpenAINativeCall | HumeNativeCall | ElevenLabsCall | null>(null);
  const props = useRef({ personaId, history, memories, onMessage, onPlan });
  props.current = { personaId, history, memories, onMessage, onPlan };
  const stop = useCallback((preserveTranscript = true) => {
    const previous = call.current;
    if (!preserveTranscript) call.current = null;
    previous?.end(); call.current = null;
    setStatus('idle'); setMuted(false);
  }, []);
  useEffect(() => {
    stop(false); setOpen(false); setError(''); setLabel(''); setLiveText(''); setOptions(null); setDraft(''); setAttempted(false);
    const saved = accountLocalStorage.getItem(`native-voice:openai:${personaId || 'super-agent'}`);
    setVoice((OPENAI_NATIVE_VOICES as readonly string[]).includes(saved || '') ? saved! : 'marin');
    try { setPreferences(normalizeCallPreferences(JSON.parse(accountLocalStorage.getItem(`voice-call-preferences:${personaId || 'super-agent'}`) || 'null'))); }
    catch { setPreferences(normalizeCallPreferences()); }
    return () => { const previous = call.current; call.current = null; previous?.end(); };
  }, [personaId, stop]);
  useEffect(() => { if (disabled) stop(); }, [disabled, stop]);
  useEffect(() => {
    let owner: string | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const next = session?.user.id;
      if (event === 'SIGNED_OUT' || (owner && owner !== next)) { stop(false); setOpen(false); setDraft(''); setPreferences(normalizeCallPreferences()); setOptions(null); }
      owner = next;
    });
    return () => subscription.unsubscribe();
  }, [stop]);
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement;
    endButton.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); stop(); setOpen(false); }
      if (event.key === 'Tab') {
        const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),input:not(:disabled),summary') || []).filter(item => item.getClientRects().length > 0);
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); if (before?.isConnected) before.focus(); };
  }, [open, stop]);
  useEffect(() => {
    if (!open || provider === 'openai') { setLoading(false); return; }
    const controller = new AbortController(); setError(''); setLoading(true); setOptions(null);
    void (async () => {
      const query = new URLSearchParams({ personaId: personaId || '' });
      const response = await fetch(`/api/native-voice/${provider}/options${provider === 'elevenlabs' ? `?${query}` : ''}`, { headers: await getAuthHeaders(), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Voice setup is unavailable.');
      if (!controller.signal.aborted) setOptions(data);
    })().catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, provider, personaId]);
  function updatePreferences(next: CallPreferences) {
    setPreferences(next);
    accountLocalStorage.setItem(`voice-call-preferences:${personaId || 'super-agent'}`, JSON.stringify(next));
  }
  async function start() {
    if (status !== 'idle' || disabled || loading) return;
    stop(); setError(''); setLiveText(''); setMetrics([]); setStatus('connecting'); setLabel(''); setAttempted(true);
    const context = { ...props.current };
    if (!context.memories.length && context.personaId) {
      try {
        const notes = JSON.parse(accountLocalStorage.getItem(`persona_memories_${context.personaId}`) || '[]');
        if (Array.isArray(notes)) context.memories = notes.map(note => typeof note === 'string' ? note : note?.text).filter((text): text is string => typeof text === 'string').slice(0, 30);
      } catch {}
    }
    const selectedVoice = provider === 'openai' ? voice : options?.voice;
    if (provider === 'openai') accountLocalStorage.setItem(`native-voice:openai:${personaId || 'super-agent'}`, voice);
    let session: OpenAINativeCall | HumeNativeCall | ElevenLabsCall;
    const callbacks: NativeCallCallbacks = {
      state: value => { if (call.current === session) { setStatus(value); if (value === 'idle') setMuted(false); } },
      error: value => { if (call.current === session) setError(value); },
      preview: message => { if (call.current === session) setLiveText(message.content); },
      message: message => { if (call.current === session) {
        setLiveText(message.content);
        context.history = context.history.some(item => item.id === message.id)
          ? context.history.map(item => item.id === message.id ? message : item)
          : [...context.history, message];
        context.onMessage(message);
      } },
      metric: metric => { if (call.current === session) setMetrics(previous => [...previous.slice(-199), metric]); },
      tool: async (name, args, signal) => {
        const parsed = JSON.parse(args);
        const response = await fetch('/api/native-voice/agent', { method: 'POST', headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
          body: JSON.stringify({ name, request: parsed.request, personaId: context.personaId, history: context.history }), signal });
        const data = await response.json(); if (!response.ok) throw new Error(data.error);
        if (signal.aborted || call.current !== session) return { error: 'Call ended' };
        context.onPlan?.(data);
        return { text: data.text, proposedSteps: data.suggestedSteps, execution: 'Not executed. Review proposed actions in the studio.' };
      },
    };
    session = provider === 'elevenlabs' ? new ElevenLabsCall(callbacks) : provider === 'openai' ? new OpenAINativeCall(callbacks) : new HumeNativeCall(callbacks);
    call.current = session;
    await session.start(async signal => {
      const setupAt = performance.now();
      const response = await fetch(`/api/native-voice/${provider}/session`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
        body: JSON.stringify({ personaId: context.personaId, history: context.history, memories: context.memories, voice: selectedVoice, preferences }), signal });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Call setup failed.');
      if (!signal.aborted && call.current === session) {
        setLabel(`${data.personaName} · ${data.voiceName || data.voice}`);
        setMetrics(previous => [...previous, { event: 'session_preparation', source: 'client-control', at: performance.now(), ms: performance.now() - setupAt }]);
      }
      return data;
    });
  }
  const active = status !== 'idle';
  const humeArabicUnavailable = provider === 'hume' && !!options && options.eviVersion !== '4-mini' && (preferences.mode !== 'english' || preferences.allowLanguageSwitching);
  const ready = !loading && !humeArabicUnavailable && (provider === 'openai' || !!options);
  const timingSummary = summarizeVoiceMetrics(metrics);
  const fieldClass = 'mt-2 w-full rounded-xl border border-white/15 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50';
  return <>
    <button type="button" disabled={disabled} onClick={() => { setProvider('elevenlabs'); setOptions(null); setOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-400/30 text-sky-300 text-xs disabled:opacity-40"><Phone size={13} />ElevenLabs call</button>
    {open && createPortal(<div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="voice-call-title" className="fixed inset-0 z-[110] bg-black/85 overflow-auto p-4 sm:p-8 text-white grid place-items-center">
      <section className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-5 sm:p-7 space-y-5 shadow-2xl">
        <div><p className="text-xs text-sky-300 uppercase tracking-widest mb-2">Live conversation</p><h2 id="voice-call-title" className="text-2xl font-semibold">{options?.personaName && provider === 'elevenlabs' ? `Call ${options.personaName}` : 'Voice call'}</h2>
          <p className="text-sm text-zinc-400 mt-2">Microphone audio goes to your selected call provider. The transcript joins this chat.</p></div>
        {!active && <>
        <label className="block text-sm text-zinc-300">Call provider<select aria-label="Call provider" value={provider} disabled={active} onChange={event => { setProvider(event.target.value as NativeProvider); setOptions(null); setError(''); setLabel(''); }} className={fieldClass}>
          <option value="elevenlabs">ElevenLabs · persona voice</option><option value="openai">OpenAI Realtime · provider voice</option><option value="hume">Hume EVI · provider voice</option>
        </select></label>
        {provider === 'elevenlabs' ? <>
          <div className="rounded-xl border border-white/10 px-4 py-3 text-sm"><span className="text-zinc-400">Saved voice</span><p className="mt-1 font-medium">{loading ? 'Checking voice…' : options?.voiceName || 'Select an ElevenLabs voice in your persona’s Voice tab'}</p>{options?.voiceAccent && <p className="mt-1 text-xs text-zinc-400">{options.voiceAccent}</p>}</div>
        </> : provider === 'openai' ? <label className="block text-sm text-zinc-300">OpenAI voice<select aria-label="OpenAI voice" disabled={active} value={voice} onChange={event => setVoice(event.target.value)} className={fieldClass}>{OPENAI_NATIVE_VOICES.map(value => <option key={value}>{value}</option>)}</select></label>
          : <p className="text-sm text-zinc-300">Hume voice: {options?.voiceName || (loading ? 'Checking voice…' : 'Setup required')}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-zinc-300">Call language<select aria-label="Call language" disabled={active} value={preferences.mode} onChange={event => updatePreferences({ ...preferences, mode: event.target.value as CallPreferences['mode'] })} className={fieldClass}>{CALL_MODES.map(mode => <option key={mode.id} value={mode.id}>{mode.label}</option>)}</select></label>
          <label className="block text-sm text-zinc-300">Arabic dialect<select aria-label="Arabic dialect" disabled={active || (preferences.mode === 'english' && !preferences.allowLanguageSwitching)} value={preferences.dialect} onChange={event => updatePreferences({ ...preferences, dialect: event.target.value as CallPreferences['dialect'] })} className={fieldClass}>{CALL_DIALECTS.map(dialect => <option key={dialect.id} value={dialect.id}>{dialect.label}</option>)}</select></label>
        </div>
        <label className="flex items-start gap-3 text-sm text-zinc-300"><input type="checkbox" disabled={active} checked={preferences.allowLanguageSwitching} onChange={event => updatePreferences({ ...preferences, allowLanguageSwitching: event.target.checked })} className="mt-1 accent-sky-400" /><span>Allow Arabic / English switching<span className="block text-xs text-zinc-500 mt-1">Ask to switch languages at any point in the call.</span></span></label>
        <p className="text-xs text-zinc-400">Language choices apply to all three call providers. Dialect guides the wording; the selected voice determines the sound of the accent.</p>
        {humeArabicUnavailable && <p role="alert" className="text-sm text-amber-300">Arabic requires Hume EVI 4-mini. Choose another provider, or use English with switching off.</p>}
        </>}
        {active && <p className="text-sm text-zinc-400">{provider === 'elevenlabs' ? 'ElevenLabs' : provider === 'openai' ? 'OpenAI' : 'Hume'} · {CALL_MODES.find(mode => mode.id === preferences.mode)?.label}{(preferences.mode !== 'english' || preferences.allowLanguageSwitching) && ` · ${CALL_DIALECTS.find(dialect => dialect.id === preferences.dialect)?.label}`}</p>}
        {label && <p className="text-sm text-zinc-300">{label}</p>}
        <p aria-live="polite" className="text-sm text-sky-200">{status === 'connecting' ? 'Connecting… First-time voice setup may take a moment.' : status === 'thinking' ? (muted ? 'Preparing a reply… Microphone muted.' : 'Preparing a reply… You can still speak to interrupt.') : status === 'speaking' ? 'Speaking — you can interrupt' : status === 'listening' ? (muted ? 'Microphone muted' : 'Listening…') : ready ? 'Ready when you are' : ''}</p>
        {liveText && <p dir="auto" className="rounded-xl bg-white/5 p-4 text-sm leading-relaxed max-h-36 overflow-auto">{liveText}</p>}
        {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
        <div className="flex flex-wrap gap-3">
          {!active ? <button type="button" disabled={disabled || !ready} onClick={() => void start()} className="flex-1 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-3 text-sm font-semibold disabled:opacity-40">{attempted ? 'Reconnect call' : 'Start call'}</button> : <>
            <button type="button" disabled={status === 'connecting'} onClick={() => { call.current?.mute(!muted); setMuted(!muted); }} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 py-3 text-sm disabled:opacity-40">{muted ? <Mic size={16} /> : <MicOff size={16} />}{muted ? 'Unmute' : 'Mute'}</button>
            <button type="button" disabled={status !== 'speaking'} onClick={() => call.current?.interrupt()} className="flex-1 rounded-xl bg-zinc-800 px-4 py-3 text-sm disabled:opacity-40">{provider === 'elevenlabs' ? 'Mute reply' : 'Stop speaking'}</button>
          </>}
        </div>
        {active && <form onSubmit={event => {
          event.preventDefault();
          try { if (call.current?.sendText(draft)) { setDraft(''); setError(''); } }
          catch { setError('The message could not be sent. Your draft is still here; reconnect to try again.'); }
        }} className="space-y-2">
          <label htmlFor="call-typed-message" className="text-sm text-zinc-300">Type in this call</label>
          <div className="flex gap-2"><input id="call-typed-message" dir="auto" maxLength={4000} disabled={status === 'connecting'} value={draft} onChange={event => setDraft(event.target.value)} className={`${fieldClass} min-w-0 mt-0`} placeholder="Write a message…" /><button type="submit" disabled={status !== 'listening' || !draft.trim()} className="rounded-xl bg-sky-600 px-4 text-sm font-semibold disabled:opacity-40">Send</button></div>
          <p className="text-xs text-zinc-400">Send when the call is listening. Typed messages stay in this conversation.</p>
        </form>}
        <button ref={endButton} type="button" onClick={() => { stop(); setOpen(false); }} className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${active ? 'bg-red-600 hover:bg-red-500' : 'border border-white/15 text-zinc-300 hover:bg-white/5'}`}>{active && <PhoneOff size={16} />}{active ? 'End call' : 'Close'}</button>
        {active && <p className="text-center text-xs text-zinc-500">Press Escape to hang up.{provider === 'elevenlabs' ? ' Up to 15 minutes per call.' : ''}</p>}
        <details className="text-xs text-zinc-400"><summary className="cursor-pointer">Call diagnostics</summary>
          <p className="my-3">Timings measure different parts of a reply. Transcript-to-audio excludes recognition time; scheduled audio is not proof of playback. No microphone recording is stored in this log.</p>
          {timingSummary.length > 0 && <ul className="my-3 space-y-2">{timingSummary.map(item => <li key={`${item.source}:${item.event}`} className="break-words">{item.event.replace(/_/g, ' ')} ({item.source}): median {item.medianMs} ms · p95 {item.p95Ms} ms · {item.count} samples</li>)}</ul>}
          <ol className="list-decimal pl-5 space-y-2">{NATIVE_SCENARIOS.map(scenario => <li key={scenario}>{scenario}</li>)}</ol>
          <button type="button" className="mt-3 underline" onClick={() => {
            const url = URL.createObjectURL(new Blob([JSON.stringify({ provider, label, preferences, summary: timingSummary, metrics, notes: 'No raw audio recorded. Browser render and provider events are separately labeled.' }, null, 2)], { type: 'application/json' }));
            const link = document.createElement('a'); link.href = url; link.download = 'voice-call-timings.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}>Download timing log</button>
        </details>
      </section>
    </div>, document.body)}
  </>;
}
