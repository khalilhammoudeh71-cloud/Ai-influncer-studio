import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paintbrush,
  Eraser,
  RotateCcw,
  Sparkles,
  Loader2,
  X,
  Upload,
  Download,
  CheckCircle2,
  FolderPlus,
  Sliders,
  Scissors,
  Wand2,
  Glasses,
  Shirt,
  Trash2,
  Flame,
  FolderHeart
} from 'lucide-react';
import { Persona } from '../types';
import { editImage } from '../services/imageService';
import { api } from '../services/apiService';
import { cn } from '../utils/cn';
import { AssetPickerModal } from './AssetPickerModal';
import toast from 'react-hot-toast';
import { accountLocalStorage } from '../utils/accountStorage';

interface InpaintStudioProps {
  persona: Persona;
  onClose: () => void;
  onSaveImage?: (item: any) => void;
}

const INPAINT_PRESETS = [
  {
    title: 'Anatomy / Penis Edit',
    prompt: 'Modify the erect penis in masked area to be 10 inches long, thick, highly detailed skin texture, realistic lighting',
    icon: Flame
  },
  {
    title: 'Add Accessories',
    prompt: 'Add stylish silver aviator sunglasses on the eyes',
    icon: Glasses
  },
  {
    title: 'Change Outfit in Mask',
    prompt: 'Replace clothing in masked area with a sleek luxury red silk blazer',
    icon: Shirt
  },
  {
    title: 'Remove Object',
    prompt: 'Remove object in masked area cleanly, blending with surrounding background',
    icon: Trash2
  },
  {
    title: 'Hair Color / Style Swap',
    prompt: 'Change hair in masked area to luminous platinum blonde with soft waves',
    icon: Wand2
  }
];

const INPAINT_MODELS = [
  { id: 'replit:gpt-image-1', name: 'GPT Image 2 (OpenAI)' },
  { id: 'google:nano-banana-pro', name: 'Nano Banana Pro' },
  { id: 'wavespeed-edit:bytedance/seedream-v5.0-pro/edit', name: 'ByteDance Seedream 5.0 Pro Edit' },
  { id: 'wavespeed-edit:wavespeed-ai/wan-2.7-pro/edit', name: 'Wan 7 Pro Edit' },
  { id: 'wavespeed-edit:wavespeed-ai/qwen-2.0-pro/edit', name: 'Qwen 2 Pro Edit' },
  { id: 'wavespeed-edit:wavespeed-ai/firered-v1.5-image/edit', name: 'FireRed v1.5 Edit (Best for Uncensored Anatomy)' },
  { id: 'wavespeed-edit:wavespeed-ai/seededit-v3.0', name: 'SeedEdit v3.0 (Fast Inpaint)' },
  { id: 'venice:lustify-v8', name: 'Venice Lustify v8 (Uncensored)' },
];

