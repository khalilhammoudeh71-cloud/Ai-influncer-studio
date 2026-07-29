import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film,
  Sparkles,
  Loader2,
  X,
  Download,
  CheckCircle2,
  Scissors,
  Video,
  Plus,
  Play,
  ArrowRight,
  FolderPlus
} from 'lucide-react';
import { Persona } from '../types';
import { extractLastFrame, generateVideo, stitchVideos, type ModelInfo } from '../services/imageService';
import { api } from '../services/apiService';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

interface ExtendVideoModalProps {
  persona: Persona;
  originalVideoUrl: string;
  originalPrompt?: string;
  originalModel?: string;
  onClose: () => void;
  onSuccess?: (newVideoUrl: string) => void;
}

const EXTEND_MODELS = [
  { id: 'wavespeed-i2v:bytedance/seedance-2.0', name: 'Seedance 2.0 (ByteDance - Uncensored / High Realism)' },
  { id: 'wavespeed-i2v:bytedance/seedance-2-mini', name: 'Seedance 2.0 Mini (ByteDance - Uncensored / Fast)' },
  { id: 'wavespeed-i2v:alibaba/wan-2.7-i2v-1080p', name: 'Wan 2.7 I2V (Alibaba - Uncensored 1080p)' },
  { id: 'wavespeed-i2v:alibaba/wan-2.6-i2v-720p', name: 'Wan 2.6 I2V (Alibaba - Uncensored)' },
  { id: 'wavespeed-i2v:alibaba/wan-2.5-i2v-720p', name: 'Wan 2.5 I2V (Alibaba - Uncensored)' },
  { id: 'wavespeed-i2v:wavespeed-ai/wan-2.2-i2v-720p', name: 'Wan 2.2 I2V (Alibaba - Uncensored)' },
  { id: 'wavespeed-i2v:alibaba/qwen-video-2.5', name: 'Qwen Video 2.5 (Alibaba - Uncensored)' },
  { id: 'wavespeed-i2v:openvideo/openvideo-v1.0', name: 'OpenVideo v1.0 (Open Source Uncensored)' },
  { id: 'wavespeed-i2v:wavespeed-ai/kling-3.0', name: 'Kling 3.0 (Cinematic Extension)' },
  { id: 'google:veo-omni', name: 'Google Veo Omni' },
];

