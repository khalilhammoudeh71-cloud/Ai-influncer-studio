import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Download, Sparkles, ZoomIn, ZoomOut, RotateCcw, 
  ArrowUpCircle, Wand2, Bookmark, Check, Loader2, 
  Layers, Eye, ExternalLink, Film, Mic2, Play, Image as ImageIcon
} from 'lucide-react';
import { ModelInfo, fetchAllModelTypes, enhancePrompt } from '../services/imageService';
import { editImageJob, upscaleImageJob } from '../services/mediaJobService';
import { Persona } from '../types';
import { api } from '../services/apiService';
import toast from 'react-hot-toast';

interface ImageVersion {
  url: string;
  label: string;
  model?: string;
  prompt?: string;
}

export type ImageStudioMode = 'view' | 'upscale' | 'edit' | 'animate' | 'avatar';

export interface MediaStudioResult {
  url: string;
  model?: string;
  prompt?: string;
}

export interface AnimateImageInput {
  imageUrl: string;
  prompt: string;
  aspectRatio: '9:16' | '1:1' | '16:9';
}

export interface TalkingAvatarInput {
  imageUrl: string;
  script: string;
}

export interface ImageStudioVersionResult {
  kind: 'upscale' | 'edit';
  sourceUrl: string;
  prompt: string;
  model?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  prompt?: string;
  persona: Persona;
  onSaveToVault?: (url: string, prompt?: string) => Promise<void>;
  onImageUpdated?: (newUrl: string, result: ImageStudioVersionResult) => void;
  initialMode?: ImageStudioMode;
  onAnimateImage?: (input: AnimateImageInput) => Promise<MediaStudioResult>;
  onCreateTalkingAvatar?: (input: TalkingAvatarInput) => Promise<MediaStudioResult>;
}