export default function InpaintStudio({ persona, onClose, onSaveImage }: InpaintStudioProps) {
  const [sourceImage, setSourceImage] = useState<string | null>(persona.referenceImage || persona.avatar || null);
  const [brushSize, setBrushSize] = useState(30);
  const [prompt, setPrompt] = useState(INPAINT_PRESETS[0].prompt);
  const [selectedInpaintModel, setSelectedInpaintModel] = useState(INPAINT_MODELS[0].id);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [mode, setMode] = useState<'paint' | 'erase'>('paint');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Canvas when Source Image loads
  useEffect(() => {
    if (!sourceImage) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = sourceImage;
    img.onload = () => {
      imageRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth || 1024;
        canvas.height = img.naturalHeight || 1024;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    };
  }, [sourceImage]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (mode === 'paint') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.75)'; // Pink visible mask overlay
    } else {
      ctx.globalCompositeOperation = 'destination-out';
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    toast.success('Mask cleared');
  };

  const generateMaskDataUrl = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    // Create a black-and-white mask canvas expected by AI Inpainting endpoints
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return '';

    // Fill background with black (unmasked)
    maskCtx.fillStyle = '#000000';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Draw the painted strokes as solid white (masked area to edit)
    maskCtx.drawImage(canvas, 0, 0);
    const imgData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 0) {
        data[i] = 255;     // Red
        data[i + 1] = 255; // Green
        data[i + 2] = 255; // Blue
        data[i + 3] = 255; // Alpha
      } else {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
    }

    maskCtx.putImageData(imgData, 0, 0);
    return maskCanvas.toDataURL('image/png');
  };

  const handleRunInpaint = async () => {
    if (!sourceImage) return toast.error('Please upload or select an image');
    if (!prompt.trim()) return toast.error('Enter an inpainting prompt instruction');

    setIsGenerating(true);
    setResultImage(null);
    const toastId = toast.loading('Running AI Inpainting on masked region...');

    try {
      const maskDataUrl = generateMaskDataUrl();
      const res = await editImage(
        sourceImage,
        prompt,
        selectedInpaintModel,
        undefined,
        maskDataUrl
      );

      setResultImage(res.imageUrl);
      setIsSaved(false);
      toast.success('Inpainting completed successfully!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Inpainting failed', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setSourceImage(ev.target?.result as string);
      setResultImage(null);
    };
    reader.readAsDataURL(file);
  };

  const [isSaved, setIsSaved] = useState(false);

  const handleSaveToVault = async () => {
    if (!resultImage) return;
    try {
      const payload = {
        id: `inpaint-${Date.now()}`,
        url: resultImage,
        prompt: `Inpaint: ${prompt}`,
        timestamp: Date.now(),
        model: 'Inpaint Studio',
        mediaType: 'image' as const
      };

      if (persona?.id && persona.id !== 'none') {
        try {
          await api.images.create(persona.id, payload);
        } catch (e) {
          console.warn('[InpaintStudio] API save error:', e);
        }
      }

      try {
        const galleryRaw = accountLocalStorage.getItem('ai_influencer_gallery');
        const gallery = galleryRaw ? JSON.parse(galleryRaw) : [];
        gallery.unshift(payload);
        accountLocalStorage.setItem('ai_influencer_gallery', JSON.stringify(gallery));
      } catch (e) {
        console.warn('[InpaintStudio] localStorage save error:', e);
      }

      if (onSaveImage) onSaveImage(payload);
      setIsSaved(true);
      toast.success(`Saved to ${persona?.name || 'Persona'}'s Vault & Visual Library! 🎨`);
    } catch (err) {
      toast.error('Failed to save to library');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-[#07070c] backdrop-blur-2xl flex flex-col text-white w-screen h-screen">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
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
              <Paintbrush size={22} className="text-pink-400 animate-pulse" /> AI Inpaint <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400">Brush Studio</span>
            </h1>
            <p className="text-xs text-white/50">
              Paint over any area of a photo with the brush and describe what to replace, add, or edit.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 flex items-center gap-2 transition-all shadow-lg"
          >
            <FolderHeart size={14} /> Choose from Asset Library
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center gap-2 transition-all"
          >
            <Upload size={14} /> Upload Custom Photo
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Canvas Mask Editor */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#050508] relative overflow-hidden">
          {sourceImage ? (
            <div className="relative max-w-2xl max-h-[65vh] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-white/10 select-none">
              {/* Underlying Image */}
              <img
                src={sourceImage}
                alt="Source to inpaint"
                className="max-h-[65vh] w-auto object-contain pointer-events-none"
              />

              {/* Painting Overlay Canvas */}
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
              />
            </div>
          ) : (
            <div className="text-center space-y-4">
              <Paintbrush size={48} className="text-white/20 mx-auto" />
              <p className="text-sm font-medium text-white/40">Upload or select an image to start brush inpainting</p>
            </div>
          )}

          {/* Brush Controls Bar */}
          {sourceImage && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 bg-black/60 backdrop-blur-xl border border-white/10 p-2.5 rounded-2xl">
              <button
                onClick={() => setMode('paint')}
                className={cn('px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all',
                  mode === 'paint' ? 'bg-pink-500 text-black shadow-md' : 'text-white/60 hover:text-white'
                )}
              >
                <Paintbrush size={14} /> Paint Mask
              </button>

              <button
                onClick={() => setMode('erase')}
                className={cn('px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all',
                  mode === 'erase' ? 'bg-pink-500 text-black shadow-md' : 'text-white/60 hover:text-white'
                )}
              >
                <Eraser size={14} /> Erase Mask
              </button>

              <div className="h-4 w-px bg-white/10" />

              <div className="flex items-center gap-2 px-2">
                <span className="text-[10px] font-bold text-white/50 uppercase">Size:</span>
                <input
                  type="range"
                  min={10}
                  max={120}
                  value={brushSize}
                  onChange={e => setBrushSize(Number(e.target.value))}
                  className="w-24 accent-pink-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-pink-400 w-6">{brushSize}</span>
              </div>

              <div className="h-4 w-px bg-white/10" />

              <button
                onClick={clearMask}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white/60 hover:text-rose-400 hover:bg-rose-500/10 transition-all flex items-center gap-1.5"
              >
                <RotateCcw size={13} /> Clear
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Prompt & Presets & Result */}
        <div className="w-full lg:w-[420px] border-b lg:border-b-0 lg:border-l border-white/10 overflow-y-auto p-6 space-y-6 bg-black/20">
          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
              Inpaint Idea Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INPAINT_PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.title}
                    onClick={() => setPrompt(preset.prompt)}
                    className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:border-pink-500/30 hover:bg-pink-500/5 text-left transition-all group"
                  >
                    <Icon size={16} className="text-pink-400 mb-1 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-white">{preset.title}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt Instruction */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
              Inpaint Instruction Prompt
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe what to generate inside the painted mask area..."
              className="w-full bg-[#0c0c12] border border-white/10 rounded-xl p-3 text-xs text-white outline-none resize-none placeholder:text-white/20 h-24 focus:border-pink-500/40"
            />
          </div>

          {/* Model Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
              Inpaint Model & Engine
            </label>
            <select
              value={selectedInpaintModel}
              onChange={e => setSelectedInpaintModel(e.target.value)}
              className="w-full bg-[#121218] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
            >
              {INPAINT_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleRunInpaint}
            disabled={isGenerating || !sourceImage}
            className={cn(
              'w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl',
              isGenerating || !sourceImage
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:brightness-110 text-black font-black shadow-pink-500/20'
            )}
          >
            {isGenerating ? (
              <><Loader2 size={18} className="animate-spin" /> Inpainting Masked Area...</>
            ) : (
              <><Sparkles size={18} /> Run AI Inpaint</>
            )}
          </button>

          {/* Result Showcase */}
          {resultImage && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Inpainted Result
                </span>
              </div>

              <div className="rounded-2xl overflow-hidden border border-emerald-500/30 bg-black/60 shadow-2xl">
                <img src={resultImage} alt="Inpainted result" className="w-full h-auto object-contain max-h-[300px]" />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveToVault}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border',
                    isSaved
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border-pink-500/30'
                  )}
                >
                  {isSaved ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-400" /> Saved to Vault
                    </>
                  ) : (
                    <>
                      <FolderPlus size={14} /> Save to Vault
                    </>
                  )}
                </button>
                <a
                  href={resultImage}
                  download="inpainted_result.png"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <Download size={14} /> Download
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <AssetPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelectAsset={(url) => {
          setSourceImage(url);
          setResultImage(null);
        }}
        title="Select Image to Inpaint from Asset Library"
        currentPersona={persona}
      />
    </div>,
    document.body
  );
}
