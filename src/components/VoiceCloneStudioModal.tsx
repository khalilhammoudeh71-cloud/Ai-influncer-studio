import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Mic, 
  Play, 
  Pause, 
  Upload, 
  Sparkles, 
  Sliders, 
  Volume2, 
  Check, 
  Loader2, 
  Music, 
  Trash2, 
  BookmarkPlus, 
  FolderHeart,
  MessageSquareQuote,
  AlertCircle,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/apiService';
import { 
  getAllSavedVoices, 
  saveVoiceItem, 
  deleteVoiceItem, 
  SavedVoiceItem 
} from '../utils/indexedVoiceDb';
import { accountLocalStorage } from '../utils/accountStorage';

export type SavedVoice = SavedVoiceItem;

interface VoiceCloneStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceCloned: (voiceDetails: { voiceId: string; name: string; model: string }) => void;
}

interface SampleItem {
  id: string;
  file?: File;
  base64: string;
  previewUrl: string;
  name: string;
}

interface ProviderVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
  labels: Record<string, string>;
}

export default function VoiceCloneStudioModal({
  isOpen,
  onClose,
  onVoiceCloned,
}: VoiceCloneStudioModalProps) {
  const [existingVoices, setExistingVoices] = useState<ProviderVoice[]>([]);
  const [selectedExistingVoiceId, setSelectedExistingVoiceId] = useState('');
  const [isActivatingExistingVoice, setIsActivatingExistingVoice] = useState(false);
  const [voiceSearch, setVoiceSearch] = useState('');
  const [playingExistingVoiceId, setPlayingExistingVoiceId] = useState<string | null>(null);
  const [loadingExistingVoiceId, setLoadingExistingVoiceId] = useState<string | null>(null);
  const existingVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const generatedPreviewUrlsRef = useRef(new Map<string, string>());
  useEffect(() => {
    if (!isOpen) return;
    void api.voice.getElevenLabsVoices()
      .then(data => {
        setExistingVoices(data.voices);
        setSelectedExistingVoiceId(current => current || data.voices[0]?.voice_id || '');
      })
      .catch(() => setExistingVoices([]));
  }, [isOpen]);
  const [activeTab, setActiveTab] = useState<'library' | 'clone'>('library');

  // Form State
  const [speakerAuthorized, setSpeakerAuthorized] = useState(false);
  const [voiceName, setVoiceName] = useState('My Cloned Voice');
  const [voiceDescription, setVoiceDescription] = useState('');
  const [selectedModel, setSelectedModel] = useState('elevenlabs-v3');
  const [samples, setSamples] = useState<SampleItem[]>([]);
  
  // Voice Parameter Controls
  const [stability, setStability] = useState(0.35);
  const [similarityBoost, setSimilarityBoost] = useState(0.95);
  const [styleExaggeration, setStyleExaggeration] = useState(0.15);
  const [speechSpeed, setSpeechSpeed] = useState(1.0);

  // Testing & Synthesis state
  const [isCloning, setIsCloning] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  
  // Saved Voices Library State (IndexedDB + localStorage fallback)
  const [savedVoices, setSavedVoices] = useState<SavedVoice[]>([]);
  const [playingSavedId, setPlayingSavedId] = useState<string | null>(null);
  const savedAudioRef = useRef<HTMLAudioElement | null>(null);

  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Test Script state
  const [customTestText, setCustomTestText] = useState(
    "Hey there! Welcome to the studio! Have you ever wondered why some dental videos go completely viral while others get ignored? It's all about how you deliver the message with warmth, clarity, and real emotion. How does my voice sound to you right now? Does it feel natural, clear, and spot-on?"
  );

  // Load saved voices from IndexedDB on mount & open
  useEffect(() => {
    let isMounted = true;
    getAllSavedVoices().then((items) => {
      if (isMounted) {
        setSavedVoices(items);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleFilesAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files).slice(0, 5 - samples.length);
    setModalError(null);

    const toastId = toast.loading('Loading full-length reference audio...');
    const newSamples: SampleItem[] = [];

    for (const file of selectedFiles) {
      try {
        const rawBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

        // Use full-length original audio — some models need as much reference audio as possible
        const base64 = rawBase64;
        const previewUrl = base64;

        newSamples.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          base64,
          previewUrl,
          name: file.name,
        });
      } catch (err) {
        console.error('[File Read Error]:', err);
        toast.error(`Failed to read file ${file.name}`);
      }
    }

    toast.dismiss(toastId);
    setSamples((prev) => [...prev, ...newSamples].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSample = (id: string) => {
    setSamples((prev) => prev.filter((s) => s.id !== id));
  };

  const handleTestVoice = async () => {
    if (samples.length === 0) {
      toast.error('Please upload at least one audio or video sample first.');
      return;
    }

    setModalError(null);
    setIsTesting(true);
    setTestAudioUrl(null);
    setIsPlayingTest(false);

    try {
      const data = await api.voice.testVoiceClone({
        sampleBase64s: samples.map((s) => s.base64),
        sampleBase64: samples[0]?.base64,
        model: selectedModel,
        voiceSettings: {
          stability,
          similarityBoost,
          style: styleExaggeration,
          speed: speechSpeed,
        },
        testText: customTestText || "Hey there! Welcome to the studio! Have you ever wondered why some dental videos go completely viral while others get ignored? It's all about how you deliver the message with warmth, clarity, and real emotion. How does my voice sound to you right now?",
      });

      if (!data.audioUrl) {
        throw new Error('Failed to synthesize test audio.');
      }

      setTestAudioUrl(data.audioUrl);
      setIsPlayingTest(true);
      toast.success('🔊 Playing AI-synthesized voice preview sample...');

      setTimeout(() => {
        if (testAudioRef.current) {
          testAudioRef.current.currentTime = 0;
          testAudioRef.current.play().catch(e => console.warn('[Auto-play notice]:', e));
        }
      }, 150);
    } catch (err: any) {
      console.error('[Voice Test Error]:', err);
      const msg = err.message || 'Voice test failed.';
      setModalError(msg);
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  // Save Voice to "My Voices" Library (IndexedDB - Unlimited storage)
  const handleSaveToMyVoices = async () => {
    if (samples.length === 0) {
      toast.error('Please upload at least one audio sample before saving to My Voices.');
      return;
    }

    const toastId = toast.loading(`Generating AI voice sample preview for "${voiceName || 'Cloned Voice'}"...`);
    let aiSampleUrl = testAudioUrl || undefined;

    if (!aiSampleUrl || aiSampleUrl.startsWith('blob:')) {
      try {
        const data = await api.voice.testVoiceClone({
          sampleBase64s: samples.map((s) => s.base64),
          sampleBase64: samples[0]?.base64,
          model: selectedModel,
          voiceSettings: {
            stability,
            similarityBoost,
            style: styleExaggeration,
            speed: speechSpeed,
          },
          testText: customTestText || "Hey there! Welcome to the studio! How does my AI voice sound to you right now?",
        });
        if (data && data.audioUrl) {
          aiSampleUrl = data.audioUrl;
        }
      } catch (e) {
        console.warn('[Auto Synthesize Sample Note]:', e);
      }
    }

    const newVoice: SavedVoice = {
      id: `voice_${Date.now()}`,
      name: voiceName || 'Cloned Voice',
      description: voiceDescription || 'Custom voice clone with fine-tuned pitch and accent retention.',
      model: selectedModel,
      audioRef: samples[0].base64,
      audioRefs: samples.map(s => s.base64),
      sampleAudioUrl: aiSampleUrl, // Stores AI synthesized preview audio
      dateCreated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      settings: {
        stability,
        similarityBoost,
        styleExaggeration,
        speechSpeed
      }
    };

    const updated = await saveVoiceItem(newVoice);
    setSavedVoices(updated);
    toast.success(`📁 Saved "${newVoice.name}" to My Voices library!`, { id: toastId });
    setActiveTab('library');
  };

  // Activate a Voice from Saved Library
  const handleActivateSavedVoice = async (voice: SavedVoice) => {
    const toastId = toast.loading(`Activating "${voice.name}" as Super Agent's Voice...`);
    try {
      if (!voice.providerVoiceId) throw new Error('This older library entry has its recording but no verified provider voice ID. Keep it saved and select its existing voice in Voice Studio; restoration will not create a replacement clone.');
      const data = await api.voice.setDefaultVoice({
        voiceId: voice.providerVoiceId,
        voiceReferences: voice.audioRefs || [voice.audioRef],
        voiceName: voice.name, model: voice.model, speakerAuthorized,
        voiceSettings: { stability: voice.settings.stability, similarityBoost: voice.settings.similarityBoost, style: voice.settings.styleExaggeration, speed: voice.settings.speechSpeed },
      });
      if (!data.success || !data.voiceId) throw new Error('The provider has not confirmed a ready voice.');
      const updated = await saveVoiceItem({ ...voice, providerVoiceId: data.voiceId, model: data.model || voice.model });
      setSavedVoices(updated);
      accountLocalStorage.setItem('superagent_cloned_voice_id', data.voiceId);
      accountLocalStorage.setItem('superagent_cloned_voice', 'active');
      accountLocalStorage.setItem('superagent_cloned_voice_audio', voice.audioRef);
      accountLocalStorage.setItem('superagent_voice_settings', JSON.stringify(voice.settings));

      toast.success(`"${voice.name}" activated as Super Agent's voice!`, { id: toastId });
      onVoiceCloned({
        voiceId: data.voiceId,
        name: voice.name,
        model: voice.model
      });
      onClose();
    } catch (err: any) {
      console.error('[Activate Voice Exception]:', err);
      toast.error(err.message || 'Failed to set voice.', { id: toastId });
    }
  };

  const handleActivateExistingVoice = async () => {
    const voice = existingVoices.find(item => item.voice_id === selectedExistingVoiceId);
    if (!voice) return;
    setIsActivatingExistingVoice(true);
    const toastId = toast.loading(`Setting ${voice.name} as the agent voice…`);
    try {
      const data = await api.voice.setDefaultVoice({
        voiceId: voice.voice_id,
        voiceName: voice.name,
        model: 'elevenlabs-v3',
        voiceSettings: { stability: 0.35, similarityBoost: 0.95, style: 0.15, speed: 1 },
      });
      if (!data.success || !data.voiceId) throw new Error('This voice is not ready to use.');
      accountLocalStorage.setItem('superagent_cloned_voice_id', data.voiceId);
      accountLocalStorage.setItem('superagent_cloned_voice', 'active');
      onVoiceCloned({ voiceId: data.voiceId, name: voice.name, model: data.model || 'elevenlabs-v3' });
      toast.success(`${voice.name} is now the Super Agent voice.`, { id: toastId });
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The voice could not be activated.', { id: toastId });
    } finally {
      setIsActivatingExistingVoice(false);
    }
  };

  const stopExistingVoicePreview = () => {
    existingVoiceAudioRef.current?.pause();
    existingVoiceAudioRef.current = null;
    setPlayingExistingVoiceId(null);
  };

  const toggleExistingVoicePreview = async (voice: ProviderVoice) => {
    if (playingExistingVoiceId === voice.voice_id) {
      stopExistingVoicePreview();
      return;
    }

    stopExistingVoicePreview();
    setLoadingExistingVoiceId(voice.voice_id);
    try {
      let previewUrl = voice.preview_url || generatedPreviewUrlsRef.current.get(voice.voice_id) || '';
      if (!previewUrl) {
        const generated = await api.voice.previewVoice(
          voice.voice_id,
          `Hi, I'm ${voice.name}. This is a short sample of how I sound as your Super Agent.`,
        );
        previewUrl = generated.audioUrl;
        generatedPreviewUrlsRef.current.set(voice.voice_id, previewUrl);
      }

      const audio = new Audio(previewUrl);
      existingVoiceAudioRef.current = audio;
      audio.onended = () => {
        setPlayingExistingVoiceId(null);
        existingVoiceAudioRef.current = null;
      };
      audio.onerror = () => {
        setPlayingExistingVoiceId(null);
        existingVoiceAudioRef.current = null;
        toast.error(`The sample for ${voice.name} could not be played.`);
      };
      await audio.play();
      setPlayingExistingVoiceId(voice.voice_id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `The sample for ${voice.name} could not be played.`);
    } finally {
      setLoadingExistingVoiceId(null);
    }
  };

  useEffect(() => {
    if (!isOpen || activeTab !== 'library') stopExistingVoicePreview();
    return () => existingVoiceAudioRef.current?.pause();
  }, [isOpen, activeTab]);

  // Delete Voice from Library (IndexedDB)
  const handleDeleteSavedVoice = async (id: string, name: string) => {
    const updated = await deleteVoiceItem(id);
    setSavedVoices(updated);
    if (playingSavedId === id && savedAudioRef.current) {
      savedAudioRef.current.pause();
      setPlayingSavedId(null);
    }
    toast(`Deleted "${name}" from My Voices.`);
  };

  // Toggle Playing Saved Voice Sample (ALWAYS plays AI Synthesized Voice Preview)
  const togglePlaySavedVoice = async (voice: SavedVoice) => {
    if (playingSavedId === voice.id && savedAudioRef.current) {
      savedAudioRef.current.pause();
      setPlayingSavedId(null);
      return;
    }

    setPlayingSavedId(voice.id);
    // Legacy caches may contain a substituted speaker. Keep the library, regenerate exact previews.
    let audioUrlToPlay: string | undefined;

    // CDN URLs (cloudfront.net) expire after a few hours — treat as missing and re-synthesize
    const isExpiredCdnUrl = audioUrlToPlay && (audioUrlToPlay.includes('cloudfront.net') || audioUrlToPlay.includes('wavespeed'));
    const needsSynth = !audioUrlToPlay || audioUrlToPlay.startsWith('blob:') || isExpiredCdnUrl;

    if (needsSynth) {
      const toastId = toast.loading(`Synthesizing AI voice sample preview for "${voice.name}"...`);
      try {
        const data = await api.voice.testVoiceClone({
          voiceId: voice.providerVoiceId,
          sampleBase64: voice.audioRef,
          model: voice.model,
          voiceSettings: {
            stability: voice.settings.stability,
            similarityBoost: voice.settings.similarityBoost,
            style: voice.settings.styleExaggeration ?? 0.15,
            speed: voice.settings.speechSpeed ?? 1.0
          },
          testText: customTestText || "Hey there! Welcome to the studio! Have you ever wondered why some dental videos go completely viral while others get ignored? How does my voice sound to you right now?"
        });
        if (data && data.audioUrl) {
          audioUrlToPlay = data.audioUrl;
          voice.sampleAudioUrl = data.audioUrl;
          await saveVoiceItem(voice);
          const updated = await getAllSavedVoices();
          setSavedVoices(updated);
        }
        toast.dismiss(toastId);
      } catch (err) {
        toast.dismiss(toastId);
        toast.error('Failed to synthesize voice sample. Check API key or try again.');
        console.warn('[Synthesize AI Sample Error]:', err);
        setPlayingSavedId(null);
        return;
      }
    }

    if (!audioUrlToPlay) {
      // Last resort: play the raw reference audio so the user hears something
      audioUrlToPlay = voice.audioRef;
    }

    if (savedAudioRef.current) {
      try {
        savedAudioRef.current.src = audioUrlToPlay;
        await savedAudioRef.current.play();
      } catch (e) {
        console.warn('[Audio Play Error]:', e);
        toast.error('Audio playback failed. Trying to re-synthesize...');
        // If play failed (e.g. expired URL), clear the cached URL and retry once
        voice.sampleAudioUrl = undefined as any;
        await saveVoiceItem(voice);
        setPlayingSavedId(null);
      }
    }
  };

  const handleSaveAndActivate = async () => {
    if (samples.length === 0) {
      toast.error('Please upload at least one audio or video reference sample to clone.');
      return;
    }

    setModalError(null);
    setIsCloning(true);
    const toastId = toast.loading(`Enrolling voice reference sample into AI voice engine...`);

    try {
      const data = await api.voice.setDefaultVoice({
        voiceReferences: samples.map(s => s.base64), voiceName, model: selectedModel, speakerAuthorized,
        voiceSettings: { stability, similarityBoost, style: styleExaggeration, speed: speechSpeed },
      });
      if (!data.success || !data.voiceId) throw new Error('The provider has not confirmed a ready voice.');

      // Auto-save to My Voices IndexedDB if not already present
      const existing = savedVoices.find(v => v.providerVoiceId === data.voiceId);
      if (!existing) {
        const autoSaved: SavedVoice = {
          id: `voice_${Date.now()}`,
          providerVoiceId: data.voiceId,
          name: voiceName || 'Cloned Voice',
          description: voiceDescription || 'Custom voice clone with fine-tuned pitch and accent retention.',
          model: selectedModel,
          audioRef: samples[0].base64,
      audioRefs: samples.map(s => s.base64),
          sampleAudioUrl: testAudioUrl || undefined,
          dateCreated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          settings: { stability, similarityBoost, styleExaggeration, speechSpeed }
        };
        const updated = await saveVoiceItem(autoSaved);
        setSavedVoices(updated);
      }

      accountLocalStorage.setItem('superagent_cloned_voice_id', data.voiceId);
      accountLocalStorage.setItem('superagent_cloned_voice', 'active');
      accountLocalStorage.setItem('superagent_cloned_voice_audio', samples[0].base64);
      accountLocalStorage.setItem('superagent_voice_settings', JSON.stringify({stability,similarityBoost,styleExaggeration,speechSpeed}));
      toast.success(`Voice Cloned & Activated! Model: ${getModelLabel(selectedModel)}`, { id: toastId });
      onVoiceCloned({
        voiceId: data.voiceId,
        name: voiceName || 'Cloned Voice',
        model: selectedModel,
      });
      onClose();
    } catch (err: any) {
      console.error('[Save Voice Clone Exception]:', err);
      const msg = err.message || 'Voice cloning failed.';
      setModalError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setIsCloning(false);
    }
  };

  const getModelLabel = (id: string) => {
    switch (id) {
      case 'omnivoice':
        return 'OmniVoice (Wavespeed / ByteDance)';
      case 'qwen3-clone':
        return 'Qwen 3.0 Voice Clone (Alibaba / Wavespeed)';
      case 'seed-speech':
        return 'ByteDance Seed-Speech 2.0 (Wavespeed)';
      case 'elevenlabs-v3':
        return 'ElevenLabs v3 (Multilingual v2)';
      case 'elevenlabs-v2':
        return 'ElevenLabs v2 (Turbo v2.5)';
      case 'minimax-clone':
        return 'MiniMax Voice Clone';
      case 'chatterbox':
        return 'ChatterBox TTS';
      case 'mureka-vocal':
        return 'Mureka Vocal & Singing Clone';
      case 'openai-tts':
        return 'OpenAI TTS-1 HD';
      default:
        return 'OmniVoice';
    }
  };

  const toggleTestPlay = () => {
    if (!testAudioRef.current) return;
    if (isPlayingTest) {
      testAudioRef.current.pause();
      setIsPlayingTest(false);
    } else {
      testAudioRef.current.play();
      setIsPlayingTest(true);
    }
  };

  const normalizedVoiceSearch = voiceSearch.trim().toLowerCase();
  const filteredExistingVoices = existingVoices.filter(voice => {
    if (!normalizedVoiceSearch) return true;
    return [voice.name, voice.category, voice.description, ...Object.values(voice.labels || {})]
      .some(value => String(value || '').toLowerCase().includes(normalizedVoiceSearch));
  });

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-2 bg-black/80 backdrop-blur-md sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-[#18181B] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-[#E7C477] border border-[#E7C477]/30">
                <Mic size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Agent's Voice Studio & Library
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/15 text-[#E7C477] border border-[#E7C477]/30">
                    Voice Studio
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Select a voice from your library or clone a new voice with custom accent & tone prompts.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs (My Voices vs Clone New Voice) */}
          <div className="flex border-b border-white/10 bg-black/20 px-6">
            <button
              type="button"
              onClick={() => setActiveTab('clone')}
              className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'clone'
                  ? 'border-[#E7C477] text-[#F2D58D] bg-amber-500/10'
                  : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles size={14} className="text-[#E7C477]" />
              <span>Clone a voice</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'library'
                  ? 'border-[#E7C477] text-[#F2D58D] bg-amber-500/10'
                  : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FolderHeart size={14} className="text-[#E7C477]" />
              <span>Available voices</span>
            </button>
          </div>

          {/* Modal Body — Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

            {/* Persistent Error Banner */}
            {activeTab === 'clone' && <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-zinc-300"><input type="checkbox" checked={speakerAuthorized} onChange={e => setSpeakerAuthorized(e.target.checked)} />I am the speaker or have permission to clone and use this voice.</label>}
          {modalError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start justify-between gap-3 shadow-md">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-300">Voice Synthesis Note</p>
                    <p className="text-[11px] text-rose-200/90 leading-relaxed mt-0.5 font-mono">{modalError}</p>
                  </div>
                </div>
                <button onClick={() => setModalError(null)} className="p-1 text-rose-400 hover:text-white rounded-lg shrink-0">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* TAB 1: MY VOICES LIBRARY */}
            {activeTab === 'library' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#E7C477]/25 bg-[#E7C477]/[0.06] p-4">
                  <div className="mb-3">
                    <h4 className="text-sm font-bold text-[#F5F1E8]">ElevenLabs voices</h4>
                    <p className="mt-1 text-[11px] text-zinc-400">Choose a ready voice for calls and spoken agent responses.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="relative block">
                      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="search"
                        aria-label="Search available voices"
                        value={voiceSearch}
                        onChange={event => setVoiceSearch(event.target.value)}
                        placeholder="Search by name, accent, tone, or category…"
                        className="w-full rounded-xl border border-white/10 bg-zinc-950/70 py-2.5 pl-9 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#E7C477]/55"
                      />
                    </label>
                    <div
                      role="list"
                      aria-label="Available agent voices"
                      className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/55 p-1.5 custom-scrollbar"
                    >
                      {existingVoices.length === 0 && (
                        <p className="px-3 py-6 text-center text-xs text-zinc-500">No provider voices found.</p>
                      )}
                      {existingVoices.length > 0 && filteredExistingVoices.length === 0 && (
                        <p className="px-3 py-6 text-center text-xs text-zinc-500">No voices match that search.</p>
                      )}
                      {filteredExistingVoices.map(voice => {
                        const isSelected = selectedExistingVoiceId === voice.voice_id;
                        const isPlaying = playingExistingVoiceId === voice.voice_id;
                        const isLoading = loadingExistingVoiceId === voice.voice_id;
                        const details = [voice.labels?.gender, voice.labels?.accent, voice.labels?.descriptive, voice.category]
                          .filter(Boolean)
                          .slice(0, 3)
                          .join(' · ');
                        return (
                          <div
                            key={voice.voice_id}
                            role="listitem"
                            className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${isSelected ? 'border-[#E7C477]/45 bg-[#E7C477]/10' : 'border-transparent hover:bg-white/[0.04]'}`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedExistingVoiceId(voice.voice_id)}
                              aria-pressed={isSelected}
                              className="min-w-0 flex-1 px-1 py-1 text-left"
                            >
                              <span className="flex items-center gap-2 text-sm font-semibold text-[#F5F1E8]">
                                {voice.name}
                                {isSelected && <Check size={13} className="shrink-0 text-[#E7C477]" />}
                              </span>
                              {details && <span className="mt-0.5 block truncate text-[10px] capitalize text-zinc-500">{details}</span>}
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleExistingVoicePreview(voice)}
                              disabled={Boolean(loadingExistingVoiceId && !isLoading)}
                              aria-label={`${isPlaying ? 'Pause' : 'Play'} sample of ${voice.name}`}
                              title={`${isPlaying ? 'Pause' : 'Play'} ${voice.name} sample`}
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${isPlaying ? 'border-[#E7C477] bg-[#E7C477] text-[#17130A]' : 'border-[#E7C477]/35 bg-[#E7C477]/10 text-[#F2D58D] hover:bg-[#E7C477]/20'}`}
                            >
                              {isLoading ? <Loader2 size={15} className="animate-spin" /> : isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleActivateExistingVoice()}
                      disabled={!selectedExistingVoiceId || isActivatingExistingVoice}
                      className="ml-auto flex w-full items-center justify-center gap-2 rounded-xl bg-[#E7C477] px-4 py-2.5 text-sm font-bold text-[#17130A] disabled:opacity-40 sm:w-auto"
                    >
                      {isActivatingExistingVoice ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                      Use this voice
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#E7C477] flex items-center gap-2">
                    <FolderHeart size={15} /> Your cloned voices ({savedVoices.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('clone')}
                    className="text-xs font-bold text-[#F2D58D] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    + Clone Another Voice
                  </button>
                </div>

                {savedVoices.length === 0 ? (
                  <div className="py-12 px-4 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02] space-y-3">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 text-[#E7C477] flex items-center justify-center mx-auto">
                      <FolderHeart size={24} />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-white">No Saved Voices Yet</h5>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                        Upload a voice sample in the "Clone New Voice" tab and click "Save to My Voices" to build your custom voice library!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('clone')}
                      className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/20 text-[#F2D58D] border border-[#E7C477]/35 text-xs font-bold transition-all cursor-pointer"
                    >
                      + Clone Your First Voice
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {savedVoices.map((v) => (
                      <div
                        key={v.id}
                        className="p-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#E7C477]/40 transition-all flex flex-col justify-between space-y-3 group"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white group-hover:text-[#F2D58D] transition-colors">
                              {v.name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/15 text-[#F2D58D] border border-[#E7C477]/30">
                              {v.dateCreated}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/10 text-zinc-300">
                              {getModelLabel(v.model)}
                            </span>
                            {v.sampleAudioUrl && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                AI Sample Ready
                              </span>
                            )}
                          </div>

                          {v.description && (
                            <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-[11px] text-zinc-300 flex items-start gap-1.5 italic">
                              <MessageSquareQuote size={13} className="text-[#E7C477] shrink-0 mt-0.5" />
                              <span className="line-clamp-2">"{v.description}"</span>
                            </div>
                          )}
                        </div>

                        {!v.providerVoiceId && ['elevenlabs','elevenlabs-v3'].includes(v.model) && <label className="text-xs text-zinc-300">Link this recording to its existing voice
                          <select aria-label={`Existing provider voice for ${v.name}`} defaultValue="" className="w-full bg-zinc-900 p-2 mt-1 rounded" onChange={async event => {
                            const id=event.target.value;if(!id)return;
                            try { const status=await api.voice.voiceStatus(id,'');if(status.status!=='available')throw new Error('That voice is not ready.');
                              setSavedVoices(await saveVoiceItem({...v,providerVoiceId:id,model:'elevenlabs'}));toast.success('Existing voice linked. Your recording is preserved.');
                            } catch(error) { toast.error(error instanceof Error?error.message:'Voice unavailable.'); }
                          }}><option value="">Select the original provider voice</option>{existingVoices.map(voice=><option key={voice.voice_id} value={voice.voice_id}>{voice.name} · {voice.voice_id.slice(-4)}</option>)}</select>
                        </label>}

                        {/* Action Buttons for Saved Voice Card */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => togglePlaySavedVoice(v)}
                            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-amber-500/15 text-[#F2D58D] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Audition AI voice sample"
                          >
                            {playingSavedId === v.id ? <Pause size={13} /> : <Play size={13} />}
                            <span>{playingSavedId === v.id ? 'Pause' : 'Sample'}</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedVoice(v.id, v.name)}
                              className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                              title="Delete voice from library"
                            >
                              <Trash2 size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleActivateSavedVoice(v)}
                              className="px-3 py-1.5 rounded-lg bg-[#E7C477] hover:bg-[#F2D58D] text-[#17130A] text-xs font-bold shadow-md flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Check size={13} />
                              <span>Set for Agent</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hidden Audio Player for Saved Voices */}
                <audio
                  ref={savedAudioRef}
                  onEnded={() => setPlayingSavedId(null)}
                  onPause={() => setPlayingSavedId(null)}
                  className="hidden"
                />
              </div>
            )}

            {/* TAB 2: CLONE NEW VOICE */}
            {activeTab === 'clone' && (
              <>
                {/* Step 1: Upload Reference Samples */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-[#E7C477] flex items-center justify-between">
                    <span>1. Reference Audio / Video Samples (Up to 5 Clips)</span>
                    {samples.length > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {samples.length} Clip{samples.length > 1 ? 's' : ''} Loaded (Full-Length Audio)
                      </span>
                    )}
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.mov"
                    onChange={handleFilesAdd}
                    className="hidden"
                  />

                  {/* Upload Dropzone */}
                  {samples.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-white/15 hover:border-[#E7C477]/50 rounded-xl bg-white/[0.02] hover:bg-amber-500/[0.03] transition-all flex flex-col items-center justify-center gap-1.5 group cursor-pointer"
                    >
                      <div className="p-2.5 rounded-full bg-amber-500/10 text-[#E7C477] group-hover:scale-110 transition-transform">
                        <Upload size={20} />
                      </div>
                      <span className="text-xs font-semibold text-white">
                        {samples.length === 0 ? 'Click or drag files to upload audio/video samples' : '+ Add Another Reference Audio/Video Clip'}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        10-second reference clips capture exact native accent, pitch, and vocal cadence
                      </span>
                    </button>
                  )}

                  {/* Samples List */}
                  {samples.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {samples.map((s, idx) => (
                        <div key={s.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-6 h-6 rounded-full bg-amber-500/15 text-[#E7C477] flex items-center justify-center text-xs font-bold shrink-0">
                              {idx + 1}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-semibold text-white truncate">{s.name}</p>
                              <p className="text-[10px] text-emerald-400 font-mono">Full-Length Audio Reference</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <audio controls src={s.previewUrl} className="h-7 max-w-[160px] rounded-lg opacity-80 hover:opacity-100 transition-opacity" />
                            <button
                              type="button"
                              onClick={() => removeSample(s.id)}
                              className="p-1.5 text-zinc-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-white/10 cursor-pointer"
                              title="Remove clip"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step 2: Model Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-[#E7C477] flex items-center justify-between">
                    <span>2. AI Synthesis Model (All APIs)</span>
                    <span className="text-[10px] text-zinc-400 font-normal">10 Active Voice Cloning Models</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {[
                      {
                        id: 'omnivoice',
                        title: 'OmniVoice (Wavespeed)',
                        subtitle: 'Official Wavespeed API',
                        badge: 'Recommended',
                        desc: 'Official Wavespeed voice clone matching Wavespeed.ai web app',
                      },
                      {
                        id: 'qwen3-clone',
                        title: 'Qwen 3.0 Voice Clone',
                        subtitle: 'Alibaba / Wavespeed',
                        badge: 'Exact Accent',
                        desc: 'High-precision neural clone with multi-lingual zero-shot accuracy',
                      },
                      {
                        id: 'seed-speech',
                        title: 'Seed-Speech 2.0',
                        subtitle: 'ByteDance / Wavespeed',
                        badge: 'Accent Transfer',
                        desc: 'ByteDance neural voice synthesis with multi-reference audio support',
                      },
                      {
                        id: 'elevenlabs-v3',
                        title: 'ElevenLabs v3',
                        subtitle: 'Multilingual v2 Flagship',
                        badge: 'ElevenLabs',
                        desc: 'Hyper-realistic zero-shot cloning with accent & emotion preservation',
                      },
                      {
                        id: 'elevenlabs-v2',
                        title: 'ElevenLabs v2',
                        subtitle: 'English Turbo v2.5',
                        badge: 'Fast',
                        desc: 'Ultra low-latency English neural voice clone',
                      },
                      {
                        id: 'minimax-clone',
                        title: 'MiniMax Voice Clone',
                        subtitle: 'MiniMax / Wavespeed',
                        badge: 'Wavespeed GPU',
                        desc: 'Zero-shot clone with natural speech breathing & cadence',
                      },
                      {
                        id: 'chatterbox',
                        title: 'ChatterBox TTS',
                        subtitle: 'ChatterBox / Wavespeed',
                        badge: 'Conversational',
                        desc: 'Expressive conversational speech and vocal converter',
                      },
                      {
                        id: 'mureka-vocal',
                        title: 'Mureka Vocal Clone',
                        subtitle: 'Mureka AI / Wavespeed',
                        badge: 'Singing & Vocal',
                        desc: 'Specialized in musical vocal cloning and melodic voice tracks',
                      },
                      {
                        id: 'zonos2',
                        title: 'Zyphra Zonos v2',
                        subtitle: 'Zyphra / Wavespeed',
                        badge: 'Ultra-Realism',
                        desc: 'Advanced neural cloning with emotion & speech rate control',
                      },
                      {
                        id: 'openai-tts',
                        title: 'OpenAI TTS-1 HD',
                        subtitle: 'OpenAI Neural',
                        badge: 'Neural HD',
                        desc: 'Studio quality neutral speech synthesis (Shimmer / Nova / Alloy)',
                      },
                    ].map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedModel(m.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          selectedModel === m.id
                            ? 'bg-amber-500/15 border-[#E7C477] text-white shadow-lg shadow-amber-500/10'
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">{m.title}</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-white/10 text-[#F2D58D]">
                            {m.badge}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 block mb-1">{m.subtitle}</span>
                        <span className="text-[10px] text-zinc-500 leading-tight">{m.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step 3: Voice Name, Description Prompt & Fine-Tuning Sliders */}
                <div className="space-y-4 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-[#E7C477] flex items-center gap-1.5">
                      <Sliders size={14} /> 3. Voice Persona, Description & Vocal Tuning
                    </label>
                  </div>

                  {/* Voice Name */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Voice Persona Name</label>
                    <input
                      type="text"
                      value={voiceName}
                      onChange={(e) => setVoiceName(e.target.value)}
                      placeholder="e.g. Dr. H Dentist Voice"
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-xs font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#E7C477]/50"
                    />
                  </div>

                  {/* Voice Description & Tone Prompt Box */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-[#F2D58D] flex items-center justify-between mb-1">
                      <span>Voice & Tone Description Prompt</span>
                      <span className="text-[9px] text-zinc-400 font-normal">Describe accent, tone, pacing & emotion</span>
                    </label>
                    <textarea
                      value={voiceDescription}
                      onChange={(e) => setVoiceDescription(e.target.value)}
                      rows={2}
                      placeholder="Describe the voice, accent, and tone (e.g. Energetic female British accent with warm, confident tone and natural pauses for dental educational videos)..."
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#E7C477]/50 resize-none"
                    />
                  </div>

                  {/* Sample Speech Script for Testing */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-[#F2D58D] flex items-center justify-between mb-1">
                      <span>Sample Speech Script for Testing</span>
                      <span className="text-[9px] text-zinc-400 font-normal">Editable test script with questions & emotional variation</span>
                    </label>
                    <textarea
                      value={customTestText}
                      onChange={(e) => setCustomTestText(e.target.value)}
                      rows={3}
                      placeholder="Type any test script to audition your cloned voice..."
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#E7C477]/50 resize-none font-mono leading-relaxed"
                    />
                  </div>

                  {/* Sliders Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Stability */}
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-zinc-300">Stability</span>
                        <span className="font-mono text-[#E7C477] font-bold">{stability.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={stability}
                        onChange={(e) => setStability(parseFloat(e.target.value))}
                        className="w-full accent-[#E7C477] cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500">
                        <span>Expressive</span>
                        <span>Consistent</span>
                      </div>
                    </div>

                    {/* Similarity Boost */}
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-zinc-300">Similarity / Clarity</span>
                        <span className="font-mono text-[#E7C477] font-bold">{similarityBoost.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={similarityBoost}
                        onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
                        className="w-full accent-[#E7C477] cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500">
                        <span>Low Clarity</span>
                        <span>Exact Clone Match</span>
                      </div>
                    </div>

                    {/* Style Exaggeration */}
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-zinc-300">Style Exaggeration</span>
                        <span className="font-mono text-[#E7C477] font-bold">{styleExaggeration.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={styleExaggeration}
                        onChange={(e) => setStyleExaggeration(parseFloat(e.target.value))}
                        className="w-full accent-[#E7C477] cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500">
                        <span>Natural</span>
                        <span>High Drama</span>
                      </div>
                    </div>

                    {/* Speech Speed */}
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-zinc-300">Speech Speed</span>
                        <span className="font-mono text-[#E7C477] font-bold">{speechSpeed.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.75"
                        max="1.50"
                        step="0.05"
                        value={speechSpeed}
                        onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                        className="w-full accent-[#E7C477] cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500">
                        <span>0.75x Slower</span>
                        <span>1.50x Faster</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>

          {/* Sticky Test Audio Preview Player (if test audio generated) */}
          {testAudioUrl && activeTab === 'clone' && (
            <div className="px-6 py-3 bg-amber-500/10 border-t border-[#E7C477]/30 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleTestPlay}
                  className="w-10 h-10 rounded-full bg-[#E7C477] text-[#17130A] flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer"
                >
                  {isPlayingTest ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-2">
                    🔊 Listening to AI-Synthesized Voice Sample Preview
                    {isPlayingTest && (
                      <span className="flex items-center gap-0.5 text-[#E7C477]">
                        <span className="w-1 h-3 bg-amber-500 animate-pulse rounded-full" />
                        <span className="w-1 h-4 bg-amber-400 animate-pulse rounded-full delay-75" />
                        <span className="w-1 h-2 bg-amber-300 animate-pulse rounded-full delay-150" />
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-[#F2D58D]">Synthesized with {getModelLabel(selectedModel)}</p>
                </div>
              </div>

              <audio
                ref={testAudioRef}
                src={testAudioUrl}
                onEnded={() => setIsPlayingTest(false)}
                onPause={() => setIsPlayingTest(false)}
                onPlay={() => setIsPlayingTest(true)}
                className="hidden"
              />

              <button
                type="button"
                onClick={toggleTestPlay}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                {isPlayingTest ? 'Pause Sample' : 'Replay Sample'}
              </button>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="p-4 border-t border-white/10 bg-black/50 flex items-center justify-between gap-3">
            {activeTab === 'clone' ? (
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestVoice}
                    disabled={isTesting || samples.length === 0}
                    className="px-3.5 py-2.5 rounded-xl border border-[#E7C477]/40 bg-amber-500/10 hover:bg-amber-500/15 text-[#F2D58D] text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-sm"
                  >
                    {isTesting ? <Loader2 size={14} className="animate-spin text-[#E7C477]" /> : <Volume2 size={14} className="text-[#E7C477]" />}
                    <span>{testAudioUrl ? 'Re-test Sample' : 'Test Sample'}</span>
                  </button>

                  {/* SAVE TO MY VOICES BUTTON */}
                  <button
                    type="button"
                    onClick={handleSaveToMyVoices}
                    disabled={samples.length === 0}
                    className="px-3.5 py-2.5 rounded-xl border border-purple-500/40 bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-sm"
                    title="Save this voice model into your My Voices library for future use"
                  >
                    <BookmarkPlus size={14} className="text-purple-400" />
                    <span>Save to My Voices</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAndActivate}
                    disabled={isCloning || samples.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-[#E7C477] hover:bg-[#F2D58D] text-[#17130A] text-xs font-bold shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isCloning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    <span>Clone & Set as Agent's Voice</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab('clone')}
                  className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 text-[#F2D58D] border border-[#E7C477]/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Mic size={14} />
                  <span>+ Clone / Add New Voice</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Close Library
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
