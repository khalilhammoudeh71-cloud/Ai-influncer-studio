import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wand2, 
  Weight, 
  Dumbbell, 
  PenTool, 
  Plane, 
  Expand, 
  Image as ImageIcon,
  Upload,
  Loader2,
  ChevronLeft,
  Settings2,
  X,
  Droplets,
  Camera,
  ArrowLeftRight,
  Shield,
  Sparkles,
  Eraser,
  Shirt,
  Mic,
  Video,
  AlertTriangle
} from 'lucide-react';
import { Persona } from '../types';
import { api } from '../services/apiService';
import { editImage, faceSwap, removeBackground, virtualTryOn, fetchEditModels, type ModelInfo } from '../services/imageService';
import { processImageFile } from '../utils/imageProcessing';
import VoiceStudio from '../components/VoiceStudio';
import TalkingHeadStudio from '../components/TalkingHeadStudio';
import StoryChainStudio from '../components/StoryChainStudio';
import HeadshotStudio from '../components/HeadshotStudio';
import TimeMachine from '../components/TimeMachine';
import HairstyleTryOn from '../components/HairstyleTryOn';
import toast from 'react-hot-toast';

interface AIToolsViewProps {
  persona: Persona;
  personas: Persona[];
  onSelectPersona: (id: string) => void;
}

type ToolType = 'beautify' | 'morph' | 'muscle' | 'ink' | 'teleport' | 'canvas' | 'face-swap' | 'bg-remover' | 'virtual-tryon' | null;

const TOOLS = [
  { 
    id: 'beautify', title: 'Beautify Core', icon: Droplets, 
    desc: 'Refine nose contours, smooth undereyes and skin perfectly.', 
    color: 'from-pink-500 to-rose-500',
    demoBefore: '/demo/beautify_before.png',
    demoAfter: '/demo/beautify_after.png',
  },
  { 
    id: 'morph', title: 'Body Morph', icon: Weight, 
    desc: 'Adjust perceived body weight seamlessly.', 
    color: 'from-blue-500 to-cyan-500',
    demoBefore: '/demo/bodymorph_before.png',
    demoAfter: '/demo/bodymorph_after.png',
  },
  { 
    id: 'muscle', title: 'Muscle Sculpt', icon: Dumbbell, 
    desc: 'Add muscular definition, vascularity, or bulk.', 
    color: 'from-orange-500 to-amber-500',
    demoBefore: '/demo/muscle_before.png',
    demoAfter: '/demo/muscle_after.png',
  },
  { 
    id: 'ink', title: 'Ink Studio', icon: PenTool, 
    desc: 'Apply photorealistic tattoos to designated regions.', 
    color: 'from-slate-500 to-slate-700',
    demoBefore: '/demo/ink_before.png',
    demoAfter: '/demo/ink_after.png',
  },
  { 
    id: 'teleport', title: 'Teleport', icon: Plane, 
    desc: 'Relocate subject to global destinations cleanly.', 
    color: 'from-emerald-500 to-teal-500',
    demoBefore: '/demo/teleport_before.png',
    demoAfter: '/demo/teleport_after.png',
  },
  { 
    id: 'canvas', title: 'Canvas (Extend)', icon: Expand, 
    desc: 'Intelligently widen or extend the frame bounds.', 
    color: 'from-purple-500 to-indigo-500',
    demoBefore: '/demo/canvas_before.png',
    demoAfter: '/demo/canvas_after.png',
  },
  { 
    id: 'face-swap', title: 'Face Swap', icon: ArrowLeftRight, 
    desc: 'Swap faces between any two images with one click.', 
    color: 'from-pink-500 to-violet-500',
    demoBefore: '/demo/faceswap_before.png',
    demoAfter: '/demo/faceswap_after.png',
  },
  { 
    id: 'bg-remover', title: 'BG Remover', icon: Eraser, 
    desc: 'Remove backgrounds instantly — clean transparent PNGs.', 
    color: 'from-lime-500 to-green-500',
    demoBefore: '/demo/bgremover_before.png',
    demoAfter: '/demo/bgremover_after.png',
  },
  { 
    id: 'virtual-tryon', title: 'Virtual Try-On', icon: Shirt, 
    desc: 'See any outfit on your persona — upload clothing photos.', 
    color: 'from-fuchsia-500 to-pink-500',
    demoBefore: '/demo/tryon_before.png',
    demoAfter: '/demo/tryon_after.png',
  },
] as const;

