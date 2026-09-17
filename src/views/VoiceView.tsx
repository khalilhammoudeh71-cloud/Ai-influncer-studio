import { LatestVoicePreview, VoiceDraftGuard, type CloneResult } from '../../shared/personaVoiceLifecycle';
import { restoreSavedVoice, type SavedPersonaVoice } from '../../shared/personaVoiceLibrary';
import SavedPersonaVoices from '../components/SavedPersonaVoices';
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotatingHeroImages } from '../components/RotatingHeroImages';
import { useProMode, ProModeToggle } from '../utils/useProMode';
import { 
  Mic, 
  Sparkles, 
  Play, 
  Pause, 
  Video, 
  Download, 
  Volume2, 
  Wind, 
  Coffee, 
  Dumbbell, 
  Users, 
  Zap, 
  Heart, 
  Check, 
  History,
  Image as ImageIcon,
  Type,
  ChevronRight,
  ChevronDown,
  Loader2,
  Settings2,
  Music,
  Search,
  SlidersHorizontal,
  AudioLines,
  Globe2,
  Crown,
  Star,
  Film,
  FolderOpen,
  Upload
} from 'lucide-react';
import { Persona, NavActions } from '../types';
import { api } from '../services/apiService';
import { fetchVideoModels, type ModelInfo } from '../services/imageService';
import { cn } from '../utils/cn';
import { processImageFile } from '../utils/imageProcessing';
import { readCloneSampleFile, processVoiceSampleFile } from '../utils/audioUtils';
import { accountLocalStorage } from '../utils/accountStorage';
import toast from 'react-hot-toast';
import WebcamAvatarCreator from '../components/WebcamAvatarCreator';

interface VoiceViewProps {
  persona: Persona | null;
  personas: Persona[];
  onSelectPersona: (id: string) => void;
  nav: NavActions;
  billingInfo?: any;
}

interface VoiceProduction {
  id: string;
  type: 'audio' | 'video';
  url: string;
  timestamp: number;
  label?: string;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
  labels: Record<string, string>;
  settings: { stability: number; similarity_boost: number; style: number };
}

const EMOTIONS = [
  { id: 'neutral', name: 'Neutral', icon: Check, prompt: '' },
  { id: 'comforting', name: 'Comforting', icon: Heart, prompt: 'Gentle, reassuring, unhurried.' },
  { id: 'excited', name: 'Excited', icon: Zap, prompt: 'Warm enthusiasm.' },
  { id: 'playful', name: 'Playful', icon: Sparkles, prompt: 'Light, subtle teasing.' },
];

const ATMOSPHERES = [
  { id: 'cafe', name: 'Café', icon: Coffee, sound: 'Busy coffee shop background with clinking cups and distant chatter.' },
  { id: 'gym', name: 'Gym', icon: Dumbbell, sound: 'Faint workout music and the sound of weights in a large room.' },
  { id: 'nature', name: 'Nature', icon: Wind, sound: 'Soft wind blowing through trees and distant birds chirping.' },
  { id: 'street', name: 'City', icon: Users, sound: 'Distant city traffic and muffled street atmosphere.' },
];

const SOCIAL_TEMPLATES = [
  { id: 'asmr', name: 'ASMR', description: 'Whisper-quiet & intimate' },
  { id: 'news', name: 'Breaking News', description: 'Fast & authoritative' },
  { id: 'story', name: 'Storytime', description: 'Warm & narrative' },
  { id: 'viral', name: 'Viral Hype', description: 'High-hook & energetic' },
];

const OPENAI_VOICES = [
  { id: 'alloy', name: 'Alloy', desc: 'Versatile, balanced, and neutral', gender: 'Neutral' },
  { id: 'echo', name: 'Echo', desc: 'Soft, confident, and warm', gender: 'Male' },
  { id: 'fable', name: 'Fable', desc: 'British, expressive, and narrative', gender: 'Neutral' },
  { id: 'onyx', name: 'Onyx', desc: 'Deep, authoritative, and strong', gender: 'Male' },
  { id: 'nova', name: 'Nova', desc: 'Bright, energetic, and professional', gender: 'Female' },
  { id: 'shimmer', name: 'Shimmer', desc: 'Clear, high-pitched, and engaging', gender: 'Female' },
];

