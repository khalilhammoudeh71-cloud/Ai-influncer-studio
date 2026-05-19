import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Sparkles,
  FileText,
  Video,
  Image as ImageIcon,
  Film,
  Wand2,
  Loader2,
  ChevronDown,
  Cpu,
  Download,
  Upload,
  Check,
  AlertCircle,
  Layout,
  Shirt,
  MapPin,
  Smile,
  CheckCircle,
  Pencil,
  ArrowUpCircle,
  History,
  Camera,
  ChevronsRight,
  UserRound,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  X,
  Type,
  Mic,
  Calendar,
  Share2,
  Plus,
  Bell,
  Search,
  Play,
  Pause,
  Volume2,
} from 'lucide-react';
import { Persona, GeneratedImage, NavActions, Tab, NavEntry } from '../types';
import PlannerView from './PlannerView';
import VoiceView from './VoiceView';
import AIToolsView from './AIToolsView';
import VideoSamplePreview from '../components/VideoSamplePreview';
import {
  generateImage,
  generateVideo,
  generateContent,
  enhancePrompt,
  createPrompts,
  fetchAllModelTypes,
  editImage,
  upscaleImage,
  generateAngleImage,
  ANGLE_MODELS,
  canUseReference,
  type ModelInfo,
  type GenerateImageResult,
  TTS_VOICES,
  type TTSVoice,
  fetchElevenLabsVoices,
  textToSpeech,
  generateTalkingHead,
} from '../services/imageService';
import { api } from '../services/apiService';
import toast from 'react-hot-toast';
import { useRef } from 'react';

type CreateMode = 'angle' | 'image' | 'video' | 'talking-avatar' | 'voice' | 'ai-tools' | 'planner' | 'prompt' | 'transcript' | 'multi-scene';

const ANONYMOUS_PERSONA: Persona = {
  id: 'none',
  name: '',
  niche: '',
  tone: 'Photorealistic',
  platform: '',
  status: 'Draft',
  avatar: '',
  personalityTraits: [],
  visualStyle: 'Realistic, highly detailed',
  audienceType: '',
  contentBoundaries: '',
  bio: '',
  brandVoiceRules: '',
  contentGoals: '',
  personaNotes: '',
};

interface CreateViewProps {
  persona: Persona;
  personas: Persona[];
  setPersonas: (personas: Persona[]) => void;
  onSelectPersona: (id: string) => void;
  subView?: string;
  nav: NavActions;
}

const CUSTOM = 'None';
const ENVIRONMENTS = [CUSTOM, 'Luxury Hotel', 'Modern Apartment', 'Rooftop Lounge', 'Beach Resort', 'Yacht Deck', 'Upscale Restaurant', 'Private Gym', 'Beauty Studio', 'City Street', 'Penthouse'];
const OUTFITS = [CUSTOM, 'Casual Chic', 'Luxury Evening', 'Business Professional', 'Fitness Wear', 'Edgy Streetwear', 'Glamorous Gown', 'Home Lounge'];
const FRAMING = [CUSTOM, 'Portrait', 'Selfie Style', 'Full Body', 'Half Body', 'Candid', 'Cinematic'];
const MOODS = [CUSTOM, 'Confident', 'Friendly', 'Thoughtful', 'Playful', 'Professional', 'Seductive'];

const MODE_CONFIG: { id: CreateMode; label: string; icon: any; gradient: string; ringClass: string; desc: string }[] = [
  { id: 'angle', label: 'Camera Angles', icon: Camera, gradient: 'from-cyan-600 to-sky-500', ringClass: 'focus:ring-cyan-500', desc: 'Generate 9-angle identity sheets' },
  { id: 'image', label: 'Generate Images', icon: ImageIcon, gradient: 'from-purple-600 to-blue-600', ringClass: 'focus:ring-purple-500', desc: 'Create persona-consistent images' },
  { id: 'video', label: 'Generate Videos', icon: Video, gradient: 'from-pink-600 to-orange-500', ringClass: 'focus:ring-pink-500', desc: 'Turn images into video scenes' },
  { id: 'talking-avatar', label: 'Talking Avatar', icon: UserRound, gradient: 'from-emerald-600 to-teal-500', ringClass: 'focus:ring-emerald-500', desc: 'Speaking avatar with voice' },
  { id: 'voice', label: 'Voice', icon: Mic, gradient: 'from-amber-500 to-orange-500', ringClass: 'focus:ring-amber-500', desc: 'Generate audio and clone voice' },
  { id: 'ai-tools', label: 'AI Tools', icon: Sparkles, gradient: 'from-violet-600 to-purple-500', ringClass: 'focus:ring-violet-500', desc: 'Edit and enhance images' },
  { id: 'planner', label: 'Content Plan', icon: Calendar, gradient: 'from-fuchsia-600 to-pink-500', ringClass: 'focus:ring-fuchsia-500', desc: 'Schedule posts and campaigns' },
];

const QUICK_STYLES = [
  { id: 'beach-day',    label: 'Beach Day',     emoji: '🏖️', env: 'Beach Resort',      outfit: 'Fitness Wear',         framing: 'Full Body',   mood: 'Playful'      },
  { id: 'night-out',   label: 'Night Out',      emoji: '🌙', env: 'Upscale Restaurant', outfit: 'Luxury Evening',       framing: 'Portrait',    mood: 'Seductive'    },
  { id: 'power-look',  label: 'Power Look',     emoji: '💼', env: 'Modern Apartment',   outfit: 'Business Professional',framing: 'Half Body',   mood: 'Confident'    },
  { id: 'gym-session', label: 'Gym Session',    emoji: '💪', env: 'Private Gym',        outfit: 'Fitness Wear',         framing: 'Full Body',   mood: 'Confident'    },
  { id: 'luxury-vibes',label: 'Luxury Vibes',   emoji: '✨', env: 'Penthouse',           outfit: 'Glamorous Gown',       framing: 'Full Body',   mood: 'Professional' },
  { id: 'street-style',label: 'Street Style',   emoji: '🛹', env: 'City Street',         outfit: 'Edgy Streetwear',      framing: 'Candid',      mood: 'Playful'      },
];

type PostGenAction = null | 'edit' | 'upscale';

interface ImageVersion {
  imageUrl: string;
  model: string;
  promptUsed: string;
  label: string;
}

interface GeneratedEntry {
  id: string;
  imageUrl: string;
  model: string;
  promptUsed: string;
  label: string;
  timestamp: number;
}

const ASPECT_RATIO_OPTIONS = [
  { value: '1:1',  label: 'Square (1:1)' },
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '9:16', label: 'Portrait (9:16)' },
  { value: '4:5',  label: 'Instagram (4:5)' },
  { value: '5:4',  label: 'Landscape (5:4)' },
  { value: '3:2',  label: 'Photo (3:2)' },
  { value: '2:3',  label: 'Photo Portrait (2:3)' },
  { value: '21:9', label: 'Cinematic (21:9)' },
];

const RESOLUTION_OPTIONS: Record<string, { value: 'standard' | 'hd'; label: string }[]> = {
  venice:    [{ value: 'standard', label: 'Standard (~1024px)' }, { value: 'hd', label: 'HD (~1536px)' }],
  wavespeed: [{ value: 'standard', label: 'Standard' }],
  google:    [{ value: 'standard', label: 'Standard' }],
  openai:    [{ value: 'standard', label: 'Standard' }],
  default:   [{ value: 'standard', label: 'Standard' }, { value: 'hd', label: 'HD' }],
};