export default function AIToolsView({ persona, personas, onSelectPersona }: AIToolsViewProps) {
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  
  // Shared Editor State
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [editModels, setEditModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('auto');

  // Tool Specific States
  const [morphValue, setMorphValue] = useState<number>(0); // -100 to 100
  const [muscleLevel, setMuscleLevel] = useState<'lean' | 'athletic' | 'bodybuilder'>('lean');
  const [teleportLoc, setTeleportLoc] = useState('Paris, Eiffel Tower');
  const [inkDesc, setInkDesc] = useState('');
  const [inkPlacement, setInkPlacement] = useState('Left Arm');
  const [canvasDir, setCanvasDir] = useState('Extend Downward');

  // Face Swap specific state
  const [faceSwapFaceImage, setFaceSwapFaceImage] = useState<string | null>(null);
  const faceFileInputRef = useRef<HTMLInputElement>(null);

  // Virtual Try-On specific state
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [garmentDescription, setGarmentDescription] = useState('');
  const garmentFileInputRef = useRef<HTMLInputElement>(null);

  // Voice Studio & Talking Head overlays
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const [showTalkingHead, setShowTalkingHead] = useState(false);
  const [showStoryChain, setShowStoryChain] = useState(false);
  const [showHeadshot, setShowHeadshot] = useState(false);
  const [showTimeMachine, setShowTimeMachine] = useState(false);
  const [showHairstyle, setShowHairstyle] = useState(false);
  const [talkingHeadAudio, setTalkingHeadAudio] = useState<string | undefined>(undefined);
  const [talkingHeadScript, setTalkingHeadScript] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchEditModels().then(models => {
      setEditModels(models);
    });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await processImageFile(file);
      setSourceImage(b64);
      setResultImage(null);
    } catch (err) {
      toast.error('Failed to process image');
    }
  };

  const getToolPrompt = () => {
    switch (activeTool) {
      case 'beautify': return 'Refined micro-edit: thin nasal bridge, lift nasal tip gracefully, smooth under-eye dark circles, perfect skin texture. Retain absolute facial identity without adding theatrical makeup or contour highlights.';
      case 'morph': 
        if (morphValue < 0) return `Photorealistic edit, identical subject face, alter body composition to appear noticeably thinner (${Math.abs(morphValue)}% reduction in perceived weight), maintaining original outfits and background perfectly.`;
        if (morphValue > 0) return `Photorealistic edit, identical subject face, alter body composition to appear fuller/thicker (${Math.abs(morphValue)}% increase in perceived weight), maintaining original outfits and background perfectly.`;
        return 'Slight upscale, minimal change.';
      case 'muscle':
        if (muscleLevel === 'lean') return 'Photorealistic edit, identical subject face, enhance baseline muscle definition slightly, lean athletic tone, light vascularity.';
        if (muscleLevel === 'athletic') return 'Photorealistic edit, identical subject face, strong athletic physique, high muscle definition, moderate vascularity, shredded appearance.';
        return 'Photorealistic edit, identical subject face, massive bodybuilder physique, extreme muscle mass and peak vascularity.';
      case 'ink': return `Photorealistic edit, identical subject face. Apply a highly detailed tattoo matching description: "${inkDesc}" to the subject's ${inkPlacement}. The tattoo should wrap naturally with the skin topology and lighting.`;
      case 'teleport': return `Photorealistic edit, identical subject face and outfit. Flawlessly replace the background to match exact location: "${teleportLoc}". Perfect composite lighting, shadows must match the new realistic environment.`;
      case 'canvas': return `Outpaint and extend the image framing. Extend direction: ${canvasDir}. Fill in the missing body parts and background naturally matching the existing style.`;
      default: return '';
    }
  };

  const getAutoModel = () => {
    if (editModels.length === 0) return '';
    const findModel = (keywords: string[]) => editModels.find(m => keywords.some(k => m.id.toLowerCase().includes(k) || m.name.toLowerCase().includes(k) || m.provider.toLowerCase().includes(k)));
    
    switch (activeTool) {
      case 'beautify': 
      case 'morph': 
      case 'muscle': 
        return findModel(['flux', 'sdxl', 'realistic'])?.id || editModels[0].id;
      case 'ink': 
      case 'teleport': 
        return findModel(['dall-e', 'gpt', 'inpaint'])?.id || editModels[0].id;
      case 'canvas': 
        return findModel(['outpaint', 'dall-e', 'gpt'])?.id || editModels[0].id;
      default: 
        return editModels[0].id;
    }
  };

  const handleExecute = async () => {
    if (!sourceImage || !activeTool || (!selectedModel && selectedModel !== 'auto')) return;
    const modelToUse = selectedModel === 'auto' ? getAutoModel() : selectedModel;
    if (!modelToUse) return;

    setIsProcessing(true);
    const prompt = getToolPrompt();
    
    try {
      const data = await editImage(sourceImage, prompt, modelToUse);
      setResultImage(data.imageUrl);
      toast.success(`${TOOLS.find(t => t.id === activeTool)?.title} complete!`);
    } catch (err: any) {
      const errorMsg = err.message || '';
      if (errorMsg.toLowerCase().includes('content filter') || errorMsg.toLowerCase().includes('nsfw')) {
        const uncensoredModel = editModels.find(m => m.nsfw);
        if (uncensoredModel) {
          toast('Sensitive content detected. Rerouting to uncensored model...', { icon: '⚠️', duration: 4000 });
          try {
            const retryData = await editImage(sourceImage, prompt, uncensoredModel.id);
            setResultImage(retryData.imageUrl);
            toast.success(`${TOOLS.find(t => t.id === activeTool)?.title} complete (Fallback)!`);
          } catch (retryErr: any) {
            toast.error(retryErr.message || 'Processing failed on fallback model');
          }
        } else {
          toast.error(errorMsg || 'Processing failed');
        }
      } else {
        toast.error(errorMsg || 'Processing failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFaceSwapExecute = async () => {
    if (!sourceImage || !faceSwapFaceImage) return;
    setIsProcessing(true);
    try {
      const data = await faceSwap(sourceImage, faceSwapFaceImage);
      setResultImage(data.imageUrl);
      toast.success('Face Swap complete!');
    } catch (err: any) {
      toast.error(err.message || 'Face swap failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBgRemoveExecute = async () => {
    if (!sourceImage) return;
    setIsProcessing(true);
    try {
      const data = await removeBackground(sourceImage);
      setResultImage(data.imageUrl);
      toast.success('Background removed!');
    } catch (err: any) {
      toast.error(err.message || 'BG removal failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVirtualTryOnExecute = async () => {
    if (!sourceImage || !garmentImage) return;
    setIsProcessing(true);
    try {
      const data = await virtualTryOn(sourceImage, garmentImage, garmentDescription || undefined);
      setResultImage(data.imageUrl);
      toast.success('Virtual try-on complete!');
    } catch (err: any) {
      toast.error(err.message || 'Try-on failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToLibrary = async () => {
    if (!resultImage) return;
    try {
      const media = {
        id: `img-${Date.now()}`,
        url: resultImage,
        prompt: getToolPrompt(),
        timestamp: Date.now(),
        model: selectedModel,
      };
      
      const updatedPersona = { ...persona, visualLibrary: [...(persona.visualLibrary || []), media] };
      const updatedPersonas = personas.map(p => p.id === persona.id ? updatedPersona : p);
      
      await api.updatePersonaInVault(updatedPersona);
      await api.images.create(persona.id, media);
      toast.success('Saved to Visual Library!');
    } catch (err) {
      toast.error('Failed to save to library');
    }
  };

  if (!activeTool) {
    return (
      <>
      <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 bg-[var(--bg-base)]">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight"><span className="gradient-text">AI Tools</span></h1>
            <p className="text-[var(--text-tertiary)] text-sm mt-1.5 mb-8 font-medium">Specialized AI editing for your personas</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id as ToolType)}
                  className="group relative flex flex-col rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--accent-primary)] transition-all overflow-hidden text-left shadow-lg hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="relative h-64 w-full flex bg-black overflow-hidden shrink-0">
                    {/* Before Image */}
                    <div className="relative w-1/2 h-full border-r border-white/20 overflow-hidden">
                      <img src={tool.demoBefore} alt="Before" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                      <div className="absolute top-4 left-4 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-black text-white uppercase tracking-widest shadow-md border border-white/10">Before</div>
                    </div>
                    {/* After Image */}
                    <div className="relative w-1/2 h-full overflow-hidden">
                      <img src={tool.demoAfter} alt="After" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                      <div className="absolute top-4 right-4 px-2.5 py-1 bg-gradient-to-r from-purple-600 to-blue-600 backdrop-blur-md rounded text-[10px] font-black text-white uppercase tracking-widest shadow-xl border border-white/20">After</div>
                    </div>
                    
                    {/* Lightning Separator */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center z-10 shadow-2xl group-hover:rotate-180 transition-transform duration-700 text-white group-hover:text-[var(--accent-primary)]">
                       <Wand2 size={16} />
                    </div>
                  </div>
                  
                  <div className="p-7 relative flex-1 flex flex-col justify-center">
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-10 rounded-bl-full transition-opacity`} />
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white shadow-lg shadow-black/20 shrink-0`}>
                        <Icon size={26} />
                      </div>
                      <h3 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">{tool.title}</h3>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] font-medium leading-relaxed max-w-[90%]">{tool.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Voice, Video & Specialty Tools */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Voice Studio */}
            <button
              onClick={() => setShowVoiceStudio(true)}
              className="group relative flex flex-col rounded-3xl bg-[var(--bg-elevated)] border border-cyan-500/20 hover:border-cyan-500/50 transition-all overflow-hidden text-left shadow-lg hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="relative h-48 w-full bg-black overflow-hidden">
                <img src="/demo/voice_studio_hero.png" alt="Voice Studio" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                    <Mic size={20} />
                  </div>
                  <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Voice Studio</h3>
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest">Free</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] font-medium">AI Text-to-Speech with 5 natural voices. Generate voiceovers for reels and stories.</p>
              </div>
            </button>

            {/* Talking Head */}
            <button
              onClick={() => setShowTalkingHead(true)}
              className="group relative flex flex-col rounded-3xl bg-[var(--bg-elevated)] border border-pink-500/20 hover:border-pink-500/50 transition-all overflow-hidden text-left shadow-lg hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="relative h-48 w-full bg-black overflow-hidden">
                <img src="/demo/talking_head_hero.png" alt="Talking Head" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
                    <Video size={20} />
                  </div>
                  <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Talking Head</h3>
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest">AI Video</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] font-medium">Animate any portrait with lip-synced speech. Type a script or upload audio.</p>
              </div>
            </button>

            {/* Story Chain */}
            <button
              onClick={() => setShowStoryChain(true)}
              className="group relative flex flex-col rounded-3xl bg-[var(--bg-elevated)] border border-amber-500/20 hover:border-amber-500/50 transition-all overflow-hidden text-left shadow-lg hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="relative h-48 w-full bg-black overflow-hidden">
                <img src="/demo/story_chain_hero.png" alt="Story Chain" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                    <Video size={20} />
                  </div>
                  <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Story Chain</h3>
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest">New</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] font-medium">Generate sequential images with consistent identity for visual storytelling.</p>
              </div>
            </button>

            {/* Pro Headshot */}
            <button
              onClick={() => setShowHeadshot(true)}
              className="group relative flex flex-col rounded-3xl bg-[var(--bg-elevated)] border border-blue-500/20 hover:border-blue-500/50 transition-all overflow-hidden text-left shadow-lg hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="relative h-48 w-full bg-black overflow-hidden">
                <img src="/demo/headshot_hero.png" alt="Pro Headshot" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Camera size={20} />
                  </div>
                  <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Pro Headshot</h3>
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-widest">New</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] font-medium">Professional headshots for LinkedIn, resumes & business cards.</p>
              </div>
            </button>

            {/* Time Machine */}
            <button
              onClick={() => setShowTimeMachine(true)}
              className="group relative flex flex-col rounded-3xl bg-[var(--bg-elevated)] border border-purple-500/20 hover:border-purple-500/50 transition-all overflow-hidden text-left shadow-lg hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="relative h-48 w-full bg-black overflow-hidden">
                <img src="/demo/time_machine_hero.png" alt="Time Machine" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                    <Settings2 size={20} />
                  </div>
                  <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Time Machine</h3>
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-widest">Fun</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] font-medium">Travel through 14 eras — 1920s to Cyberpunk 2077.</p>
              </div>
            </button>

            {/* Hairstyle Try-On */}
            <button
              onClick={() => setShowHairstyle(true)}
              className="group relative flex flex-col rounded-3xl bg-[var(--bg-elevated)] border border-pink-500/20 hover:border-pink-500/50 transition-all overflow-hidden text-left shadow-lg hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="relative h-48 w-full bg-black overflow-hidden">
                <img src="/demo/hairstyle_hero.png" alt="Hairstyle Try-On" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
                    <Sparkles size={20} />
                  </div>
                  <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Hairstyle Try-On</h3>
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase tracking-widest">New</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] font-medium">Preview 144 haircut & color combos before visiting the salon.</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <VoiceStudio
        isOpen={showVoiceStudio}
        onClose={() => setShowVoiceStudio(false)}
        persona={persona}
        onSendToTalkingHead={(audio, script) => {
          setShowVoiceStudio(false);
          setTalkingHeadAudio(audio);
          setTalkingHeadScript(script);
          setShowTalkingHead(true);
        }}
      />
      <TalkingHeadStudio
        isOpen={showTalkingHead}
        onClose={() => { setShowTalkingHead(false); setTalkingHeadAudio(undefined); setTalkingHeadScript(undefined); }}
        persona={persona}
        initialAudioUrl={talkingHeadAudio}
        initialScript={talkingHeadScript}
      />
      {showStoryChain && (
        <StoryChainStudio
          persona={persona}
          onClose={() => setShowStoryChain(false)}
        />
      )}
      {showHeadshot && (
        <HeadshotStudio persona={persona} onClose={() => setShowHeadshot(false)} />
      )}
      {showTimeMachine && (
        <TimeMachine persona={persona} onClose={() => setShowTimeMachine(false)} />
      )}
      {showHairstyle && (
        <HairstyleTryOn persona={persona} onClose={() => setShowHairstyle(false)} />
      )}
    </>
    );
  }

  const currentToolDetails = TOOLS.find(t => t.id === activeTool);
  const ToolIcon = currentToolDetails?.icon || (activeTool === 'face-swap' ? ArrowLeftRight : Sparkles);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-base)]">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setActiveTool(null); setSourceImage(null); setResultImage(null); }}
            className="p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-overlay)] transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
             <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${currentToolDetails?.color} flex items-center justify-center text-white`}>
                <ToolIcon size={16} />
             </div>
             <div>
               <h2 className="text-sm font-bold text-white leading-tight">{currentToolDetails?.title}</h2>
               <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{currentToolDetails?.desc}</p>
             </div>
          </div>
        </div>
        
        {editModels.length > 0 && (
          <div className="flex items-center gap-2">
            <Settings2 size={14} className="text-[var(--text-tertiary)]" />
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] outline-none"
            >
              <option value="auto">✨ Automatic (Best AI for Tool)</option>
              {editModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Editor sidebar */}
        <div className="w-full lg:w-80 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Source Image Panel */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Target Image</label>
              {sourceImage ? (
                <div className="relative aspect-square rounded-2xl overflow-hidden border border-[var(--border-default)] group">
                  <img src={sourceImage} alt="Source" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                     <button onClick={() => setSourceImage(null)} className="p-2 bg-rose-500 rounded-full text-white"><X size={16}/></button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-square rounded-2xl border-2 border-dashed border-[var(--border-strong)] flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5 transition-all"
                >
                  <Upload size={24} />
                  <span className="text-xs font-bold">Upload Source Image</span>
                </button>
              )}
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
            </div>

            {/* Tool specific controls */}
            {activeTool === 'beautify' && (
              <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-300 text-sm">
                Automated precision workflow active. This tool will strictly optimize facial structure without damaging identity.
              </div>
            )}

            {activeTool === 'morph' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-[var(--text-secondary)]"><span>Slimmer</span><span>Thicker</span></div>
                <input type="range" min="-100" max="100" value={morphValue} onChange={(e) => setMorphValue(parseInt(e.target.value))} className="w-full accent-cyan-500" />
                <div className="text-center text-2xl font-black text-cyan-400">{morphValue > 0 ? '+' : ''}{morphValue}%</div>
              </div>
            )}

            {activeTool === 'muscle' && (
              <div className="space-y-2">
                {(['lean', 'athletic', 'bodybuilder'] as const).map(lvl => (
                  <button 
                    key={lvl}
                    onClick={() => setMuscleLevel(lvl)}
                    className={`w-full p-3 rounded-xl border text-sm font-bold uppercase tracking-wider transition-colors ${muscleLevel === lvl ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-[var(--bg-elevated)] border-transparent text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)]'}`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            )}

            {activeTool === 'ink' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Placement</label>
                  <select value={inkPlacement} onChange={(e) => setInkPlacement(e.target.value)} className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-3 text-sm text-white outline-none">
                    <option>Left Arm</option><option>Right Arm</option><option>Chest</option><option>Neck</option><option>Full Back</option><option>Leg</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Design Description</label>
                  <textarea value={inkDesc} onChange={(e) => setInkDesc(e.target.value)} placeholder="e.g. Neo-traditional rose with dagger..." className="w-full h-24 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-3 text-sm text-white outline-none resize-none" />
                </div>
              </div>
            )}

            {activeTool === 'teleport' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Destination Background</label>
                <input type="text" value={teleportLoc} onChange={(e) => setTeleportLoc(e.target.value)} placeholder="e.g. Times Square, New York" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-3 text-sm text-white outline-none" />
              </div>
            )}

            {activeTool === 'canvas' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Extension Direction</label>
                <select value={canvasDir} onChange={(e) => setCanvasDir(e.target.value)} className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-3 text-sm text-white outline-none">
                  <option>Extend Downward</option><option>Extend Upward</option><option>Expand All Sides (Zoom Out)</option><option>Widen (Left/Right)</option>
                </select>
              </div>
            )}

            {activeTool === 'face-swap' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs leading-relaxed">
                  Upload the <strong>target image</strong> above (body to keep), then upload the <strong>face source</strong> below (face to apply).
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Face Source Image</label>
                  {faceSwapFaceImage ? (
                    <div className="relative aspect-square rounded-2xl overflow-hidden border border-pink-500/30 group">
                      <img src={faceSwapFaceImage} alt="Face" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <button onClick={() => setFaceSwapFaceImage(null)} className="p-2 bg-rose-500 rounded-full text-white"><X size={16}/></button>
                      </div>
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-pink-500/80 rounded-lg text-[9px] font-bold text-white">Face Source</div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => faceFileInputRef.current?.click()}
                      className="w-full aspect-video rounded-2xl border-2 border-dashed border-pink-500/30 flex flex-col items-center justify-center gap-3 text-pink-300 hover:text-white hover:border-pink-500/60 hover:bg-pink-500/5 transition-all"
                    >
                      <Upload size={24} />
                      <span className="text-xs font-bold">Upload Face Image</span>
                    </button>
                  )}
                  <input 
                    type="file" 
                    ref={faceFileInputRef} 
                    hidden 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const b64 = await processImageFile(file);
                        setFaceSwapFaceImage(b64);
                      } catch (err) {
                        toast.error('Failed to process face image');
                      }
                    }} 
                  />
                </div>
              </div>
            )}

            {activeTool === 'bg-remover' && (
              <div className="p-3 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-300 text-xs leading-relaxed">
                Upload an image above and click <strong>Remove Background</strong> to get a clean transparent PNG. No extra settings needed — it’s instant.
              </div>
            )}

            {activeTool === 'virtual-tryon' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-xs leading-relaxed flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>Upload your <strong>persona photo</strong> above, then upload the <strong>clothing item</strong> below. <strong>$0.12/generation</strong></span>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Garment Image</label>
                  {garmentImage ? (
                    <div className="relative aspect-square rounded-2xl overflow-hidden border border-fuchsia-500/30 group">
                      <img src={garmentImage} alt="Garment" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <button onClick={() => setGarmentImage(null)} className="p-2 bg-rose-500 rounded-full text-white"><X size={16}/></button>
                      </div>
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-fuchsia-500/80 rounded-lg text-[9px] font-bold text-white">Garment</div>
                    </div>
                  ) : (
                    <button
                      onClick={() => garmentFileInputRef.current?.click()}
                      className="w-full aspect-video rounded-2xl border-2 border-dashed border-fuchsia-500/30 flex flex-col items-center justify-center gap-3 text-fuchsia-300 hover:text-white hover:border-fuchsia-500/60 hover:bg-fuchsia-500/5 transition-all"
                    >
                      <Shirt size={24} />
                      <span className="text-xs font-bold">Upload Clothing Photo</span>
                    </button>
                  )}
                  <input
                    type="file" ref={garmentFileInputRef} hidden accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try { setGarmentImage(await processImageFile(file)); } catch { toast.error('Failed to process image'); }
                      e.target.value = '';
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Description (Optional)</label>
                  <input
                    type="text"
                    value={garmentDescription}
                    onChange={e => setGarmentDescription(e.target.value)}
                    placeholder="e.g. Red silk evening dress"
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-3 text-sm text-white outline-none"
                  />
                </div>
              </div>
            )}

          </div>
          
          <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <button 
              onClick={
                activeTool === 'face-swap' ? handleFaceSwapExecute :
                activeTool === 'bg-remover' ? handleBgRemoveExecute :
                activeTool === 'virtual-tryon' ? handleVirtualTryOnExecute :
                handleExecute
              }
              disabled={isProcessing || !sourceImage || (activeTool === 'face-swap' && !faceSwapFaceImage) || (activeTool === 'virtual-tryon' && !garmentImage)}
              className={`w-full py-3.5 rounded-xl font-bold flex flex-col items-center justify-center transition-all shadow-lg ${isProcessing || !sourceImage || (activeTool === 'face-swap' && !faceSwapFaceImage) || (activeTool === 'virtual-tryon' && !garmentImage) ? 'bg-white/5 text-white/30 shadow-none' : `bg-gradient-to-r ${currentToolDetails?.color} hover:brightness-110 text-white`}`}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Processing...</div>
              ) : (
                <div className="flex items-center gap-2"><ToolIcon size={18} /> {activeTool === 'bg-remover' ? 'Remove Background' : activeTool === 'virtual-tryon' ? 'Try On ($0.12)' : 'Apply Effect'}</div>
              )}
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 bg-black overflow-hidden relative flex items-center justify-center p-8">
          <div className="relative w-full h-full flex flex-col items-center justify-center">
             {!sourceImage && !resultImage && (
               <div className="text-[var(--text-tertiary)] flex flex-col items-center gap-4 opacity-50">
                  <ImageIcon size={48} />
                  <p>Upload a source image to begin editing</p>
               </div>
             )}
             
             {isProcessing && sourceImage && !resultImage && (
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="relative aspect-square max-w-lg w-full rounded-2xl overflow-hidden opacity-50 blur-sm">
                   <img src={sourceImage} className="w-full h-full object-contain" alt="" />
                 </div>
                 <div className="absolute flex flex-col items-center text-white drop-shadow-xl z-20">
                   <Loader2 size={40} className="animate-spin text-white mb-4" />
                   <div className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-full font-bold">Applying AI Algorithm...</div>
                 </div>
               </div>
             )}

             {resultImage && (
               <div className="relative max-w-3xl w-full h-full flex flex-col items-center justify-center gap-4">
                 <div className="relative h-full w-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-[var(--bg-elevated)] flex items-center justify-center">
                   <img src={resultImage} alt="Result" className="max-w-full max-h-full object-contain" />
                 </div>
                 <div className="absolute bottom-4 flex gap-3">
                   <button onClick={() => setResultImage(null)} className="px-6 py-2.5 rounded-xl bg-black/80 hover:bg-black text-white font-bold backdrop-blur-xl border border-white/10 transition-colors">Discard</button>
                   <button onClick={saveToLibrary} className={`px-6 py-2.5 rounded-xl bg-gradient-to-r ${currentToolDetails?.color} text-white font-bold backdrop-blur-xl border border-white/20 shadow-lg hover:scale-105 transition-transform flex items-center gap-2`}>
                     <Camera size={16} /> Save to Library
                   </button>
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
