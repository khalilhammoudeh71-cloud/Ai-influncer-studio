import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  BookOpen,
  Video,
  ImageIcon,
  Play,
  Scissors,
  Check
} from 'lucide-react';
import { Persona } from '../types';
import {
  generateImage,
  generateVideo,
  extractLastFrame,
  stitchVideos,
  type GenerateImageResult
} from '../services/imageService';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

interface StoryChainStudioProps {
  persona: Persona;
  onClose: () => void;
}

interface StoryScene {
  id: string;
  title: string;
  description: string;
  result?: GenerateImageResult;
  videoUrl?: string;
  lastFrameUrl?: string;
  isGenerating?: boolean;
  modelId?: string;
}

const STORY_TEMPLATES = [
  {
    name: '1-Minute Cinematic Story',
    scenes: [
      'Character walks into a neon cyber city hallway looking around mysteriously',
      'Character approaches a holographic terminal and activates a glowing device',
      'Device releases a burst of golden light that transforms the room atmosphere',
      'Character turns back toward the camera with a confident smile as light settles',
      'Pan out shot of the character standing heroically in the transformed room',
      'Final slow-motion walk forward toward the camera as scene fades out'
    ]
  },
  {
    name: 'Day in My Life Vlog',
    scenes: [
      'Morning routine: waking up and drinking coffee near the window',
      'Heading out: walking down a trendy urban street looking stylish',
      'Work session: working at a luxury creator desk with laptop',
      'Evening workout: dynamic gym action shot',
      'Sunset wind-down: relaxing on a rooftop overlooking city skyline'
    ]
  },
  {
    name: 'Product Reveal Story',
    scenes: [
      'Dramatic close-up teaser shot of sleek package box',
      'Hands unboxing the product with glowing ambient reflections',
      'Demonstrating the main feature candidly',
      'Transformation / results showcase shot',
      'Call to action hero pose holding product'
    ]
  },
];

const VIDEO_MODELS = [
  { id: 'wavespeed-i2v:wavespeed-ai/kling-3.0', name: 'Kling 3.0 (Cinematic)' },
  { id: 'wavespeed-i2v:wavespeed-ai/wan-2.2-i2v-720p', name: 'Wan 2.2 I2V (Fluid)' },
  { id: 'wavespeed-i2v:wavespeed-ai/seedance-2.0', name: 'Seedance 2.0 (High Realism)' },
  { id: 'wavespeed-i2v:wavespeed-ai/seededit-v3.0', name: 'SeedEdit v3.0' },
];

