import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  Copy,
  Sparkles,
  Image as ImageIcon,
  X,
  Download,
  RefreshCw,
  Layout,
  Shirt,
  MapPin,
  Smile,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  Cpu,
  Pencil,
  ArrowUpCircle,
  History,
  Upload,
  Video,
  Film,
  Maximize2,
  User,
  Trees,
  Palette,
  Zap,
  Lock,
  LayoutGrid,
  SlidersHorizontal,
} from 'lucide-react';
import { Persona, GeneratedImage } from '../types';
import {
  generateImage,
  generateVideo,
  fetchAllModelTypes,
  editImage,
  upscaleImage,
  canUseReference,
  enhancePrompt,
  type ModelInfo,
  type GenerateImageResult,
} from '../services/imageService';
import { api } from '../services/apiService';

interface VisualGeneratorProps {
  persona: Persona;
  onClose: () => void;
  onSaveImage: (image: GeneratedImage) => void;
}

const NONE = 'None';

const ENVIRONMENTS = [
  NONE, 'Luxury Hotel', 'Modern Apartment', 'Rooftop Lounge', 'Beach Resort',
  'Yacht Deck', 'Upscale Restaurant', 'Private Gym', 'Beauty Studio',
  'Dental Office', 'Creator Studio', 'City Street', 'Penthouse'
];

const OUTFITS = [
  NONE, 'Casual Chic', 'Luxury Evening', 'Business Professional', 'Fitness Wear',
  'Medical Scrubs', 'Edgy Streetwear', 'Glamorous Gown', 'Home Lounge'
];

const FRAMING = [
  NONE, 'Portrait', 'Selfie Style', 'Full Body', 'Half Body', 'Candid', 'Cinematic'
];

const MOODS = [
  NONE, 'Confident', 'Friendly', 'Thoughtful', 'Playful', 'Professional', 'Seductive'
];

const ASPECT_RATIOS = [
  { value: '1:1',  label: '1:1  — Square' },
  { value: '9:16', label: '9:16 — Portrait (Story/Reel)' },
  { value: '16:9', label: '16:9 — Landscape (YouTube)' },
  { value: '4:5',  label: '4:5  — Feed Portrait' },
  { value: '5:4',  label: '5:4  — Feed Landscape' },
  { value: '2:3',  label: '2:3  — Editorial' },
  { value: '3:2',  label: '3:2  — Wide' },
  { value: '21:9', label: '21:9 — Cinematic' },
];

const PICKER_MODE_KEY = 'vg_picker_mode';

type PickerMode = 'by-model' | 'by-goal';
type GoalKey = 'portrait' | 'lifestyle' | 'artistic' | 'quick' | 'uncensored';

interface GoalCard {
  key: GoalKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  nsfw?: boolean;
}

const GOAL_CARDS: GoalCard[] = [
  {
    key: 'portrait',
    label: 'Portrait photo',
    description: 'Consistent face, photorealistic',
    icon: <User className="w-5 h-5" />,
  },
  {
    key: 'lifestyle',
    label: 'Lifestyle scene',
    description: 'Full scene, cinematic quality',
    icon: <Trees className="w-5 h-5" />,
  },
  {
    key: 'artistic',
    label: 'Artistic / stylized',
    description: 'Anime, art, or stylized look',
    icon: <Palette className="w-5 h-5" />,
  },
  {
    key: 'quick',
    label: 'Quick preview',
    description: 'Fast and free',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    key: 'uncensored',
    label: 'Uncensored',
    description: 'Adult / no restrictions',
    icon: <span className="text-base leading-none">🔞</span>,
    nsfw: true,
  },
];

function pickModelForGoal(goal: GoalKey, models: ModelInfo[]): string | null {
  if (models.length === 0) return null;
  let match: ModelInfo | undefined;
  switch (goal) {
    case 'portrait':
      match = models.find(m => m.isIdentityModel);
      break;
    case 'lifestyle': {
      const lower = (m: ModelInfo) => (m.name + m.id).toLowerCase();
      match = models.find(m => !m.isIdentityModel && (lower(m).includes('flux') || lower(m).includes('realistic') || lower(m).includes('photo')));
      break;
    }
    case 'artistic': {
      const lower = (m: ModelInfo) => (m.name + m.id).toLowerCase();
      match = models.find(m => lower(m).includes('art') || lower(m).includes('anime') || lower(m).includes('xl'));
      break;
    }
    case 'quick':
      match = models.find(m => m.price === 0 && !m.id.startsWith('google:'));
      if (!match) match = models.find(m => m.price === 0);
      break;
    case 'uncensored':
      match = models.find(m => m.nsfw === true);
      break;
  }
  return match?.id ?? models[0]?.id ?? null;
}

type PostGenAction = null | 'edit' | 'upscale';

interface ImageVersion {
  imageUrl: string;
  model: string;
  promptUsed: string;
  label: string;
}

type GenMode = 'image' | 'video';

