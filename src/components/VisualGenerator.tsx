import React, { useState, useEffect, useRef, useMemo } from 'react';
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
}
type GenMode = 'image' | 'video';

class VisualGeneratorErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[VisualGenerator Error Catch]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#0B0F17] flex flex-col items-center justify-center text-white z-[9999] p-6 text-center select-none">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
          <h2 className="text-xl font-bold mb-2">Something went wrong in the Studio</h2>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-md">The system encountered an error loading or rendering the workspace. Please copy this error for your support:</p>
          <div className="p-4 bg-[#1E293B] border border-[#334155] rounded-xl text-left max-w-2xl overflow-auto max-h-[300px] mb-6 select-all font-mono text-xs text-rose-300 whitespace-pre-wrap">
            {this.state.error?.stack || this.state.error?.message}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-[#00D4FF] hover:bg-[#00F5C2] text-[#0B0F17] font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-[#00F5C2]/20"
          >
            Reload AI Studio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const VisualGenerator: React.FC<VisualGeneratorProps> = (props) => {
  return (
    <VisualGeneratorErrorBoundary>
      <VisualGeneratorInner {...props} />
    </VisualGeneratorErrorBoundary>
  );
};

const VisualGeneratorInner: React.FC<VisualGeneratorProps> = ({ persona, onClose, onSaveImage }) => {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | 'none'>('none');
  const [allPersonas, setAllPersonas] = useState<Persona[]>([]);

  useEffect(() => {
    api.personas.getAll().then(setAllPersonas).catch(() => {});
  }, []);

  const activePersonaObj = useMemo(() => {
    if (selectedPersonaId === 'none') return null;
    return allPersonas.find(p => p.id === selectedPersonaId) || persona;
  }, [selectedPersonaId, allPersonas, persona]);

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
  const [sessionHistory, setSessionHistory] = useState<string[]>([]);

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
  const [naturalLook, setNaturalLook] = useState(persona?.naturalLook ?? true);
  const [identityLock, setIdentityLock] = useState(persona?.identityLock ?? true);

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
    if (activePersonaObj) {
      api.personas.update({ ...activePersonaObj, naturalLook: next, identityLock }).catch(() => {});
    }
  };

  const handleIdentityLockToggle = () => {
    const next = !identityLock;
    setIdentityLock(next);
    if (activePersonaObj) {
      api.personas.update({ ...activePersonaObj, naturalLook, identityLock: next }).catch(() => {});
    }
  };

  const allRefImages: string[] = [
    ...(activePersonaObj?.referenceImage ? [activePersonaObj.referenceImage] : []),
    ...(activePersonaObj?.additionalReferenceImages ?? []),
    ...overrideRefImages.map(img => img.url),
  ];
  const hasRefImage = allRefImages.length > 0;

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
        ? { ...activePersonaObj, referenceImage: primaryRef }
        : activePersonaObj;
      const genResult = await generateImage({
        persona: personaForGen || persona,
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
        setSessionHistory(prev => [genResult[0].imageUrl, ...prev]);
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
        setSessionHistory(prev => [genResult.imageUrl, ...prev]);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRandomize = () => {
    setSelectedEnv(ENVIRONMENTS[Math.floor(Math.random() * ENVIRONMENTS.length)]);
    setSelectedOutfit(OUTFITS[Math.floor(Math.random() * OUTFITS.length)]);
    setSelectedFraming(FRAMING[Math.floor(Math.random() * FRAMING.length)]);
    setSelectedMood(MOODS[Math.floor(Math.random() * MOODS.length)]);
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
      setSessionHistory(prev => [data.imageUrl, ...prev]);
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
      setSessionHistory(prev => [data.imageUrl, ...prev]);
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
        ? (videoSourceImage || activePersonaObj?.referenceImage || null)
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
    a.download = `${activePersonaObj?.name.replace(/\s+/g, '_') || 'generated'}_${Date.now()}.png`;
    a.click();
  };

  const downloadVideo = () => {
    if (!videoResult?.videoUrl) return;
    const a = document.createElement('a');
    a.href = videoResult.videoUrl;
    a.download = `${activePersonaObj?.name.replace(/\s+/g, '_') || 'video'}_${Date.now()}.mp4`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#0B0F17] flex flex-col font-sans select-none overflow-hidden text-white">
      {/* HEADER */}
      <div className="flex-none px-6 py-3.5 border-b border-[#334155]/60 bg-[#0B0F17] flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/10 flex items-center justify-center border border-[#00D4FF]/20 shadow-[0_0_15px_rgba(0,212,255,0.2)]">
            <Sparkles size={22} className="text-[#00D4FF]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Visual Studio <span className="px-2 py-0.5 bg-[#00F5C2]/10 border border-[#00F5C2]/20 rounded text-[10px] font-extrabold text-[#00F5C2] tracking-wider uppercase select-none">Pro</span>
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Create images or videos with or without a persona
            </p>
          </div>
        </div>
        
        <button onClick={onClose} className="p-2 hover:bg-[#111827] border border-[#334155]/60 hover:border-[#334155] rounded-xl transition-all flex items-center gap-2 text-white text-xs font-bold bg-[#0F172A]">
          <X className="w-4 h-4 text-[#94A3B8]" /> Close
        </button>
      </div>

      {/* WORKSPACE AREA */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT COLUMN: Controls */}
        <div className="w-full lg:w-[40%] xl:w-[38%] border-r border-[#334155]/40 bg-[#0B0F17] flex flex-col h-full select-none">
          <div className="flex-1 p-4 space-y-3.5 overflow-y-auto">
            {/* Mode Switch */}
            <div className="flex bg-[#0F172A] border border-[#334155]/60 rounded-xl p-1 gap-1">
              <button
                onClick={() => { setGenMode('image'); setGlobalError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                  genMode === 'image'
                    ? 'bg-gradient-to-r from-[#00F5C2]/20 to-[#00D4FF]/20 text-[#00F5C2] border border-[#00F5C2]/30 shadow-sm'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#111827]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Image
              </button>
              <button
                onClick={() => { setGenMode('video'); setGlobalError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                  genMode === 'video'
                    ? 'bg-gradient-to-r from-[#8B5CF6]/20 to-[#3B82F6]/20 text-[#C084FC] border border-[#8B5CF6]/30 shadow-sm'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#111827]'
                }`}
              >
                <Video className="w-3.5 h-3.5" /> Video
              </button>
            </div>

            {/* Persona Source */}
            <div className="space-y-1.5 bg-[#0F172A]/40 border border-[#334155]/40 rounded-xl p-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1.5">
                <User size={12} className="text-[#00D4FF]" /> Persona Source <span className="text-[#64748B] lowercase font-normal italic">(optional)</span>
              </label>
              <div className="relative">
                <select
                  value={selectedPersonaId}
                  onChange={(e) => setSelectedPersonaId(e.target.value)}
                  className="w-full bg-[#111827] border border-[#334155] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-3 py-2 text-xs text-white outline-none appearance-none pr-8 cursor-pointer shadow-sm transition-all"
                >
                  <option value="none">No persona selected</option>
                  {allPersonas.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.id === persona?.id ? '(Active)' : ''}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
              </div>
              <p className="text-[9px] text-[#64748B] leading-normal mt-1">Choose a persona to influence the generation, or leave blank.</p>
              
              {activePersonaObj && (
                <div className="flex items-center gap-2 mt-2 bg-[#0F172A] border border-[#334155]/60 rounded-xl p-2 select-none animate-in fade-in">
                  <div className="w-8 h-8 rounded-lg border border-[#334155] overflow-hidden shrink-0">
                    <img src={activePersonaObj.referenceImage || "/isabella_laurent_reference.png"} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate leading-none mb-0.5">{activePersonaObj.name}</p>
                    <p className="text-[8px] text-[#00D4FF] font-semibold truncate uppercase tracking-wider">{activePersonaObj.niche || 'Digital Persona'}</p>
                  </div>
                  <button onClick={() => setSelectedPersonaId('none')} className="text-[#64748B] hover:text-rose-400 transition-colors p-1">
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* AI Model */}
            {genMode === 'image' ? (
              <div className="space-y-1.5 bg-[#0F172A]/40 border border-[#334155]/40 rounded-xl p-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1.5">
                  <Cpu size={12} className="text-[#00D4FF]" /> AI Model
                </label>
                {modelsLoading ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#111827] rounded-xl text-xs text-[#94A3B8] border border-[#334155]/60">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading models...
                  </div>
                ) : pickerMode === 'by-goal' ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    {GOAL_CARDS.map((card) => {
                      const matched = pickModelForGoal(card.key, models);
                      const isDisabled = !matched;
                      const isActive = selectedGoal === card.key;
                      return (
                        <button
                          key={card.key}
                          onClick={() => !isDisabled && handleGoalSelect(card.key)}
                          disabled={isDisabled}
                          className={`relative flex flex-col items-start gap-1 p-2 rounded-xl border text-left transition-all ${
                            isActive
                              ? 'border-[#00D4FF] bg-[#00D4FF]/10 ring-1 ring-[#00D4FF]/40'
                              : isDisabled
                                ? 'border-[#334155]/40 bg-[#111827]/40 opacity-40 cursor-not-allowed'
                                : 'border-[#334155] bg-[#111827] hover:border-[#00D4FF]/40 hover:bg-[#111827]/80'
                          }`}
                        >
                          {isDisabled && <Lock className="absolute top-1.5 right-1.5 w-2.5 h-2.5 text-[#64748B]" />}
                          <span className={`text-[#94A3B8] ${isActive ? 'text-[#00D4FF]' : ''}`}>{card.icon}</span>
                          <div>
                            <p className="text-[10px] font-bold text-white leading-tight">{card.label}</p>
                            <p className="text-[8px] text-[#64748B] leading-tight mt-0.5">{card.description}</p>
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
                      className="w-full bg-[#111827] border border-[#334155] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-3 py-2 text-xs text-white outline-none appearance-none pr-8 cursor-pointer shadow-sm transition-all"
                    >
                      {Object.entries(groupedModels).map(([provider, providerModels]) => (
                        <optgroup key={provider} label={provider}>
                          {providerModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.isIdentityModel ? '★ ' : ''}{m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}{m.nsfw ? ' 🔞' : ''}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                  </div>
                )}

                {selectedModelInfo && (
                  <div className="flex items-center gap-1 flex-wrap mt-1 select-none opacity-90">
                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#8B5CF6]/15 text-[#C084FC] border border-[#8B5CF6]/30">
                      {selectedModelInfo.provider}
                    </span>
                    {selectedModelInfo.isIdentityModel && (
                      <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30">
                        ★ Face-consistent
                      </span>
                    )}
                    {selectedModelInfo.price > 0 && (
                      <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        ${selectedModelInfo.price.toFixed(3)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 bg-[#0F172A]/40 border border-[#334155]/40 rounded-xl p-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1.5">
                  <Film size={12} className="text-[#C084FC]" /> Video Model
                </label>
                {modelsLoading ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#111827] rounded-xl text-xs text-[#94A3B8] border border-[#334155]/60">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading models...
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedVideoModel}
                      onChange={(e) => setSelectedVideoModel(e.target.value)}
                      className="w-full bg-[#111827] border border-[#334155] focus:border-[#C084FC] focus:ring-1 focus:ring-[#C084FC] rounded-xl px-3 py-2 text-xs text-white outline-none appearance-none pr-8 cursor-pointer shadow-sm transition-all"
                    >
                      {Object.keys(groupedVideoModels.t2v).length > 0 && (
                        <optgroup label="Text to Video">
                          {Object.entries(groupedVideoModels.t2v).map(([provider, providerModels]) => (
                            providerModels.map((m) => (
                              <option key={m.id} value={m.id}>
                                [{provider}] {m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}
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
                                [{provider}] {m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}
                              </option>
                            ))
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                  </div>
                )}
                {selectedVideoModelInfo && (
                  <div className="flex items-center gap-1 flex-wrap mt-1 opacity-90 select-none">
                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#C084FC]/15 text-[#C084FC] border border-[#C084FC]/30">
                      {selectedVideoModelInfo.provider}
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-green-300 border border-green-500/30">
                      {isI2VModel ? 'Image → Video' : 'Text → Video'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Reference Images */}
            {genMode === 'image' && (
              <div className="space-y-1.5 bg-[#0F172A]/40 border border-[#334155]/40 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1.5 leading-none">
                    <ImageIcon size={12} className="text-[#00D4FF]" /> Reference Images <span className="text-[#64748B] lowercase font-normal italic">(optional)</span>
                  </label>
                  {allRefImages.length < 6 && (
                    <button
                      onClick={() => overrideRefInputRef.current?.click()}
                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#111827] border border-[#334155] text-white hover:border-[#00D4FF]/40 transition-all select-none"
                    >
                      + Add photo
                    </button>
                  )}
                </div>
                {allRefImages.length > 0 ? (
                  <div className="flex gap-1.5 flex-wrap pt-1 select-none">
                    {activePersonaObj?.referenceImage && (
                      <div className="relative w-12 h-12 rounded-lg border-2 border-[#00D4FF] overflow-hidden group shadow select-none animate-in fade-in">
                        <img src={activePersonaObj.referenceImage} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-[#00D4FF] text-[#0B0F17] text-[6px] font-extrabold text-center uppercase py-0.5 select-none leading-none">Persona</div>
                      </div>
                    )}
                    {overrideRefImages.map(img => (
                      <div key={img.id} className="relative w-12 h-12 rounded-lg border border-[#334155] overflow-hidden group shadow select-none animate-in fade-in">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setOverrideRefImages(prev => prev.filter(i => i.id !== img.id))}
                          className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-black/60 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-rose-500/90 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 border border-white/10"
                        >×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => overrideRefInputRef.current?.click()}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-[#111827]/40 hover:bg-[#111827] rounded-xl cursor-pointer transition-all border border-dashed border-[#334155] text-[#94A3B8] hover:text-[#00D4FF] hover:border-[#00D4FF]/40 select-none"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">Add image to guide consistency</span>
                  </button>
                )}
              </div>
            )}

            {/* Source Image for Image-To-Video */}
            {genMode === 'video' && isI2VModel && (
              <div className="space-y-1.5 bg-[#0F172A]/40 border border-[#334155]/40 rounded-xl p-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1.5 leading-none">
                  <ImageIcon size={12} className="text-[#C084FC]" /> Source Image
                </label>
                {videoSourceImage ? (
                  <div className="flex items-center gap-2 bg-[#111827] rounded-xl p-2 animate-in fade-in select-none">
                    <img src={videoSourceImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-white truncate block">{videoSourceImageName || 'Uploaded image'}</span>
                      <span className="text-[9px] text-[#64748B]">Will be animated</span>
                    </div>
                    <button
                      onClick={() => { setVideoSourceImage(null); setVideoSourceImageName(null); }}
                      className="text-[#64748B] hover:text-rose-400 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => overrideRefInputRef.current?.click()}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-[#111827]/40 hover:bg-[#111827] rounded-xl cursor-pointer transition-all border border-dashed border-[#334155] text-[#94A3B8] hover:text-[#C084FC]"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">Upload source image</span>
                  </button>
                )}
              </div>
            )}

            {/* Controls Grid */}
            {genMode === 'image' && (
              <div className="grid grid-cols-2 gap-2 select-none">
                <div className="space-y-1 bg-[#0F172A]/40 border border-[#334155]/40 rounded-xl p-2.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1 leading-none">
                    <MapPin size={11} className="text-[#00D4FF]" /> Environment
                  </label>
                  <div className="relative">
                    <select
                      value={selectedEnv}
                      onChange={(e) => setSelectedEnv(e.target.value)}
                      className="w-full bg-[#111827] border border-[#334155] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-2 py-1 text-xs text-white outline-none appearance-none pr-6 cursor-pointer select-none"
                    >
                      {ENVIRONMENTS.map(env => <option key={env} value={env}>{env}</option>)}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1 bg-[#0F172A]/40 border border-[#334155]/40 rounded-xl p-2.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1 leading-none">
                    <Shirt size={11} className="text-[#00D4FF]" /> Outfit
                  </label>
                  <div className="relative">
                    <select
                      value={selectedOutfit}
                      onChange={(e) => setSelectedOutfit(e.target.value)}
                      className="w-full bg-[#111827] border border-[#334155] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-2 py-1 text-xs text-white outline-none appearance-none pr-6 cursor-pointer select-none"
                    >
                      {OUTFITS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1 bg-[#0F172A]/40 border border-[#334155]/40 rounded-xl p-2.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1 leading-none">
                    <Layout size={11} className="text-[#00D4FF]" /> Framing
                  </label>
                  <div className="relative">
                    <select
                      value={selectedFraming}
                      onChange={(e) => setSelectedFraming(e.target.value)}
                      className="w-full bg-[#111827] border border-[#334155] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-2 py-1 text-xs text-white outline-none appearance-none pr-6 cursor-pointer select-none"
                    >
                      {FRAMING.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1 bg-[#0F172A]/40 border border-[#334155]/40 rounded-xl p-2.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1 leading-none">
                    <Smile size={11} className="text-[#00D4FF]" /> Mood
                  </label>
                  <div className="relative">
                    <select
                      value={selectedMood}
                      onChange={(e) => setSelectedMood(e.target.value)}
                      className="w-full bg-[#111827] border border-[#334155] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-2 py-1 text-xs text-white outline-none appearance-none pr-6 cursor-pointer select-none"
                    >
                      {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8] pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {/* Aspect Ratio */}
            {genMode === 'image' && (
              <div className="space-y-1.5 bg-[#0F172A]/40 border border-[#334155]/40 rounded-xl p-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1.5 leading-none">
                  <Maximize2 size={12} className="text-[#00D4FF]" /> Aspect Ratio
                </label>
                <div className="grid grid-cols-4 gap-1 select-none">
                  {[
                    { value: '1:1', label: '1:1' },
                    { value: '16:9', label: '16:9' },
                    { value: '4:5', label: '4:5' },
                    { value: '9:16', label: '9:16' }
                  ].map(r => (
                    <button
                      key={r.value}
                      onClick={() => setSelectedAspectRatio(r.value)}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition-all duration-300 select-none ${
                        selectedAspectRatio === r.value
                          ? 'bg-[#00D4FF]/15 text-[#00D4FF] border-[#00D4FF]/40 shadow-[0_0_8px_rgba(0,212,255,0.15)]'
                          : 'bg-[#111827] border-[#334155] text-[#94A3B8] hover:border-[#334155]/80 hover:text-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-2 select-none">
              <div className="flex items-center justify-between bg-[#0F172A]/40 border border-[#334155]/40 rounded-xl p-2.5">
                <div>
                  <p className="text-[10px] font-bold text-[#CBD5E1] uppercase tracking-wide">Natural</p>
                  <p className="text-[8px] text-[#64748B] leading-tight">Film grain, candid</p>
                </div>
                <button
                  onClick={handleNaturalLookToggle}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${naturalLook ? 'bg-[#00F5C2]' : 'bg-[#111827] border border-[#334155]'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-300 ${naturalLook ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between bg-[#0F172A]/40 border border-[#334155]/40 rounded-xl p-2.5">
                <div>
                  <p className="text-[10px] font-bold text-[#CBD5E1] uppercase tracking-wide">Identity Lock</p>
                  <p className="text-[8px] text-[#64748B] leading-tight">Same facial structure</p>
                </div>
                <button
                  onClick={handleIdentityLockToggle}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${identityLock ? 'bg-[#00D4FF]' : 'bg-[#111827] border border-[#334155]'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-300 ${identityLock ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Variations */}
            {genMode === 'image' && (
              <div className="flex items-center justify-between bg-[#0F172A]/40 border border-[#334155]/40 rounded-xl p-2.5">
                <div>
                  <p className="text-[10px] font-bold text-[#CBD5E1] uppercase tracking-wide">Variations</p>
                  <p className="text-[8px] text-[#64748B]">Batch multiple creations</p>
                </div>
                <div className="flex gap-1 select-none">
                  {[1, 2, 3, 4].map(n => (
                    <button
                      key={n}
                      onClick={() => setImageCount(n)}
                      className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                        imageCount === n
                          ? 'bg-[#00F5C2] text-[#0B0F17] shadow-sm'
                          : 'bg-[#111827] text-[#64748B] hover:text-white hover:bg-[#111827]/80 border border-[#334155]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Instructions */}
            <div className="space-y-1.5 bg-[#0F172A]/40 border border-[#334155]/40 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1]">Additional Details</label>
                <button
                  onClick={() => handleEnhance(prompt, setPrompt, genMode === 'image' ? setIsEnhancingPrompt : setIsEnhancingVideoPrompt)}
                  disabled={(genMode === 'image' ? isEnhancingPrompt : isEnhancingVideoPrompt) || !prompt.trim()}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] font-extrabold bg-[#7C3AED]/20 hover:bg-[#7C3AED]/40 border border-[#8B5CF6]/30 text-[#C084FC] disabled:opacity-40 transition-all select-none"
                >
                  {(genMode === 'image' ? isEnhancingPrompt : isEnhancingVideoPrompt) ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />} Enhance
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Holding a coffee cup, direct eye contact, cinematic lighting..."
                className="w-full bg-[#111827] border border-[#334155] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-3 py-2 text-xs text-white min-h-[55px] focus:ring-2 focus:ring-purple-500 outline-none resize-none placeholder-[#64748B] font-semibold"
              />
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
        </div>

        {/* RIGHT COLUMN: Output Preview Canvas */}
        <div className="w-full lg:w-[60%] xl:w-[62%] bg-[#0B0F17] flex flex-col h-full relative p-4 select-none overflow-y-auto">
          {/* Output Top Summary */}
          <div className="flex-none flex items-center justify-between bg-[#0F172A]/40 border border-[#334155]/40 rounded-xl px-3.5 py-2.5 mb-4 animate-in fade-in select-none">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">Workspace Status:</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#111827] text-[#CBD5E1] border border-[#334155]">
                {activePersonaObj ? activePersonaObj.name : 'No Persona'}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#111827] text-[#00D4FF] border border-[#334155]">
                {selectedModelInfo?.name || 'Standard Model'}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#111827] text-[#C084FC] border border-[#334155]">
                {selectedAspectRatio}
              </span>
            </div>
            {result?.imageUrl && (
              <span className="text-[9px] font-black uppercase bg-[#00F5C2]/10 border border-[#00F5C2]/20 rounded px-1.5 py-0.5 text-[#00F5C2]">Live</span>
            )}
          </div>

          {/* Canvas Wrapper */}
          <div className="flex-1 min-h-[300px] lg:min-h-0 bg-[#0F172A]/20 border border-dashed border-[#334155] rounded-2xl p-3 flex flex-col items-center justify-center relative overflow-hidden group select-none shadow-[inset_0_2px_12px_rgba(0,0,0,0.5)]">
            {isGenerating || isProcessing ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0B0F17]/40 backdrop-blur-sm z-10 animate-in fade-in duration-300">
                <Loader2 className="w-10 h-10 animate-spin text-[#00D4FF]" />
                <p className="text-xs font-bold text-[#94A3B8] animate-pulse">
                  {isProcessing
                    ? (postAction === 'upscale' ? 'Upscaling image to ultra high-fidelity...' : 'Applying AI editing refinements...')
                    : `Generating with ${selectedModelInfo?.name || 'AI Model'}...`}
                </p>
              </div>
            ) : genMode === 'image' && result?.imageUrl ? (
              <div className="relative w-full h-full flex items-center justify-center select-none animate-in fade-in duration-300">
                <img src={result.imageUrl} alt="Generated" className="max-h-[380px] lg:max-h-[460px] max-w-full rounded-xl object-contain border border-[#334155] shadow-2xl bg-black/40" />
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-1">
                  <span className="text-[9px] text-white font-bold">{selectedModelInfo?.name || 'AI'}{multiResults.length > 1 ? ` (#${selectedVariation + 1})` : ''}</span>
                </div>
              </div>
            ) : genMode === 'video' && videoResult?.videoUrl ? (
              <div className="relative w-full h-full flex items-center justify-center select-none animate-in fade-in duration-300">
                <video src={videoResult.videoUrl} controls autoPlay loop className="max-h-[380px] lg:max-h-[460px] rounded-xl object-contain border border-[#334155] shadow-2xl bg-black/40" />
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-1">
                  <span className="text-[9px] text-white font-bold">{videoResult.model || 'Video Model'}</span>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                <div className="w-16 h-16 rounded-full bg-[#111827] border border-[#334155]/60 flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.08)] mb-1">
                  <ImageIcon className="w-7 h-7 text-[#00D4FF] opacity-50" />
                </div>
                <h4 className="text-sm font-bold text-white">Your generated image will appear here</h4>
                <p className="text-[11px] text-[#64748B] max-w-sm">
                  Add details on the left and click <span className="text-[#00D4FF] font-black uppercase tracking-wider">Generate Image</span> to get started.
                </p>
              </div>
            )}
          </div>

          {/* Action Button Row */}
          <div className="flex-none mt-3 flex items-center gap-2 select-none">
            {genMode === 'image' ? (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || isProcessing || !selectedModel}
                className="flex-1 bg-gradient-to-r from-[#00F5C2] via-[#00D4FF] to-[#6366F1] text-[#0B0F17] font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_24px_rgba(0,245,194,0.4)] hover:scale-[1.01] transition-all duration-300 disabled:opacity-40 text-xs uppercase tracking-wider cursor-pointer select-none"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : result ? (
                  <><RefreshCw className="w-3.5 h-3.5" /> Regenerate</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" /> Generate Image</>
                )}
              </button>
            ) : (
              <button
                onClick={handleGenerateVideo}
                disabled={isGenerating || !selectedVideoModel || !prompt.trim()}
                className="flex-1 bg-gradient-to-r from-[#C084FC] to-[#8B5CF6] text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:scale-[1.01] transition-all duration-300 disabled:opacity-40 text-xs uppercase tracking-wider cursor-pointer select-none"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing Video...</>
                ) : videoResult ? (
                  <><RefreshCw className="w-3.5 h-3.5" /> Regenerate Video</>
                ) : (
                  <><Video className="w-3.5 h-3.5" /> Generate Video</>
                )}
              </button>
            )}

            {genMode === 'image' && (
              <button
                onClick={handleRandomize}
                className="flex-none p-3.5 rounded-xl bg-[#111827] border border-[#334155]/60 hover:bg-[#0F172A] hover:border-[#334155] text-white transition-all cursor-pointer select-none"
                title="Randomize environment, outfit & mood"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#94A3B8]" />
              </button>
            )}

            {result?.imageUrl && genMode === 'image' && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaved}
                  className={`flex-none px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 border shadow cursor-pointer select-none ${
                    isSaved
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-[#111827] border-[#334155]/60 hover:bg-[#1F2937]/80 hover:border-[#94A3B8]/40 text-white'
                  }`}
                >
                  {isSaved ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={downloadImage}
                  className="flex-none p-3.5 rounded-xl bg-[#111827] border border-[#334155]/60 hover:bg-[#0F172A] hover:border-[#334155] text-white transition-all cursor-pointer select-none"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {videoResult?.videoUrl && genMode === 'video' && (
              <>
                <button
                  onClick={handleSaveVideo}
                  className="flex-none px-4 py-3.5 rounded-xl font-bold text-xs bg-[#111827] border border-[#334155]/60 hover:bg-[#0F172A] text-white hover:border-[#334155] transition-all cursor-pointer select-none"
                >
                  Save Video
                </button>
                <button
                  onClick={downloadVideo}
                  className="flex-none p-3.5 rounded-xl bg-[#111827] border border-[#334155]/60 hover:bg-[#0F172A] text-white hover:border-[#334155] transition-all cursor-pointer select-none"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Recent Generations strip */}
          <div className="flex-none mt-4 bg-[#0F172A]/20 border border-[#334155]/30 rounded-xl p-2.5 animate-in fade-in select-none">
            <h5 className="text-[10px] font-black uppercase tracking-wider text-[#64748B] mb-2">Recent Session Generations</h5>
            {sessionHistory.length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {sessionHistory.slice(0, 4).map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setResult({ imageUrl: url, model: selectedModelInfo?.name || 'AI' })}
                    className="relative shrink-0 w-12 h-12 rounded-lg border border-[#334155] overflow-hidden hover:border-[#00D4FF] transition-all duration-300 group select-none shadow"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[9px] text-[#64748B] italic">No images generated in this session yet.</p>
            )}
          </div>
        </div>
      </div>

      {globalError && (
        <div className="flex-none px-6 py-2 bg-rose-500/10 border-t border-rose-500/30 text-rose-400 text-xs font-bold flex items-center justify-between select-none">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {globalError}
          </span>
          <button onClick={() => setGlobalError(null)} className="p-1 hover:bg-rose-500/10 rounded">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
