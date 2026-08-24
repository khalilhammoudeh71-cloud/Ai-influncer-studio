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
import { cn } from '../utils/cn';
import { processImageFile } from '../utils/imageProcessing';
import { processVoiceSampleFile } from '../utils/audioUtils';
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
  { id: 'energetic', name: 'Energetic', icon: Zap, prompt: 'High energy, fast-paced, enthusiastic, and motivating.' },
  { id: 'calm', name: 'Calm', icon: Heart, prompt: 'Soft, gentle, soothing, and peaceful.' },
  { id: 'serious', name: 'Serious', icon: Check, prompt: 'Professional, authoritative, deep, and trustworthy.' },
  { id: 'playful', name: 'Playful', icon: Sparkles, prompt: 'Fun, lighthearted, bubbly, and casual.' },
  { id: 'mysterious', name: 'Mysterious', icon: Wind, prompt: 'Low-pitched, slow, whispered, and intriguing.' },
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

const VIDEO_MODELS = [
  { id: 'google:veo-3', name: 'Veo 3.1', price: '$0.025/sec', provider: 'google', desc: '8s 720p, native audio, stunning realism' },
  { id: 'google:veo-3-fast', name: 'Veo 3.1 Lite', price: '$0.013/sec', provider: 'google', desc: 'Faster generation, 8s 720p' },
  { id: 'google:veo-2', name: 'Veo 2', price: '$0.006/sec', provider: 'google', desc: '8s 720p, high quality, no audio' },
  { id: 'wavespeed-i2v:wavespeed-ai/wan-2.1-i2v-720p', name: 'Wan 2.1 I2V 720p', price: '~$0.04/5s', provider: 'wavespeed', desc: 'Image-to-video, 720p, 5s clips' },
  { id: 'wavespeed-i2v:wavespeed-ai/wan-2.2-i2v-720p', name: 'Wan 2.2 I2V 720p', price: '~$0.05/5s', provider: 'wavespeed', desc: 'Next-gen, improved realism' },
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
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>(VIDEO_MODELS[0].id);
  const [selectedImage, setSelectedImage] = useState<string | null>(persona?.avatar || null);
  const [history, setHistory] = useState<VoiceProduction[]>([]);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

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
  const [hasStartedStudio, setHasStartedStudio] = useState(false);

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
  const [attachOnClone, setAttachOnClone] = useState(true);
  const [targetAttachPersonaId, setTargetAttachPersonaId] = useState<string>('none');
  const [isWebcamCreatorOpen, setIsWebcamCreatorOpen] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const fetchVoices = async () => {
    setIsLoadingVoices(true);
    setVoicesError(null);
    try {
      const data = await api.voice.getVoices();
      setElevenLabsVoices(data.voices);
      if (!selectedELVoiceId && data.voices.length > 0) {
        setSelectedELVoiceId(data.voices[0].voice_id);
      }
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
      if (persona.voiceEngine === 'elevenlabs' && persona.voiceId) {
        setVoiceEngine('elevenlabs');
        setSelectedELVoiceId(persona.voiceId);
      } else if (persona.voiceEngine === 'openai' && persona.voiceId) {
        setVoiceEngine('openai');
        setSelectedVoice(persona.voiceId);
      } else if (persona.voiceEngine === 'gemini' && persona.voiceId) {
        setVoiceEngine('gemini');
        setSelectedVoice(persona.voiceId);
      }
    }
  }, [persona?.id, persona?.voiceEngine, persona?.voiceId]);

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
      const sample = await processVoiceSampleFile(file);
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
    if (!persona) return;
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
      };
      await api.updatePersonaInVault(updatedPersona);
      toast.success(`Voice attached as default for ${persona.name}!`);
    } catch (err) {
      toast.error('Failed to attach voice to persona');
    }
  };

  const handleCloneVoiceSubmit = async () => {
    if (!cloneName) {
      toast.error('Please enter a voice name');
      return;
    }
    if (!cloningAudioBase64) {
      toast.error('Please record or upload an audio sample');
      return;
    }

    setIsCloning(true);
    try {
      const result = await api.voice.cloneVoice(cloneName, cloneDesc, cloningAudioBase64);
      toast.success(`Voice "${result.name}" cloned successfully!`);
      
      setIsLoadingVoices(true);
      const data = await api.voice.getVoices();
      setElevenLabsVoices(data.voices);
      setSelectedELVoiceId(result.voiceId);
      
      const targetP = (persona && persona.id !== 'empty') ? persona : personas.find(p => p.id === targetAttachPersonaId);
      if (attachOnClone && targetP && targetP.id !== 'empty') {
        const updatedPersona = {
          ...targetP,
          voiceEngine: 'elevenlabs',
          voiceId: result.voiceId,
        };
        await api.updatePersonaInVault(updatedPersona);
        toast.success(`Voice attached as default for ${targetP.name}!`);
      }

      setCloneName('');
      setCloneDesc('');
      setCloningAudioBase64(null);
      setCloningAudioUrl(null);
      setShowClonePanel(false);
    } catch (err) {
      console.error('[Voice Cloning] Error:', err);
      toast.error(err instanceof Error ? err.message : 'Voice cloning failed');
    } finally {
      setIsCloning(false);
    }
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
        performancePrompt: prompt,
        backgroundAtmosphere: atmos?.sound,
        engine: voiceEngine,
      };

      if (voiceEngine === 'elevenlabs') {
        speechParams.voiceId = selectedELVoiceId;
        speechParams.voiceSettings = {
          stability,
          similarity_boost: clarity,
          style,
        };
      } else {
        speechParams.voice = selectedVoice;
        if (voiceEngine === 'omnivoice' && selectedVoice === 'persona-clone' && omnivoiceRefBase64) {
          speechParams.voiceReference = omnivoiceRefBase64;
        }
      }

      const res = await api.voice.generateSpeech(speechParams);
      setAudioUrl(res.audioUrl);
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

  const handleVoicePreview = async (voiceId: string, previewUrl?: string) => {
    if (previewingVoice) {
      // Stop current preview
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewingVoice(null);
      return;
    }

    setPreviewingVoice(voiceId);

    try {
      const voiceList = activeVoices;
      const v = voiceList.find(ov => ov.id === voiceId);
      const voiceName = v?.name || 'your creator';
      
      const longerScript = `Hey everyone! I'm ${voiceName}, and welcome to my creator studio. I can speak naturally with authentic human inflection, ready to bring your stories to life!`;

      const res = await api.voice.generateSpeech({
        text: longerScript,
        voiceId: voiceId,
        voice: voiceId,
        engine: 'elevenlabs',
        isPreview: true
      });
      
      if (res?.audioUrl) {
        const audio = new Audio(res.audioUrl);
        previewAudioRef.current = audio;
        audio.volume = 1.0;
        audio.onended = () => {
          setPreviewingVoice(null);
          previewAudioRef.current = null;
        };
        audio.onerror = () => {
          setPreviewingVoice(null);
          previewAudioRef.current = null;
        };
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.error('[Vox] Audio playback failed:', err);
            setPreviewingVoice(null);
            previewAudioRef.current = null;
          });
        }
      } else {
        setPreviewingVoice(null);
      }
    } catch (err) {
      console.error('[Vox] Preview failed:', err);
      toast.error('Preview failed: ' + (err instanceof Error ? err.message : 'Voice generation issue'));
      setPreviewingVoice(null);
    }
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
          label: `Talking Video (${VIDEO_MODELS.find(m => m.id === selectedVideoModel)?.name || selectedVideoModel})`
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
        className="w-full max-w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:border-violet-500/30 focus:border-violet-500/50 outline-none transition-all cursor-pointer appearance-none pr-8 sm:w-auto sm:min-w-[160px]"
      >
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
            ? "bg-gradient-to-br from-[#6C63FF]/10 to-[#A855F7]/10 border-[#A855F7]/60 shadow-[0_0_24px_rgba(168,85,247,0.12)]"
            : "bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
        )}
        onClick={() => setSelectedELVoiceId(voice.voice_id)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              "w-2 h-2 rounded-full flex-shrink-0 transition-all",
              isSelected ? "bg-[#A855F7] shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "bg-[var(--text-muted)]"
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
                ? "bg-[#A855F7] scale-110 text-white shadow-lg shadow-purple-500/30"
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
            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-[var(--accent-sky)]/10 text-[var(--accent-sky)] font-bold uppercase tracking-wider">
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
        <SlidersHorizontal className="w-4 h-4 text-[#A855F7]" />
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
    <div className="h-full w-full min-w-0 overflow-y-auto custom-scrollbar pb-20 max-w-7xl mx-auto p-3 sm:p-4 md:p-8 space-y-8 select-none">
      {/* Clean Header Bar */}
      <header className="mb-6 pb-2 border-b border-[#E7C477]/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-[#F5F1E8] tracking-tight flex items-center gap-3">
              Voice Studio
              <span className="text-[#E7C477] text-xl font-normal">✨</span>
            </h1>
            <p className="text-xs md:text-sm text-[#8C909A] mt-1 font-sans">
              Create, clone, and customize voices that sound uniquely you.
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
                <div className="w-8 h-8 rounded-lg bg-[#0A101C] border border-[#E7C477]/20 flex items-center justify-center text-[#8C909A]">
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

      {!hasStartedStudio && history.length === 0 && !script ? (
        <div className="flex flex-col items-center justify-center py-10 md:py-16 text-center relative overflow-hidden">
          {/* Rotating Hero Gallery */}
          <div className="relative flex justify-center items-center w-full max-w-full mx-auto -mt-6 mb-6">
            <RotatingHeroImages images={[
              "/demo/voice_hero_1.png",
              "/demo/voice_hero_2.png",
              "/demo/voice_hero_3.png",
              "/demo/voice_hero_4.png",
              "/demo/voice_hero_5.png",
              "/demo/voice_hero_6.png"
            ]} />
          </div>

          <motion.h2 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="text-3xl md:text-4xl font-serif text-[#F5F1E8] tracking-tight mb-3"
          >
            BRING IDENTITIES TO LIFE
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="text-[#C3BFB8] text-xs md:text-sm max-w-md mx-auto mb-6 leading-relaxed font-sans"
          >
            Generate custom voice scripts and high-fidelity speech audio to match your AI's personality perfectly.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7, type: "spring" }}
            onClick={() => setHasStartedStudio(true)}
            className="btn-gold-primary px-8 py-3.5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg mx-auto"
          >
            Start Voice Studio <Sparkles size={16} />
          </motion.button>
        </div>
      ) : (
        <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Script Workspace (7/12) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Type className="w-5 h-5 text-[var(--accent-primary)]" />
                1. Script Workspace
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
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[var(--border-subtle)]">
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
                className="py-3 bg-[var(--accent-sky)]/10 hover:bg-[var(--accent-sky)]/20 text-[var(--accent-sky)] text-[10px] font-bold rounded-xl border border-[var(--accent-sky)]/25 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-40"
              >
                {isGeneratingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                <span>Enhance Script</span>
              </button>

              <button
                onClick={() => handleGenerateScript('generate')}
                disabled={isGeneratingScript || !topic}
                className="py-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] text-[10px] font-bold rounded-xl border border-[var(--border-default)] transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-40"
              >
                {isGeneratingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
                <span>Regenerate</span>
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

        {/* Right Column: Control Panel (5/12) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-6 h-full">
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-[var(--accent-primary)]" />
              2. Voice & Tone
            </h3>

            {/* Voice Selection — Engine-specific */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                Voice Actor
                {voiceEngine === 'elevenlabs' && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-gradient-to-r from-[#6C63FF]/20 to-[#A855F7]/20 text-[#A855F7] font-bold">
                    ELEVENLABS
                  </span>
                )}
              </label>

              {voiceEngine === 'elevenlabs' ? (
                <>
                  {/* Voice Cloning Studio Toggle & Save Default */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <button
                      onClick={() => setShowClonePanel(!showClonePanel)}
                      className="flex-1 py-2 px-3 bg-[#A855F7]/10 hover:bg-[#A855F7]/20 text-[#A855F7] border border-[#A855F7]/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Crown size={12} />
                      {showClonePanel ? 'Close Cloning Panel' : 'Voice Cloning Studio'}
                    </button>
                    <button
                      onClick={() => cloningAudioFilesInputRef.current?.click()}
                      className="py-2 px-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      title="Upload MP3, MP4, MOV, WAV, M4A voice or video file"
                    >
                      <Upload size={12} />
                      Upload Voice File
                    </button>
                    {selectedELVoiceId && (
                      <button
                        onClick={handleSaveDefaultVoice}
                        className="py-2 px-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check size={12} className="text-emerald-400" />
                        Set Default
                      </button>
                    )}
                  </div>

                  {/* Voice Cloning Studio Panel */}
                  {showClonePanel && (
                    <div className="p-4 rounded-2xl bg-gradient-to-b from-[#A855F7]/5 to-black/20 border border-[#A855F7]/20 space-y-4 shadow-xl mb-4">
                      <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Mic size={14} className="text-[#A855F7]" /> Clone Custom Voice
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Voice Name</label>
                          <input
                            type="text"
                            value={cloneName}
                            onChange={(e) => setCloneName(e.target.value)}
                            placeholder="e.g. My Cloned Voice"
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-[#A855F7] transition-all"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Description (Optional)</label>
                          <input
                            type="text"
                            value={cloneDesc}
                            onChange={(e) => setCloneDesc(e.target.value)}
                            placeholder="e.g. Energetic podcast style"
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-[#A855F7] transition-all"
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
                                className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider"
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
                                className="flex-1 py-2 rounded-lg bg-[#A855F7]/25 hover:bg-[#A855F7]/30 text-white font-bold text-xs border border-[#A855F7]/35 flex items-center justify-center gap-1.5"
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
                                  <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-white/10 bg-[#0B0F17] p-1.5 shadow-2xl z-30 space-y-1 select-none text-left">
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
                                      <FolderOpen size={13} className="text-violet-400" />
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
                              className="rounded bg-[var(--bg-input)] border-[var(--border-default)] text-[#A855F7] focus:ring-0"
                            />
                            <label htmlFor="attachOnClone" className="text-[10px] font-medium text-[var(--text-secondary)] cursor-pointer">
                              Attach to {persona.name} on creation
                            </label>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleCloneVoiceSubmit}
                        disabled={isCloning || !cloneName || !cloningAudioBase64}
                        className="w-full py-2.5 bg-gradient-to-r from-[#6C63FF] to-[#A855F7] hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        {isCloning ? <Loader2 size={12} className="animate-spin" /> : <Crown size={12} />}
                        {isCloning ? 'Cloning Voice...' : 'Start Voice Cloning'}
                      </button>
                    </div>
                  )}

                  {/* Preset Voices Dropdown */}
                  <div className="space-y-2">
                    {isLoadingVoices ? (
                      <div className="flex items-center justify-center py-4 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#A855F7]" />
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
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-[var(--text-primary)] hover:border-violet-500/30 focus:border-violet-500/50 outline-none transition-all cursor-pointer appearance-none pr-8"
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
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-[var(--text-primary)] hover:border-violet-500/30 focus:border-violet-500/50 outline-none transition-all cursor-pointer appearance-none pr-8"
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
                    {selectedVoice && (
                      <button
                        onClick={() => handleVoicePreview(selectedVoice)}
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center transition-all border border-white/10 shrink-0",
                          previewingVoice === selectedVoice 
                            ? "bg-[var(--accent-primary)] text-white shadow-lg" 
                            : "bg-white/5 hover:bg-white/10 text-[var(--text-tertiary)] hover:text-white"
                        )}
                      >
                        {previewingVoice === selectedVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                      </button>
                    )}
                  </div>

                  {/* Custom Reference Voice Upload for OmniVoice 'persona-clone' */}
                  {voiceEngine === 'omnivoice' && selectedVoice === 'persona-clone' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-2xl bg-gradient-to-b from-cyan-500/5 to-black/20 border border-cyan-500/20 space-y-3 shadow-xl"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">OmniVoice Reference Sample</span>
                        {omnivoiceRefUrl && (
                          <button
                            onClick={() => {
                              const audio = new Audio(omnivoiceRefUrl);
                              audio.play().catch(() => {});
                            }}
                            className="text-[9px] font-bold text-cyan-300 hover:text-cyan-200 transition-colors uppercase tracking-widest"
                          >
                            Play Sample
                          </button>
                        )}
                      </div>
                      
                       <div className="relative w-full">
                        <button
                          type="button"
                          onClick={() => setOmnivoiceRefUploadMenuOpen(!omnivoiceRefUploadMenuOpen)}
                          className="w-full py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer text-center transition-all select-none"
                        >
                          <Download size={12} className="rotate-180" />
                          <span>{omnivoiceRefName ? `Uploaded: ${omnivoiceRefName.substring(0, 24)}...` : 'Upload Audio or Video'}</span>
                        </button>
                        
                        {omnivoiceRefUploadMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOmnivoiceRefUploadMenuOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-white/10 bg-[#0B0F17] p-1.5 shadow-2xl z-30 space-y-1 select-none text-left">
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
                                <FolderOpen size={13} className="text-violet-400" />
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
              <div className="grid grid-cols-5 gap-2">
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

            {/* Atmosphere */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest block">Atmosphere</label>
              <div className="grid grid-cols-2 gap-3">
                {ATMOSPHERES.map(a => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedAtmosphere(selectedAtmosphere === a.id ? null : a.id)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all",
                        selectedAtmosphere === a.id 
                          ? "bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-lg" 
                          : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px] font-bold">{a.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Directing Prompt */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest block">Directing Prompt</label>
              <input
                type="text"
                value={performancePrompt}
                onChange={(e) => setPerformancePrompt(e.target.value)}
                placeholder="E.g. Speak like you're out of breath..."
                className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl py-4 px-5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)] transition-all"
              />
            </div>

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
        {audioUrl && (
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
                      style={{ background: 'var(--gradient-button)', boxShadow: '0 0 30px rgba(124,91,240,0.3)' }}
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
                  {VIDEO_MODELS.map(model => {
                    const isSelected = selectedVideoModel === model.id;
                    const isGoogle = model.provider === 'google';
                    return (
                      <button
                        key={model.id}
                        onClick={() => setSelectedVideoModel(model.id)}
                        className={cn(
                          "relative p-3.5 rounded-2xl border text-left transition-all",
                          isSelected
                            ? "bg-gradient-to-br from-[#6C63FF]/10 to-[#A855F7]/10 border-[#A855F7]/60 shadow-[0_0_24px_rgba(168,85,247,0.12)]"
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
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-amber-500/10 text-amber-400"
                          )}>
                            {isGoogle ? 'Gemini' : 'Wavespeed'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">
                            {(() => {
                              const isCreator = billingInfo?.isCreator;
                              if (model.id.startsWith('google:')) {
                                return isCreator ? 'Free' : '10 credits';
                              } else if (model.id.includes('wan-2.1')) {
                                return isCreator ? '$0.040' : '8 credits';
                              } else if (model.id.includes('wan-2.2')) {
                                return isCreator ? '$0.050' : '10 credits';
                              }
                              return isCreator ? model.price : '10 credits';
                            })()}
                          </span>
                          <span className="text-[9px] text-[var(--text-muted)]">•</span>
                          <span className="text-[9px] text-[var(--text-muted)] truncate">{model.desc}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#A855F7] shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
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
                    style={{ boxShadow: '0 10px 40px rgba(124,91,240,0.25)' }}
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


      {/* History */}
      <div className="glass-card rounded-2xl p-6 space-y-6">
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
      )}

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
