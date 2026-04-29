import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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
  ChevronUp,
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
  SlidersHorizontal,
  UserRound,
  ChevronRight,
} from 'lucide-react';
import { Persona, GeneratedImage } from '../types';
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
} from '../services/imageService';
import { api } from '../services/apiService';

type CreateMode = 'image' | 'video' | 'prompt' | 'transcript' | 'multi-scene' | 'angle';

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
}

const CUSTOM = 'None';
const ENVIRONMENTS = [CUSTOM, 'Luxury Hotel', 'Modern Apartment', 'Rooftop Lounge', 'Beach Resort', 'Yacht Deck', 'Upscale Restaurant', 'Private Gym', 'Beauty Studio', 'City Street', 'Penthouse'];
const OUTFITS = [CUSTOM, 'Casual Chic', 'Luxury Evening', 'Business Professional', 'Fitness Wear', 'Edgy Streetwear', 'Glamorous Gown', 'Home Lounge'];
const FRAMING = [CUSTOM, 'Portrait', 'Selfie Style', 'Full Body', 'Half Body', 'Candid', 'Cinematic'];
const MOODS = [CUSTOM, 'Confident', 'Friendly', 'Thoughtful', 'Playful', 'Professional', 'Seductive'];

const MODE_CONFIG: { id: CreateMode; label: string; icon: typeof ImageIcon; gradient: string; ringClass: string }[] = [
  { id: 'image', label: 'Image', icon: ImageIcon, gradient: 'from-purple-600 to-blue-600', ringClass: 'focus:ring-purple-500' },
  { id: 'video', label: 'Video', icon: Video, gradient: 'from-pink-600 to-orange-500', ringClass: 'focus:ring-pink-500' },
  { id: 'prompt', label: 'Prompt', icon: Wand2, gradient: 'from-emerald-600 to-teal-500', ringClass: 'focus:ring-emerald-500' },
  { id: 'transcript', label: 'Transcript', icon: FileText, gradient: 'from-amber-500 to-orange-500', ringClass: 'focus:ring-amber-500' },
  { id: 'multi-scene', label: 'Multi-Scene', icon: Film, gradient: 'from-violet-600 to-purple-500', ringClass: 'focus:ring-violet-500' },
  { id: 'angle', label: 'Angle', icon: Camera, gradient: 'from-cyan-600 to-sky-500', ringClass: 'focus:ring-cyan-500' },
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

export default function CreateView({ persona, personas, setPersonas, onSelectPersona }: CreateViewProps) {
  const [localPersonaId, setLocalPersonaId] = useState<string>(persona.id);
  const [naturalLook, setNaturalLook] = useState(persona.naturalLook ?? true);
  const [identityLock, setIdentityLock] = useState(persona.identityLock ?? true);

  const activePersona = useMemo(() => {
    if (localPersonaId === 'none') return ANONYMOUS_PERSONA;
    return personas.find(p => p.id === localPersonaId) || persona;
  }, [localPersonaId, personas, persona]);

  useEffect(() => {
    if (localPersonaId !== 'none') setLocalPersonaId(persona.id);
  }, [persona.id]);

  useEffect(() => {
    setNaturalLook(activePersona.naturalLook ?? true);
    setIdentityLock(activePersona.identityLock ?? true);
  }, [activePersona.id]);

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

  const [mode, setMode] = useState<CreateMode>('image');

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
  const [angleHorizontal, setAngleHorizontal] = useState('front-facing');
  const [angleVertical, setAngleVertical] = useState('eye level');
  const [angleDistance, setAngleDistance] = useState('medium shot');
  const [angleModel, setAngleModel] = useState(ANGLE_MODELS[0].id);
  const [angleResult, setAngleResult] = useState<{ imageUrl: string; model: string } | null>(null);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [activeQuickStyle, setActiveQuickStyle] = useState<string | null>(null);
  const [personaPickerOpen, setPersonaPickerOpen] = useState(false);

  const refPersonaImage = refPersonaId !== 'none' ? (personas.find(p => p.id === refPersonaId)?.referenceImage ?? null) : null;
  const allRefImages: string[] = [
    ...(refPersonaImage ? [refPersonaImage] : []),
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
      });
      if (Array.isArray(result)) {
        setMultiResults(result);
        setSelectedVariation(0);
        setImageResult(result[0]);
        const version: ImageVersion = { imageUrl: result[0].imageUrl, model: result[0].model, promptUsed: result[0].promptUsed || imagePrompt || '', label: 'Variation 1' };
        setImageHistory([version]);
        setActiveHistoryIndex(0);
      } else {
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
      const version: ImageVersion = { imageUrl: data.imageUrl, model: data.model, promptUsed: editPrompt, label: `Edit ${imageHistory.filter(v => v.label.startsWith('Edit')).length + 1}` };
      const newHistory = [...imageHistory, version];
      setImageHistory(newHistory);
      setActiveHistoryIndex(newHistory.length - 1);
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
      const version: ImageVersion = { imageUrl: data.imageUrl, model: data.model, promptUsed: activeVersion.promptUsed, label: `Upscale ${imageHistory.filter(v => v.label.startsWith('Upscale')).length + 1}` };
      const newHistory = [...imageHistory, version];
      setImageHistory(newHistory);
      setActiveHistoryIndex(newHistory.length - 1);
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
        horizontalAngle: angleHorizontal,
        verticalAngle: angleVertical,
        distance: angleDistance,
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
    <div className="space-y-4">

      {/* ══ OUTPUT — always at top ══ */}

      {/* Multi-variation thumbnails */}
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
                  setImageResult(r);
                  const version: ImageVersion = { imageUrl: r.imageUrl, model: r.model, promptUsed: r.promptUsed || imagePrompt || '', label: `Variation ${idx + 1}` };
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
                    onClick={(e) => { e.stopPropagation(); downloadFile(r.imageUrl, 'png'); }}
                    className="p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-black/80"
                    title="Download"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const media: GeneratedImage = {
                        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        url: r.imageUrl,
                        prompt: r.promptUsed || imagePrompt || '',
                        timestamp: Date.now(),
                        environment: selectedEnv,
                        outfit: selectedOutfit,
                        framing: selectedFraming,
                        model: r.model,
                      };
                      saveMediaToLibrary(media);
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

      {/* Main image display */}
      <div className="rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] overflow-hidden relative group" style={{minHeight: '240px'}}>
        {isGenerating || isProcessing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
            <p className="text-xs text-[var(--text-tertiary)] animate-pulse">
              {isProcessing ? (postAction === 'upscale' ? 'Upscaling...' : 'Editing...') : `Generating${imageCount > 1 ? ` ${imageCount} variations` : ''} with ${selectedModelInfo?.name || 'AI'}...`}
            </p>
          </div>
        ) : imageResult?.imageUrl ? (
          <>
            <img src={imageResult.imageUrl} alt="Generated" className="w-full object-contain max-h-[340px]" />
            <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => downloadFile(imageResult.imageUrl, 'png')} className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-black/80" title="Download">
                <Download className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg">
              <span className="text-[10px] text-white font-medium">{imageResult.model}{multiResults.length > 1 ? ` (#${selectedVariation + 1})` : ''}</span>
            </div>
          </>
        ) : (
          /* Placeholder when no image yet */
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { gradient: 'from-purple-900/60 to-violet-800/40', label: 'Luxury Hotel' },
                { gradient: 'from-rose-900/60 to-pink-800/40', label: 'Beach Day' },
                { gradient: 'from-blue-900/60 to-indigo-800/40', label: 'Night Out' },
              ].map(p => (
                <div key={p.label} className={`aspect-square rounded-xl bg-gradient-to-br ${p.gradient} flex flex-col items-end justify-end p-2 border border-white/5`}>
                  <span className="text-[9px] text-white/50 font-medium">{p.label}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center justify-center py-3 gap-1.5">
              <Sparkles className="w-6 h-6 text-purple-500/50" />
              <p className="text-xs text-[var(--text-muted)]">Configure below and hit Generate</p>
            </div>
          </div>
        )}
      </div>

      {/* Version history strip */}
      {imageHistory.length > 1 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <History className="w-3 h-3 text-[var(--text-tertiary)]" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)]">Version History</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {imageHistory.map((version, idx) => (
              <button
                key={idx}
                onClick={() => { setActiveHistoryIndex(idx); setImageResult({ imageUrl: version.imageUrl, model: version.model, promptUsed: version.promptUsed }); }}
                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${idx === activeHistoryIndex ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'}`}
              >
                <img src={version.imageUrl} alt={version.label} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Post-generation actions */}
      {activeVersion && !isGenerating && !isProcessing && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setPostAction(postAction === 'edit' ? null : 'edit')} className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${postAction === 'edit' ? 'bg-blue-600 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white'}`}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={() => setPostAction(postAction === 'upscale' ? null : 'upscale')} className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${postAction === 'upscale' ? 'bg-green-600 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white'}`}>
              <ArrowUpCircle className="w-3.5 h-3.5" /> Upscale
            </button>
            <button onClick={handleSaveImage} disabled={saved} className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white transition-all disabled:opacity-50">
              {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : <><CheckCircle className="w-3.5 h-3.5" /> Save</>}
            </button>
          </div>

          {activeVersion?.promptUsed && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(activeVersion.promptUsed);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] text-[var(--text-primary)] hover:text-white transition-all border border-[var(--border-default)]"
            >
              {copied ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Prompt Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Prompt</>}
            </button>
          )}

          {postAction === 'edit' && (
            <div className="bg-[var(--bg-elevated)]/50 border border-[var(--border-default)] rounded-xl p-3 space-y-2">
              {renderModelSelect(selectedEditModel, setSelectedEditModel, groupedEditModels)}
              <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="Describe what to change..." className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--text-muted)] resize-none h-16 outline-none" />
              <div className="flex gap-2">
                <label className="flex-1 flex items-center gap-2 px-3 py-2 bg-[var(--bg-surface)] rounded-lg cursor-pointer hover:bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)]">
                  <Upload className="w-3.5 h-3.5" />
                  {editAdditionalImageName || 'Add reference (optional)'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload(setEditAdditionalImage, setEditAdditionalImageName)} />
                </label>
                <button onClick={handleEdit} disabled={isProcessing || !editPrompt.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold disabled:opacity-50">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
              </div>
              {actionError && <p className="text-xs text-rose-400">{actionError}</p>}
            </div>
          )}

          {postAction === 'upscale' && (
            <div className="bg-[var(--bg-elevated)]/50 border border-[var(--border-default)] rounded-xl p-3 space-y-2">
              {renderModelSelect(selectedUpscaleModel, setSelectedUpscaleModel, groupedUpscaleModels)}
              <button onClick={handleUpscale} disabled={isProcessing} className="w-full py-2 bg-green-600 hover:bg-emerald-500 rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Upscaling...</> : <><ArrowUpCircle className="w-3.5 h-3.5" /> Upscale Now</>}
              </button>
              {actionError && <p className="text-xs text-rose-400">{actionError}</p>}
            </div>
          )}
        </div>
      )}

      {/* ── divider ── */}
      <div className="border-t border-white/5 pt-2" />

      {/* ══ CONTROLS below ══ */}

      {/* ── Quick Styles ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">Quick Styles</p>
          {activeQuickStyle && (
            <button onClick={clearQuickStyle} className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors">Clear</button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {QUICK_STYLES.map(qs => (
            <button
              key={qs.id}
              onClick={() => applyQuickStyle(qs)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                activeQuickStyle === qs.id
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white border-transparent shadow-lg shadow-purple-500/20'
                  : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{qs.emoji}</span>
              <span>{qs.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── AI Model ── */}
      {renderModelSelect(selectedModel, setSelectedModel, groupedModels, true)}

      {selectedModelInfo && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {selectedModelInfo.provider}
          </span>
          {selectedModelInfo.isIdentityModel && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">★ Face-consistent</span>
          )}
          {!selectedModelInfo.isIdentityModel && hasRefImage && canUseReference(selectedModelInfo, models) && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-green-300 border border-emerald-500/30">Uses reference image</span>
          )}
          {!selectedModelInfo.isIdentityModel && hasRefImage && !canUseReference(selectedModelInfo, models) && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">Text-only — will ignore reference</span>
          )}
          {selectedModelInfo.isIdentityModel && !effectiveRefImage && activePersona.referenceImage && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">Using persona face</span>
          )}
          {selectedModelInfo.isIdentityModel && !effectiveRefImage && !activePersona.referenceImage && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">⚠ Needs face photo</span>
          )}
          {selectedModelInfo.price > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              ${selectedModelInfo.price.toFixed(3)}{imageCount > 1 ? ` x${imageCount} = $${(selectedModelInfo.price * imageCount).toFixed(3)}` : ' per image'}
            </span>
          )}
        </div>
      )}

      {/* ── Style Chips ── */}
      <div className="bg-[var(--bg-elevated)]/40 rounded-2xl p-3.5 space-y-3 border border-white/5">
        {renderChipSelector('Environment', MapPin, selectedEnv, setSelectedEnv, ENVIRONMENTS)}
        {renderChipSelector('Outfit', Shirt, selectedOutfit, setSelectedOutfit, OUTFITS)}
        {renderChipSelector('Framing', Layout, selectedFraming, setSelectedFraming, FRAMING)}
        {renderChipSelector('Mood', Smile, selectedMood, setSelectedMood, MOODS)}
      </div>

      {/* ── Reference Images ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3" /> Reference Images {localPersonaId === 'none' && <span className="text-rose-400">*</span>}
            {allRefImages.length > 0 && (
              <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded-full">{allRefImages.length}</span>
            )}
          </label>
          {allRefImages.length < 6 && (
            <label className="text-[10px] text-purple-400 hover:text-purple-300 cursor-pointer transition-colors flex items-center gap-1">
              <Upload className="w-3 h-3" /> Add photo
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => { const files = e.target.files; if (files) { Array.from(files).forEach(f => handleAddRefImage(f)); } e.target.value = ''; }} />
            </label>
          )}
        </div>

        {localPersonaId !== 'none' && (
          <div className="relative">
            <select
              value={refPersonaId}
              onChange={e => { setRefPersonaId(e.target.value); }}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-sm text-white outline-none appearance-none pr-8"
            >
              <option value="none">No persona reference</option>
              {personas.filter(p => p.referenceImage).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
          </div>
        )}

        {allRefImages.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {refPersonaImage && (
              <div className="relative group">
                <img src={refPersonaImage} alt="Persona ref" className="w-20 h-20 rounded-xl object-cover border-2 border-purple-500/60" />
                <span className="absolute -bottom-1 -right-1 text-[8px] bg-purple-600 text-white rounded px-1 leading-4">Persona</span>
              </div>
            )}
            {refImages.map(img => (
              <div key={img.id} className="relative group">
                <img src={img.url} alt={img.name} className="w-20 h-20 rounded-xl object-cover border border-[var(--border-default)]" />
                <button
                  onClick={() => setRefImages(prev => prev.filter(i => i.id !== img.id))}
                  className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-600 hover:bg-rose-500 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                >×</button>
                <p className="text-[9px] text-[var(--text-tertiary)] truncate max-w-[80px] mt-0.5">{img.name}</p>
              </div>
            ))}
          </div>
        ) : (
          <label className="flex items-center gap-2 px-3 py-3 bg-[var(--bg-elevated)] border border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-white transition-colors">
                {localPersonaId === 'none' ? 'Upload your photos (required)' : 'Upload reference photos'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">For face & identity consistency</p>
            </div>
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => { const files = e.target.files; if (files) { Array.from(files).forEach(f => handleAddRefImage(f)); } e.target.value = ''; }} />
          </label>
        )}
        {allRefImages.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[var(--text-muted)]">
              {allRefImages.length === 1 ? '1 reference photo' : `${allRefImages.length} reference photos`} — all sent to Gemini for consistency
            </p>
            {(refImages.length > 0 || refPersonaId !== 'none') && (
              <button onClick={() => { setRefImages([]); setRefPersonaId('none'); }} className="text-[10px] text-[var(--text-tertiary)] hover:text-rose-400 transition-colors">
                Clear all
              </button>
            )}
          </div>
        )}
        {localPersonaId === 'none' && allRefImages.length === 0 && (
          <p className="text-[10px] text-amber-400/80">Upload at least one photo to generate in No-Persona mode</p>
        )}
      </div>

      {/* ── Instructions ── */}
      <textarea
        value={imagePrompt}
        onChange={e => setImagePrompt(e.target.value)}
        placeholder="Additional instructions (optional)..."
        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[var(--text-muted)] resize-none h-20 outline-none focus:ring-2 focus:ring-purple-500"
      />

      {/* ── Advanced Settings (collapsible) ── */}
      <div className="rounded-2xl border border-white/8 overflow-hidden">
        <button
          onClick={() => setAdvancedOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-elevated)]/50 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-bold text-[var(--text-secondary)]">Advanced</span>
            {!advancedOpen && (
              <span className="text-[10px] text-[var(--text-muted)]">
                {[naturalLook && 'Natural Look', identityLock && 'Identity Lock', `×${imageCount}`].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
          {advancedOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
        </button>

        {advancedOpen && (
          <div className="px-4 py-3 space-y-4 bg-[var(--bg-elevated)]/20 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[var(--text-secondary)]">Natural Look</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Film grain, candid, no over-retouching</p>
              </div>
              <button
                onClick={handleNaturalLookToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${naturalLook ? 'bg-purple-600' : 'bg-[var(--bg-overlay)]'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${naturalLook ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[var(--text-secondary)]">Identity Lock</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Same exact face, bone structure &amp; features</p>
              </div>
              <button
                onClick={handleIdentityLockToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${identityLock ? 'bg-purple-600' : 'bg-[var(--bg-overlay)]'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${identityLock ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[var(--text-secondary)]">Variations</p>
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
          </div>
        )}
      </div>

      {localPersonaId === 'none' && allRefImages.length === 0 && (
        <p className="text-xs text-amber-400 text-center">Upload your photo above to enable generation</p>
      )}
      <button
        onClick={handleImageGenerate}
        disabled={isGenerating || !selectedModel || (localPersonaId === 'none' && allRefImages.length === 0)}
        className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
      >
        {isGenerating ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Generating {imageCount > 1 ? `${imageCount} variations` : ''}...</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Generate {imageCount > 1 ? `${imageCount} Images` : 'Image'}</>
        )}
      </button>

    </div>
  );

  const renderVideoMode = () => (
    <div className="space-y-4">
      {renderVideoModelSelect()}

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3" /> {isI2VModel ? 'Source Image' : 'Reference Image'}
          {isI2VModel && <span className="text-rose-400 text-[10px] font-normal normal-case ml-0.5">required</span>}
          {!isI2VModel && <span className="text-[var(--text-muted)] text-[10px] font-normal normal-case ml-0.5">optional</span>}
        </label>
        <div className="flex gap-2 items-start">
          {effectiveVideoSourceImage && (
            <img src={effectiveVideoSourceImage} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[var(--border-default)]" />
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
              <span className="text-xs text-[var(--text-secondary)] truncate">{videoSourceImageName || 'Upload image'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload(setVideoSourceImage, setVideoSourceImageName)} />
            </label>
          </div>
        </div>
        {effectiveVideoSourceImage && (
          <button onClick={() => { setVideoSourcePersonaId('none'); setVideoSourceImage(null); setVideoSourceImageName(null); }} className="text-[10px] text-[var(--text-tertiary)] hover:text-rose-400 transition-colors">
            Clear image
          </button>
        )}
      </div>

      <textarea
        value={videoPrompt}
        onChange={e => setVideoPrompt(e.target.value)}
        placeholder="Describe the video you want to create..."
        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[var(--text-muted)] resize-none h-24 outline-none focus:ring-2 focus:ring-pink-500"
      />

      <button
        onClick={handleVideoGenerate}
        disabled={isGenerating || !selectedVideoModel || !videoPrompt.trim()}
        className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Video...</> : <><Video className="w-4 h-4" /> Generate Video</>}
      </button>

      <div className="aspect-video max-h-[360px] rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] overflow-hidden relative mx-auto w-full">
        {isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
            <p className="text-xs text-[var(--text-tertiary)] animate-pulse">Generating video... this may take a minute</p>
          </div>
        ) : videoResult?.videoUrl ? (
          <>
            <video src={videoResult.videoUrl} controls className="absolute inset-0 w-full h-full object-contain" />
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
              <div className="aspect-video max-h-[360px] rounded-2xl bg-[var(--bg-base)] border border-violet-500/20 overflow-hidden relative mx-auto w-full">
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

    if (isPromptMode) {
      return (
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
              <textarea
                value={createRequest}
                onChange={e => setCreateRequest(e.target.value)}
                placeholder={`e.g. "3 luxury hotel rooftop prompts at golden hour" or "beach photoshoot, moody cinematic lighting"`}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[var(--text-muted)] resize-none h-24 outline-none focus:ring-2 focus:ring-emerald-500"
              />
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
              {createdPrompts.length > 0 && (
                <div className="space-y-3">
                  {createdPrompts.map((p, i) => (
                    <div key={i} className="bg-[var(--bg-elevated)]/50 border border-[var(--border-default)] rounded-2xl p-4 relative group">
                      <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyPrompt(p, i)}
                          className="p-1.5 bg-[var(--bg-overlay)] hover:bg-[var(--bg-overlay)] rounded-lg transition-colors"
                          title="Copy prompt"
                        >
                          {copiedPromptIndex === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
                        </button>
                      </div>
                      <p className="text-xs text-emerald-400 font-bold mb-1.5 uppercase tracking-wide">Prompt {i + 1}</p>
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed pr-10">{p}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          onClick={() => copyPrompt(p, i)}
                          className="text-xs text-[var(--text-secondary)] hover:text-white font-semibold transition-colors flex items-center gap-1"
                        >
                          {copiedPromptIndex === i ? <><Check className="w-3 h-3 text-emerald-400" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                        </button>
                        <button
                          onClick={() => { setImagePrompt(p); setMode('image'); setGlobalError(null); }}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors flex items-center gap-1"
                        >
                          <ChevronsRight className="w-3 h-3" /> Use this prompt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={textTopic}
                onChange={e => setTextTopic(e.target.value)}
                placeholder={placeholders['prompt']}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[var(--text-muted)] resize-none h-24 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleTextGenerate}
                disabled={isGenerating || !textTopic.trim()}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Enhancing...</> : <><Sparkles className="w-4 h-4" /> Enhance Prompt</>}
              </button>
              {textResult && (
                <div className="bg-[var(--bg-elevated)]/50 border border-[var(--border-default)] rounded-2xl p-4 relative">
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    <button onClick={() => copyToClipboard(textResult)} className="p-1.5 bg-[var(--bg-overlay)] hover:bg-[var(--bg-overlay)] rounded-lg transition-colors" title="Copy">
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([textResult], { type: 'text/plain' });
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
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{textResult}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <textarea
          value={textTopic}
          onChange={e => setTextTopic(e.target.value)}
          placeholder={placeholders[mode]}
          className={`w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[var(--text-muted)] resize-none h-24 outline-none focus:ring-2 ${currentModeConfig.ringClass}`}
        />

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

        {textResult && (
          <div className="space-y-3">
            <div className="bg-[var(--bg-elevated)]/50 border border-[var(--border-default)] rounded-2xl p-4 relative">
              <div className="absolute top-3 right-3 flex gap-1.5">
                <button onClick={() => copyToClipboard(textResult)} className="p-1.5 bg-[var(--bg-overlay)] hover:bg-[var(--bg-overlay)] rounded-lg transition-colors" title="Copy">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([textResult], { type: 'text/plain' });
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
                <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{textResult}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const HORIZONTAL_POSITIONS = [
    { id: 'front-facing',   label: 'Front',       row: 0, col: 1 },
    { id: 'front-right',    label: 'FR',           row: 0, col: 2 },
    { id: 'side right',     label: 'Right',        row: 1, col: 2 },
    { id: 'back-right',     label: 'BR',           row: 2, col: 2 },
    { id: 'back-facing',    label: 'Back',         row: 2, col: 1 },
    { id: 'back-left',      label: 'BL',           row: 2, col: 0 },
    { id: 'side left',      label: 'Left',         row: 1, col: 0 },
    { id: 'front-left',     label: 'FL',           row: 0, col: 0 },
  ];

  const VERTICAL_POSITIONS = [
    { id: 'bird\'s eye view', label: "Bird's Eye" },
    { id: 'high angle',       label: 'High Angle'  },
    { id: 'eye level',        label: 'Eye Level'   },
    { id: 'low angle',        label: 'Low Angle'   },
  ];

  const DISTANCE_OPTIONS = [
    { id: 'close-up shot',  label: 'Close-Up'     },
    { id: 'medium shot',    label: 'Medium Shot'  },
    { id: 'wide shot',      label: 'Wide Shot'    },
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

        <div className="aspect-square max-h-[400px] rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] overflow-hidden relative group mx-auto w-full max-w-[400px]">
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
              <Camera className="w-12 h-12 text-[var(--text-muted)] opacity-30" />
              <p className="text-xs text-[var(--text-muted)]">Select angle and generate</p>
            </div>
          )}
        </div>

        {angleResult && !isGenerating && (
          <button onClick={handleSaveAngleImage} disabled={saved} className="w-full py-2.5 rounded-xl text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><CheckCircle className="w-4 h-4" /> Save to Library</>}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <header className="premium-header mb-6 pt-6 pb-2">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="gradient-text">Create Studio</span>
          </h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-1.5 font-medium">
            Generate content{localPersonaId !== 'none' ? <> as <span className="text-violet-400">{activePersona.name}</span></> : ''}
          </p>
        </div>
      </header>

      {/* ── Mode Tabs ── */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {MODE_CONFIG.map(m => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setGlobalError(null); }}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 border ${
                isActive
                  ? `bg-gradient-to-br ${m.gradient} text-white border-transparent shadow-lg`
                  : 'bg-[var(--bg-elevated)]/60 border-white/6 text-[var(--text-secondary)] hover:bg-white/8 hover:text-white hover:border-white/10'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${!isActive ? 'opacity-60' : ''}`} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Active Persona Dropdown ── */}
      <div className="mb-5">
        <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase mb-1.5 block">Active Persona</label>
        <div className="relative">
          <select
            value={localPersonaId}
            onChange={e => {
              const v = e.target.value;
              setLocalPersonaId(v);
              if (v !== 'none') onSelectPersona(v);
            }}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white outline-none appearance-none pr-10"
          >
            <option value="none">None — Upload my own image</option>
            {personas.map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.niche ? ` — ${p.niche}` : ''}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
        </div>
      </div>

      {globalError && (
        <div className="mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-300">{globalError}</p>
        </div>
      )}

      {mode === 'image' && renderImageMode()}
      {mode === 'video' && renderVideoMode()}
      {(mode === 'prompt' || mode === 'transcript' || mode === 'multi-scene') && renderTextMode()}
      {mode === 'angle' && renderAngleMode()}
    </div>
  );
}
