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
  Maximize2,
  Pause,
  Volume2,
  Sliders,
  FolderOpen,
  VideoOff,
  FolderHeart,
  ArrowLeft,
} from 'lucide-react';
import { AssetPickerModal } from '../components/AssetPickerModal';
import { Persona, GeneratedImage, NavActions, Tab, NavEntry } from '../types';
import PlannerView from './PlannerView';
import VoiceView from './VoiceView';
import AIToolsView from './AIToolsView';
import WebcamAvatarCreator from '../components/WebcamAvatarCreator';
import VideoSamplePreview from '../components/VideoSamplePreview';
import VideoStitcher from '../components/VideoStitcher';
import QuickStartHub, { type CreationCapabilityId } from '../components/QuickStartHub';
import GuidedCreationWorkspace from '../components/GuidedCreationWorkspace';
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
import { processImageFile } from '../utils/imageProcessing';
import { accountLocalStorage } from '../utils/accountStorage';
import toast from 'react-hot-toast';
import { useRef } from 'react';
import { ProModeToggle, useProMode } from '../utils/useProMode';
import type { CreationBrief, CreationOutcome } from '../types/creation';
import {
  pickDefaultImageModel,
  pickDefaultVideoModelForType,
} from '../../shared/mediaDefaults';

type CreateMode = 'image' | 'video' | 'talking-avatar' | 'voice' | 'stitcher' | 'ai-tools' | 'planner' | 'prompt' | 'transcript' | 'multi-scene';

const IMAGE_OUTCOMES: Array<{ id: CreationOutcome; label: string; detail: string; icon: string }> = [
  { id: 'realistic', label: 'Hyper-realistic', detail: 'Natural, photo-like results', icon: '◉' },
  { id: 'artistic', label: 'Anime / illustrated', detail: 'Stylized creative artwork', icon: '✦' },
  { id: 'fast', label: 'Fast', detail: 'Quick drafts and ideas', icon: '⚡' },
  { id: 'quality', label: 'Maximum quality', detail: 'Best available detail', icon: '◆' },
  { id: 'social', label: 'Social-ready', detail: 'Optimized for posting', icon: '▣' },
  { id: 'identity', label: 'Identity consistency', detail: 'Prioritize face accuracy', icon: '◎' },
  { id: 'adult', label: 'Adult / explicit', detail: 'Where provider policies permit', icon: '18+' },
];

const VIDEO_OUTCOMES: Array<{ id: CreationOutcome; label: string; detail: string; icon: string }> = [
  { id: 'cinematic', label: 'Cinematic', detail: 'Polished motion and framing', icon: '▶' },
  { id: 'quality', label: 'Maximum quality', detail: 'Best available fidelity', icon: '◆' },
  { id: 'fast', label: 'Fast', detail: 'Quick previews and drafts', icon: '⚡' },
  { id: 'social', label: 'Social-ready', detail: 'Short-form platform output', icon: '▣' },
  { id: 'identity', label: 'Identity consistency', detail: 'Preserve the subject', icon: '◎' },
  { id: 'adult', label: 'Adult / explicit', detail: 'Where provider policies permit', icon: '18+' },
];

function chooseModelForOutcome(models: ModelInfo[], outcome: CreationOutcome, fallback: string, video = false) {
  if (models.length === 0) return fallback;
  if (outcome === 'quality') {
    const preferred = video
      ? pickDefaultVideoModelForType(models, 'text-to-video')
      : pickDefaultImageModel(models);
    if (preferred) return preferred.id;
  }
  const terms: Record<CreationOutcome, string[]> = {
    quality: video ? ['seedance', 'veo', 'kling', 'pro', 'quality'] : ['seedream', 'gpt-image', 'nano-banana', 'pro', 'ultra'],
    realistic: ['seedream', 'realistic', 'photo', 'flux', 'gpt-image'],
    artistic: ['anime', 'illustr', 'art', 'qwen', 'flux'],
    fast: ['mini', 'flash', 'turbo', 'schnell', 'fast'],
    social: video ? ['seedance', 'mini', 'short', 'social'] : ['seedream', 'flux', 'social'],
    identity: ['identity', 'consistent', 'face', 'reference', 'pulid', 'i2v'],
    adult: ['nsfw', 'uncensored'],
    cinematic: ['seedance', 'cinematic', 'veo', 'kling', 'wan'],
  };
  const candidates = outcome === 'adult' ? models.filter(model => model.nsfw) : models;
  const scored = candidates
    .map(model => {
      const searchable = `${model.id} ${model.name} ${model.provider || ''} ${model.type || ''}`.toLowerCase();
      let score = terms[outcome].reduce((total, term, index) => total + (searchable.includes(term) ? 20 - index : 0), 0);
      if (outcome === 'identity' && model.isIdentityModel) score += 40;
      if (video && model.id.toLowerCase().includes('seedance')) score += 12;
      return { model, score };
    })
    .sort((a, b) => b.score - a.score);
  return (scored[0]?.score ? scored[0].model.id : candidates[0]?.id) || fallback || models[0].id;
}

