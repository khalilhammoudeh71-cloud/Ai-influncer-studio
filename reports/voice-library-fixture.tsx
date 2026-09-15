// Browser-only fixture: real editor/studio components with a simulated API boundary.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import CreatePersonaPage from '../src/views/CreatePersonaPage';
import VoiceView from '../src/views/VoiceView';
import { api } from '../src/services/apiService';
import { restoreSavedVoice } from '../shared/personaVoiceLibrary';
import '../src/index.css';

const testWindow = window as any;
const voices = [
  { id: 'fixture-a', name: 'Warm original', savedAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', voiceId: 'fixture-clone-a', voiceEngine: 'elevenlabs', voiceSampleUrl: 'supabase-media://fixture/audio/a.wav', audioSamples: [{ name: 'Original recording', base64: 'supabase-media://fixture/audio/a.wav' }], voiceLikeness: 92, voiceStability: 64, voiceStyleExaggeration: 30, voiceSpeakingSpeed: 0.95 },
  { id: 'fixture-b', name: 'New voice', savedAt: '2026-09-02T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z', voiceId: 'fixture-clone-b', voiceEngine: 'elevenlabs', voiceSampleUrl: 'supabase-media://fixture/audio/b.wav', audioSamples: [{ name: 'New recording', base64: 'supabase-media://fixture/audio/b.wav' }], voiceLikeness: 81, voiceStability: 25, voiceStyleExaggeration: 10, voiceSpeakingSpeed: 1.1 },
];
const initial = { id: 'fixture-persona', name: 'Voice library test persona', niche: 'Stories', platform: 'Instagram', tone: 'Warm', bio: '', avatar: '', personalityTraits: ['Warm'], brandVoiceRules: 'Conversational', personaNotes: 'Fixture', ...restoreSavedVoice(voices[1]), savedVoices: voices, voiceRevision: 'fixture-1' };
const catalog = { voices: voices.map(v => ({ voice_id: v.voiceId, name: v.name, labels: {}, category: 'cloned' })) };
api.voice.getVoices = async () => catalog as any;
api.voice.getElevenLabsVoices = async () => catalog as any;
api.voice.voiceStatus = async () => ({ status: 'available' }) as any;
api.getConfigStatus = async () => ({ elevenlabs: true }) as any;
api.personas.update = async (persona: any) => {
  testWindow.lastAttempt = structuredClone(persona);
  if (testWindow.failSave) throw new Error('Fixture save failure; previous default preserved.');
  const saved = { ...persona, savedVoices: voices, voiceRevision: `fixture-${Date.now()}` };
  localStorage.setItem('voice-library-fixture', JSON.stringify(saved));
  testWindow.lastSaved = saved;
  testWindow.setSaved(saved);
  return saved;
};
api.updatePersonaInVault = (persona: any) => api.personas.update(persona);
const nav = new Proxy({}, { get: () => () => {} });
function Fixture() {
  const [persona, setPersona] = useState<any>(() => JSON.parse(localStorage.getItem('voice-library-fixture') || 'null') || initial);
  testWindow.setSaved = setPersona;
  testWindow.currentPersona = persona;
  return <><Toaster />{location.search.includes('studio')
    ? <VoiceView persona={persona} personas={[persona]} onSelectPersona={() => {}} nav={nav as any} />
    : <CreatePersonaPage editingPersona={persona} personas={[persona]} setPersonas={list => setPersona(list[0])} onSelectPersona={() => {}} nav={nav as any} />}</>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
