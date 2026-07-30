import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Sparkles,
  Loader2,
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Wand2,
  Sliders,
  Maximize2,
  Layers,
  Image as ImageIcon,
  Check,
  FolderPlus
} from 'lucide-react';
import { Persona } from '../types';
import { processBatchEdit, type BatchEditResult } from '../services/imageService';
import { api } from '../services/apiService';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

interface BatchImageStudioProps {
  persona: Persona;
  onClose: () => void;
  onSaveImage?: (item: any) => void;
}

interface UploadedItem {
  id: string;
  name: string;
  dataUrl: string;
}

const PRESET_INSTRUCTIONS = [
  {
    title: 'Extract & Isolate Person',
    desc: 'Isolate main person, remove background, clean studio lighting',
    prompt: 'Detect, extract, and isolate the main person in this photo. Remove crowded background, place on clean minimal studio lighting background, and enhance facial details.',
    icon: UserCheck
  },
  {
    title: 'Sharpen & Enhance Face',
    desc: 'Upscale resolution, refine skin texture, enhance eyes & hair',
    prompt: 'Sharpen facial details, enhance eye sparkle, polish skin texture naturally, upscale resolution, and remove digital noise.',
    icon: Sparkles
  },
  {
    title: 'High-End Fashion Swap',
    desc: 'Change outfit to luxury editorial fashion while keeping identity',
    prompt: 'Transform the clothing into sleek luxury designer fashion outfit, keeping the person identity, pose, and face completely intact.',
    icon: Wand2
  }
];

const EDIT_MODELS = [
  { id: 'replit:gpt-image-1', name: 'GPT Image 2 (OpenAI)' },
  { id: 'google:nano-banana-pro', name: 'Nano Banana Pro' },
  { id: 'wavespeed-edit:bytedance/seedream-v5.0-pro/edit', name: 'ByteDance Seedream 5.0 Pro Edit' },
  { id: 'wavespeed-edit:wavespeed-ai/wan-2.7-pro/edit', name: 'Wan 7 Pro Edit' },
  { id: 'wavespeed-edit:wavespeed-ai/qwen-2.0-pro/edit', name: 'Qwen 2 Pro Edit' },
  { id: 'wavespeed-edit:wavespeed-ai/seededit-v3.0', name: 'SeedEdit v3.0 (Fast Batch)' },
  { id: 'google:imagen-4-ultra', name: 'Google Imagen 4 Ultra Edit' },
];