export const VisualGenerator: React.FC<VisualGeneratorProps> = ({ persona, onClose, onSaveImage }) => {
  const [genMode, setGenMode] = useState<GenMode>('image');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState(ENVIRONMENTS[0]);
  const [selectedOutfit, setSelectedOutfit] = useState(OUTFITS[0]);
  const [selectedFraming, setSelectedFraming] = useState(FRAMING[0]);
  const [selectedMood, setSelectedMood] = useState(MOODS[0]);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(ASPECT_RATIOS[0].value);
  const [result, setResult] = useState<GenerateImageResult | null>(null);
  const [multiResults, setMultiResults] = useState<GenerateImageResult[]>([]);
  const [selectedVariation, setSelectedVariation] = useState(0);
  const [imageCount, setImageCount] = useState(1);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [imageHistory, setImageHistory] = useState<ImageVersion[]>([]);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(0);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [editModels, setEditModels] = useState<ModelInfo[]>([]);
  const [upscaleModels, setUpscaleModels] = useState<ModelInfo[]>([]);
  const [videoModels, setVideoModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>('');
  const [modelsLoading, setModelsLoading] = useState(true);
  const [pickerMode, setPickerMode] = useState<PickerMode>(
    () => (localStorage.getItem(PICKER_MODE_KEY) as PickerMode | null) ?? 'by-model'
  );
  const [selectedGoal, setSelectedGoal] = useState<GoalKey | null>(null);

  const handlePickerMode = (mode: PickerMode) => {
    setPickerMode(mode);
    localStorage.setItem(PICKER_MODE_KEY, mode);
    if (mode === 'by-model') setSelectedGoal(null);
  };

  const handleGoalSelect = (goal: GoalKey) => {
    const matched = pickModelForGoal(goal, models);
    if (!matched) return;
    setSelectedGoal(goal);
    setSelectedModel(matched);
  };

  const [postAction, setPostAction] = useState<PostGenAction>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editAdditionalImage, setEditAdditionalImage] = useState<string | null>(null);
  const [editAdditionalImageName, setEditAdditionalImageName] = useState<string | null>(null);
  const [selectedEditModel, setSelectedEditModel] = useState('');
  const [selectedUpscaleModel, setSelectedUpscaleModel] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [videoResult, setVideoResult] = useState<{ videoUrl: string; model: string } | null>(null);
  const [videoSourceImage, setVideoSourceImage] = useState<string | null>(null);
  const [videoSourceImageName, setVideoSourceImageName] = useState<string | null>(null);
  const [imageWeight, setImageWeight] = useState(0.35);
  const [naturalLook, setNaturalLook] = useState(persona.naturalLook ?? true);
  const [identityLock, setIdentityLock] = useState(persona.identityLock ?? true);

  const [overrideRefImages, setOverrideRefImages] = useState<{ id: string; url: string; name: string }[]>([]);
  const [promptCopied, setPromptCopied] = useState(false);
  const overrideRefInputRef = useRef<HTMLInputElement>(null);

  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [isEnhancingEditPrompt, setIsEnhancingEditPrompt] = useState(false);
  const [isEnhancingVideoPrompt, setIsEnhancingVideoPrompt] = useState(false);

  const handleEnhance = async (
    value: string,
    setValue: (v: string) => void,
    setLoading: (v: boolean) => void
  ) => {
    if (!value.trim() || setLoading === null) return;
    setLoading(true);
    try {
      const enhanced = await enhancePrompt(value);
      setValue(enhanced);
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
    }
  };

  const handleNaturalLookToggle = () => {
    const next = !naturalLook;
    setNaturalLook(next);
    api.personas.update({ ...persona, naturalLook: next, identityLock }).catch(() => {});
  };

  const handleIdentityLockToggle = () => {
    const next = !identityLock;
    setIdentityLock(next);
    api.personas.update({ ...persona, naturalLook, identityLock: next }).catch(() => {});
  };

  const allRefImages: string[] = [
    ...(persona.referenceImage ? [persona.referenceImage] : []),
    ...(persona.additionalReferenceImages ?? []),
    ...overrideRefImages.map(img => img.url),
  ];
  const hasRefImage = allRefImages.length > 0;
  const activeRefImage = allRefImages[0] || null;

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    fetchAllModelTypes()
      .then(({ models: m, editModels: em, upscaleModels: um, videoModels: vm }) => {
        setModels(m);
        setEditModels(em);
        setUpscaleModels(um);
        setVideoModels(vm);
        const preferred = hasRefImage
          ? m.find(x => x.isIdentityModel) || m.find(x => x.hasEditVariant) || m[0]
          : m[0];
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
    sortedModels.forEach((m) => {
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
    editModels.forEach((m) => {
      if (!groups[m.provider]) groups[m.provider] = [];
      groups[m.provider].push(m);
    });
    return groups;
  }, [editModels]);

  const groupedUpscaleModels = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    upscaleModels.forEach((m) => {
      if (!groups[m.provider]) groups[m.provider] = [];
      groups[m.provider].push(m);
    });
    return groups;
  }, [upscaleModels]);

  const groupedVideoModels = useMemo(() => {
    const t2v: Record<string, ModelInfo[]> = {};
    const i2v: Record<string, ModelInfo[]> = {};
    videoModels.forEach((m) => {
      const target = m.type === 'image-to-video' ? i2v : t2v;
      if (!target[m.provider]) target[m.provider] = [];
      target[m.provider].push(m);
    });
    return { t2v, i2v };
  }, [videoModels]);

  const selectedVideoModelInfo = useMemo(() => videoModels.find(m => m.id === selectedVideoModel), [videoModels, selectedVideoModel]);
  const isI2VModel = selectedVideoModel.startsWith('wavespeed-i2v:');

  const selectedModelInfo = useMemo(() => models.find(m => m.id === selectedModel), [models, selectedModel]);

  const activeVersion = imageHistory[activeHistoryIndex] || null;

  const handleGenerate = async () => {
    if (!selectedModel) return;
    setIsGenerating(true);
    setGlobalError(null);
    setResult(null);
    setMultiResults([]);
    setSelectedVariation(0);
    setImageHistory([]);
    setActiveHistoryIndex(0);
    setPostAction(null);
    setActionError(null);

    try {
      const primaryRef = allRefImages[0] || undefined;
      const extraRefs = allRefImages.slice(1);
      const personaForGen = primaryRef
        ? { ...persona, referenceImage: primaryRef }
        : persona;
      const genResult = await generateImage({
        persona: personaForGen,
        modelId: selectedModel,
        environment: selectedEnv,
        outfitStyle: selectedOutfit,
        framing: selectedFraming,
        mood: selectedMood,
        additionalInstructions: prompt,
        aspectRatio: selectedAspectRatio,
        additionalImages: extraRefs.length > 0 ? extraRefs : undefined,
        naturalLook,
        identityLock,
        count: imageCount,
        ...(hasRefImage && selectedModelInfo?.hasEditVariant && selectedModelInfo.editHasStrengthControl ? { imageWeight } : {}),
      });
      if (Array.isArray(genResult)) {
        setMultiResults(genResult);
        setSelectedVariation(0);
        setResult(genResult[0]);
        const version: ImageVersion = {
          imageUrl: genResult[0].imageUrl,
          model: genResult[0].model,
          promptUsed: genResult[0].promptUsed || prompt || '',
          label: 'Variation 1',
        };
        setImageHistory([version]);
        setActiveHistoryIndex(0);
      } else {
        setResult(genResult);
        const version: ImageVersion = {
          imageUrl: genResult.imageUrl,
          model: genResult.model,
          promptUsed: genResult.promptUsed || prompt || '',
          label: 'Original',
        };
        setImageHistory([version]);
        setActiveHistoryIndex(0);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Generation failed. Please try again.');
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
      setResult(newResult);
      const version: ImageVersion = {
        imageUrl: data.imageUrl,
        model: data.model,
        promptUsed: editPrompt,
        label: `Edit ${imageHistory.filter(v => v.label.startsWith('Edit')).length + 1}`,
      };
      const newHistory = [...imageHistory, version];
      setImageHistory(newHistory);
      setActiveHistoryIndex(newHistory.length - 1);
      setPostAction(null);
      setEditPrompt('');
      setEditAdditionalImage(null);
      setEditAdditionalImageName(null);
    } catch (err: any) {
      setActionError(err.message || 'Editing failed.');
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
      setResult(newResult);
      const version: ImageVersion = {
        imageUrl: data.imageUrl,
        model: data.model,
        promptUsed: activeVersion.promptUsed,
        label: `Upscale ${imageHistory.filter(v => v.label.startsWith('Upscale')).length + 1}`,
      };
      const newHistory = [...imageHistory, version];
      setImageHistory(newHistory);
      setActiveHistoryIndex(newHistory.length - 1);
      setPostAction(null);
    } catch (err: any) {
      setActionError(err.message || 'Upscaling failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectVersion = (index: number) => {
    setActiveHistoryIndex(index);
    const version = imageHistory[index];
    if (version) {
      setResult({ imageUrl: version.imageUrl, model: version.model, promptUsed: version.promptUsed });
    }
  };

  const handleSave = () => {
    if (!activeVersion?.imageUrl || isSaved) return;
    const image: GeneratedImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: activeVersion.imageUrl,
      prompt: activeVersion.promptUsed || prompt || '',
      timestamp: Date.now(),
      environment: selectedEnv,
      outfit: selectedOutfit,
      framing: selectedFraming,
      model: activeVersion.model,
    };
    onSaveImage(image);
    setIsSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setIsSaved(false), 2500);
  };

  const handleGenerateVideo = async () => {
    if (!selectedVideoModel || !prompt.trim()) return;
    setIsGenerating(true);
    setGlobalError(null);
    setVideoResult(null);

    try {
      const sourceImg = isI2VModel
        ? (videoSourceImage || persona.referenceImage || null)
        : undefined;

      if (isI2VModel && !sourceImg) {
        throw new Error('Image-to-video models require a source image. Upload one or set a persona reference image.');
      }

      const data = await generateVideo(prompt, selectedVideoModel, sourceImg || undefined, identityLock, naturalLook);
      setVideoResult(data);
    } catch (err: any) {
      setGlobalError(err.message || 'Video generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveVideo = () => {
    if (!videoResult?.videoUrl) return;
    const media: GeneratedImage = {
      id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: videoResult.videoUrl,
      prompt: prompt || '',
      timestamp: Date.now(),
      model: videoResult.model,
      mediaType: 'video',
    };
    onSaveImage(media);
    onClose();
  };

  const downloadImage = () => {
    if (!activeVersion?.imageUrl) return;
    const a = document.createElement('a');
    a.href = activeVersion.imageUrl;
    a.download = `${persona.name.replace(/\s+/g, '_')}_${Date.now()}.png`;
    a.click();
  };

  const downloadVideo = () => {
    if (!videoResult?.videoUrl) return;
    const a = document.createElement('a');
    a.href = videoResult.videoUrl;
    a.download = `${persona.name.replace(/\s+/g, '_')}_${Date.now()}.mp4`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-[var(--bg-surface)] rounded-2xl overflow-hidden border border-[var(--border-subtle)] shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface)]/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden">
              {persona.referenceImage ? (
                <img src={persona.referenceImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-white">Visual Studio</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {genMode === 'image' ? `${models.length} image models` : `${videoModels.length} video models`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-elevated)] rounded-full transition-colors">
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="max-h-[82vh] overflow-y-auto">
          <div className="p-6 space-y-5">

            <div className="flex bg-[var(--bg-elevated)] rounded-xl p-1 gap-1">
              <button
                onClick={() => { setGenMode('image'); setGlobalError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  genMode === 'image'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-overlay)]'
                }`}
              >
                <ImageIcon className="w-4 h-4" /> Image
              </button>
              <button
                onClick={() => { setGenMode('video'); setGlobalError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  genMode === 'video'
                    ? 'bg-gradient-to-r from-pink-600 to-orange-500 text-white shadow-lg'
                    : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-overlay)]'
                }`}
              >
                <Video className="w-4 h-4" /> Video
              </button>
            </div>

            {genMode === 'image' && (<>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
                  <Cpu className="w-3 h-3" /> AI Model
                </label>
                <div className="flex items-center rounded-lg overflow-hidden border border-[var(--border-default)] text-[10px] font-semibold">
                  <button
                    onClick={() => handlePickerMode('by-model')}
                    className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${pickerMode === 'by-model' ? 'bg-purple-600 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white'}`}
                  >
                    <SlidersHorizontal className="w-3 h-3" /> By Model
                  </button>
                  <button
                    onClick={() => handlePickerMode('by-goal')}
                    className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${pickerMode === 'by-goal' ? 'bg-purple-600 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white'}`}
                  >
                    <LayoutGrid className="w-3 h-3" /> By Goal
                  </button>
                </div>
              </div>
              {modelsLoading ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-elevated)] rounded-xl text-sm text-[var(--text-secondary)]">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading models...
                </div>
              ) : pickerMode === 'by-goal' ? (
                <div className="grid grid-cols-2 gap-2">
                  {GOAL_CARDS.map((card) => {
                    const matched = pickModelForGoal(card.key, models);
                    const isDisabled = !matched;
                    const isActive = selectedGoal === card.key;
                    return (
                      <button
                        key={card.key}
                        onClick={() => !isDisabled && handleGoalSelect(card.key)}
                        disabled={isDisabled}
                        title={isDisabled ? 'No matching model available' : undefined}
                        className={`relative flex flex-col items-start gap-1.5 px-3 py-3 rounded-xl border text-left transition-all ${
                          isActive
                            ? 'border-purple-500 bg-purple-500/15 ring-1 ring-purple-500/60'
                            : isDisabled
                              ? 'border-[var(--border-default)] bg-[var(--bg-elevated)]/40 opacity-40 cursor-not-allowed'
                              : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-purple-400/60 hover:bg-purple-500/5 cursor-pointer'
                        }`}
                      >
                        {isDisabled && (
                          <Lock className="absolute top-2 right-2 w-3 h-3 text-[var(--text-tertiary)]" />
                        )}
                        <span className={`${isActive ? 'text-purple-300' : 'text-[var(--text-secondary)]'}`}>
                          {card.icon}
                        </span>
                        <div>
                          <p className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                            {card.label}
                          </p>
                          <p className="text-[10px] text-[var(--text-tertiary)] leading-tight mt-0.5">
                            {card.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none pr-10"
                  >
                    {Object.entries(groupedModels).map(([provider, providerModels]) => (
                      <optgroup key={provider} label={provider}>
                        {providerModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.isIdentityModel ? '★ ' : ''}{m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}{m.nsfw ? ' 🔞' : ''}{hasRefImage && !canUseReference(m, models) ? ' ⚠ No ref support' : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
                </div>
              )}
              {selectedModelInfo && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {selectedModelInfo.provider}
                  </span>
                  {hasRefImage && selectedModelInfo.isIdentityModel && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      ★ Face-consistent
                    </span>
                  )}
                  {hasRefImage && canUseReference(selectedModelInfo, models) && !selectedModelInfo.isIdentityModel && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-green-300 border border-green-500/30">
                      Uses reference image
                    </span>
                  )}
                  {hasRefImage && !canUseReference(selectedModelInfo, models) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Text-only — will ignore reference
                    </span>
                  )}
                  {selectedModelInfo.price > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ${selectedModelInfo.price.toFixed(3)}{imageCount > 1 ? ` x${imageCount} = $${(selectedModelInfo.price * imageCount).toFixed(3)}` : ' per image'}
                    </span>
                  )}
                  {selectedModelInfo.nsfw && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      🔞 Uncensored
                    </span>
                  )}
                </div>
              )}
              {hasRefImage && selectedModelInfo?.hasEditVariant && selectedModelInfo.editHasStrengthControl && (
                <div className="mt-3 p-3 bg-[var(--bg-elevated)]/60 rounded-xl border border-[var(--border-default)]/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                      Image Weight
                    </label>
                    <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">
                      {Math.round(imageWeight * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    value={imageWeight}
                    onChange={(e) => setImageWeight(parseFloat(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
                    <span>Same face</span>
                    <span>Creative</span>
                  </div>
                </div>
              )}

              {/* Reference images panel */}
              <div className="mt-3 bg-[var(--bg-elevated)]/60 rounded-xl p-2.5 border border-[var(--border-default)]/50 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                    Reference images {allRefImages.length > 0 && <span className="text-purple-300 ml-1">({allRefImages.length})</span>}
                  </p>
                  {allRefImages.length < 6 && (
                    <button
                      onClick={() => overrideRefInputRef.current?.click()}
                      className="text-[10px] px-2 py-1 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--bg-overlay)] text-[var(--text-primary)] hover:text-white transition-colors font-medium"
                    >
                      + Add photo
                    </button>
                  )}
                </div>
                {allRefImages.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {persona.referenceImage && (
                      <div className="relative">
                        <img src={persona.referenceImage} alt="Persona ref" className="w-16 h-16 rounded-lg object-cover border-2 border-purple-500/60" />
                        <span className="absolute -bottom-1 -right-1 text-[7px] bg-purple-600 text-white rounded px-1 leading-3">Persona</span>
                      </div>
                    )}
                    {overrideRefImages.map(img => (
                      <div key={img.id} className="relative group">
                        <img src={img.url} alt={img.name} className="w-16 h-16 rounded-lg object-cover border border-[var(--border-default)]" />
                        <button
                          onClick={() => setOverrideRefImages(prev => prev.filter(i => i.id !== img.id))}
                          className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-600 hover:bg-rose-500 rounded-full text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                        >×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => overrideRefInputRef.current?.click()}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-[var(--bg-surface)]/50 hover:bg-[var(--bg-overlay)]/50 rounded-lg cursor-pointer transition-colors border border-dashed border-[var(--border-strong)]"
                  >
                    <Upload className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span className="text-xs text-[var(--text-secondary)]">Upload reference photos for consistency</span>
                  </button>
                )}
                {overrideRefImages.length > 0 && (
                  <button
                    onClick={() => setOverrideRefImages([])}
                    className="text-[10px] text-[var(--text-tertiary)] hover:text-rose-400 transition-colors"
                  >
                    Clear uploaded
                  </button>
                )}
              </div>
              <input
                ref={overrideRefInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files) return;
                  Array.from(files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      setOverrideRefImages(prev => [...prev, {
                        id: `or-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
                        url: reader.result as string,
                        name: file.name,
                      }]);
                    };
                    reader.readAsDataURL(file);
                  });
                  e.target.value = '';
                }}
              />
            </div>

            {multiResults.length > 1 && !isGenerating && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">
                  {multiResults.length} Variation{multiResults.length !== 1 ? 's' : ''}{multiResults.length < imageCount ? ` (${imageCount - multiResults.length} failed)` : ''} — tap to select
                </p>
                <div className={`grid gap-2 ${multiResults.length === 2 ? 'grid-cols-2' : multiResults.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {multiResults.map((r, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedVariation(idx);
                        setResult(r);
                        const version: ImageVersion = { imageUrl: r.imageUrl, model: r.model, promptUsed: r.promptUsed || prompt || '', label: `Variation ${idx + 1}` };
                        setImageHistory([version]);
                        setActiveHistoryIndex(0);
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        selectedVariation === idx
                          ? 'border-purple-500 ring-2 ring-purple-500/30 scale-[1.02]'
                          : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <img src={r.imageUrl} alt={`Variation ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded-md">
                        <span className="text-[10px] text-white font-bold">#{idx + 1}</span>
                      </div>
                      <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const a = document.createElement('a');
                            a.href = r.imageUrl;
                            a.download = `variation-${idx + 1}.png`;
                            a.click();
                          }}
                          className="p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-black/80"
                          title="Download"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const image: GeneratedImage = {
                              id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                              url: r.imageUrl,
                              prompt: r.promptUsed || prompt || '',
                              timestamp: Date.now(),
                              environment: selectedEnv,
                              outfit: selectedOutfit,
                              framing: selectedFraming,
                              model: r.model,
                            };
                            onSaveImage(image);
                          }}
                          className="p-1.5 bg-purple-600/80 backdrop-blur-md rounded-lg text-white hover:bg-purple-500"
                          title="Save to library"
                        >
                          <CheckCircle className="w-3 h-3" />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="aspect-square max-h-[400px] rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] overflow-hidden relative group mx-auto w-full max-w-[400px]">
              {isGenerating || isProcessing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
                  <p className="text-xs text-[var(--text-tertiary)] animate-pulse">
                    {isProcessing
                      ? (postAction === 'upscale' ? 'Upscaling...' : 'Editing...')
                      : `Generating${imageCount > 1 ? ` ${imageCount} variations` : ''} with ${selectedModelInfo?.name || 'AI'}...`}
                  </p>
                </div>
              ) : result?.imageUrl ? (
                <>
                  <img src={result.imageUrl} alt="Generated" className="absolute inset-0 w-full h-full object-contain" />
                  <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={downloadImage}
                      className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-black/80 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg">
                    <span className="text-[10px] text-white font-medium">{result.model}{multiResults.length > 1 ? ` (#${selectedVariation + 1})` : ''}</span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="w-12 h-12 text-[var(--text-muted)] opacity-30" />
                  <p className="text-xs text-[var(--text-muted)]">Select a model and generate</p>
                </div>
              )}
            </div>

            {imageHistory.length > 1 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <History className="w-3 h-3 text-[var(--text-tertiary)]" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)]">Version History</span>
                  <span className="text-[10px] text-[var(--text-muted)]">— tap to select, then save</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {imageHistory.map((version, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectVersion(idx)}
                      className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === activeHistoryIndex
                          ? 'border-purple-500 ring-2 ring-purple-500/30 scale-105'
                          : 'border-[var(--border-default)] hover:border-[var(--border-strong)] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={version.imageUrl} alt={version.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5">
                        <span className="text-[8px] text-white font-bold leading-tight block truncate">{version.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {globalError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {globalError}
              </div>
            )}

            {result?.imageUrl && !isProcessing && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaved}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all text-white flex items-center justify-center gap-2 shadow-lg ${isSaved ? 'bg-emerald-600 shadow-emerald-500/20 cursor-default' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-purple-500/20'}`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {isSaved ? 'Saved to Library!' : 'Save to Visual Library'}
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setPostAction(postAction === 'edit' ? null : 'edit'); setActionError(null); }}
                    className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                      postAction === 'edit'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] hover:bg-[var(--bg-overlay)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Image
                  </button>
                  <button
                    onClick={() => { setPostAction(postAction === 'upscale' ? null : 'upscale'); setActionError(null); }}
                    className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                      postAction === 'upscale'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] hover:bg-[var(--bg-overlay)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    Upscale Image
                  </button>
                </div>

                {activeVersion?.promptUsed && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeVersion.promptUsed);
                      setPromptCopied(true);
                      setTimeout(() => setPromptCopied(false), 2000);
                    }}
                    className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] text-[var(--text-primary)] hover:text-white transition-all border border-[var(--border-default)]"
                  >
                    {promptCopied ? <><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Prompt Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Prompt</>}
                  </button>
                )}

                {postAction === 'edit' && (
                  <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/20 space-y-3">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Edit with AI</p>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1 flex items-center gap-1">
                        <Cpu className="w-2.5 h-2.5" /> Edit Model
                      </label>
                      <div className="relative">
                        <select
                          value={selectedEditModel}
                          onChange={(e) => setSelectedEditModel(e.target.value)}
                          className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none pr-8"
                        >
                          {Object.entries(groupedEditModels).map(([provider, providerModels]) => (
                            <optgroup key={provider} label={provider}>
                              {providerModels.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}{m.nsfw ? ' 🔞' : ''}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)]">What to change</label>
                        <button
                          onClick={() => handleEnhance(editPrompt, setEditPrompt, setIsEnhancingEditPrompt)}
                          disabled={isEnhancingEditPrompt || !editPrompt.trim()}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 disabled:opacity-40 transition-all"
                          title="Enhance prompt with Wavespeed AI"
                        >
                          {isEnhancingEditPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          Enhance
                        </button>
                      </div>
                      <textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="e.g. Change background to a beach sunset, add sunglasses, combine with the uploaded image..."
                        className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white min-h-[60px] focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Additional Image (optional)</label>
                      {editAdditionalImage ? (
                        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-xl p-2">
                          <img src={editAdditionalImage} alt="Additional" className="w-10 h-10 rounded-lg object-cover" />
                          <span className="text-xs text-[var(--text-primary)] truncate flex-1">{editAdditionalImageName}</span>
                          <button
                            onClick={() => { setEditAdditionalImage(null); setEditAdditionalImageName(null); }}
                            className="p-1 hover:bg-[var(--bg-overlay)] rounded-lg text-[var(--text-secondary)] hover:text-white transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] rounded-xl cursor-pointer transition-colors border border-dashed border-[var(--border-strong)]">
                          <Upload className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          <span className="text-xs text-[var(--text-secondary)]">Upload background, product, or person to combine</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                setEditAdditionalImage(reader.result as string);
                                setEditAdditionalImageName(file.name);
                              };
                              reader.readAsDataURL(file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                    {actionError && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {actionError}
                      </div>
                    )}
                    <button
                      onClick={handleEdit}
                      disabled={!editPrompt.trim() || !selectedEditModel || isProcessing}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Apply Edit
                    </button>
                  </div>
                )}

                {postAction === 'upscale' && (
                  <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 space-y-3">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Upscale Image</p>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1 flex items-center gap-1">
                        <Cpu className="w-2.5 h-2.5" /> Upscale Model
                      </label>
                      <div className="relative">
                        <select
                          value={selectedUpscaleModel}
                          onChange={(e) => setSelectedUpscaleModel(e.target.value)}
                          className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8"
                        >
                          {Object.entries(groupedUpscaleModels).map(([provider, providerModels]) => (
                            <optgroup key={provider} label={provider}>
                              {providerModels.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}{m.nsfw ? ' 🔞' : ''}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                      </div>
                    </div>
                    {actionError && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {actionError}
                      </div>
                    )}
                    <button
                      onClick={handleUpscale}
                      disabled={!selectedUpscaleModel || isProcessing}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" /> Upscale Now
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Environment
                  </label>
                  <select
                    value={selectedEnv}
                    onChange={(e) => setSelectedEnv(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {ENVIRONMENTS.map(env => <option key={env} value={env}>{env}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
                    <Shirt className="w-3 h-3" /> Outfit
                  </label>
                  <select
                    value={selectedOutfit}
                    onChange={(e) => setSelectedOutfit(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {OUTFITS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
                    <Layout className="w-3 h-3" /> Framing
                  </label>
                  <select
                    value={selectedFraming}
                    onChange={(e) => setSelectedFraming(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {FRAMING.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
                    <Smile className="w-3 h-3" /> Mood
                  </label>
                  <select
                    value={selectedMood}
                    onChange={(e) => setSelectedMood(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
                <Maximize2 className="w-3 h-3" /> Aspect Ratio
              </label>
              <select
                value={selectedAspectRatio}
                onChange={(e) => setSelectedAspectRatio(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
              >
                {ASPECT_RATIOS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Natural Look</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Film grain, candid, no over-retouching</p>
              </div>
              <button
                onClick={handleNaturalLookToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${naturalLook ? 'bg-purple-600' : 'bg-[var(--bg-overlay)]'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${naturalLook ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Identity Lock</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Same exact face, bone structure &amp; features</p>
              </div>
              <button
                onClick={handleIdentityLockToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${identityLock ? 'bg-purple-600' : 'bg-[var(--bg-overlay)]'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${identityLock ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between bg-[var(--bg-elevated)]/60 rounded-xl px-3 py-2 border border-[var(--border-default)]/50">
              <div>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wide">Variations</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Generate multiple images at once</p>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => setImageCount(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      imageCount === n
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase">
                  Additional Instructions (Optional)
                </label>
                <button
                  onClick={() => handleEnhance(prompt, setPrompt, setIsEnhancingPrompt)}
                  disabled={isEnhancingPrompt || !prompt.trim()}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 disabled:opacity-40 transition-all"
                  title="Enhance prompt with Wavespeed AI"
                >
                  {isEnhancingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Enhance
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Holding a coffee cup, direct eye contact, cinematic lighting..."
                className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white min-h-[70px] focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              />
            </div>
            </>
            )}

            {genMode === 'video' && (
            <>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
                <Film className="w-3 h-3" /> Video Model
              </label>
              {modelsLoading ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-elevated)] rounded-xl text-sm text-[var(--text-secondary)]">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading models...
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedVideoModel}
                    onChange={(e) => setSelectedVideoModel(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-pink-500 outline-none appearance-none pr-10"
                  >
                    {Object.keys(groupedVideoModels.t2v).length > 0 && (
                      <optgroup label="Text to Video">
                        {Object.entries(groupedVideoModels.t2v).map(([provider, providerModels]) => (
                          providerModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              [{provider}] {m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}{m.nsfw ? ' 🔞' : ''}
                            </option>
                          ))
                        ))}
                      </optgroup>
                    )}
                    {Object.keys(groupedVideoModels.i2v).length > 0 && (
                      <optgroup label="Image to Video">
                        {Object.entries(groupedVideoModels.i2v).map(([provider, providerModels]) => (
                          providerModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              [{provider}] {m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}{m.nsfw ? ' 🔞' : ''}
                            </option>
                          ))
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
                </div>
              )}
              {selectedVideoModelInfo && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                    {selectedVideoModelInfo.provider}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    isI2VModel
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  }`}>
                    {isI2VModel ? 'Image → Video' : 'Text → Video'}
                  </span>
                  {selectedVideoModelInfo.price > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ${selectedVideoModelInfo.price.toFixed(3)} per video
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="aspect-video max-h-[350px] rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] overflow-hidden relative group mx-auto w-full">
              {isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
                  <p className="text-xs text-[var(--text-tertiary)] animate-pulse">Generating video — this may take a few minutes...</p>
                </div>
              ) : videoResult?.videoUrl ? (
                <>
                  <video
                    src={videoResult.videoUrl}
                    controls
                    autoPlay
                    loop
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg">
                    <span className="text-[10px] text-white font-medium">{videoResult.model}</span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Film className="w-12 h-12 text-[var(--text-muted)] opacity-30" />
                  <p className="text-xs text-[var(--text-muted)]">Select a model and generate</p>
                </div>
              )}
            </div>

            {globalError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {globalError}
              </div>
            )}

            {videoResult?.videoUrl && (
              <div className="flex gap-3">
                <button
                  onClick={handleSaveVideo}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save to Library
                </button>
                <button
                  onClick={downloadVideo}
                  className="py-3 px-4 rounded-xl text-sm font-bold bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] text-white flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}

            {isI2VModel && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3" /> Source Image
                </label>
                {videoSourceImage ? (
                  <div className="flex items-center gap-3 bg-[var(--bg-elevated)] rounded-xl p-3">
                    <img src={videoSourceImage} alt="Source" className="w-14 h-14 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-[var(--text-primary)] truncate block">{videoSourceImageName || 'Uploaded image'}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">Will be animated into video</span>
                    </div>
                    <button
                      onClick={() => { setVideoSourceImage(null); setVideoSourceImageName(null); }}
                      className="p-1.5 hover:bg-[var(--bg-overlay)] rounded-lg text-[var(--text-secondary)] hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : persona.referenceImage ? (
                  <div className="flex items-center gap-3 bg-[var(--bg-elevated)] rounded-xl p-3">
                    <img src={persona.referenceImage} alt="Persona ref" className="w-14 h-14 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-[var(--text-primary)]">Using persona reference image</span>
                      <span className="text-[10px] text-[var(--text-tertiary)] block">Or upload a different image below</span>
                    </div>
                  </div>
                ) : null}
                {!videoSourceImage && (
                  <label className="flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] rounded-xl cursor-pointer transition-colors border border-dashed border-[var(--border-strong)]">
                    <Upload className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span className="text-xs text-[var(--text-secondary)]">
                      {persona.referenceImage ? 'Upload a different source image' : 'Upload source image for video'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          setVideoSourceImage(reader.result as string);
                          setVideoSourceImageName(file.name);
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase">Video Prompt</label>
                <button
                  onClick={() => handleEnhance(prompt, setPrompt, setIsEnhancingVideoPrompt)}
                  disabled={isEnhancingVideoPrompt || !prompt.trim()}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-pink-600/20 hover:bg-pink-600/40 border border-pink-500/30 text-pink-300 disabled:opacity-40 transition-all"
                  title="Enhance prompt with Wavespeed AI"
                >
                  {isEnhancingVideoPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Enhance
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isI2VModel
                  ? 'Describe the motion and action — e.g. "She turns to camera and smiles, hair blowing in the wind"'
                  : 'Describe the full scene — e.g. "A confident woman walks through a modern city at sunset, cinematic slow-mo"'
                }
                className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white min-h-[70px] focus:ring-2 focus:ring-pink-500 outline-none resize-none"
              />
            </div>
            </>
            )}

          </div>
        </div>

        <div className="p-5 bg-[var(--bg-base)] border-t border-[var(--border-subtle)]">
          {genMode === 'image' ? (
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isProcessing || !selectedModel}
            className="w-full bg-white text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-50 text-sm"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating {imageCount > 1 ? `${imageCount} variations` : ''}...</>
            ) : result ? (
              <><RefreshCw className="w-4 h-4" /> Regenerate</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate {imageCount > 1 ? `${imageCount} Images` : 'Image'}</>
            )}
          </button>
          ) : (
          <button
            onClick={handleGenerateVideo}
            disabled={isGenerating || !selectedVideoModel || !prompt.trim()}
            className="w-full bg-gradient-to-r from-pink-600 to-orange-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:from-pink-500 hover:to-orange-400 transition-colors disabled:opacity-50 text-sm"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating Video...</>
            ) : videoResult ? (
              <><RefreshCw className="w-4 h-4" /> Generate New Video</>
            ) : (
              <><Video className="w-4 h-4" /> Generate Video</>
            )}
          </button>
          )}
        </div>
      </div>
    </div>
  );
};
