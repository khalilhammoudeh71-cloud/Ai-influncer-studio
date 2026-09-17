import { useEffect, useRef, useState } from 'react';
import { PronunciationMicrophone } from './PronunciationMicrophone';
import { Wand2, Loader2 } from 'lucide-react';
import { accountLocalStorage } from '../utils/accountStorage';
import { api } from '../services/apiService';

function rejectedBeforeSubmission(error: unknown) {
  const status = (error as { status?: number } | null)?.status;
  return status !== undefined && [400,401,403,404,422].includes(status);
}

type Preview = { generatedVoiceId: string; audioUrl: string };
export default function VoiceRemix({ voiceId, voiceName, disabled, expanded=false, onApply }: {
  voiceId?: string; voiceName: string; disabled?: boolean; expanded?:boolean;
  onApply(voice: { voiceId: string; name: string }): Promise<void>;
}) {
  const [description, setDescription] = useState('Keep the character’s vocal identity and tone. Speak Arabic with a natural urban Jordanian / Syrian accent, including Levantine vowel sounds and intonation.');
  const [text, setText] = useState('أهلين، كيفك اليوم؟ أنا جاهزة نحكي شوي ونرتّب أفكارنا على رواق. شو حابب نعمل؟ إذا بدك صورة أو عندك فكرة جديدة، احكيلي عنها وبنشتغل عليها خطوة خطوة. خذ راحتك، أنا هون معك.');
  const [name, setName] = useState(`${voiceName} · Levantine`);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [operationId, setOperationId] = useState('');
  const [previewDescription, setPreviewDescription] = useState('');
  const [dictating, setDictating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ voiceId: string; name: string } | null>(null);
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<'preview' | string | null>(null);
  const lock = useRef(false);
  const audio = useRef<HTMLAudioElement[]>([]);
  const revision = useRef(0);
  useEffect(() => { revision.current++; audio.current.forEach(a => a?.pause()); setPreviews([]); setSaved(null); setOperationId(''); setPending(null); setNotice(''); setError(''); setName(`${voiceName} · Levantine`);
    try { const recovery = JSON.parse(accountLocalStorage.getItem(`voice-remix:${voiceId}`) || 'null'); if (recovery?.operationId) {setOperationId(recovery.operationId);setPending(recovery.pending || 'preview');setPreviewDescription(recovery.description || '');setDescription(recovery.description || description);setName(recovery.name || `${voiceName} · Levantine`);if(typeof recovery.text==='string')setText(recovery.text);} } catch {}
  }, [voiceId]);
  useEffect(() => () => { revision.current++; audio.current.forEach(a => a?.pause()); }, []);
  async function generate() {
    if (lock.current || !voiceId || disabled || pending || description.trim().length < 20 || (text.trim().length > 0 && text.trim().length < 100)) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    audio.current.forEach(a => a?.pause());
    setPreviews([]); setSaved(null);
    const snapshot = revision.current;
    try {
      const id = crypto.randomUUID(); setOperationId(id); setPending('preview'); setPreviewDescription(description.trim());
      accountLocalStorage.setItem(`voice-remix:${voiceId}`,JSON.stringify({operationId:id,pending:'preview',description:description.trim(),name:name.trim(),text:text.trim()}));
      const result = await api.voice.remixVoice({ voiceId, description: description.trim(), text: text.trim() || undefined, operationId: id });
      if (revision.current !== snapshot) return;
      setOperationId(result.operationId);
      if (result.status==='ready') { setPreviews(result.previews); setSaved(null); setPending(null); }
      else { setPending(result.status==='failed'?null:'preview'); if (result.status==='failed') accountLocalStorage.removeItem(`voice-remix:${voiceId}`); setError(result.message || 'Preview outcome unconfirmed. Check status before generating again.'); }
    } catch (e) { if (revision.current === snapshot) {if(rejectedBeforeSubmission(e)){setPending(null);accountLocalStorage.removeItem(`voice-remix:${voiceId}`);}setError(e instanceof Error ? e.message : 'Could not generate remix previews.');} }
    finally { lock.current = false; setBusy(false); }
  }
  async function apply(preview?: Preview) {
    if (lock.current || disabled) return;
    if (!saved && !preview) { setError('Choose a generated preview first.'); return; }
    audio.current.forEach(a => a?.pause());
    lock.current = true; setBusy(true); setError('');
    const snapshot = revision.current;
    try {
      let voice = saved;
      if (!voice && preview) {
        setPending(preview.generatedVoiceId);
        accountLocalStorage.setItem(`voice-remix:${voiceId}`,JSON.stringify({operationId,pending:preview.generatedVoiceId,description:previewDescription,name:name.trim(),text:text.trim()}));
        const result = await api.voice.saveRemixedVoice({ operationId, generatedVoiceId: preview.generatedVoiceId, name: name.trim(), description: previewDescription, retryRejected:true });
        if (revision.current !== snapshot) return;
        if (result.status!=='ready' || !result.voiceId || !result.name) { setPending(result.status==='failed'?null:preview.generatedVoiceId); if(result.status==='failed') accountLocalStorage.removeItem(`voice-remix:${voiceId}`); setError(result.message || 'Save outcome unconfirmed. Check status before trying again.'); return; }
        voice = {voiceId:result.voiceId,name:result.name}; setPending(null);
      }
      if (revision.current !== snapshot) return;
      if (!voice) return;
      setSaved(voice);
      await onApply(voice);
      accountLocalStorage.removeItem(`voice-remix:${voiceId}`);
      if (revision.current === snapshot) setNotice('Remixed voice selected. Save any pending persona changes before your next call.');
    } catch (e) { if (revision.current === snapshot) {if(rejectedBeforeSubmission(e)){setPending(null);accountLocalStorage.removeItem(`voice-remix:${voiceId}`);}setError(e instanceof Error ? e.message : 'Could not apply this voice. Your previous voice is unchanged.');} }
    finally { lock.current = false; setBusy(false); }
  }
  async function checkStatus() {
    if (lock.current || !pending) return;
    lock.current=true; setBusy(true); const snapshot=revision.current;
    try {
      if (pending==='preview') {
        const result=await api.voice.remixVoiceStatus(operationId);
        if (revision.current!==snapshot)return;
        if(result.status==='ready'){setPreviews(result.previews);setPending(null);setError('');}
        else {if(result.status==='failed'){setPending(null);accountLocalStorage.removeItem(`voice-remix:${voiceId}`);}setError(result.message || 'Provider outcome remains unconfirmed. No duplicate request was sent.');}
      } else {
        const result=await api.voice.remixedVoiceSaveStatus(operationId,pending);
        if(revision.current!==snapshot)return;
        if(result.status==='ready'&&result.voiceId&&result.name){setSaved({voiceId:result.voiceId,name:result.name});setPending(null);setError('');}
        else {if(result.status==='failed'){setPending(null);accountLocalStorage.removeItem(`voice-remix:${voiceId}`);}setError(result.message || 'Save outcome remains unconfirmed. Your current voice is unchanged.');}
      }
    }catch(e){if(revision.current===snapshot){if((e as {status?:number})?.status===404){setPending(null);accountLocalStorage.removeItem(`voice-remix:${voiceId}`);}setError(e instanceof Error?e.message:'Could not check status.');}}
    finally{lock.current=false;setBusy(false);}
  }
  return <details open={expanded||undefined} className="rounded-xl border border-[#E7C477]/25 p-3">
    <summary className="cursor-pointer text-sm font-medium text-[#E7C477]"><Wand2 size={15} className="mr-2 inline"/>Remix voice · accent & style</summary>
    <div className="mt-3 space-y-3">
      <p className="text-xs leading-relaxed text-zinc-400">Describe changes to {voiceName}, then compare previews. Creates a new voice; accent accuracy and identity preservation need listening checks. Generation uses ElevenLabs credits.</p>
      {!voiceId && <p className="text-xs text-amber-300">Select an ElevenLabs voice first.</p>}
      {disabled && <p className="text-xs text-amber-300">End the current call before changing its voice.</p>}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2"><label className="block text-sm">Accent & style <span className="text-xs text-zinc-400">At least 20 characters</span><textarea aria-label="Remix accent and style" value={description} onChange={e=>setDescription(e.target.value)} disabled={busy || !!pending} maxLength={1000} rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-[#151515] p-3 text-sm"/></label><PronunciationMicrophone key={`${voiceId}-style`} fieldLabel="accent and style" maxLength={1000} disabled={busy || !!pending || disabled || dictating} onBusy={setDictating} onText={setDescription}/></div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2"><label className="block text-sm">Sample text <span className="text-xs text-zinc-400">Optional · 100–1000 characters · correct sentences only</span><textarea aria-label="Remix sample text" value={text} onChange={e=>setText(e.target.value)} disabled={busy || !!pending} maxLength={1000} rows={2} placeholder="Leave empty for an automatically generated sample." className="mt-1 w-full rounded-xl border border-white/10 bg-[#151515] p-3 text-sm"/></label><PronunciationMicrophone key={`${voiceId}-sample`} fieldLabel="sample text" maxLength={1000} disabled={busy || !!pending || disabled || dictating} onBusy={setDictating} onText={setText}/></div>
      <button type="button" disabled={busy || dictating || !!pending || disabled || !voiceId || description.trim().length<20 || (!!text.trim() && text.trim().length<100)} onClick={()=>void generate()} className="min-h-11 rounded-xl bg-[#E7C477] px-4 text-sm font-semibold text-[#19160f] disabled:opacity-40">{busy?<><Loader2 className="mr-2 inline animate-spin" size={15}/>Working…</>:'Generate remix previews'}</button>
      {previews.length>0 && <>{previewDescription.length<20 && <p className="text-xs text-amber-300">Use a description of at least 20 characters and generate previews to save a remix.</p>}<label className="block text-sm">New voice name<input aria-label="Remixed voice name" value={name} onChange={e=>setName(e.target.value)} maxLength={100} disabled={busy || !!pending || !!saved} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-[#151515] px-3"/></label><div className="space-y-2">{previews.map((p,i)=><div key={p.generatedVoiceId} className="rounded-xl bg-white/5 p-3"><p className="mb-2 text-xs text-zinc-300">Option {i+1}</p><audio ref={el=>{if(el) audio.current[i]=el;}} controls src={p.audioUrl} onPlay={()=>audio.current.forEach((a,j)=>{if(j!==i)a?.pause();})} className="w-full"/><button type="button" disabled={busy || !!pending || disabled || previewDescription.length<20 || !name.trim() || !!saved} onClick={()=>void apply(p)} className="mt-2 min-h-11 rounded-lg border border-[#E7C477]/40 px-3 text-sm text-[#E7C477] disabled:opacity-40">Save & use this voice</button></div>)}</div></>}
      {saved && !notice && <button type="button" disabled={busy || disabled} onClick={()=>void apply()} className="min-h-11 text-sm text-[#E7C477]">Retry applying saved voice</button>}
      {pending && <button type="button" disabled={busy} onClick={()=>void checkStatus()} className="min-h-11 text-sm text-[#E7C477]">Check request status</button>}
      {error && <p role="alert" className="text-xs leading-relaxed text-amber-300">{error}</p>}
      {notice && <p role="status" className="text-xs text-[#E7C477]">{notice}</p>}
    </div>
  </details>;
}
