import React, { useState, useEffect, useMemo } from 'react';
import {
  Camera,
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
} from 'lucide-react';
import { Persona, GeneratedImage } from '../types';
import {
  generateImage,
  fetchAllModelTypes,
  editImage,
  upscaleImage,
  type ModelInfo,
  type GenerateImageResult,
} from '../services/imageService';

interface VisualGeneratorProps {
  persona: Persona;
  onClose: () => void;
  onSaveImage: (image: GeneratedImage) => void;
}

const ENVIRONMENTS = [
  'Luxury Hotel', 'Modern Apartment', 'Rooftop Lounge', 'Beach Resort',
  'Yacht Deck', 'Upscale Restaurant', 'Private Gym', 'Beauty Studio',
  'Dental Office', 'Creator Studio', 'City Street', 'Penthouse'
];

const OUTFITS = [
  'Casual Chic', 'Luxury Evening', 'Business Professional', 'Fitness Wear',
  'Medical Scrubs', 'Edgy Streetwear', 'Glamorous Gown', 'Home Lounge'
];

const FRAMING = [
  'Portrait', 'Selfie Style', 'Full Body', 'Half Body', 'Candid', 'Cinematic'
];

const MOODS = [
  'Confident', 'Friendly', 'Thoughtful', 'Playful', 'Professional', 'Seductive'
];

type PostGenAction = null | 'edit' | 'upscale';