function findRequestedModel(models: ModelInfo[], request: string) {
  const normalizedRequest = request.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!normalizedRequest) return undefined;
  const tokens = normalizedRequest.split(' ').filter(token => token.length > 1 || /^\d+$/.test(token));
  return models
    .map(model => {
      const searchable = `${model.id} ${model.name} ${model.provider || ''}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
      const exactScore = searchable.includes(normalizedRequest) ? 100 : 0;
      const tokenScore = tokens.reduce((score, token) => score + (searchable.includes(token) ? 12 : 0), 0);
      return { model, score: exactScore + tokenScore };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.model;
}

interface LipSyncModel {
  id: string;
  name: string;
  provider: string;
  inputType: 'image' | 'video';
  desc: string;
}

const LIPSYNC_MODELS: LipSyncModel[] = [
  { id: 'wavespeed', name: 'Wavespeed LTX Talking Photo', provider: 'Wavespeed', inputType: 'image', desc: 'Generate a talking photo using audio/script' },
  { id: 'wavespeed-ai/multitalk', name: 'InfiniteTalk (Image)', provider: 'Wavespeed', inputType: 'image', desc: 'High-realism photo face animator' },
  { id: 'heygen', name: 'HeyGen AI Studio', provider: 'HeyGen', inputType: 'image', desc: 'Studio-quality photo-to-video avatar animator' },
  { id: 'bytedance/lipsync/audio-to-video', name: 'Sync 1.0 (ByteDance)', provider: 'ByteDance', inputType: 'video', desc: 'High-fidelity video lipsync' },
  { id: 'kwaivgi/kling-lipsync/audio-to-video', name: 'Sync 2.0 (Kling AI)', provider: 'Kling', inputType: 'video', desc: 'Realtime video lipsync' },
  { id: 'wavespeed-ai/infinitetalk/video-to-video', name: 'Sync 3.0 (Wavespeed)', provider: 'Wavespeed', inputType: 'video', desc: 'Temporal video lip synchronization' },
  { id: 'veed', name: 'VEED Lip-Sync 1.0', provider: 'Veed', inputType: 'video', desc: 'Veed style voice matching animation' },
  { id: 'veed2', name: 'VEED Lip-Sync 2.0', provider: 'Veed', inputType: 'video', desc: 'High-fidelity Veed voice-to-video alignment' },
  { id: 'pixverse', name: 'PixVerse Lip-Sync', provider: 'PixVerse', inputType: 'video', desc: 'Pixverse character lipsync editor' },
];

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
  initialBrief?: CreationBrief;
  nav: NavActions;
  billingInfo?: any;
}

const CUSTOM = 'None';
const ENVIRONMENTS = [CUSTOM, 'Luxury Hotel', 'Modern Apartment', 'Rooftop Lounge', 'Beach Resort', 'Yacht Deck', 'Upscale Restaurant', 'Private Gym', 'Beauty Studio', 'City Street', 'Penthouse'];
const OUTFITS = [CUSTOM, 'Casual Chic', 'Luxury Evening', 'Business Professional', 'Fitness Wear', 'Edgy Streetwear', 'Glamorous Gown', 'Home Lounge'];
const FRAMING = [CUSTOM, 'Portrait', 'Selfie Style', 'Full Body', 'Half Body', 'Candid', 'Cinematic'];
const MOODS = [CUSTOM, 'Confident', 'Friendly', 'Thoughtful', 'Playful', 'Professional', 'Seductive'];

const PRESET_EXPANSIONS: Record<string, string> = {
  'Golden Hour': 'warm backlit sunset lighting, soft golden highlights, long shadows',
  'Cyberpunk Neon': 'cyberpunk style, vibrant pink and cyan neon contrast glow, reflections in wet streets, nighttime vibe',
  'Studio Softbox': 'crisp professional keylight, softbox diffuse lighting, clean minimalist studio background',
  'Dramatic Chiaroscuro': 'high-contrast dramatic chiaroscuro lighting, deep shadows, strong side light highlights',
  'Sunset Silhouette': 'low-key sunset silhouette, strong orange rim lighting, dark warm ambient backlight',
  'Moody Overcast': 'moody overcast lighting, diffuse flat ambient light, cool tones, realistic shadows',
  'Vogue Cover': 'high fashion editorial vogue magazine cover style, high-end commercial fashion crop, razor-sharp focus',
  'Retro Polaroid': 'vintage Polaroid style, retro color balance, slightly faded matte shadows, raw flash photography look',
  'Cinematic Anamorphic': 'cinematic anamorphic lens flare, shallow depth of field, high-end widescreen bokeh details, 8k resolution',
  'Film Grain 35mm': 'authentic 35mm film grain texture, analog style color grading, kodak portra 400 aesthetic, realistic film look',
  'GoPro Action': 'GoPro action camera style, ultra wide-angle field of view, dynamic fish-eye perspective, immersive perspective',
  'Aerial Drone': 'high-altitude aerial drone shot, dramatic bird-eye perspective, sweeping composition',
  'Luxury Glamour': 'luxury glamour style, premium high-status details, upscale fashion elements, wealth aesthetic',
  'Athletic Dynamic': 'dynamic action sports photography, high-speed shutter, sweat skin highlights, athletic energy, motion freeze',
  'Cozy Casual': 'relaxed cozy casual style, soft morning bedroom light, warm coffee cup details, comfortable lounge aesthetic',
  'Cybernetic/Sci-Fi': 'futuristic cybernetic details, subtle holographic overlays, advanced tech implants, high-tech glow'
};

const PRESET_CATEGORIES = [
  {
    name: 'Lighting & Vibe',
    presets: ['Golden Hour', 'Cyberpunk Neon', 'Studio Softbox', 'Dramatic Chiaroscuro', 'Sunset Silhouette', 'Moody Overcast']
  },
  {
    name: 'Photography & Camera',
    presets: ['Vogue Cover', 'Retro Polaroid', 'Cinematic Anamorphic', 'Film Grain 35mm', 'GoPro Action', 'Aerial Drone']
  },
  {
    name: 'Aesthetic Niche',
    presets: ['Luxury Glamour', 'Athletic Dynamic', 'Cozy Casual', 'Cybernetic/Sci-Fi']
  }
];

type CreateModeConfig = { id: CreateMode; label: string; icon: any; gradient: string; ringClass: string; desc: string; bgImage: string }[];

const MODE_CONFIG: CreateModeConfig = [
  { id: 'image', label: 'Generate Images', icon: ImageIcon, gradient: 'from-amber-500 to-yellow-600', ringClass: 'focus:ring-amber-400', desc: 'Create persona-consistent images', bgImage: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=300&q=80' },
  { id: 'video', label: 'Generate Videos', icon: Video, gradient: 'from-pink-600 to-orange-500', ringClass: 'focus:ring-pink-500', desc: 'Turn images into video scenes', bgImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=300&q=80' },
  { id: 'talking-avatar', label: 'Talking Avatar', icon: UserRound, gradient: 'from-emerald-600 to-teal-500', ringClass: 'focus:ring-emerald-500', desc: 'Speaking avatar with voice', bgImage: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=300&q=80' },
  { id: 'voice', label: 'Voice', icon: Mic, gradient: 'from-amber-500 to-orange-500', ringClass: 'focus:ring-amber-500', desc: 'Generate audio and clone voice', bgImage: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=300&q=80' },
];

const QUICK_STYLES = [
  { id: 'beach-day',    label: 'Beach Day',     emoji: '🏖️', env: 'Beach Resort',      outfit: 'Fitness Wear',         framing: 'Full Body',   mood: 'Playful',      gradient: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/20', glow: 'hover:shadow-amber-500/10' },
  { id: 'night-out',   label: 'Night Out',      emoji: '🌙', env: 'Upscale Restaurant', outfit: 'Luxury Evening',       framing: 'Portrait',    mood: 'Seductive',    gradient: 'from-amber-500/20 to-yellow-500/10', border: 'border-amber-500/20', glow: 'hover:shadow-amber-500/10' },
  { id: 'power-look',  label: 'Power Look',     emoji: '💼', env: 'Modern Apartment',   outfit: 'Business Professional',framing: 'Half Body',   mood: 'Confident',    gradient: 'from-slate-500/20 to-zinc-500/10', border: 'border-slate-400/20', glow: 'hover:shadow-slate-400/10' },
  { id: 'gym-session', label: 'Gym Session',    emoji: '💪', env: 'Private Gym',        outfit: 'Fitness Wear',         framing: 'Full Body',   mood: 'Confident',    gradient: 'from-red-500/20 to-rose-500/10', border: 'border-red-500/20', glow: 'hover:shadow-red-500/10' },
  { id: 'luxury-vibes',label: 'Luxury Vibes',   emoji: '✨', env: 'Penthouse',           outfit: 'Glamorous Gown',       framing: 'Full Body',   mood: 'Professional', gradient: 'from-yellow-500/20 to-amber-500/10', border: 'border-yellow-500/20', glow: 'hover:shadow-yellow-500/10' },
  { id: 'street-style',label: 'Street Style',   emoji: '🛹', env: 'City Street',         outfit: 'Edgy Streetwear',      framing: 'Candid',      mood: 'Playful',      gradient: 'from-cyan-500/20 to-teal-500/10', border: 'border-cyan-500/20', glow: 'hover:shadow-cyan-500/10' },
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

const VIDEO_ASPECT_RATIO_OPTIONS = [
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '9:16', label: 'Vertical / short-form (9:16)' },
  { value: '1:1', label: 'Square (1:1)' },
  { value: '4:3', label: 'Standard (4:3)' },
  { value: '2:3', label: 'Tall (2:3)' },
];

const AVATAR_FORMAT_OPTIONS = [
  { value: 'Medium Shot', label: 'Medium shot' },
  { value: 'Close Up', label: 'Close-up' },
  { value: 'Full Body', label: 'Full body' },
];

const RESOLUTION_OPTIONS: Record<string, { value: 'standard' | 'hd'; label: string }[]> = {
  venice:    [{ value: 'standard', label: 'Standard (~1024px)' }, { value: 'hd', label: 'HD (~1536px)' }],
  wavespeed: [{ value: 'standard', label: 'Standard' }],
  google:    [{ value: 'standard', label: 'Standard' }],
  openai:    [{ value: 'standard', label: 'Standard' }],
  default:   [{ value: 'standard', label: 'Standard' }, { value: 'hd', label: 'HD' }],
};

export default function CreateView({ persona, personas, setPersonas, onSelectPersona, subView, initialBrief, nav, billingInfo }: CreateViewProps) {
  const [isPro, setIsPro] = useProMode();
  const initialPersona = persona && persona.id !== 'empty' ? persona : null;
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const appliedBriefRef = useRef<string | null>(null);
  const appliedModelBriefRef = useRef<string | null>(null);


  const [localPersonaId, setLocalPersonaId] = useState<string>(initialPersona?.id || 'none');
  const [naturalLook, setNaturalLook] = useState(initialPersona?.naturalLook ?? true);
  const [identityLock, setIdentityLock] = useState(initialPersona?.identityLock ?? true);

  const activePersona = useMemo(() => {
    if (localPersonaId === 'none') return ANONYMOUS_PERSONA;
    return personas.find(p => p.id === localPersonaId) || initialPersona || ANONYMOUS_PERSONA;
  }, [localPersonaId, personas, initialPersona]);

  useEffect(() => {
    if (initialPersona) {
      setLocalPersonaId(initialPersona.id);
    } else {
      setLocalPersonaId('none');
    }
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
  const [simpleDetailsOpen, setSimpleDetailsOpen] = useState(false);

  useEffect(() => {
    if (subView && subView !== mode) {
      setMode(subView as CreateMode);
    }
  }, [subView]);

  useEffect(() => {
    setSimpleDetailsOpen(false);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'image') return;
    const interval = setInterval(() => {
      setActiveSlideIndex(prev => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(interval);
  }, [mode]);

  const [activeVideoSlideIndex, setActiveVideoSlideIndex] = useState(0);
  useEffect(() => {
    if (mode !== 'video') return;
    const interval = setInterval(() => {
      setActiveVideoSlideIndex(prev => (prev + 1) % 4);
    }, 5500);
    return () => clearInterval(interval);
  }, [mode]);

  // Asset Picker Modal State for CreateView
  const [isCreateAssetPickerOpen, setIsCreateAssetPickerOpen] = useState(false);
  const [createAssetPickerCallback, setCreateAssetPickerCallback] = useState<((url: string) => void) | null>(null);
  const [createAssetPickerTitle, setCreateAssetPickerTitle] = useState('Select from Saved Asset Library');

  const openCreateAssetPicker = (onSelect: (url: string) => void, title = 'Select from Saved Asset Library') => {
    setCreateAssetPickerCallback(() => onSelect);
    setCreateAssetPickerTitle(title);
    setIsCreateAssetPickerOpen(true);
  };

  const updateMode = (newMode: CreateMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    nav.push({ view: 'create', subView: newMode });
  };

  const [imagePrompt, setImagePrompt] = useState(() => {
    try { return accountLocalStorage.getItem('ai_influencer_draft_prompt') || ''; } catch { return ''; }
  });
  const [activePresetChips, setActivePresetChips] = useState<string[]>([]);
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

  // Enlarged Fullscreen Lightbox State
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [lightboxVideoUrl, setLightboxVideoUrl] = useState<string | null>(null);
  const [lightboxZoomMode, setLightboxZoomMode] = useState<'fit' | 'fill' | 'zoom'>('fit');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImageUrl(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [refPersonaId, setRefPersonaId] = useState<string>('none');
  const [refImages, setRefImages] = useState<{ id: string; url: string; name: string }[]>([]);

  const [videoPrompt, setVideoPrompt] = useState(() => {
    try { return accountLocalStorage.getItem('ai_influencer_draft_video_prompt') || ''; } catch { return ''; }
  });
  const [videoResult, setVideoResult] = useState<{ videoUrl: string; model: string } | null>(null);
  const [isExtending, setIsExtending] = useState(false);
  const [extendResult, setExtendResult] = useState<{ videoUrl: string; model: string } | null>(null);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [videoSourcePersonaId, setVideoSourcePersonaId] = useState<string>('none');
  const [videoSourceImage, setVideoSourceImage] = useState<string | null>(null);
  const [videoSourceImageName, setVideoSourceImageName] = useState<string | null>(null);
  const [videoSourceVideo, setVideoSourceVideo] = useState<string | null>(null);
  const [videoSourceVideoName, setVideoSourceVideoName] = useState<string | null>(null);
  const [generateAudioToggle, setGenerateAudioToggle] = useState(false);
  const [videoUploadMenuOpen, setVideoUploadMenuOpen] = useState(false);

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
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [editModels, setEditModels] = useState<ModelInfo[]>([]);
  const [upscaleModels, setUpscaleModels] = useState<ModelInfo[]>([]);
  const [videoModels, setVideoModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedVideoModel, setSelectedVideoModel] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState<CreationOutcome>('quality');
  const [videoSubMode, setVideoSubMode] = useState<'generate' | 'edit' | 'extend'>('generate');

  useEffect(() => {
    if (!videoSubMode || videoModels.length === 0) return;
    if (!isPro && selectedOutcome !== 'quality') {
      setSelectedVideoModel(current => chooseModelForOutcome(videoModels, selectedOutcome, current, true));
      return;
    }
    const sourceType = videoSubMode === 'edit'
      ? 'video-to-video'
      : videoSubMode === 'extend' || Boolean(videoSourceImage) || videoSourcePersonaId !== 'none'
        ? 'image-to-video'
        : 'text-to-video';
    const preferred = pickDefaultVideoModelForType(videoModels, sourceType);
    setSelectedVideoModel(preferred?.id || '');
  }, [isPro, selectedOutcome, videoSubMode, videoModels, videoSourceImage, videoSourcePersonaId]);

  const [selectedVideoAspectRatio, setSelectedVideoAspectRatio] = useState('16:9');
  const [selectedVideoDuration, setSelectedVideoDuration] = useState(5);
  const [selectedVideoResolution, setSelectedVideoResolution] = useState('720p');
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
  const [styleOptionsOpen, setStyleOptionsOpen] = useState(false);
  const [personaPickerOpen, setPersonaPickerOpen] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1');
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [modelCategoryFilter, setModelCategoryFilter] = useState<'all' | 'wiro' | 'runware' | 'featured' | 'flux' | 'google' | 'wavespeed' | 'uncensored'>('all');

  const [selectedLoras, setSelectedLoras] = useState<Array<{ model: string; weight: number; name?: string }>>([]);
  const [loraPanelOpen, setLoraPanelOpen] = useState(false);
  const [customLoraInput, setCustomLoraInput] = useState('');
  const [customLoraWeight, setCustomLoraWeight] = useState(0.85);

  const POPULAR_LORAS = useMemo(() => [
    { id: 'curn:civitai:640243@716183', name: 'Photorealism & Skin Detailer', defaultWeight: 0.85, tag: 'Realistic' },
    { id: 'curn:civitai:381781@426077', name: 'Cinematic 8K Movie Lighting', defaultWeight: 0.75, tag: 'Cinema' },
    { id: 'curn:civitai:612739@684947', name: 'High Fashion & Runway Editorial', defaultWeight: 0.8, tag: 'Fashion' },
    { id: 'curn:civitai:628330@702737', name: '35mm Vintage Film & Grain', defaultWeight: 0.7, tag: 'Vintage' },
    { id: 'curn:civitai:636270@711680', name: 'Anime & Manga Style Master', defaultWeight: 0.9, tag: 'Anime' },
  ], []);

  const filteredModels = useMemo(() => {
    return models.filter(m => {
      const q = modelSearchQuery.toLowerCase();
      const matchesSearch = !q || m.name.toLowerCase().includes(q) || (m.provider && m.provider.toLowerCase().includes(q)) || (m.description && m.description.toLowerCase().includes(q));
      
      if (!matchesSearch) return false;
      if (modelCategoryFilter === 'all') return true;
      if (modelCategoryFilter === 'wiro') return m.id.toLowerCase().includes('wiro') || m.provider?.toLowerCase().includes('wiro');
      if (modelCategoryFilter === 'runware') return m.id.toLowerCase().includes('runware') || m.provider?.toLowerCase().includes('runware');
      if (modelCategoryFilter === 'featured') return m.id.includes('featured') || m.id.includes('imagen-4') || m.id.includes('flux') || m.id.includes('wavespeed') || m.id.includes('runware:100@1') || m.id.includes('wiro:bytedance');
      if (modelCategoryFilter === 'flux') return m.id.toLowerCase().includes('flux') || m.id.toLowerCase().includes('recraft');
      if (modelCategoryFilter === 'google') return m.id.toLowerCase().includes('google') || m.id.toLowerCase().includes('openai') || m.id.toLowerCase().includes('dall-e');
      if (modelCategoryFilter === 'wavespeed') return m.id.toLowerCase().includes('wavespeed') || m.provider?.toLowerCase().includes('wavespeed');
      if (modelCategoryFilter === 'uncensored') return Boolean(m.nsfw);
      return true;
    });
  }, [models, modelSearchQuery, modelCategoryFilter]);
  const [selectedResolution, setSelectedResolution] = useState<string>('1k');
  const audioUploadRef = useRef<HTMLInputElement | null>(null);
  const videoImageLibraryInputRef = useRef<HTMLInputElement | null>(null);
  const videoImageFilesInputRef = useRef<HTMLInputElement | null>(null);
  const videoVideoLibraryInputRef = useRef<HTMLInputElement | null>(null);
  const videoVideoFilesInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<{ url: string; name: string } | null>(null);
  const [generatedFeed, setGeneratedFeed] = useState<GeneratedEntry[]>(() => {
    try {
      const saved = accountLocalStorage.getItem('ai_influencer_feed_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [focusedEntryId, setFocusedEntryId] = useState<string | null>(null);
  const [excludePersonaRef, setExcludePersonaRef] = useState(false);
  const [enhancingField, setEnhancingField] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (imagePrompt) accountLocalStorage.setItem('ai_influencer_draft_prompt', imagePrompt);
    } catch (e) {}
  }, [imagePrompt]);

  useEffect(() => {
    try {
      if (videoPrompt) accountLocalStorage.setItem('ai_influencer_draft_video_prompt', videoPrompt);
    } catch (e) {}
  }, [videoPrompt]);

  useEffect(() => {
    try {
      if (generatedFeed.length > 0) {
        accountLocalStorage.setItem('ai_influencer_feed_history', JSON.stringify(generatedFeed.slice(0, 60)));
      }
    } catch (e) {}
  }, [generatedFeed]);

  useEffect(() => {
    if (generatedFeed.length > 0 && !imageResult) {
      const latest = generatedFeed[0];
      setImageResult({ imageUrl: latest.imageUrl, model: latest.model, promptUsed: latest.promptUsed });
      setImageHistory([{ imageUrl: latest.imageUrl, model: latest.model, promptUsed: latest.promptUsed, label: latest.label || 'Generated' }]);
      setActiveHistoryIndex(0);
      setFocusedEntryId(latest.id);
    }
  }, [generatedFeed]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        try {
          const savedFeed = accountLocalStorage.getItem('ai_influencer_feed_history');
          if (savedFeed) {
            const parsed: GeneratedEntry[] = JSON.parse(savedFeed);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setGeneratedFeed(parsed);
            }
          }
        } catch (e) {}
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  // Talking Avatar specific state
  const [avatarScript, setAvatarScript] = useState('Hey everyone! Welcome back to my channel. In today\'s video, I\'m sharing my top 5 productivity tips that have completely transformed my daily routine. Let\'s dive in!');
  const [selectedAvatarVoice, setSelectedAvatarVoice] = useState(TTS_VOICES[3].id); // Kore default
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [allVoices, setAllVoices] = useState<TTSVoice[]>(TTS_VOICES);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);

  // Talking Avatar Engine/Quality states
  const [talkingAvatarEngine, setTalkingAvatarEngine] = useState<'wavespeed' | 'infinitetalk' | 'longcat' | 'heygen'>(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('ai_studio_prefs') || '{}');
      return prefs.heygenApiKey ? 'heygen' : 'wavespeed';
    } catch {
      return 'wavespeed';
    }
  });
  const [talkingHeygenEngine, setTalkingHeygenEngine] = useState<'avatar_iv' | 'avatar_v'>('avatar_v');

  // Avatar reference image upload state
  const [uploadedAvatarImage, setUploadedAvatarImage] = useState<string | null>(null);
  const [uploadedAvatarImageName, setUploadedAvatarImageName] = useState<string | null>(null);
  const avatarImageUploadRef = useRef<HTMLInputElement | null>(null);

  // Separate result state for talking avatar to keep it independent of standard video tab
  const [talkingAvatarResult, setTalkingAvatarResult] = useState<{ videoUrl: string; model: string } | null>(null);
  const [isWebcamCreatorOpen, setIsWebcamCreatorOpen] = useState(false);
  const handleWebcamCreatorComplete = async (avatarId: string, voiceId?: string, portraitBase64?: string) => {
    if (portraitBase64) {
      setUploadedAvatarImage(portraitBase64);
      setUploadedAvatarImageName('webcam_capture.jpg');
      setSelectedAvatarSource(portraitBase64);
    }
    const updated = {
      ...activePersona,
      heygenAvatarId: avatarId,
      avatar: portraitBase64 || activePersona.avatar,
      referenceImage: portraitBase64 || activePersona.referenceImage,
      ...(voiceId ? { voiceId, voiceEngine: 'elevenlabs' } : {}),
    };
    try {
      await api.updatePersonaInVault(updated as any);
      onSelectPersona(activePersona.id);
      toast.success('Webcam avatar linked to persona!');
    } catch (err) {
      console.error('Failed to link avatar:', err);
      toast.error('Failed to save avatar to database.');
    }
  };

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
    
    const activeModelConfig = LIPSYNC_MODELS.find(m => m.id === selectedLipSyncModel);
    const isVideoInput = activeModelConfig?.inputType === 'video';

    let portraitImage = '';
    let videoReference = '';

    if (isVideoInput) {
      videoReference = selectedAvatarVideoSource || '';
      if (!videoReference) {
        toast.error('Please upload a reference video first.');
        return;
      }
    } else {
      portraitImage = selectedAvatarSource || activePersona.avatar || '';
      if (!portraitImage && !(activePersona as any).heygenAvatarId && selectedLipSyncModel === 'heygen') {
        toast.error('Please select a portrait or record a webcam avatar first.');
        return;
      }
      if (!portraitImage && selectedLipSyncModel !== 'heygen') {
        toast.error('Please select or upload a portrait image first.');
        return;
      }
    }

    setIsGenerating(true);
    setGlobalError(null);
    
    const t = toast.loading('Initializing Talking Avatar pipeline...');
    try {
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

      // Load client-stored HeyGen API key if applicable
      let heygenApiKey: string | undefined = undefined;
      try {
        const prefs = JSON.parse(localStorage.getItem('ai_studio_prefs') || '{}');
        heygenApiKey = prefs.heygenApiKey || undefined;
      } catch (err) {
        console.error('Failed to load HeyGen key from local storage:', err);
      }

      toast.loading('Animating avatar face (this may take a minute)...', { id: t });
      const result = await generateTalkingHead({
        portraitImage: isVideoInput ? undefined : ((activePersona as any).heygenAvatarId && selectedLipSyncModel === 'heygen' ? undefined : portraitImage),
        video: isVideoInput ? videoReference : undefined,
        model: selectedLipSyncModel,
        audioUrl,
        script: avatarScript,
        voiceName: selectedAvatarVoice,
        engine: selectedLipSyncModel === 'heygen' ? 'heygen' : 'wavespeed',
        heygenEngine: talkingHeygenEngine,
        heygenApiKey,
        heygenAvatarId: selectedLipSyncModel === 'heygen' ? ((activePersona as any).heygenAvatarId || undefined) : undefined,
      });

      toast.success('Talking Avatar ready!', { id: t });
      if (result.videoUrl) {
        setTalkingAvatarResult({ videoUrl: result.videoUrl, model: result.model });
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Generation failed', { id: t });
      setGlobalError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };
  const [selectedAvatarSource, setSelectedAvatarSource] = useState('');
  const [selectedLipSyncModel, setSelectedLipSyncModel] = useState<string>('wavespeed');
  const [uploadedAvatarVideo, setUploadedAvatarVideo] = useState<string | null>(null);
  const [uploadedAvatarVideoName, setUploadedAvatarVideoName] = useState<string | null>(null);
  const [selectedAvatarVideoSource, setSelectedAvatarVideoSource] = useState<string>('');
  const avatarVideoUploadRef = useRef<HTMLInputElement | null>(null);
  const [selectedAvatarTone, setSelectedAvatarTone] = useState('Professional');
  const [selectedAvatarFraming, setSelectedAvatarFraming] = useState('Medium Shot');
  const [selectedAvatarDuration, setSelectedAvatarDuration] = useState('30s (approx)');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarResult, setAvatarResult] = useState<{ url: string; thumbnail: string } | null>(null);

  const availableImages = useMemo(() => {
    const images: string[] = [];
    if (uploadedAvatarImage) images.push(uploadedAvatarImage);
    if (activePersona.avatar) images.push(activePersona.avatar);
    if (activePersona.referenceImage) images.push(activePersona.referenceImage);
    
    if (activePersona.visualLibrary && Array.isArray(activePersona.visualLibrary)) {
      activePersona.visualLibrary.forEach(img => {
        if (img && typeof img === 'string' && !images.includes(img)) {
          images.push(img);
        }
      });
    }
    
    return Array.from(new Set(images)).filter(Boolean);
  }, [uploadedAvatarImage, activePersona.avatar, activePersona.referenceImage, activePersona.visualLibrary]);

  useEffect(() => {
    if (availableImages.length > 0) {
      setSelectedAvatarSource(availableImages[0]);
    } else {
      setSelectedAvatarSource('');
    }
  }, [activePersona.id, availableImages]);

  useEffect(() => {
    if (!initialBrief) return;
    const briefKey = JSON.stringify(initialBrief);
    if (appliedBriefRef.current === briefKey) return;
    appliedBriefRef.current = briefKey;

    if (initialBrief.outcome) setSelectedOutcome(initialBrief.outcome);
    if (initialBrief.aspectRatio) {
      if (initialBrief.kind === 'video') setSelectedVideoAspectRatio(initialBrief.aspectRatio);
      else setSelectedAspectRatio(initialBrief.aspectRatio);
    }
    if (initialBrief.kind === 'video') setVideoPrompt(initialBrief.prompt);
    else if (initialBrief.kind === 'talking-avatar') setAvatarScript(initialBrief.prompt);
    else setImagePrompt(initialBrief.prompt);
    setSimpleDetailsOpen(false);
  }, [initialBrief]);

  const refPersonaImage = refPersonaId !== 'none' ? (personas.find(p => p.id === refPersonaId)?.referenceImage ?? null) : null;
  const allRefImages: string[] = Array.from(new Set([
    ...(uploadedAvatarImage ? [uploadedAvatarImage] : []),
    ...(!excludePersonaRef && refPersonaImage ? [refPersonaImage] : []),
    ...refImages.map(img => img.url),
  ])).filter(Boolean);
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
        const preferred = pickDefaultImageModel(m);
        if (preferred) setSelectedModel(preferred.id);
        if (em.length > 0) setSelectedEditModel(em[0].id);
        if (um.length > 0) setSelectedUpscaleModel(um[0].id);
        const preferredVideo = pickDefaultVideoModelForType(vm, 'text-to-video');
        if (preferredVideo) setSelectedVideoModel(preferredVideo.id);
        setGlobalError(null);
      })
      .catch(() => {
        // Suppress transient API error if models are available
      })
      .finally(() => setModelsLoading(false));
  }, []);

  useEffect(() => {
    if (isPro) return;
    if (mode === 'image' && models.length > 0) {
      setSelectedModel(current => chooseModelForOutcome(models, selectedOutcome, current));
    }
    if (mode === 'video' && videoModels.length > 0) {
      setSelectedVideoModel(current => chooseModelForOutcome(videoModels, selectedOutcome, current, true));
    }
  }, [isPro, mode, models, selectedOutcome, videoModels]);

  useEffect(() => {
    if (!isPro || !initialBrief?.requestedModel) return;
    const briefKey = `${initialBrief.kind}:${initialBrief.requestedModel}`;
    if (appliedModelBriefRef.current === briefKey) return;
    const availableModels = initialBrief.kind === 'video' ? videoModels : models;
    if (availableModels.length === 0) return;
    const match = findRequestedModel(availableModels, initialBrief.requestedModel);
    appliedModelBriefRef.current = briefKey;
    if (!match) {
      toast(`Model “${initialBrief.requestedModel}” was not found. Your current default is selected.`);
      return;
    }
    if (initialBrief.kind === 'video') setSelectedVideoModel(match.id);
    else setSelectedModel(match.id);
    toast.success(`Using ${match.name}`);
  }, [initialBrief, isPro, models, videoModels]);

  useEffect(() => {
    if (!selectedVideoModel) return;
    const selectedVideoInfo = videoModels.find(m => m.id === selectedVideoModel);
    if (!selectedVideoInfo) return;

    const isGoogle = selectedVideoInfo.provider?.toLowerCase().includes('google') || false;
    
    if (isGoogle) {
      if (!['16:9', '9:16', '1:1'].includes(selectedVideoAspectRatio)) {
        setSelectedVideoAspectRatio('16:9');
      }
      if (!['720p', '1080p'].includes(selectedVideoResolution)) {
        setSelectedVideoResolution('720p');
      }
    } else {
      if (!['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'].includes(selectedVideoAspectRatio)) {
        setSelectedVideoAspectRatio('16:9');
      }
      if (!['480p', '720p', '1080p', '4k'].includes(selectedVideoResolution)) {
        setSelectedVideoResolution('720p');
      }
    }
  }, [selectedVideoModel, videoModels]);

  const sortedModels = useMemo(() => {
    function getModelTopPriority(m: { id: string; name: string }): number {
      const id = (m.id || '').toLowerCase();
      const name = (m.name || '').toLowerCase();

      // 1. SeeDream 5.0 Pro (TOP DEFAULT)
      if (id.includes('seedream-v5') || name.includes('seedream 5.0 pro') || name.includes('seedream 5') || id.includes('seedream')) return 1;

      // 2. Qwen 3.0 Pro
      if (id.includes('qwen-3.0-pro') || id.includes('qwen-3-pro') || name.includes('qwen 3.0 pro') || name.includes('qwen 3')) return 2;

      // 3. GPT Image 2 / Nano Banana Pro
      if (id.includes('gpt-image') || name.includes('gpt image 2') || name.includes('gpt 2') || id.includes('nano-banana-pro') || name.includes('nano banana pro')) return 3;

      // 4. Wan 3.0 Pro / Wan 7 Pro
      if (id.includes('wan-3.0') || name.includes('wan 3.0') || id.includes('wan-2.7-pro') || id.includes('wan-7-pro') || name.includes('wan 7 pro') || name.includes('wan 2.7 pro') || id.includes('wan-2.1') || name.includes('wan')) return 4;

      // 5. Qwen 2 Pro
      if (id.includes('qwen-2.0-pro') || id.includes('qwen-2-pro') || name.includes('qwen 2 pro') || id.includes('qwen-image')) return 5;

      return 100;
    }
    return [...models].sort((a, b) => getModelTopPriority(a) - getModelTopPriority(b) || a.name.localeCompare(b.name));
  }, [models]);

  const groupedModels = useMemo(() => {
    function getModelTopPriority(m: { id: string; name: string }): number {
      const id = (m.id || '').toLowerCase();
      const name = (m.name || '').toLowerCase();

      if (id.includes('seedream-v5') || name.includes('seedream 5.0 pro') || name.includes('seedream 5') || id.includes('seedream')) return 1;
      if (id.includes('qwen-3.0-pro') || id.includes('qwen-3-pro') || name.includes('qwen 3.0 pro') || name.includes('qwen 3')) return 2;
      if (id.includes('gpt-image') || name.includes('gpt image 2') || name.includes('gpt 2') || id.includes('nano-banana-pro') || name.includes('nano banana pro')) return 3;
      if (id.includes('wan-3.0') || name.includes('wan 3.0') || id.includes('wan-2.7-pro') || id.includes('wan-7-pro') || name.includes('wan 7 pro') || name.includes('wan 2.7 pro') || id.includes('wan-2.1') || name.includes('wan')) return 4;
      if (id.includes('qwen-2.0-pro') || id.includes('qwen-2-pro') || name.includes('qwen 2 pro') || id.includes('qwen-image')) return 5;

      return 100;
    }

    const featured: ModelInfo[] = [];
    const rest: ModelInfo[] = [];

    sortedModels.forEach(m => {
      if (getModelTopPriority(m) <= 5) {
        featured.push(m);
      } else {
        rest.push(m);
      }
    });

    featured.sort((a, b) => getModelTopPriority(a) - getModelTopPriority(b));

    const groups: Record<string, ModelInfo[]> = { '🔥 Featured Models': featured };
    rest.forEach(m => {
      const g = m.provider || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(m);
    });

    return groups;
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
    const v2v: Record<string, ModelInfo[]> = {};
    videoModels.forEach(m => {
      const typeStr = (m.type || '').toLowerCase();
      const idStr = (m.id || '').toLowerCase();
      const isV2V = typeStr === 'video-to-video' || idStr.includes('v2v') || idStr.includes('edit') || idStr.includes('seedance') || idStr.includes('wan') || idStr.includes('qwen') || idStr.includes('veo-omni');
      const isI2V = typeStr === 'image-to-video' || idStr.includes('i2v');
      const target = isV2V ? v2v : (isI2V ? i2v : t2v);
      if (!target[m.provider]) target[m.provider] = [];
      target[m.provider].push(m);
    });
    return { t2v, i2v, v2v };
  }, [videoModels]);

  const selectedModelInfo = useMemo(() => models.find(m => m.id === selectedModel), [models, selectedModel]);

  const resolutionOpts = useMemo(() => {
    const opts = [{ value: '1k', label: '1K Resolution' }];
    if (!selectedModel) return opts;
    const mid = selectedModel.toLowerCase();
    if (mid.includes('venice') || mid.includes('flux') || mid.includes('ultra') || mid.includes('dev') || mid.includes('pro')) {
      opts.push({ value: '2k', label: '2K Resolution' });
    }
    if (mid.includes('venice') || mid.includes('ultra') || mid.includes('dev')) {
      opts.push({ value: '4k', label: '4K Resolution' });
    }
    return opts;
  }, [selectedModel]);

  useEffect(() => {
    if (!resolutionOpts.some(o => o.value === selectedResolution)) {
      setSelectedResolution('1k');
    }
  }, [selectedModel, resolutionOpts, selectedResolution]);
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
      const allRefs = Array.from(new Set([
        ...(uploadedAvatarImage ? [uploadedAvatarImage] : []),
        ...allRefImages,
        ...(activePersona.referenceImage ? [activePersona.referenceImage] : [])
      ])).filter(Boolean);
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
        additionalInstructions: [imagePrompt.trim(), activePresetChips.map(c => PRESET_EXPANSIONS[c]).filter(Boolean).join(', ')].filter(Boolean).join(', '),
        additionalImages: extraRefs.length > 0 ? extraRefs : undefined,
        naturalLook,
        identityLock,
        count: imageCount,
        aspectRatio: selectedAspectRatio,
        resolution: selectedResolution,
        lora: selectedLoras.length > 0 ? selectedLoras.map(l => ({ model: l.model, weight: l.weight })) : undefined,
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

        try {
          const raw = accountLocalStorage.getItem('ai_influencer_gallery');
          const gallery = raw ? JSON.parse(raw) : [];
          result.forEach((r, i) => {
            gallery.unshift({
              id: `img-${now}-${i}`,
              url: r.imageUrl,
              prompt: r.promptUsed || imagePrompt || '',
              timestamp: now,
              model: r.model || selectedModel,
              mediaType: 'image'
            });
          });
          accountLocalStorage.setItem('ai_influencer_gallery', JSON.stringify(gallery.slice(0, 100)));
        } catch (e) {}
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

        try {
          const raw = accountLocalStorage.getItem('ai_influencer_gallery');
          const gallery = raw ? JSON.parse(raw) : [];
          gallery.unshift({
            id: `img-${now}-0`,
            url: result.imageUrl,
            prompt: result.promptUsed || imagePrompt || '',
            timestamp: now,
            model: result.model || selectedModel,
            mediaType: 'image'
          });
          accountLocalStorage.setItem('ai_influencer_gallery', JSON.stringify(gallery.slice(0, 100)));
        } catch (e) {}
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

    const isI2V = selectedVideoModel.includes('i2v');
    const isV2V = selectedVideoModel.toLowerCase().includes('v2v') || selectedVideoModel.toLowerCase().includes('video-to-video') || selectedVideoModel.toLowerCase().includes('edit') || selectedVideoModel.toLowerCase().includes('pulid') || selectedVideoModel.toLowerCase().includes('consist') || selectedVideoModel.toLowerCase().includes('seedance') || selectedVideoModel.toLowerCase().includes('wan') || selectedVideoModel.toLowerCase().includes('qwen') || selectedVideoModel.toLowerCase().includes('veo-omni');

    try {
      const effectiveRef = videoSourceVideo || videoSourceImage || (videoSourcePersonaId !== 'none' ? personas.find(p => p.id === videoSourcePersonaId)?.referenceImage : null);
      const sourceImg = effectiveVideoSourceImage || videoSourceImage || effectiveRef || undefined;
      const sourceVid = videoSourceVideo || (effectiveRef?.startsWith('blob:') || effectiveRef?.startsWith('data:video') ? effectiveRef : undefined) || sourceImg;
      
      if (isI2V && !sourceImg && !effectiveRef) {
        throw new Error('Image-to-video models require a source image. Select a persona or upload an image.');
      }
      if (isV2V && !sourceVid && !sourceImg && !effectiveRef) {
        throw new Error('Video-to-video/editing models require an uploaded source reference.');
      }
      
      const selectedVideoInfo = videoModels.find(m => m.id === selectedVideoModel);
      const supportsAspectRatio = selectedVideoInfo?.supportedProperties?.some(p => ['aspect_ratio', 'aspectRatio', 'ratio'].includes(p)) ?? false;
      const supportsDuration = selectedVideoInfo?.supportedProperties?.some(p => ['duration', 'length', 'seconds'].includes(p)) ?? false;
      const supportsResolution = selectedVideoInfo?.supportedProperties?.some(p => ['resolution', 'quality', 'size'].includes(p)) ?? false;

      const data = await generateVideo(
        videoPrompt,
        selectedVideoModel,
        sourceImg,
        identityLock,
        naturalLook,
        supportsAspectRatio ? selectedVideoAspectRatio : undefined,
        supportsDuration ? selectedVideoDuration : undefined,
        supportsResolution ? selectedVideoResolution : undefined,
        sourceVid,
        generateAudioToggle
      );
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

      const selectedVideoInfo = videoModels.find(m => m.id === selectedVideoModel);
      const supportsAspectRatio = selectedVideoInfo?.supportedProperties?.some(p => ['aspect_ratio', 'aspectRatio', 'ratio'].includes(p)) ?? false;
      const supportsDuration = selectedVideoInfo?.supportedProperties?.some(p => ['duration', 'length', 'seconds'].includes(p)) ?? false;
      const supportsResolution = selectedVideoInfo?.supportedProperties?.some(p => ['resolution', 'quality', 'size'].includes(p)) ?? false;

      const data = await generateVideo(
        videoPrompt,
        selectedVideoModel,
        frameData.frameDataUrl,
        identityLock,
        naturalLook,
        supportsAspectRatio ? selectedVideoAspectRatio : undefined,
        supportsDuration ? selectedVideoDuration : undefined,
        supportsResolution ? selectedVideoResolution : undefined
      );
      setExtendResult(data);
      setVideoResult(data);
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

    if (file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name)) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      let captured = false;

      const finishCapture = (dataUrl: string) => {
        if (captured) return;
        captured = true;
        setter(dataUrl);
        nameSetter(file.name);
      };

      video.onloadeddata = () => {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1024;
        let w = video.videoWidth || 640;
        let h = video.videoHeight || 360;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          finishCapture(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          finishCapture(objectUrl);
        }
      };
      video.onerror = () => finishCapture(objectUrl);
      setTimeout(() => finishCapture(objectUrl), 1500);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1024;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            setter(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            setter(ev.target?.result as string);
          }
          nameSetter(file.name);
        };
        img.onerror = () => {
          setter(ev.target?.result as string);
          nameSetter(file.name);
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setter(reader.result as string);
        nameSetter(file.name);
      };
      reader.readAsDataURL(file);
    }
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
    showRefWarning = false,
    showLabel = true
  ) => {
    const allModels = Object.values(grouped).flat();
    const selectedInfo = allModels.find(m => m.id === value);
    return (
      <div className="space-y-1.5">
        {showLabel && (
          <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
            <Cpu className="w-3 h-3" /> AI Model
          </label>
        )}
        {modelsLoading ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-elevated)] rounded-xl text-sm text-[var(--text-secondary)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading models...
          </div>
        ) : (
          <div className="relative">
            <select
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-[var(--accent-primary)] outline-none appearance-none pr-10"
            >
              {Object.entries(grouped).map(([provider, providerModels]) => (
                <optgroup key={provider} label={provider}>
                  {providerModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.price > 0 ? (billingInfo?.isCreator ? ` ($${m.price.toFixed(3)})` : ` (${m.price} credits)`) : ' (Free)'}{m.nsfw ? ' 🔞' : ''}{showRefWarning && hasRefImage && !canUseReference(m, models) ? ' ⚠ No ref support' : ''}
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
    const { t2v, i2v, v2v } = groupedVideoModels;
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
                        {m.name} ({provider}){m.price > 0 ? (billingInfo?.isCreator ? ` $${m.price.toFixed(3)}` : ` ${m.price} credits`) : ' Free'}{m.nsfw ? ' 🔞' : ''}
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
                        {m.name} ({provider}){m.price > 0 ? (billingInfo?.isCreator ? ` $${m.price.toFixed(3)}` : ` ${m.price} credits`) : ' Free'}{m.nsfw ? ' 🔞' : ''}
                      </option>
                    ))
                  )}
                </optgroup>
              )}
              {Object.keys(v2v).length > 0 && (
                <optgroup label="Video-to-Video">
                  {Object.entries(v2v).map(([provider, ms]) =>
                    ms.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({provider}){m.price > 0 ? (billingInfo?.isCreator ? ` $${m.price.toFixed(3)}` : ` ${m.price} credits`) : ' Free'}{m.nsfw ? ' 🔞' : ''}
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
    accentClass = 'bg-[var(--gradient-primary)]'
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

    const HERO_SLIDES = [
    {
      title: "Nano Banana Pro",
      desc: "Create hyper-consistent digital creator portraits with cinematic lighting and custom outfits.",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
      thumbnails: [
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=250&h=350&q=80",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&h=350&q=80",
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&h=350&q=80",
        "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=250&h=350&q=80"
      ],
      badge: "Face-Consistent",
      badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
    },
    {
      title: "Flux 1.1 Pro",
      desc: "Produce ultra-detailed editorial photoshoots with complex text prompts and structures.",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80",
      thumbnails: [
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&h=350&q=80",
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=250&h=350&q=80",
        "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=250&h=350&q=80",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&h=350&q=80"
      ],
      badge: "Ultra Quality",
      badgeColor: "bg-[var(--accent-muted)] text-[var(--accent-primary)] border-[var(--border-strong)]"
    },
    {
      title: "Imagen 4 Ultra",
      desc: "Outstanding photorealism and spatial coherence under complex multi-subject descriptions.",
      image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80",
      thumbnails: [
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&h=350&q=80",
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&h=350&q=80",
        "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=250&h=350&q=80",
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=250&h=350&q=80"
      ],
      badge: "Photorealistic",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20"
    }
  ];

  const VIDEO_HERO_SLIDES = [
    {
      title: "Minimax v2",
      desc: "Create dynamic cinematic video action clips with fluid subject movements and realistic physics.",
      videoUrl: "/demo-assets/showcase-1.mp4",
      thumbnails: [
        "/demo-assets/showcase-1.mp4",
        "/demo-assets/showcase-2.mp4",
        "/demo-assets/showcase-3.mp4",
        "/demo-assets/showcase-4.mp4"
      ],
      badge: "Text-to-Video",
      badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
    },
    {
      title: "Luma Dream Machine",
      desc: "Produce complex physics simulations and camera pans based on static reference images.",
      videoUrl: "/demo-assets/video-preview.mp4",
      thumbnails: [
        "/demo-assets/video-preview.mp4",
        "/demo-assets/generated-talking.mp4",
        "/demo-assets/showcase-1.mp4",
        "/demo-assets/showcase-2.mp4"
      ],
      badge: "Image-to-Video",
      badgeColor: "bg-[var(--accent-muted)] text-[var(--accent-primary)] border-[var(--border-strong)]"
    },
    {
      title: "Kling AI 1.5",
      desc: "Ultra-consistent human actions, facial expressions, and complex spatial object movements.",
      videoUrl: "/demo-assets/showcase-2.mp4",
      thumbnails: [
        "/demo-assets/showcase-3.mp4",
        "/demo-assets/showcase-4.mp4",
        "/demo-assets/video-preview.mp4",
        "/demo-assets/generated-talking.mp4"
      ],
      badge: "Text-to-Video",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20"
    },
    {
      title: "Runway Gen-3 Alpha",
      desc: "Hollywood-grade cinematic outputs, photorealistic character skins, and high-fidelity movement controls.",
      videoUrl: "/demo-assets/generated-talking.mp4",
      thumbnails: [
        "/demo-assets/generated-talking.mp4",
        "/demo-assets/showcase-2.mp4",
        "/demo-assets/showcase-4.mp4",
        "/demo-assets/showcase-1.mp4"
      ],
      badge: "Video-to-Video",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    }
  ];

  const renderImageMode = () => {
    const isIdentityModel = selectedModelInfo?.isIdentityModel ?? false;
    const refPersonaImage = refPersonaId !== 'none' ? (personas.find(p => p.id === refPersonaId)?.referenceImage ?? null) : null;

    return (
      <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto pb-10">
        {/* ── TOP SECTION: Thin Visual Showcase Banner (when idle) OR Generating State OR Canvas Results ── */}
        {activeVersion || isGenerating || isProcessing ? (
          <div className="w-full relative min-h-[460px] md:min-h-[560px] max-h-[660px] bg-[#08080A] border border-white/10 rounded-[24px] overflow-hidden shadow-2xl flex flex-col justify-center items-center p-3 font-sans transition-all duration-500">
            {isGenerating || isProcessing ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#08080A]/90 backdrop-blur-sm z-30 gap-2 select-none">
                <Loader2 className="w-8 h-8 animate-spin text-[#E7C477]" />
                <div className="text-center">
                  <p className="text-xs font-bold text-white tracking-wide animate-pulse">
                    {isProcessing
                      ? (postAction === 'upscale' ? 'Upscaling image to 4K...' : 'Editing visual canvas...')
                      : `Creating with ${selectedModelInfo?.name || 'AI'}`}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Generating {imageCount > 1 ? `${imageCount} variations` : 'image'} - please wait</p>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full min-h-[440px] md:min-h-[540px] flex items-center justify-center select-none p-3 bg-[#0E0E10] rounded-2xl group overflow-hidden">
                <img 
                  src={activeVersion.imageUrl} 
                  alt="Active preview" 
                  onClick={() => setLightboxImageUrl(activeVersion.imageUrl)}
                  className="max-w-full max-h-[520px] md:max-h-[600px] object-contain rounded-2xl shadow-2xl transition-all duration-300 hover:scale-[1.015] cursor-pointer hover:ring-2 hover:ring-[#E7C477]/50 border border-white/10" 
                  title="Click to enlarge full screen"
                />
                
                {/* Quick Image Download & View Action Badges */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-20">
                  <button
                    onClick={e => { e.stopPropagation(); setLightboxImageUrl(activeVersion.imageUrl); }}
                    className="btn-gold-primary px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-lg flex items-center gap-1 cursor-pointer"
                    title="Enlarge Full Screen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); downloadFile(activeVersion.imageUrl, 'png'); }}
                    className="p-1.5 bg-black/80 backdrop-blur-sm rounded-lg text-white hover:bg-black transition-all border border-white/10 hover:border-[#E7C477] shadow-lg cursor-pointer"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleImageGenerate(); }}
                    className="p-1.5 bg-black/80 backdrop-blur-sm rounded-lg text-white hover:bg-[#1E1E22] transition-all border border-white/10 shadow-lg cursor-pointer"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 backdrop-blur-sm border border-white/15 rounded-md text-[8px] font-bold text-[#F2D58D]">
                  {activeVersion.model}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Sleek Thin Visual Showcase Banner (h-16 md:h-20) */
          <div className="w-full relative h-16 md:h-20 bg-[#161618] border border-white/10 rounded-2xl overflow-hidden shadow-lg p-2 flex items-center justify-between gap-3 font-sans select-none">
            <div className="flex items-center gap-2.5 pl-1.5">
              <div className="w-8 h-8 rounded-lg bg-[#242428] border border-[#E7C477]/30 flex items-center justify-center shadow-md text-[#F2D58D] shrink-0">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#E7C477]/15 border border-[#E7C477]/30 text-[#F2D58D]">
                    Featured Models
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 truncate">GPT Image 2 • Nano Banana • Seedream 5.0 • Wan 7</span>
                </div>
                <h2 className="text-xs font-bold text-white tracking-tight leading-tight mt-0.5 font-serif">
                  Photorealistic Persona & Studio Visual Generator
                </h2>
              </div>
            </div>
            {/* Visual Showcase Thumbnails Strip */}
            <div className="hidden sm:flex items-center gap-1.5 pr-1 shrink-0">
              {[
                { title: 'Editorial', img: '/persona_showcase_1.png' },
                { title: 'Cinematic', img: '/persona_showcase_2.png' },
                { title: 'Portrait', img: '/persona_showcase_3.png' },
                { title: 'Studio', img: '/persona_showcase_4.png' }
              ].map((item, idx) => (
                <div key={idx} className="relative w-11 h-11 md:w-12 md:h-12 rounded-xl overflow-hidden border border-white/20 shadow-md hover:scale-105 transition-all duration-300 group">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/isabella_laurent_reference.png';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end p-0.5">
                    <span className="text-[6px] font-bold text-white uppercase tracking-wider leading-none drop-shadow">{item.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Post Generation Toolkit for Active Version */}
        {activeVersion && !isGenerating && !isProcessing && (
          <div className="space-y-3 bg-[#0E0E10] p-4 rounded-2xl border border-white/10">
            <div className="flex gap-2">
              <button onClick={() => setPostAction(postAction === 'edit' ? null : 'edit')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${postAction === 'edit' ? 'btn-gold-primary' : 'bg-[#1E1E22] text-[#F5F1E8] hover:border-[#E7C477]/40 border border-white/10'}`}>
                <Pencil className="w-3.5 h-3.5" /> Edit Image
              </button>
              <button onClick={() => setPostAction(postAction === 'upscale' ? null : 'upscale')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${postAction === 'upscale' ? 'btn-gold-primary' : 'bg-[#1E1E22] text-[#F5F1E8] hover:border-[#E7C477]/40 border border-white/10'}`}>
                <ArrowUpCircle className="w-3.5 h-3.5" /> Upscale 4K
              </button>
              <button onClick={handleSaveImage} disabled={saved} className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 btn-gold-secondary transition-all disabled:opacity-50 shadow-md">
                {saved ? <><Check className="w-3.5 h-3.5 text-[#E7C477]" /> Saved!</> : <><CheckCircle className="w-3.5 h-3.5" /> Save to Vault</>}
              </button>
            </div>

            {postAction === 'edit' && (
              <div className="bg-[#161618] border border-white/10 rounded-xl p-3.5 space-y-3">
                {isPro && renderModelSelect(selectedEditModel, setSelectedEditModel, groupedEditModels)}
                <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="Describe what to change in the active image..." className="w-full bg-[#08080A] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 resize-none h-16 outline-none focus:border-[#E7C477]" />
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#08080A] rounded-lg cursor-pointer hover:bg-[#1E1E22] text-xs text-slate-300 border border-white/10">
                    <Upload className="w-3.5 h-3.5 text-[#E7C477]" />
                    <span className="truncate">{editAdditionalImageName || 'Add reference (optional)'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload(setEditAdditionalImage, setEditAdditionalImageName)} />
                  </label>
                  <button onClick={handleEdit} disabled={isProcessing || !editPrompt.trim()} className="px-4 py-2 btn-gold-primary rounded-lg text-xs font-bold disabled:opacity-50">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Edit'}
                  </button>
                </div>
              </div>
            )}

            {postAction === 'upscale' && (
              <div className="bg-[#161618] border border-white/10 rounded-xl p-3.5 space-y-3">
                {isPro && renderModelSelect(selectedUpscaleModel, setSelectedUpscaleModel, groupedUpscaleModels)}
                <button onClick={handleUpscale} disabled={isProcessing} className="w-full py-2 btn-gold-primary rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowUpCircle className="w-4 h-4" /> Enhance Resolution</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── INTERMEDIATE SECTION: Variation History Stream Thumbnails ── */}
        {activeVersion && generatedFeed.length > 0 && (
          <div className="space-y-2 bg-[#0E0E10] border border-white/10 p-3.5 rounded-2xl">
            <span className="text-[10px] font-bold text-[#F2D58D] uppercase tracking-wider block">Creations History Stream</span>
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide select-none">
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
                      setLightboxImageUrl(entry.imageUrl);
                    }}
                    className={`relative rounded-xl overflow-hidden border cursor-pointer transition-all shrink-0 w-16 h-20 group/thumb ${
                      isFocused ? 'border-[#E7C477] ring-2 ring-[#E7C477]/40 scale-95 shadow-lg' : 'border-white/10 hover:border-white/40 hover:scale-105'
                    }`}
                    title="Click to select & view enlarged full screen"
                  >
                    <img src={entry.imageUrl} alt={entry.label} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[8px] font-bold text-[#161618] bg-[#E7C477] px-1 py-0.5 rounded shadow">🔍 Enlarge</span>
                    </div>
                    <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/80 rounded text-[7px] font-bold text-white max-w-[calc(100%-8px)] truncate">
                      {entry.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── BOTTOM SECTION: Deep Inset Charcoal Prompt Box ── */}
        <div className="relative bg-[#08080A] border border-white/10 rounded-[24px] p-4.5 space-y-3.5 focus-within:border-[#E7C477]/50 focus-within:shadow-[0_0_30px_rgba(231,196,119,0.05)] transition-all duration-300">
          
          {/* Top Row: Dropzone popover, Upload previews, prompt input, Wand icon */}
          <div className="flex items-start gap-4">
            
            {/* Upload Button (+) & Dropdown */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
                className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-350 hover:bg-white/10 hover:text-white transition-all shadow-md"
              >
                <Plus size={18} />
              </button>
              
              {uploadMenuOpen && (
                <>
                  <div className="fixed inset-0 z-29" onClick={() => setUploadMenuOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-[#141416] p-1.5 shadow-2xl z-30 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadMenuOpen(false);
                        document.getElementById('ref-image-file-input')?.click();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 font-bold transition-all"
                    >
                      <ImageIcon size={14} className="text-cyan-400" />
                      Photo Library
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadMenuOpen(false);
                        document.getElementById('ref-image-file-input')?.click();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 font-bold transition-all"
                    >
                      <FolderOpen size={14} className="text-[var(--accent-primary)]" />
                      Files
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadMenuOpen(false);
                        document.getElementById('ref-image-file-input')?.click();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 font-bold transition-all"
                    >
                      <Camera size={14} className="text-emerald-400" />
                      Take Photo / Camera
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Prompt input field */}
            <div className="flex-1 min-w-0">
              <textarea
                value={imagePrompt}
                onChange={e => setImagePrompt(e.target.value)}
                placeholder="Describe what you want the AI to create in vivid details..."
                className="w-full bg-transparent border-0 outline-none resize-none text-sm text-white placeholder-slate-500 h-48 md:h-56 min-h-[180px] focus:ring-0 p-0"
              />
            </div>

            {/* Enhance with AI Icon */}
            <button
              type="button"
              onClick={() => handleEnhanceField(imagePrompt, setImagePrompt, 'imagePrompt')}
              disabled={!imagePrompt.trim() || !!enhancingField}
              className="p-2 rounded-xl bg-[var(--accent-subtle)] border border-[var(--border-strong)] text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-all disabled:opacity-30 self-start"
              title="Enhance prompt with AI"
            >
              {enhancingField === 'imagePrompt' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Reference files input */}
          <input
            id="ref-image-file-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files) {
                Array.from(files).forEach(file => handleAddRefImage(file));
              }
              e.target.value = '';
            }}
          />

          {/* Uploaded Reference Thumbnails Inline Preview */}
          {(refImages.length > 0 || refPersonaId !== 'none') && (
            <div className="flex flex-wrap items-center gap-2 px-1 pt-1">
              {/* Persona Reference Thumbnail */}
              {refPersonaId !== 'none' && (() => {
                const p = personas.find(x => x.id === refPersonaId);
                if (!p?.referenceImage) return null;
                return (
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-emerald-500/30 shrink-0 ring-1 ring-emerald-500/20" title={`Persona face: ${p.name}`}>
                    <img src={p.referenceImage} alt="" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#0B0F17]" />
                  </div>
                );
              })()}

              {/* Custom Uploaded Thumbnails */}
              {refImages.map(img => (
                <div key={img.id} className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0 group">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setRefImages(prev => prev.filter(x => x.id !== img.id))}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Row: Selection Dropdowns & CTA Generate */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/10 w-full">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 max-w-full">
              
              {/* 1. Custom Interactive AI Model Selector Trigger Button */}
              {isPro && <button
                type="button"
                onClick={() => setIsModelModalOpen(true)}
                className="bg-[#1E1E22] border border-[#E7C477]/50 hover:border-[#E7C477] text-[#F2D58D] font-bold text-xs px-3 py-1 rounded-xl flex items-center gap-2 transition-all shadow-md hover:bg-[#242428] shrink-0 h-8 cursor-pointer"
                title="Click to browse and change AI Generation Model"
              >
                <Cpu size={14} className="text-[#E7C477] shrink-0 animate-pulse" />
                <div className="flex flex-col text-left leading-none max-w-[170px] truncate">
                  <span className="text-[7.5px] font-bold uppercase tracking-wider text-[#8C909A]">AI Engine</span>
                  <span className="truncate font-bold text-[#F2D58D] text-[11px] mt-0.5">
                    {selectedModelInfo?.name ? selectedModelInfo.name : 'Choose AI Model (130+)'}
                  </span>
                </div>
                <ChevronDown size={13} className="text-[#E7C477] shrink-0 ml-0.5" />
              </button>}

              {/* 2. Community LoRA & Style Booster Popover Button */}
              {isPro && <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setLoraPanelOpen(!loraPanelOpen)}
                  className={`border font-bold text-xs px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition-all shadow-md h-8 cursor-pointer ${
                    selectedLoras.length > 0
                      ? 'bg-[#E7C477]/20 border-[#E7C477] text-[#F2D58D]'
                      : 'bg-[#141416] border-white/10 text-slate-300 hover:border-white/20'
                  }`}
                  title="Attach Community Aesthetic LoRAs & Civitai weights"
                >
                  <Sparkles size={13} className={selectedLoras.length > 0 ? 'text-[#E7C477] animate-spin' : 'text-slate-400'} />
                  <span>LoRA {selectedLoras.length > 0 ? `(${selectedLoras.length})` : 'Booster'}</span>
                </button>

                {/* LoRA Popover Dropdown */}
                {loraPanelOpen && (
                  <div className="absolute left-0 bottom-10 z-50 w-72 bg-[#161618] border border-white/15 rounded-2xl p-3 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={13} className="text-[#E7C477]" />
                        <span className="text-xs font-bold text-white">Community LoRA & Aesthetics</span>
                      </div>
                      <button type="button" onClick={() => setLoraPanelOpen(false)} className="text-slate-400 hover:text-white p-0.5"><X size={13} /></button>
                    </div>

                    <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                      {POPULAR_LORAS.map(l => {
                        const active = selectedLoras.find(x => x.model === l.id);
                        return (
                          <div key={l.id} className={`p-2 rounded-xl border text-left transition-all ${active ? 'bg-[#E7C477]/10 border-[#E7C477]/60' : 'bg-[#1E1E22] border-white/5 hover:border-white/15'}`}>
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => {
                                  if (active) setSelectedLoras(prev => prev.filter(x => x.model !== l.id));
                                  else setSelectedLoras(prev => [...prev, { model: l.id, weight: l.defaultWeight, name: l.name }]);
                                }}
                                className="text-[11px] font-bold text-slate-200 hover:text-[#E7C477] flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>{active ? '✅' : '➕'}</span>
                                <span className="truncate max-w-[170px]">{l.name}</span>
                              </button>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-slate-400 font-mono">{l.tag}</span>
                            </div>
                            {active && (
                              <div className="mt-1.5 pt-1 border-t border-white/5 flex items-center gap-2">
                                <span className="text-[9px] text-slate-400">Weight:</span>
                                <input
                                  type="range"
                                  min="0.1"
                                  max="1.5"
                                  step="0.05"
                                  value={active.weight}
                                  onChange={e => {
                                    const w = parseFloat(e.target.value);
                                    setSelectedLoras(prev => prev.map(x => x.model === l.id ? { ...x, weight: w } : x));
                                  }}
                                  className="w-full h-1 accent-[#E7C477] bg-white/10 rounded cursor-pointer"
                                />
                                <span className="text-[10px] font-mono text-[#E7C477] w-7 text-right">{active.weight.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Custom Civitai LoRA Input */}
                    <div className="mt-2.5 pt-2 border-t border-white/10">
                      <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Custom Civitai / Air LoRA</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="curn:civitai:..."
                          value={customLoraInput}
                          onChange={e => setCustomLoraInput(e.target.value)}
                          className="flex-1 bg-[#101012] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-slate-200 outline-none placeholder:text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!customLoraInput.trim()) return;
                            const id = customLoraInput.trim();
                            if (!selectedLoras.find(x => x.model === id)) {
                              setSelectedLoras(prev => [...prev, { model: id, weight: customLoraWeight, name: 'Custom Civitai LoRA' }]);
                            }
                            setCustomLoraInput('');
                          }}
                          className="bg-[#E7C477] text-black font-bold text-[10px] px-2 py-1 rounded-lg hover:bg-[#F2D58D] cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>}

              {/* 2. Persona Selector Dropdown */}
              <div className="relative shrink-0">
                <select
                  value={refPersonaId}
                  onChange={(e) => setRefPersonaId(e.target.value)}
                  className="bg-[#141416] border border-white/10 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-200 outline-none appearance-none pr-6 hover:bg-[#1E1E22] hover:border-white/20 transition-all cursor-pointer h-8 text-ellipsis overflow-hidden max-w-[140px]"
                >
                  <option value="none">No Persona Ref</option>
                  {personas.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>

              {/* 3. Aspect Ratio Dropdown */}
              <div className="relative shrink-0">
                <select
                  value={selectedAspectRatio}
                  onChange={e => setSelectedAspectRatio(e.target.value)}
                  className="bg-[#141416] border border-white/10 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-200 outline-none appearance-none pr-6 hover:bg-[#1E1E22] hover:border-white/20 transition-all cursor-pointer h-8 text-ellipsis overflow-hidden max-w-[110px]"
                >
                  <option value="1:1">1:1 Square</option>
                  <option value="16:9">16:9 Landscape</option>
                  <option value="9:16">9:16 Shorts</option>
                  <option value="4:5">4:5 Post</option>
                  <option value="4:3">4:3 Widescreen</option>
                  <option value="2:3">2:3 Tall</option>
                  <option value="3:2">3:2 Classic</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>

              {/* 4. Resolution Dropdown */}
              {isPro && <div className="relative shrink-0">
                <select
                  value={selectedResolution}
                  onChange={e => setSelectedResolution(e.target.value)}
                  className="bg-[#141416] border border-white/10 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-200 outline-none appearance-none pr-6 hover:bg-[#1E1E22] hover:border-white/20 transition-all cursor-pointer h-8 text-ellipsis overflow-hidden max-w-[115px]"
                >
                  {resolutionOpts.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>}

              {/* 5. Number of Generations Dropdown */}
              <div className="relative shrink-0">
                <select
                  value={imageCount}
                  onChange={e => setImageCount(Number(e.target.value))}
                  className="bg-[#141416] border border-white/10 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-200 outline-none appearance-none pr-6 hover:bg-[#1E1E22] hover:border-white/20 transition-all cursor-pointer h-8 text-ellipsis overflow-hidden max-w-[85px]"
                >
                  <option value={1}>1 Gen</option>
                  <option value={2}>2 Gens</option>
                  <option value={3}>3 Gens</option>
                  <option value={4}>4 Gens</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Optional Style presets builder button */}
              <button
                type="button"
                onClick={() => setStyleOptionsOpen(!styleOptionsOpen)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all border h-8 shrink-0 ${
                  styleOptionsOpen || activeQuickStyle || activePresetChips.length > 0 || selectedEnv !== 'None'
                    ? 'btn-gold-secondary text-[#F2D58D]'
                    : 'bg-[#141416] border-white/10 text-slate-300 hover:bg-[#1E1E22]'
                }`}
              >
                <Wand2 size={13} />
                Presets
              </button>
            </div>

            {/* Big CTA Generate Button */}
            <button
              onClick={handleImageGenerate}
              disabled={isGenerating || !selectedModel || (selectedModelInfo?.isIdentityModel && !refPersonaImage && refImages.length === 0)}
              className="px-4 py-1 rounded-xl font-bold text-xs btn-gold-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-md group h-8 shrink-0 ml-auto cursor-pointer z-10"
            >
              <Sparkles size={13} className="group-hover:animate-pulse" />
              Generate {imageCount > 1 ? `x${imageCount}` : ''}
            </button>
          </div>

          {/* Style presets panel */}
          {styleOptionsOpen && (
            <div className="border-t border-white/5 pt-4 space-y-4 transition-all duration-350">
              
              {/* Preset Templates */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-wide">Preset Templates</p>
                  {activeQuickStyle && (
                    <button onClick={clearQuickStyle} className="text-[10px] text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors">Clear</button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
                  {QUICK_STYLES.map(qs => (
                    <button
                      key={qs.id}
                      type="button"
                      onClick={() => applyQuickStyle(qs)}
                      className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl text-[9px] font-bold transition-all border overflow-hidden ${
                        activeQuickStyle === qs.id
                          ? 'bg-[var(--accent-muted)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-[var(--shadow-glow)]'
                          : `bg-gradient-to-br ${qs.gradient} ${qs.border} text-[var(--text-secondary)] hover:text-white ${qs.glow}`
                      }`}
                    >
                      <span className="text-base">{qs.emoji}</span>
                      <span className="truncate w-full text-center font-extrabold">{qs.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chips Preset Builder */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-wide">Style Preset Builder</p>
                  {activePresetChips.length > 0 && (
                    <button 
                      onClick={() => setActivePresetChips([])} 
                      className="text-[10px] text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors"
                    >
                      Reset Chips
                    </button>
                  )}
                </div>
                
                <div className="space-y-3 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                  {PRESET_CATEGORIES.map(category => (
                    <div key={category.name} className="space-y-1">
                      <label className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-wider block">{category.name}</label>
                      <div className="flex flex-wrap gap-1">
                        {category.presets.map(preset => {
                          const isActive = activePresetChips.includes(preset);
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setActivePresetChips(prev => 
                                  prev.includes(preset) ? prev.filter(x => x !== preset) : [...prev, preset]
                                );
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[8px] font-bold transition-all border ${
                                isActive 
                                  ? 'bg-[var(--accent-muted)] border-[var(--border-strong)] text-[var(--text-primary)] shadow-sm'
                                  : 'bg-white/5 border-white/5 text-[var(--text-tertiary)] hover:border-white/15 hover:text-white'
                              }`}
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Style Director selectors */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <p className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-wide">Style Director</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                          className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-2.5 py-1.5 text-[10px] text-white outline-none appearance-none pr-6 font-medium"
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
          )}

        </div>

      </div>
    );
  };

  const renderVideoMode = () => {
    const selectedVideoInfo = videoModels.find(m => m.id === selectedVideoModel);
    const isGoogleVideo = selectedVideoInfo?.provider?.toLowerCase().includes('google') || false;
    const isI2V = selectedVideoInfo?.type === 'image-to-video' || selectedVideoModel.includes('i2v');
    const isV2V = selectedVideoModel.toLowerCase().includes('v2v') || selectedVideoModel.toLowerCase().includes('video-to-video') || selectedVideoModel.toLowerCase().includes('edit') || selectedVideoModel.toLowerCase().includes('pulid') || selectedVideoModel.toLowerCase().includes('consist') || selectedVideoModel.toLowerCase().includes('seedance') || selectedVideoModel.toLowerCase().includes('wan') || selectedVideoModel.toLowerCase().includes('qwen') || selectedVideoModel.toLowerCase().includes('veo-omni');

    const videoAspectRatioOptions = [
      { value: '16:9', label: '16:9 Landscape' },
      { value: '9:16', label: '9:16 Shorts' },
      { value: '1:1', label: '1:1 Square' },
      { value: '4:3', label: '4:3 Standard' },
      { value: '2:3', label: '2:3 Tall' }
    ];

    const videoResolutionOptions = [
      { value: '720p', label: '720p High Def' },
      { value: '1080p', label: '1080p Full HD' },
      { value: '4k', label: '4K Ultra HD' }
    ];

    const effectiveVideoSource = videoSourceVideo || videoSourceImage || (videoSourcePersonaId !== 'none' ? (personas.find(p => p.id === videoSourcePersonaId)?.referenceImage ?? null) : null);

    return (
      <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto pb-10">
        
        {/* ── TOP SECTION: Alternating Hero Slideshow / Video Output Canvas ── */}
        <div className={`relative w-full ${videoResult?.videoUrl || isGenerating || isExtending ? 'min-h-[460px] md:min-h-[560px] max-h-[680px]' : 'h-44 md:h-52 max-h-[220px]'} rounded-[24px] border border-white/10 bg-[#08080A] overflow-hidden shadow-2xl transition-all duration-500`}>
          {isGenerating || isExtending ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#08080A]/90 z-10 select-none">
              <Loader2 className="w-8 h-8 text-[#E7C477] animate-spin" />
              <p className="text-xs font-bold text-white/90 animate-pulse uppercase tracking-wider">
                {isExtending ? 'Extending Cinematic Video...' : 'Generating Cinematic Video...'}
              </p>
            </div>
          ) : videoResult?.videoUrl ? (
            <div className="relative w-full h-full min-h-[440px] md:min-h-[540px] flex items-center justify-center select-none p-3 bg-[#0E0E10] rounded-2xl group overflow-hidden">
              <video 
                src={videoResult.videoUrl} 
                controls 
                autoPlay
                loop
                className="max-w-full max-h-[520px] md:max-h-[600px] object-contain rounded-2xl shadow-2xl transition-all duration-300 border border-white/10 cursor-pointer hover:ring-2 hover:ring-[#E7C477]/50" 
                onClick={() => setLightboxVideoUrl(videoResult.videoUrl)}
              />
              
              <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
                <button
                  onClick={e => { e.stopPropagation(); setLightboxVideoUrl(videoResult.videoUrl); }}
                  className="btn-gold-primary px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer"
                  title="Enlarge Full Screen"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    const media: GeneratedImage = {
                      id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      url: videoResult.videoUrl,
                      prompt: videoPrompt,
                      timestamp: Date.now(),
                      model: videoResult.model,
                      mediaType: 'video',
                    };
                    saveMediaToLibrary(media);
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-black/80 backdrop-blur-sm rounded-xl text-white hover:bg-black transition-all border border-white/10 hover:border-[#E7C477] shadow-lg flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  title="Save to Library"
                >
                  {saved ? <Check className="w-3.5 h-3.5 text-[#E7C477]" /> : <FolderOpen className="w-3.5 h-3.5" />}
                  <span>{saved ? 'Saved' : 'Save'}</span>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); downloadFile(videoResult.videoUrl, 'mp4'); }}
                  className="p-2 bg-black/80 backdrop-blur-sm rounded-xl text-white hover:bg-black transition-all border border-white/10 hover:border-[#E7C477] shadow-lg cursor-pointer"
                  title="Download Video"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleVideoGenerate(); }}
                  className="p-2 bg-black/80 backdrop-blur-sm rounded-xl text-white hover:bg-[#1E1E22] transition-all border border-white/10 shadow-lg cursor-pointer"
                  title="Regenerate"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute top-3 left-3 px-3 py-1 bg-black/80 backdrop-blur-md border border-white/15 rounded-lg text-xs font-bold text-[#F2D58D] shadow-md">
                {videoResult.model}
              </div>
            </div>
          ) : (
            /* Alternating Hero Video Slideshow */
            <div className="relative w-full h-full h-44 md:h-52 max-h-[220px] flex items-center justify-between overflow-hidden px-5 md:px-8 bg-[#141416]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeVideoSlideIndex}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full flex items-center justify-between gap-6"
                >
                  {/* Left Side: Video Model Details */}
                  <div className="flex-1 flex flex-col justify-center text-left py-4 select-none">
                    <span className={`self-start text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border mb-1.5 ${VIDEO_HERO_SLIDES[activeVideoSlideIndex].badgeColor}`}>
                      {VIDEO_HERO_SLIDES[activeVideoSlideIndex].badge}
                    </span>
                    <h2 className="text-[10px] font-bold uppercase text-[#8C909A] tracking-wider mb-0.5 leading-none">
                      Start Creating with
                    </h2>
                    <h1 className="text-xl md:text-2xl font-serif tracking-tight mb-1.5 leading-tight text-[#F5F1E8]">
                      {VIDEO_HERO_SLIDES[activeVideoSlideIndex].title}
                    </h1>
                    <p className="text-[10px] md:text-xs text-[#8C909A] font-medium leading-relaxed max-w-md">
                      {VIDEO_HERO_SLIDES[activeVideoSlideIndex].desc}
                    </p>
                  </div>

                  {/* Right Side: Showcase Video Thumbnails */}
                  <div className="hidden sm:flex items-center gap-2 md:gap-3 shrink-0 py-2">
                    {VIDEO_HERO_SLIDES[activeVideoSlideIndex].thumbnails.map((thumbUrl, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 md:w-24 h-28 md:h-32 rounded-xl overflow-hidden border border-white/10 bg-black shadow-lg shadow-black/40 hover:scale-105 hover:border-[#E7C477]/40 transition-all duration-300"
                      >
                        <video
                          src={thumbUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="auto"
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── BOTTOM SECTION: Curved Premium Video Prompt Box ── */}
        <div className="relative bg-[#08080A] border border-white/10 rounded-[24px] p-4.5 space-y-3.5 focus-within:border-[#E7C477]/50 focus-within:shadow-[0_0_30px_rgba(231,196,119,0.05)] transition-all duration-300">
          
          {/* Sub-Mode Selector Tabs */}
          <div className="flex border-b border-white/5 bg-[#141416] p-1 rounded-xl">
            {[
              { id: 'generate', label: 'Generate Video', desc: 'Create from text or image' },
              { id: 'edit', label: 'Edit Video / V2V', desc: 'Modify using reference video' },
              { id: 'extend', label: 'Extend Video', desc: 'Lengthen from last frame' }
            ].map(subMode => {
              const isActive = videoSubMode === subMode.id;
              return (
                <button
                  key={subMode.id}
                  type="button"
                  onClick={() => setVideoSubMode(subMode.id as any)}
                  className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center flex flex-col items-center justify-center ${
                    isActive
                      ? 'bg-[#E7C477]/15 border border-[#E7C477]/30 text-[#F2D58D] font-bold shadow-lg'
                      : 'border border-transparent text-[#8C909A] hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <span className="text-xs font-bold tracking-wide leading-none">{subMode.label}</span>
                  <span className="text-[9px] text-[#8C909A] mt-0.5 hidden md:inline font-medium">{subMode.desc}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-start gap-4">
            {/* Multi-Format Plus Dropdown (Images & Videos) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setVideoUploadMenuOpen(!videoUploadMenuOpen)}
                className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-350 hover:bg-white/10 hover:text-white transition-all shadow-md"
              >
                <Plus size={18} />
              </button>

              {videoUploadMenuOpen && (
                <>
                  <div className="fixed inset-0 z-29" onClick={() => setVideoUploadMenuOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-[#141416] p-1.5 shadow-2xl z-30 space-y-1 select-none">
                    <button
                      type="button"
                      onClick={() => {
                        setVideoUploadMenuOpen(false);
                        openCreateAssetPicker((url) => {
                          setVideoSourceImage(url);
                          setVideoSourceImageName('Selected from Saved Library');
                          setVideoSourceVideo(null);
                        }, 'Select Asset from Saved Library');
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-pink-400 bg-pink-500/10 hover:bg-pink-500/20 flex items-center gap-2 font-bold transition-all border border-pink-500/20 mb-1"
                    >
                      <FolderHeart size={14} className="text-pink-400" />
                      Choose from Saved Library
                    </button>

                    {/* Image Group */}
                    <div className="px-2.5 py-1 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                      Upload Image
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoUploadMenuOpen(false);
                        videoImageLibraryInputRef.current?.click();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 font-bold transition-all"
                    >
                      <ImageIcon size={13} className="text-cyan-400" />
                      Photo Library
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoUploadMenuOpen(false);
                        videoImageFilesInputRef.current?.click();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 font-bold transition-all"
                    >
                      <FolderOpen size={13} className="text-[var(--accent-primary)]" />
                      Browse Files
                    </button>

                    {/* Video Group */}
                    <div className="px-2.5 py-1 pt-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                      Upload Video
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoUploadMenuOpen(false);
                        videoVideoLibraryInputRef.current?.click();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 font-bold transition-all"
                    >
                      <Film size={13} className="text-pink-400" />
                      Video Library
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoUploadMenuOpen(false);
                        videoVideoFilesInputRef.current?.click();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/5 hover:text-white flex items-center gap-2 font-bold transition-all"
                    >
                      <FolderOpen size={13} className="text-[var(--accent-primary)]" />
                      Browse Files
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Hidden iOS/iPad Inputs */}
            <input
              ref={videoImageLibraryInputRef}
              type="file"
              accept="image/*,video/*,video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv,.avi"
              className="hidden"
              onChange={e => {
                handleFileUpload(setVideoSourceImage, setVideoSourceImageName)(e);
                setVideoSourceVideo(null);
                setVideoSourceVideoName(null);
              }}
            />
            <input
              ref={videoImageFilesInputRef}
              type="file"
              accept="image/*,video/*,video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv,.avi"
              className="hidden"
              onChange={e => {
                handleFileUpload(setVideoSourceImage, setVideoSourceImageName)(e);
                setVideoSourceVideo(null);
                setVideoSourceVideoName(null);
              }}
            />
            <input
              ref={videoVideoLibraryInputRef}
              type="file"
              accept="video/*,video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo,image/*,.mp4,.mov,.webm,.mkv,.avi,.m4v,.3gp"
              className="hidden"
              onChange={e => {
                handleFileUpload(setVideoSourceVideo, setVideoSourceVideoName)(e);
                setVideoSourceImage(null);
                setVideoSourceImageName(null);
              }}
            />
            <input
              ref={videoVideoFilesInputRef}
              type="file"
              accept="video/*,video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo,image/*,.mp4,.mov,.webm,.mkv,.avi,.m4v,.3gp"
              className="hidden"
              onChange={e => {
                handleFileUpload(setVideoSourceVideo, setVideoSourceVideoName)(e);
                setVideoSourceImage(null);
                setVideoSourceImageName(null);
              }}
            />

             {/* Prompt input field */}
            <div className="flex-1 relative">
              {videoSubMode === 'extend' && !videoResult?.videoUrl ? (
                <div className="w-full h-20 flex flex-col items-center justify-center bg-black/20 rounded-xl border border-dashed border-white/15 px-4 text-center select-none">
                  <VideoOff className="w-5 h-5 text-slate-500 mb-1" />
                  <p className="text-[10px] font-bold text-slate-400">No generated video found</p>
                  <p className="text-[9px] text-slate-400">Generate or play a video above first to extend it.</p>
                </div>
              ) : (
                <textarea
                  value={videoPrompt}
                  onChange={e => setVideoPrompt(e.target.value)}
                  placeholder={
                    videoSubMode === 'extend'
                      ? "Describe how the video should continue (e.g. they walk into the room)..."
                      : (isV2V ? "Enter video editing instructions (e.g. make background snowy)..." : "Describe the video you want to generate in detail...")
                  }
                  className="w-full bg-transparent border-0 text-slate-100 placeholder-slate-500 focus:ring-0 outline-none resize-none text-sm h-20 scrollbar-hide py-1"
                />
              )}
              
              {/* Reference Attachment Preview */}
              {effectiveVideoSource && (
                <div className="absolute bottom-2 left-0 flex items-center gap-2 bg-black/60 border border-white/10 rounded-xl p-1.5 pr-3 shadow-lg max-w-[280px]">
                  {videoSourceVideo ? (
                    <Film className="w-7 h-7 text-[var(--accent-primary)] p-1.5 bg-white/5 rounded-lg shrink-0" />
                  ) : (
                    <img src={effectiveVideoSource} className="w-7 h-7 rounded-lg object-cover shrink-0" alt="Ref" />
                  )}
                  <span className="text-[10px] font-bold text-slate-300 truncate">
                    {videoSourceVideoName || videoSourceImageName || (videoSourcePersonaId !== 'none' ? personas.find(p => p.id === videoSourcePersonaId)?.name : 'Attached Reference')}
                  </span>
                  <button 
                    onClick={() => {
                      setVideoSourcePersonaId('none');
                      setVideoSourceImage(null);
                      setVideoSourceImageName(null);
                      setVideoSourceVideo(null);
                      setVideoSourceVideoName(null);
                    }} 
                    className="ml-auto text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}

              {/* Prompt enhancement button */}
              <button
                type="button"
                onClick={() => handleEnhanceField(videoPrompt, setVideoPrompt, 'videoPrompt')}
                disabled={!videoPrompt.trim() || !!enhancingField}
                className="absolute right-1 top-1 p-2 rounded-xl text-slate-400 hover:text-pink-400 hover:bg-white/[0.04] transition-all disabled:opacity-40"
              >
                {enhancingField === 'videoPrompt' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                ) : (
                  <Sparkles size={16} />
                )}
              </button>
            </div>
          </div>

          {/* Lower Parameter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/10 w-full overflow-x-hidden">
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
              
              {/* 1. Persona Selector Dropdown */}
              <div className="relative">
                <select
                  value={videoSourcePersonaId}
                  onChange={(e) => {
                    setVideoSourcePersonaId(e.target.value);
                    setVideoSourceImage(null);
                    setVideoSourceImageName(null);
                    setVideoSourceVideo(null);
                    setVideoSourceVideoName(null);
                  }}
                  className="bg-[#161f30] border border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-200 outline-none appearance-none pr-6 hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer h-8 text-ellipsis overflow-hidden max-w-[130px]"
                >
                  <option value="none">No Persona Reference</option>
                  {personas.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* 2. Video Model Selector Dropdown */}
              {isPro && <div className="relative">
                <select
                  value={selectedVideoModel}
                  onChange={e => setSelectedVideoModel(e.target.value)}
                  className="bg-[#161f30] border border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-200 outline-none appearance-none pr-6 hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer h-8 text-ellipsis overflow-hidden max-w-[215px]"
                >
                  {videoSubMode === 'generate' && (
                    <>
                      <optgroup label="Text-to-Video">
                        {Object.entries(groupedVideoModels.t2v).map(([provider, list]) =>
                          list.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} [T2V] ({billingInfo?.isCreator ? `$${(m.price || 0).toFixed(3)}` : `${m.price || 0} credits`}) {m.nsfw ? '🌶️' : ''}
                            </option>
                          ))
                        )}
                      </optgroup>
                      <optgroup label="Image-to-Video">
                        {Object.entries(groupedVideoModels.i2v).map(([provider, list]) =>
                          list.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} [I2V] ({billingInfo?.isCreator ? `$${(m.price || 0).toFixed(3)}` : `${m.price || 0} credits`}) {m.nsfw ? '🌶️' : ''}
                            </option>
                          ))
                        )}
                      </optgroup>
                    </>
                  )}
                  {videoSubMode === 'edit' && (
                    <optgroup label="Video-to-Video">
                      <option value="wavespeed-v2v:runway-gen3-v2v">Runway Gen-3 V2V ({billingInfo?.isCreator ? '$0.080' : '5 credits'}) 🌶️</option>
                      <option value="wavespeed-v2v:kling-v2v">Kling v2v Editing ({billingInfo?.isCreator ? '$0.060' : '5 credits'})</option>
                      {Object.entries(groupedVideoModels.v2v).map(([provider, list]) =>
                        list.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} [V2V] ({billingInfo?.isCreator ? `$${(m.price || 0).toFixed(3)}` : `${m.price || 0} credits`}) {m.nsfw ? '🌶️' : ''}
                          </option>
                        ))
                      )}
                    </optgroup>
                  )}
                  {videoSubMode === 'extend' && (
                    <optgroup label="Image-to-Video (Extenders)">
                      {Object.entries(groupedVideoModels.i2v).map(([provider, list]) =>
                        list.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} [Extend] ({billingInfo?.isCreator ? `$${(m.price || 0).toFixed(3)}` : `${m.price || 0} credits`}) {m.nsfw ? '🌶️' : ''}
                          </option>
                        ))
                      )}
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>}

              {/* 3. Duration Selector Dropdown */}
              <div className="relative">
                <select
                  value={selectedVideoDuration}
                  onChange={e => setSelectedVideoDuration(Number(e.target.value))}
                  className="bg-[#161f30] border border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-200 outline-none appearance-none pr-6 hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer h-8 text-ellipsis overflow-hidden max-w-[110px]"
                >
                  <option value={3}>3 Seconds</option>
                  <option value={5}>5 Seconds</option>
                  <option value={8}>8 Seconds</option>
                  <option value={12}>12 Seconds</option>
                  <option value={15}>15 Seconds</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* 4. Aspect Ratio / Resolution Dropdown */}
              {isPro && <div className="relative">
                <select
                  value={selectedVideoResolution}
                  onChange={e => setSelectedVideoResolution(e.target.value)}
                  className="bg-[#161f30] border border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-200 outline-none appearance-none pr-6 hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer h-8 text-ellipsis overflow-hidden max-w-[130px]"
                >
                  {videoResolutionOptions.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>}

              {/* 5. Toggle Generate Audio Switch */}
              <button
                type="button"
                onClick={() => setGenerateAudioToggle(!generateAudioToggle)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border h-8 ${
                  generateAudioToggle
                    ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-[#161f30] border-white/10 text-slate-350 hover:bg-white/[0.08]'
                }`}
              >
                <Volume2 size={12} />
                <span>Audio {generateAudioToggle ? 'ON' : 'OFF'}</span>
              </button>
            </div>

             {/* Big CTA Generate Video Button */}
            <button
              onClick={videoSubMode === 'extend' ? handleExtendVideo : handleVideoGenerate}
              disabled={
                isGenerating || isExtending || !selectedVideoModel || !videoPrompt.trim() ||
                (videoSubMode === 'extend' && !videoResult?.videoUrl) ||
                (videoSubMode === 'generate' && isI2V && !effectiveVideoSource) ||
                (videoSubMode === 'edit' && !effectiveVideoSource)
              }
              className="px-3.5 py-1 rounded-lg font-black text-[10px] btn-gold-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all shadow-md group h-7 shrink-0 cursor-pointer"
            >
              {isExtending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Extending...</span>
                </>
              ) : (
                <>
                  <Video size={11} className="group-hover:animate-pulse" />
                  <span>
                    {videoSubMode === 'extend' ? 'Extend Video' : (videoSubMode === 'edit' ? 'Edit Video' : 'Generate Video')}
                  </span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    );
  };

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
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${sceneCount === n ? 'bg-[var(--accent-primary)] text-[#15120b]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white'}`}
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
                  {activePersona.avatar || activePersona.referenceImage ? (
                    <img 
                      src={activePersona.avatar || activePersona.referenceImage} 
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/20" 
                      alt="Persona" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--text-muted)] ring-2 ring-emerald-500/20">
                      <UserRound className="w-6 h-6" />
                    </div>
                  )}
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
              <label className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-widest">
                {(() => {
                  const modelObj = LIPSYNC_MODELS.find(m => m.id === selectedLipSyncModel);
                  return modelObj?.inputType === 'video' ? 'Reference Video Source' : 'Avatar Portrait Source';
                })()}
              </label>
            </div>

            {(() => {
              const modelObj = LIPSYNC_MODELS.find(m => m.id === selectedLipSyncModel);
              const isVideoInput = modelObj?.inputType === 'video';

              if (isVideoInput) {
                return (
                  <div className="space-y-3">
                    <input
                      type="file"
                      ref={avatarVideoUploadRef}
                      className="hidden"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const dataUrl = event.target?.result as string;
                          setUploadedAvatarVideo(dataUrl);
                          setUploadedAvatarVideoName(file.name);
                          setSelectedAvatarVideoSource(dataUrl);
                          toast.success(`Uploaded: ${file.name}`);
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                    
                    <div className="grid grid-cols-4 gap-3">
                      <button 
                        onClick={() => avatarVideoUploadRef.current?.click()}
                        className="aspect-square flex flex-col items-center justify-center gap-1.5 glass-card border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <Upload className="w-5 h-5 text-emerald-400" />
                        <div className="text-center">
                          <div className="text-[9px] font-bold text-white">Upload Video</div>
                          <div className="text-[7px] text-[var(--text-muted)]">MP4, MOV, WEBM</div>
                        </div>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsWebcamCreatorOpen(true)}
                        className="aspect-square flex flex-col items-center justify-center gap-1.5 glass-card bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
                      >
                        <Video className="w-5 h-5 text-emerald-400" />
                        <div className="text-center">
                          <div className="text-[9px] font-bold text-white">Record Clip</div>
                          <div className="text-[7px] text-[var(--text-muted)]">Webcam capture</div>
                        </div>
                      </button>

                      {/* Display active reference video */}
                      {selectedAvatarVideoSource ? (
                        <div className="col-span-2 aspect-video rounded-xl overflow-hidden border border-emerald-500/30 bg-black relative group">
                          <video 
                            src={selectedAvatarVideoSource} 
                            className="w-full h-full object-cover" 
                            controls 
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[8px] font-bold text-emerald-400 border border-emerald-500/20 truncate max-w-[120px]">
                            {uploadedAvatarVideoName || 'Uploaded Video'}
                          </div>
                        </div>
                      ) : (
                        <div className="col-span-2 aspect-video rounded-xl border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center text-[var(--text-muted)] p-4 text-center">
                          <Film className="w-6 h-6 opacity-20 mb-1" />
                          <span className="text-[9px] font-bold text-zinc-500">No reference video selected</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Standard Image reference input layout
              return (
                <div className="grid grid-cols-5 gap-3">
                  <input
                    type="file"
                    ref={avatarImageUploadRef}
                    className="hidden"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await processImageFile(file);
                        setUploadedAvatarImage(dataUrl);
                        setUploadedAvatarImageName(file.name);
                        setSelectedAvatarSource(dataUrl);
                        toast.success(`Uploaded: ${file.name}`);
                      } catch (err) {
                        toast.error('Failed to process image');
                      }
                      e.target.value = '';
                    }}
                  />
                  <button 
                    onClick={() => avatarImageUploadRef.current?.click()}
                    className="aspect-square flex flex-col items-center justify-center gap-1.5 glass-card border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-emerald-400" />
                    <div className="text-center">
                      <div className="text-[9px] font-bold text-white">Upload Image</div>
                      <div className="text-[7px] text-[var(--text-muted)]">JPG, PNG, WEBP</div>
                    </div>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsWebcamCreatorOpen(true)}
                    className="aspect-square flex flex-col items-center justify-center gap-1.5 glass-card bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
                  >
                    <Video className="w-5 h-5 text-emerald-400" />
                    <div className="text-center">
                      <div className="text-[9px] font-bold text-white">Record Video</div>
                      <div className="text-[7px] text-[var(--text-muted)]">10s clip + voice</div>
                    </div>
                  </button>
                  <button 
                    onClick={() => updateMode('image')}
                    className="aspect-square flex flex-col items-center justify-center gap-1.5 glass-card bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Sparkles className="w-5 h-5 text-[var(--accent-primary)]" />
                    <div className="text-center">
                      <div className="text-[9px] font-bold text-white">AI Generate</div>
                      <div className="text-[7px] text-[var(--text-muted)]">Create from text</div>
                    </div>
                  </button>
                  
                  {/* Show up to 2 available images */}
                  {availableImages.slice(0, 2).map((imgUrl, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setSelectedAvatarSource(imgUrl)}
                      className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all relative group ${selectedAvatarSource === imgUrl ? 'border-emerald-500' : 'border-transparent'}`}
                    >
                      <img src={imgUrl} className="w-full h-full object-cover" alt={`Avatar Source ${idx + 1}`} />
                      {selectedAvatarSource === imgUrl && (
                        <div className="absolute inset-0 bg-emerald-500/10" />
                      )}
                    </button>
                  ))}

                  {/* If fewer than 2 available images, show placeholders */}
                  {Array.from({ length: Math.max(0, 2 - availableImages.length) }).map((_, idx) => (
                    <div 
                      key={`placeholder-${idx}`}
                      className="aspect-square rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-center text-[var(--text-muted)]"
                    >
                      <UserRound className="w-4 h-4 opacity-20" />
                    </div>
                  ))}

                  <button 
                    onClick={() => updateMode('image')}
                    className="aspect-square flex flex-col items-center justify-center glass-card bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="text-[14px] text-[var(--text-muted)] font-bold">•••</div>
                    <div className="text-[9px] font-bold text-white">More</div>
                  </button>
                </div>
              );
            })()}
          </div>

          {/* ENGINE SELECTION */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 border border-emerald-500/30">E</div>
              <label className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-widest">Avatar / Lip-Sync Model</label>
            </div>
            
            <div className="relative">
              <select
                value={selectedLipSyncModel}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedLipSyncModel(val);
                  if (val === 'heygen') {
                    setTalkingAvatarEngine('heygen');
                  } else {
                    setTalkingAvatarEngine('wavespeed');
                  }
                }}
                className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-10 cursor-pointer"
              >
                {LIPSYNC_MODELS.map(m => (
                  <option key={m.id} value={m.id} className="bg-[#0f0f12] text-white">
                    {m.name} ({m.inputType === 'video' ? 'Video' : 'Image'}-based)
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                <ChevronDown size={14} />
              </div>
            </div>

            {/* Model Details & Requirements Card */}
            {(() => {
              const modelObj = LIPSYNC_MODELS.find(m => m.id === selectedLipSyncModel);
              if (!modelObj) return null;
              const isVideo = modelObj.inputType === 'video';
              return (
                <div className="glass-card p-3 border border-emerald-500/10 bg-emerald-500/[0.02] rounded-xl space-y-1.5 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">Required Inputs</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-extrabold text-[8px] uppercase tracking-wider">
                      {modelObj.provider}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    {isVideo ? (
                      <>
                        <Video className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span>Reference Video (.mp4) + Audio reference (.mp3)</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Portrait Image (.png/.jpg) + Audio reference (.mp3)</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--text-tertiary)] font-medium leading-relaxed">
                    {modelObj.desc}
                  </p>
                </div>
              );
            })()}
            
            {selectedLipSyncModel === 'heygen' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-2 mt-2">
                <label className="block text-[8px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">HeyGen Avatar Version</label>
                <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setTalkingHeygenEngine('avatar_iv')}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      talkingHeygenEngine === 'avatar_iv' ? 'bg-emerald-600/30 border border-emerald-500/50 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    Avatar IV (v4)
                  </button>
                  <button
                    onClick={() => setTalkingHeygenEngine('avatar_v')}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      talkingHeygenEngine === 'avatar_v' ? 'bg-emerald-600/30 border border-emerald-500/50 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    Avatar V (v5 - Latest)
                  </button>
                </div>
              </div>
            )}
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
                accept="audio/*,video/*,video/mp4,video/quicktime,.mp3,.wav,.m4a,.ogg,.mp4,.mov,.webm"
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
            
            <div className="aspect-[9/16] rounded-3xl overflow-hidden glass-card relative group bg-[#0B0F19] shadow-2xl flex flex-col items-center justify-center">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-4 text-white z-10 p-6 text-center select-none">
                  <div className="relative">
                    {(selectedAvatarSource || activePersona.avatar) && (
                      <img src={selectedAvatarSource || activePersona.avatar} alt="" className="w-32 h-32 rounded-2xl object-cover opacity-40 blur-sm" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 size={32} className="animate-spin text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-xs font-bold text-emerald-300">Generating talking avatar...</p>
                  <p className="text-[9px] text-[var(--text-muted)]">This may take 1-3 minutes. Please keep this tab open.</p>
                </div>
              ) : talkingAvatarResult?.videoUrl ? (
                <>
                  <video 
                    src={talkingAvatarResult.videoUrl} 
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                    autoPlay
                    controls
                    loop
                    playsInline
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Live</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-[var(--text-tertiary)] flex flex-col items-center gap-4 p-8 text-center select-none">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Video size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-1">Your talking avatar will appear here</p>
                    <p className="text-[10px] text-[var(--text-muted)] max-w-[240px] leading-relaxed">
                      Select or upload a portrait, choose an engine (Wavespeed LTX or HeyGen AI), type a script, and hit Generate.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
               <label className="text-[10px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-widest px-1">Output & Actions</label>
               <div className="grid grid-cols-3 gap-3">
                 <div 
                   onClick={() => talkingAvatarResult && downloadFile(talkingAvatarResult.videoUrl, 'mp4')} 
                   className={`glass-card p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors cursor-pointer border-white/5 ${!talkingAvatarResult ? 'opacity-50 pointer-events-none' : ''}`}
                 >
                   <Download className="w-5 h-5 text-emerald-400" />
                   <div className="text-center">
                     <div className="text-[10px] font-bold text-white">Download</div>
                     <div className="text-[8px] text-[var(--text-muted)]">MP4 • 1080p</div>
                   </div>
                 </div>
                 <div 
                   onClick={() => talkingAvatarResult && handleGenerateTalkingAvatar()} 
                   className={`glass-card p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors cursor-pointer border-white/5 ${!talkingAvatarResult ? 'opacity-50 pointer-events-none' : ''}`}
                 >
                   <RefreshCw className="w-5 h-5 text-[var(--accent-primary)]" />
                   <div className="text-center">
                     <div className="text-[10px] font-bold text-white">Regenerate</div>
                     <div className="text-[8px] text-[var(--text-muted)]">New version</div>
                   </div>
                 </div>
                 <div 
                   onClick={() => {
                     if (talkingAvatarResult) {
                       navigator.clipboard.writeText(talkingAvatarResult.videoUrl);
                       toast.success('Video link copied to clipboard!');
                     }
                   }} 
                   className={`glass-card p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors cursor-pointer border-white/5 ${!talkingAvatarResult ? 'opacity-50 pointer-events-none' : ''}`}
                 >
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

  const handleSelectCapability = (capability: CreationCapabilityId) => {
    if (capability === 'edit-upscale') {
      nav.push({ view: 'intelligence', params: { initialTool: 'upscaler' } });
      return;
    }

    setMode(capability);
    nav.push({ view: 'create', subView: capability });
  };

  const renderGuidedCreationWorkspace = () => {
    if (isPro || !['image', 'video', 'talking-avatar'].includes(mode)) return null;

    const selectedVideoInfo = videoModels.find(model => model.id === selectedVideoModel);
    const selectedInfo = mode === 'image' ? selectedModelInfo : selectedVideoInfo;
    const rawCost = selectedInfo?.price || 0;
    const estimate = modelsLoading
      ? 'Checking availability and cost…'
      : selectedInfo
        ? rawCost > 0
          ? billingInfo?.isCreator
            ? `Estimated cost: $${rawCost.toFixed(3)}`
            : `Estimated cost: ${rawCost} credit${rawCost === 1 ? '' : 's'}`
          : 'No generation charge shown for this model'
        : mode === 'talking-avatar'
          ? 'Final cost appears after the avatar engine is selected'
          : 'Cost appears before generation';
    const prompt = mode === 'image' ? imagePrompt : mode === 'video' ? videoPrompt : avatarScript;
    const format = mode === 'image' ? selectedAspectRatio : mode === 'video' ? selectedVideoAspectRatio : selectedAvatarFraming;
    const formatOptions = mode === 'image' ? ASPECT_RATIO_OPTIONS : mode === 'video' ? VIDEO_ASPECT_RATIO_OPTIONS : AVATAR_FORMAT_OPTIONS;
    const outcomes = mode === 'video' ? VIDEO_OUTCOMES : IMAGE_OUTCOMES;
    const imageNeedsReference = mode === 'image' && Boolean(selectedModelInfo?.isIdentityModel);
    const hasIdentityReference = Boolean(effectiveRefImage || activePersona.referenceImage || uploadedAvatarImage);
    const hasSelectedGenerator = mode === 'talking-avatar' || (mode === 'image' ? Boolean(selectedModel) : Boolean(selectedVideoModel));
    const canGenerate = Boolean(prompt.trim()) && hasSelectedGenerator && (!imageNeedsReference || hasIdentityReference);
    const hasAvatarSource = Boolean(selectedAvatarSource || activePersona.avatar || (activePersona as any).heygenAvatarId);

    const openFineTune = () => {
      setSimpleDetailsOpen(true);
      window.setTimeout(() => document.getElementById('advanced-creation-controls')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    return (
      <GuidedCreationWorkspace
        mode={mode as 'image' | 'video' | 'talking-avatar'}
        onModeChange={updateMode}
        onEnhance={() => nav.push({ view: 'intelligence', params: { initialTool: 'upscaler' } })}
        outcomes={outcomes}
        outcome={selectedOutcome}
        onOutcomeChange={setSelectedOutcome}
        prompt={prompt}
        onPromptChange={value => {
          if (mode === 'image') setImagePrompt(value);
          else if (mode === 'video') setVideoPrompt(value);
          else setAvatarScript(value);
        }}
        promptLabel={mode === 'talking-avatar' ? 'What should the avatar say?' : 'Describe what you want to create'}
        promptPlaceholder={mode === 'image'
          ? 'Example: A cinematic portrait at golden hour, natural skin, luxury editorial styling…'
          : mode === 'video'
            ? 'Example: A slow camera push-in as the subject turns toward the sunset…'
            : 'Write the words your avatar should say…'}
        format={format}
        formatOptions={formatOptions}
        onFormatChange={value => {
          if (mode === 'image') setSelectedAspectRatio(value);
          else if (mode === 'video') setSelectedVideoAspectRatio(value);
          else setSelectedAvatarFraming(value);
        }}
        personas={personas}
        selectedPersonaId={localPersonaId}
        onPersonaChange={personaId => {
          setLocalPersonaId(personaId);
          if (mode === 'video') setVideoSourcePersonaId(personaId);
          if (personaId !== 'none') onSelectPersona(personaId);
        }}
        estimate={estimate}
        timeEstimate={mode === 'video' ? 'Usually 1–4 minutes' : mode === 'talking-avatar' ? 'Usually 1–3 minutes' : 'Usually 10–45 seconds'}
        isGenerating={isGenerating}
        canGenerate={canGenerate}
        actionLabel={mode === 'image' ? 'Generate image' : mode === 'video' ? 'Generate video' : hasAvatarSource ? 'Generate avatar' : 'Continue setup'}
        onGenerate={() => {
          if (mode === 'image') void handleImageGenerate();
          else if (mode === 'video') void handleVideoGenerate();
          else if (!hasAvatarSource) openFineTune();
          else void handleGenerateTalkingAvatar();
        }}
        fineTuneOpen={simpleDetailsOpen}
        onToggleFineTune={() => {
          if (simpleDetailsOpen) setSimpleDetailsOpen(false);
          else openFineTune();
        }}
      />
    );
  };

  const usesGuidedWorkspace = !isPro && ['image', 'video', 'talking-avatar'].includes(mode);
  const hasGuidedOutput = mode === 'image'
    ? Boolean(imageResult || isGenerating || isProcessing)
    : mode === 'video'
      ? Boolean(videoResult || isGenerating || isExtending)
      : Boolean(talkingAvatarResult || isGenerating);
  const showDetailedCreationControls = !usesGuidedWorkspace || simpleDetailsOpen || hasGuidedOutput;
  const isCapabilityWorkspace = Boolean(
    subView && ['image', 'video', 'talking-avatar', 'voice', 'stitcher'].includes(subView),
  );
  const workspaceMeta: Record<string, { title: string; description: string }> = {
    image: {
      title: 'Image Studio',
      description: 'Generate polished images with optional persona identity lock.',
    },
    video: {
      title: 'Video Studio',
      description: 'Turn a prompt or reference image into cinematic motion.',
    },
    'talking-avatar': {
      title: 'Talking Avatar Studio',
      description: 'Combine a face, script, and voice into a speaking avatar.',
    },
    voice: {
      title: 'Voice & Audio Studio',
      description: 'Create voiceovers, use saved voices, or clone a new voice.',
    },
    stitcher: {
      title: 'Video Editor',
      description: 'Stitch scenes together and shape them into one final video.',
    },
  };
  const activeWorkspaceMeta = workspaceMeta[mode] || {
    title: 'Create Studio',
    description: 'Build your next AI-powered asset.',
  };

  return (
    <div className="flex-1 bg-[var(--bg-base)] text-white p-4 max-w-full mx-auto w-full selection:bg-emerald-500/30 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
      
      {/* ── CREATE HUB HEADER ── */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 px-1 border-b border-[#E7C477]/10 pb-3">
        <div>
          {isCapabilityWorkspace && (
            <button
              type="button"
              onClick={() => nav.replace({ view: 'create' })}
              className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--gold-border-active)] bg-[var(--gold-bg-subtle)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-bright)] transition-colors hover:bg-[var(--gold-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            >
              <ArrowLeft size={13} />
              All creation tools
            </button>
          )}
          <h1 className="text-2xl md:text-3xl font-serif text-[#F5F1E8] tracking-tight flex items-center gap-2">
            {isCapabilityWorkspace ? activeWorkspaceMeta.title : 'Create Studio'} <span className="text-[#E7C477] text-lg">✨</span>
          </h1>
          <p className="text-xs text-[#8C909A] mt-0.5 max-w-3xl font-sans">
            {isCapabilityWorkspace
              ? activeWorkspaceMeta.description
              : 'Choose what you want to make, then use the guided workflow or open Pro controls for every model and fine-tuning option.'}
          </p>
        </div>
        <ProModeToggle isPro={isPro} onToggle={setIsPro} />
      </div>

      {!isCapabilityWorkspace && (
        <QuickStartHub
          activeCapability={(['image', 'video', 'talking-avatar', 'voice', 'stitcher'] as string[]).includes(mode)
            ? mode as CreationCapabilityId
            : 'image'}
          onSelectCapability={handleSelectCapability}
        />
      )}

      {isCapabilityWorkspace && (
        <div id="creation-workspace">
          {renderGuidedCreationWorkspace()}
        </div>
      )}

      {globalError && !globalError.includes('Failed query:') && !globalError.includes('DrizzleQueryError') && (
        <div className="mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-300">{globalError}</p>
        </div>
      )}

      {/* ── MODE RENDERING ── */}
      <div
        id="advanced-creation-controls"
        className={`flex-1 relative flex-col scroll-mt-4 ${isCapabilityWorkspace && showDetailedCreationControls ? 'flex' : 'hidden'}`}
      >
        {mode === 'image' && renderImageMode()}
        {mode === 'video' && renderVideoMode()}
        {mode === 'talking-avatar' && renderTalkingAvatarMode()}
        {mode === 'voice' && <VoiceView persona={activePersona} personas={personas} onSelectPersona={onSelectPersona} nav={nav} billingInfo={billingInfo} />}
        {mode === 'stitcher' && <VideoStitcher persona={activePersona} personas={personas} onSelectPersona={onSelectPersona} onUpdatePersonas={setPersonas} />}
      </div>



      {isWebcamCreatorOpen && (
        <WebcamAvatarCreator
          isOpen={isWebcamCreatorOpen}
          onClose={() => setIsWebcamCreatorOpen(false)}
          personaName={activePersona.name || 'My Persona'}
          onComplete={handleWebcamCreatorComplete}
        />
      )}

      {/* Fullscreen Enlarged Image Lightbox Modal (Edge-to-Edge True Screen Fill) */}
      {lightboxImageUrl && (
        <div 
          className="fixed inset-0 z-[999999] bg-black/98 w-screen h-screen flex items-center justify-center p-0 m-0 overflow-hidden animate-fadeIn"
          onClick={() => setLightboxImageUrl(null)}
        >
          {/* Top Floating Action Bar */}
          <div 
            className="absolute top-4 right-4 sm:right-6 flex items-center gap-2.5 z-[1000000] bg-zinc-950/90 backdrop-blur-xl border border-white/20 p-2 rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex bg-white/10 p-1 rounded-xl border border-white/10 gap-1">
              <button
                onClick={() => setLightboxZoomMode('fill')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${lightboxZoomMode === 'fill' ? 'bg-[var(--accent-primary)] text-[#15120b] shadow' : 'text-slate-300 hover:text-white'}`}
                title="Fill Entire Screen"
              >
                🖼️ Fill Screen
              </button>
              <button
                onClick={() => setLightboxZoomMode('fit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${lightboxZoomMode === 'fit' ? 'bg-[var(--accent-primary)] text-[#15120b] shadow' : 'text-slate-300 hover:text-white'}`}
                title="Fit Aspect Ratio"
              >
                📐 Fit Aspect
              </button>
              <button
                onClick={() => setLightboxZoomMode('zoom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${lightboxZoomMode === 'zoom' ? 'bg-[var(--accent-primary)] text-[#15120b] shadow' : 'text-slate-300 hover:text-white'}`}
                title="150% Super Zoom"
              >
                🔍 150% Zoom
              </button>
            </div>

            <button
              onClick={() => downloadFile(lightboxImageUrl, 'png')}
              className="px-4 py-2 rounded-xl btn-gold-primary font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download HD
            </button>
            <button
              onClick={() => setLightboxImageUrl(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all border border-white/15 cursor-pointer"
              title="Close (ESC)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Top Left Title Badge */}
          <div 
            className="absolute top-4 left-4 sm:left-6 flex items-center gap-2 z-[1000000] bg-zinc-950/90 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-2xl shadow-2xl pointer-events-none"
          >
            <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
            <span className="text-xs font-black text-white uppercase tracking-wider">ByteDance SeeDream 5.0 Pro HD</span>
          </div>

          {/* 100% Edge-to-Edge Max Display Image */}
          <div className="w-screen h-screen flex items-center justify-center p-0 m-0 overflow-hidden">
            <img
              src={lightboxImageUrl}
              alt="Enlarged Visual"
              className={`select-none transition-all duration-300 ${
                lightboxZoomMode === 'fill' 
                  ? 'w-screen h-screen object-cover shadow-2xl scale-[1.02]' 
                  : lightboxZoomMode === 'zoom'
                  ? 'w-screen h-screen object-cover scale-150 cursor-grab active:cursor-grabbing shadow-2xl'
                  : 'max-w-[98vw] max-h-[98vh] w-auto h-auto object-contain drop-shadow-[0_0_60px_rgba(0,0,0,0.9)] rounded-xl'
              }`}
            />
          </div>

          {/* Bottom Center Floating Hint Pill */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-zinc-950/90 backdrop-blur-xl border border-white/20 text-xs text-zinc-300 font-semibold shadow-2xl z-[1000000] pointer-events-none">
            Mode: <strong className="text-white uppercase">{lightboxZoomMode}</strong> • Click anywhere or press <kbd className="px-2 py-0.5 rounded bg-white/20 text-white font-mono text-xs ml-1">ESC</kbd> to exit full screen
          </div>
        </div>
      )}

      {/* Fullscreen Enlarged Video Lightbox Modal (Edge-to-Edge True Screen Fill) */}
      {lightboxVideoUrl && (
        <div 
          className="fixed inset-0 z-[999999] bg-black/98 w-screen h-screen flex items-center justify-center p-0 m-0 overflow-hidden animate-fadeIn"
          onClick={() => setLightboxVideoUrl(null)}
        >
          {/* Top Floating Action Bar */}
          <div 
            className="absolute top-4 right-4 sm:right-6 flex items-center gap-2.5 z-[1000000] bg-zinc-950/90 backdrop-blur-xl border border-white/20 p-2 rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => downloadFile(lightboxVideoUrl, 'mp4')}
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download Video
            </button>
            <button
              onClick={() => setLightboxVideoUrl(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all border border-white/15 cursor-pointer"
              title="Close (ESC)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Top Left Title Badge */}
          <div 
            className="absolute top-4 left-4 sm:left-6 flex items-center gap-2 z-[1000000] bg-zinc-950/90 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-2xl shadow-2xl pointer-events-none"
          >
            <Film className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">Fullscreen Video Preview</span>
          </div>

          {/* 100% Edge-to-Edge Max Display Video */}
          <div className="w-screen h-screen flex items-center justify-center p-4 m-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <video
              src={lightboxVideoUrl}
              controls
              autoPlay
              loop
              className="max-w-[96vw] max-h-[92vh] w-auto h-auto object-contain drop-shadow-[0_0_60px_rgba(244,63,94,0.3)] rounded-2xl border border-white/10"
            />
          </div>

          {/* Bottom Center Floating Hint Pill */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-zinc-950/90 backdrop-blur-xl border border-white/20 text-xs text-zinc-300 font-semibold shadow-2xl z-[1000000] pointer-events-none">
            Press <kbd className="px-2 py-0.5 rounded bg-white/20 text-white font-mono text-xs ml-1">ESC</kbd> or click outside to exit full screen
          </div>
        </div>
      )}

      {/* ── LUXURY AI MODEL SELECTION MODAL ── */}
      {isModelModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#161618] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#1E1E22]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E7C477]/15 border border-[#E7C477]/30 flex items-center justify-center text-[#F2D58D] shadow-md">
                  <Cpu size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-serif tracking-tight">Select AI Generation Model</h3>
                  <p className="text-[10px] text-slate-400">Choose from 130+ photorealistic, flux, and ultra-fast AI image engines</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModelModalOpen(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Bar & Category Filter Tabs */}
            <div className="p-3 bg-[#08080A] border-b border-white/10 space-y-2.5">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#E7C477]" />
                <input
                  type="text"
                  value={modelSearchQuery}
                  onChange={e => setModelSearchQuery(e.target.value)}
                  placeholder="Search models by name, provider, feature (e.g. Flux, Imagen, Fast, Uncensored)..."
                  className="w-full bg-[#161618] border border-white/10 rounded-xl pl-10 pr-9 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#E7C477] transition-all"
                />
                {modelSearchQuery && (
                  <button 
                    onClick={() => setModelSearchQuery('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-[10px] font-bold">
                {[
                  { id: 'all', label: `All Models (${models.length})` },
                  { id: 'wiro', label: '🌐 Wiro AI' },
                  { id: 'runware', label: '⚡ Runware (Sub-Second)' },
                  { id: 'featured', label: '⭐ Featured' },
                  { id: 'flux', label: '🔥 Flux & Recraft' },
                  { id: 'google', label: '✨ Google & OpenAI' },
                  { id: 'wavespeed', label: '🚀 Wavespeed' },
                  { id: 'uncensored', label: '🌶️ Uncensored' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setModelCategoryFilter(tab.id as any)}
                    className={`px-3 py-1 rounded-xl transition-all border whitespace-nowrap cursor-pointer ${
                      modelCategoryFilter === tab.id
                        ? 'btn-gold-primary text-black font-bold shadow-md'
                        : 'bg-[#161618] border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Cards Grid */}
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0E0E10]">
              {modelsLoading ? (
                <div className="col-span-2 py-12 text-center flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-[#E7C477] animate-spin" />
                  <span className="text-xs text-slate-400 font-medium">Loading AI Models...</span>
                </div>
              ) : filteredModels.length === 0 ? (
                <div className="col-span-2 py-12 text-center flex flex-col items-center justify-center gap-2">
                  <AlertCircle className="w-6 h-6 text-slate-500" />
                  <span className="text-xs text-slate-400 font-medium">No models match "{modelSearchQuery}"</span>
                  <button onClick={() => { setModelSearchQuery(''); setModelCategoryFilter('all'); }} className="text-xs text-[#E7C477] underline font-bold mt-1">Reset Filters</button>
                </div>
              ) : (
                filteredModels.map(m => {
                  const isSelected = selectedModel === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setIsModelModalOpen(false);
                        toast.success(`Selected model: ${m.name}`);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 group ${
                        isSelected
                          ? 'bg-[#1E1E22] border-[#E7C477] ring-2 ring-[#E7C477]/30 shadow-xl'
                          : 'bg-[#141416] border-white/10 hover:border-white/30 hover:bg-[#1E1E22]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-[#E7C477] bg-[#E7C477]' : 'border-white/30 group-hover:border-white/60'}`}>
                            {isSelected && <Check size={11} className="text-black stroke-[3]" />}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                              {m.name}
                              {m.nsfw && <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">🔞</span>}
                            </h4>
                            <span className="text-[9px] text-slate-400 font-medium">{m.provider || 'AI Engine'}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#F2D58D] bg-[#E7C477]/10 px-2 py-0.5 rounded-lg border border-[#E7C477]/20 shrink-0">
                          {m.price > 0 ? (billingInfo?.isCreator ? `$${m.price.toFixed(3)}` : `${m.price} credits`) : 'Free'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{m.description || 'High-precision photorealistic AI image generation model.'}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <AssetPickerModal
        isOpen={isCreateAssetPickerOpen}
        onClose={() => setIsCreateAssetPickerOpen(false)}
        onSelectAsset={(url) => {
          if (createAssetPickerCallback) createAssetPickerCallback(url);
        }}
        title={createAssetPickerTitle}
        currentPersona={persona}
      />
    </div>
  );
}
