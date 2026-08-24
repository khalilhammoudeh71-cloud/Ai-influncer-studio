import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Film, Music, Type, Plus, Trash2, Play, Pause, Save,
  Sparkles, Loader2, ArrowRight, Video, ChevronRight,
  ChevronLeft, Sliders, Volume2
} from 'lucide-react';
import { Persona, GeneratedImage } from '../types';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';
import { stitchVideos } from '../services/imageService';

interface VideoStitcherProps {
  persona: Persona | null;
  personas: Persona[];
  onSelectPersona: (id: string) => void;
  onUpdatePersonas?: (personas: Persona[]) => void;
}

interface StitchScene {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  duration: number; // in seconds
  caption: string;
  prompt: string;
}

const CAPTION_STYLES = [
  { id: 'tiktok', name: 'TikTok Yellow', font: 'font-black text-yellow-400 text-lg uppercase tracking-wider shadow-[2px_2px_0px_#000]' },
  { id: 'neon', name: 'Neon Glow', font: 'font-bold text-fuchsia-400 text-md tracking-wide drop-shadow-[0_0_8px_rgba(244,63,94,0.8)] shadow-black' },
  { id: 'minimal', name: 'Minimalist Blur', font: 'font-bold text-white text-sm bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10' },
  { id: 'classic', name: 'Classic Sub', font: 'font-semibold text-white text-sm tracking-wide shadow-[1px_1px_2px_rgba(0,0,0,0.8)]' }
];