export default function BatchImageStudio({ persona, onClose, onSaveImage }: BatchImageStudioProps) {
  const [items, setItems] = useState<UploadedItem[]>([]);
  const [selectedModel, setSelectedModel] = useState(EDIT_MODELS[0].id);
  const [prompt, setPrompt] = useState(PRESET_INSTRUCTIONS[0].prompt);
  const [activePreset, setActivePreset] = useState<number | null>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [results, setResults] = useState<BatchEditResult[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<BatchEditResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (items.length + files.length > 12) {
      toast.error('Maximum 12 images per batch');
      return;
    }

    const newItems: UploadedItem[] = [];
    let loaded = 0;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        newItems.push({
          id: `item-${Date.now()}-${index}`,
          name: file.name,
          dataUrl: reader.result as string
        });
        loaded++;
        if (loaded === files.length) {
          setItems(prev => [...prev, ...newItems]);
          toast.success(`Loaded ${files.length} images for batch editing`);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const clearAll = () => {
    setItems([]);
    setResults([]);
    setSelectedPreview(null);
  };

  const runBatchProcessing = async () => {
    if (items.length === 0) return toast.error('Upload at least 1 photo');
    if (!prompt.trim()) return toast.error('Enter an instruction prompt');

    setIsProcessing(true);
    setProcessedCount(0);
    setResults([]);

    const imageUrls = items.map(i => i.dataUrl);
    const toastId = toast.loading(`Processing batch of ${items.length} images...`);

    try {
      const batchResults = await processBatchEdit(imageUrls, prompt, selectedModel);
      setResults(batchResults);
      toast.success(`Batch processing completed! ${batchResults.filter(r => r.status === 'success').length}/${items.length} succeeded.`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Batch processing failed', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAllToLibrary = async () => {
    const successfulResults = results.filter(r => r.status === 'success' && r.resultUrl);
    if (successfulResults.length === 0) return toast.error('No processed images to save');

    let saved = 0;
    for (const res of successfulResults) {
      try {
        const payload = {
          id: `batch-${Date.now()}-${res.index}`,
          url: res.resultUrl,
          prompt: `Batch Edit: ${prompt.slice(0, 80)}`,
          timestamp: Date.now(),
          model: selectedModel,
          mediaType: 'image' as const
        };
        await api.images.create(persona.id, payload);
        if (onSaveImage) onSaveImage(payload);
        saved++;
      } catch (err) {
        console.error('Failed to save image to vault', err);
      }
    }

    toast.success(`Saved ${saved} images to ${persona.name}'s Visual Library!`);
  };

  const handleDownloadAll = () => {
    const successfulResults = results.filter(r => r.status === 'success' && r.resultUrl);
    if (successfulResults.length === 0) return;

    successfulResults.forEach((r, idx) => {
      const a = document.createElement('a');
      a.href = r.resultUrl;
      a.download = `batch_extracted_${idx + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    toast.success(`Started downloading ${successfulResults.length} images!`);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#07070c] backdrop-blur-2xl flex flex-col text-white">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilesSelect}
        multiple
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all">
            <X size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Layers size={22} className="text-pink-400 animate-pulse" /> Batch Person <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">Extractor & Enhancer</span>
            </h1>
            <p className="text-xs text-white/50">
              Upload 8-12 photos to isolate individuals, clean backgrounds, and enhance facial details in bulk.
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-3">
            <button onClick={clearAll} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-rose-500/20 text-white/60 hover:text-rose-300 border border-white/10 transition-all">
              Clear All ({items.length})
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center gap-2 transition-all"
            >
              <Upload size={14} /> Add More Photos
            </button>
          </div>
        )}
      </div>

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Uploads & Instruction Configuration */}
        <div className="w-full lg:w-[420px] border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto p-6 space-y-6 bg-black/20">
          {/* Upload Area */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
              1. Upload Photos ({items.length} / 12)
            </label>

            {items.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-pink-500/30 hover:border-pink-500/60 bg-pink-500/5 hover:bg-pink-500/10 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Upload size={28} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Click or drag photos here</p>
                  <p className="text-xs text-white/40 mt-1">Select 8 to 12 group or portrait photos</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-white/[0.02] rounded-xl border border-white/5">
                {items.map((item, idx) => (
                  <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                    <img src={item.dataUrl} alt="" className="w-full h-full object-cover" />
                    <span className="absolute top-1 left-1 bg-black/70 text-[9px] font-bold px-1.5 rounded text-white">{idx + 1}</span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute top-1 right-1 p-1 bg-black/80 text-white/60 hover:text-rose-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
              2. Select AI Extraction Preset
            </label>
            <div className="space-y-2">
              {PRESET_INSTRUCTIONS.map((preset, idx) => {
                const Icon = preset.icon;
                const isSelected = activePreset === idx;
                return (
                  <button
                    key={preset.title}
                    onClick={() => {
                      setActivePreset(idx);
                      setPrompt(preset.prompt);
                    }}
                    className={cn(
                      'w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all',
                      isSelected
                        ? 'border-pink-500/50 bg-pink-500/10 ring-1 ring-pink-500/30'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                    )}
                  >
                    <div className={cn('p-2 rounded-lg shrink-0', isSelected ? 'bg-pink-500 text-black' : 'bg-white/5 text-white/60')}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{preset.title}</p>
                      <p className="text-[10px] text-white/40 leading-relaxed mt-0.5">{preset.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Instruction Prompt */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
              3. Custom Prompt Instruction
            </label>
            <textarea
              value={prompt}
              onChange={e => {
                setPrompt(e.target.value);
                setActivePreset(null);
              }}
              placeholder="Describe what to extract, isolate, or enhance..."
              className="w-full bg-[#0c0c12] border border-white/10 rounded-xl p-3 text-xs text-white outline-none resize-none placeholder:text-white/20 h-24 focus:border-pink-500/40"
            />
          </div>

          {/* AI Model */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
              4. AI Editing Model
            </label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full bg-[#121218] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
            >
              {EDIT_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Execute Button */}
          <button
            onClick={runBatchProcessing}
            disabled={isProcessing || items.length === 0}
            className={cn(
              'w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl',
              isProcessing || items.length === 0
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 via-rose-500 to-violet-600 hover:brightness-110 text-white shadow-pink-500/20'
            )}
          >
            {isProcessing ? (
              <><Loader2 size={18} className="animate-spin" /> Processing Batch...</>
            ) : (
              <><Sparkles size={18} /> Extract & Enhance ({items.length} Photos)</>
            )}
          </button>
        </div>

        {/* Right Column: Results Showcase & Comparison */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-[#07070a] justify-between">
          {results.length > 0 ? (
            <div className="space-y-6">
              {/* Header Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" /> Batch Processing Results
                  </h3>
                  <p className="text-xs text-white/50">
                    {results.filter(r => r.status === 'success').length} of {results.length} images processed successfully.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveAllToLibrary}
                    className="px-4 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 text-xs font-bold flex items-center gap-2 transition-all"
                  >
                    <FolderPlus size={14} /> Save All to Vault
                  </button>
                  <button
                    onClick={handleDownloadAll}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center gap-2 transition-all shadow-lg"
                  >
                    <Download size={14} /> Download All
                  </button>
                </div>
              </div>

              {/* Grid of Original vs Extracted Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {results.map((res, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span className="font-bold">Image #{i + 1}</span>
                      {res.status === 'success' ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">Extracted ✓</span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">Failed</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 aspect-[16/10] rounded-xl overflow-hidden bg-black/40 border border-white/5">
                      <div className="relative group">
                        <img src={res.originalUrl} alt="Original" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 bg-black/80 text-[8px] font-bold text-white/60 px-1.5 py-0.5 rounded">Original</span>
                      </div>

                      <div className="relative group bg-black/60 flex items-center justify-center">
                        {res.status === 'success' && res.resultUrl ? (
                          <>
                            <img src={res.resultUrl} alt="Extracted" className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 right-1 bg-pink-500 text-[8px] font-black text-black px-1.5 py-0.5 rounded">Extracted</span>
                          </>
                        ) : (
                          <div className="text-center p-2">
                            <AlertCircle size={18} className="text-rose-400 mx-auto mb-1" />
                            <span className="text-[9px] text-rose-300/80">{res.error || 'Failed'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {res.status === 'success' && res.resultUrl && (
                      <div className="flex gap-2">
                        <a
                          href={res.resultUrl}
                          download={`extracted_person_${i + 1}.png`}
                          className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all border border-white/5"
                        >
                          <Download size={12} /> Download
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-3xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-4">
                <Layers size={40} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Batch Person Isolator & Enhancer</h3>
              <p className="text-xs text-white/40 max-w-md leading-relaxed">
                Upload up to 12 images on the left, select an extraction preset or write a custom instruction, and click Run Batch Edit to isolate and enhance all subjects in parallel.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
