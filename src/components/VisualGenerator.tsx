import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useProMode, ProModeToggle } from '../utils/useProMode';
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
  Type,
  Plus,
} from 'lucide-react';
import { Persona, GeneratedImage } from '../types';
import VideoSamplePreview from './VideoSamplePreview';
import ExtendVideoModal from './ExtendVideoModal';
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
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';
import { useCreatorProfile } from '../utils/creatorProfile';

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
type GoalKey = 'portrait' | 'lifestyle' | 'artistic' | 'quick' | 'uncensored' | 'custom';

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
    label: 'Adult / explicit',
    description: 'Where provider policies permit',
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
  label?: string;
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
  const [isPro, togglePro] = useProMode();
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | 'none'>('none');
  const [allPersonas, setAllPersonas] = useState<Persona[]>([]);

  useEffect(() => {
    api.personas.list().then(setAllPersonas).catch(() => {});
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
  const [result, setResult] = useState<GenerateImageResult | null>({
    imageUrl: '/studio_preview_default.jpg',
    model: 'Premium Model',
    promptUsed: 'Stock demo image'
  });
  const [multiResults, setMultiResults] = useState<GenerateImageResult[]>([]);
  const [selectedVariation, setSelectedVariation] = useState(0);
  const [imageCount, setImageCount] = useState(1);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [imageHistory, setImageHistory] = useState<ImageVersion[]>([]);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(0);
  const [sessionHistory, setSessionHistory] = useState<string[]>([]);

  // Battle Mode States
  const [battleMode, setBattleMode] = useState(false);
  const [modelA, setModelA] = useState('');
  const [modelB, setModelB] = useState('');
  const [resultA, setResultA] = useState<GenerateImageResult | null>(null);
  const [resultB, setResultB] = useState<GenerateImageResult | null>(null);
  const [isSavedA, setIsSavedA] = useState(false);
  const [isSavedB, setIsSavedB] = useState(false);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [editModels, setEditModels] = useState<ModelInfo[]>([]);
  const [upscaleModels, setUpscaleModels] = useState<ModelInfo[]>([]);
  const [videoModels, setVideoModels] = useState<ModelInfo[]>([]);
  const [threeDModels, setThreeDModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>('');
  const [modelsLoading, setModelsLoading] = useState(true);
  const [pickerMode, setPickerMode] = useState<PickerMode>(
    () => (localStorage.getItem(PICKER_MODE_KEY) as PickerMode | null) ?? 'by-model'
  );
  const [selectedGoal, setSelectedGoal] = useState<GoalKey | null>(null);

  // Creator Profile & Duo Shoot State
  const [creatorProfile] = useCreatorProfile();
  const [includeCreator, setIncludeCreator] = useState(false);

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
  const [extendVideoModalUrl, setExtendVideoModalUrl] = useState<string | null>(null);
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
      .then(({ models: m, editModels: em, upscaleModels: um, videoModels: vm, threeDModels: tm }) => {
        setModels(m);
        setEditModels(em);
        setUpscaleModels(um);
        setVideoModels(vm);
        setThreeDModels(tm);

        // Default Model Cascade: 1. SeeDream 5.0 Pro -> 2. Qwen 3.0 Pro -> 3. GPT Image 2 / Nano Banana Pro
        const findDefaultNonProModel = (list: ModelInfo[]) => {
          const seedream = list.find(x => x.id.includes('seedream-v5') || x.name.toLowerCase().includes('seedream 5') || x.id.includes('seedream'));
          if (seedream) return seedream;
          const qwen = list.find(x => x.id.includes('qwen-3') || x.name.toLowerCase().includes('qwen 3'));
          if (qwen) return qwen;
          const cascade = ['openai:gpt-image-2', 'google:nano-banana-pro', 'replit:gpt-image-1', 'google:nano-banana-2'];
          for (const candidate of cascade) {
            const found = list.find(x => x.id === candidate);
            if (found) return found;
          }
          return list[0];
        };

        const preferred = findDefaultNonProModel(m);
        if (preferred) {
          setSelectedModel(preferred.id);
          setModelA(preferred.id);
        }
        if (m.length > 1) {
          setModelB(m[1].id);
        } else if (m.length > 0) {
          setModelB(m[0].id);
        }
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

  const handleSaveBattle = (resultToSave: GenerateImageResult, setSavedState: (v: boolean) => void) => {
    const image: GeneratedImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: resultToSave.imageUrl,
      prompt: resultToSave.promptUsed || prompt || '',
      timestamp: Date.now(),
      environment: selectedEnv,
      outfit: selectedOutfit,
      framing: selectedFraming,
      model: resultToSave.model,
    };
    onSaveImage(image);
    setSavedState(true);
    toast.success('Saved to vault!');
  };

  const downloadBattleImage = (resultToDownload: GenerateImageResult) => {
    const a = document.createElement('a');
    a.href = resultToDownload.imageUrl;
    a.download = `${activePersonaObj?.name.replace(/\s+/g, '_') || 'generated'}_${resultToDownload.model.replace(/\s+/g, '_')}_${Date.now()}.png`;
    a.click();
  };

  const handleGenerate = async () => {
    if (battleMode) {
      if (!modelA || !modelB) return;
      setIsGenerating(true);
      setGlobalError(null);
      setResult(null);
      setResultA(null);
      setResultB(null);
      setIsSavedA(false);
      setIsSavedB(false);
      setPostAction(null);
      setActionError(null);

      const primaryRef = allRefImages[0] || undefined;
      const extraRefs = [...allRefImages.slice(1)];
      if (includeCreator && creatorProfile.primaryPhoto && !extraRefs.includes(creatorProfile.primaryPhoto)) {
        extraRefs.push(creatorProfile.primaryPhoto);
      }
      const personaForGen = primaryRef
        ? { ...activePersonaObj, referenceImage: primaryRef }
        : activePersonaObj;

      const creatorDuoPrompt = includeCreator
        ? ` Duo photoshoot: featuring ${persona.name} standing and posing alongside the creator (${creatorProfile.name || 'Dr. H'}, ${creatorProfile.appearance || 'stylish creator'}), interacting naturally together in frame, high aesthetic fashion shoot.`
        : '';
      const effectiveInstructions = `${prompt}${creatorDuoPrompt}`.trim();

      const params = {
        persona: (personaForGen || persona) as any,
        environment: selectedEnv,
        outfitStyle: selectedOutfit,
        framing: selectedFraming,
        mood: selectedMood,
        additionalInstructions: effectiveInstructions,
        aspectRatio: selectedAspectRatio,
        additionalImages: extraRefs.length > 0 ? extraRefs : undefined,
        naturalLook,
        identityLock,
        count: 1,
      };

      try {
        const [resA, resB] = await Promise.all([
          generateImage({ ...params, modelId: modelA }).catch(err => {
            console.error('Error generating model A:', err);
            return { error: err.message || 'Model A failed' } as any;
          }),
          generateImage({ ...params, modelId: modelB }).catch(err => {
            console.error('Error generating model B:', err);
            return { error: err.message || 'Model B failed' } as any;
          })
        ]);

        if (resA.error && resB.error) {
          throw new Error(`Both models failed. A: ${resA.error}, B: ${resB.error}`);
        }

        if (resA.error) {
          toast.error(`Model A failed: ${resA.error}`);
        } else {
          setResultA(Array.isArray(resA) ? resA[0] : resA);
        }

        if (resB.error) {
          toast.error(`Model B failed: ${resB.error}`);
        } else {
          setResultB(Array.isArray(resB) ? resB[0] : resB);
        }
      } catch (err: any) {
        setGlobalError(err.message || 'Battle generation failed.');
      } finally {
        setIsGenerating(false);
      }
      return;
    }

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
      const extraRefs = [...allRefImages.slice(1)];
      if (includeCreator && creatorProfile.primaryPhoto && !extraRefs.includes(creatorProfile.primaryPhoto)) {
        extraRefs.push(creatorProfile.primaryPhoto);
      }
      const personaForGen = primaryRef
        ? { ...activePersonaObj, referenceImage: primaryRef }
        : activePersonaObj;

      const creatorDuoPrompt = includeCreator
        ? ` Duo photoshoot: featuring ${persona.name} standing and posing alongside the creator (${creatorProfile.name || 'Dr. H'}, ${creatorProfile.appearance || 'stylish creator'}), interacting naturally together in frame, high aesthetic fashion shoot.`
        : '';
      const effectiveInstructions = `${prompt}${creatorDuoPrompt}`.trim();

      const genResult = await generateImage({
        persona: (personaForGen || persona) as any,
        modelId: selectedModel,
        environment: selectedEnv,
        outfitStyle: selectedOutfit,
        framing: selectedFraming,
        mood: selectedMood,
        additionalInstructions: effectiveInstructions,
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
        label: `Edit ${imageHistory.filter(v => v.label && v.label.startsWith('Edit')).length + 1}`,
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
        label: `Upscale ${imageHistory.filter(v => v.label && v.label.startsWith('Upscale')).length + 1}`,
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
    <div className="fixed inset-0 z-[60] bg-[#0B0F19] flex flex-col font-sans select-none overflow-hidden text-white h-screen">

      {/* HEADER: Title & Subtitle */}
      <div className="flex-none px-6 py-3 border-b border-[#1E293B]/60 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-between z-10 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-[#00F5C2]/20 flex items-center justify-center border border-[#00D4FF]/30 shadow-[0_0_15px_rgba(0,212,255,0.25)]">
            <Sparkles size={22} className="text-[#00D4FF] animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2 tracking-tight">
              Visual Studio <span className="px-2 py-0.5 bg-[#00F5C2]/10 border border-[#00F5C2]/20 rounded text-[9px] font-extrabold text-[#00F5C2] tracking-wider uppercase select-none shadow-[0_0_8px_rgba(0,245,194,0.15)]">{isPro ? 'Pro' : 'Simple'}</span>
            </h3>
            <p className="text-xs text-[#94A3B8] font-medium">
              Ultimate high-end generation with or without a persona
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ProModeToggle isPro={isPro} onToggle={togglePro} />
          <button onClick={onClose} className="p-2 hover:bg-[#111827] border border-[#334155]/60 hover:border-[#334155] rounded-xl transition-all flex items-center gap-2 text-white text-xs font-bold bg-[#0F172A] shadow-sm">
            <X className="w-4 h-4 text-[#94A3B8]" /> Close
          </button>
        </div>
      </div>

      {/* WORKSPACE AREA */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative bg-[#0B0F19] h-[calc(100vh-64px)]">
        {/* LEFT COLUMN: Controls Panel */}
        <div className="w-full lg:w-[45%] xl:w-[42%] border-r border-[#1E293B]/60 bg-[#0F172A]/30 backdrop-blur-md flex flex-col h-full select-none justify-between overflow-hidden">
          {/* Scrollable Sidebar Content */}
          <div className="flex-1 p-2.5 space-y-2 overflow-y-auto scrollbar-thin">
            {/* Mode Selector */}
            <div className="flex bg-[#0F172A]/60 border border-[#1E293B]/60 rounded-xl p-1 gap-1 shadow-inner select-none">
              <button
                onClick={() => { setGenMode('image'); setGlobalError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-black transition-all duration-300 uppercase tracking-wider select-none ${
                  genMode === 'image'
                    ? 'bg-gradient-to-r from-[#00D4FF]/25 to-[#00F5C2]/25 text-[#00D4FF] border border-[#00D4FF]/40 shadow-sm'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#111827]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Image
              </button>
              <button
                onClick={() => { setGenMode('video'); setGlobalError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-black transition-all duration-300 uppercase tracking-wider select-none ${
                  genMode === 'video'
                    ? 'bg-gradient-to-r from-[#6366F1]/25 to-[#8B5CF6]/25 text-[#C084FC] border border-[#6366F1]/40 shadow-sm'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#111827]'
                }`}
              >
                <Video className="w-3.5 h-3.5" /> Video
              </button>
            </div>

            {!isPro && genMode === 'image' && (
              <section className="space-y-2 rounded-xl border border-[#E7C477]/20 bg-[#E7C477]/[0.055] p-3" aria-label="Choose an image goal">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#F2D58D]">What result do you want?</p>
                  <p className="mt-0.5 text-[9px] text-[#94A3B8]">We’ll choose the model automatically.</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {GOAL_CARDS.map(goal => (
                    <button
                      key={goal.key}
                      type="button"
                      onClick={() => handleGoalSelect(goal.key)}
                      aria-pressed={selectedGoal === goal.key}
                      className={cn(
                        'flex min-h-16 cursor-pointer items-center gap-2 rounded-lg border p-2 text-left transition-all',
                        selectedGoal === goal.key
                          ? 'border-[#E7C477]/55 bg-[#E7C477]/15 text-white'
                          : 'border-[#334155]/50 bg-[#111827]/45 text-[#CBD5E1] hover:border-[#E7C477]/35',
                      )}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-black/20 text-[#F2D58D]">{goal.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-[10px] font-bold">{goal.label}</span>
                        <span className="mt-0.5 block text-[8px] leading-3 text-[#94A3B8]">{goal.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Context: Persona or References */}
            <div className="space-y-1.5 bg-[#0F172A]/40 border border-[#1E293B]/40 rounded-xl p-3 select-none">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User size={12} className="text-[#00D4FF]" /> Persona Source
                </span>
                <span className="text-[#64748B] text-[8px] lowercase font-normal italic">optional</span>
              </label>

              {activePersonaObj ? (
                <div className="flex items-center gap-2.5 bg-[#0F172A]/80 border border-[#00D4FF]/30 rounded-xl p-2 select-none animate-in fade-in">
                  <div className="w-9 h-9 rounded-lg border border-[#334155]/60 overflow-hidden shrink-0 shadow-sm">
                    <img src={activePersonaObj.referenceImage || "/isabella_laurent_reference.png"} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white truncate leading-none mb-0.5 tracking-tight">{activePersonaObj.name}</p>
                    <p className="text-[9px] text-[#00D4FF] font-black truncate uppercase tracking-wider">{activePersonaObj.niche || 'Digital Creator'}</p>
                  </div>
                  <button onClick={() => setSelectedPersonaId('none')} className="text-[#64748B] hover:text-rose-400 transition-colors p-1.5">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedPersonaId}
                    onChange={(e) => setSelectedPersonaId(e.target.value)}
                    className="w-full bg-[#111827]/80 border border-[#334155]/60 focus:border-[#00D4FF] rounded-xl px-3 py-1.5 text-xs text-white outline-none appearance-none pr-8 cursor-pointer shadow-sm transition-all"
                  >
                    <option value="none">No persona selected</option>
                    {allPersonas.map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.id === persona?.id ? '(Active)' : ''}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                </div>
              )}

              {/* Uploaded guide / Consistency images */}
              <div className="pt-1 select-none">
                {overrideRefImages.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 animate-in fade-in select-none">
                    {overrideRefImages.map(img => (
                      <div key={img.id} className="relative w-10 h-10 rounded-lg border border-[#334155] overflow-hidden group shadow select-none animate-in fade-in">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setOverrideRefImages(prev => prev.filter(i => i.id !== img.id))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-rose-500/90 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 border border-white/10"
                        >×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => overrideRefInputRef.current?.click()}
                    className="w-full flex items-center gap-2 px-3 py-1.5 bg-[#111827]/40 hover:bg-[#111827]/60 rounded-xl cursor-pointer transition-all border border-dashed border-[#334155]/60 text-[#94A3B8] hover:text-[#00D4FF] hover:border-[#00D4FF]/40 select-none shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">Add image to guide consistency</span>
                  </button>
                )}
              </div>
            </div>

            {/* Model Selector */}
            {isPro && genMode === 'image' && (
              <div className="p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between select-none">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">⚔️ Model Battle Mode</span>
                  <span className="text-[9px] text-[var(--text-muted)] block">Generate side-by-side comparison</span>
                </div>
                <button
                  onClick={() => {
                    setBattleMode(!battleMode);
                    setResult(null);
                    setResultA(null);
                    setResultB(null);
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${battleMode ? 'bg-purple-500' : 'bg-white/10'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${battleMode ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            )}

            {isPro && (
              genMode === 'image' ? (
                battleMode ? (
                  <div className="space-y-3 bg-[#0F172A]/40 border border-[#1E293B]/40 rounded-xl p-3 select-none">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1.5 leading-none">
                      <Cpu size={12} className="text-[#00D4FF]" /> Model Battle Options
                    </span>
                    
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Model A</label>
                        <div className="relative">
                          <select
                            value={modelA}
                            onChange={(e) => setModelA(e.target.value)}
                            className="w-full bg-[#111827]/80 border border-[#334155]/60 focus:border-[#00D4FF] rounded-xl px-3 py-1.5 text-xs text-white outline-none appearance-none pr-8 cursor-pointer shadow-sm font-semibold animate-in fade-in"
                          >
                            {Object.entries(groupedModels).map(([provider, providerModels]) => (
                              <optgroup key={provider} label={provider} className="bg-[#111827] text-[#94A3B8] font-bold">
                                {providerModels.map((m) => (
                                  <option key={m.id} value={m.id} className="text-white font-semibold">
                                    {m.name}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Model B (Comparison)</label>
                        <div className="relative">
                          <select
                            value={modelB}
                            onChange={(e) => setModelB(e.target.value)}
                            className="w-full bg-[#111827]/80 border border-[#334155]/60 focus:border-[#00D4FF] rounded-xl px-3 py-1.5 text-xs text-white outline-none appearance-none pr-8 cursor-pointer shadow-sm font-semibold animate-in fade-in"
                          >
                            {Object.entries(groupedModels).map(([provider, providerModels]) => (
                              <optgroup key={provider} label={provider} className="bg-[#111827] text-[#94A3B8] font-bold">
                                {providerModels.map((m) => (
                                  <option key={m.id} value={m.id} className="text-white font-semibold">
                                    {m.name}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 bg-[#0F172A]/40 border border-[#1E293B]/40 rounded-xl p-3 select-none">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center justify-between leading-none">
                      <span className="flex items-center gap-1.5">
                        <Cpu size={12} className="text-[#00D4FF]" /> AI Model
                      </span>
                      {selectedModelInfo && (
                        <span className="px-2 py-0.5 bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[8px] rounded uppercase font-extrabold text-[#00D4FF] tracking-wider select-none">
                          {selectedModelInfo.id.split(':')[0]}
                        </span>
                      )}
                    </label>
                    {modelsLoading ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#111827] rounded-xl text-xs text-[#94A3B8] border border-[#334155]/60 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading models...
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={selectedModel}
                          onChange={(e) => {
                            setSelectedModel(e.target.value);
                            setSelectedGoal('custom');
                          }}
                          className="w-full bg-[#111827]/80 border border-[#334155]/60 focus:border-[#00D4FF] rounded-xl px-3 py-1.5 text-xs text-white outline-none appearance-none pr-8 cursor-pointer shadow-sm transition-all font-semibold"
                        >
                          {Object.entries(groupedModels).map(([provider, providerModels]) => (
                            <optgroup key={provider} label={provider} className="bg-[#111827] text-[#94A3B8] font-bold">
                              {providerModels.map((m) => (
                                <option key={m.id} value={m.id} className="text-white font-semibold">
                                  {m.name} {m.hasEditVariant ? '(Pro)' : ''}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                      </div>
                    )}
                  </div>
                )
              ) : (
                /* Video Model Selection */
                <div className="space-y-1.5 bg-[#0F172A]/40 border border-[#1E293B]/40 rounded-xl p-3 select-none">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1.5 leading-none">
                    <Video size={12} className="text-[#C084FC]" /> Video AI Model
                  </label>
                  <div className="relative">
                    <select
                      value={selectedVideoModel}
                      onChange={(e) => setSelectedVideoModel(e.target.value)}
                      className="w-full bg-[#111827]/80 border border-[#334155]/60 focus:border-[#00D4FF] rounded-xl px-3 py-1.5 text-xs text-white outline-none appearance-none pr-8 cursor-pointer shadow-sm transition-all font-semibold"
                    >
                      {videoModels.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
                  </div>
                </div>
              )
            )}

            {/* Prompt Field */}
            <div className="space-y-1.5 bg-[#0F172A]/40 border border-[#1E293B]/40 rounded-xl p-3 select-none">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Type size={12} className="text-[#00D4FF]" /> Prompt
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!creatorProfile.primaryPhoto && creatorProfile.photos.length === 0) {
                        toast('Tip: Upload your photos in Settings > Creator Identity to lock your face!', { icon: '📸' });
                      }
                      setIncludeCreator(prev => !prev);
                    }}
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all cursor-pointer select-none",
                      includeCreator 
                        ? "bg-[#E7C477]/20 border-[#E7C477] text-[#F2D58D] shadow-sm shadow-amber-950/30 font-bold" 
                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-[#F5F1E8] hover:bg-white/10 hover:border-[#E7C477]/30"
                    )}
                    title="Include Creator in Duo Shot"
                  >
                    <User className="w-3 h-3 text-[#E7C477]" />
                    <span className="text-[8px] font-extrabold uppercase tracking-wider">
                      {includeCreator ? `Duo with ${creatorProfile.name || 'Me'}` : '+ Include Creator'}
                    </span>
                  </button>

                  <button
                    onClick={() => handleEnhance(prompt, setPrompt, setIsEnhancingPrompt)}
                    disabled={isGenerating || isProcessing || !prompt.trim() || isEnhancingPrompt}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] hover:bg-[#00D4FF]/20 transition-all disabled:opacity-30 cursor-pointer select-none"
                    title="Enhance prompt with AI"
                  >
                    {isEnhancingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    <span className="text-[8px] font-extrabold uppercase tracking-wider">Enhance</span>
                  </button>
                </div>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Luxury rooftop portrait, soft wind, cinematic light..."
                className="w-full bg-[#111827]/60 border border-[#334155]/60 focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-3 py-1.5 text-xs text-white min-h-[36px] max-h-[48px] outline-none resize-none placeholder-[#64748B] font-semibold shadow-inner leading-relaxed"
              />
            </div>

            {/* Source image for video */}
            {genMode === 'video' && isI2VModel && (
              <div className="space-y-1.5 bg-[#0F172A]/40 border border-[#1E293B]/40 rounded-xl p-3 select-none animate-in fade-in">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1.5 leading-none">
                  <ImageIcon size={12} className="text-[#C084FC]" /> Source Image
                </label>
                {videoSourceImage ? (
                  <div className="flex items-center gap-2.5 bg-[#111827]/80 rounded-xl p-2 select-none">
                    <img src={videoSourceImage} alt="" className="w-10 h-10 rounded-lg object-cover border border-[#334155]/60" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-black text-white truncate block tracking-tight">{videoSourceImageName || 'Uploaded image'}</span>
                      <span className="text-[9px] text-[#64748B] font-bold">Source for animation</span>
                    </div>
                    <button
                      onClick={() => { setVideoSourceImage(null); setVideoSourceImageName(null); }}
                      className="text-[#64748B] hover:text-rose-400 p-1 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => overrideRefInputRef.current?.click()}
                    className="w-full flex items-center gap-2 px-3 py-1.5 bg-[#111827]/40 hover:bg-[#111827]/60 rounded-xl cursor-pointer transition-all border border-dashed border-[#334155]/60 text-[#94A3B8] hover:text-[#C084FC] select-none"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">Upload source image</span>
                  </button>
                )}
              </div>
            )}

            {/* Compact Context Settings Grid */}
            {genMode === 'image' && (
              <div className="grid grid-cols-2 gap-1.5 select-none">
                <div className="space-y-0.5 bg-[#0F172A]/40 border border-[#1E293B]/40 rounded-xl p-2">
                  <label className="text-[8px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1 leading-none">
                    <MapPin size={10} className="text-[#00D4FF]" /> Environment
                  </label>
                  <div className="relative">
                    <select
                      value={selectedEnv}
                      onChange={(e) => setSelectedEnv(e.target.value)}
                      className="w-full bg-[#111827]/60 border border-[#334155]/60 rounded-xl px-2.5 py-1 text-xs text-white outline-none appearance-none pr-6 cursor-pointer select-none font-semibold"
                    >
                      {ENVIRONMENTS.map(env => <option key={env} value={env}>{env}</option>)}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-0.5 bg-[#0F172A]/40 border border-[#1E293B]/40 rounded-xl p-2">
                  <label className="text-[8px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1 leading-none">
                    <Shirt size={10} className="text-[#00D4FF]" /> Outfit
                  </label>
                  <div className="relative">
                    <select
                      value={selectedOutfit}
                      onChange={(e) => setSelectedOutfit(e.target.value)}
                      className="w-full bg-[#111827]/60 border border-[#334155]/60 rounded-xl px-2.5 py-1 text-xs text-white outline-none appearance-none pr-6 cursor-pointer select-none font-semibold"
                    >
                      {OUTFITS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-0.5 bg-[#0F172A]/40 border border-[#1E293B]/40 rounded-xl p-2">
                  <label className="text-[8px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1 leading-none">
                    <Layout size={10} className="text-[#00D4FF]" /> Framing
                  </label>
                  <div className="relative">
                    <select
                      value={selectedFraming}
                      onChange={(e) => setSelectedFraming(e.target.value)}
                      className="w-full bg-[#111827]/60 border border-[#334155]/60 rounded-xl px-2.5 py-1 text-xs text-white outline-none appearance-none pr-6 cursor-pointer select-none font-semibold"
                    >
                      {FRAMING.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-0.5 bg-[#0F172A]/40 border border-[#1E293B]/40 rounded-xl p-2">
                  <label className="text-[8px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1 leading-none">
                    <Smile size={10} className="text-[#00D4FF]" /> Mood
                  </label>
                  <div className="relative">
                    <select
                      value={selectedMood}
                      onChange={(e) => setSelectedMood(e.target.value)}
                      className="w-full bg-[#111827]/60 border border-[#334155]/60 rounded-xl px-2.5 py-1 text-xs text-white outline-none appearance-none pr-6 cursor-pointer select-none font-semibold"
                    >
                      {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {/* Aspect Ratio */}
            {genMode === 'image' && (
              <div className="space-y-1.5 bg-[#0F172A]/40 border border-[#1E293B]/40 rounded-xl p-3 select-none">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#CBD5E1] flex items-center gap-1.5 leading-none">
                  <Maximize2 size={12} className="text-[#00D4FF]" /> Aspect Ratio
                </label>
                <div className="grid grid-cols-4 gap-1.5 select-none">
                  {[
                    { value: '1:1', label: '1:1' },
                    { value: '16:9', label: '16:9' },
                    { value: '4:5', label: '4:5' },
                    { value: '9:16', label: '9:16' }
                  ].map(r => (
                    <button
                      key={r.value}
                      onClick={() => setSelectedAspectRatio(r.value)}
                      className={`py-1 rounded-xl text-xs font-black border transition-all duration-300 select-none tracking-tight ${
                        selectedAspectRatio === r.value
                          ? 'bg-[#00D4FF]/20 text-[#00D4FF] border-[#00D4FF]/40 shadow-[0_0_8px_rgba(0,212,255,0.15)]'
                          : 'bg-[#111827]/60 border-[#334155]/60 text-[#94A3B8] hover:border-[#334155] hover:text-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Toggles & Variations Grid */}
            <div className="grid grid-cols-2 gap-1.5 select-none">
              <div className="flex items-center justify-between bg-[#0F172A]/40 border border-[#1E293B]/40 rounded-xl p-2 select-none">
                <div>
                  <p className="text-[9px] font-black text-[#CBD5E1] uppercase tracking-wide">Natural</p>
                  <p className="text-[7px] font-semibold text-[#64748B] leading-tight">Candid look</p>
                </div>
                <button
                  onClick={handleNaturalLookToggle}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${naturalLook ? 'bg-[#00F5C2]' : 'bg-[#111827] border border-[#334155]/60'}`}
                >
                  <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform duration-300 ${naturalLook ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between bg-[#0F172A]/40 border border-[#1E293B]/40 rounded-xl p-2 select-none">
                <div>
                  <p className="text-[9px] font-black text-[#CBD5E1] uppercase tracking-wide">Identity</p>
                  <p className="text-[7px] font-semibold text-[#64748B] leading-tight">Same face</p>
                </div>
                <button
                  onClick={handleIdentityLockToggle}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${identityLock ? 'bg-[#00D4FF]' : 'bg-[#111827] border border-[#334155]/60'}`}
                >
                  <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform duration-300 ${identityLock ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Variations */}
            {genMode === 'image' && (
              <div className="flex items-center justify-between bg-[#0F172A]/40 border border-[#1E293B]/40 rounded-xl p-2.5 select-none">
                <div>
                  <p className="text-[10px] font-black text-[#CBD5E1] uppercase tracking-wide">Variations</p>
                  <p className="text-[8px] font-semibold text-[#64748B]">Batch multiple creations</p>
                </div>
                <div className="flex gap-1.5 select-none">
                  {[1, 2, 3, 4].map(n => (
                    <button
                      key={n}
                      onClick={() => setImageCount(n)}
                      className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                        imageCount === n
                          ? 'bg-[#00F5C2] text-[#0B0F17] shadow-sm'
                          : 'bg-[#111827]/60 text-[#64748B] hover:text-white hover:bg-[#111827] border border-[#334155]/60'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}



            <input
              ref={overrideRefInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                Array.from(files).forEach((file) => {
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

          {/* Action Footer: Enhancer + Generate Button */}
          <div className="flex-none p-2 border-t border-[#1E293B]/60 bg-[#0F172A]/60 backdrop-blur-md flex items-center gap-2 select-none">
            {genMode === 'image' ? (
              <>
                <button
                  onClick={() => handleEnhance(prompt, setPrompt, setIsEnhancingPrompt)}
                  disabled={isGenerating || isProcessing || !prompt.trim() || isEnhancingPrompt}
                  className="flex-none p-3.5 rounded-xl bg-[#111827]/80 border border-[#334155]/60 hover:bg-[#0F172A] hover:border-[#334155] text-[#00D4FF] transition-all cursor-pointer select-none shadow-sm disabled:opacity-40"
                  title="Enhance prompt with AI"
                >
                  {isEnhancingPrompt ? <Loader2 className="w-4 h-4 animate-spin text-[#00D4FF]" /> : <Sparkles className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || isProcessing || !selectedModel}
                  className="flex-1 bg-gradient-to-r from-[#00F5C2] via-[#00D4FF] to-[#6366F1] text-[#0B0F17] font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_24px_rgba(0,245,194,0.4)] hover:scale-[1.01] transition-all duration-300 disabled:opacity-40 text-xs uppercase tracking-wider cursor-pointer select-none shadow-lg"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : result ? (
                    <><RefreshCw className="w-3.5 h-3.5" /> Regenerate</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Generate Image</>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerateVideo}
                disabled={isGenerating || !selectedVideoModel || !prompt.trim()}
                className="flex-1 bg-gradient-to-r from-[#C084FC] to-[#8B5CF6] text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:scale-[1.01] transition-all duration-300 disabled:opacity-40 text-xs uppercase tracking-wider cursor-pointer select-none shadow-lg"
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
                className="flex-none p-3.5 rounded-xl bg-[#111827]/80 border border-[#334155]/60 hover:bg-[#0F172A] hover:border-[#334155] text-white transition-all cursor-pointer select-none shadow-sm"
                title="Randomize environment, outfit & mood"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#94A3B8]" />
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Studio Canvas Preview */}
        <div className="flex-1 bg-[#0B0F19] flex flex-col h-full relative p-4 select-none overflow-hidden justify-between">
          {/* Status Tracker Summary */}
          <div className="flex-none flex items-center justify-between bg-[#0F172A]/40 border border-[#1E293B]/40 rounded-xl px-3.5 py-2.5 mb-3.5 animate-in fade-in select-none">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">Studio Canvas</span>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-[#111827]/80 text-[#CBD5E1] border border-[#334155]/60">
                {activePersonaObj ? activePersonaObj.name : 'No Persona'}
              </span>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-[#111827]/80 text-[#00D4FF] border border-[#334155]/60">
                {selectedModelInfo?.name || 'Standard AI'}
              </span>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-[#111827]/80 text-[#C084FC] border border-[#334155]/60">
                {selectedAspectRatio}
              </span>
            </div>
            {result?.imageUrl && result.promptUsed !== 'Stock demo image' && (
              <span className="text-[9px] font-black uppercase bg-[#00F5C2]/15 border border-[#00F5C2]/25 rounded px-2 py-0.5 text-[#00F5C2] shadow-[0_0_10px_rgba(0,245,194,0.15)] select-none">Live</span>
            )}
          </div>

          {/* Premium Canvas Viewbox */}
          <div className="aspect-video w-full bg-[#0F172A]/20 border border-dashed border-[#1E293B]/60 rounded-2xl p-2 flex items-center justify-center relative overflow-hidden group select-none shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)]">
            {battleMode && genMode === 'image' ? (
              <div className="w-full h-full grid grid-cols-2 gap-4">
                {/* Model A Column */}
                <div className="relative rounded-xl bg-[#0F172A]/40 border border-[#1E293B]/60 flex flex-col overflow-hidden group">
                  <div className="p-2 border-b border-[#1E293B]/60 bg-black/30 flex justify-between items-center select-none">
                    <span className="text-[9px] font-black uppercase text-[#00D4FF] truncate max-w-[130px]">A: {models.find(m => m.id === modelA)?.name || 'AI Model'}</span>
                    <span className="text-[8px] font-bold text-emerald-400 font-mono">
                      {(() => {
                        const m = models.find(m => m.id === modelA);
                        return m ? (m.price === 0 ? 'Free' : `${m.price} cr`) : 'Free';
                      })()}
                    </span>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center p-2 relative overflow-hidden">
                    {isGenerating && !resultA && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0B0F19]/60 backdrop-blur-sm z-10">
                        <Loader2 className="w-5 h-5 animate-spin text-[#00D4FF]" />
                        <span className="text-[9px] text-gray-400">Generating A...</span>
                      </div>
                    )}
                    {resultA ? (
                      <img src={resultA.imageUrl} alt="Model A" className="max-w-full max-h-full rounded-lg object-contain" />
                    ) : (
                      <div className="text-[10px] text-[#64748B] italic">Waiting for battle...</div>
                    )}
                  </div>
                  
                  {resultA && (
                    <div className="p-2 border-t border-[#1E293B]/60 bg-black/30 flex gap-2">
                      <button
                        onClick={() => handleSaveBattle(resultA, setIsSavedA)}
                        disabled={isSavedA}
                        className={cn(
                          "flex-1 py-1 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border text-center",
                          isSavedA ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-[#00D4FF]/25 hover:bg-[#00D4FF]/40 text-[#00D4FF] border-[#00D4FF]/40"
                        )}
                      >
                        {isSavedA ? 'Saved' : 'Save A'}
                      </button>
                      <button
                        onClick={() => downloadBattleImage(resultA)}
                        className="px-2 py-1 bg-[#111827] border border-[#334155]/60 hover:bg-[#0F172A] rounded-lg text-white transition-all flex items-center justify-center"
                      >
                        <Download className="w-3.5 h-3.5 text-[#00D4FF]" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Model B Column */}
                <div className="relative rounded-xl bg-[#0F172A]/40 border border-[#1E293B]/60 flex flex-col overflow-hidden group">
                  <div className="p-2 border-b border-[#1E293B]/60 bg-black/30 flex justify-between items-center select-none">
                    <span className="text-[9px] font-black uppercase text-[#C084FC] truncate max-w-[130px]">B: {models.find(m => m.id === modelB)?.name || 'AI Model'}</span>
                    <span className="text-[8px] font-bold text-emerald-400 font-mono">
                      {(() => {
                        const m = models.find(m => m.id === modelB);
                        return m ? (m.price === 0 ? 'Free' : `${m.price} cr`) : 'Free';
                      })()}
                    </span>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center p-2 relative overflow-hidden">
                    {isGenerating && !resultB && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0B0F19]/60 backdrop-blur-sm z-10">
                        <Loader2 className="w-5 h-5 animate-spin text-[#C084FC]" />
                        <span className="text-[9px] text-gray-400">Generating B...</span>
                      </div>
                    )}
                    {resultB ? (
                      <img src={resultB.imageUrl} alt="Model B" className="max-w-full max-h-full rounded-lg object-contain" />
                    ) : (
                      <div className="text-[10px] text-[#64748B] italic">Waiting for battle...</div>
                    )}
                  </div>
                  
                  {resultB && (
                    <div className="p-2 border-t border-[#1E293B]/60 bg-black/30 flex gap-2">
                      <button
                        onClick={() => handleSaveBattle(resultB, setIsSavedB)}
                        disabled={isSavedB}
                        className={cn(
                          "flex-1 py-1 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border text-center",
                          isSavedB ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-[#C084FC]/25 hover:bg-[#C084FC]/40 text-[#C084FC] border-[#C084FC]/40"
                        )}
                      >
                        {isSavedB ? 'Saved' : 'Save B'}
                      </button>
                      <button
                        onClick={() => downloadBattleImage(resultB)}
                        className="px-2 py-1 bg-[#111827] border border-[#334155]/60 hover:bg-[#0F172A] rounded-lg text-white transition-all flex items-center justify-center"
                      >
                        <Download className="w-3.5 h-3.5 text-[#C084FC]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (isGenerating || isProcessing) && genMode === 'video' ? (
              <VideoSamplePreview isLoading loadingText={`Generating with ${selectedModelInfo?.name || 'AI Model'}...`} />
            ) : (isGenerating || isProcessing) ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0B0F19]/60 backdrop-blur-md z-10 animate-in fade-in duration-300">
                <Loader2 className="w-10 h-10 animate-spin text-[#00D4FF]" />
                <p className="text-xs font-black text-[#94A3B8] animate-pulse tracking-wide select-none">
                  {isProcessing
                    ? (postAction === 'upscale' ? 'Upscaling image to ultra high-fidelity...' : 'Applying AI editing refinements...')
                    : `Generating with ${selectedModelInfo?.name || 'AI Model'}...`}
                </p>
              </div>
            ) : genMode === 'image' && result?.imageUrl ? (
              <div className="relative w-full h-full flex items-center justify-center select-none animate-in fade-in duration-300">
                <img src={result.imageUrl} alt="Generated" className="max-w-full max-h-full rounded-2xl object-cover object-[35%_center] border border-[#1E293B]/60 shadow-2xl select-none transition-transform duration-300 hover:scale-[1.01]" />
                <div className="absolute top-2 left-2 px-3 py-1 bg-black/75 backdrop-blur-md rounded-xl border border-white/10 flex items-center gap-1.5 shadow-xl select-none">
                  {result.promptUsed === 'Stock demo image' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-[10px] text-emerald-400 font-extrabold tracking-wide uppercase select-none">Sample Preview</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-[#00D4FF]" />
                      <span className="text-[10px] text-white font-black tracking-wide select-none">{selectedModelInfo?.name || 'AI'}{multiResults.length > 1 ? ` (#${selectedVariation + 1})` : ''}</span>
                    </>
                  )}
                </div>
              </div>
            ) : genMode === 'video' && videoResult?.videoUrl ? (
              <div className="relative w-full h-full flex items-center justify-center select-none animate-in fade-in duration-300">
                <video src={videoResult.videoUrl} controls autoPlay loop className="max-h-[380px] lg:max-h-[440px] rounded-2xl object-contain border border-[#1E293B]/60 shadow-2xl bg-black/50 select-none" />
                <div className="absolute top-2 left-2 px-3 py-1 bg-black/75 backdrop-blur-md rounded-xl border border-white/10 flex items-center gap-1.5 shadow-xl select-none">
                  <span className="text-[10px] text-white font-black tracking-wide select-none">{videoResult.model || 'Video Model'}</span>
                </div>
              </div>
            ) : genMode === 'video' ? (
              <VideoSamplePreview />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 select-none animate-in fade-in">
                <div className="w-16 h-16 rounded-full bg-[#111827] border border-[#334155]/60 flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.08)] mb-1">
                  <ImageIcon className="w-7 h-7 text-[#00D4FF] opacity-50" />
                </div>
                <h4 className="text-sm font-bold text-white">Your generated image will appear here</h4>
                <p className="text-[11px] text-[#64748B] max-w-sm leading-relaxed">
                  Add details on the left and click <span className="text-[#00D4FF] font-black uppercase tracking-wider">Generate Image</span> to get started.
                </p>
              </div>
            )}
          </div>

          {/* Context Actions Row (Save, Download, Regenerate, Reference) */}
          <div className="flex-none mt-3.5 flex items-center gap-2 select-none flex-wrap">
            {!battleMode && result?.imageUrl && genMode === 'image' && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaved}
                  className={`flex-1 py-3 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 border shadow cursor-pointer select-none text-center flex items-center justify-center gap-2 min-w-[120px] ${
                    isSaved
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-gradient-to-r from-[#00F5C2] to-[#00D4FF] hover:shadow-[0_0_24px_rgba(0,245,194,0.3)] text-[#0B0F17]'
                  }`}
                >
                  {isSaved ? 'Saved to Vault' : 'Save Image'}
                </button>
                <button
                  onClick={downloadImage}
                  className="flex-none p-3.5 rounded-xl bg-[#111827]/80 border border-[#334155]/60 hover:bg-[#0F172A] hover:border-[#334155] text-white transition-all cursor-pointer select-none shadow-sm"
                  title="Download Image"
                >
                  <Download className="w-4 h-4 text-[#00D4FF]" />
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || isProcessing || !selectedModel}
                  className="flex-none p-3.5 rounded-xl bg-[#111827]/80 border border-[#334155]/60 hover:bg-[#0F172A] hover:border-[#334155] text-white transition-all cursor-pointer select-none shadow-sm"
                  title="Regenerate"
                >
                  <RefreshCw className="w-4 h-4 text-[#00D4FF]" />
                </button>
                <button
                  onClick={() => {
                    setOverrideRefImages(prev => [...prev, { id: `or-${Date.now()}`, url: result.imageUrl, name: 'Generated Reference' }]);
                  }}
                  className="flex-none p-3.5 rounded-xl bg-[#111827]/80 border border-[#334155]/60 hover:bg-[#0F172A] hover:border-[#334155] text-white transition-all cursor-pointer select-none shadow-sm"
                  title="Use as Reference"
                >
                  <ImageIcon className="w-4 h-4 text-[#00D4FF]" />
                </button>
              </>
            )}

            {videoResult?.videoUrl && genMode === 'video' && (
              <>
                <button
                  onClick={() => setExtendVideoModalUrl(videoResult.videoUrl)}
                  className="flex-1 py-3 px-3 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-black transition-all cursor-pointer select-none text-center flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" /> Extend Video (+5s)
                </button>
                <button
                  onClick={handleSaveVideo}
                  className="flex-none py-3 px-3.5 rounded-xl font-black text-xs uppercase tracking-wider bg-[#111827] border border-[#334155]/60 hover:bg-[#0F172A] text-white hover:border-[#334155] transition-all cursor-pointer select-none text-center flex items-center justify-center gap-2"
                >
                  Save
                </button>
                <button
                  onClick={downloadVideo}
                  className="flex-none p-3.5 rounded-xl bg-[#111827]/80 border border-[#334155]/60 hover:bg-[#0F172A] text-white hover:border-[#334155] transition-all cursor-pointer select-none"
                >
                  <Download className="w-4 h-4 text-[#00D4FF]" />
                </button>
                <button
                  onClick={handleGenerateVideo}
                  disabled={isGenerating || !selectedVideoModel || !prompt.trim()}
                  className="flex-none p-3.5 rounded-xl bg-[#111827]/80 border border-[#334155]/60 hover:bg-[#0F172A] text-white hover:border-[#334155] transition-all cursor-pointer select-none"
                  title="Regenerate"
                >
                  <RefreshCw className="w-4 h-4 text-[#00D4FF]" />
                </button>
              </>
            )}
          </div>

          {/* Extend Video Modal Overlay */}
          {extendVideoModalUrl && (
            <ExtendVideoModal
              persona={activePersonaObj || persona}
              originalVideoUrl={extendVideoModalUrl}
              originalPrompt={prompt}
              originalModel={selectedVideoModel}
              onClose={() => setExtendVideoModalUrl(null)}
              onSuccess={(newVideoUrl) => {
                setVideoResult(prev => prev ? { ...prev, videoUrl: newVideoUrl } : { videoUrl: newVideoUrl, model: 'Extended Video' });
                setExtendVideoModalUrl(null);
              }}
            />
          )}

          {/* Compact Variations Strip */}
          <div className="flex-none mt-3.5 bg-[#0F172A]/30 border border-[#1E293B]/40 rounded-xl p-2.5 animate-in fade-in select-none">
            <h5 className="text-[9px] font-black uppercase tracking-wider text-[#64748B] mb-2 leading-none">Session Image Reel</h5>
            {sessionHistory.length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {sessionHistory.slice(0, 4).map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setResult({ imageUrl: url, model: selectedModelInfo?.name || 'AI', promptUsed: '' })}
                    className="relative shrink-0 w-11 h-11 rounded-lg border border-[#334155]/60 overflow-hidden hover:border-[#00D4FF] transition-all duration-300 group select-none shadow hover:scale-105"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[9px] text-[#64748B] italic">Your session history reel is currently empty.</p>
            )}
          </div>
        </div>
      </div>

      {globalError && (
        <div className="flex-none px-6 py-2 bg-rose-500/10 border-t border-rose-500/30 text-rose-400 text-xs font-bold flex items-center justify-between select-none">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {globalError}
          </span>
          <button onClick={() => setGlobalError(null)} className="p-1 hover:bg-rose-500/10 rounded transition-colors">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