export default function ExtendVideoModal({
  persona,
  originalVideoUrl,
  originalPrompt,
  originalModel,
  onClose,
  onSuccess
}: ExtendVideoModalProps) {
  const [extensionPrompt, setExtensionPrompt] = useState(
    originalPrompt ? `Continue motion: ${originalPrompt}, panning smoothly forward` : 'Continue video action smoothly, character moving forward cinematic camera slide'
  );
  const [selectedModel, setSelectedModel] = useState(originalModel || EXTEND_MODELS[0].id);
  const [lastFrameUrl, setLastFrameUrl] = useState<string | null>(null);
  const [isExtractingFrame, setIsExtractingFrame] = useState(true);
  const [isExtending, setIsExtending] = useState(false);
  const [extensionSegmentUrl, setExtensionSegmentUrl] = useState<string | null>(null);
  const [extendedStitchedUrl, setExtendedStitchedUrl] = useState<string | null>(null);

  // Auto-extract final frame on mount
  useEffect(() => {
    let isMounted = true;
    setIsExtractingFrame(true);

    extractLastFrame(originalVideoUrl)
      .then(frame => {
        if (isMounted) {
          setLastFrameUrl(frame);
          setIsExtractingFrame(false);
        }
      })
      .catch(err => {
        console.warn('Frame extraction warning:', err);
        if (isMounted) {
          // Fall back to avatar if frame extraction fails
          setLastFrameUrl(persona.avatar || null);
          setIsExtractingFrame(false);
        }
      });

    return () => { isMounted = false; };
  }, [originalVideoUrl, persona.avatar]);

  const handleRunExtension = async () => {
    if (!extensionPrompt.trim()) return toast.error('Enter an extension motion prompt');

    setIsExtending(true);
    setExtendedStitchedUrl(null);
    setExtensionSegmentUrl(null);

    const toastId = toast.loading('Extending video clip (+5s motion segment)...');

    try {
      // 1. Ensure last frame is extracted
      let frame = lastFrameUrl;
      if (!frame) {
        frame = await extractLastFrame(originalVideoUrl);
        setLastFrameUrl(frame);
      }

      // 2. Generate extension video segment (Image-to-Video using frame)
      toast.loading('Generating extended motion segment...', { id: toastId });
      const genRes = await generateVideo(
        extensionPrompt,
        selectedModel,
        frame,
        true,
        true
      );

      setExtensionSegmentUrl(genRes.videoUrl);

      // 3. Stitch original video + extension segment using FFmpeg
      toast.loading('Stitching original video + extension segment into continuous MP4...', { id: toastId });
      const stitchedUrl = await stitchVideos([originalVideoUrl, genRes.videoUrl]);
      setExtendedStitchedUrl(stitchedUrl);

      toast.success('Video extended & stitched successfully (+5s added)!', { id: toastId });
      if (onSuccess) onSuccess(stitchedUrl);
    } catch (err: any) {
      console.error('Video extension failed:', err);
      toast.error(err.message || 'Extension failed', { id: toastId });
    } fontally: {
      setIsExtending(false);
    }
  };

  const handleSaveToVault = async () => {
    if (!extendedStitchedUrl) return;
    try {
      const payload = {
        id: `extended-${Date.now()}`,
        url: extendedStitchedUrl,
        prompt: `Extended Video: ${extensionPrompt}`,
        timestamp: Date.now(),
        model: selectedModel,
        mediaType: 'video' as const
      };
      await api.images.create(persona.id, payload);
      toast.success(`Saved extended video to ${persona.name}'s library!`);
    } catch (err) {
      toast.error('Failed to save to library');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#07070d] backdrop-blur-2xl flex flex-col text-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all">
            <X size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Film size={22} className="text-amber-400 animate-pulse" /> Universal Video <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Extender & Continuator</span>
            </h1>
            <p className="text-xs text-white/50">
              Extend any generated video clip (+5s) using frame continuity & FFmpeg clip concatenation.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Visual Pipeline Breakdown */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#050508] relative overflow-y-auto space-y-6">
          <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Original Video Clip */}
            <div className="space-y-2 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Original Video Clip</span>
              <div className="aspect-[16/9] rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-xl relative">
                <video src={originalVideoUrl} controls className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Extracted Last Frame preview */}
            <div className="space-y-2 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center justify-center gap-1">
                <Scissors size={12} /> Extracted Final Frame Continuity
              </span>
              <div className="aspect-[16/9] rounded-2xl overflow-hidden border border-amber-500/30 bg-black/60 shadow-xl relative flex items-center justify-center">
                {isExtractingFrame ? (
                  <div className="text-center space-y-2">
                    <Loader2 size={24} className="text-amber-400 animate-spin mx-auto" />
                    <p className="text-[10px] text-amber-300/80">Extracting last frame with FFmpeg...</p>
                  </div>
                ) : lastFrameUrl ? (
                  <img src={lastFrameUrl} alt="Extracted final frame" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-white/30">Frame extraction fallback</span>
                )}
              </div>
            </div>
          </div>

          {/* Stitched Extended Video Result */}
          {extendedStitchedUrl && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Seamless Extended Video Result (+5s Added)
                </span>
              </div>

              <div className="aspect-[16/9] rounded-2xl overflow-hidden border border-emerald-500/30 bg-black/80 shadow-2xl">
                <video src={extendedStitchedUrl} controls autoPlay className="w-full h-full object-cover" />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveToVault}
                  className="flex-1 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <FolderPlus size={14} /> Save Extended Video to Vault
                </button>
                <a
                  href={extendedStitchedUrl}
                  download="extended_video_seamless.mp4"
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <Download size={14} /> Download Stitched MP4
                </a>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column: Prompt & Model Configuration */}
        <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-l border-white/10 overflow-y-auto p-6 space-y-6 bg-black/20">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
              1. Extension Motion Prompt
            </label>
            <textarea
              value={extensionPrompt}
              onChange={e => setExtensionPrompt(e.target.value)}
              placeholder="Describe what happens in the next 5 seconds..."
              className="w-full bg-[#0c0c12] border border-white/10 rounded-xl p-3 text-xs text-white outline-none resize-none placeholder:text-white/20 h-28 focus:border-amber-500/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
              2. Extension Video Model
            </label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full bg-[#121218] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
            >
              {EXTEND_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunExtension}
            disabled={isExtending || isExtractingFrame}
            className={cn(
              'w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-xl',
              isExtending || isExtractingFrame
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-black shadow-amber-500/20'
            )}
          >
            {isExtending ? (
              <><Loader2 size={18} className="animate-spin" /> Extending & Stitching Video...</>
            ) : (
              <><Sparkles size={18} /> Extend Video (+5 Seconds)</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