export default function ImageLightboxModal({
  isOpen,
  onClose,
  imageUrl,
  prompt: initialPrompt,
  persona,
  onSaveToVault,
  onImageUpdated,
  initialMode = 'view',
  onAnimateImage,
  onCreateTalkingAvatar,
}: Props) {
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);

  const [activeTab, setActiveTab] = useState<ImageStudioMode>(initialMode);
  const [scale, setScale] = useState(1);
  const [animationPrompt, setAnimationPrompt] = useState('Natural cinematic movement, subtle expression and body motion, realistic camera movement, preserve the exact face and identity.');
  const [animationAspectRatio, setAnimationAspectRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [avatarScript, setAvatarScript] = useState(`Hey! It's ${persona.name}. I wanted to share this with you.`);
  const [generatedVideo, setGeneratedVideo] = useState<MediaStudioResult | null>(null);
  const [actionError, setActionError] = useState('');

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
      setActiveTab(initialMode);
      setScale(1);
      setEditPromptText('');
      setIsSaved(false);
      setGeneratedVideo(null);
      setActionError('');
      setAvatarScript(`Hey! It's ${persona.name}. I wanted to share this with you.`);
    }
  }, [isOpen, imageUrl, initialPrompt, initialMode, persona.name]);

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
  const previewUrl = generatedVideo?.url || currentImage;
  const isVideoPreview = Boolean(generatedVideo?.url);

  const handleDownload = () => {
    try {
      const a = document.createElement('a');
      a.href = previewUrl;
      const cleanName = (persona.name || 'Persona').replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = isVideoPreview
        ? `${cleanName}_video_${timestamp}.mp4`
        : `${cleanName}_${targetResolution.toUpperCase()}_${timestamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Download started!');
    } catch {
      window.open(previewUrl, '_blank');
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
      const result = await upscaleImageJob(persona.id, currentImage, selectedUpscaleModel, targetResolution);
      const newVersion: ImageVersion = {
        url: result.imageUrl,
        label: `Upscaled (${targetResolution.toUpperCase()})`,
        model: result.model,
        prompt: currentPrompt,
      };
      setVersions(prev => [...prev, newVersion]);
      setActiveVersionIndex(versions.length);
      setActiveTab('view');
      onImageUpdated?.(result.imageUrl, {
        kind: 'upscale',
        sourceUrl: currentImage,
        prompt: currentPrompt,
        model: result.model,
      });
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
      const result = await editImageJob(persona.id, currentImage, editPromptText.trim(), selectedEditModel);
      const newVersion: ImageVersion = {
        url: result.imageUrl,
        label: `Edit: ${editPromptText.slice(0, 18)}...`,
        model: result.model,
        prompt: editPromptText.trim(),
      };
      setVersions(prev => [...prev, newVersion]);
      setActiveVersionIndex(versions.length);
      setActiveTab('view');
      onImageUpdated?.(result.imageUrl, {
        kind: 'edit',
        sourceUrl: currentImage,
        prompt: editPromptText.trim(),
        model: result.model,
      });
      toast.success('🎨 Image edited successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Edit failed. Please try a different model or prompt.');
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  const handleExecuteAnimation = async () => {
    if (!onAnimateImage || !currentImage || !animationPrompt.trim() || isProcessing) return;
    setIsProcessing(true);
    setActionError('');
    setProcessStatus('Animating this image with identity lock...');
    try {
      const result = await onAnimateImage({
        imageUrl: currentImage,
        prompt: animationPrompt.trim(),
        aspectRatio: animationAspectRatio,
      });
      setGeneratedVideo(result);
      toast.success('Animated video created and added to the conversation!');
    } catch (err: any) {
      const message = err?.message || 'Animation failed. Please try again.';
      setActionError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  const handleExecuteTalkingAvatar = async () => {
    if (!onCreateTalkingAvatar || !currentImage || !avatarScript.trim() || isProcessing) return;
    setIsProcessing(true);
    setActionError('');
    setProcessStatus(`Creating ${persona.name}'s talking avatar...`);
    try {
      const result = await onCreateTalkingAvatar({
        imageUrl: currentImage,
        script: avatarScript.trim(),
      });
      setGeneratedVideo(result);
      toast.success('Talking avatar created and added to the conversation!');
    } catch (err: any) {
      const message = err?.message || 'Talking avatar generation failed. Please try again.';
      setActionError(message);
      toast.error(message);
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
                <div className="w-full h-full bg-[var(--accent-primary)] flex items-center justify-center text-xs font-bold text-[#161108]">
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
                  {isVideoPreview ? (activeTab === 'avatar' ? 'Talking Avatar' : 'Animated Video') : (versions[activeVersionIndex]?.label || 'Portrait')}
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
              onClick={() => window.open(previewUrl, '_blank')}
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
            drag={!isVideoPreview && scale > 1}
            dragConstraints={{ left: -400, right: 400, top: -400, bottom: 400 }}
            animate={{ scale }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="max-w-[calc(100vw-0.5rem)] max-h-[calc(100dvh-0.5rem)] flex items-center justify-center cursor-zoom-in"
          >
            {isVideoPreview ? (
              <video
                src={generatedVideo?.url}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[calc(100dvh-0.5rem)] object-contain rounded-xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] border border-white/[0.12]"
              />
            ) : (
              <img
                src={currentImage}
                alt="Expanded view"
                className="max-w-full max-h-[calc(100dvh-0.5rem)] object-contain rounded-xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] border border-white/[0.12]"
              />
            )}
          </motion.div>

          {/* Versions thumbnail strip if edits/upscales exist */}
          {!isVideoPreview && versions.length > 1 && (
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
              <div className="flex max-w-full overflow-x-auto [scrollbar-width:none] bg-black/40 border border-white/[0.08] rounded-xl p-1 text-xs">
                <button
                  onClick={() => { setActiveTab('view'); setGeneratedVideo(null); setActionError(''); }}
                  className={`flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'view' ? 'bg-white/[0.14] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Eye size={13} />
                  <span>Inspect</span>
                </button>
                <button
                  onClick={() => { setActiveTab('upscale'); setGeneratedVideo(null); setActionError(''); }}
                  className={`flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'upscale' ? 'bg-[#E7C477]/20 text-[#F2D58D] border border-[#E7C477]/40 shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <ArrowUpCircle size={13} className="text-[#E7C477]" />
                  <span>Upscale HD</span>
                </button>
                <button
                  onClick={() => { setActiveTab('edit'); setGeneratedVideo(null); setActionError(''); }}
                  className={`flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'edit' ? 'bg-[var(--accent-muted)] text-[var(--accent-secondary)] border border-[var(--border-strong)] shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Wand2 size={13} className="text-[var(--accent-primary)]" />
                  <span>AI Edit / Modify</span>
                </button>
                {onAnimateImage && (
                  <button
                    onClick={() => { setActiveTab('animate'); setGeneratedVideo(null); setActionError(''); }}
                    className={`flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      activeTab === 'animate' ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Film size={13} className="text-cyan-300" />
                    <span>Animate</span>
                  </button>
                )}
                {onCreateTalkingAvatar && (
                  <button
                    onClick={() => { setActiveTab('avatar'); setGeneratedVideo(null); setActionError(''); }}
                    className={`flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      activeTab === 'avatar' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Mic2 size={13} className="text-emerald-300" />
                    <span>Talking Avatar</span>
                  </button>
                )}
              </div>

              {/* Right: Quick Action Buttons (Save Vault + Download) */}
              <div className="flex items-center gap-2">
                {!isVideoPreview && (
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
                )}

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
                      <Wand2 size={13} className="text-[var(--accent-primary)]" /> Edit Model:
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

                  <div className="flex items-center gap-2 bg-[#1c1d22] border border-white/15 focus-within:border-[var(--border-strong)] rounded-xl px-3 py-1.5 shadow-inner">
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
                      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-[var(--accent-muted)] text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors disabled:opacity-40 cursor-pointer flex-shrink-0"
                    >
                      {isEnhancingPrompt ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    </button>

                    <button
                      onClick={handleExecuteEdit}
                      disabled={isProcessing || !editPromptText.trim()}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-[#161108] font-bold text-xs transition-all disabled:opacity-40 cursor-pointer flex-shrink-0 shadow-md"
                    >
                      {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      <span>Apply Edit</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeTab === 'animate' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-2 border-t border-white/[0.06] flex flex-col gap-2.5"
                >
                  {generatedVideo ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Play size={14} className="text-cyan-300 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-cyan-100">Animated video is ready</p>
                          <p className="text-[10px] text-cyan-200/70 truncate">{generatedVideo.model || 'Selected video model'} • also added to this conversation</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGeneratedVideo(null)}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
                      >
                        Animate again
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-[#1c1d22] border border-white/15 focus-within:border-cyan-500/50 rounded-xl px-3 py-2 shadow-inner">
                        <ImageIcon size={13} className="text-cyan-300 flex-shrink-0" />
                        <input
                          type="text"
                          value={animationPrompt}
                          onChange={event => setAnimationPrompt(event.target.value)}
                          onKeyDown={event => { if (event.key === 'Enter') handleExecuteAnimation(); }}
                          placeholder="Describe movement, camera motion, and action..."
                          className="w-full bg-transparent text-xs text-white placeholder-zinc-500 outline-none"
                        />
                        <select
                          value={animationAspectRatio}
                          onChange={event => setAnimationAspectRatio(event.target.value as '9:16' | '1:1' | '16:9')}
                          className="bg-black/30 border border-white/10 text-zinc-200 text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                          aria-label="Video aspect ratio"
                        >
                          <option value="9:16">Portrait 9:16</option>
                          <option value="1:1">Square 1:1</option>
                          <option value="16:9">Landscape 16:9</option>
                        </select>
                        <button
                          type="button"
                          onClick={handleExecuteAnimation}
                          disabled={isProcessing || !animationPrompt.trim()}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition-all disabled:opacity-40 cursor-pointer flex-shrink-0"
                        >
                          {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Film size={12} />}
                          <span>Animate</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500">Uses the selected video model from AI Settings and preserves this image as the visual starting frame.</p>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeTab === 'avatar' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-2 border-t border-white/[0.06] flex flex-col gap-2.5"
                >
                  {generatedVideo ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mic2 size={14} className="text-emerald-300 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-100">Talking avatar is ready</p>
                          <p className="text-[10px] text-emerald-200/70 truncate">{generatedVideo.model || 'Talking-avatar engine'} • also added to this conversation</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGeneratedVideo(null)}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
                      >
                        New script
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-[#1c1d22] border border-white/15 focus-within:border-emerald-500/50 rounded-xl px-3 py-2 shadow-inner">
                        <Mic2 size={13} className="text-emerald-300 flex-shrink-0" />
                        <textarea
                          value={avatarScript}
                          onChange={event => setAvatarScript(event.target.value)}
                          rows={2}
                          placeholder={`What should ${persona.name} say?`}
                          className="w-full resize-none bg-transparent text-xs text-white placeholder-zinc-500 outline-none leading-relaxed"
                        />
                        <button
                          type="button"
                          onClick={handleExecuteTalkingAvatar}
                          disabled={isProcessing || !avatarScript.trim()}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-all disabled:opacity-40 cursor-pointer flex-shrink-0"
                        >
                          {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Mic2 size={12} />}
                          <span>Create</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500">Uses this portrait and the persona's selected voice to create a lip-synced talking avatar.</p>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {actionError && (
              <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] font-medium text-rose-200">
                {actionError}
              </div>
            )}

          </div>
        </footer>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
