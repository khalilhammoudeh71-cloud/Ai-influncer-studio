import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Play, Pause, Download, Loader2, Upload, Camera, Video, AlertTriangle,
  Sparkles, Link, Check, ChevronRight, Zap, Settings, RotateCcw, Music2
} from 'lucide-react';
import { Persona } from '../types';
import { generateMotionControl } from '../services/imageService';
import { processImageFile } from '../utils/imageProcessing';
import { api } from '../services/apiService';
import toast from 'react-hot-toast';

interface MotionControlStudioProps {
  isOpen: boolean;
  onClose: () => void;
  persona?: Persona;
}

interface DanceEntry {
  id: string;
  name: string;
  emoji: string;
  description: string;
  thumbnail: string;
  // Optional local video for hover-preview (kept short for perf)
  previewVideo?: string;
  duration: string;
  category: 'trending' | 'classic' | 'street' | 'fitness' | 'party';
}

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🎬' },
  { id: 'trending', label: 'Trending', emoji: '🔥' },
  { id: 'classic', label: 'Classic', emoji: '✨' },
  { id: 'street', label: 'Street', emoji: '🛹' },
  { id: 'fitness', label: 'Fitness', emoji: '💪' },
  { id: 'party', label: 'Party', emoji: '🎉' },
] as const;

interface MotionModel {
  id: string;
  name: string;
  desc: string;
  badge?: 'new' | 'hot';
}

const MOTION_MODELS: MotionModel[] = [
  { id: 'wavespeed-ai/wan-3.0-animate', name: 'WAN 3.0 Animate', desc: 'Flagship motion flow & pose transfer', badge: 'new' },
  { id: 'wavespeed-ai/scail-2', name: 'SCAIL-2', desc: 'Zero-shot high-quality motion mapping', badge: 'new' },
  { id: 'wavespeed-ai/wan-2.2-animate', name: 'WAN 2.2 Animate', desc: 'Next-gen motion flow' },
  { id: 'wavespeed-ai/kling-3.0-motion-control', name: 'Kling 3.0 Motion Control', desc: 'Premium cinematic movement' },
  { id: 'wavespeed-ai/kling-2.6-motion-control', name: 'Kling 2.6 Motion Control', desc: 'Balanced realism & speed' },
  { id: 'wavespeed-ai/pixverse-motion-mimic', name: 'PixVerse Motion Mimic', desc: 'Dynamic dance imitation', badge: 'new' },
  { id: 'wavespeed-ai/steadydancer', name: 'SteadyDancer', desc: 'Smooth, continuous walk cycle' },
  { id: 'wavespeed-ai/face-swapper', name: 'Face Swapper', desc: 'Face animation & reference match' },
];