const GEMINI_VOICES = [
  { id: 'Puck', name: 'Puck', desc: 'Neutral, warm, and engaging', gender: 'Neutral' },
  { id: 'Charon', name: 'Charon', desc: 'Deep, rich, and authoritative', gender: 'Male' },
  { id: 'Kore', name: 'Kore', desc: 'Clear, gentle, and calm', gender: 'Female' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Dynamic, expressive, and playful', gender: 'Male' },
  { id: 'Aoede', name: 'Aoede', desc: 'Bright, energetic, and narrative', gender: 'Female' },
];

const FALLBACK_VIDEO_MODELS: ModelInfo[] = [
  { id: 'wavespeed-i2v:alibaba/wan-3.0/image-to-video', name: 'Wan 3.0 Image to Video', price: 0, provider: 'WaveSpeed', type: 'image-to-video', description: 'Current WaveSpeed default with 480p, 720p, and 1080p output', hasEditVariant: false },
  { id: 'google:veo-3', name: 'Veo 3.1', price: 0, provider: 'Google', type: 'image-to-video', description: '8s 720p, native audio, stunning realism', hasEditVariant: false },
  { id: 'google:veo-3-fast', name: 'Veo 3.1 Lite', price: 0, provider: 'Google', type: 'image-to-video', description: 'Faster generation, 8s 720p', hasEditVariant: false },
  { id: 'google:veo-2', name: 'Veo 2', price: 0, provider: 'Google', type: 'image-to-video', description: '8s 720p, high quality, no audio', hasEditVariant: false },
  { id: 'wavespeed-i2v:wavespeed-ai/wan-2.1-i2v-720p', name: 'Wan 2.1 I2V 720p', price: 0, provider: 'Wavespeed', type: 'image-to-video', description: 'Image-to-video, 720p, 5s clips', hasEditVariant: false },
  { id: 'wavespeed-i2v:wavespeed-ai/wan-2.2-i2v-720p', name: 'Wan 2.2 I2V 720p', price: 0, provider: 'Wavespeed', type: 'image-to-video', description: 'Next-gen, improved realism', hasEditVariant: false },
];

const OMNIVOICE_VOICES = [
  { id: 'persona-clone', name: 'Persona Cloned Voice', desc: 'Zero-shot clone using persona audio reference', gender: 'Dynamic' },
  { id: 'preset-luna', name: 'Luna Presets Clone', desc: 'Feminine, professional, and clear', gender: 'Female' },
  { id: 'preset-alex', name: 'Alex Presets Clone', desc: 'Masculine, deep, and conversational', gender: 'Male' },
];

const QWEN_VOICES = [
  { id: 'qwen-female', name: 'Qwen Female', desc: 'Warm, expressive female voice', gender: 'Female' },
  { id: 'qwen-male', name: 'Qwen Male', desc: 'Deep, conversational male voice', gender: 'Male' },
  { id: 'qwen-neutral', name: 'Qwen Neutral', desc: 'Clear, informative neutral voice', gender: 'Neutral' },
];

type VoiceEngine = 'elevenlabs' | 'openai' | 'gemini' | 'omnivoice' | 'minimax-clone' | 'qwen3-clone' | 'seed-speech' | 'chatterbox' | 'mureka-vocal' | 'qwen-tts';

export default function VoiceView({ persona, personas, onSelectPersona, nav, billingInfo }: VoiceViewProps) {
  const [isPro, togglePro] = useProMode();
  const [studioStage, setStudioStage] = useState<'write' | 'voice' | 'listen'>('write');
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>(OPENAI_VOICES[0].id);
  const [performancePrompt, setPerformancePrompt] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [selectedAtmosphere, setSelectedAtmosphere] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoModels, setVideoModels] = useState<ModelInfo[]>([]);
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>(FALLBACK_VIDEO_MODELS[0].id);
  const [selectedImage, setSelectedImage] = useState<string | null>(persona?.avatar || null);
  const [history, setHistory] = useState<VoiceProduction[]>([]);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  useEffect(() => {
    fetchVideoModels().then(models => {
      setVideoModels(models);
      if (models.length > 0) {
        setSelectedVideoModel(current => models.some(model => model.id === current) ? current : models[0].id);
      }
    }).catch(error => {
      console.warn('[VoiceView] Could not load server-priced video models:', error);
    });
  }, []);

  // ElevenLabs state
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>('elevenlabs');
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [selectedELVoiceId, setSelectedELVoiceId] = useState<string>('');
  const [voiceSearch, setVoiceSearch] = useState('');

  // OmniVoice Reference File States
  const [omnivoiceRefBase64, setOmnivoiceRefBase64] = useState<string | null>(null);
  const [omnivoiceRefUrl, setOmnivoiceRefUrl] = useState<string | null>(null);
  const [omnivoiceRefName, setOmnivoiceRefName] = useState<string | null>(null);

  const activeVoices = useMemo(() => {
    if (voiceEngine === 'gemini') return GEMINI_VOICES;
    if (voiceEngine === 'openai') return OPENAI_VOICES;
    if (voiceEngine === 'omnivoice') return OMNIVOICE_VOICES;
    if (voiceEngine === 'qwen-tts') return QWEN_VOICES;
    return [];
  }, [voiceEngine]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [hasElevenLabsKey, setHasElevenLabsKey] = useState(true);

  // Voice settings (ElevenLabs)
  const [stability, setStability] = useState(0.5);
  const [clarity, setClarity] = useState(0.75);
  const [style, setStyle] = useState(0.0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const cloningAudioLibraryInputRef = useRef<HTMLInputElement>(null);
  const cloningAudioFilesInputRef = useRef<HTMLInputElement>(null);
  const [cloningAudioUploadMenuOpen, setCloningAudioUploadMenuOpen] = useState(false);

  const omnivoiceRefLibraryInputRef = useRef<HTMLInputElement>(null);
  const omnivoiceRefFilesInputRef = useRef<HTMLInputElement>(null);
  const [omnivoiceRefUploadMenuOpen, setOmnivoiceRefUploadMenuOpen] = useState(false);

  // Voice Cloning & Sync States
  const [showClonePanel, setShowClonePanel] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [cloneDesc, setCloneDesc] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cloningAudioBase64, setCloningAudioBase64] = useState<string | null>(null);
  const [cloningAudioUrl, setCloningAudioUrl] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [isSavingDefaultVoice, setIsSavingDefaultVoice] = useState(false);
  const saveDefaultBusy = useRef(false);
  const [attachOnClone, setAttachOnClone] = useState(false);
  const [targetAttachPersonaId, setTargetAttachPersonaId] = useState<string>('none');
  const [isWebcamCreatorOpen, setIsWebcamCreatorOpen] = useState(false);
  const [speakerAuthorized, setSpeakerAuthorized] = useState(false);
  const [cloneResult, setCloneResult] = useState<CloneResult | null>(null);
  const cloneBusyRef = useRef(false);
  const cloneGuard = useRef(new VoiceDraftGuard());
  const previewPlayer = useRef(new LatestVoicePreview());
  useEffect(() => {
    cloneGuard.current.change(); previewPlayer.current.stop(); setPreviewingVoice(null);
  }, [persona?.id, targetAttachPersonaId, selectedELVoiceId, voiceEngine, attachOnClone, stability, clarity, style, selectedEmotion, persona?.voiceSpeakingSpeed]);
  useEffect(() => { cloneGuard.current.change(); setCloneResult(null); setSpeakerAuthorized(false); }, [cloningAudioBase64]);
  useEffect(() => () => { cloneGuard.current.change(); previewPlayer.current.stop(); }, []);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const fetchVoices = async () => {
    setIsLoadingVoices(true);
    setVoicesError(null);
    try {
      const data = await api.voice.getVoices();
      setElevenLabsVoices(data.voices);

    } catch (err: any) {
      console.error('[Voice] Failed to fetch ElevenLabs voices:', err);
      setVoicesError(err.message || 'Failed to load voices');
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleWebcamCreatorComplete = async (avatarId: string, voiceId?: string, portraitBase64?: string) => {
    // Refresh voice list
    await fetchVoices();
    if (voiceId) {
      setSelectedELVoiceId(voiceId);
      setVoiceEngine('elevenlabs');
    }
    if (persona) {
      const updated = {
        ...persona,
        heygenAvatarId: avatarId,
        avatar: portraitBase64 || persona.avatar,
        referenceImage: portraitBase64 || persona.referenceImage,
        ...(voiceId ? { voiceId, voiceEngine: 'elevenlabs' } : {}),
      };
      try {
        await api.updatePersonaInVault(updated as any);
        onSelectPersona(persona.id);
        toast.success('Persona updated with custom HeyGen avatar!');
      } catch (err) {
        console.error('Failed to update persona:', err);
        toast.error('Failed to link avatar to persona database.');
      }
    }
    setCloneName('');
    setCloneDesc('');
    setShowClonePanel(false);
  };
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  // Sync voice selection with active persona's voice settings
  useEffect(() => {
    if (persona) {
      setStability((persona.voiceStability ?? 75) / 100);
      setClarity((persona.voiceLikeness ?? 85) / 100);
      setStyle((persona.voiceStyleExaggeration ?? 20) / 100);
      if (persona.voiceEngine === 'elevenlabs' && persona.voiceId) {
        setVoiceEngine('elevenlabs');
        setSelectedELVoiceId(persona.voiceId);
      } else if (persona.voiceEngine === 'openai' && persona.voiceId) {
        setVoiceEngine('openai');
        setSelectedVoice(persona.voiceId);
      } else if (persona.voiceEngine) {
        setVoiceEngine(persona.voiceEngine as VoiceEngine);
        setSelectedVoice(persona.voiceId || '');
      }
    }
  }, [persona?.id, persona?.voiceEngine, persona?.voiceId, persona?.voiceRevision, persona?.voiceStability, persona?.voiceLikeness, persona?.voiceStyleExaggeration]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(recordingChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setCloningAudioBase64(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        setCloningAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('[Voice Recording] Error:', err);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const handleCloningAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setShowClonePanel(true);
    if (!cloneName) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
      setCloneName(cleanName);
    }

    try {
      const sample = await readCloneSampleFile(file);
      setCloningAudioBase64(sample.base64);
      setCloningAudioUrl(URL.createObjectURL(file));
      toast.success(`Voice sample loaded: ${file.name}`);
    } catch (err) {
      console.error('[Cloning Audio Upload Error]:', err);
      toast.error('Could not process audio/video sample');
    }
  };

  const handleOmnivoiceRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setOmnivoiceRefName(file.name);
    try {
      const sample = await processVoiceSampleFile(file);
      setOmnivoiceRefBase64(sample.base64);
      setOmnivoiceRefUrl(URL.createObjectURL(file));
    } catch (err) {
      console.error('[Omnivoice Ref Upload Error]:', err);
      toast.error('Could not process reference file');
    }
  };

  const handleSaveDefaultVoice = async () => {
    if (!persona || saveDefaultBusy.current) return;
    saveDefaultBusy.current = true; setIsSavingDefaultVoice(true);
    try {
      const activeVoiceId = voiceEngine === 'elevenlabs' ? selectedELVoiceId : selectedVoice;
      if (!activeVoiceId) {
        toast.error('Please select a voice first');
        return;
      }
      const updatedPersona = {
        ...persona,
        voiceEngine,
        voiceId: activeVoiceId,
        voiceName: elevenLabsVoices.find(v => v.voice_id === activeVoiceId)?.name || activeVoices.find(v => v.id === activeVoiceId)?.name || (cloneResult?.voiceId === activeVoiceId ? cloneResult.name : '') || 'Selected voice',
        voiceStability: stability * 100, voiceLikeness: clarity * 100, voiceStyleExaggeration: style * 100,
        ...(cloneResult?.voiceId === activeVoiceId && cloningAudioBase64 ? {
          voiceSampleUrl: cloningAudioBase64,
          audioSamples: [{ name: cloneResult.name, base64: cloningAudioBase64 }],
        } : activeVoiceId !== persona.voiceId || voiceEngine !== persona.voiceEngine ? { voiceSampleUrl: '', audioSamples: [] } : {}),
      };
      await api.updatePersonaInVault(updatedPersona);
      toast.success(`Voice attached as default for ${persona.name}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to attach voice to persona');
    } finally {
      saveDefaultBusy.current = false; setIsSavingDefaultVoice(false);
    }
  };

  const handleRestoreSavedVoice = async (voice: SavedPersonaVoice) => {
    if (!persona || saveDefaultBusy.current) return;
    saveDefaultBusy.current = true; setIsSavingDefaultVoice(true);
    cloneGuard.current.change(); previewPlayer.current.stop();
    try {
      await api.updatePersonaInVault({ ...persona, ...restoreSavedVoice(voice) });
      toast.success(`${voice.name} is the default again.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not restore the saved voice.');
    } finally {
      saveDefaultBusy.current = false; setIsSavingDefaultVoice(false);
    }
  };

  const handleCloneVoiceSubmit = async (checkOnly = false, retryRejected = false) => {
    if (cloneBusyRef.current) return;
    if (!checkOnly && (!cloneName.trim() || !cloningAudioBase64 || !speakerAuthorized)) { toast.error('Enter a name, add audio, and confirm speaker authorization.'); return; }
    cloneBusyRef.current = true; setIsCloning(true);
    const revision = cloneGuard.current.begin();
    const targetP = (persona && persona.id !== 'empty') ? persona : personas.find(p => p.id === targetAttachPersonaId);
    try {
      const result = checkOnly && cloneResult ? await api.voice.cloneStatus(cloneResult.id) : await api.voice.cloneVoice(cloneName, cloneDesc, cloningAudioBase64!, speakerAuthorized, retryRejected);
      if (!cloneGuard.current.isCurrent(revision)) return;
      setCloneResult(result);
      if (result.status !== 'ready' || !result.voiceId) return;
      if (attachOnClone && targetP && targetP.id !== 'empty') {
        await api.updatePersonaInVault({ ...targetP, voiceEngine: 'elevenlabs', voiceId: result.voiceId, voiceName: result.name, voiceSampleUrl: cloningAudioBase64 || '', audioSamples: cloningAudioBase64 ? [{ name: result.name, base64: cloningAudioBase64 }] : [] });
        if (!cloneGuard.current.isCurrent(revision)) return;
        toast.success(`Saved the ready voice for ${targetP.name}.`);
      }
      setSelectedELVoiceId(result.voiceId); setVoiceEngine('elevenlabs');
      toast.success('Clone ready. Audition it before saving it as your persona voice.');
      await fetchVoices();
    } catch (error) { if (cloneGuard.current.isCurrent(revision)) toast.error(error instanceof Error ? error.message : 'Voice cloning failed.'); }
    finally { cloneBusyRef.current = false; setIsCloning(false); }
  };

  // Check if ElevenLabs is available
  useEffect(() => {
    api.getConfigStatus().then(config => {
      setHasElevenLabsKey(!!config.elevenlabs);
      if (!config.elevenlabs) {
        setVoiceEngine('openai');
      }
    }).catch(() => {});
  }, []);

  // Fetch ElevenLabs voices when engine is selected
  useEffect(() => {
    if (voiceEngine !== 'elevenlabs' || !hasElevenLabsKey) return;
    if (elevenLabsVoices.length > 0) return; // already loaded

    fetchVoices();
  }, [voiceEngine, hasElevenLabsKey, elevenLabsVoices.length]);

  // Reset selected voice when switching native engines
  useEffect(() => {
    if (voiceEngine === 'gemini') {
      setSelectedVoice(GEMINI_VOICES[0].id);
    } else if (voiceEngine === 'openai') {
      setSelectedVoice(OPENAI_VOICES[0].id);
    } else if (voiceEngine === 'omnivoice') {
      setSelectedVoice(OMNIVOICE_VOICES[0].id);
    } else if (voiceEngine === 'qwen-tts') {
      setSelectedVoice(QWEN_VOICES[0].id);
    }
  }, [voiceEngine]);

  // Filter ElevenLabs voices
  const filteredVoices = useMemo(() => {
    let filtered = elevenLabsVoices;
    if (voiceSearch) {
      const q = voiceSearch.toLowerCase();
      filtered = filtered.filter(v => 
        v.name.toLowerCase().includes(q) || 
        v.description?.toLowerCase().includes(q) ||
        Object.values(v.labels).some(l => l.toLowerCase().includes(q))
      );
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(v => v.category === categoryFilter);
    }
    if (genderFilter !== 'all') {
      filtered = filtered.filter(v => {
        const gender = v.labels?.gender?.toLowerCase() || '';
        return gender === genderFilter;
      });
    }
    return filtered;
  }, [elevenLabsVoices, voiceSearch, categoryFilter, genderFilter]);

  // Load history on mount
  useEffect(() => {
    if (persona) {
      const saved = accountLocalStorage.getItem(`vox_vault_${persona.id}`);
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (e) {
          console.error('[Vox] Load error:', e);
        }
      }
    }
  }, [persona?.id]);

  // Persist history safely
  useEffect(() => {
    if (persona && history.length > 0) {
      try {
        accountLocalStorage.setItem(`vox_vault_${persona.id}`, JSON.stringify(history));
      } catch (e) {
        console.warn('[Vox] Could not save full history to localStorage (quota exceeded). Storing light version.');
        // If quota exceeded, we try to store a lighter version without massive base64 payloads
        try {
          const lightHistory = history.map(item => ({
            ...item,
            url: item.url.startsWith('data:') ? '' : item.url // Strip base64 content
          }));
          accountLocalStorage.setItem(`vox_vault_${persona.id}`, JSON.stringify(lightHistory));
        } catch (err) {
          console.error('[Vox] Failed entirely to save history', err);
        }
      }
    }
  }, [history, persona?.id]);

  useEffect(() => {
    if (persona && !selectedImage) setSelectedImage(persona.avatar);
  }, [persona]);

  const handleGenerateScript = async (mode: 'generate' | 'enhance' | 'surprise' = 'generate') => {
    if (!persona) return;
    if (mode === 'generate' && !topic) return;
    
    setIsGeneratingScript(true);
    try {
      const res = await api.voice.generateScript({
        topic: mode === 'surprise' ? "Create a random viral script" : topic,
        persona,
        mode,
        existingScript: script,
        length: '30 seconds'
      });
      setScript(res.script);
    } catch (err) {
      console.error('[Vox] Script error:', err);
      window.alert('Script Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateVoice = async () => {
    if (!script) return;
    setIsGeneratingVoice(true);
    try {
      const emotion = EMOTIONS.find(e => e.id === selectedEmotion);
      const atmos = ATMOSPHERES.find(a => a.id === selectedAtmosphere);
      const prompt = [emotion?.prompt, performancePrompt].filter(Boolean).join('. ');
      
      const speechParams: Parameters<typeof api.voice.generateSpeech>[0] = {
        text: script,
        emotion: selectedEmotion || 'neutral',
        activePersona: persona || undefined,
        engine: voiceEngine,
      };

      if (voiceEngine === 'elevenlabs') {
        speechParams.voiceId = selectedELVoiceId;
        speechParams.voiceSettings = {
          stability,
          similarity_boost: clarity,
          style,
          speed: persona?.voiceSpeakingSpeed ?? 1,
        };
      } else {
        speechParams.voice = selectedVoice;
        if (voiceEngine === 'omnivoice' && selectedVoice === 'persona-clone' && omnivoiceRefBase64) {
          speechParams.voiceReference = omnivoiceRefBase64;
        }
      }

      const res = await api.voice.generateSpeech(speechParams);
      setAudioUrl(res.audioUrl);
      setStudioStage('listen');
      const newProd: VoiceProduction = {
        id: Date.now().toString(),
        type: 'audio',
        url: res.audioUrl,
        timestamp: Date.now(),
        label: script.substring(0, 30) + (script.length > 30 ? '...' : '')
      };
      setHistory(prev => [newProd, ...prev]);
    } catch (err) {
      console.error('[Vox] Speech error:', err);
      window.alert('Speech Error: ' + (err instanceof Error ? err.message : 'Synthesis failed'));
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleVoicePreview = async (voiceId: string, _previewUrl?: string) => {
    if (previewingVoice === voiceId) { previewPlayer.current.stop(); setPreviewingVoice(null); return; }
    setPreviewingVoice(voiceId);
    try {
      await previewPlayer.current.play(async () => {
        const text = `Hi, I'm ${persona?.name || 'your creator'}. Let's talk about ${persona?.niche || 'what inspires us'}. What would you like to create today?`;
        const result = voiceEngine === 'elevenlabs' ? await api.voice.previewVoice(voiceId, text, { stability, similarity_boost: clarity, style, speed: persona?.voiceSpeakingSpeed ?? 1 }, selectedEmotion || 'neutral') : await api.voice.generateSpeech({ voiceId, voice: voiceId, engine: voiceEngine, text, isPreview: true, activePersona: persona || undefined, voiceReference: persona?.voiceSampleUrl, emotion: selectedEmotion || 'neutral', voiceSettings: {speed: persona?.voiceSpeakingSpeed ?? 1} });
        return result.audioUrl;
      }, url => {
        const audio = new Audio(url); previewAudioRef.current = audio;
        audio.onended = () => { if (previewAudioRef.current === audio) setPreviewingVoice(null); };
        audio.onerror = () => { if (previewAudioRef.current === audio) setPreviewingVoice(null); };
        void audio.play().catch(() => { if (previewAudioRef.current === audio) setPreviewingVoice(null); });
        return audio;
      });
    } catch (error) { setPreviewingVoice(null); toast.error(error instanceof Error ? error.message : 'Preview unavailable.'); }
  };

  const handleTranslate = async (lang: string) => {
    if (!script) return;
    setIsTranslating(true);
    try {
      const res = await api.voice.translateText({ text: script, targetLanguage: lang });
      setScript(res.translatedText);
      setTargetLanguage(lang);
    } catch (err) {
      console.error('[Vox] Translation error:', err);
      window.alert('Translation Error: ' + (err instanceof Error ? err.message : 'Check your API connection'));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!audioUrl || !selectedImage) return;
    setIsGeneratingVideo(true);
    setVideoError(null);
    setGeneratedVideoUrl(null);
    
    const talkingPrompt = `A high-quality talking video of the person. Cinematic lighting, direct eye contact with the viewer. The mouth moves exactly to match speech. Natural facial expressions, blinking, and subtle head tilts. 4k, photorealistic.`;
    
    try {
      console.log(`[VoiceView] Generating video with model: ${selectedVideoModel}`);
      const res = await api.images.generateVideo({
        personaClientId: persona?.id,
        prompt: talkingPrompt,
        modelId: selectedVideoModel,
        sourceImage: selectedImage,
        identityLock: true,
        naturalLook: true
      });
      
      if (res.videoUrl) {
        setGeneratedVideoUrl(res.videoUrl);
        const newProd: VoiceProduction = {
          id: Date.now().toString(),
          type: 'video',
          url: res.videoUrl,
          timestamp: Date.now(),
          label: `Talking Video (${videoModels.find(m => m.id === selectedVideoModel)?.name || selectedVideoModel})`
        };
        setHistory(prev => [newProd, ...prev]);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[VoiceView] Video generation failed:', errMsg);
      setVideoError(errMsg);
      window.alert('Video Generation Error: ' + errMsg);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const applyTemplate = (template: typeof SOCIAL_TEMPLATES[0]) => {
    switch (template.id) {
      case 'asmr':
        setSelectedEmotion('mysterious');
        setSelectedAtmosphere('nature');
        setPerformancePrompt('Whisper softly, very close to the mic, extremely slow pace.');
        break;
      case 'news':
        setSelectedEmotion('serious');
        setSelectedAtmosphere(null);
        setPerformancePrompt('Speak at a fast, authoritative pace with clear articulation.');
        break;
      case 'story':
        setSelectedEmotion('calm');
        setSelectedAtmosphere('cafe');
        setPerformancePrompt('Warm, narrative tone, like telling a secret to a friend.');
        break;
      case 'viral':
        setSelectedEmotion('energetic');
        setSelectedAtmosphere('gym');
        setPerformancePrompt('EXTREMELY energetic, high volume, fast pace, absolute excitement.');
        break;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const b64 = await processImageFile(file);
        setSelectedImage(b64);
      } catch (err) {
        console.error('[Voice] Failed to process image:', err);
      }
    }
  };

  // Get voice label helpers
  const getVoiceGender = (v: ElevenLabsVoice) => v.labels?.gender || '';
  const getVoiceAccent = (v: ElevenLabsVoice) => v.labels?.accent || '';
  const getVoiceAge = (v: ElevenLabsVoice) => v.labels?.age || '';
  const getVoiceUseCase = (v: ElevenLabsVoice) => v.labels?.use_case || v.labels?.['use case'] || '';

  if (!persona) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="p-4 bg-[var(--accent-primary-soft)] rounded-2xl border border-[var(--border-default)] mb-6 backdrop-blur-xl">
          <Mic className="w-12 h-12 text-[var(--accent-primary)]" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Voice Studio</h2>
        <p className="text-[var(--text-tertiary)] mb-8 text-center max-w-md">
          Select or create a persona to start generating voice-overs and talking videos.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl">
          {personas.map(p => (
            <button
              key={p.id}
              onClick={() => onSelectPersona(p.id)}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-[var(--border-default)] hover:border-[var(--border-accent)] transition-all"
            >
              <img src={p.avatar} alt={p.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                <span className="font-medium text-sm text-white">{p.name}</span>
                <span className="text-xs text-white/60">{p.niche}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const EngineToggle = () => (
    <div className="relative w-full min-w-0 sm:w-auto">
      <select
        value={voiceEngine}
        onChange={(e) => {
          const val = e.target.value as VoiceEngine;
          if (val === 'elevenlabs' && !hasElevenLabsKey) {
            toast.error('ElevenLabs API key is not configured.');
            return;
          }
          setVoiceEngine(val);
        }}
        className="w-full max-w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]/50 outline-none transition-all cursor-pointer appearance-none pr-8 sm:w-auto sm:min-w-[160px]"
      >
        {!['elevenlabs','omnivoice','minimax-clone','qwen3-clone','seed-speech','chatterbox','mureka-vocal','qwen-tts','openai','gemini'].includes(voiceEngine) && <option value={voiceEngine}>{voiceEngine} (saved provider)</option>}
        <option value="elevenlabs" disabled={!hasElevenLabsKey} className="bg-[#0f0f12] text-white">
          🎙️ ElevenLabs v3 / v2 (Multilingual & English Turbo) {!hasElevenLabsKey ? '(Unavailable)' : ''}
        </option>
        <option value="omnivoice" className="bg-[#0f0f12] text-white">✨ Wavespeed OmniVoice Zonos2</option>
        <option value="minimax-clone" className="bg-[#0f0f12] text-white">⚡ MiniMax Voice Clone (Wavespeed)</option>
        <option value="qwen3-clone" className="bg-[#0f0f12] text-white">🧠 Qwen 3.0 Voice Clone (Alibaba / Wavespeed)</option>
        <option value="seed-speech" className="bg-[#0f0f12] text-white">🌱 ByteDance Seed-Speech 2.0 (Wavespeed)</option>
        <option value="chatterbox" className="bg-[#0f0f12] text-white">💬 ChatterBox Voice Converter (Wavespeed)</option>
        <option value="mureka-vocal" className="bg-[#0f0f12] text-white">🎵 Mureka Vocal & Singing Clone (Wavespeed)</option>
        <option value="openai" className="bg-[#0f0f12] text-white">🤖 OpenAI TTS-1 HD</option>
        <option value="gemini" className="bg-[#0f0f12] text-white">♊ Gemini 2.5 TTS</option>
        <option value="qwen-tts" className="bg-[#0f0f12] text-white">Qwen Standard TTS</option>
      </select>
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[var(--text-muted)]">
        <ChevronDown size={14} />
      </div>
    </div>
  );

  // ElevenLabs Voice Card
  const ELVoiceCard = ({ voice }: { voice: ElevenLabsVoice }) => {
    const isSelected = selectedELVoiceId === voice.voice_id;
    const isPreviewing = previewingVoice === voice.voice_id;
    const gender = getVoiceGender(voice);
    const accent = getVoiceAccent(voice);
    const age = getVoiceAge(voice);
    const useCase = getVoiceUseCase(voice);

    return (
      <div
        className={cn(
          "group relative p-3.5 rounded-2xl border transition-all cursor-pointer",
          isSelected
            ? "bg-gradient-to-br from-[#8D7040]/10 to-[#E7C477]/10 border-[#E7C477]/60 shadow-[0_0_24px_rgba(231,196,119,0.12)]"
            : "bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
        )}
        onClick={() => setSelectedELVoiceId(voice.voice_id)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              "w-2 h-2 rounded-full flex-shrink-0 transition-all",
              isSelected ? "bg-[#E7C477] shadow-[0_0_8px_rgba(231,196,119,0.5)]" : "bg-[var(--text-muted)]"
            )} />
            <span className={cn(
              "text-sm font-bold truncate",
              isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
            )}>{voice.name}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleVoicePreview(voice.voice_id, voice.preview_url);
            }}
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0",
              isPreviewing
                ? "bg-[#E7C477] scale-110 text-white shadow-lg shadow-[var(--accent-primary)]/30"
                : "bg-[var(--bg-overlay)] hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            )}
          >
            {isPreviewing
              ? <Pause className="w-3 h-3 fill-current" />
              : <Play className="w-3 h-3 fill-current ml-0.5" />
            }
          </button>
        </div>

        {/* Labels row */}
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {gender && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] font-bold uppercase tracking-wider">
              {gender}
            </span>
          )}
          {accent && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold uppercase tracking-wider">
              {accent}
            </span>
          )}
          {age && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-[var(--accent-rose)]/10 text-[var(--accent-rose)] font-bold uppercase tracking-wider">
              {age}
            </span>
          )}
          {useCase && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-[var(--bg-overlay)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
              {useCase}
            </span>
          )}
          {voice.category !== 'premade' && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-bold uppercase tracking-wider">
              {voice.category}
            </span>
          )}
        </div>

        {/* Description */}
        {voice.description && (
          <p className="text-[9px] text-[var(--text-muted)] mt-2 leading-relaxed line-clamp-2">{voice.description}</p>
        )}
      </div>
    );
  };

  // Voice Settings Sliders (ElevenLabs only)
  const VoiceSettingsPanel = () => (
    <div className="space-y-4 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
      <div className="flex items-center gap-2 mb-1">
        <SlidersHorizontal className="w-4 h-4 text-[#E7C477]" />
        <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest">Voice Settings</span>
      </div>

      {/* Stability */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Stability</label>
          <span className="text-[10px] font-mono text-[var(--accent-primary)] font-bold">{stability.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={stability}
          onChange={(e) => setStability(parseFloat(e.target.value))}
          className="voice-slider w-full"
        />
        <div className="flex justify-between text-[8px] text-[var(--text-muted)]">
          <span>Variable</span>
          <span>Consistent</span>
        </div>
      </div>

      {/* Clarity */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Clarity + Similarity</label>
          <span className="text-[10px] font-mono text-[var(--accent-primary)] font-bold">{clarity.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={clarity}
          onChange={(e) => setClarity(parseFloat(e.target.value))}
          className="voice-slider w-full"
        />
        <div className="flex justify-between text-[8px] text-[var(--text-muted)]">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      {/* Style Exaggeration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Style Exaggeration</label>
          <span className="text-[10px] font-mono text-[var(--accent-primary)] font-bold">{style.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={style}
          onChange={(e) => setStyle(parseFloat(e.target.value))}
          className="voice-slider w-full"
        />
        <div className="flex justify-between text-[8px] text-[var(--text-muted)]">
          <span>None</span>
          <span>Dramatic</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full min-w-0 pb-20 max-w-7xl mx-auto p-3 sm:p-4 md:p-8 space-y-8 select-none">
      {/* Clean Header Bar */}
      <header className="mb-6 pb-2 border-b border-[#E7C477]/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-[#F5F1E8] tracking-tight flex items-center gap-3">
              Voice Studio

            </h1>
            <p className="text-xs md:text-sm text-[#8C909A] mt-1 font-sans">
              Turn your script into speech, choose a saved voice, or create a new one.
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <EngineToggle />
            <div className="flex items-center justify-center gap-3 sm:justify-start">
              {persona.id !== 'empty' && persona.referenceImage ? (
                <img 
                  src={persona.referenceImage} 
                  alt={persona.name} 
                  className="w-8 h-8 rounded-lg object-cover border border-[#E7C477]/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-input)] border border-[#E7C477]/20 flex items-center justify-center text-[#8C909A]">
                  <Users size={14} />
                </div>
              )}
              <p className="text-[#8C909A] text-xs font-medium hidden md:block">
                Active: <span className="text-[#F5F1E8] font-semibold">{persona.id === 'empty' ? 'No Persona' : persona.name}</span>
              </p>
            </div>
          </div>
        </div>
      </header>
      <nav aria-label="Voice studio steps" className="flex flex-wrap gap-2">
        {(['write', 'voice', 'listen'] as const).map(stage => <button key={stage} type="button" aria-pressed={studioStage === stage} onClick={() => setStudioStage(stage)} className={cn('rounded-xl px-4 py-2 text-sm font-semibold', studioStage === stage ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:text-white')}>{stage === 'write' ? '1. Write' : stage === 'voice' ? '2. Choose a voice' : '3. Listen & export'}</button>)}
      </nav>

      <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Script Workspace (7/12) */}
        <div hidden={studioStage !== 'write'} className="lg:col-span-12 space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Type className="w-5 h-5 text-[var(--accent-primary)]" />
                Write your script
              </h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleGenerateScript('generate')}
                  disabled={isGeneratingScript}
                  className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] flex items-center gap-1 transition-colors"
                >
                  {isGeneratingScript ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                  Magic Write
                </button>
                <select 
                  value={targetLanguage}
                  onChange={(e) => handleTranslate(e.target.value)}
                  className="bg-transparent text-xs text-[var(--text-tertiary)] focus:outline-none border-none py-1 cursor-pointer"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Arabic">Arabic</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Korean">Korean</option>
                </select>
                {isTranslating && <Loader2 className="w-3 h-3 animate-spin text-[var(--accent-primary)]" />}
              </div>
            </div>
            
            <input 
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic to generate a script..."
              className="w-full premium-input py-3 px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            />

            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Paste your transcript here or use Magic Write above..."
              className="flex-1 w-full min-h-[160px] bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl p-4 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-accent)] resize-none font-sans leading-relaxed"
            />
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => handleGenerateScript('generate')}
                disabled={isGeneratingScript || !topic}
                className="py-3 bg-[var(--accent-primary-soft)] hover:bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-[10px] font-bold rounded-xl border border-[var(--border-accent)] transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-40"
              >
                {isGeneratingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Auto Generate</span>
              </button>
              
              <button
                onClick={() => handleGenerateScript('enhance')}
                disabled={isGeneratingScript || !script}
                className="py-3 bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-[10px] font-bold rounded-xl border border-[var(--accent-primary)]/25 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-40"
              >
                {isGeneratingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                <span>Enhance Script</span>
              </button>



              <button
                onClick={() => handleGenerateScript('surprise')}
                disabled={isGeneratingScript}
                className="py-3 bg-[var(--accent-rose)]/10 hover:bg-[var(--accent-rose)]/20 text-[var(--accent-rose)] text-[10px] font-bold rounded-xl border border-[var(--accent-rose)]/25 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-40"
              >
                {isGeneratingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>Surprise Me</span>
              </button>
            </div>
          </div>
        </div>

        {studioStage === 'write' && <div className="lg:col-span-12"><button type="button" onClick={() => setStudioStage('voice')} className="btn-gold-primary px-5 py-2.5 text-sm">Choose a voice</button></div>}
        {/* Right Column: Control Panel (5/12) */}
        <div hidden={studioStage !== 'voice'} className="lg:col-span-12 space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-6 h-full">
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-[var(--accent-primary)]" />
              Choose voice and delivery
            </h3>

            {persona && persona.id !== 'empty' && <SavedPersonaVoices voices={persona.savedVoices || []} current={persona} onSelect={handleRestoreSavedVoice} disabled={isSavingDefaultVoice || isCloning} actionLabel="Use as default" />}

            {/* Voice Selection — Engine-specific */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                Voice Actor
                {voiceEngine === 'elevenlabs' && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-gradient-to-r from-[#8D7040]/20 to-[#E7C477]/20 text-[#E7C477] font-bold">
                    ELEVENLABS
                  </span>
                )}
              </label>

              {voiceEngine === 'elevenlabs' ? (
                <>
                  {/* Clone a voice Toggle & Save Default */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <button
                      onClick={() => setShowClonePanel(!showClonePanel)}
                      aria-expanded={showClonePanel}
                      aria-controls="voice-cloning-form"
                      className="flex-1 py-2 px-3 bg-[#E7C477]/10 hover:bg-[#E7C477]/20 text-[#E7C477] border border-[#E7C477]/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Crown size={12} />
                      {showClonePanel ? 'Close cloning' : 'Clone a voice'}
                    </button>
                    <button
                      onClick={() => cloningAudioFilesInputRef.current?.click()}
                      className="py-2 px-3 bg-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/30 text-[var(--accent-primary)] border border-[var(--accent-primary)]/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      title="Upload MP3, MP4, MOV, WAV, M4A voice or video file"
                    >
                      <Upload size={12} />
                      Upload Voice File
                    </button>
                    {selectedELVoiceId && (
                      <button
                        onClick={handleSaveDefaultVoice}
                        disabled={isSavingDefaultVoice || isCloning}
                        className="py-2 px-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check size={12} className="text-emerald-400" />
                        Set Default
                      </button>
                    )}
                  </div>

                  {/* Clone a voice Panel */}
                  {showClonePanel && (
                    <section id="voice-cloning-form" aria-label="Clone a voice" className="p-4 rounded-2xl bg-gradient-to-b from-[#E7C477]/5 to-black/20 border border-[#E7C477]/20 space-y-4 shadow-xl mb-4">
                      <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Mic size={14} className="text-[#E7C477]" /> Clone Custom Voice
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Voice Name</label>
                          <input
                            type="text"
                            value={cloneName}
                            onChange={(e) => setCloneName(e.target.value)}
                            placeholder="e.g. My Cloned Voice"
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-[#E7C477] transition-all"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Description (Optional)</label>
                          <input
                            type="text"
                            value={cloneDesc}
                            onChange={(e) => setCloneDesc(e.target.value)}
                            placeholder="e.g. Energetic podcast style"
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-[#E7C477] transition-all"
                          />
                        </div>

                        {/* Custom webcam avatar creation alternative */}
                        <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-emerald-500/20 space-y-2">
                          <span className="text-[10px] font-bold text-white block">Create Avatar & Voice (HeyGen/ElevenLabs)</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (!cloneName) {
                                toast.error('Please enter a Voice Name first');
                                return;
                              }
                              setIsWebcamCreatorOpen(true);
                            }}
                            className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <Video size={12} /> Record Webcam Avatar & Voice
                          </button>
                        </div>

                        {/* Recording / Uploading Controls */}
                        <div className="p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-white">Voice Sample Audio</span>
                            {cloningAudioUrl && (
                              <button
                                onClick={() => {
                                  const audio = new Audio(cloningAudioUrl);
                                  audio.play().catch(err => {
                                    console.warn('Audio playback error:', err);
                                    toast.error('Playback failed. Please ensure file is valid.');
                                  });
                                }}
                                className="text-[9px] font-bold text-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors uppercase tracking-wider"
                              >
                                Play Sample
                              </button>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            {isRecording ? (
                              <button
                                onClick={stopRecording}
                                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 animate-pulse"
                              >
                                <span className="w-2 h-2 rounded-full bg-white block" />
                                Stop ({recordingSeconds}s)
                              </button>
                            ) : (
                              <button
                                onClick={startRecording}
                                className="flex-1 py-2 rounded-lg bg-[#E7C477]/25 hover:bg-[#E7C477]/30 text-white font-bold text-xs border border-[#E7C477]/35 flex items-center justify-center gap-1.5"
                              >
                                <Mic size={12} />
                                Record Live
                              </button>
                            )}
                            
                            <div className="relative flex-1">
                              <button
                                type="button"
                                onClick={() => setCloningAudioUploadMenuOpen(!cloningAudioUploadMenuOpen)}
                                className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer text-center"
                              >
                                <Download size={12} className="rotate-180" />
                                <span>Upload Audio or Video</span>
                              </button>
                              
                              {cloningAudioUploadMenuOpen && (
                                <>
                                  <div className="fixed inset-0 z-20" onClick={() => setCloningAudioUploadMenuOpen(false)} />
                                  <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-white/10 bg-[var(--bg-input)] p-1.5 shadow-2xl z-30 space-y-1 select-none text-left">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCloningAudioUploadMenuOpen(false);
                                        cloningAudioLibraryInputRef.current?.click();
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 font-bold transition-all"
                                    >
                                      <Film size={13} className="text-pink-400" />
                                      Photo/Video Library
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCloningAudioUploadMenuOpen(false);
                                        cloningAudioFilesInputRef.current?.click();
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 font-bold transition-all"
                                    >
                                      <FolderOpen size={13} className="text-[var(--accent-primary)]" />
                                      Browse Files (MP3, MP4, etc.)
                                    </button>
                                  </div>
                                </>
                              )}
                              
                              <input
                                ref={cloningAudioLibraryInputRef}
                                type="file"
                                accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.mp4,.mov,.webm,.mkv,.avi,.3gp,.m4v"
                                className="hidden"
                                onChange={handleCloningAudioUpload}
                              />
                              <input
                                ref={cloningAudioFilesInputRef}
                                type="file"
                                accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.mp4,.mov,.webm,.mkv,.avi,.3gp,.m4v"
                                className="hidden"
                                onChange={handleCloningAudioUpload}
                              />
                            </div>
                          </div>

                          {cloningAudioUrl && (
                            <div className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                              <Check size={10} /> Sample ready to clone
                            </div>
                          )}
                        </div>

                        {persona.id === 'empty' ? (
                          <div className="flex flex-col gap-1 w-full text-left">
                            <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-wider block">
                              Attach to Persona (Optional)
                            </label>
                            <div className="relative">
                              <select
                                value={targetAttachPersonaId}
                                onChange={(e) => {
                                  setTargetAttachPersonaId(e.target.value);
                                  setAttachOnClone(e.target.value !== 'none');
                                }}
                                className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none appearance-none pr-6 font-medium"
                              >
                                <option value="none">Don't Attach (Standalone Voice)</option>
                                {personas.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-tertiary)] pointer-events-none" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="attachOnClone"
                              checked={attachOnClone}
                              onChange={(e) => setAttachOnClone(e.target.checked)}
                              className="rounded bg-[var(--bg-input)] border-[var(--border-default)] text-[#E7C477] focus:ring-0"
                            />
                            <label htmlFor="attachOnClone" className="text-[10px] font-medium text-[var(--text-secondary)] cursor-pointer">
                              Attach to {persona.name} on creation
                            </label>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-400">Use 1–2 minutes of clear speech from one speaker. Your current voice stays saved until a ready replacement is applied.</p>
                      <label className="flex items-start gap-2 text-xs text-slate-300"><input type="checkbox" checked={speakerAuthorized} onChange={e => setSpeakerAuthorized(e.target.checked)} />I am the speaker or have permission to clone and use this voice.</label>
                      {cloneResult && <div role="status" className="space-y-2 text-xs text-slate-300"><p>{cloneResult.message || cloneResult.status}</p>{cloneResult.status !== 'ready' && <button type="button" disabled={isCloning} onClick={() => handleCloneVoiceSubmit(true)} className="underline">Check clone status</button>}{cloneResult.status === 'failed' && <button type="button" disabled={isCloning || !speakerAuthorized} onClick={() => handleCloneVoiceSubmit(false, true)} className="block underline">Retry after fixing the provider issue</button>}{cloneResult.status === 'verification_required' && <a href="https://elevenlabs.io/app/voices" target="_blank" rel="noreferrer" className="block underline">Verify speaker in ElevenLabs</a>}</div>}
                      {!cloneResult && <p className="text-xs text-[var(--text-muted)]">{!cloneName.trim() ? 'Name your new voice.' : !cloningAudioBase64 ? 'Upload or record a clear voice sample.' : !speakerAuthorized ? 'Confirm speaker permission to start cloning.' : 'Ready to clone your voice.'}</p>}
                      <button
                        onClick={() => handleCloneVoiceSubmit()}
                        disabled={isCloning || !cloneName || !cloningAudioBase64 || !speakerAuthorized || Boolean(cloneResult)}
                        className="w-full py-2.5 bg-gradient-to-r from-[#8D7040] to-[#E7C477] hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        {isCloning ? <Loader2 size={12} className="animate-spin" /> : <Crown size={12} />}
                        {isCloning ? 'Cloning Voice...' : 'Start Voice Cloning'}
                      </button>
                    </section>
                  )}

                  {/* Preset Voices Dropdown */}
                  <div hidden={showClonePanel} className="space-y-2">
                    {isLoadingVoices ? (
                      <div className="flex items-center justify-center py-4 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#E7C477]" />
                        <span className="text-[10px] text-[var(--text-muted)]">Loading voices...</span>
                      </div>
                    ) : voicesError ? (
                      <div className="text-xs text-[var(--accent-rose)]">{voicesError}</div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <select
                            value={selectedELVoiceId}
                            onChange={(e) => setSelectedELVoiceId(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]/50 outline-none transition-all cursor-pointer appearance-none pr-8"
                          >
                            <option value="" disabled className="bg-[#0f0f12] text-white">Select a voice actor...</option>
                            {filteredVoices.map(v => (
                              <option key={v.voice_id} value={v.voice_id} className="bg-[#0f0f12] text-white">
                                {v.name} ({v.labels?.gender || 'Unknown'} - {v.labels?.accent || 'Default'})
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[var(--text-muted)]">
                            <ChevronDown size={14} />
                          </div>
                        </div>
                        {selectedELVoiceId && (
                          <button
                            onClick={() => handleVoicePreview(selectedELVoiceId)}
                            className={cn(
                              "w-11 h-11 rounded-xl flex items-center justify-center transition-all border border-white/10 shrink-0",
                              previewingVoice === selectedELVoiceId 
                                ? "bg-[var(--accent-primary)] text-white shadow-lg" 
                                : "bg-white/5 hover:bg-white/10 text-[var(--text-tertiary)] hover:text-white"
                            )}
                          >
                            {previewingVoice === selectedELVoiceId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Voice Settings */}
                  {isPro && <VoiceSettingsPanel />}
                </>
              ) : (
                <div className="space-y-4">
                  {/* Preset Voices Dropdown */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]/50 outline-none transition-all cursor-pointer appearance-none pr-8"
                      >
                        {activeVoices.map(v => (
                          <option key={v.id} value={v.id} className="bg-[#0f0f12] text-white">
                            {v.name} ({v.gender || 'Dynamic'})
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[var(--text-muted)]">
                        <ChevronDown size={14} />
                      </div>
                    </div>

                  </div>

                  {/* Custom Reference Voice Upload for OmniVoice 'persona-clone' */}
                  {voiceEngine === 'omnivoice' && selectedVoice === 'persona-clone' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-2xl bg-gradient-to-b from-[var(--accent-primary)]/5 to-black/20 border border-[var(--accent-primary)]/20 space-y-3 shadow-xl"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent-primary)]">OmniVoice Reference Sample</span>
                        {omnivoiceRefUrl && (
                          <button
                            onClick={() => {
                              const audio = new Audio(omnivoiceRefUrl);
                              audio.play().catch(() => {});
                            }}
                            className="text-[9px] font-bold text-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors uppercase tracking-widest"
                          >
                            Play Sample
                          </button>
                        )}
                      </div>
                      
                       <div className="relative w-full">
                        <button
                          type="button"
                          onClick={() => setOmnivoiceRefUploadMenuOpen(!omnivoiceRefUploadMenuOpen)}
                          className="w-full py-2.5 rounded-xl bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer text-center transition-all select-none"
                        >
                          <Download size={12} className="rotate-180" />
                          <span>{omnivoiceRefName ? `Uploaded: ${omnivoiceRefName.substring(0, 24)}...` : 'Upload Audio or Video'}</span>
                        </button>
                        
                        {omnivoiceRefUploadMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOmnivoiceRefUploadMenuOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-white/10 bg-[var(--bg-input)] p-1.5 shadow-2xl z-30 space-y-1 select-none text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setOmnivoiceRefUploadMenuOpen(false);
                                  omnivoiceRefLibraryInputRef.current?.click();
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 font-bold transition-all"
                              >
                                <Film size={13} className="text-pink-400" />
                                Photo/Video Library
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOmnivoiceRefUploadMenuOpen(false);
                                  omnivoiceRefFilesInputRef.current?.click();
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 font-bold transition-all"
                              >
                                <FolderOpen size={13} className="text-[var(--accent-primary)]" />
                                Browse Files (MP3, WAV, etc.)
                              </button>
                            </div>
                          </>
                        )}
                        
                        <input
                          ref={omnivoiceRefLibraryInputRef}
                          type="file"
                          accept="audio/mp3,audio/mpeg,audio/wav,audio/x-wav,audio/ogg,audio/m4a,audio/x-m4a,video/mp4,video/quicktime,video/webm,.mp3,.wav,.m4a,.ogg,.mp4,.mov,.webm"
                          className="hidden"
                          onChange={handleOmnivoiceRefUpload}
                        />
                        <input
                          ref={omnivoiceRefFilesInputRef}
                          type="file"
                          accept="audio/mp3,audio/mpeg,audio/wav,audio/x-wav,audio/ogg,audio/m4a,audio/x-m4a,video/mp4,video/quicktime,video/webm,.mp3,.wav,.m4a,.ogg,.mp4,.mov,.webm"
                          className="hidden"
                          onChange={handleOmnivoiceRefUpload}
                        />
                      </div>
                      <p className="text-[9px] text-[var(--text-muted)] font-medium pl-0.5 leading-relaxed">
                        Upload any audio or video reference. The voice clone engine will automatically extract reference characteristics to match your target script.
                      </p>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Performance Mood */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest block">Performance Mood</label>
              <div className="grid grid-cols-4 gap-2">
                {EMOTIONS.map(e => {
                  const Icon = e.icon;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEmotion(e.id)}
                      className={cn(
                        "aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all border",
                        selectedEmotion === e.id 
                          ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/20" 
                          : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[9px] font-bold uppercase truncate w-full text-center px-1">{e.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)]">Delivery uses controls supported by the selected provider. Emotion adjusts your saved settings gently; no fillers are added to your script.</p>

            {!script.trim() && <p className="text-xs text-[var(--text-muted)]">Add a script before rendering audio.</p>}
            {voiceEngine === 'elevenlabs' && !selectedELVoiceId && <p className="text-xs text-[var(--text-muted)]">Choose a voice to render audio.</p>}
            <button
              onClick={handleGenerateVoice}
              disabled={isGeneratingVoice || !script || (voiceEngine === 'elevenlabs' && !selectedELVoiceId)}
              className="w-full py-5 premium-button disabled:opacity-40 font-black text-lg uppercase tracking-[0.2em] mt-6 flex items-center justify-center gap-4 transition-all"
            >
              {isGeneratingVoice ? <Loader2 className="w-6 h-6 animate-spin" /> : <Volume2 className="w-6 h-6" />}
              Render Audio
              {voiceEngine === 'elevenlabs' && (
                <Crown className="w-4 h-4 text-amber-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Full Width Bottom Area for Audio Playback & Video Gen */}
      <AnimatePresence>
        {studioStage === 'listen' && audioUrl && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="premium-card rounded-3xl p-8 space-y-8 glass shadow-2xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="flex-1 space-y-6 w-full">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={togglePlayback}
                      className="w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all flex-shrink-0 active:scale-95"
                      style={{ background: 'var(--gradient-button)', boxShadow: '0 0 30px rgba(231,196,119,0.3)' }}
                    >
                      {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                    </button>
                    <div className="flex-1 space-y-3">
                      <div className="text-base font-black text-[var(--text-primary)] tracking-wide">Audio Mastered</div>
                      
                      {/* Waveform Visualization */}
                      <div className="flex items-end gap-[4px] h-10">
                        {Array.from({ length: 32 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={cn("waveform-bar", !isPlaying && "paused")} 
                            style={{ 
                              height: `${12 + Math.sin(i * 0.7) * 18 + Math.random() * 12}px`, 
                              animationDelay: `${i * 0.06}s`,
                              backgroundColor: 'var(--accent-primary)',
                              width: '4px',
                              borderRadius: '4px'
                            }}
                          />
                        ))}
                      </div>

                      <div className="flex justify-between text-[11px] font-mono text-[var(--text-muted)] font-bold">
                        <span>0:00</span>
                        <span>{Math.ceil(script.split(/\s+/).filter(Boolean).length / 2.5)}s MASTERED</span>
                      </div>
                    </div>
                  </div>
                  <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                </div>

                <div className="hidden md:block w-px h-24 bg-[var(--border-default)]" />

                <div className="flex-1 space-y-6 w-full">
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">3. Visual Production</h4>
                      <p className="text-[10px] text-[var(--text-muted)] italic font-medium">Identity Active</p>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                      {(() => {
                        const baseOptions = [persona.avatar, persona.referenceImage, ...(persona.visualLibrary || []).map(img => img.url)].filter(Boolean);
                        // Make sure custom uploaded selectedImage is always shown in the list
                        if (selectedImage && !baseOptions.includes(selectedImage)) {
                          baseOptions.unshift(selectedImage);
                        }
                        return Array.from(new Set(baseOptions)).slice(0, 6).map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedImage(img as string)}
                            className={cn(
                              "relative w-24 aspect-square rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 active:scale-95",
                              selectedImage === img ? "border-[var(--accent-primary)] ring-4 ring-[var(--accent-primary)]/10" : "border-[var(--border-default)] opacity-60 hover:opacity-100"
                            )}
                          >
                            <img src={img as string} className="w-full h-full object-cover" />
                          </button>
                        ));
                      })()}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 aspect-square rounded-2xl border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-[var(--bg-hover)] transition-all text-[var(--text-muted)] flex-shrink-0"
                      >
                        <ImageIcon className="w-5 h-5" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Upload</span>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Model Selector */}
              <div className="space-y-3">
                <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] block">Video Engine</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(videoModels.length > 0 ? videoModels : FALLBACK_VIDEO_MODELS).map(model => {
                    const isSelected = selectedVideoModel === model.id;
                    const isGoogle = model.provider.toLowerCase().includes('google');
                    return (
                      <button
                        key={model.id}
                        onClick={() => setSelectedVideoModel(model.id)}
                        className={cn(
                          "relative p-3.5 rounded-2xl border text-left transition-all",
                          isSelected
                            ? "bg-gradient-to-br from-[#8D7040]/10 to-[#E7C477]/10 border-[#E7C477]/60 shadow-[0_0_24px_rgba(231,196,119,0.12)]"
                            : "bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={cn(
                            "text-xs font-bold",
                            isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                          )}>{model.name}</span>
                          <span className={cn(
                            "text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider",
                            isGoogle
                              ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                              : "bg-amber-500/10 text-amber-400"
                          )}>
                            {isGoogle ? 'Gemini' : 'Wavespeed'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">
                            {(() => {
                              if (videoModels.length === 0) return 'Loading price…';
                              if (billingInfo?.isCreator) return model.price > 0 ? `$${model.price.toFixed(3)}` : 'Free';
                              return `${model.price} credits`;
                            })()}
                          </span>
                          <span className="text-[9px] text-[var(--text-muted)]">•</span>
                          <span className="text-[9px] text-[var(--text-muted)] truncate">{model.description}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E7C477] shadow-[0_0_8px_rgba(231,196,119,0.5)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-6">
                {/* Video Player or Pending State */}
                {isGeneratingVideo && (
                  <div className="relative rounded-3xl overflow-hidden border border-[var(--accent-primary)]/30 bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-overlay)]">
                    <div className="aspect-video flex flex-col items-center justify-center gap-6 p-8">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full border-4 border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] animate-spin" />
                        <Video className="w-8 h-8 text-[var(--accent-primary)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-base font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">Rendering Video</p>
                        <p className="text-xs text-[var(--text-muted)] font-medium">Neural synthesis is mapping audio waveforms to facial landmarks...</p>
                        <p className="text-[10px] text-[var(--text-muted)] italic">This may take 1-3 minutes</p>
                      </div>
                      {/* Animated progress bar */}
                      <div className="w-full max-w-xs h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                        <div className="h-full rounded-full animate-pulse" style={{ background: 'var(--gradient-button)', width: '65%', animation: 'pulse 2s ease-in-out infinite' }} />
                      </div>
                    </div>
                  </div>
                )}

                {generatedVideoUrl && !isGeneratingVideo && (
                  <div className="rounded-3xl overflow-hidden border border-[var(--accent-primary)]/30 bg-[var(--bg-elevated)]">
                    <div className="aspect-video bg-black/60 relative">
                      <video 
                        src={generatedVideoUrl} 
                        className="w-full h-full object-contain" 
                        controls 
                        autoPlay
                        playsInline
                      />
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">Video Ready</p>
                          <p className="text-[10px] text-[var(--text-muted)]">Talking video generated successfully</p>
                        </div>
                      </div>
                      <a 
                        href={generatedVideoUrl} 
                        download="talking-video.mp4"
                        className="px-4 py-2 rounded-xl bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--accent-primary)]/20 transition-all flex items-center gap-2"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </a>
                    </div>
                  </div>
                )}

                {videoError && !isGeneratingVideo && !generatedVideoUrl && (
                  <div className="rounded-3xl overflow-hidden border border-red-500/30 bg-red-500/5 p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-red-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-red-400">Video Generation Failed</p>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{videoError}</p>
                        <p className="text-[10px] text-[var(--text-muted)] italic mt-2">Try selecting a different image or check your API credits.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={handleGenerateVideo}
                    disabled={isGeneratingVideo || !audioUrl || !selectedImage}
                    className="w-full py-6 premium-button disabled:opacity-40 font-black text-xl uppercase tracking-[0.3em] flex items-center justify-center gap-5 group transition-all"
                    style={{ boxShadow: '0 10px 40px rgba(231,196,119,0.25)' }}
                  >
                    {isGeneratingVideo ? <Loader2 className="w-8 h-8 animate-spin" /> : <Video className="w-8 h-8 group-hover:scale-110 transition-transform" />}
                    {isGeneratingVideo ? 'Rendering...' : (generatedVideoUrl ? 'Regenerate Video' : 'Generate Talking Video')}
                  </button>
                  <div className="p-6 bg-[var(--bg-elevated)] rounded-3xl border border-[var(--border-subtle)] flex items-center justify-center">
                     <p className="text-xs text-[var(--text-secondary)] text-center leading-relaxed font-medium">
                       Neural synthesis will precisely map your <b>audio waveform</b> to the <b>facial landmarks</b> of your persona, creating a photorealistic talking production.
                     </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {studioStage === 'listen' && !audioUrl && <div className="premium-card rounded-2xl p-6"><h3 className="font-semibold">Your audio preview will appear here</h3><p className="mt-2 text-sm text-[var(--text-muted)]">Write a script, choose a voice, then render audio.</p><button type="button" onClick={() => setStudioStage('voice')} className="mt-4 btn-gold-primary px-4 py-2">Choose a voice</button></div>}
      {/* History */}
      <div hidden={studioStage !== 'listen'} className="glass-card rounded-2xl p-6 space-y-6">
        <h3 className="font-black text-xs uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
          <History className="w-3 h-3" />
          Production History
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {history.length === 0 ? (
            <div className="col-span-full py-8 text-center space-y-2">
              <Music className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-30" />
              <p className="text-xs text-[var(--text-muted)] italic">No assets generated yet.</p>
            </div>
          ) : (
            history.map((item) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={item.id} 
                className="group relative p-3 premium-card rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary-soft)] flex items-center justify-center text-[var(--accent-primary)]">
                    {item.type === 'audio' ? <Volume2 className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 truncate">
                    <div className="text-[10px] font-bold text-[var(--text-primary)] capitalize">{item.type}</div>
                    <div className="text-[8px] text-[var(--text-muted)] truncate">{item.label}</div>
                  </div>
                  <a href={item.url} download className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    <Download className="w-3 h-3" />
                  </a>
                </div>
                {item.type === 'video' && item.url && (
                  <div className="mt-2 aspect-video rounded-lg overflow-hidden bg-black/40">
                    <video src={item.url} className="w-full h-full object-cover" controls />
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
        </>

      {persona && (
        <WebcamAvatarCreator
          isOpen={isWebcamCreatorOpen}
          onClose={() => setIsWebcamCreatorOpen(false)}
          personaName={cloneName || persona.name}
          onComplete={handleWebcamCreatorComplete}
        />
      )}
    </div>
  );
}
