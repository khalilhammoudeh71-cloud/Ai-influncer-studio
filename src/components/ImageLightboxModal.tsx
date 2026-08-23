import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Download, Sparkles, ZoomIn, ZoomOut, RotateCcw, 
  ArrowUpCircle, Wand2, Bookmark, Check, Loader2, 
  Layers, Eye, ExternalLink
} from 'lucide-react';
import { ModelInfo, fetchAllModelTypes, upscaleImage, editImage, enhancePrompt } from '../services/imageService';
import { Persona } from '../types';
import { api } from '../services/apiService';
import toast from 'react-hot-toast';

interface ImageVersion {
  url: string;
  label: string;
  model?: string;
  prompt?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  prompt?: string;
  persona: Persona;
  onSaveToVault?: (url: string, prompt?: string) => Promise<void>;
  onImageUpdated?: (newUrl: string) => void;
}

export default function ImageLightboxModal({
  isOpen,
  onClose,
  imageUrl,
  prompt: initialPrompt,
  persona,
  onSaveToVault,
  onImageUpdated,
}: Props) {
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);

  const [activeTab, setActiveTab] = useState<'view' | 'upscale' | 'edit'>('view');
  const [scale, setScale] = useState(1);

  // Model states
  const [upscaleModels, setUpscaleModels] = useState<ModelInfo[]>([]);
  const [editModels, setEditModels] = useState<ModelInfo[]>([]);
  const [selectedUpscaleModel, setSelectedUpscaleModel] = useState('');
  const [selectedEditModel, setSelectedEditModel] = useState('');

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');
  const [editPromptText, setEditPromptText] = useState('');
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Resolution settings
  const [targetResolution, setTargetResolution] = useState<'2k' | '4k' | '8k'>('4k');

  useEffect(() => {
    if (isOpen && imageUrl) {
      setVersions([{
        url: imageUrl,
        label: 'Original',
        prompt: initialPrompt,
      }]);
      setActiveVersionIndex(0);
      setActiveTab('view');
      setScale(1);
      setEditPromptText('');
      setIsSaved(false);
    }
  }, [isOpen, imageUrl, initialPrompt]);

  useEffect(() => {
    if (isOpen) {
      fetchAllModelTypes().then(({ editModels: em, upscaleModels: um }) => {
        setUpscaleModels(um);
        setEditModels(em);
        if (um.length > 0) {
          const preferredUpscaler = um.find(m => m.id.includes('topaz') || m.id.includes('esrgan') || m.id.includes('clarity') || m.name.toLowerCase().includes('upscale')) || um[0];
          setSelectedUpscaleModel(preferredUpscaler.id);
        }
        if (em.length > 0) {
          const preferredEdit = em.find(m => m.id.includes('seedream') || m.id.includes('seededit') || m.id.includes('qwen')) || em[0];
          setSelectedEditModel(preferredEdit.id);
        }
      }).catch(err => {
        console.warn('Failed to load upscale/edit models:', err);
      });
    }
  }, [isOpen]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale(s => Math.min(s + 0.25, 3));
      } else if (e.key === '-') {
        setScale(s => Math.max(s - 0.25, 0.5));
      } else if (e.key === '0') {
        setScale(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Rendered through a document-body portal below, so lock the page behind the
  // lightbox and prevent the underlying chat from shifting or scrolling.
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const currentImage = versions[activeVersionIndex]?.url || imageUrl;
  const currentPrompt = versions[activeVersionIndex]?.prompt || initialPrompt || `Photo of ${persona.name}`;

  const handleDownload = () => {
    try {
      const a = document.createElement('a');
      a.href = currentImage;
      const cleanName = (persona.name || 'Persona').replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `${cleanName}_${targetResolution.toUpperCase()}_${timestamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Download started!');
    } catch {
      window.open(currentImage, '_blank');
    }
  };

  const handleSaveVault = async () => {
    if (isSaving || isSaved) return;
    setIsSaving(true);
    try {
      if (onSaveToVault) {
        await onSaveToVault(currentImage, currentPrompt);
      } else {
        const media = {
          id: `media-${Date.now()}`,
          url: currentImage,
          prompt: currentPrompt,
          timestamp: Date.now(),
          mediaType: 'image' as const,
        };
        const updated = { ...persona, visualLibrary: [...(persona.visualLibrary || []), media] };
        await api.updatePersonaInVault(updated);
        await api.images.create(persona.id, media);
      }
      setIsSaved(true);
      toast.success('Saved to Visual Vault!');
    } catch (err: any) {
      toast.error('Failed to save to Vault');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteUpscale = async () => {
    if (!currentImage || !selectedUpscaleModel || isProcessing) return;
    setIsProcessing(true);
    setProcessStatus(`Upscaling to ${targetResolution.toUpperCase()} Ultra-HD...`);
    try {
      const result = await upscaleImage(currentImage, selectedUpscaleModel, targetResolution);
      const newVersion: ImageVersion = {
        url: result.imageUrl,
        label: `Upscaled (${targetResolution.toUpperCase()})`,
        model: result.model,
        prompt: currentPrompt,
      };
      setVersions(prev => [...prev, newVersion]);
      setActiveVersionIndex(versions.length);
      setActiveTab('view');
      onImageUpdated?.(result.imageUrl);
      toast.success(`✨ Upscaled successfully to ${targetResolution.toUpperCase()}!`);
    } catch (err: any) {
      toast.error(err?.message || 'Upscale failed. Please try a different model.');
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  const handleExecuteEdit = async () => {
    if (!currentImage || !selectedEditModel || !editPromptText.trim() || isProcessing) return;
    setIsProcessing(true);
    setProcessStatus('Applying AI visual edits...');
    try {
      const result = await editImage(currentImage, editPromptText.trim(), selectedEditModel);
      const newVersion: ImageVersion = {
        url: result.imageUrl,
        label: `Edit: ${editPromptText.slice(0, 18)}...`,
        model: result.model,
        prompt: editPromptText.trim(),
      };
      setVersions(prev => [...prev, newVersion]);
      setActiveVersionIndex(versions.length);
      setActiveTab('view');
      onImageUpdated?.(result.imageUrl);
      toast.success('🎨 Image edited successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Edit failed. Please try a different model or prompt.');
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  const handleEnhanceEditPrompt = async () => {
    if (!editPromptText.trim() || isEnhancingPrompt) return;
    setIsEnhancingPrompt(true);
    try {
      const enhanced = await enhancePrompt(editPromptText.trim());
      setEditPromptText(enhanced);
      toast.success('✨ Prompt enhanced with creative photorealism!');
    } catch {
      toast.error('Failed to enhance prompt');
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] isolate w-screen h-[100dvh] bg-black/95 backdrop-blur-2xl overflow-hidden select-none"
        role="dialog"
        aria-modal="true"
        aria-label={`Full-screen image of ${persona.name}`}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isProcessing) onClose();
        }}
      >
        {/* Top Minimal Floating Header */}
        <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-b from-black via-black/85 to-transparent backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-white/10 border border-white/15 flex-shrink-0">
              {persona.referenceImage || persona.avatar ? (
                <img src={persona.referenceImage || persona.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white">
                  {persona.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-[320px]">
                  {persona.name}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 border border-white/10">
                  {versions[activeVersionIndex]?.label || 'Portrait'}
                </span>
              </div>
              {currentPrompt && (
                <p className="text-[11px] text-zinc-400 truncate max-w-[280px] sm:max-w-[500px]">
                  "{currentPrompt}"
                </p>
              )}
            </div>
          </div>

          {/* Zoom, Open Tab & Close Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.open(currentImage, '_blank')}
              title="Open full resolution in a separate tab / window"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-zinc-200 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              <ExternalLink size={13} className="text-[#E7C477]" />
              <span className="hidden sm:inline">Open in New Tab</span>
            </button>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-white/[0.06] border border-white/[0.1] rounded-xl p-0.5">
              <button
                onClick={() => setScale(s => Math.max(s - 0.25, 0.5))}
                title="Zoom Out (-)"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[11px] font-mono font-medium text-zinc-300 px-2 min-w-[42px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(s => Math.min(s + 0.25, 3))}
                title="Zoom In (+)"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={() => setScale(1)}
                title="Reset Zoom (0)"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={isProcessing}
              title="Close (Esc)"
              aria-label="Close full-screen image"
              autoFocus
              className="w-11 h-11 flex items-center justify-center rounded-full bg-black/75 hover:bg-rose-500/30 text-white hover:text-rose-200 border border-white/20 hover:border-rose-400/50 transition-all cursor-pointer shadow-2xl"
            >
              <X size={22} strokeWidth={2.25} />
            </button>
          </div>
        </header>

        {/* Main Center Display Area (Maximized Screen View) */}
        <div 
          className="absolute inset-0 flex items-center justify-center p-1 sm:p-2 overflow-hidden"
          onDoubleClick={() => setScale(s => (s === 1 ? 1.75 : 1))}
        >
          {isProcessing && (
            <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <Loader2 size={38} className="animate-spin text-[#E7C477]" />
                <Sparkles size={16} className="absolute -top-1 -right-1 text-amber-300 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-zinc-200 animate-pulse">{processStatus}</p>
              <span className="text-[11px] text-zinc-400 font-medium">Please wait while high-fidelity models process...</span>
            </div>
          )}

          <motion.div
            drag={scale > 1}
            dragConstraints={{ left: -400, right: 400, top: -400, bottom: 400 }}
            animate={{ scale }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="max-w-[calc(100vw-0.5rem)] max-h-[calc(100dvh-0.5rem)] flex items-center justify-center cursor-zoom-in"
          >
            <img
              src={currentImage}
              alt="Expanded view"
              className="max-w-full max-h-[calc(100dvh-0.5rem)] object-contain rounded-xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] border border-white/[0.12]"
            />
          </motion.div>

          {/* Versions thumbnail strip if edits/upscales exist */}
          {versions.length > 1 && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-1.5 rounded-2xl bg-black/80 border border-white/15 backdrop-blur-xl shadow-2xl">
              <span className="text-[10px] uppercase font-bold text-zinc-400 px-2 flex items-center gap-1">
                <Layers size={11} /> Versions:
              </span>
              {versions.map((ver, idx) => (
                <button
                  key={idx}
                  onClick={() => { setActiveVersionIndex(idx); setScale(1); }}
                  className={`relative group rounded-xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer ${
                    activeVersionIndex === idx ? 'border-[#E7C477] scale-105 shadow-md' : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                  }`}
                  title={ver.label}
                >
                  <img src={ver.url} alt="" className="w-10 h-10 object-cover rounded-lg" />
                  <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] text-white font-bold">
                    {idx + 1}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Comprehensive Action Studio Bar */}
        <footer className="absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black via-black/90 to-transparent pt-10 p-3 sm:px-4 sm:pb-4">
          <div className="max-w-5xl mx-auto flex flex-col gap-3">
            
            {/* Primary Action Tabs & Direct Buttons */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              
              {/* Left: Mode Switches (View, Upscale Studio, AI Inpaint/Edit Studio) */}
              <div className="flex bg-black/40 border border-white/[0.08] rounded-xl p-1 text-xs">
                <button
                  onClick={() => setActiveTab('view')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeTab === 'view' ? 'bg-white/[0.14] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Eye size={13} />
                  <span>Inspect</span>
                </button>
                <button
                  onClick={() => setActiveTab('upscale')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeTab === 'upscale' ? 'bg-[#E7C477]/20 text-[#F2D58D] border border-[#E7C477]/40 shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <ArrowUpCircle size={13} className="text-[#E7C477]" />
                  <span>Upscale HD</span>
                </button>
                <button
                  onClick={() => setActiveTab('edit')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeTab === 'edit' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Wand2 size={13} className="text-violet-400" />
                  <span>AI Edit / Modify</span>
                </button>
              </div>

              {/* Right: Quick Action Buttons (Save Vault + Download) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveVault}
                  disabled={isSaving || isSaved}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all cursor-pointer shadow-sm ${
                    isSaved 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                      : 'bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 hover:text-white border border-white/10'
                  }`}
                >
                  {isSaving ? <Loader2 size={13} className="animate-spin" /> : isSaved ? <Check size={13} /> : <Bookmark size={13} />}
                  <span>{isSaved ? 'Saved to Vault' : 'Save to Vault'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs bg-white text-zinc-950 hover:bg-zinc-200 transition-all shadow-md cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
              </div>

            </div>

            {/* Collapsible Panel: Upscale Studio */}
            <AnimatePresence>
              {activeTab === 'upscale' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-2 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                      <ArrowUpCircle size={13} className="text-[#E7C477]" /> Upscaler:
                    </span>
                    
                    <select
                      value={selectedUpscaleModel}
                      onChange={e => setSelectedUpscaleModel(e.target.value)}
                      className="bg-[#1c1d22] border border-white/15 text-zinc-100 text-xs font-medium rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                    >
                      {upscaleModels.map(m => (
                        <option key={m.id} value={m.id} className="bg-[#1c1d22] text-white">
                          {m.name} ({m.provider})
                        </option>
                      ))}
                    </select>

                    <div className="flex bg-black/40 border border-white/10 rounded-xl p-0.5 text-xs">
                      {(['2k', '4k', '8k'] as const).map(res => (
                        <button
                          key={res}
                          onClick={() => setTargetResolution(res)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
                            targetResolution === res ? 'bg-[#E7C477] text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleExecuteUpscale}
                    disabled={isProcessing}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#E7C477] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    <span>Upscale to {targetResolution.toUpperCase()} Ultra HD</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapsible Panel: AI Edit / Modify Studio */}
            <AnimatePresence>
              {activeTab === 'edit' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-2 border-t border-white/[0.06] flex flex-col gap-2.5"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                      <Wand2 size={13} className="text-violet-400" /> Edit Model:
                    </span>
                    <select
                      value={selectedEditModel}
                      onChange={e => setSelectedEditModel(e.target.value)}
                      className="bg-[#1c1d22] border border-white/15 text-zinc-100 text-xs font-medium rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                    >
                      {editModels.map(m => (
                        <option key={m.id} value={m.id} className="bg-[#1c1d22] text-white">
                          {m.name} ({m.provider})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 bg-[#1c1d22] border border-white/15 focus-within:border-violet-500/50 rounded-xl px-3 py-1.5 shadow-inner">
                    <input
                      type="text"
                      value={editPromptText}
                      onChange={e => setEditPromptText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleExecuteEdit(); }}
                      placeholder="Describe what to change (e.g. 'change hair to blonde', 'luxury silk dress', 'sunset golden hour lighting')..."
                      className="w-full bg-transparent text-xs text-white placeholder-zinc-500 outline-none"
                    />

                    <button
                      onClick={handleEnhanceEditPrompt}
                      disabled={isEnhancingPrompt || !editPromptText.trim()}
                      title="AI Enhance Prompt"
                      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-violet-600/30 text-violet-300 hover:text-violet-200 transition-colors disabled:opacity-40 cursor-pointer flex-shrink-0"
                    >
                      {isEnhancingPrompt ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    </button>

                    <button
                      onClick={handleExecuteEdit}
                      disabled={isProcessing || !editPromptText.trim()}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-all disabled:opacity-40 cursor-pointer flex-shrink-0 shadow-md"
                    >
                      {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      <span>Apply Edit</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </footer>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