const VIRAL_DANCES: DanceEntry[] = [
  {
    id: 'slickback',
    name: 'Slickback',
    emoji: '🕺',
    description: 'The viral floating walk — smooth and effortless.',
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80',
    duration: '10s',
    category: 'trending',
  },
  {
    id: 'renegade',
    name: 'Renegade',
    emoji: '💃',
    description: 'Classic fast-paced TikTok arm choreo.',
    thumbnail: 'https://images.unsplash.com/photo-1535525137418-725830a1d468?auto=format&fit=crop&w=400&q=80',
    duration: '15s',
    category: 'trending',
  },
  {
    id: 'griddy',
    name: 'Griddy',
    emoji: '🏈',
    description: 'The NFL end-zone viral celebration dance.',
    thumbnail: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=400&q=80',
    duration: '8s',
    category: 'trending',
  },
  {
    id: 'savage-love',
    name: 'Savage Love',
    emoji: '❤️‍🔥',
    description: 'Smooth hip-hop choreo with dramatic poses.',
    thumbnail: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=400&q=80',
    duration: '12s',
    category: 'trending',
  },
  {
    id: 'macarena',
    name: 'Macarena',
    emoji: '🎶',
    description: 'Retuned classic party line dance.',
    thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80',
    duration: '12s',
    category: 'classic',
  },
  {
    id: 'ymca',
    name: 'YMCA',
    emoji: '🙌',
    description: 'Iconic arm-spelling group dance.',
    thumbnail: 'https://images.unsplash.com/photo-1508244751656-786c8f8b2d1c?auto=format&fit=crop&w=400&q=80',
    duration: '14s',
    category: 'classic',
  },
  {
    id: 'thriller',
    name: 'Thriller Shuffle',
    emoji: '🧟',
    description: 'MJ-inspired zombie walk choreography.',
    thumbnail: 'https://images.unsplash.com/photo-1578946956088-940c3b502864?auto=format&fit=crop&w=400&q=80',
    duration: '18s',
    category: 'classic',
  },
  {
    id: 'running-man',
    name: 'Running Man',
    emoji: '🏃',
    description: '90s hip-hop stepping illusion move.',
    thumbnail: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=400&q=80',
    duration: '10s',
    category: 'classic',
  },
  {
    id: 'electro-shuffle',
    name: 'Electro Shuffle',
    emoji: '⚡',
    description: 'High-energy shuffle with street style.',
    thumbnail: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=400&q=80',
    duration: '14s',
    category: 'street',
  },
  {
    id: 'bboy-windmill',
    name: 'Bboy Windmill',
    emoji: '🌀',
    description: 'Impressive floor breakdance routine.',
    thumbnail: 'https://images.unsplash.com/photo-1587491439149-bd2ff295d450?auto=format&fit=crop&w=400&q=80',
    duration: '8s',
    category: 'street',
  },
  {
    id: 'robot-pop',
    name: 'Robot & Pop',
    emoji: '🤖',
    description: 'Mechanical popping and locking sequence.',
    thumbnail: 'https://images.unsplash.com/photo-1572636583534-b7f38ea5ca8d?auto=format&fit=crop&w=400&q=80',
    duration: '11s',
    category: 'street',
  },
  {
    id: 'krump',
    name: 'Krump Battle',
    emoji: '👊',
    description: 'Raw power moves with high energy.',
    thumbnail: 'https://images.unsplash.com/photo-1536895058696-a69b1c7ba34f?auto=format&fit=crop&w=400&q=80',
    duration: '9s',
    category: 'street',
  },
  {
    id: 'jump-rope',
    name: 'Jump Rope Drill',
    emoji: '🪢',
    description: 'High-cadence cardio footwork sequence.',
    thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=400&q=80',
    duration: '10s',
    category: 'fitness',
  },
  {
    id: 'burpee-flow',
    name: 'Burpee Flow',
    emoji: '🏋️',
    description: 'Athletic full-body exercise sequence.',
    thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&q=80',
    duration: '12s',
    category: 'fitness',
  },
  {
    id: 'zumba-salsa',
    name: 'Zumba Salsa',
    emoji: '🌶️',
    description: 'Hot Latin zumba cardio routine.',
    thumbnail: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=400&q=80',
    duration: '16s',
    category: 'fitness',
  },
  {
    id: 'disco-fever',
    name: 'Disco Fever',
    emoji: '🪩',
    description: 'Groovy 70s Saturday Night Fever vibe.',
    thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80',
    duration: '13s',
    category: 'party',
  },
  {
    id: 'cha-cha-slide',
    name: 'Cha Cha Slide',
    emoji: '🎊',
    description: 'Everyone knows the steps — line dance.',
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80',
    duration: '14s',
    category: 'party',
  },
  {
    id: 'cupid-shuffle',
    name: 'Cupid Shuffle',
    emoji: '💘',
    description: 'Classic club line dance everyone loves.',
    thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80',
    duration: '12s',
    category: 'party',
  },
];

