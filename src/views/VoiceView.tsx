import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotatingHeroImages } from '../components/RotatingHeroImages';
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
  Loader2,
  Settings2,
  Music,
  Search,
  SlidersHorizontal,
  AudioLines,
  Globe2,
  Crown,
  Star
} from 'lucide-react';
import { Persona } from '../types';
import { api } from '../services/apiService';
import { cn } from '../utils/cn';
import { processImageFile } from '../utils/imageProcessing';

interface VoiceViewProps {
  persona: Persona | null;
  personas: Persona[];
  onSelectPersona: (id: string) => void;
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

type VoiceEngine = 'elevenlabs' | 'openai' | 'gemini';

export default function VoiceView({ persona, personas, onSelectPersona }: VoiceViewProps) {
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

    setIsLoadingVoices(true);
    setVoicesError(null);
    api.voice.getVoices()
      .then(data => {
        setElevenLabsVoices(data.voices);
        // Auto-select first voice if none selected
        if (!selectedELVoiceId && data.voices.length > 0) {
          setSelectedELVoiceId(data.voices[0].voice_id);
        }
      })
      .catch(err => {
        console.error('[Voice] Failed to fetch ElevenLabs voices:', err);
        setVoicesError(err.message || 'Failed to load voices');
      })
      .finally(() => setIsLoadingVoices(false));
  }, [voiceEngine, hasElevenLabsKey]);

  // Reset selected voice when switching native engines
  useEffect(() => {
    if (voiceEngine === 'gemini') {
      setSelectedVoice(GEMINI_VOICES[0].id);
    } else if (voiceEngine === 'openai') {
      setSelectedVoice(OPENAI_VOICES[0].id);
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
      const saved = localStorage.getItem(`vox_vault_${persona.id}`);
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
        localStorage.setItem(`vox_vault_${persona.id}`, JSON.stringify(history));
      } catch (e) {
        console.warn('[Vox] Could not save full history to localStorage (quota exceeded). Storing light version.');
        // If quota exceeded, we try to store a lighter version without massive base64 payloads
        try {
          const lightHistory = history.map(item => ({
            ...item,
            url: item.url.startsWith('data:') ? '' : item.url // Strip base64 content
          }));
          localStorage.setItem(`vox_vault_${persona.id}`, JSON.stringify(lightHistory));
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

    if (previewUrl) {
      // ElevenLabs voices have a preview_url — play it directly
      try {
        const audio = new Audio(previewUrl);
        previewAudioRef.current = audio;
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
          playPromise.catch(() => {
            setPreviewingVoice(null);
            previewAudioRef.current = null;
          });
        }
      } catch (e) {
        setPreviewingVoice(null);
        previewAudioRef.current = null;
      }
    } else {
      // OpenAI/Gemini voice preview — generate a sample
      try {
        // Initialize synchronously to bypass browser autoplay restrictions
        const audio = new Audio();
        previewAudioRef.current = audio;

        const voiceList = voiceEngine === 'gemini' ? GEMINI_VOICES : OPENAI_VOICES;
        const v = voiceList.find(ov => ov.id === voiceId);
        const res = await api.voice.generateSpeech({
          text: `Hello, I am ${v?.name || 'a voice'}. I am here to assist you.`,
          voice: voiceId,
          engine: voiceEngine === 'elevenlabs' ? 'openai' : voiceEngine,
        });
        
        audio.src = res.audioUrl;
        audio.onended = () => {
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
      } catch (err) {
        console.error('[Vox] Preview failed:', err);
        window.alert('Preview Failed: ' + (err instanceof Error ? err.message : 'Missing API Key or Model Error'));
        setPreviewingVoice(null);
      }
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

  // Voice Engine Toggle Component
  const EngineToggle = () => (
    <div className="flex items-center gap-1 p-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)]">
      <button
        onClick={() => hasElevenLabsKey && setVoiceEngine('elevenlabs')}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
          voiceEngine === 'elevenlabs'
            ? "bg-gradient-to-r from-[#6C63FF] to-[#A855F7] text-white shadow-lg shadow-purple-500/20"
            : hasElevenLabsKey 
              ? "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              : "text-[var(--text-muted)] opacity-40 cursor-not-allowed"
        )}
      >
        <Crown className="w-3.5 h-3.5" />
        ElevenLabs
      </button>
      <button
        onClick={() => setVoiceEngine('openai')}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
          voiceEngine === 'openai'
            ? "bg-[var(--accent-primary)] text-white shadow-lg"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        )}
      >
        <AudioLines className="w-3.5 h-3.5" />
        OpenAI
      </button>
      <button
        onClick={() => setVoiceEngine('gemini')}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
          voiceEngine === 'gemini'
            ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        )}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Gemini 2.5 TTS
      </button>
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
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      {/* Clean Toolbar */}
      <header className="premium-header mb-8 pt-4 pb-2">
      <div className="flex items-center justify-between relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight"><span className="gradient-text">Voice Studio</span></h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-1.5 font-medium">Scripts, synthesis & talking video</p>
        </div>
        <div className="flex items-center gap-4">
          <EngineToggle />
          <div className="flex items-center gap-3">
            {persona.referenceImage && (
              <img 
                src={persona.referenceImage} 
                alt={persona.name} 
                className="w-8 h-8 rounded-lg object-cover ring-2 ring-[var(--accent-primary)]/25"
              />
            )}
            <p className="text-[var(--text-tertiary)] text-xs font-bold uppercase tracking-wider hidden md:block">Active: <span className="text-[var(--text-primary)]">{persona.name}</span></p>
          </div>
        </div>
      </div>
      </header>

      {history.length === 0 && !script ? (
        <div className="flex flex-col items-center justify-center py-10 md:py-20 text-center relative overflow-hidden">
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
            className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-4"
          >
            BRING IDENTITIES TO LIFE
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="text-[var(--text-secondary)] text-sm max-w-md mx-auto mb-4 leading-relaxed font-medium"
          >
            Generate custom voice scripts and high-fidelity speech audio to match your AI's personality perfectly.
          </motion.p>
          {voiceEngine === 'elevenlabs' && hasElevenLabsKey && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
              className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-[#6C63FF]/10 to-[#A855F7]/10 border border-[#A855F7]/20"
            >
              <Crown className="w-3.5 h-3.5 text-[#A855F7]" />
              <span className="text-[11px] font-bold text-[#A855F7]">Powered by ElevenLabs · {elevenLabsVoices.length || '100+'} Premium Voices</span>
            </motion.div>
          )}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7, type: "spring" }}
            onClick={() => handleGenerateScript('surprise')}
            className="bg-[#D9FC50] text-[#0A0A0B] hover:bg-[#c9f032] px-8 py-3.5 rounded-xl font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#D9FC50]/10 mx-auto"
          >
            Start Audio Studio <Sparkles size={16} />
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
              className="flex-1 w-full min-h-[160px] bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl p-6 text-[var(--text-primary)] text-lg focus:outline-none focus:border-[var(--border-accent)] resize-none font-serif leading-relaxed"
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
                  {/* Search & Filters */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={voiceSearch}
                        onChange={(e) => setVoiceSearch(e.target.value)}
                        placeholder="Search voices..."
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl py-2.5 pl-9 pr-4 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition-all"
                      />
                    </div>

                    {/* Filter chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {['all', 'premade', 'cloned', 'generated'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat)}
                          className={cn(
                            "text-[9px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider transition-all border",
                            categoryFilter === cat
                              ? "bg-[var(--accent-primary-soft)] border-[var(--accent-primary)]/40 text-[var(--accent-primary)]"
                              : "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                      <span className="w-px h-5 bg-[var(--border-default)] self-center mx-1" />
                      {['all', 'male', 'female'].map(g => (
                        <button
                          key={g}
                          onClick={() => setGenderFilter(g)}
                          className={cn(
                            "text-[9px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider transition-all border",
                            genderFilter === g
                              ? "bg-[var(--accent-sky)]/10 border-[var(--accent-sky)]/30 text-[var(--accent-sky)]"
                              : "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Voice Grid */}
                  {isLoadingVoices ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-[#A855F7]" />
                      <span className="text-xs text-[var(--text-muted)] font-medium">Loading voices...</span>
                    </div>
                  ) : voicesError ? (
                    <div className="text-center py-8 text-xs text-[var(--accent-rose)]">{voicesError}</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredVoices.map(v => (
                        <ELVoiceCard key={v.voice_id} voice={v} />
                      ))}
                      {filteredVoices.length === 0 && (
                        <div className="col-span-2 text-center py-8">
                          <p className="text-xs text-[var(--text-muted)]">No voices match your filters</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Voice Settings */}
                  <VoiceSettingsPanel />
                </>
              ) : (
                /* OpenAI/Gemini Voice Grid (original) */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                  {(voiceEngine === 'gemini' ? GEMINI_VOICES : OPENAI_VOICES).map(v => (
                    <div
                      key={v.id}
                      className={cn(
                        "group relative p-4 rounded-2xl border transition-all cursor-pointer",
                        selectedVoice === v.id 
                          ? "bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] shadow-[0_0_20px_rgba(124,91,240,0.15)]" 
                          : "bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
                      )}
                      onClick={() => setSelectedVoice(v.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full shadow-lg",
                            selectedVoice === v.id ? "bg-[var(--accent-primary)]" : "bg-[var(--text-muted)]"
                          )} />
                          <span className={cn(
                            "text-sm font-bold",
                            selectedVoice === v.id ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
                          )}>{v.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVoicePreview(v.id);
                          }}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                            previewingVoice === v.id 
                              ? "bg-[var(--accent-primary)] scale-110 text-white shadow-lg" 
                              : "bg-[var(--bg-overlay)] hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                          )}
                        >
                          {previewingVoice === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                        </button>
                      </div>
                      <div className="mt-2 text-[10px] text-[var(--text-muted)] font-medium leading-relaxed">{v.desc}</div>
                    </div>
                  ))}
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
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">{model.price}</span>
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
    </div>
  );
}
