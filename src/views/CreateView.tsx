import { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { Persona, GeneratedImage } from '../types';
import {
  generateImage,
  generateVideo,
  generateContent,
  enhancePrompt,
  fetchAllModelTypes,
  editImage,
  upscaleImage,
  type ModelInfo,
  type GenerateImageResult,
} from '../services/imageService';

type CreateMode = 'image' | 'video' | 'prompt' | 'transcript' | 'multi-scene';

interface CreateViewProps {
  persona: Persona;
  personas: Persona[];
  setPersonas: (personas: Persona[]) => void;
  onSelectPersona: (id: string) => void;
}

const CUSTOM = 'Custom';
const ENVIRONMENTS = [CUSTOM, 'Luxury Hotel', 'Modern Apartment', 'Rooftop Lounge', 'Beach Resort', 'Yacht Deck', 'Upscale Restaurant', 'Private Gym', 'Beauty Studio', 'City Street', 'Penthouse'];
const OUTFITS = [CUSTOM, 'Casual Chic', 'Luxury Evening', 'Business Professional', 'Fitness Wear', 'Edgy Streetwear', 'Glamorous Gown', 'Home Lounge'];
const FRAMING = [CUSTOM, 'Portrait', 'Selfie Style', 'Full Body', 'Half Body', 'Candid', 'Cinematic'];
const MOODS = [CUSTOM, 'Confident', 'Friendly', 'Thoughtful', 'Playful', 'Professional', 'Seductive'];

const MODE_CONFIG: { id: CreateMode; label: string; icon: typeof ImageIcon; gradient: string; ringClass: string }[] = [
  { id: 'image', label: 'Image', icon: ImageIcon, gradient: 'from-purple-600 to-blue-600', ringClass: 'focus:ring-purple-500' },
  { id: 'video', label: 'Video', icon: Video, gradient: 'from-pink-600 to-orange-500', ringClass: 'focus:ring-pink-500' },
  { id: 'prompt', label: 'Prompt', icon: Wand2, gradient: 'from-emerald-600 to-teal-500', ringClass: 'focus:ring-emerald-500' },
  { id: 'transcript', label: 'Transcript', icon: FileText, gradient: 'from-amber-500 to-orange-500', ringClass: 'focus:ring-amber-500' },
  { id: 'multi-scene', label: 'Multi-Scene', icon: Film, gradient: 'from-indigo-600 to-purple-500', ringClass: 'focus:ring-indigo-500' },
];

type PostGenAction = null | 'edit' | 'upscale';

interface ImageVersion {
  imageUrl: string;
  model: string;
  promptUsed: string;
  label: string;
}

export default function CreateView({ persona, personas, setPersonas, onSelectPersona }: CreateViewProps) {
  const [mode, setMode] = useState<CreateMode>('image');

  const [imagePrompt, setImagePrompt] = useState('');
  const [selectedEnv, setSelectedEnv] = useState(ENVIRONMENTS[1]);
  const [selectedOutfit, setSelectedOutfit] = useState(OUTFITS[1]);
  const [selectedFraming, setSelectedFraming] = useState(FRAMING[1]);
  const [selectedMood, setSelectedMood] = useState(MOODS[1]);
  const [imageResult, setImageResult] = useState<GenerateImageResult | null>(null);
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

  const [inlineRefImage, setInlineRefImage] = useState<string | null>(null);
  const [inlineRefImageName, setInlineRefImageName] = useState<string | null>(null);

  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoResult, setVideoResult] = useState<{ videoUrl: string; model: string } | null>(null);
  const [videoSourceImage, setVideoSourceImage] = useState<string | null>(null);
  const [videoSourceImageName, setVideoSourceImageName] = useState<string | null>(null);

  const [textTopic, setTextTopic] = useState('');
  const [textResult, setTextResult] = useState('');
  const [sceneCount, setSceneCount] = useState(3);

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

  const effectiveRefImage = inlineRefImage || persona.referenceImage || null;
  const hasRefImage = !!effectiveRefImage;
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
    if (!hasRefImage) return models;
    return [...models].sort((a, b) => {
      if (a.hasEditVariant && !b.hasEditVariant) return -1;
      if (!a.hasEditVariant && b.hasEditVariant) return 1;
      return 0;
    });
  }, [models, hasRefImage]);

  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    sortedModels.forEach(m => { if (!groups[m.provider]) groups[m.provider] = []; groups[m.provider].push(m); });
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
    setImageHistory([]);
    setActiveHistoryIndex(0);
    setPostAction(null);
    setActionError(null);

    try {
      const personaWithRef = inlineRefImage ? { ...persona, referenceImage: inlineRefImage } : persona;
      const data = await generateImage({
        persona: personaWithRef,
        modelId: selectedModel,
        environment: selectedEnv,
        outfitStyle: selectedOutfit,
        framing: selectedFraming,
        mood: selectedMood,
        additionalInstructions: imagePrompt,
      });
      setImageResult(data);
      const version: ImageVersion = { imageUrl: data.imageUrl, model: data.model, promptUsed: data.promptUsed || imagePrompt || '', label: 'Original' };
      setImageHistory([version]);
      setActiveHistoryIndex(0);
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

    try {
      const sourceImg = isI2VModel ? (videoSourceImage || persona.referenceImage || null) : undefined;
      if (isI2VModel && !sourceImg) {
        throw new Error('Image-to-video models require a source image. Upload one or set a persona reference image.');
      }
      const data = await generateVideo(videoPrompt, selectedVideoModel, sourceImg || undefined);
      setVideoResult(data);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : 'Video generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTextGenerate = async () => {
    if (!textTopic.trim()) return;
    setIsGenerating(true);
    setGlobalError(null);
    setTextResult('');

    try {
      const contentType = mode as 'prompt' | 'transcript' | 'multi-scene';
      const result = await generateContent(
        contentType,
        textTopic,
        { name: persona.name, niche: persona.niche, tone: persona.tone, platform: persona.platform, bio: persona.bio },
        contentType === 'multi-scene' ? sceneCount : undefined
      );
      setTextResult(result);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : 'Content generation failed.');
    } finally {
      setIsGenerating(false);
    }
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
  ) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
        <Cpu className="w-3 h-3" /> AI Model
      </label>
      {modelsLoading ? (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800 rounded-xl text-sm text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading models...
        </div>
      ) : (
        <div className="relative">
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none pr-10"
          >
            {Object.entries(grouped).map(([provider, providerModels]) => (
              <optgroup key={provider} label={provider}>
                {providerModels.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}{showRefWarning && hasRefImage && !m.hasEditVariant ? ' ⚠ No ref support' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        </div>
      )}
    </div>
  );

  const renderVideoModelSelect = () => {
    const { t2v, i2v } = groupedVideoModels;
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
          <Cpu className="w-3 h-3" /> Video Model
        </label>
        {modelsLoading ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800 rounded-xl text-sm text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading models...
          </div>
        ) : (
          <div className="relative">
            <select
              value={selectedVideoModel}
              onChange={e => setSelectedVideoModel(e.target.value)}
              className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-pink-500 outline-none appearance-none pr-10"
            >
              {Object.keys(t2v).length > 0 && (
                <optgroup label="Text-to-Video">
                  {Object.entries(t2v).map(([provider, ms]) =>
                    ms.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({provider}){m.price > 0 ? ` $${m.price.toFixed(3)}` : ' Free'}
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
                        {m.name} ({provider}){m.price > 0 ? ` $${m.price.toFixed(3)}` : ' Free'}
                      </option>
                    ))
                  )}
                </optgroup>
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>
        )}
      </div>
    );
  };

  const renderDropdown = (label: string, Icon: typeof Layout, value: string, onChange: (v: string) => void, options: string[]) => (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none appearance-none"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const renderImageMode = () => (
    <div className="space-y-4">
      {renderModelSelect(selectedModel, setSelectedModel, groupedModels, true)}

      {selectedModelInfo && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {selectedModelInfo.provider}
          </span>
          {hasRefImage && selectedModelInfo.hasEditVariant && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">Uses reference image</span>
          )}
          {hasRefImage && !selectedModelInfo.hasEditVariant && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">Text-only — will ignore reference</span>
          )}
          {selectedModelInfo.price > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">${selectedModelInfo.price.toFixed(3)} per image</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {renderDropdown('Environment', MapPin, selectedEnv, setSelectedEnv, ENVIRONMENTS)}
        {renderDropdown('Outfit', Shirt, selectedOutfit, setSelectedOutfit, OUTFITS)}
        {renderDropdown('Framing', Layout, selectedFraming, setSelectedFraming, FRAMING)}
        {renderDropdown('Mood', Smile, selectedMood, setSelectedMood, MOODS)}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
          <Upload className="w-3 h-3" /> Reference Image (optional)
        </label>
        <label className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-700/50 transition-colors">
          {inlineRefImage ? (
            <img src={inlineRefImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : persona.referenceImage ? (
            <img src={persona.referenceImage} alt="" className="w-10 h-10 rounded-lg object-cover opacity-60" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center"><Upload className="w-4 h-4 text-zinc-500" /></div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{inlineRefImageName || (persona.referenceImage ? 'Using persona reference' : 'Upload reference image')}</p>
            <p className="text-[10px] text-zinc-500">Models with ref support will use this for consistency</p>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload(setInlineRefImage, setInlineRefImageName)} />
        </label>
        {inlineRefImage && (
          <button onClick={() => { setInlineRefImage(null); setInlineRefImageName(null); }} className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors">
            Remove uploaded reference
          </button>
        )}
      </div>

      <textarea
        value={imagePrompt}
        onChange={e => setImagePrompt(e.target.value)}
        placeholder="Additional instructions (optional)..."
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 resize-none h-20 outline-none focus:ring-2 focus:ring-purple-500"
      />

      <button
        onClick={handleImageGenerate}
        disabled={isGenerating || !selectedModel}
        className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Image</>}
      </button>

      <div className="aspect-square max-h-[400px] rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden relative group mx-auto w-full max-w-[400px]">
        {isGenerating || isProcessing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
            <p className="text-xs text-zinc-500 animate-pulse">
              {isProcessing ? (postAction === 'upscale' ? 'Upscaling...' : 'Editing...') : `Generating with ${selectedModelInfo?.name || 'AI'}...`}
            </p>
          </div>
        ) : imageResult?.imageUrl ? (
          <>
            <img src={imageResult.imageUrl} alt="Generated" className="absolute inset-0 w-full h-full object-contain" />
            <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => downloadFile(imageResult.imageUrl, 'png')} className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-black/80" title="Download">
                <Download className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg">
              <span className="text-[10px] text-white font-medium">{imageResult.model}</span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <ImageIcon className="w-12 h-12 text-zinc-700 opacity-30" />
            <p className="text-xs text-zinc-600">Select a model and generate</p>
          </div>
        )}
      </div>

      {imageHistory.length > 1 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <History className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Version History</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {imageHistory.map((version, idx) => (
              <button
                key={idx}
                onClick={() => { setActiveHistoryIndex(idx); setImageResult({ imageUrl: version.imageUrl, model: version.model, promptUsed: version.promptUsed }); }}
                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${idx === activeHistoryIndex ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-zinc-700 hover:border-zinc-500'}`}
              >
                <img src={version.imageUrl} alt={version.label} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {activeVersion && !isGenerating && !isProcessing && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setPostAction(postAction === 'edit' ? null : 'edit')} className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${postAction === 'edit' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={() => setPostAction(postAction === 'upscale' ? null : 'upscale')} className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${postAction === 'upscale' ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
              <ArrowUpCircle className="w-3.5 h-3.5" /> Upscale
            </button>
            <button onClick={handleSaveImage} disabled={saved} className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white transition-all disabled:opacity-50">
              {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : <><CheckCircle className="w-3.5 h-3.5" /> Save</>}
            </button>
          </div>

          {postAction === 'edit' && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 space-y-2">
              {renderModelSelect(selectedEditModel, setSelectedEditModel, groupedEditModels)}
              <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="Describe what to change..." className="w-full bg-zinc-900 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 resize-none h-16 outline-none" />
              <div className="flex gap-2">
                <label className="flex-1 flex items-center gap-2 px-3 py-2 bg-zinc-900 rounded-lg cursor-pointer hover:bg-zinc-800 text-xs text-zinc-400">
                  <Upload className="w-3.5 h-3.5" />
                  {editAdditionalImageName || 'Add reference (optional)'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload(setEditAdditionalImage, setEditAdditionalImageName)} />
                </label>
                <button onClick={handleEdit} disabled={isProcessing || !editPrompt.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold disabled:opacity-50">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
              </div>
              {actionError && <p className="text-xs text-red-400">{actionError}</p>}
            </div>
          )}

          {postAction === 'upscale' && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 space-y-2">
              {renderModelSelect(selectedUpscaleModel, setSelectedUpscaleModel, groupedUpscaleModels)}
              <button onClick={handleUpscale} disabled={isProcessing} className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Upscaling...</> : <><ArrowUpCircle className="w-3.5 h-3.5" /> Upscale Now</>}
              </button>
              {actionError && <p className="text-xs text-red-400">{actionError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderVideoMode = () => (
    <div className="space-y-4">
      {renderVideoModelSelect()}

      {isI2VModel && (
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
            <Upload className="w-3 h-3" /> Source Image
          </label>
          <label className="flex items-center gap-2 px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-700/50 transition-colors">
            {videoSourceImage ? (
              <img src={videoSourceImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center"><Upload className="w-4 h-4 text-zinc-500" /></div>
            )}
            <div className="flex-1">
              <p className="text-sm text-white">{videoSourceImageName || 'Upload source image'}</p>
              <p className="text-[10px] text-zinc-500">Required for image-to-video models</p>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload(setVideoSourceImage, setVideoSourceImageName)} />
          </label>
          {!videoSourceImage && persona.referenceImage && (
            <p className="text-[10px] text-emerald-400">Will use persona reference image as fallback</p>
          )}
        </div>
      )}

      <textarea
        value={videoPrompt}
        onChange={e => setVideoPrompt(e.target.value)}
        placeholder="Describe the video you want to create..."
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 resize-none h-24 outline-none focus:ring-2 focus:ring-pink-500"
      />

      <button
        onClick={handleVideoGenerate}
        disabled={isGenerating || !selectedVideoModel || !videoPrompt.trim()}
        className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Video...</> : <><Video className="w-4 h-4" /> Generate Video</>}
      </button>

      <div className="aspect-video max-h-[360px] rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden relative mx-auto w-full">
        {isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
            <p className="text-xs text-zinc-500 animate-pulse">Generating video... this may take a minute</p>
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
            <Film className="w-12 h-12 text-zinc-700 opacity-30" />
            <p className="text-xs text-zinc-600">Select a model and generate</p>
          </div>
        )}
      </div>

      {videoResult && (
        <div className="flex gap-2">
          <button onClick={() => downloadFile(videoResult.videoUrl, 'mp4')} className="flex-1 py-2 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <button onClick={handleSaveVideo} disabled={saved} className="flex-1 py-2 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center gap-1.5 disabled:opacity-50">
            {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : <><CheckCircle className="w-3.5 h-3.5" /> Save to Library</>}
          </button>
        </div>
      )}
    </div>
  );

  const renderTextMode = () => {
    const isPromptMode = mode === 'prompt';
    const isTranscriptMode = mode === 'transcript';
    const isMultiScene = mode === 'multi-scene';
    const placeholders: Record<string, string> = {
      'prompt': 'Enter a topic or idea for your AI image/video prompt...',
      'transcript': 'Enter a topic or hook for your video script...',
      'multi-scene': 'Enter a topic for your multi-scene video script...',
    };
    const buttonLabels: Record<string, string> = {
      'prompt': 'Generate Prompt',
      'transcript': 'Generate Transcript',
      'multi-scene': 'Generate Multi-Scene Script',
    };

    return (
      <div className="space-y-4">
        <textarea
          value={textTopic}
          onChange={e => setTextTopic(e.target.value)}
          placeholder={placeholders[mode]}
          className={`w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 resize-none h-24 outline-none focus:ring-2 ${currentModeConfig.ringClass}`}
        />

        {isMultiScene && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase">Scene Count</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setSceneCount(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${sceneCount === n ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
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
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-4 relative">
              <div className="absolute top-3 right-3 flex gap-1.5">
                <button onClick={() => copyToClipboard(textResult)} className="p-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors" title="Copy">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([textResult], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    downloadFile(url, 'txt');
                    URL.revokeObjectURL(url);
                  }}
                  className="p-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors" title="Export"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>
              <div className="prose prose-invert prose-sm max-w-none pr-16">
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{textResult}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <header className="mb-6 pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Create Studio</h1>
        <p className="text-gray-400 text-sm mt-1">Generate content as {persona.name}</p>
      </header>

      <div className="flex bg-zinc-800/50 rounded-2xl p-1 gap-1 mb-5 overflow-x-auto">
        {MODE_CONFIG.map(m => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setGlobalError(null); }}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                mode === m.id
                  ? `bg-gradient-to-r ${m.gradient} text-white shadow-lg`
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{m.label}</span>
            </button>
          );
        })}
      </div>

      {personas.length > 1 && (
        <div className="mb-5">
          <label className="text-xs font-bold text-zinc-500 uppercase mb-1.5 block">Active Persona</label>
          <div className="relative">
            <select
              value={persona.id}
              onChange={e => onSelectPersona(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none appearance-none pr-10"
            >
              {personas.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.niche}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>
        </div>
      )}

      {globalError && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{globalError}</p>
        </div>
      )}

      {mode === 'image' && renderImageMode()}
      {mode === 'video' && renderVideoMode()}
      {(mode === 'prompt' || mode === 'transcript' || mode === 'multi-scene') && renderTextMode()}
    </div>
  );
}