// Animated thumbnail card for dance library
function DanceCard({
  dance,
  isSelected,
  onClick,
}: {
  dance: DanceEntry;
  isSelected: boolean;
  onClick: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    // If there's a previewVideo, start playing; otherwise just set hover state
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <button
      key={dance.id}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative flex flex-col text-left rounded-2xl overflow-hidden border transition-all duration-300 group ${
        isSelected
          ? 'border-violet-500 ring-2 ring-violet-500/40 shadow-lg shadow-violet-500/20'
          : 'border-white/8 bg-[var(--bg-elevated)] hover:border-white/25 hover:shadow-md'
      }`}
      style={{ minHeight: 130 }}
    >
      {/* Thumbnail / Video area */}
      <div className="relative w-full overflow-hidden" style={{ height: 80 }}>
        <img
          src={dance.thumbnail}
          alt={dance.name}
          className={`w-full h-full object-cover transition-all duration-500 ${
            isHovered ? 'opacity-60 scale-110' : 'opacity-80 scale-100'
          }`}
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Animated "motion" lines on hover */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-0.5 bg-violet-400 rounded-full"
                  animate={{ height: [6, 18, 6] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[8px] font-bold text-white">
          {dance.duration}
        </div>

        {/* Selected check */}
        {isSelected && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center border border-white/30 shadow">
            <Check size={9} strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 flex-1">
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-[11px]">{dance.emoji}</span>
          <p className={`text-[10px] font-bold truncate leading-tight ${isSelected ? 'text-violet-300' : 'text-white'}`}>
            {dance.name}
          </p>
        </div>
        <p className="text-[8px] text-[var(--text-muted)] leading-tight line-clamp-2">{dance.description}</p>
      </div>
    </button>
  );
}

export default function MotionControlStudio({ isOpen, onClose, persona }: MotionControlStudioProps) {
  const [refImage, setRefImage] = useState<string | null>(persona?.referenceImage || null);
  const [sourceTab, setSourceTab] = useState<'library' | 'url' | 'upload'>('library');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Custom video states
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [customVideoBase64, setCustomVideoBase64] = useState<string | null>(null);
  const [customVideoName, setCustomVideoName] = useState<string | null>(null);

  // Library state
  const [selectedDanceId, setSelectedDanceId] = useState<string>(VIRAL_DANCES[0].id);
  const [selectedModel, setSelectedModel] = useState<string>(MOTION_MODELS[0].id);

  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [outputDuration, setOutputDuration] = useState<5 | 10 | 15>(10);
  const [quality, setQuality] = useState<'standard' | 'high'>('high');
  const [loopVideo, setLoopVideo] = useState(true);

  // Generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refImageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (persona?.referenceImage && !refImage) {
      setRefImage(persona.referenceImage);
    }
  }, [persona]);

  const handleCustomVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      return toast.error('Please upload a valid video file');
    }
    setCustomVideoName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCustomVideoBase64(ev.target?.result as string);
      setCustomVideoUrl('');
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!refImage) return toast.error('Upload a reference photo first');
    if (sourceTab === 'url' && !customVideoUrl.trim()) {
      return toast.error('Paste a video URL first');
    }
    if (sourceTab === 'upload' && !customVideoBase64) {
      return toast.error('Upload a motion video first');
    }

    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);
    setProgressPct(0);

    const steps = [
      { label: 'Extracting motion skeleton...', pct: 20 },
      { label: 'Aligning body pose to reference...', pct: 45 },
      { label: `Synthesizing motion frames with ${MOTION_MODELS.find(m => m.id === selectedModel)?.name || 'Wavespeed'}...`, pct: 70 },
      { label: 'Perfecting face resolution & blending...', pct: 90 },
    ];

    let si = 0;
    setProgressStep(steps[0].label);
    setProgressPct(steps[0].pct);

    const interval = setInterval(() => {
      if (si < steps.length - 1) {
        si++;
        setProgressStep(steps[si].label);
        setProgressPct(steps[si].pct);
      }
    }, 2800);

    try {
      const result = await generateMotionControl({
        refImage,
        model: selectedModel,
        ...(sourceTab === 'library' ? { danceId: selectedDanceId } : {}),
        ...(sourceTab === 'url' && customVideoUrl ? { motionVideoUrl: customVideoUrl } : {}),
        ...(sourceTab === 'upload' && customVideoBase64 ? { motionVideoBase64: customVideoBase64 } : {}),
      });
      clearInterval(interval);
      setVideoUrl(result.videoUrl);
      setProgressPct(100);
      setProgressStep('');
      toast.success('Motion control video generated!');
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || 'Generation failed');
      setProgressStep('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToVault = async () => {
    if (!videoUrl || !persona) return;
    try {
      const selectedDance = VIRAL_DANCES.find(d => d.id === selectedDanceId);
      const media = {
        id: `vid-${Date.now()}`,
        url: videoUrl,
        prompt: `Motion Control: ${
          sourceTab === 'library' ? selectedDance?.name || selectedDanceId : customVideoName || customVideoUrl || 'Custom motion'
        }`,
        timestamp: Date.now(),
        model: selectedModel,
        mediaType: 'video' as const,
      };
      const updatedPersona = { ...persona, visualLibrary: [...(persona.visualLibrary || []), media] };
      await api.updatePersonaInVault(updatedPersona);
      await api.images.create(persona.id, media);
      toast.success('Saved to Visual Library!');
    } catch {
      toast.error('Failed to save to library');
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `motion_control_${Date.now()}.mp4`;
    a.target = '_blank';
    a.click();
  };

  const filteredDances = categoryFilter === 'all'
    ? VIRAL_DANCES
    : VIRAL_DANCES.filter(d => d.category === categoryFilter);

  const canGenerate = !!refImage && (
    sourceTab === 'library' ||
    (sourceTab === 'url' && customVideoUrl.trim()) ||
    (sourceTab === 'upload' && !!customVideoBase64)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 lg:left-16 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative w-full max-w-5xl bg-[#0a0f1c] rounded-3xl border border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
        style={{ height: 'min(90vh, 780px)' }}
      >
        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.2) 0%, rgba(168,85,247,0.08) 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/40">
              <Video size={20} />
            </div>
            <div>
              <h3 className="font-black text-white text-sm tracking-tight">Motion Control Studio</h3>
              <p className="text-[10px] text-violet-300/70 font-medium">AI Motion Transfer • Wavespeed V2</p>
            </div>
            <span className="ml-1 text-[8px] font-black px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-widest">
              New
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={18} className="text-white/60" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 flex flex-col lg:flex-row" style={{ minHeight: 0, overflow: 'hidden' }}>

          {/* ── Left: Controls ── */}
          <div className="w-full lg:w-[400px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/8 overflow-y-auto custom-scrollbar bg-[#080d18] flex flex-col">
            <div className="flex-1 p-5 space-y-5">

              {/* 1. Reference Photo */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-violet-400/80 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-[8px] font-black border border-violet-500/30">1</span>
                  Reference Photo
                </label>
                {refImage ? (
                  <div className="relative w-full rounded-2xl overflow-hidden border border-violet-500/30 group" style={{ aspectRatio: '16/9' }}>
                    <img src={refImage} alt="Reference" className="w-full h-full object-cover object-top" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                      {persona?.referenceImage === refImage && (
                        <span className="px-2 py-0.5 bg-violet-500/80 rounded-md text-[8px] font-bold text-white">Persona Photo</span>
                      )}
                      <div className="ml-auto flex gap-1">
                        <button onClick={() => refImageInputRef.current?.click()} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors backdrop-blur-sm">
                          <Camera size={12} />
                        </button>
                        <button onClick={() => setRefImage(null)} className="p-1.5 bg-rose-500/80 hover:bg-rose-500 rounded-full text-white transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => refImageInputRef.current?.click()}
                    className="w-full rounded-2xl border-2 border-dashed border-violet-500/30 flex flex-col items-center justify-center gap-2.5 text-violet-300 hover:text-white hover:border-violet-500/60 hover:bg-violet-500/5 transition-all"
                    style={{ height: 120 }}
                  >
                    <Upload size={22} />
                    <div className="text-center">
                      <p className="text-xs font-bold">Upload Persona Photo</p>
                      <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Full body or half body — clear background preferred</p>
                    </div>
                  </button>
                )}
                <input type="file" ref={refImageInputRef} hidden accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try { setRefImage(await processImageFile(file)); } catch { toast.error('Failed to process image'); }
                    e.target.value = '';
                  }}
                />
              </div>

              {/* 2. Motion Source */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-violet-400/80 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-[8px] font-black border border-violet-500/30">2</span>
                  Motion Source
                </label>

                {/* Source tabs */}
                <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                  {[
                    { id: 'library', label: '💃 Dance Library', icon: Sparkles },
                    { id: 'url', label: '🔗 Video URL', icon: Link },
                    { id: 'upload', label: '📂 Upload', icon: Upload },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSourceTab(tab.id as any)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        sourceTab === tab.id
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md'
                          : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Library content */}
                <AnimatePresence mode="wait">
                  {sourceTab === 'library' && (
                    <motion.div
                      key="library"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-3"
                    >
                      {/* Category pills */}
                      <div className="flex gap-1.5 flex-wrap">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setCategoryFilter(cat.id)}
                            className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition-all border ${
                              categoryFilter === cat.id
                                ? 'bg-violet-600 border-violet-500 text-white'
                                : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:text-white hover:border-white/30'
                            }`}
                          >
                            {cat.emoji} {cat.label}
                          </button>
                        ))}
                      </div>

                      {/* Dance grid — horizontal scroll */}
                      <div
                        className="grid gap-2 overflow-y-auto pr-0.5 custom-scrollbar"
                        style={{
                          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                          maxHeight: 280,
                        }}
                      >
                        {filteredDances.map(dance => (
                          <DanceCard
                            key={dance.id}
                            dance={dance}
                            isSelected={selectedDanceId === dance.id}
                            onClick={() => setSelectedDanceId(dance.id)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {sourceTab === 'url' && (
                    <motion.div
                      key="url"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-3"
                    >
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Link size={11} /> Paste a Video URL
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={customVideoUrl}
                            onChange={e => setCustomVideoUrl(e.target.value)}
                            placeholder="https://... (YouTube, TikTok, Instagram, direct MP4)"
                            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:border-violet-500/60 rounded-xl px-3 py-3 text-xs text-white outline-none focus:ring-2 focus:ring-violet-500/30 pr-10 placeholder:text-white/20 transition-all"
                          />
                          {customVideoUrl && (
                            <button
                              onClick={() => setCustomVideoUrl('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full"
                            >
                              <X size={11} className="text-white/50" />
                            </button>
                          )}
                        </div>
                        <p className="text-[9px] text-[var(--text-muted)] leading-relaxed">
                          Supports YouTube shorts, TikTok, Instagram reels, and direct .mp4 links. The video should show a clear human movement.
                        </p>
                      </div>
                      {customVideoUrl && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                          <Check size={13} className="text-violet-400 shrink-0" />
                          <p className="text-[10px] text-violet-300 font-bold truncate">{customVideoUrl}</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {sourceTab === 'upload' && (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-3"
                    >
                      {customVideoName ? (
                        <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                            <Video size={16} className="text-violet-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{customVideoName}</p>
                            <p className="text-[9px] text-violet-300/70 mt-0.5">Motion video ready ✓</p>
                          </div>
                          <button
                            onClick={() => { setCustomVideoBase64(null); setCustomVideoName(null); }}
                            className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 rounded-full text-rose-400 transition-colors shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => videoInputRef.current?.click()}
                          className="w-full rounded-2xl border-2 border-dashed border-violet-500/25 flex flex-col items-center justify-center gap-3 text-violet-300 hover:text-white hover:border-violet-500/50 transition-all bg-violet-500/5 hover:bg-violet-500/10"
                          style={{ height: 110 }}
                        >
                          <Upload size={24} />
                          <div className="text-center">
                            <p className="text-xs font-bold">Select Motion Video</p>
                            <p className="text-[9px] text-[var(--text-muted)] mt-0.5">MP4, MOV, AVI, WebM</p>
                          </div>
                        </button>
                      )}
                      <input type="file" ref={videoInputRef} hidden accept="video/*" onChange={handleCustomVideoUpload} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 3. Motion Model */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-violet-400/80 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-[8px] font-black border border-violet-500/30">3</span>
                  Motion Model
                </label>
                <div className="relative">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-[var(--text-primary)] hover:border-violet-500/30 focus:border-violet-500/50 outline-none transition-all cursor-pointer appearance-none"
                  >
                    {MOTION_MODELS.map(model => (
                      <option key={model.id} value={model.id} className="bg-[#0f0f12] text-white py-2">
                        {model.name} {model.badge ? ` (${model.badge.toUpperCase()})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[var(--text-muted)]">
                    <ChevronRight size={14} className="rotate-90" />
                  </div>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] font-medium leading-relaxed italic pl-1">
                  {MOTION_MODELS.find(m => m.id === selectedModel)?.desc}
                </p>
              </div>

              {/* 4. Advanced Options */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowAdvanced(v => !v)}
                  className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-tertiary)] hover:text-white transition-colors w-full"
                >
                  <Settings size={12} />
                  Advanced Options
                  <ChevronRight size={12} className={`ml-auto transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 pt-1 p-3 rounded-xl bg-white/3 border border-white/8">
                        {/* Duration */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Output Duration</label>
                          <div className="flex gap-1.5">
                            {([5, 10, 15] as const).map(d => (
                              <button
                                key={d}
                                onClick={() => setOutputDuration(d)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                  outputDuration === d
                                    ? 'bg-violet-600 border-violet-500 text-white'
                                    : 'bg-white/5 border-white/8 text-[var(--text-muted)] hover:text-white'
                                }`}
                              >
                                {d}s
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Quality */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Output Quality</label>
                          <div className="flex gap-1.5">
                            {(['standard', 'high'] as const).map(q => (
                              <button
                                key={q}
                                onClick={() => setQuality(q)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border capitalize flex items-center justify-center gap-1.5 ${
                                  quality === q
                                    ? 'bg-violet-600 border-violet-500 text-white'
                                    : 'bg-white/5 border-white/8 text-[var(--text-muted)] hover:text-white'
                                }`}
                              >
                                {q === 'high' && <Sparkles size={9} />}
                                {q === 'standard' ? 'Standard' : 'HD Quality'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Loop toggle */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-white">Loop Output</p>
                            <p className="text-[8px] text-[var(--text-muted)]">Seamlessly loop for social posting</p>
                          </div>
                          <button
                            onClick={() => setLoopVideo(v => !v)}
                            className={`w-9 h-5 rounded-full transition-all border ${
                              loopVideo ? 'bg-violet-600 border-violet-500' : 'bg-white/10 border-white/10'
                            } relative`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${loopVideo ? 'left-4' : 'left-0.5'}`} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  <AlertTriangle size={14} className="shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Generate button — sticky at bottom */}
            <div className="sticky bottom-0 p-4 border-t border-white/8 space-y-2 bg-[#080d18] shrink-0" style={{ backdropFilter: 'blur(12px)' }}>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !canGenerate}
                className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                  isGenerating
                    ? 'bg-violet-600/40 text-white/60 pointer-events-none'
                    : canGenerate
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 text-white shadow-violet-500/30 hover:shadow-violet-500/50 hover:-translate-y-0.5'
                    : 'bg-white/5 text-white/25 pointer-events-none shadow-none'
                }`}
              >
                {isGenerating ? (
                  <><Loader2 size={18} className="animate-spin" /> Generating Motion Video...</>
                ) : (
                  <><Zap size={18} /> Generate Motion Video</>
                )}
              </button>
              {!refImage && (
                <p className="text-[9px] text-center text-[var(--text-muted)]">
                  Upload a reference photo to enable generation
                </p>
              )}
            </div>
          </div>

          {/* ── Right: Output Preview ── */}
          <div className="flex-1 bg-[#050911] flex flex-col items-center justify-center p-6 overflow-hidden relative min-h-0">

            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-violet-500/5 blur-[60px]" />
            </div>

            {/* Generating state */}
            {isGenerating && (
              <div className="flex flex-col items-center gap-5 text-white z-10 w-full max-w-sm">
                {refImage && (
                  <div className="relative">
                    <img
                      src={refImage}
                      alt="Ref avatar"
                      className="w-36 h-36 rounded-2xl object-cover opacity-30 blur-[2px] border border-violet-500/30"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <Loader2 size={36} className="animate-spin text-violet-400" />
                        <div className="absolute inset-0 rounded-full border-2 border-violet-400/20 animate-ping" />
                      </div>
                    </div>
                  </div>
                )}
                {/* Progress bar */}
                <div className="w-full space-y-2">
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-violet-300 animate-pulse">{progressStep || 'Processing...'}</p>
                    <span className="text-[10px] font-bold text-violet-300/60">{progressPct}%</span>
                  </div>
                </div>
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
                  Typically takes 20–40 seconds
                </p>
              </div>
            )}

            {/* Video result */}
            {videoUrl && !isGenerating && (
              <div className="relative max-w-md w-full flex flex-col items-center z-10">
                <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-2xl w-full">
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    loop={loopVideo}
                    className="w-full bg-black"
                    style={{ maxHeight: 400 }}
                  />
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-[8px] font-black text-white uppercase tracking-wider">
                      Generated ✓
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2.5 mt-4 w-full">
                  <button
                    onClick={() => { setVideoUrl(null); setError(null); }}
                    className="px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-xs font-bold text-white border border-white/10 flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={13} /> Regenerate
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-xs font-bold text-white border border-white/10 flex items-center gap-1.5 transition-colors"
                  >
                    <Download size={13} /> Download
                  </button>
                  <button
                    onClick={handleSaveToVault}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-lg hover:brightness-110 transition-all"
                  >
                    <Camera size={13} /> Save to Vault
                  </button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!videoUrl && !isGenerating && (
              <div className="flex flex-col items-center gap-5 text-center z-10 max-w-xs">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20 flex items-center justify-center">
                  <Video size={36} className="text-violet-400/60" />
                </div>
                <div>
                  <p className="text-sm font-black text-white/60">Motion Video Output</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                    Upload a reference photo, pick a viral dance or paste a video URL, then hit Generate
                  </p>
                </div>
                {/* Quick start hints */}
                <div className="flex flex-col gap-1.5 w-full">
                  {[
                    '1. Upload persona photo',
                    '2. Choose a dance or video',
                    '3. Click Generate',
                  ].map((hint, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/3 border border-white/6 text-left">
                      <div className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-[8px] font-black border border-violet-500/30 shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] font-medium">{hint}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