export default function StoryChainStudio({ persona, onClose }: StoryChainStudioProps) {
  const [chainMode, setChainMode] = useState<'image' | 'video'>('video');
  const [scenes, setScenes] = useState<StoryScene[]>([
    { id: `s-${Date.now()}`, title: 'Segment 1', description: '' },
    { id: `s-${Date.now() + 1}`, title: 'Segment 2', description: '' },
    { id: `s-${Date.now() + 2}`, title: 'Segment 3', description: '' },
  ]);
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>(VIDEO_MODELS[0].id);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isStitching, setIsStitching] = useState(false);
  const [stitchedVideoUrl, setStitchedVideoUrl] = useState<string | null>(null);
  const [activeScene, setActiveScene] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const filmstripRef = useRef<HTMLDivElement>(null);

  const addScene = () => {
    if (scenes.length >= 10) return toast.error('Maximum 10 scene segments');
    setScenes(prev => [
      ...prev,
      { id: `s-${Date.now()}`, title: `Segment ${prev.length + 1}`, description: '' }
    ]);
  };

  const removeScene = (id: string) => {
    if (scenes.length <= 2) return toast.error('Minimum 2 scenes required');
    setScenes(prev => prev.filter(s => s.id !== id));
    if (activeScene >= scenes.length - 1) setActiveScene(Math.max(0, scenes.length - 2));
  };

  const updateScene = (id: string, desc: string) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, description: desc } : s));
  };

  const applyTemplate = (template: typeof STORY_TEMPLATES[0]) => {
    setScenes(template.scenes.map((desc, i) => ({
      id: `s-${Date.now() + i}`,
      title: `Segment ${i + 1}`,
      description: desc,
    })));
    setShowTemplates(false);
    setActiveScene(0);
    toast.success(`Applied "${template.name}" template`);
  };

  const generateSequentialChain = async () => {
    const emptyScenes = scenes.filter(s => !s.description.trim());
    if (emptyScenes.length > 0) return toast.error(`${emptyScenes.length} segments have empty descriptions`);

    setIsGeneratingAll(true);
    setStitchedVideoUrl(null);

    const updated = [...scenes];
    let currentSourceImage: string | undefined = persona.referenceImage || undefined;

    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], isGenerating: true };
      setScenes([...updated]);
      setActiveScene(i);

      try {
        if (chainMode === 'image') {
          const result = await generateImage({
            persona,
            modelId: 'wavespeed-ai/flux-dev',
            environment: 'None',
            outfitStyle: 'None',
            framing: 'None',
            mood: 'None',
            additionalInstructions: `Scene ${i + 1} of ${updated.length}: ${updated[i].description}`,
            naturalLook: true,
            identityLock: true,
          });

          const singleResult = Array.isArray(result) ? result[0] : result;
          updated[i] = { ...updated[i], result: singleResult, isGenerating: false };
        } else {
          // ── VIDEO CHAIN MODE (Sequential Frame Chaining) ──
          toast.loading(`Generating Video Segment ${i + 1} of ${updated.length}...`, { id: `gen-${i}` });

          const prompt = `Segment ${i + 1}: ${updated[i].description}`;
          const res = await generateVideo(
            prompt,
            selectedVideoModel,
            currentSourceImage,
            true,
            true
          );

          updated[i] = {
            ...updated[i],
            videoUrl: res.videoUrl,
            modelId: res.model,
            isGenerating: false,
          };

          toast.success(`Segment ${i + 1} video generated!`, { id: `gen-${i}` });

          // Extract last frame of this segment to pass to the next segment
          if (i < updated.length - 1) {
            try {
              toast.loading(`Extracting last frame of Segment ${i + 1}...`, { id: `frame-${i}` });
              const lastFrame = await extractLastFrame(res.videoUrl);
              updated[i].lastFrameUrl = lastFrame;
              currentSourceImage = lastFrame; // Set as starting frame for segment i + 1
              toast.success(`Last frame captured for Segment ${i + 2}!`, { id: `frame-${i}` });
            } catch (frameErr) {
              console.warn(`[StoryChain] Last frame extraction failed for segment ${i + 1}:`, frameErr);
              toast.dismiss(`frame-${i}`);
            }
          }
        }
      } catch (err: any) {
        updated[i] = { ...updated[i], isGenerating: false };
        toast.error(`Segment ${i + 1} failed: ${err.message}`);
      }

      setScenes([...updated]);
    }

    setIsGeneratingAll(false);

    // Auto-stitch if video mode and all segments succeeded
    if (chainMode === 'video') {
      const generatedUrls = updated.filter(s => s.videoUrl).map(s => s.videoUrl!);
      if (generatedUrls.length === updated.length) {
        await handleStitchVideos(generatedUrls);
      }
    }

    toast.success('Story chain sequence complete!');
  };

  const handleStitchVideos = async (urlsToStitch?: string[]) => {
    const targetUrls = urlsToStitch || scenes.filter(s => s.videoUrl).map(s => s.videoUrl!);
    if (targetUrls.length === 0) return toast.error('No video segments available to stitch');

    setIsStitching(true);
    const t = toast.loading(`Stitching ${targetUrls.length} video segments with FFmpeg into 1 continuous video...`);

    try {
      const mergedUrl = await stitchVideos(targetUrls);
      setStitchedVideoUrl(mergedUrl);
      toast.success('Video segments stitched successfully!', { id: t });
    } catch (err: any) {
      console.error('[StoryChain] Stitching error:', err);
      toast.error(`Stitching failed: ${err.message}`, { id: t });
    } finally {
      setIsStitching(false);
    }
  };

  const completedCount = scenes.filter(s => s.result || s.videoUrl).length;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#08080d] backdrop-blur-xl flex flex-col text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b border-white/10 gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all">
            <X size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Film size={22} className="text-amber-400 animate-pulse" /> Sequential Multi-Scene <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Video Studio</span>
            </h1>
            <p className="text-xs text-white/50">
              Generate sequential video segments using frame-chaining & stitch into 1 long video.
            </p>
          </div>
        </div>

        {/* Chain Mode & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setChainMode('video')}
              className={cn("flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                chainMode === 'video' ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md" : "text-white/60 hover:text-white"
              )}
            >
              <Video size={14} /> 1-Min Video Chain
            </button>
            <button
              onClick={() => setChainMode('image')}
              className={cn("flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                chainMode === 'image' ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md" : "text-white/60 hover:text-white"
              )}
            >
              <ImageIcon size={14} /> Image Story Chain
            </button>
          </div>

          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={cn("px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border",
              showTemplates ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-white/5 text-white/60 hover:text-white border-white/10"
            )}
          >
            <BookOpen size={14} /> Templates
          </button>
        </div>
      </div>

      {/* Templates Dropdown */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/10 bg-white/[0.02]"
          >
            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {STORY_TEMPLATES.map(t => (
                <button
                  key={t.name}
                  onClick={() => applyTemplate(t)}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-left group"
                >
                  <p className="text-sm font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">{t.name}</p>
                  <p className="text-[10px] text-white/50 leading-relaxed">{t.scenes.length} segments: {t.scenes.join(' → ')}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Scene List (Left) */}
        <div className="w-full lg:w-[380px] border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto p-4 space-y-4 bg-black/20">
          {chainMode === 'video' && (
            <div className="space-y-1.5 bg-white/[0.02] p-3 rounded-xl border border-white/5">
              <label className="text-[10px] font-black uppercase tracking-wider text-amber-400">Video AI Model</label>
              <select
                value={selectedVideoModel}
                onChange={e => setSelectedVideoModel(e.target.value)}
                className="w-full bg-[#121218] border border-white/10 rounded-lg px-3 py-2 text-xs font-semibold text-white outline-none"
              >
                {VIDEO_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
              Story Segments ({scenes.length})
            </span>
            <button onClick={addScene} className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1">
              <Plus size={12} /> Add Segment
            </button>
          </div>

          {scenes.map((scene, i) => (
            <div
              key={scene.id}
              onClick={() => setActiveScene(i)}
              className={cn(
                'rounded-xl border p-3 cursor-pointer transition-all',
                activeScene === i
                  ? 'border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/20'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/15'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                  <span className="text-xs font-bold text-white">{scene.title}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {scene.isGenerating && <Loader2 size={12} className="text-amber-400 animate-spin" />}
                  {scene.videoUrl && <span className="text-[9px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded font-bold">✓ Video</span>}
                  {scene.result && <span className="text-[9px] bg-blue-500/20 border border-blue-500/30 text-blue-300 px-2 py-0.5 rounded font-bold">✓ Image</span>}
                  <button onClick={(e) => { e.stopPropagation(); removeScene(scene.id); }} className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-rose-400 transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <textarea
                value={scene.description}
                onChange={e => updateScene(scene.id, e.target.value)}
                onClick={e => e.stopPropagation()}
                placeholder={`Describe segment ${i + 1} action...`}
                className="w-full bg-[#0d0d12] border border-white/5 rounded-lg p-2 text-xs text-white outline-none resize-none placeholder:text-white/20 h-14"
              />

              {scene.lastFrameUrl && (
                <div className="mt-2 flex items-center gap-2 text-[9px] text-amber-300/80">
                  <Scissors size={10} /> Extracted last frame passed to next clip
                </div>
              )}
            </div>
          ))}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={generateSequentialChain}
              disabled={isGeneratingAll || isStitching || scenes.some(s => !s.description.trim())}
              className={cn(
                'w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg',
                isGeneratingAll || isStitching || scenes.some(s => !s.description.trim())
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-black shadow-amber-500/20'
              )}
            >
              {isGeneratingAll ? (
                <><Loader2 size={16} className="animate-spin" /> Generating Chain ({completedCount}/{scenes.length})...</>
              ) : (
                <><Sparkles size={16} /> Run Sequential Video Chain ({scenes.length} Clips)</>
              )}
            </button>

            {chainMode === 'video' && completedCount > 0 && (
              <button
                onClick={() => handleStitchVideos()}
                disabled={isStitching || isGeneratingAll}
                className="w-full py-3 rounded-xl border border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                {isStitching ? <Loader2 size={14} className="animate-spin" /> : <Scissors size={14} />}
                Stitch All Clips with FFmpeg
              </button>
            )}
          </div>
        </div>

        {/* Preview Area (Right) */}
        <div className="flex-1 flex flex-col items-center justify-between p-6 overflow-hidden bg-[#07070a]">
          {/* Stitched Video Result Banner */}
          {stitchedVideoUrl && (
            <div className="w-full max-w-3xl bg-gradient-to-r from-emerald-950/60 via-emerald-900/40 to-emerald-950/60 border border-emerald-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/40">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-300">Stitched 1-Minute Video Complete!</h4>
                  <p className="text-xs text-emerald-200/60">All segments seamlessly concatenated into one MP4 file.</p>
                </div>
              </div>

              <a
                href={stitchedVideoUrl}
                download="stitched_story_video.mp4"
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Download size={14} /> Download Stitched Video
              </a>
            </div>
          )}

          {/* Active Segment Preview / Video Player */}
          <div className="w-full max-w-3xl flex-1 flex flex-col items-center justify-center">
            {stitchedVideoUrl ? (
              <video
                src={stitchedVideoUrl}
                controls
                autoPlay
                className="max-h-[55vh] rounded-2xl shadow-2xl border border-white/10"
              />
            ) : scenes[activeScene]?.videoUrl ? (
              <video
                src={scenes[activeScene].videoUrl}
                controls
                autoPlay
                className="max-h-[55vh] rounded-2xl shadow-2xl border border-white/10"
              />
            ) : scenes[activeScene]?.result ? (
              <img
                src={scenes[activeScene].result!.imageUrl}
                alt=""
                className="max-h-[55vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
            ) : scenes[activeScene]?.isGenerating ? (
              <div className="w-full aspect-[16/9] max-h-[50vh] rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <Loader2 size={36} className="text-amber-400 animate-spin mx-auto" />
                  <p className="text-sm font-bold text-white/70">Generating Segment {activeScene + 1} Video...</p>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-[16/9] max-h-[50vh] rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-center p-6">
                <div className="space-y-2">
                  <Film size={40} className="text-white/20 mx-auto" />
                  <p className="text-sm text-white/40 font-medium">
                    Configure your segments on the left and run the Sequential Video Chain to generate & stitch video clips.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Filmstrip Bar */}
          <div className="w-full max-w-3xl pt-4 border-t border-white/10 flex items-center justify-between gap-4">
            <div ref={filmstripRef} className="flex gap-2 overflow-x-auto pb-1 flex-1">
              {scenes.map((scene, i) => (
                <button
                  key={scene.id}
                  onClick={() => setActiveScene(i)}
                  className={cn(
                    'shrink-0 w-20 h-16 rounded-xl border-2 overflow-hidden transition-all relative',
                    activeScene === i ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-white/10 hover:border-white/25'
                  )}
                >
                  {scene.videoUrl ? (
                    <video src={scene.videoUrl} className="w-full h-full object-cover" />
                  ) : scene.result ? (
                    <img src={scene.result.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/[0.03] flex items-center justify-center">
                      {scene.isGenerating ? <Loader2 size={14} className="text-amber-400 animate-spin" /> : <span className="text-[10px] text-white/30">{i + 1}</span>}
                    </div>
                  )}
                  <span className="absolute bottom-0.5 right-0.5 text-[8px] font-black bg-black/70 text-amber-300 px-1 rounded">{i + 1}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveScene(Math.max(0, activeScene - 1))}
                disabled={activeScene === 0}
                className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-bold text-white/60">{activeScene + 1} / {scenes.length}</span>
              <button
                onClick={() => setActiveScene(Math.min(scenes.length - 1, activeScene + 1))}
                disabled={activeScene === scenes.length - 1}
                className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