export default function CreateView({ persona, personas, setPersonas, onSelectPersona, subView, nav }: CreateViewProps) {
  const initialPersona = persona || (personas && personas.length > 0 ? personas[0] : null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);


  const [localPersonaId, setLocalPersonaId] = useState<string>(initialPersona?.id || 'none');
  const [naturalLook, setNaturalLook] = useState(initialPersona?.naturalLook ?? true);
  const [identityLock, setIdentityLock] = useState(initialPersona?.identityLock ?? true);

  const activePersona = useMemo(() => {
    if (localPersonaId === 'none') return ANONYMOUS_PERSONA;
    return personas.find(p => p.id === localPersonaId) || initialPersona;
  }, [localPersonaId, personas, initialPersona]);

  useEffect(() => {
    if (localPersonaId !== 'none' && initialPersona) setLocalPersonaId(initialPersona.id);
  }, [initialPersona?.id]);

  useEffect(() => {
    setNaturalLook(activePersona?.naturalLook ?? true);
    setIdentityLock(activePersona?.identityLock ?? true);
  }, [activePersona?.id]);

  const handleNaturalLookToggle = () => {
    const next = !naturalLook;
    setNaturalLook(next);
    if (localPersonaId !== 'none') {
      api.personas.update({ ...activePersona, naturalLook: next, identityLock }).catch(() => {
        setGlobalError('Failed to save Natural Look preference.');
      });
    }
  };

  const handleIdentityLockToggle = () => {
    const next = !identityLock;
    setIdentityLock(next);
    if (localPersonaId !== 'none') {
      api.personas.update({ ...activePersona, naturalLook, identityLock: next }).catch(() => {
        setGlobalError('Failed to save Identity Lock preference.');
      });
    }
  };

  const [mode, setMode] = useState<CreateMode>((subView as CreateMode) || 'image');

  useEffect(() => {
    if (subView && subView !== mode) {
      setMode(subView as CreateMode);
    }
  }, [subView]);

  const updateMode = (newMode: CreateMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    nav.push({ view: 'create', subView: newMode });
  };

  const [imagePrompt, setImagePrompt] = useState('');
  const [selectedEnv, setSelectedEnv] = useState(ENVIRONMENTS[0]);
  const [selectedOutfit, setSelectedOutfit] = useState(OUTFITS[0]);
  const [selectedFraming, setSelectedFraming] = useState(FRAMING[0]);
  const [selectedMood, setSelectedMood] = useState(MOODS[0]);
  const [imageResult, setImageResult] = useState<GenerateImageResult | null>(null);
  const [multiResults, setMultiResults] = useState<GenerateImageResult[]>([]);
  const [selectedVariation, setSelectedVariation] = useState(0);
  const [imageCount, setImageCount] = useState(1);
  const [imageHistory, setImageHistory] = useState<ImageVersion[]>([]);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(0);
  const [postAction, setPostAction] = useState<PostGenAction>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editAdditionalImage, setEditAdditionalImage] = useState<string | null>(null);
  const [editAdditionalImageName, setEditAdditionalImageName] = useState<string | null>(null);
  const [selectedEditModel, setSelectedEditModel] = useState('');
  const [selectedUpscaleModel, setSelectedUpscaleModel] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [refPersonaId, setRefPersonaId] = useState<string>('none');
  const [refImages, setRefImages] = useState<{ id: string; url: string; name: string }[]>([]);

  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoResult, setVideoResult] = useState<{ videoUrl: string; model: string } | null>(null);
  const [isExtending, setIsExtending] = useState(false);
  const [extendResult, setExtendResult] = useState<{ videoUrl: string; model: string } | null>(null);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [videoSourcePersonaId, setVideoSourcePersonaId] = useState<string>('none');
  const [videoSourceImage, setVideoSourceImage] = useState<string | null>(null);
  const [videoSourceImageName, setVideoSourceImageName] = useState<string | null>(null);

  const [textTopic, setTextTopic] = useState('');
  const [textResult, setTextResult] = useState('');
  const [sceneCount, setSceneCount] = useState(3);

  const [promptTab, setPromptTab] = useState<'create' | 'enhance'>('create');
  const [createRequest, setCreateRequest] = useState('');
  const [promptCount, setPromptCount] = useState(3);
  const [createdPrompts, setCreatedPrompts] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [editModels, setEditModels] = useState<ModelInfo[]>([]);
  const [upscaleModels, setUpscaleModels] = useState<ModelInfo[]>([]);
  const [videoModels, setVideoModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedVideoModel, setSelectedVideoModel] = useState('');
  const [modelsLoading, setModelsLoading] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const [angleSourceImage, setAngleSourceImage] = useState<string | null>(null);
  const [angleSourceImageName, setAngleSourceImageName] = useState<string | null>(null);
  const [angleHorizontal, setAngleHorizontal] = useState(1);
  const [angleVertical, setAngleVertical] = useState(2);
  const [angleDistance, setAngleDistance] = useState(1);
  const [angleModel, setAngleModel] = useState(ANGLE_MODELS[0].id);
  const [angleResult, setAngleResult] = useState<{ imageUrl: string; model: string } | null>(null);

  const [activeQuickStyle, setActiveQuickStyle] = useState<string | null>(null);
  const [personaPickerOpen, setPersonaPickerOpen] = useState(false);

  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1');
  const [selectedResolution, setSelectedResolution] = useState<'standard' | 'hd'>('standard');
  const audioUploadRef = useRef<HTMLInputElement | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<{ url: string; name: string } | null>(null);
  const [generatedFeed, setGeneratedFeed] = useState<GeneratedEntry[]>([]);
  const [focusedEntryId, setFocusedEntryId] = useState<string | null>(null);
  const [excludePersonaRef, setExcludePersonaRef] = useState(false);
  const [enhancingField, setEnhancingField] = useState<string | null>(null);

  // Talking Avatar specific state
  const [avatarScript, setAvatarScript] = useState('Hey everyone! Welcome back to my channel. In today\'s video, I\'m sharing my top 5 productivity tips that have completely transformed my daily routine. Let\'s dive in!');
  const [selectedAvatarVoice, setSelectedAvatarVoice] = useState(TTS_VOICES[3].id); // Kore default
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [allVoices, setAllVoices] = useState<TTSVoice[]>(TTS_VOICES);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large (max 10MB)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setUploadedAudio({ url, name: file.name });
        setSelectedAvatarVoice('custom-upload');
        toast.success(`Uploaded: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!initialPersona) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-base)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-emerald-500/60 font-bold uppercase tracking-widest text-xs">Initializing Persona...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchElevenLabsVoices().then(elVoices => {
      if (elVoices.length > 0) {
        setAllVoices([...TTS_VOICES, ...elVoices]);
      }
    });
  }, []);

  const handleVoicePreview = async (e: React.MouseEvent, voice: TTSVoice) => {
    e.stopPropagation();
    
    // Stop existing
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.onended = null;
    }

    if (playingPreviewId === voice.id) {
      setPlayingPreviewId(null);
      return;
    }

    const playAudio = (url: string) => {
      try {
        const audio = new Audio(url);
        audio.onended = () => {
          setPlayingPreviewId(null);
          audioPreviewRef.current = null;
        };
        audioPreviewRef.current = audio;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Playback error:', error);
            if (error.name !== 'AbortError') {
              toast.error('Preview failed to play');
            }
            setPlayingPreviewId(null);
          });
        }
        setPlayingPreviewId(voice.id);
      } catch (err) {
        console.error('Audio creation error:', err);
        toast.error('Could not initialize audio');
        setPlayingPreviewId(null);
      }
    };

    if (voice.previewUrl) {
      playAudio(voice.previewUrl);
    } else {
      // Generate short preview for Gemini/OpenAI
      const t = toast.loading(`Generating preview for ${voice.name}...`);
      try {
        setPlayingPreviewId(voice.id);
        const { audioUrl } = await textToSpeech({
          text: `Hi, I'm ${voice.name}. This is my voice.`,
          voiceName: voice.id,
          engine: voice.engine,
          voiceId: voice.id
        });
        toast.dismiss(t);
        playAudio(audioUrl);
      } catch (err) {
        toast.dismiss(t);
        toast.error('Failed to generate preview');
        setPlayingPreviewId(null);
      }
    }
  };

  const handleGenerateTalkingAvatar = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGlobalError(null);
    
    const t = toast.loading('Initializing Talking Avatar pipeline...');
    try {
      const portraitImage = activePersona.avatar || ''; 
      
      let audioUrl = '';
      if (selectedAvatarVoice === 'custom-upload' && uploadedAudio) {
        audioUrl = uploadedAudio.url;
        toast.loading('Processing uploaded audio...', { id: t });
      } else {
        toast.loading('Generating voice from script...', { id: t });
        const voiceObj = allVoices.find(v => v.id === selectedAvatarVoice);
        const ttsRes = await textToSpeech({
          text: avatarScript,
          voiceName: selectedAvatarVoice,
          engine: voiceObj?.engine || 'gemini',
          voiceId: selectedAvatarVoice
        });
        audioUrl = ttsRes.audioUrl;
      }

      toast.loading('Animating avatar face (this may take a minute)...', { id: t });
      const result = await generateTalkingHead({
        portraitImage,
        audioUrl,
        script: avatarScript,
        voiceName: selectedAvatarVoice
      });

      toast.success('Talking Avatar ready!', { id: t });
      // In a real app, we would add this to history or show it in the preview
      // For now, we update the video result if needed or just show success
      if (result.videoUrl) {
        setVideoResult({ videoUrl: result.videoUrl, model: result.model });
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Generation failed', { id: t });
      setGlobalError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };
  const [selectedAvatarSource, setSelectedAvatarSource] = useState('persona-1');
  const [selectedAvatarTone, setSelectedAvatarTone] = useState('Professional');
  const [selectedAvatarFraming, setSelectedAvatarFraming] = useState('Medium Shot');
  const [selectedAvatarDuration, setSelectedAvatarDuration] = useState('30s (approx)');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarResult, setAvatarResult] = useState<{ url: string; thumbnail: string } | null>(null);

  const refPersonaImage = refPersonaId !== 'none' ? (personas.find(p => p.id === refPersonaId)?.referenceImage ?? null) : null;
  const allRefImages: string[] = [
    ...(!excludePersonaRef && refPersonaImage ? [refPersonaImage] : []),
    ...refImages.map(img => img.url),
  ];
  const effectiveRefImage = allRefImages[0] || null;
  const hasRefImage = allRefImages.length > 0;

  const videoSourcePersonaImage = videoSourcePersonaId !== 'none' ? (personas.find(p => p.id === videoSourcePersonaId)?.referenceImage ?? null) : null;
  const effectiveVideoSourceImage = videoSourceImage || videoSourcePersonaImage || null;
  const activeVersion = imageHistory[activeHistoryIndex] || null;

  useEffect(() => {
    fetchAllModelTypes()
      .then(({ models: m, editModels: em, upscaleModels: um, videoModels: vm }) => {
        setModels(m);
        setEditModels(em);
        setUpscaleModels(um);
        setVideoModels(vm);
        const preferred = hasRefImage ? m.find(x => x.hasEditVariant) || m[0] : m[0];
        if (preferred) setSelectedModel(preferred.id);
        if (em.length > 0) setSelectedEditModel(em[0].id);
        if (um.length > 0) setSelectedUpscaleModel(um[0].id);
        if (vm.length > 0) setSelectedVideoModel(vm[0].id);
      })
      .catch(() => setGlobalError('Failed to load available models.'))
      .finally(() => setModelsLoading(false));
  }, []);

  const sortedModels = useMemo(() => {
    const priority = (m: ModelInfo) =>
      m.id.startsWith('google:') ? 0
      : (m.id.startsWith('openai:') || m.id.startsWith('replit:')) ? 1
      : m.id.startsWith('venice:') ? 3
      : 2;
    return [...models].sort((a, b) => priority(a) - priority(b) || a.name.localeCompare(b.name));
  }, [models]);

  const groupedModels = useMemo(() => {
    const ORDER = ['Gemini', 'OpenAI', 'Wavespeed', 'Venice AI'] as const;
    const groups: Record<string, ModelInfo[]> = { 'Gemini': [], 'OpenAI': [], 'Wavespeed': [], 'Venice AI': [] };
    sortedModels.forEach(m => {
      const g = m.id.startsWith('google:') ? 'Gemini'
        : (m.id.startsWith('openai:') || m.id.startsWith('replit:')) ? 'OpenAI'
        : m.id.startsWith('venice:') ? 'Venice AI'
        : 'Wavespeed';
      groups[g].push(m);
    });
    return Object.fromEntries(ORDER.filter(g => groups[g].length > 0).map(g => [g, groups[g]]));
  }, [sortedModels]);

  const groupedEditModels = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    editModels.forEach(m => { if (!groups[m.provider]) groups[m.provider] = []; groups[m.provider].push(m); });
    return groups;
  }, [editModels]);

  const groupedUpscaleModels = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    upscaleModels.forEach(m => { if (!groups[m.provider]) groups[m.provider] = []; groups[m.provider].push(m); });
    return groups;
  }, [upscaleModels]);

  const groupedVideoModels = useMemo(() => {
    const t2v: Record<string, ModelInfo[]> = {};
    const i2v: Record<string, ModelInfo[]> = {};
    videoModels.forEach(m => {
      const target = m.type === 'image-to-video' ? i2v : t2v;
      if (!target[m.provider]) target[m.provider] = [];
      target[m.provider].push(m);
    });
    return { t2v, i2v };
  }, [videoModels]);

  const selectedModelInfo = useMemo(() => models.find(m => m.id === selectedModel), [models, selectedModel]);

  const resolutionOpts = useMemo(() => {
    const p = selectedModelInfo?.provider?.toLowerCase() ?? '';
    if (p.includes('venice')) return RESOLUTION_OPTIONS.venice;
    if (p.includes('wavespeed')) return RESOLUTION_OPTIONS.wavespeed;
    if (p.includes('google')) return RESOLUTION_OPTIONS.google;
    if (p.includes('openai')) return RESOLUTION_OPTIONS.openai;
    return RESOLUTION_OPTIONS.default;
  }, [selectedModelInfo]);
  const isI2VModel = selectedVideoModel.startsWith('wavespeed-i2v:');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveMediaToLibrary = async (media: GeneratedImage) => {
    const updatedPersonas = personas.map(p => {
      if (p.id === persona.id) {
        return { ...p, visualLibrary: [...(p.visualLibrary || []), media] };
      }
      return p;
    });
    setPersonas(updatedPersonas);

    try {
      await fetch(`/api/personas/${persona.id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(media),
      });
    } catch (err) {
      console.error('Failed to persist media:', err);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleImageGenerate = async () => {
    if (!selectedModel) return;
    setIsGenerating(true);
    setGlobalError(null);
    setImageResult(null);
    setMultiResults([]);
    setSelectedVariation(0);
    setImageHistory([]);
    setActiveHistoryIndex(0);
    setPostAction(null);
    setActionError(null);

    try {
      const isIdentityModel = selectedModelInfo?.isIdentityModel ?? false;
      const allRefs = allRefImages.length > 0
        ? allRefImages
        : (activePersona.referenceImage ? [activePersona.referenceImage] : []);
      const resolvedRef = allRefs[0] || undefined;
      const extraRefs = allRefs.slice(1);

      if (isIdentityModel && !resolvedRef) {
        setGlobalError('This model requires a face reference image. Please upload a photo or set a reference image on your persona profile.');
        setIsGenerating(false);
        return;
      }

      const personaWithRef = resolvedRef ? { ...activePersona, referenceImage: resolvedRef } : { ...activePersona, referenceImage: undefined };
      const result = await generateImage({
        persona: personaWithRef,
        modelId: selectedModel,
        environment: selectedEnv,
        outfitStyle: selectedOutfit,
        framing: selectedFraming,
        mood: selectedMood,
        additionalInstructions: imagePrompt,
        additionalImages: extraRefs.length > 0 ? extraRefs : undefined,
        naturalLook,
        identityLock,
        count: imageCount,
        aspectRatio: selectedAspectRatio,
        resolution: selectedResolution,
      });

      const now = Date.now();
      if (Array.isArray(result)) {
        const entries: GeneratedEntry[] = result.map((r, i) => ({
          id: `img-${now}-${i}`,
          imageUrl: r.imageUrl,
          model: r.model,
          promptUsed: r.promptUsed || imagePrompt || '',
          label: `Variation ${i + 1}`,
          timestamp: now,
        }));
        setGeneratedFeed(prev => [...entries, ...prev]);
        setFocusedEntryId(entries[0].id);
        setMultiResults(result);
        setSelectedVariation(0);
        setImageResult(result[0]);
        const version: ImageVersion = { imageUrl: result[0].imageUrl, model: result[0].model, promptUsed: result[0].promptUsed || imagePrompt || '', label: 'Variation 1' };
        setImageHistory([version]);
        setActiveHistoryIndex(0);
      } else {
        const entry: GeneratedEntry = {
          id: `img-${now}-0`,
          imageUrl: result.imageUrl,
          model: result.model,
          promptUsed: result.promptUsed || imagePrompt || '',
          label: 'Generated',
          timestamp: now,
        };
        setGeneratedFeed(prev => [entry, ...prev]);
        setFocusedEntryId(entry.id);
        setImageResult(result);
        const version: ImageVersion = { imageUrl: result.imageUrl, model: result.model, promptUsed: result.promptUsed || imagePrompt || '', label: 'Original' };
        setImageHistory([version]);
        setActiveHistoryIndex(0);
      }
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = async () => {
    if (!activeVersion?.imageUrl || !editPrompt.trim() || !selectedEditModel) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      const data = await editImage(activeVersion.imageUrl, editPrompt, selectedEditModel, editAdditionalImage || undefined);
      const newResult = { imageUrl: data.imageUrl, model: data.model, promptUsed: editPrompt };
      setImageResult(newResult);
      const editLabel = `Edit ${imageHistory.filter(v => v.label.startsWith('Edit')).length + 1}`;
      const version: ImageVersion = { imageUrl: data.imageUrl, model: data.model, promptUsed: editPrompt, label: editLabel };
      const newHistory = [...imageHistory, version];
      setImageHistory(newHistory);
      setActiveHistoryIndex(newHistory.length - 1);
      const now = Date.now();
      const entry: GeneratedEntry = { id: `edit-${now}`, imageUrl: data.imageUrl, model: data.model, promptUsed: editPrompt, label: editLabel, timestamp: now };
      setGeneratedFeed(prev => [entry, ...prev]);
      setFocusedEntryId(entry.id);
      setPostAction(null);
      setEditPrompt('');
      setEditAdditionalImage(null);
      setEditAdditionalImageName(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Editing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpscale = async () => {
    if (!activeVersion?.imageUrl || !selectedUpscaleModel) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      const data = await upscaleImage(activeVersion.imageUrl, selectedUpscaleModel);
      const newResult = { imageUrl: data.imageUrl, model: data.model, promptUsed: activeVersion.promptUsed };
      setImageResult(newResult);
      const upscaleLabel = `Upscale ${imageHistory.filter(v => v.label.startsWith('Upscale')).length + 1}`;
      const version: ImageVersion = { imageUrl: data.imageUrl, model: data.model, promptUsed: activeVersion.promptUsed, label: upscaleLabel };
      const newHistory = [...imageHistory, version];
      setImageHistory(newHistory);
      setActiveHistoryIndex(newHistory.length - 1);
      const now = Date.now();
      const entry: GeneratedEntry = { id: `upscale-${now}`, imageUrl: data.imageUrl, model: data.model, promptUsed: activeVersion.promptUsed, label: upscaleLabel, timestamp: now };
      setGeneratedFeed(prev => [entry, ...prev]);
      setFocusedEntryId(entry.id);
      setPostAction(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Upscaling failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVideoGenerate = async () => {
    if (!selectedVideoModel || !videoPrompt.trim()) return;
    setIsGenerating(true);
    setGlobalError(null);
    setVideoResult(null);
    setExtendResult(null);
    setExtendError(null);

    try {
      const sourceImg = effectiveVideoSourceImage || undefined;
      if (isI2VModel && !sourceImg) {
        throw new Error('Image-to-video models require a source image. Select a persona or upload an image.');
      }
      const data = await generateVideo(videoPrompt, selectedVideoModel, sourceImg, identityLock, naturalLook);
      setVideoResult(data);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : 'Video generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExtendVideo = async () => {
    if (!videoResult?.videoUrl || !selectedVideoModel) return;
    setIsExtending(true);
    setExtendError(null);
    setExtendResult(null);
    try {
      const frameRes = await fetch('/api/extract-last-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: videoResult.videoUrl }),
      });
      const frameData = await frameRes.json();
      if (!frameRes.ok) throw new Error(frameData.error || 'Could not extract last frame');

      const data = await generateVideo(videoPrompt, selectedVideoModel, frameData.frameDataUrl, identityLock, naturalLook);
      setExtendResult(data);
    } catch (err: unknown) {
      setExtendError(err instanceof Error ? err.message : 'Video extension failed.');
    } finally {
      setIsExtending(false);
    }
  };

  const handleSaveExtendedVideo = () => {
    if (!extendResult?.videoUrl) return;
    const media: GeneratedImage = {
      id: `vid-ext-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: extendResult.videoUrl,
      prompt: `Extended: ${videoPrompt}`,
      timestamp: Date.now(),
      model: extendResult.model,
      mediaType: 'video',
    };
    saveMediaToLibrary(media);
  };

  const handleTextGenerate = async () => {
    if (!textTopic.trim()) return;
    setIsGenerating(true);
    setGlobalError(null);
    setTextResult('');

    try {
      let result: string;
      if (mode === 'prompt') {
        result = await enhancePrompt(textTopic);
      } else {
        const contentType = mode as 'transcript' | 'multi-scene';
        result = await generateContent(
          contentType,
          textTopic,
          { name: persona.name, niche: persona.niche, tone: persona.tone, platform: persona.platform, bio: persona.bio },
          contentType === 'multi-scene' ? sceneCount : undefined
        );
      }
      setTextResult(result);
    } catch (err: unknown) {
      const fallback = mode === 'prompt' ? 'Prompt enhancement failed.' : 'Content generation failed.';
      setGlobalError(err instanceof Error ? err.message : fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreatePrompts = async () => {
    if (!createRequest.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    setCreatedPrompts([]);
    try {
      const prompts = await createPrompts({
        request: createRequest,
        count: promptCount,
        persona: {
          name: persona.name,
          niche: persona.niche,
          tone: persona.tone,
          visualStyle: persona.visualStyle,
          platform: persona.platform,
        },
      });
      setCreatedPrompts(prompts);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Prompt creation failed.');
    } finally {
      setIsCreating(false);
    }
  };

  const copyPrompt = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedPromptIndex(index);
      setTimeout(() => setCopiedPromptIndex(null), 1800);
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(el);
      setCopiedPromptIndex(index);
      setTimeout(() => setCopiedPromptIndex(null), 1800);
    });
  };

  const handleAngleGenerate = async () => {
    const sourceImg = angleSourceImage || persona.referenceImage || null;
    if (!sourceImg) return;
    setIsGenerating(true);
    setGlobalError(null);
    setAngleResult(null);
    try {
      const data = await generateAngleImage({
        imageBase64: sourceImg,
        modelId: angleModel,
        horizontalAngle: String(angleHorizontal),
        verticalAngle: String(angleVertical),
        distance: String(angleDistance),
      });
      setAngleResult(data);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : 'Angle generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddRefImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setRefImages(prev => [...prev, { id: `ri-${Date.now()}-${Math.random().toString(36).slice(2,5)}`, url, name: file.name }]);
    };
    reader.readAsDataURL(file);
  };

  const applyQuickStyle = (qs: typeof QUICK_STYLES[0]) => {
    setSelectedEnv(qs.env);
    setSelectedOutfit(qs.outfit);
    setSelectedFraming(qs.framing);
    setSelectedMood(qs.mood);
    setActiveQuickStyle(qs.id);
  };

  const clearQuickStyle = () => setActiveQuickStyle(null);

  const handleEnhanceField = async (text: string, setter: (v: string) => void, fieldKey: string) => {
    if (!text.trim() || enhancingField) return;
    setEnhancingField(fieldKey);
    try {
      const enhanced = await enhancePrompt(text);
      setter(enhanced);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Enhancement failed.');
    } finally {
      setEnhancingField(null);
    }
  };

  const handleSaveAngleImage = () => {
    if (!angleResult?.imageUrl) return;
    const media: GeneratedImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: angleResult.imageUrl,
      prompt: `Angle: ${angleHorizontal}, ${angleVertical}, ${angleDistance}`,
      timestamp: Date.now(),
      model: angleResult.model,
    };
    saveMediaToLibrary(media);
  };

  const handleSaveImage = () => {
    if (!activeVersion?.imageUrl) return;
    const media: GeneratedImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: activeVersion.imageUrl,
      prompt: activeVersion.promptUsed || imagePrompt || '',
      timestamp: Date.now(),
      environment: selectedEnv,
      outfit: selectedOutfit,
      framing: selectedFraming,
      model: activeVersion.model,
    };
    saveMediaToLibrary(media);
  };

  const handleSaveVideo = () => {
    if (!videoResult?.videoUrl) return;
    const media: GeneratedImage = {
      id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: videoResult.videoUrl,
      prompt: videoPrompt || '',
      timestamp: Date.now(),
      model: videoResult.model,
      mediaType: 'video',
    };
    saveMediaToLibrary(media);
  };

  const handleFileUpload = (setter: (v: string | null) => void, nameSetter: (v: string | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result as string);
      nameSetter(file.name);
    };
    reader.readAsDataURL(file);
  };

  const downloadFile = (url: string, ext: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${persona.name.replace(/\s+/g, '_')}_${Date.now()}.${ext}`;
    if (ext === 'mp4') a.target = '_blank';
    a.click();
  };

  const currentModeConfig = MODE_CONFIG.find(m => m.id === mode)!;

  const renderModelSelect = (
    value: string,
    onChange: (v: string) => void,
    grouped: Record<string, ModelInfo[]>,
    showRefWarning = false
  ) => {
    const allModels = Object.values(grouped).flat();
    const selectedInfo = allModels.find(m => m.id === value);
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
          <Cpu className="w-3 h-3" /> AI Model
        </label>
        {modelsLoading ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-elevated)] rounded-xl text-sm text-[var(--text-secondary)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading models...
          </div>
        ) : (
          <div className="relative">
            <select
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none pr-10"
            >
              {Object.entries(grouped).map(([provider, providerModels]) => (
                <optgroup key={provider} label={provider}>
                  {providerModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}{m.nsfw ? ' 🔞' : ''}{showRefWarning && hasRefImage && !canUseReference(m, models) ? ' ⚠ No ref support' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
          </div>
        )}
        {selectedInfo?.nsfw && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            🔞 Uncensored — NSFW content enabled
          </span>
        )}
      </div>
    );
  };

  const renderVideoModelSelect = () => {
    const { t2v, i2v } = groupedVideoModels;
    const selectedVideoInfo = videoModels.find(m => m.id === selectedVideoModel);
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
          <Cpu className="w-3 h-3" /> Video Model
        </label>
        {modelsLoading ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-elevated)] rounded-xl text-sm text-[var(--text-secondary)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading models...
          </div>
        ) : (
          <div className="relative">
            <select
              value={selectedVideoModel}
              onChange={e => setSelectedVideoModel(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-pink-500 outline-none appearance-none pr-10"
            >
              {Object.keys(t2v).length > 0 && (
                <optgroup label="Text-to-Video">
                  {Object.entries(t2v).map(([provider, ms]) =>
                    ms.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({provider}){m.price > 0 ? ` $${m.price.toFixed(3)}` : ' Free'}{m.nsfw ? ' 🔞' : ''}
                      </option>
                    ))
                  )}
                </optgroup>
              )}
              {Object.keys(i2v).length > 0 && (
                <optgroup label="Image-to-Video">
                  {Object.entries(i2v).map(([provider, ms]) =>
                    ms.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({provider}){m.price > 0 ? ` $${m.price.toFixed(3)}` : ' Free'}{m.nsfw ? ' 🔞' : ''}
                      </option>
                    ))
                  )}
                </optgroup>
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
          </div>
        )}
        {selectedVideoInfo?.nsfw && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            🔞 Uncensored — NSFW content enabled
          </span>
        )}
      </div>
    );
  };

  const renderChipSelector = (
    label: string,
    Icon: typeof Layout,
    value: string,
    onChange: (v: string) => void,
    options: string[],
    accentClass = 'bg-gradient-to-r from-purple-600 to-violet-600'
  ) => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-[var(--text-tertiary)]" />
        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {options.map(o => {
          const active = value === o;
          return (
            <button
              key={o}
              onClick={() => { onChange(o); clearQuickStyle(); }}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                active
                  ? `${accentClass} text-white border-transparent shadow-sm`
                  : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white'
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderImageMode = () => (
    <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-5 items-start">
      {/* ══ LEFT COLUMN: Configuration (Studio Sidebar) ══ */}
      <div className="space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar pb-20">
        
        {/* AI Model Card */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-2.5 bg-gradient-to-r from-violet-600/10 to-purple-600/5 border-b border-white/5 flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[10px] font-black text-violet-300 uppercase tracking-wider">AI Model</span>
          </div>
          <div className="p-4 space-y-3">
            {renderModelSelect(selectedModel, setSelectedModel, groupedModels, true)}
            {selectedModelInfo && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">{selectedModelInfo.provider}</span>
                {selectedModelInfo.isIdentityModel && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 flex items-center gap-0.5">★ Face-consistent</span>}
                {selectedModelInfo.price > 0 && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">${selectedModelInfo.price.toFixed(3)} per image</span>}
              </div>
            )}
          </div>
        </div>

        {/* Prompt Field - MOVED BELOW MODEL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3 h-3" /> Prompt
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleEnhanceField(imagePrompt, setImagePrompt, 'imagePrompt')}
                disabled={!imagePrompt.trim() || !!enhancingField}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition-all text-[9px] font-black tracking-tighter disabled:opacity-30"
              >
                {enhancingField === 'imagePrompt' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                ENHANCE
              </button>
              {activeVersion?.promptUsed && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeVersion.promptUsed);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
          <div className="relative">
            <textarea
              value={imagePrompt}
              onChange={e => setImagePrompt(e.target.value)}
              placeholder="Describe your AI vision in detail..."
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[var(--text-muted)] resize-none h-24 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="space-y-2">
          <label className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase block tracking-wider">Aspect Ratio</label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { value: '1:1', label: '1:1', desc: 'Square' },
              { value: '16:9', label: '16:9', desc: 'Video' },
              { value: '9:16', label: '9:16', desc: 'Shorts' },
              { value: '4:5', label: '4:5', desc: 'Post' }
            ].map(ar => {
              const active = selectedAspectRatio === ar.value;
              return (
                <button
                  key={ar.value}
                  onClick={() => setSelectedAspectRatio(ar.value)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                    active ? 'bg-purple-600/15 border-purple-500 text-white shadow-md' : 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold">{ar.label}</span>
                  <span className="text-[8px] font-medium opacity-60 mt-0.5">{ar.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates/Quick Styles */}
        <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-wide">Preset Templates</p>
            {activeQuickStyle && (
              <button onClick={clearQuickStyle} className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors">Clear</button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {QUICK_STYLES.map(qs => (
              <button
                key={qs.id}
                onClick={() => applyQuickStyle(qs)}
                className={`flex items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-bold transition-all border ${
                  activeQuickStyle === qs.id
                    ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white border-transparent shadow-md'
                    : 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{qs.emoji}</span>
                <span className="truncate">{qs.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Style Director Card */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-2.5 bg-gradient-to-r from-fuchsia-600/10 to-pink-600/5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="w-3.5 h-3.5 text-fuchsia-400" />
              <span className="text-[10px] font-black text-fuchsia-300 uppercase tracking-wider">Style Director</span>
            </div>
            <span className="text-[8px] text-[var(--text-muted)] font-bold uppercase">Optional</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Environment', value: selectedEnv, onChange: (v: string) => { clearQuickStyle(); setSelectedEnv(v); }, options: ENVIRONMENTS },
                { label: 'Outfit', value: selectedOutfit, onChange: (v: string) => { clearQuickStyle(); setSelectedOutfit(v); }, options: OUTFITS },
                { label: 'Framing', value: selectedFraming, onChange: (v: string) => { clearQuickStyle(); setSelectedFraming(v); }, options: FRAMING },
                { label: 'Mood', value: selectedMood, onChange: (v: string) => { clearQuickStyle(); setSelectedMood(v); }, options: MOODS },
              ].map(({ label, value, onChange, options }) => (
                <div key={label} className="space-y-1">
                  <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-wide block">{label}</label>
                  <div className="relative">
                    <select
                      value={value}
                      onChange={e => onChange(e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none appearance-none pr-6"
                    >
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-tertiary)] pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Variations + Generate */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-wider">Variations</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(n => (
                  <button key={n} onClick={() => setImageCount(n)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${imageCount === n ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20' : 'bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-white hover:border-white/20'}`}>{n}×</button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button 
              onClick={handleImageGenerate} 
              disabled={isGenerating || !selectedModel || (localPersonaId === 'none' && allRefImages.length === 0)} 
              className="w-full py-4 rounded-xl font-black text-sm bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex flex-col items-center justify-center gap-1 shadow-xl shadow-violet-500/20 text-white group"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generating {imageCount > 1 ? `${imageCount} images` : 'image'}...</div>
              ) : (
                <>
                  <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 group-hover:animate-pulse" /> Generate {imageCount > 1 ? `${imageCount} Variations` : 'Image'}</div>
                  <span className="text-[9px] opacity-50 font-medium">⌘ Enter</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ══ RIGHT COLUMN: Preview Canvas & Workspace ══ */}
      <div className="h-full overflow-y-auto pr-2 custom-scrollbar pb-20 space-y-4">

        {/* Canvas / Main focused Preview area */}
        <div className="flex-1 min-h-[360px] max-h-[540px] flex flex-col justify-center bg-gradient-to-b from-[#0B0F17]/60 to-[#0B0F17]/30 border border-[#334155]/40 rounded-2xl overflow-hidden relative shadow-inner group">
          {isGenerating || isProcessing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0F17]/70 backdrop-blur-md z-30 gap-4 select-none">
              <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
              <p className="text-xs text-[var(--text-secondary)] font-medium animate-pulse">
                {isProcessing
                  ? (postAction === 'upscale' ? 'Upscaling image to 4K...' : 'Editing visual canvas...')
                  : `Creating with ${selectedModelInfo?.name || 'AI'}`}
              </p>
            </div>
          ) : activeVersion ? (
            <div className="relative h-full flex items-center justify-center select-none">
              <img src={activeVersion.imageUrl} alt="Focused active preview" className="w-full h-full object-contain max-h-[520px] transition-transform duration-500 hover:scale-[1.01]" />
              
              {/* Quick Image Download & View Action Badges */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
                <button
                  onClick={e => { e.stopPropagation(); downloadFile(activeVersion.imageUrl, 'png'); }}
                  className="p-2 bg-black/60 backdrop-blur-md rounded-xl text-white hover:bg-black/80 transition-all border border-white/10 hover:border-purple-500 shadow-lg"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleImageGenerate(); }}
                  className="p-2 bg-black/60 backdrop-blur-md rounded-xl text-white hover:bg-purple-600/80 transition-all border border-white/10 shadow-lg"
                  title="Regenerate"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex flex-col items-center justify-center min-h-[340px] p-6 select-none">
              {/* Decorative background */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06),transparent_70%)]" />
              
              {/* Icon */}
              <div className="relative mb-5">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 border border-violet-500/20 flex items-center justify-center">
                  <ImageIcon size={32} className="text-violet-400/60" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Sparkles size={12} className="text-white" />
                </div>
              </div>
              
              <h3 className="text-base font-bold text-white/80 mb-1">Your Canvas Awaits</h3>
              <p className="text-xs text-[var(--text-muted)] text-center max-w-[260px] mb-5 leading-relaxed">
                Choose a model, write a prompt, and click <span className="text-violet-400 font-bold">Generate</span> to create your first image.
              </p>
              
              {/* Quick tips */}
              <div className="flex flex-col gap-2 w-full max-w-[280px]">
                {[
                  { icon: '1', text: 'Select an AI model from the sidebar' },
                  { icon: '2', text: 'Describe your scene in the prompt' },
                  { icon: '3', text: 'Pick a preset style or customize' },
                ].map(tip => (
                  <div key={tip.icon} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="w-5 h-5 rounded-md bg-violet-500/20 text-violet-300 text-[9px] font-black flex items-center justify-center shrink-0">{tip.icon}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Post Generation Toolkit for Active Version */}
        {activeVersion && !isGenerating && !isProcessing && (
          <div className="space-y-3 bg-[#0B0F17]/30 p-3 rounded-xl border border-[var(--border-subtle)]">
            <div className="flex gap-2">
              <button onClick={() => setPostAction(postAction === 'edit' ? null : 'edit')} className={`flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${postAction === 'edit' ? 'bg-blue-600 text-white shadow-md' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white border border-white/5 hover:border-white/10'}`}>
                <Pencil className="w-3.5 h-3.5" /> Edit Image
              </button>
              <button onClick={() => setPostAction(postAction === 'upscale' ? null : 'upscale')} className={`flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${postAction === 'upscale' ? 'bg-green-600 text-white shadow-md' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white border border-white/5 hover:border-white/10'}`}>
                <ArrowUpCircle className="w-3.5 h-3.5" /> Upscale
              </button>
              <button onClick={handleSaveImage} disabled={saved} className="flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white transition-all disabled:opacity-50 shadow-md shadow-purple-500/10">
                {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : <><CheckCircle className="w-3.5 h-3.5" /> Save to Vault</>}
              </button>
            </div>

            {postAction === 'edit' && (
              <div className="bg-[var(--bg-elevated)]/50 border border-[var(--border-default)] rounded-xl p-3 space-y-2">
                {renderModelSelect(selectedEditModel, setSelectedEditModel, groupedEditModels)}
                <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="Describe what to change..." className="w-full bg-[var(--bg-surface)] border border-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--text-muted)] resize-none h-16 outline-none" />
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center gap-2 px-3 py-2 bg-[var(--bg-surface)] rounded-lg cursor-pointer hover:bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)] border border-white/5">
                    <Upload className="w-3.5 h-3.5" />
                    <span className="truncate">{editAdditionalImageName || 'Add reference (optional)'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload(setEditAdditionalImage, setEditAdditionalImageName)} />
                  </label>
                  <button onClick={handleEdit} disabled={isProcessing || !editPrompt.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold disabled:opacity-50 text-white">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                  </button>
                </div>
                {actionError && <p className="text-xs text-rose-400">{actionError}</p>}
              </div>
            )}

            {postAction === 'upscale' && (
              <div className="bg-[var(--bg-elevated)]/50 border border-[var(--border-default)] rounded-xl p-3 space-y-2">
                {renderModelSelect(selectedUpscaleModel, setSelectedUpscaleModel, groupedUpscaleModels)}
                <button onClick={handleUpscale} disabled={isProcessing} className="w-full py-2.5 bg-green-600 hover:bg-emerald-500 rounded-lg text-xs font-extrabold disabled:opacity-50 flex items-center justify-center gap-2 text-white">
                  {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Upscaling to 4K...</> : <><ArrowUpCircle className="w-3.5 h-3.5" /> Upscale Now</>}
                </button>
                {actionError && <p className="text-xs text-rose-400">{actionError}</p>}
              </div>
            )}
          </div>
        )}

        {/* Scrollable feed list of variation thumbnails */}
        {generatedFeed.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-wide">Variation Thumbnails</span>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide select-none">
              {generatedFeed.map(entry => {
                const isFocused = focusedEntryId === entry.id;
                return (
                  <div
                    key={entry.id}
                    onClick={() => {
                      setFocusedEntryId(entry.id);
                      setImageResult({ imageUrl: entry.imageUrl, model: entry.model, promptUsed: entry.promptUsed });
                      setImageHistory([{ imageUrl: entry.imageUrl, model: entry.model, promptUsed: entry.promptUsed, label: entry.label }]);
                      setActiveHistoryIndex(0);
                      setPostAction(null);
                    }}
                    className={`relative rounded-xl overflow-hidden border cursor-pointer transition-all shrink-0 w-20 h-24 ${
                      isFocused ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-[#334155]/60 hover:border-white/30'
                    }`}
                  >
                    <img src={entry.imageUrl} alt={entry.label} className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/60 rounded text-[7px] font-bold text-white max-w-[calc(100%-8px)] truncate">
                      {entry.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );

  const renderVideoMode = () => (
    <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-4 items-start">
      {/* ══ LEFT COLUMN — Controls ══ */}
      <div className="space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar pb-20">
        {renderVideoModelSelect()}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3 h-3" /> Prompt
            </label>
            <button
              type="button"
              onClick={() => handleEnhanceField(videoPrompt, setVideoPrompt, 'videoPrompt')}
              disabled={!videoPrompt.trim() || !!enhancingField}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500/20 hover:text-pink-300 transition-all text-[9px] font-black tracking-tighter disabled:opacity-30"
            >
              {enhancingField === 'videoPrompt' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
              ENHANCE
            </button>
          </div>
          <div className="relative">
            <textarea
              value={videoPrompt}
              onChange={e => setVideoPrompt(e.target.value)}
              placeholder="Describe the video you want to create..."
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[var(--text-muted)] resize-none h-28 outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3" /> {isI2VModel ? 'Source Image' : 'Reference Image'}
            {isI2VModel && <span className="text-rose-400 text-[9px] font-normal normal-case ml-0.5">(required)</span>}
            {!isI2VModel && <span className="text-[var(--text-muted)] text-[9px] font-normal normal-case ml-0.5">(optional)</span>}
          </label>
          <div className="flex gap-3 items-start">
            {effectiveVideoSourceImage && (
              <img src={effectiveVideoSourceImage} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[var(--border-default)] shadow-sm" />
            )}
            <div className="flex-1 space-y-1.5">
              <div className="relative">
                <select
                  value={videoSourcePersonaId}
                  onChange={e => { setVideoSourcePersonaId(e.target.value); setVideoSourceImage(null); setVideoSourceImageName(null); }}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-sm text-white outline-none appearance-none pr-8"
                >
                  <option value="none">{isI2VModel ? 'Select a persona…' : 'No persona reference'}</option>
                  {personas.filter(p => p.referenceImage).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
              </div>
              <label className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-elevated)] border border-dashed border-[var(--border-strong)] rounded-xl cursor-pointer hover:bg-[var(--bg-overlay)]/50 transition-colors">
                <Upload className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                <span className="text-[10px] text-[var(--text-secondary)] truncate">{videoSourceImageName || 'Upload custom image'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload(setVideoSourceImage, setVideoSourceImageName)} />
              </label>
            </div>
          </div>
          {effectiveVideoSourceImage && (
            <button onClick={() => { setVideoSourcePersonaId('none'); setVideoSourceImage(null); setVideoSourceImageName(null); }} className="text-[9px] font-bold text-[var(--text-tertiary)] hover:text-rose-400 transition-colors flex items-center gap-1">
              <X size={10} /> Clear image
            </button>
          )}
        </div>

        <button
          onClick={handleVideoGenerate}
          disabled={isGenerating || !selectedVideoModel || !videoPrompt.trim()}
          className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 active:scale-[0.98]"
        >
          {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Video...</> : <><Video className="w-4 h-4" /> Generate Video</>}
        </button>
      </div>

      {/* ══ RIGHT COLUMN — Output ══ */}
      <div className="h-full overflow-y-auto pr-2 custom-scrollbar pb-20 space-y-4">
        <div className="aspect-video rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] overflow-hidden relative">
          {isGenerating ? (
            <VideoSamplePreview isLoading={isGenerating} loadingText="Generating cinematic video…" />
          ) : videoResult?.videoUrl ? (
            <>
              <video src={videoResult.videoUrl} controls className="absolute inset-0 w-full h-full object-contain" />
              <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg">
                <span className="text-[10px] text-white font-medium">{videoResult.model}</span>
              </div>
            </>
          ) : (
            <VideoSamplePreview />
          )}
        </div>

        {videoResult && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button onClick={() => downloadFile(videoResult.videoUrl, 'mp4')} className="flex-1 py-2 rounded-xl text-xs font-bold bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:text-white flex items-center justify-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              <button onClick={handleSaveVideo} disabled={saved} className="flex-1 py-2 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center gap-1.5 disabled:opacity-50">
                {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : <><CheckCircle className="w-3.5 h-3.5" /> Save to Library</>}
              </button>
            </div>
            <button
              onClick={handleExtendVideo}
              disabled={isExtending || isGenerating}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 hover:text-violet-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isExtending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting last frame & generating…</>
              ) : (
                <><ChevronsRight className="w-3.5 h-3.5" /> Extend Video</>
              )}
            </button>

            {extendError && (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span className="text-xs text-rose-300">{extendError}</span>
              </div>
            )}

            {extendResult?.videoUrl && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-[var(--bg-elevated)]" />
                  <span className="text-[10px] uppercase tracking-widest text-violet-400 font-bold">Extended</span>
                  <div className="h-px flex-1 bg-[var(--bg-elevated)]" />
                </div>
                <div className="aspect-video rounded-2xl bg-[var(--bg-base)] border border-violet-500/20 overflow-hidden relative">
                  <video src={extendResult.videoUrl} controls autoPlay loop className="absolute inset-0 w-full h-full object-contain" />
                  <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg">
                    <span className="text-[10px] text-violet-300 font-medium">{extendResult.model} · Extended</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => downloadFile(extendResult.videoUrl, 'mp4')} className="flex-1 py-2 rounded-xl text-xs font-bold bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:text-white flex items-center justify-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Download Extended
                  </button>
                  <button onClick={handleSaveExtendedVideo} className="flex-1 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Save Extended
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderTextMode = () => {
    const isPromptMode = mode === 'prompt';
    const isMultiScene = mode === 'multi-scene';
    const placeholders: Record<string, string> = {
      'prompt': 'Paste a rough prompt idea to polish it...',
      'transcript': 'Enter a topic or hook for your video script...',
      'multi-scene': 'Enter a topic for your multi-scene video script...',
    };
    const buttonLabels: Record<string, string> = {
      'prompt': 'Enhance Prompt',
      'transcript': 'Generate Transcript',
      'multi-scene': 'Generate Multi-Scene Script',
    };

    const textOutputPanel = (result: string) => (
      <div className="bg-[var(--bg-elevated)]/50 border border-[var(--border-default)] rounded-2xl p-4 relative min-h-[120px]">
        {result ? (
          <>
            <div className="absolute top-3 right-3 flex gap-1.5">
              <button onClick={() => copyToClipboard(result)} className="p-1.5 bg-[var(--bg-overlay)] hover:bg-[var(--bg-overlay)] rounded-lg transition-colors" title="Copy">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([result], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  downloadFile(url, 'txt');
                  URL.revokeObjectURL(url);
                }}
                className="p-1.5 bg-[var(--bg-overlay)] hover:bg-[var(--bg-overlay)] rounded-lg transition-colors" title="Export"
              >
                <Download className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="prose prose-invert prose-sm max-w-none pr-16">
              <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{result}</p>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <FileText className="w-10 h-10 text-[var(--text-muted)] opacity-25" />
            <p className="text-xs text-[var(--text-muted)]">Your output will appear here</p>
          </div>
        )}
      </div>
    );

    if (isPromptMode) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: controls */}
          <div className="space-y-4">
            <div className="flex bg-[var(--bg-elevated)]/60 rounded-xl p-1 gap-1">
              {(['create', 'enhance'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setPromptTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all capitalize ${promptTab === tab ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow' : 'text-[var(--text-secondary)] hover:text-white'}`}
                >
                  {tab === 'create' ? '✦ Create' : '⚡ Enhance'}
                </button>
              ))}
            </div>

            {promptTab === 'create' ? (
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={createRequest}
                    onChange={e => setCreateRequest(e.target.value)}
                    placeholder={`e.g. "3 luxury hotel rooftop prompts at golden hour" or "beach photoshoot, moody cinematic lighting"`}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-[var(--text-muted)] resize-none h-28 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleEnhanceField(createRequest, setCreateRequest, 'createRequest')}
                    disabled={!createRequest.trim() || !!enhancingField}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-[var(--bg-overlay)] hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Enhance with AI"
                  >
                    {enhancingField === 'createRequest' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase">Number of Prompts</label>
                  <div className="flex gap-2">
                    {[1, 3, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setPromptCount(n)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${promptCount === n ? 'bg-emerald-600 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCreatePrompts}
                  disabled={isCreating || !createRequest.trim()}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isCreating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating prompts...</> : <><Sparkles className="w-4 h-4" /> Create Prompts</>}
                </button>
                {createError && (
                  <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-sm text-rose-400">
                    <span className="shrink-0 mt-0.5">⚠</span> {createError}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={textTopic}
                    onChange={e => setTextTopic(e.target.value)}
                    placeholder={placeholders['prompt']}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-[var(--text-muted)] resize-none h-28 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleEnhanceField(textTopic, setTextTopic, 'textTopicPrompt')}
                    disabled={!textTopic.trim() || !!enhancingField}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-[var(--bg-overlay)] hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Enhance with AI"
                  >
                    {enhancingField === 'textTopicPrompt' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  onClick={handleTextGenerate}
                  disabled={isGenerating || !textTopic.trim()}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Enhancing...</> : <><Sparkles className="w-4 h-4" /> Enhance Prompt</>}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: output */}
          <div className="lg:sticky lg:top-4 space-y-3">
            {promptTab === 'create' ? (
              createdPrompts.length > 0 ? (
                <div className="space-y-3">
                  {createdPrompts.map((p, i) => (
                    <div key={i} className="bg-[var(--bg-elevated)]/50 border border-[var(--border-default)] rounded-2xl p-4 relative group">
                      <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => copyPrompt(p, i)} className="p-1.5 bg-[var(--bg-overlay)] rounded-lg transition-colors" title="Copy prompt">
                          {copiedPromptIndex === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
                        </button>
                      </div>
                      <p className="text-xs text-emerald-400 font-bold mb-1.5 uppercase tracking-wide">Prompt {i + 1}</p>
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed pr-10">{p}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <button onClick={() => copyPrompt(p, i)} className="text-xs text-[var(--text-secondary)] hover:text-white font-semibold transition-colors flex items-center gap-1">
                          {copiedPromptIndex === i ? <><Check className="w-3 h-3 text-emerald-400" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                        </button>
                        <button onClick={() => { setImagePrompt(p); updateMode('image'); setGlobalError(null); }} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors flex items-center gap-1">
                          <ChevronsRight className="w-3 h-3" /> Use this prompt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[var(--bg-elevated)]/50 border border-[var(--border-default)] rounded-2xl min-h-[160px] flex flex-col items-center justify-center gap-2">
                  <Sparkles className="w-10 h-10 text-[var(--text-muted)] opacity-25" />
                  <p className="text-xs text-[var(--text-muted)]">Generated prompts will appear here</p>
                </div>
              )
            ) : (
              textOutputPanel(textResult)
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT: controls */}
        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={textTopic}
              onChange={e => setTextTopic(e.target.value)}
              placeholder={placeholders[mode]}
              className={`w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-[var(--text-muted)] resize-none h-28 outline-none focus:ring-2 ${currentModeConfig.ringClass}`}
            />
            <button
              type="button"
              onClick={() => handleEnhanceField(textTopic, setTextTopic, 'textTopic')}
              disabled={!textTopic.trim() || !!enhancingField}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-[var(--bg-overlay)] hover:bg-white/10 text-[var(--text-secondary)] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Enhance with AI"
            >
              {enhancingField === 'textTopic' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isMultiScene && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase">Scene Count</label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setSceneCount(n)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${sceneCount === n ? 'bg-violet-600 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleTextGenerate}
            disabled={isGenerating || !textTopic.trim()}
            className={`w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r ${currentModeConfig.gradient} hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2`}
          >
            {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> {buttonLabels[mode]}</>}
          </button>
        </div>

        {/* RIGHT: output */}
        <div className="lg:sticky lg:top-4">
          {textOutputPanel(textResult)}
        </div>
      </div>
    );
  };

  const HORIZONTAL_POSITIONS = [
    { id: 1,  label: 'Front',       row: 0, col: 1 },
    { id: 2,  label: 'FR',           row: 0, col: 2 },
    { id: 3,  label: 'Right',        row: 1, col: 2 },
    { id: 4,  label: 'BR',           row: 2, col: 2 },
    { id: 5,  label: 'Back',         row: 2, col: 1 },
    { id: 6,  label: 'BL',           row: 2, col: 0 },
    { id: 7,  label: 'Left',         row: 1, col: 0 },
    { id: 8,  label: 'FL',           row: 0, col: 0 },
  ];

  const VERTICAL_POSITIONS = [
    { id: 0, label: "Bird's Eye" },
    { id: 1, label: 'High Angle'  },
    { id: 2, label: 'Eye Level'   },
    { id: 3, label: 'Low Angle'   },
  ];

  const DISTANCE_OPTIONS = [
    { id: 0,  label: 'Close-Up'     },
    { id: 1,  label: 'Medium Shot'  },
    { id: 2,  label: 'Wide Shot'    },
  ];

  const renderAngleMode = () => {
    const angleSourceImg = angleSourceImage || persona.referenceImage || null;
    const angleModelInfo = ANGLE_MODELS.find(m => m.id === angleModel);

    const grid: (typeof HORIZONTAL_POSITIONS[0] | null)[][] = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    HORIZONTAL_POSITIONS.forEach(p => { grid[p.row][p.col] = p; });

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ══ LEFT COLUMN — Controls ══ */}
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
              <Upload className="w-3 h-3" /> Source Image
            </label>
            <label className="flex items-center gap-3 px-3 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl cursor-pointer hover:bg-[var(--bg-overlay)]/50 transition-colors">
              {angleSourceImage ? (
                <img src={angleSourceImage} alt="" className="w-14 h-14 rounded-lg object-cover" />
              ) : persona.referenceImage ? (
                <img src={persona.referenceImage} alt="" className="w-14 h-14 rounded-lg object-cover opacity-60" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-[var(--bg-overlay)] flex items-center justify-center">
                  <Upload className="w-5 h-5 text-[var(--text-tertiary)]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{angleSourceImageName || (persona.referenceImage ? 'Using persona reference' : 'Upload image to reangle')}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">Upload a photo to change its camera angle</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload(setAngleSourceImage, setAngleSourceImageName)} />
            </label>
            {angleSourceImage && (
              <button onClick={() => { setAngleSourceImage(null); setAngleSourceImageName(null); }} className="text-[10px] text-[var(--text-tertiary)] hover:text-rose-400 transition-colors">
                Remove uploaded image
              </button>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
              <Camera className="w-3 h-3" /> Camera Angle
            </label>
            <div className="bg-[var(--bg-elevated)]/60 border border-[var(--border-default)] rounded-2xl p-4 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-2">Horizontal Direction</p>
                <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto">
                  {grid.map((row, ri) =>
                    row.map((cell, ci) => {
                      if (!cell) {
                        return (
                          <div key={`${ri}-${ci}`} className="h-12 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-[var(--bg-overlay)]/40 flex items-center justify-center">
                              <Camera className="w-4 h-4 text-[var(--text-muted)]" />
                            </div>
                          </div>
                        );
                      }
                      const isActive = angleHorizontal === cell.id;
                      return (
                        <button
                          key={cell.id}
                          onClick={() => setAngleHorizontal(cell.id)}
                          className={`h-12 rounded-xl text-[10px] font-bold transition-all ${
                            isActive
                              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                              : 'bg-[var(--bg-overlay)]/60 text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-white'
                          }`}
                        >
                          {cell.label}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-2">Vertical Elevation</p>
                <div className="flex gap-1.5">
                  {VERTICAL_POSITIONS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setAngleVertical(p.id)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${
                        angleVertical === p.id
                          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                          : 'bg-[var(--bg-overlay)]/60 text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-2">Shot Distance</p>
                <div className="flex gap-1.5">
                  {DISTANCE_OPTIONS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setAngleDistance(p.id)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        angleDistance === p.id
                          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                          : 'bg-[var(--bg-overlay)]/60 text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
              <Cpu className="w-3 h-3" /> Model
            </label>
            <div className="relative">
              <select
                value={angleModel}
                onChange={e => setAngleModel(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none appearance-none pr-10"
              >
                {ANGLE_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} (${m.price.toFixed(3)}){m.nsfw ? ' 🔞' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
            </div>
            {angleModelInfo?.nsfw && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                🔞 Uncensored — NSFW content enabled
              </span>
            )}
          </div>

          <button
            onClick={handleAngleGenerate}
            disabled={isGenerating || !angleSourceImg}
            className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isGenerating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              : <><Camera className="w-4 h-4" /> Apply Camera Angle</>}
          </button>

          {!angleSourceImg && !isGenerating && (
            <p className="text-center text-xs text-[var(--text-tertiary)]">Upload an image or set a persona reference image to get started</p>
          )}
        </div>

        {/* ══ RIGHT COLUMN — Output ══ */}
        <div className="space-y-3 lg:sticky lg:top-4">
          <div className="aspect-square rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] overflow-hidden relative group">
            {isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
                <p className="text-xs text-[var(--text-tertiary)] animate-pulse">Repositioning camera...</p>
              </div>
            ) : angleResult?.imageUrl ? (
              <>
                <img src={angleResult.imageUrl} alt="Angle result" className="absolute inset-0 w-full h-full object-contain" />
                <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => downloadFile(angleResult.imageUrl, 'png')} className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-black/80" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg">
                  <span className="text-[10px] text-white font-medium">{angleResult.model}</span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Camera className="w-10 h-10 text-[var(--text-muted)] opacity-25" />
                <p className="text-xs text-[var(--text-muted)]">Your reangled image will appear here</p>
              </div>
            )}
          </div>

          {angleResult && !isGenerating && (
            <button onClick={handleSaveAngleImage} disabled={saved} className="w-full py-2.5 rounded-xl text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
              {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><CheckCircle className="w-4 h-4" /> Save to Library</>}
            </button>
          )}
        </div>
      </div>
    );
  };


  const renderTalkingAvatarMode = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-4 items-start">
        {/* ══ LEFT COLUMN: Configuration ══ */}
        <div className="space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar pb-20">
          
          {/* 1. ACTIVE PERSONA */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 border border-emerald-500/30">1</div>
              <label className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-widest">Active Persona</label>
            </div>
            <div className="glass-card p-4 flex items-center justify-between border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img 
                    src={activePersona.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150"} 
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/20" 
                    alt="Persona" 
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0B0F17] flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{activePersona.name || "New Persona"} — Lifestyle</h3>
                  <p className="text-[10px] text-[var(--text-tertiary)] font-medium">Confident • Modern • Relatable</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={localPersonaId}
                    onChange={e => {
                      const v = e.target.value;
                      setLocalPersonaId(v);
                      if (v !== 'none') onSelectPersona(v);
                    }}
                    className="opacity-0 absolute inset-0 cursor-pointer"
                  >
                    <option value="none">None — Custom</option>
                    {personas.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button className="p-2 bg-white/5 border border-white/10 rounded-xl text-[var(--text-tertiary)] hover:text-white transition-colors">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
                <button className="p-2 bg-white/5 border border-white/10 rounded-xl text-[var(--text-tertiary)] hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. AVATAR SOURCE / REFERENCE */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 border border-emerald-500/30">2</div>
              <label className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-widest">Avatar Source / Reference</label>
            </div>
            <div className="grid grid-cols-5 gap-3">
              <button className="aspect-square flex flex-col items-center justify-center gap-1.5 glass-card border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors">
                <Upload className="w-5 h-5 text-emerald-400" />
                <div className="text-center">
                  <div className="text-[9px] font-bold text-white">Upload Image</div>
                  <div className="text-[7px] text-[var(--text-muted)]">JPG, PNG, WEBP</div>
                </div>
              </button>
              <button className="aspect-square flex flex-col items-center justify-center gap-1.5 glass-card bg-white/5 hover:bg-white/10 transition-colors">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <div className="text-center">
                  <div className="text-[9px] font-bold text-white">AI Generate</div>
                  <div className="text-[7px] text-[var(--text-muted)]">Create from text</div>
                </div>
              </button>
              {[1, 2].map((i) => (
                <button 
                  key={i}
                  onClick={() => setSelectedAvatarSource(`persona-${i}`)}
                  className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all relative group ${selectedAvatarSource === `persona-${i}` ? 'border-emerald-500' : 'border-transparent'}`}
                >
                  <img src={activePersona.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150"} className="w-full h-full object-cover" alt={`Persona Source ${i}`} />
                  {selectedAvatarSource === `persona-${i}` && (
                    <div className="absolute inset-0 bg-emerald-500/10" />
                  )}
                </button>
              ))}
              <button className="aspect-square flex flex-col items-center justify-center glass-card bg-white/5 hover:bg-white/10 transition-colors">
                <div className="text-[14px] text-[var(--text-muted)] font-bold">•••</div>
                <div className="text-[9px] font-bold text-white">More</div>
              </button>
            </div>
          </div>

          {/* 3. SCRIPT */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 border border-emerald-500/30">3</div>
              <label className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-widest">Script</label>
            </div>
            <div className="relative">
              <textarea
                value={avatarScript}
                onChange={e => setAvatarScript(e.target.value)}
                className="w-full h-32 glass-card p-4 text-xs text-white placeholder-white/20 resize-none outline-none focus:border-emerald-500/50"
                placeholder="Type your script here..."
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-3">
                <span className="text-[9px] font-bold text-white/40 tabular-nums">{avatarScript.length} / 2000</span>
                <button 
                  onClick={() => handleEnhanceField(avatarScript, setAvatarScript, 'avatarScript')}
                  className="p-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-400 hover:bg-emerald-500/30 transition-all"
                >
                  {enhancingField === 'avatarScript' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* 4. VOICE */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 border border-emerald-500/30">4</div>
              <label className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-widest">Voice</label>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="file"
                ref={audioUploadRef}
                onChange={handleAudioUpload}
                accept="audio/*"
                className="hidden"
              />
              <button
                onClick={() => audioUploadRef.current?.click()}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                  selectedAvatarVoice === 'custom-upload'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                    : 'glass-card border-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                }`}
              >
                <Mic className={`w-3.5 h-3.5 ${selectedAvatarVoice === 'custom-upload' ? 'text-emerald-400' : ''}`} />
                {uploadedAudio ? uploadedAudio.name : 'Upload Audio'}
                {uploadedAudio && selectedAvatarVoice === 'custom-upload' && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (playingPreviewId === 'custom-upload') {
                        audioPreviewRef.current?.pause();
                        setPlayingPreviewId(null);
                      } else {
                        const audio = new Audio(uploadedAudio.url);
                        audio.onended = () => {
                          setPlayingPreviewId(null);
                          audioPreviewRef.current = null;
                        };
                        audioPreviewRef.current = audio;
                        audio.play();
                        setPlayingPreviewId('custom-upload');
                      }
                    }}
                    className={`ml-1 p-1 rounded-full bg-emerald-500 text-white ${playingPreviewId === 'custom-upload' ? 'animate-pulse' : ''}`}
                  >
                    {playingPreviewId === 'custom-upload' ? <Pause size={10} /> : <Play size={10} />}
                  </div>
                )}
              </button>
              
              {allVoices.slice(0, 3).map(voice => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedAvatarVoice(voice.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 group ${
                    selectedAvatarVoice === voice.id
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                      : 'glass-card border-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedAvatarVoice === voice.id ? 'border-emerald-400 bg-emerald-400' : 'border-white/20'}`}>
                    {selectedAvatarVoice === voice.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-900" />}
                  </div>
                  {voice.name}
                  <div 
                    onClick={(e) => handleVoicePreview(e, voice)}
                    className={`ml-1 p-1 rounded-full transition-all ${playingPreviewId === voice.id ? 'bg-emerald-500 text-white animate-pulse' : 'bg-white/10 text-white/40 hover:bg-white/20 hover:text-white opacity-0 group-hover:opacity-100'}`}
                  >
                    {playingPreviewId === voice.id ? <Pause size={10} /> : <Play size={10} />}
                  </div>
                </button>
              ))}
              <div className="relative">
                <button 
                  onClick={() => setIsVoiceModalOpen(!isVoiceModalOpen)}
                  className={`px-4 py-2 rounded-xl glass-card text-xs font-bold transition-all flex items-center gap-2 border-white/5 ${
                    allVoices.slice(3).some(v => v.id === selectedAvatarVoice)
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                      : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {allVoices.find(v => v.id === selectedAvatarVoice && allVoices.indexOf(v) >= 3)?.name || 'More'} <ChevronDown className={`w-4 h-4 transition-transform ${isVoiceModalOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isVoiceModalOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full left-0 mb-2 w-64 glass-card border-white/10 p-2 z-50 shadow-2xl backdrop-blur-xl max-h-[400px] overflow-y-auto custom-scrollbar"
                    >
                      {/* Gemini Group */}
                      <div className="text-[10px] font-black text-white/30 uppercase tracking-widest px-2 py-1 mt-1 mb-1 border-b border-white/5">Gemini TTS</div>
                      {allVoices.filter(v => v.engine === 'gemini').slice(3).map(voice => (
                        <button
                          key={voice.id}
                          onClick={() => {
                            setSelectedAvatarVoice(voice.id);
                            setIsVoiceModalOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group ${
                            selectedAvatarVoice === voice.id
                              ? 'bg-emerald-500/20 text-white'
                              : 'text-white/60 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                             <span>{voice.name}</span>
                             <span className="text-[8px] opacity-40 font-medium">{voice.gender}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div 
                              onClick={(e) => handleVoicePreview(e, voice)}
                              className={`p-1 rounded-full transition-all ${playingPreviewId === voice.id ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40 hover:bg-white/20 hover:text-white opacity-0 group-hover:opacity-100'}`}
                            >
                              {playingPreviewId === voice.id ? <Pause size={10} /> : <Play size={10} />}
                            </div>
                            {selectedAvatarVoice === voice.id && <Check className="w-3 h-3 text-emerald-400" />}
                          </div>
                        </button>
                      ))}

                      {/* OpenAI Group */}
                      <div className="text-[10px] font-black text-white/30 uppercase tracking-widest px-2 py-1 mt-3 mb-1 border-b border-white/5">OpenAI TTS</div>
                      {allVoices.filter(v => v.engine === 'openai').map(voice => (
                        <button
                          key={voice.id}
                          onClick={() => {
                            setSelectedAvatarVoice(voice.id);
                            setIsVoiceModalOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group ${
                            selectedAvatarVoice === voice.id
                              ? 'bg-emerald-500/20 text-white'
                              : 'text-white/60 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                             <span>{voice.name}</span>
                             <span className="text-[8px] opacity-40 font-medium">{voice.gender}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div 
                              onClick={(e) => handleVoicePreview(e, voice)}
                              className={`p-1 rounded-full transition-all ${playingPreviewId === voice.id ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40 hover:bg-white/20 hover:text-white opacity-0 group-hover:opacity-100'}`}
                            >
                              {playingPreviewId === voice.id ? <Pause size={10} /> : <Play size={10} />}
                            </div>
                            {selectedAvatarVoice === voice.id && <Check className="w-3 h-3 text-emerald-400" />}
                          </div>
                        </button>
                      ))}

                      {/* ElevenLabs Group */}
                      {allVoices.some(v => v.engine === 'elevenlabs') && (
                        <>
                          <div className="text-[10px] font-black text-white/30 uppercase tracking-widest px-2 py-1 mt-3 mb-1 border-b border-white/5">ElevenLabs</div>
                          {allVoices.filter(v => v.engine === 'elevenlabs').map(voice => (
                            <button
                              key={voice.id}
                              onClick={() => {
                                setSelectedAvatarVoice(voice.id);
                                setIsVoiceModalOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group ${
                                selectedAvatarVoice === voice.id
                                  ? 'bg-emerald-500/20 text-white'
                                  : 'text-white/60 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                 <span className="truncate max-w-[100px]">{voice.name}</span>
                                 <span className="text-[8px] opacity-40 font-medium truncate max-w-[40px]">{voice.gender}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div 
                                  onClick={(e) => handleVoicePreview(e, voice)}
                                  className={`p-1 rounded-full transition-all ${playingPreviewId === voice.id ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40 hover:bg-white/20 hover:text-white opacity-0 group-hover:opacity-100'}`}
                                >
                                  {playingPreviewId === voice.id ? <Pause size={10} /> : <Play size={10} />}
                                </div>
                                {selectedAvatarVoice === voice.id && <Check className="w-3 h-3 text-emerald-400" />}
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* 5. STYLE & DELIVERY */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 border border-emerald-500/30">5</div>
              <label className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-widest">Style & Delivery</label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card p-3 flex flex-col gap-1 border-white/5">
                <label className="text-[8px] font-extrabold text-[var(--text-muted)] uppercase flex items-center gap-1"><Smile className="w-2.5 h-2.5" /> Tone</label>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{selectedAvatarTone}</span>
                  <ChevronDown className="w-4 h-4 text-white/30" />
                </div>
              </div>
              <div className="glass-card p-3 flex flex-col gap-1 border-white/5">
                <label className="text-[8px] font-extrabold text-[var(--text-muted)] uppercase flex items-center gap-1"><Camera className="w-2.5 h-2.5" /> Camera Framing</label>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{selectedAvatarFraming}</span>
                  <ChevronDown className="w-4 h-4 text-white/30" />
                </div>
              </div>
              <div className="glass-card p-3 flex flex-col gap-1 border-white/5">
                <label className="text-[8px] font-extrabold text-[var(--text-muted)] uppercase flex items-center gap-1"><RefreshCw className="w-2.5 h-2.5" /> Duration</label>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate">{selectedAvatarDuration.split(' (')[0]}</span>
                  <ChevronDown className="w-4 h-4 text-white/30" />
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleGenerateTalkingAvatar}
            disabled={isGenerating}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isGenerating ? 'Generating...' : 'Generate Talking Avatar'}
          </button>

        </div>

        {/* ══ RIGHT COLUMN: Output & Preview ══ */}
        <div className="h-full overflow-y-auto pr-2 custom-scrollbar pb-20 space-y-6">
          
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[10px] font-extrabold text-white uppercase tracking-widest">Live Preview</span>
              </div>
              <div className="flex gap-2">
                <div className="px-2 py-0.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-bold text-white/60">Preview</div>
                <div className="px-2 py-0.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-bold text-white/60">HD</div>
              </div>
            </div>
            
            <div className="aspect-[9/16] rounded-3xl overflow-hidden glass-card relative group bg-black shadow-2xl">
              <video 
                src="/demo-assets/generated-talking.mp4" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                autoPlay
                loop
                muted
                playsInline
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Live</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
               <label className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-widest px-1">Output & Actions</label>
               <div className="grid grid-cols-3 gap-3">
                 <div className="glass-card p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors cursor-pointer border-white/5">
                   <Download className="w-5 h-5 text-emerald-400" />
                   <div className="text-center">
                     <div className="text-[10px] font-bold text-white">Download</div>
                     <div className="text-[8px] text-[var(--text-muted)]">MP4 • 1080p</div>
                   </div>
                 </div>
                 <div className="glass-card p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors cursor-pointer border-white/5">
                   <RefreshCw className="w-5 h-5 text-purple-400" />
                   <div className="text-center">
                     <div className="text-[10px] font-bold text-white">Regenerate</div>
                     <div className="text-[8px] text-[var(--text-muted)]">New version</div>
                   </div>
                 </div>
                 <div className="glass-card p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors cursor-pointer border-white/5">
                   <Share2 className="w-5 h-5 text-blue-400" />
                   <div className="text-center">
                     <div className="text-[10px] font-bold text-white">Share</div>
                     <div className="text-[8px] text-[var(--text-muted)]">Copy link</div>
                   </div>
                 </div>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-widest px-1">Insights</label>
               <div className="glass-card p-4 space-y-3 border-white/5">
                 {[
                   { label: 'Estimated Engagement', val: 'High', color: 'text-emerald-400' },
                   { label: 'Clarity Score', val: '92%', color: 'text-emerald-400' },
                   { label: 'Audience Fit', val: 'Excellent', color: 'text-emerald-400' }
                 ].map(m => (
                   <div key={m.label} className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-white/60">{m.label}</span>
                     <div className="flex items-center gap-1.5">
                       <span className={`text-[10px] font-black ${m.color}`}>{m.val}</span>
                       <ArrowUpCircle className={`w-3 h-3 ${m.color} rotate-45`} />
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>

        </div>
      </div>
    );
  };
  return (
    <div className="flex-1 bg-[var(--bg-base)] text-white p-4 max-w-[1600px] mx-auto w-full selection:bg-emerald-500/30 flex flex-col overflow-y-auto custom-scrollbar">
      
      {/* ── STUDIO HEADER ── */}
      <header className="mb-6">
        {/* Hero gradient bar */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E1B4B]/80 to-[#0F172A] border border-white/5 p-5 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.12),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.08),transparent_60%)]" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400">Studio</span>
              </h1>
              <p className="text-sm text-[var(--text-tertiary)] font-medium max-w-md">
                Generate stunning images, videos, voices & content — all powered by AI.
              </p>
            </div>

            {/* Active Persona Card */}
            {activePersona.name ? (
              <div className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 backdrop-blur-sm">
                <div className="relative">
                  <img 
                    src={activePersona.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80'} 
                    className="w-10 h-10 rounded-xl object-cover border border-white/10" 
                    alt="" 
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0F172A]" />
                </div>
                <div className="text-left">
                  <p className="text-[8px] font-black text-violet-400 uppercase tracking-[0.2em] leading-none mb-1">Creating as</p>
                  <p className="text-sm font-bold text-white leading-none">{activePersona.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{activePersona.niche || activePersona.platform || 'Digital Creator'}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 border border-violet-500/20 rounded-xl px-4 py-3 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <UserRound size={20} className="text-violet-400" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-violet-400 uppercase tracking-wider leading-none mb-1">No Persona Selected</p>
                  <p className="text-xs text-[var(--text-secondary)]">Create a persona first for identity-consistent results</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step indicator */}
        <div className="hidden md:flex items-center gap-2 mb-5 px-1">
          {[
            { step: 1, label: 'Choose Tool', done: true },
            { step: 2, label: 'Configure', done: false },
            { step: 3, label: 'Generate', done: false },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-[var(--border-subtle)]" />}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                s.done 
                  ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20' 
                  : 'bg-white/[0.03] text-[var(--text-muted)] border border-white/5'
              }`}>
                <span className={`w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-black ${
                  s.done ? 'bg-violet-500 text-white' : 'bg-white/5 text-[var(--text-tertiary)]'
                }`}>{s.step}</span>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* ── MODE SELECTOR (Premium Cards) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-8">
        {MODE_CONFIG.map(m => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <motion.button
              key={m.id}
              onClick={() => { updateMode(m.id); setGlobalError(null); }}
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.97 }}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 group overflow-hidden ${
                isActive
                  ? `bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-violet-500/50 shadow-[0_0_25px_rgba(139,92,246,0.15)]`
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/15'
              }`}
            >
              {/* Gradient glow for active */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 via-transparent to-transparent pointer-events-none" />
              )}
              
              <div className={`relative p-2.5 rounded-xl transition-all duration-300 ${
                isActive 
                  ? `bg-gradient-to-br ${m.gradient} text-white shadow-lg` 
                  : 'bg-white/5 text-[var(--text-muted)] group-hover:bg-white/10 group-hover:text-white'
              }`}>
                <Icon size={20} />
              </div>
              <div className="text-center relative">
                <p className={`text-[10px] font-black leading-tight tracking-wide ${isActive ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-white'}`}>
                  {m.label}
                </p>
                <p className={`text-[8px] mt-0.5 leading-tight transition-all ${
                  isActive ? 'text-violet-300/80 max-h-8 opacity-100' : 'text-transparent max-h-0 opacity-0 group-hover:text-[var(--text-muted)] group-hover:max-h-8 group-hover:opacity-100'
                }`}>
                  {m.desc}
                </p>
              </div>
              {/* Active indicator bar */}
              {isActive && (
                <motion.div 
                  layoutId="activeMode"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-t-full shadow-[0_-4px_12px_rgba(139,92,246,0.6)]" 
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {globalError && (
        <div className="mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-300">{globalError}</p>
        </div>
      )}

      {/* ── MODE RENDERING ── */}
      <div className="flex-1 relative flex flex-col">
        {mode === 'image' && renderImageMode()}
        {mode === 'video' && renderVideoMode()}
        {mode === 'talking-avatar' && renderTalkingAvatarMode()}
        {mode === 'angle' && renderAngleMode()}
        {mode === 'voice' && <VoiceView persona={activePersona} personas={personas} onSelectPersona={onSelectPersona} nav={nav} />}
        {mode === 'ai-tools' && <AIToolsView persona={activePersona} personas={personas} onSelectPersona={onSelectPersona} nav={nav} />}
        {mode === 'planner' && <PlannerView persona={activePersona} personas={personas} onSelectPersona={onSelectPersona} nav={nav} />}
      </div>

      {/* ── FOOTER TIP ── */}
      <footer className="mt-4 border-t border-white/5 pt-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 px-4 py-2 rounded-xl">
           <Layout className="w-4 h-4 text-emerald-400" />
           <p className="text-[10px] text-[var(--text-tertiary)] font-bold">
             <span className="text-white">Tip:</span> Shorter scripts with a clear hook in the first 5 seconds get more engagement.
           </p>
        </div>
        <button className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors text-[10px] font-black uppercase tracking-widest">
           View All Talking Avatar Creations <ChevronRight className="w-4 h-4" />
        </button>
      </footer>

    </div>
  );
}