export const VisualGenerator: React.FC<VisualGeneratorProps> = ({ persona, onClose, onSaveImage }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState(ENVIRONMENTS[0]);
  const [selectedOutfit, setSelectedOutfit] = useState(OUTFITS[0]);
  const [selectedFraming, setSelectedFraming] = useState(FRAMING[0]);
  const [selectedMood, setSelectedMood] = useState(MOODS[0]);
  const [result, setResult] = useState<GenerateImageResult | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [editModels, setEditModels] = useState<ModelInfo[]>([]);
  const [upscaleModels, setUpscaleModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelsLoading, setModelsLoading] = useState(true);

  const [postAction, setPostAction] = useState<PostGenAction>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [selectedEditModel, setSelectedEditModel] = useState('');
  const [selectedUpscaleModel, setSelectedUpscaleModel] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const hasRefImage = !!persona.referenceImage;

  useEffect(() => {
    fetchAllModelTypes()
      .then(({ models: m, editModels: em, upscaleModels: um }) => {
        setModels(m);
        setEditModels(em);
        setUpscaleModels(um);
        const preferred = hasRefImage
          ? m.find(x => x.hasEditVariant) || m[0]
          : m[0];
        if (preferred) setSelectedModel(preferred.id);
        if (em.length > 0) setSelectedEditModel(em[0].id);
        if (um.length > 0) setSelectedUpscaleModel(um[0].id);
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
    sortedModels.forEach((m) => {
      if (!groups[m.provider]) groups[m.provider] = [];
      groups[m.provider].push(m);
    });
    return groups;
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

  const selectedModelInfo = useMemo(() => models.find(m => m.id === selectedModel), [models, selectedModel]);

  const handleGenerate = async () => {
    if (!selectedModel) return;
    setIsGenerating(true);
    setGlobalError(null);
    setResult(null);
    setPostAction(null);
    setActionError(null);

    try {
      const data = await generateImage({
        persona,
        modelId: selectedModel,
        environment: selectedEnv,
        outfitStyle: selectedOutfit,
        framing: selectedFraming,
        mood: selectedMood,
        additionalInstructions: prompt,
      });
      setResult(data);
    } catch (err: any) {
      setGlobalError(err.message || 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = async () => {
    if (!result?.imageUrl || !editPrompt.trim() || !selectedEditModel) return;
    setIsProcessing(true);
    setActionError(null);

    try {
      const data = await editImage(result.imageUrl, editPrompt, selectedEditModel);
      setResult({ imageUrl: data.imageUrl, model: data.model, promptUsed: editPrompt });
      setPostAction(null);
      setEditPrompt('');
    } catch (err: any) {
      setActionError(err.message || 'Editing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpscale = async () => {
    if (!result?.imageUrl || !selectedUpscaleModel) return;
    setIsProcessing(true);
    setActionError(null);

    try {
      const data = await upscaleImage(result.imageUrl, selectedUpscaleModel);
      setResult({ imageUrl: data.imageUrl, model: data.model, promptUsed: result.promptUsed });
      setPostAction(null);
    } catch (err: any) {
      setActionError(err.message || 'Upscaling failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    if (!result?.imageUrl) return;
    const image: GeneratedImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: result.imageUrl,
      prompt: result.promptUsed || prompt || '',
      timestamp: Date.now(),
      environment: selectedEnv,
      outfit: selectedOutfit,
      framing: selectedFraming,
      model: result.model,
    };
    onSaveImage(image);
    onClose();
  };

  const downloadImage = () => {
    if (!result?.imageUrl) return;
    const a = document.createElement('a');
    a.href = result.imageUrl;
    a.download = `${persona.name.replace(/\s+/g, '_')}_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 sticky top-0 z-10">
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
              <p className="text-xs text-zinc-400">
                {models.length} models available
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="max-h-[82vh] overflow-y-auto">
          <div className="p-6 space-y-5">

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
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none pr-10"
                  >
                    {Object.entries(groupedModels).map(([provider, providerModels]) => (
                      <optgroup key={provider} label={provider}>
                        {providerModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}{hasRefImage && !m.hasEditVariant ? ' ⚠ No ref support' : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
              )}
              {selectedModelInfo && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {selectedModelInfo.provider}
                  </span>
                  {hasRefImage && selectedModelInfo.hasEditVariant && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                      Uses reference image
                    </span>
                  )}
                  {hasRefImage && !selectedModelInfo.hasEditVariant && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Text-only — will ignore reference
                    </span>
                  )}
                  {selectedModelInfo.price > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ${selectedModelInfo.price.toFixed(3)} per image
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="aspect-square max-h-[400px] rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden relative group mx-auto w-full max-w-[400px]">
              {isGenerating || isProcessing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
                  <p className="text-xs text-zinc-500 animate-pulse">
                    {isProcessing
                      ? (postAction === 'upscale' ? 'Upscaling...' : 'Editing...')
                      : `Generating with ${selectedModelInfo?.name || 'AI'}...`}
                  </p>
                </div>
              ) : result?.imageUrl ? (
                <>
                  <img src={result.imageUrl} alt="Generated" className="w-full h-full object-cover" />
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
                    <span className="text-[10px] text-white font-medium">{result.model}</span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="w-12 h-12 text-zinc-700 opacity-30" />
                  <p className="text-xs text-zinc-600">Select a model and generate</p>
                </div>
              )}
            </div>

            {globalError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {globalError}
              </div>
            )}

            {result?.imageUrl && !isProcessing && (
              <>
                <button
                  onClick={handleSave}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save to Visual Library
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setPostAction(postAction === 'edit' ? null : 'edit'); setActionError(null); }}
                    className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                      postAction === 'edit'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600'
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
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    Upscale Image
                  </button>
                </div>

                {postAction === 'edit' && (
                  <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/20 space-y-3">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Edit with AI</p>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 ml-1 flex items-center gap-1">
                        <Cpu className="w-2.5 h-2.5" /> Edit Model
                      </label>
                      <div className="relative">
                        <select
                          value={selectedEditModel}
                          onChange={(e) => setSelectedEditModel(e.target.value)}
                          className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none pr-8"
                        >
                          {Object.entries(groupedEditModels).map(([provider, providerModels]) => (
                            <optgroup key={provider} label={provider}>
                              {providerModels.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 ml-1">What to change</label>
                      <textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="e.g. Change background to a beach sunset, add sunglasses, make hair blonde..."
                        className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white min-h-[60px] focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      />
                    </div>
                    {actionError && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
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
                      <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 ml-1 flex items-center gap-1">
                        <Cpu className="w-2.5 h-2.5" /> Upscale Model
                      </label>
                      <div className="relative">
                        <select
                          value={selectedUpscaleModel}
                          onChange={(e) => setSelectedUpscaleModel(e.target.value)}
                          className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8"
                        >
                          {Object.entries(groupedUpscaleModels).map(([provider, providerModels]) => (
                            <optgroup key={provider} label={provider}>
                              {providerModels.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                    {actionError && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
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
                  <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Environment
                  </label>
                  <select
                    value={selectedEnv}
                    onChange={(e) => setSelectedEnv(e.target.value)}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {ENVIRONMENTS.map(env => <option key={env} value={env}>{env}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                    <Shirt className="w-3 h-3" /> Outfit
                  </label>
                  <select
                    value={selectedOutfit}
                    onChange={(e) => setSelectedOutfit(e.target.value)}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {OUTFITS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                    <Layout className="w-3 h-3" /> Framing
                  </label>
                  <select
                    value={selectedFraming}
                    onChange={(e) => setSelectedFraming(e.target.value)}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {FRAMING.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                    <Smile className="w-3 h-3" /> Mood
                  </label>
                  <select
                    value={selectedMood}
                    onChange={(e) => setSelectedMood(e.target.value)}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase">Additional Instructions (Optional)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Holding a coffee cup, direct eye contact, cinematic lighting..."
                className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-sm text-white min-h-[70px] focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        <div className="p-5 bg-zinc-950 border-t border-zinc-800">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isProcessing || !selectedModel}
            className="w-full bg-white text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50 text-sm"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : result ? (
              <><RefreshCw className="w-4 h-4" /> Regenerate</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate Image</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