export default function VideoStitcher({ persona: activePersona, personas, onSelectPersona, onUpdatePersonas }: VideoStitcherProps) {
  const [scenes, setScenes] = useState<StitchScene[]>([]);
  const [activeSceneIdx, setActiveSceneIdx] = useState<number>(0);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState<string>('');
  const [selectedCaptionStyle, setSelectedCaptionStyle] = useState<string>('tiktok');
  const [isStitching, setIsStitching] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineDuration, setTimelineDuration] = useState(0);

  // Audio elements representation
  const [mockAudios] = useState([
    { name: 'Wavespeed AI Voice 1 (Luna Cloned)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { name: 'Elevated Chill Beats (Lofi Background)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { name: 'Corporate Narration Tech Tone', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' }
  ]);

  // Load active persona's visual library
  const availableMedia = activePersona?.visualLibrary || [];

  // Recalculate total duration
  useEffect(() => {
    const total = scenes.reduce((sum, scene) => sum + scene.duration, 0);
    setTimelineDuration(total);
  }, [scenes]);

  const handleAddScene = (item: GeneratedImage) => {
    const newScene: StitchScene = {
      id: `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      mediaUrl: item.url,
      mediaType: item.mediaType === 'video' ? 'video' : 'image',
      duration: item.mediaType === 'video' ? 5 : 4,
      caption: item.prompt.substring(0, 40) + '...',
      prompt: item.prompt
    };
    setScenes([...scenes, newScene]);
    toast.success('Scene added to timeline!');
  };

  const handleRemoveScene = (id: string) => {
    setScenes(scenes.filter(s => s.id !== id));
    if (activeSceneIdx >= scenes.length - 1 && activeSceneIdx > 0) {
      setActiveSceneIdx(scenes.length - 2);
    }
  };

  const handleUpdateSceneDuration = (idx: number, dur: number) => {
    const updated = [...scenes];
    updated[idx].duration = Math.max(1, Math.min(30, dur));
    setScenes(updated);
  };

  const handleUpdateSceneCaption = (idx: number, caption: string) => {
    const updated = [...scenes];
    updated[idx].caption = caption;
    setScenes(updated);
  };

  const handleStitchVideo = async () => {
    if (scenes.length === 0) {
      toast.error('Add at least one scene to the timeline!');
      return;
    }
    const videoScenes = scenes.filter(scene => scene.mediaType === 'video');
    if (videoScenes.length !== scenes.length) {
      toast.error('Convert image scenes to video clips before stitching. The studio will not substitute demo footage.');
      return;
    }

    setIsStitching(true);
    try {
      const videoUrl = await stitchVideos(videoScenes.map(scene => scene.mediaUrl));

      // If successful, create a new GeneratedImage item and add it to the active persona's visual library
      if (activePersona && onUpdatePersonas) {
        const newAsset: GeneratedImage = {
          id: `stitched-${Date.now()}`,
          url: videoUrl,
          prompt: scenes.map(s => s.caption).join(' | '),
          timestamp: Date.now(),
          mediaType: 'video',
          model: 'FFmpeg Video Stitcher'
        };

        const updatedVisualLibrary = [newAsset, ...(activePersona.visualLibrary || [])];
        const updatedPersona = { ...activePersona, visualLibrary: updatedVisualLibrary };

        const updatedPersonas = personas.map(p => p.id === activePersona.id ? updatedPersona : p);
        onUpdatePersonas(updatedPersonas);
        onSelectPersona(activePersona.id); // Refresh active state
      }

      toast.success('Video successfully stitched and saved to Gallery Vault!');
      setScenes([]);
      setIsPlaying(false);
    } catch (err: any) {
      toast.error(err.message || 'Stitching video failed');
    } finally {
      setIsStitching(false);
    }
  };

  const activeFont = CAPTION_STYLES.find(s => s.id === selectedCaptionStyle)?.font || '';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Film className="w-6 h-6 text-violet-400" />
          Video Timeline Stitcher
        </h1>
        <p className="text-xs text-[var(--text-tertiary)] font-bold mt-1 uppercase tracking-wider">
          Compile generated pictures, loops, cloned voice scripts, and custom subtitle fonts into professional posts.
        </p>
      </div>

      {/* Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left 8 Columns: Asset Bank & Timeline Tracks */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Asset bank */}
          <div className="premium-card p-5 space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Creator Asset Bank (Visuals)
            </h2>
            
            {availableMedia.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
                <p className="text-xs text-zinc-400">No generated media available. Generate images or videos first!</p>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                {availableMedia.map(item => (
                  <div 
                    key={item.id}
                    className="w-28 shrink-0 group relative cursor-pointer border border-white/5 hover:border-cyan-500/30 rounded-xl overflow-hidden aspect-[9/16] bg-[#0B0F17]"
                  >
                    {item.mediaType === 'video' ? (
                      <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                    )}
                    
                    {/* Hover add overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-center items-center gap-2">
                      <button
                        onClick={() => handleAddScene(item)}
                        className="p-2 rounded-full bg-cyan-400 text-black hover:scale-115 transition-all shadow-[0_0_10px_rgba(34,211,238,0.4)]"
                      >
                        <Plus size={16} />
                      </button>
                      <span className="text-[9px] font-black uppercase text-cyan-300">Add scene</span>
                    </div>

                    {/* Media Type badge */}
                    <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/55 text-[8px] font-bold text-white">
                      {item.mediaType === 'video' ? 'Video' : 'Image'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline tracks */}
          <div className="premium-card p-5 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">Multi-Track Timeline</h2>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Arrange your video blocks and adjust timing.</p>
              </div>
              <div className="text-xs font-black text-[#00F5C2]">
                Total Duration: {timelineDuration}s
              </div>
            </div>

            {scenes.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-2 bg-[#0B0F17]/20">
                <Video className="w-8 h-8 text-zinc-600" />
                <p className="text-xs text-zinc-400 font-bold">Timeline is empty.</p>
                <p className="text-[10px] text-zinc-500">Click "+" on assets above to build your story scenes.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {scenes.map((scene, idx) => (
                  <div 
                    key={scene.id}
                    className={cn(
                      "p-4 border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all",
                      activeSceneIdx === idx 
                        ? "border-cyan-500/30 bg-cyan-950/5" 
                        : "border-white/5 hover:border-white/10 bg-white/[0.01]"
                    )}
                    onClick={() => setActiveSceneIdx(idx)}
                  >
                    {/* Index */}
                    <div className="text-xs font-black text-zinc-500">Scene {idx + 1}</div>

                    {/* Mini Thumb */}
                    <div className="w-12 h-20 rounded-lg overflow-hidden border border-white/10 shrink-0 relative bg-black">
                      {scene.mediaType === 'video' ? (
                        <video src={scene.mediaUrl} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={scene.mediaUrl} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>

                    {/* Info / Inputs */}
                    <div className="flex-1 space-y-3 w-full">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-1">Scene Subtitle / Caption</label>
                          <input 
                            type="text" 
                            value={scene.caption} 
                            onChange={(e) => handleUpdateSceneCaption(idx, e.target.value)}
                            className="w-full bg-[var(--bg-input)] border border-white/5 rounded-xl py-2 px-3 outline-none text-white text-xs"
                          />
                        </div>
                        <div className="w-24">
                          <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-1">Duration (s)</label>
                          <input 
                            type="number" 
                            min="1"
                            max="30"
                            value={scene.duration}
                            onChange={(e) => handleUpdateSceneDuration(idx, parseInt(e.target.value) || 1)}
                            className="w-full bg-[var(--bg-input)] border border-white/5 rounded-xl py-2 px-3 outline-none text-center text-white text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveScene(scene.id);
                      }}
                      className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audio & Settings Config */}
          <div className="premium-card p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-400" />
                Select Voiceover / Audio Track
              </h3>
              <select
                value={selectedAudioUrl}
                onChange={(e) => setSelectedAudioUrl(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-white/5 rounded-xl py-2.5 px-3 outline-none text-white text-xs font-bold"
              >
                <option value="">None / Silent Video</option>
                {mockAudios.map(aud => (
                  <option key={aud.url} value={aud.url}>{aud.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Type className="w-4 h-4 text-[#00F5C2]" />
                Caption Subtitle Style
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {CAPTION_STYLES.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedCaptionStyle(style.id)}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider text-center transition-all",
                      selectedCaptionStyle === style.id
                        ? "border-[#00F5C2]/40 bg-[#00F5C2]/5 text-[#00F5C2]"
                        : "border-white/5 hover:border-white/10 text-zinc-400"
                    )}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right 4 Columns: Phone Preview Simulator */}
        <div className="lg:col-span-4 space-y-6">
          <div className="premium-card p-5 space-y-6 flex flex-col items-center">
            
            {/* Phone outline container */}
            <div className="w-full max-w-[280px] aspect-[9/16] rounded-[40px] border-8 border-zinc-800 bg-black relative overflow-hidden shadow-2xl shadow-black/80 flex flex-col justify-between p-4">
              
              {/* Dynamic looping media preview */}
              {scenes.length > 0 && scenes[activeSceneIdx] ? (
                <div className="absolute inset-0 z-0">
                  {scenes[activeSceneIdx].mediaType === 'video' ? (
                    <video 
                      src={scenes[activeSceneIdx].mediaUrl} 
                      className="w-full h-full object-cover" 
                      autoPlay 
                      loop 
                      muted 
                      playsInline
                    />
                  ) : (
                    <img 
                      src={scenes[activeSceneIdx].mediaUrl} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  )}
                  {/* Subtle dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 z-1" />
                </div>
              ) : (
                <div className="absolute inset-0 z-0 bg-zinc-950 flex flex-col items-center justify-center text-center p-4">
                  <Film className="w-12 h-12 text-zinc-800 animate-pulse mb-2" />
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Preview Canvas</p>
                </div>
              )}

              {/* Top notch/header */}
              <div className="w-full flex justify-between items-center z-10 relative">
                <div className="text-[9px] font-bold text-white/80">9:41</div>
                <div className="w-14 h-4 bg-zinc-800 rounded-full mx-auto" />
                <div className="text-[9px] font-bold text-white/80 flex items-center gap-1">5G</div>
              </div>

              {/* Subtitles (Centered bottom overlay) */}
              {scenes.length > 0 && scenes[activeSceneIdx] && (
                <div className="w-full flex justify-center text-center px-4 pb-12 z-10 relative mt-auto">
                  <p className={cn("text-center break-words max-w-full leading-snug", activeFont)}>
                    {scenes[activeSceneIdx].caption}
                  </p>
                </div>
              )}

              {/* Bottom bar indicator */}
              <div className="w-20 h-1 bg-white/40 rounded-full mx-auto z-10 relative" />
            </div>

            {/* Playback Controls & Action */}
            <div className="w-full space-y-4">
              {scenes.length > 0 && (
                <div className="flex justify-between items-center px-2">
                  <button 
                    disabled={activeSceneIdx === 0}
                    onClick={() => setActiveSceneIdx(prev => Math.max(0, prev - 1))}
                    className="p-2 rounded-full border border-white/5 hover:bg-white/5 text-white disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Scene {activeSceneIdx + 1} of {scenes.length}
                  </span>
                  <button
                    disabled={activeSceneIdx === scenes.length - 1}
                    onClick={() => setActiveSceneIdx(prev => Math.min(scenes.length - 1, prev + 1))}
                    className="p-2 rounded-full border border-white/5 hover:bg-white/5 text-white disabled:opacity-30 transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              <button
                disabled={isStitching || scenes.length === 0}
                onClick={handleStitchVideo}
                className="w-full premium-button py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
              >
                {isStitching ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Stitching scenes together...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Stitch & Export Video
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
