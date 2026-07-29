import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  AlertTriangle,
  ArrowUpCircle,
  Copy,
  CheckCircle2,
  Zap,
  FileText,
  Cpu,
  Check,
  Download,
  ChevronDown
} from 'lucide-react';
import { Persona, NavActions } from '../types';
import { api } from '../services/apiService';
import { editImage, faceSwap, removeBackground, virtualTryOn, fetchEditModels, upscaleImage, fetchUpscaleModels, fetchVideoModels, generateAngleImage, ANGLE_MODELS, type ModelInfo } from '../services/imageService';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import { processImageFile } from '../utils/imageProcessing';
import { generatePersonaContent } from '../utils/personaEngine';
import VoiceStudio from '../components/VoiceStudio';
import TalkingHeadStudio from '../components/TalkingHeadStudio';
import StoryChainStudio from '../components/StoryChainStudio';
import HeadshotStudio from '../components/HeadshotStudio';
import TimeMachine from '../components/TimeMachine';
import HairstyleTryOn from '../components/HairstyleTryOn';
import MotionControlStudio from '../components/MotionControlStudio';
import toast from 'react-hot-toast';

interface AIToolsViewProps {
  persona: Persona;
  personas: Persona[];
  onSelectPersona: (id: string) => void;
  nav: NavActions;
  initialTool?: ToolType;
  billingInfo?: any;
}

type ToolType = 'beautify' | 'morph' | 'muscle' | 'ink' | 'teleport' | 'canvas' | 'face-swap' | 'bg-remover' | 'virtual-tryon' | 'video-edit' | 'skin-enhancer' | 'upscaler' | 'camera-angles' | null;

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
  { 
    id: 'video-edit', title: 'AI Video Editor', icon: Video, 
    desc: 'Stylize, edit, or transform existing videos using AI.', 
    color: 'from-violet-500 to-fuchsia-500',
    demoBefore: '/demo-assets/video-preview.mp4',
    demoAfter: '/demo-assets/generated-talking.mp4',
  },
  { 
    id: 'skin-enhancer', title: 'Skin Enhancer', icon: Sparkles, 
    desc: 'Blemish removal, skin smoothing, and texture enhancement in batch.', 
    color: 'from-amber-400 to-orange-500',
    demoBefore: '/demo/beautify_before.png',
    demoAfter: '/demo/beautify_after.png',
  },
  { 
    id: 'upscaler', title: 'Image Upscaler', icon: ArrowUpCircle, 
    desc: 'Upscale low-resolution images to 2K/4K ultra HD in batch.', 
    color: 'from-blue-500 to-indigo-600',
    demoBefore: '/demo/canvas_before.png',
    demoAfter: '/demo/canvas_after.png',
  },
  { 
    id: 'camera-angles', title: 'Camera Angles', icon: Camera, 
    desc: 'Generate 9-angle identity sheets or adjust camera perspective.', 
    color: 'from-cyan-500 to-sky-500',
    demoBefore: '/demo/canvas_before.png',
    demoAfter: '/demo/canvas_after.png',
  },
] as const;

const HORIZONTAL_POSITIONS = [
  { id: 1,  label: 'Front',       row: 0, col: 1 },
  { id: 2,  label: 'FR',           row: 0, col: 2 },
  { id: 3,  label: 'Right',        row: 1, col: 2 },
  { id: 4,  label: 'BR',           row: 2, col: 2 },
  { id: 5,  label: 'Back',         row: 2, col: 1 },
  { id: 6,  label: 'BL',           row: 2, col: 0 },
  { id: 7,  label: 'Left',         row: 1, col: 0 },
  { id: 8,  label: 'FL',           row: 0, col: 0 },
];

const VERTICAL_POSITIONS = [
  { id: 0, label: "Bird's Eye" },
  { id: 1, label: 'High Angle'  },
  { id: 2, label: 'Eye Level'   },
  { id: 3, label: 'Low Angle'   },
];

const DISTANCE_OPTIONS = [
  { id: 0,  label: 'Close-Up'     },
  { id: 1,  label: 'Medium Shot'  },
  { id: 2,  label: 'Wide Shot'    },
];

export default function AIToolsView({ persona, personas, onSelectPersona, nav, initialTool, billingInfo }: AIToolsViewProps) {
  const [activeTool, setActiveTool] = useState<ToolType>(initialTool || null);

  useEffect(() => {
    setActiveTool(initialTool || null);
  }, [initialTool]);

  const [toolCategory, setToolCategory] = useState<'editor' | 'studios'>('editor');
  
  // Batch processing interfaces & states
  interface BatchItem {
    id: string;
    file: File;
    previewUrl: string;
    status: 'idle' | 'processing' | 'done' | 'failed';
    resultUrl?: string;
    error?: string;
  }
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchEnhancementStrength, setBatchEnhancementStrength] = useState<number>(0.75); // 0 to 1
  const [batchUpscaleResolution, setBatchUpscaleResolution] = useState<string>('4k'); // '2k' | '4k'
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  
  // Shared Editor State
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultHistory, setResultHistory] = useState<{ imageUrl: string; timestamp: number; tool: string }[]>([]);
  const [editModels, setEditModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('auto');
  const [upscaleModels, setUpscaleModels] = useState<ModelInfo[]>([]);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [autoCaption, setAutoCaption] = useState<string | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [autoModelReason, setAutoModelReason] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [allowNsfw, setAllowNsfw] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<{ label: string; prompt: string; tool: string }[]>(() => {
    try {
      const saved = localStorage.getItem('ai_tools_saved_prompts');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [customPromptOverride, setCustomPromptOverride] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Tool Specific States
  const [morphValue, setMorphValue] = useState<number>(0); // -100 to 100
  const [muscleLevel, setMuscleLevel] = useState<'lean' | 'athletic' | 'bodybuilder'>('lean');
  const [teleportLoc, setTeleportLoc] = useState('Paris, Eiffel Tower');
  const [teleportPreset, setTeleportPreset] = useState('Paris, Eiffel Tower');
  const [inkDesc, setInkDesc] = useState('');
  const [inkPlacement, setInkPlacement] = useState('Left Arm');
  const [canvasDir, setCanvasDir] = useState('Extend Downward');
  const [showInkSuggestions, setShowInkSuggestions] = useState(false);

  // Face Swap specific state
  const [faceSwapFaceImage, setFaceSwapFaceImage] = useState<string | null>(null);
  const faceFileInputRef = useRef<HTMLInputElement>(null);

  // Camera Angles specific state
  const [angleSourceImage, setAngleSourceImage] = useState<string | null>(null);
  const [angleSourceImageName, setAngleSourceImageName] = useState<string | null>(null);
  const [angleSourceType, setAngleSourceType] = useState<'persona' | 'custom'>('custom');
  const angleFileInputRef = useRef<HTMLInputElement>(null);
  const [angleHorizontal, setAngleHorizontal] = useState(1);
  const [angleVertical, setAngleVertical] = useState(2);
  const [angleDistance, setAngleDistance] = useState(1);
  const [angleModel, setAngleModel] = useState('angle-qwen-multiple');
  const [angleResult, setAngleResult] = useState<{ imageUrl: string; model: string } | null>(null);
  const [angleGenerating, setAngleGenerating] = useState(false);
  const [angleSaved, setAngleSaved] = useState(false);

  // Virtual Try-On specific state
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [garmentDescription, setGarmentDescription] = useState('');
  const garmentFileInputRef = useRef<HTMLInputElement>(null);

  // Video Editor specific state
  const [sourceVideo, setSourceVideo] = useState<string | null>(null);
  const [sourceVideoName, setSourceVideoName] = useState<string | null>(null);
  const [videoModels, setVideoModels] = useState<ModelInfo[]>([]);
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>('');
  const [editStrength, setEditStrength] = useState<number>(0.7);
  const [videoPrompt, setVideoPrompt] = useState<string>('');
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Voice Studio & Talking Head overlays
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const [showTalkingHead, setShowTalkingHead] = useState(false);
  const [showStoryChain, setShowStoryChain] = useState(false);
  const [showHeadshot, setShowHeadshot] = useState(false);
  const [showTimeMachine, setShowTimeMachine] = useState(false);
  const [showHairstyle, setShowHairstyle] = useState(false);
  const [showMotionControl, setShowMotionControl] = useState(false);
  const [showVirtualTryOn, setShowVirtualTryOn] = useState(false);
  const [talkingHeadAudio, setTalkingHeadAudio] = useState<string | undefined>(undefined);
  const [talkingHeadScript, setTalkingHeadScript] = useState<string | undefined>(undefined);

  // Paint Masking States
  const [paintMaskEnabled, setPaintMaskEnabled] = useState(false);
  const [brushSize, setBrushSize] = useState(25);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [showBrushCursor, setShowBrushCursor] = useState(false);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const lastX = useRef(0);
  const lastY = useRef(0);

  const updateCanvasSize = useCallback(() => {
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    if (sourceImage && paintMaskEnabled) {
      const timer = setTimeout(() => {
        updateCanvasSize();
      }, 100);
      window.addEventListener('resize', updateCanvasSize);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateCanvasSize);
      };
    } else {
      setPaintMaskEnabled(false);
    }
  }, [sourceImage, paintMaskEnabled, updateCanvasSize]);

  useEffect(() => {
    const canvas = maskCanvasRef.current;
    if (canvas && canvasSize.width && canvasSize.height) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        setCanvasHistory([canvas.toDataURL()]);
      }
    }
  }, [canvasSize]);

  const getEventCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const coords = getEventCoords(e, canvas);
    lastX.current = coords.x;
    lastY.current = coords.y;

    ctx.beginPath();
    ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.globalCompositeOperation = 'source-over';
    ctx.fill();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getEventCoords(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastX.current, lastY.current);
    ctx.lineTo(coords.x, coords.y);
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.globalCompositeOperation = 'source-over';
    ctx.stroke();

    lastX.current = coords.x;
    lastY.current = coords.y;
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = maskCanvasRef.current;
    if (canvas) {
      setCanvasHistory(prev => [...prev.slice(-19), canvas.toDataURL()]);
    }
  };

  const handleUndo = () => {
    if (canvasHistory.length <= 1) return;
    const prevHistory = canvasHistory.slice(0, -1);
    setCanvasHistory(prevHistory);
    const lastState = prevHistory[prevHistory.length - 1];

    const canvas = maskCanvasRef.current;
    if (canvas && lastState) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.globalCompositeOperation = 'source-over';
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = lastState;
      }
    }
  };

  const handleClearMask = () => {
    const canvas = maskCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setCanvasHistory([canvas.toDataURL()]);
      }
    }
  };

  const generateOpenAIMask = (): string | null => {
    const visibleCanvas = maskCanvasRef.current;
    if (!visibleCanvas) return null;
    const offscreen = document.createElement('canvas');
    offscreen.width = visibleCanvas.width;
    offscreen.height = visibleCanvas.height;
    const octx = offscreen.getContext('2d');
    if (!octx) return null;
    octx.fillStyle = '#000000';
    octx.fillRect(0, 0, offscreen.width, offscreen.height);
    octx.globalCompositeOperation = 'destination-out';
    octx.drawImage(visibleCanvas, 0, 0);
    return offscreen.toDataURL('image/png');
  };

  useEffect(() => {
    fetchEditModels().then(models => {
      setEditModels(models);
    });
    fetchUpscaleModels().then(models => {
      setUpscaleModels(models);
    });
    fetchVideoModels().then(models => {
      const v2vModels = models.filter(m => m.id.startsWith('wavespeed-v2v:'));
      setVideoModels(v2vModels);
      if (v2vModels.length > 0) {
        setSelectedVideoModel(v2vModels[0].id);
      }
    });
  }, []);

  // Keyboard shortcuts: ⌘Enter to execute, Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (e.key === 'Escape' && activeTool) {
        setActiveTool(null);
        setSourceImage(null);
        setResultImage(null);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && activeTool && sourceImage && !isProcessing) {
        e.preventDefault();
        handleExecute();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTool, sourceImage, isProcessing]);

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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const b64 = await processImageFile(file);
      setSourceImage(b64);
      setResultImage(null);
    } catch {
      toast.error('Failed to process dropped image');
    }
  };

  const getToolPrompt = () => {
    switch (activeTool) {
      case 'beautify': return 'Natural beauty refinement. Subtly soften the skin texture to remove blemishes and soften under-eye areas. Gently refine the nose contour for a polished look. CRITICAL: Maintain 100% of the original facial structure, bone structure, and identity. Do NOT change the shape of the eyes, lips, or overall face. Keep the person EXACTLY the same, just with a clean skin polish.';
      case 'morph': {
        const pct = Math.abs(morphValue);
        let weightDesc = '';
        if (morphValue < 0) {
          if (pct >= 80) weightDesc = `extremely thin, ultra-slender, very slim, with curves such as breasts and buttocks shrinking proportionately to an ultra-thin frame (${pct}% weight reduction)`;
          else if (pct >= 60) weightDesc = `significantly thinner, very slender, highly athletic frame (${pct}% weight reduction)`;
          else if (pct >= 30) weightDesc = `noticeably thinner, leaner, and slimmer frame (${pct}% weight reduction)`;
          else weightDesc = `slightly thinner and more slender frame (${pct}% weight reduction)`;
          return `Photorealistic edit, identical subject face, alter body composition to appear ${weightDesc}, maintaining original outfits and background perfectly.`;
        }
        if (morphValue > 0) {
          if (pct >= 80) weightDesc = `extremely fuller, exceptionally thicker, heavily curvy, with curves such as breasts and buttocks increasing proportionately to an ultra-thick frame (${pct}% weight increase)`;
          else if (pct >= 60) weightDesc = `significantly fuller, much thicker, curvy, and heavier frame (${pct}% weight increase)`;
          else if (pct >= 30) weightDesc = `noticeably fuller, thicker, and more voluptuous frame (${pct}% weight increase)`;
          else weightDesc = `slightly fuller and thicker frame (${pct}% weight increase)`;
          return `Photorealistic edit, identical subject face, alter body composition to appear ${weightDesc}, maintaining original outfits and background perfectly.`;
        }
        return 'Slight upscale, minimal change.';
      }
      case 'muscle':
        if (muscleLevel === 'lean') return 'Photorealistic edit, identical subject face, enhance baseline muscle definition slightly, lean athletic tone, light vascularity.';
        if (muscleLevel === 'athletic') return 'Photorealistic edit, identical subject face, strong athletic physique, high muscle definition, moderate vascularity, shredded appearance.';
        return 'Photorealistic edit, identical subject face, massive bodybuilder physique, extreme muscle mass and peak vascularity.';
      case 'ink': return `Photorealistic edit, identical subject face. Apply a highly detailed tattoo matching description: "${inkDesc}" to the subject's ${inkPlacement}. The tattoo should wrap naturally with the skin topology and lighting.`;
      case 'teleport': return `Photorealistic edit, identical subject face and outfit. Flawlessly replace the background to match exact location: "${teleportLoc}". Perfect composite lighting, shadows must match the new realistic environment.`;
      case 'canvas': {
        if (canvasDir === 'Expand All Sides (Zoom Out)') {
          return 'Photorealistic edit, identical subject face and outfit. Zoom out and extend the scene in all directions by making the subject smaller in the center and drawing more of the surroundings.';
        }
        return `Photorealistic edit, identical subject face and outfit. Keep the original person completely intact. Outpaint and extend the image framing to match. Extend direction: ${canvasDir}. Make the original scene more distant and extend the background to match perfectly.`;
      }
      default: return '';
    }
  };

  const getAutoModel = (prompt: string) => {
    if (editModels.length === 0) return '';
    if (activeTool === 'canvas') {
      const briaExpand = editModels.find(m => m.id.includes('bria/expand'));
      setAutoModelReason('Bria Expand — specialized for outpainting & frame extension');
      return briaExpand?.id || 'wavespeed-edit:bria/expand';
    }
    
    const seedream45 = editModels.find(m => m.id.includes('seedream-v4.5/edit'));
    const editFallback = seedream45?.id || editModels.find(m => m.id.startsWith('wavespeed-edit:'))?.id || 'wavespeed-edit:bytedance/seedream-v4.5/edit';

    if (activeTool === 'morph' || activeTool === 'muscle' || activeTool === 'beautify' || activeTool === 'ink' || activeTool === 'teleport') {
      setAutoModelReason('Seedream v4.5 Edit — specialized instruction-based editor');
      return editFallback;
    }

    const fallbackNano = 'google:nano-banana-pro';
    const fallbackSeedream = editFallback;

    const nsfwKeywords = ['nsfw', 'uncensored', 'sexy', 'naked', 'bikini', 'lingerie', 'underwear', 'lewd', 'adult', 'erotic'];
    const isNsfw = allowNsfw || nsfwKeywords.some(k => prompt.toLowerCase().includes(k));

    if (isNsfw) {
      setAutoModelReason('Seedream v4.5 — uncensored model for creative content');
      return fallbackSeedream;
    }
    setAutoModelReason('Nano Banana Pro — best for identity-preserving edits');
    return fallbackNano;
  };

  const handleExecute = async () => {
    if (!sourceImage || !activeTool || (!selectedModel && selectedModel !== 'auto')) return;
    const prompt = getToolPrompt();
    const modelToUse = selectedModel === 'auto' ? getAutoModel(prompt) : selectedModel;
    if (!modelToUse) return;

    setIsProcessing(true);
    
    try {
      const maskImage = paintMaskEnabled ? (generateOpenAIMask() || undefined) : undefined;
      const data = await editImage(sourceImage, prompt, modelToUse, undefined, maskImage);
      setResultImage(data.imageUrl);
      setResultHistory(prev => [...prev, { imageUrl: data.imageUrl, timestamp: Date.now(), tool: activeTool || '' }]);
      // Generate auto-caption
      const caption = generatePersonaContent(persona, { day: 1, type: activeTool || '', hook: `${TOOLS.find(t => t.id === activeTool)?.title} transformation`, angle: prompt.slice(0, 60), cta: '' }, persona.platform || 'Instagram', 'Short Caption');
      setAutoCaption(caption);
      toast(t => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/10"><img src={data.imageUrl} className="w-full h-full object-cover" alt="" /></div>
          <div><p className="font-bold text-sm">{TOOLS.find(t2 => t2.id === activeTool)?.title} complete!</p><p className="text-xs text-gray-400">Caption generated • Ready to save</p></div>
        </div>
      ), { duration: 4000 });
    } catch (err: any) {
      const errorMsg = err.message || '';
      if (errorMsg.toLowerCase().includes('content filter') || errorMsg.toLowerCase().includes('nsfw')) {
        const uncensoredModel = editModels.find(m => m.nsfw);
        if (uncensoredModel) {
          toast('Sensitive content detected. Rerouting to uncensored model...', { icon: '⚠️', duration: 4000 });
          try {
            const retryData = await editImage(sourceImage, prompt, uncensoredModel.id);
            setResultImage(retryData.imageUrl);
            setResultHistory(prev => [...prev, { imageUrl: retryData.imageUrl, timestamp: Date.now(), tool: activeTool || '' }]);
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
      setResultHistory(prev => [...prev, { imageUrl: data.imageUrl, timestamp: Date.now(), tool: 'face-swap' }]);
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
      setResultHistory(prev => [...prev, { imageUrl: data.imageUrl, timestamp: Date.now(), tool: 'bg-remover' }]);
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
      setResultHistory(prev => [...prev, { imageUrl: data.imageUrl, timestamp: Date.now(), tool: 'virtual-tryon' }]);
      toast.success('Virtual try-on complete!');
    } catch (err: any) {
      toast.error(err.message || 'Try-on failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      return toast.error('Please upload a valid video file');
    }
    setSourceVideoName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSourceVideo(ev.target?.result as string);
      setResultImage(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleVideoEditExecute = async () => {
    if (!sourceVideo || !selectedVideoModel) return;
    setIsProcessing(true);
    try {
      const data = await api.images.generateVideo({
        prompt: videoPrompt || 'Stylize video',
        modelId: selectedVideoModel,
        sourceVideo: sourceVideo,
        strength: editStrength,
      });
      setResultImage(data.videoUrl);
      setResultHistory(prev => [...prev, { imageUrl: data.videoUrl, timestamp: Date.now(), tool: 'video-edit' }]);
      toast.success('Video edit complete!');
    } catch (err: any) {
      toast.error(err.message || 'Video editing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newItems: BatchItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newItems.push({
        id: `batch-${Math.random().toString(36).substring(2, 9)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'idle'
      });
    }
    setBatchItems(prev => [...prev, ...newItems]);
    e.target.value = '';
  };

  const handleBatchExecute = async () => {
    if (batchItems.length === 0 || isBatchProcessing) return;
    setIsBatchProcessing(true);
    
    const itemsToProcess = [...batchItems].filter(item => item.status === 'idle' || item.status === 'failed');
    
    setBatchItems(prev => prev.map(item => {
      if (item.status === 'idle' || item.status === 'failed') {
        return { ...item, status: 'processing', error: undefined };
      }
      return item;
    }));

    for (const item of itemsToProcess) {
      setBatchItems(prev => prev.map(x => x.id === item.id ? { ...x, status: 'processing' } : x));

      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(item.file);
        });

        let resultUrl = '';
        if (activeTool === 'upscaler') {
          const upscaleModel = upscaleModels[0]?.id || 'wavespeed-upscale:google-veo-4k';
          const res = await upscaleImage(base64Data, upscaleModel, batchUpscaleResolution);
          resultUrl = res.imageUrl;
        } else {
          const beautifyPrompt = `Natural skin refinement. Subtly soften skin texture to remove blemishes and soften under-eye areas. Enhance skin glow and radiance gently. Maintain 100% of the original facial structure, bone structure, and identity. Keep the person EXACTLY the same, just with a clean skin polish.`;
          const model = selectedModel === 'auto' ? 'google:nano-banana-pro' : selectedModel;
          const res = await editImage(base64Data, beautifyPrompt, model);
          resultUrl = res.imageUrl;
        }

        setBatchItems(prev => prev.map(x => x.id === item.id ? { ...x, status: 'done', resultUrl } : x));
      } catch (err: any) {
        console.error('Batch item execution error:', err);
        setBatchItems(prev => prev.map(x => x.id === item.id ? { ...x, status: 'failed', error: err.message || 'Error' } : x));
      }
    }
    
    setIsBatchProcessing(false);
    toast.success('Batch processing completed!');
  };

  const saveBatchToLibrary = async () => {
    const finishedItems = batchItems.filter(item => item.status === 'done' && item.resultUrl);
    if (finishedItems.length === 0) {
      toast.error('No successfully processed images to save.');
      return;
    }

    try {
      const newMediaEntries = finishedItems.map((item, idx) => ({
        id: `img-${Date.now()}-${idx}`,
        url: item.resultUrl!,
        prompt: activeTool === 'upscaler' ? 'Upscaled Image' : 'Skin Enhanced Image',
        timestamp: Date.now(),
        model: activeTool === 'upscaler' ? (upscaleModels[0]?.id || 'wavespeed-upscale:google-veo-4k') : selectedModel,
        mediaType: 'image' as const,
      }));

      const updatedPersona = {
        ...persona,
        visualLibrary: [...(persona.visualLibrary || []), ...newMediaEntries]
      };

      await api.updatePersonaInVault(updatedPersona);
      for (const media of newMediaEntries) {
        await api.images.create(persona.id, media);
      }
      toast.success(`Successfully saved ${finishedItems.length} images to Visual Library!`);
    } catch (err) {
      toast.error('Failed to save batch to library');
    }
  };

  const saveToLibrary = async () => {
    if (!resultImage) return;
    try {
      const isVideo = activeTool === 'video-edit';
      const media = {
        id: `${isVideo ? 'vid' : 'img'}-${Date.now()}`,
        url: resultImage,
        prompt: isVideo ? videoPrompt : getToolPrompt(),
        timestamp: Date.now(),
        model: isVideo ? selectedVideoModel : selectedModel,
        mediaType: isVideo ? ('video' as const) : ('image' as const),
      };
      
      const updatedPersona = { ...persona, visualLibrary: [...(persona.visualLibrary || []), media] };
      
      await api.updatePersonaInVault(updatedPersona);
      await api.images.create(persona.id, media);
      toast.success('Saved to Visual Library!');
    } catch (err) {
      toast.error('Failed to save to library');
    }
  };

  const handleAngleGenerate = async () => {
    const hasPersonaRef = persona && persona.id !== 'none' && persona.referenceImage;
    const resolvedSourceType = hasPersonaRef ? angleSourceType : 'custom';
    const sourceImg = resolvedSourceType === 'persona' ? (persona.referenceImage || null) : (angleSourceImage || null);
    if (!sourceImg) {
      toast.error(resolvedSourceType === 'persona' ? 'Selected persona has no reference image.' : 'Please upload a source image first.');
      return;
    }
    setAngleGenerating(true);
    setAngleResult(null);
    setAngleSaved(false);
    try {
      const data = await generateAngleImage({
        imageBase64: sourceImg,
        modelId: angleModel,
        horizontalAngle: String(angleHorizontal),
        verticalAngle: String(angleVertical),
        distance: String(angleDistance),
      });
      setAngleResult(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Angle generation failed.');
    } finally {
      setAngleGenerating(false);
    }
  };

  const handleSaveAngleImage = async () => {
    if (!angleResult?.imageUrl) return;
    try {
      const media = {
        id: `img-${Date.now()}`,
        url: angleResult.imageUrl,
        prompt: `Angle: H:${angleHorizontal} V:${angleVertical} D:${angleDistance}`,
        timestamp: Date.now(),
        model: angleResult.model,
        mediaType: 'image' as const,
      };
      
      const updatedPersona = { ...persona, visualLibrary: [...(persona.visualLibrary || []), media] };
      await api.updatePersonaInVault(updatedPersona);
      await api.images.create(persona.id, media);
      setAngleSaved(true);
      toast.success('Saved to Visual Library!');
    } catch (err) {
      toast.error('Failed to save to library');
    }
  };

  const renderAngleToolMode = () => {
    const hasPersonaRef = persona && persona.id !== 'none' && persona.referenceImage;
    const resolvedSourceType = hasPersonaRef ? angleSourceType : 'custom';
    const angleSourceImg = resolvedSourceType === 'persona' ? (persona.referenceImage || null) : (angleSourceImage || null);
    const angleModelInfo = ANGLE_MODELS.find(m => m.id === angleModel);

    const grid: (typeof HORIZONTAL_POSITIONS[0] | null)[][] = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    HORIZONTAL_POSITIONS.forEach(p => { grid[p.row][p.col] = p; });

    return (
      <div className="flex-1 flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar pb-20 bg-[var(--bg-base)]">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setActiveTool(null); setAngleSourceImage(null); setAngleSourceImageName(null); setAngleResult(null); }}
              className="p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-overlay)] transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-sky-500 flex items-center justify-center text-white">
                  <Camera size={16} />
               </div>
               <div>
                 <h2 className="text-sm font-bold text-white leading-tight">Camera Angles</h2>
                 <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Generate 9-angle identity sheets or adjust camera perspective.</p>
               </div>
            </div>
          </div>
        </div>

        <div className="p-6 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-6 items-start">
            {/* Left Controls */}
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] flex items-center gap-1.5">
                    <Upload className="w-3 h-3" /> Source Image
                  </label>
                  
                  {/* Segmented Source Type Selector */}
                  {persona && persona.id !== 'none' && persona.referenceImage && (
                    <div className="flex bg-[#0F1420]/60 p-0.5 rounded-lg border border-white/5">
                      <button
                        type="button"
                        onClick={() => setAngleSourceType('persona')}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black transition-all ${
                          angleSourceType === 'persona'
                            ? 'bg-gradient-to-r from-pink-600 to-orange-500 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Persona
                      </button>
                      <button
                        type="button"
                        onClick={() => setAngleSourceType('custom')}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black transition-all ${
                          angleSourceType === 'custom'
                            ? 'bg-gradient-to-r from-pink-600 to-orange-500 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Custom
                      </button>
                    </div>
                  )}
                </div>

                {angleSourceType === 'persona' && persona && persona.id !== 'none' && persona.referenceImage ? (
                  <div className="flex items-center gap-3 px-3 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl select-none">
                    <img src={persona.referenceImage} alt="" className="w-14 h-14 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{persona.name || 'Anonymous Persona'}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">Using current active persona's reference face</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div 
                      onClick={() => angleFileInputRef.current?.click()}
                      className="flex items-center gap-3 px-3 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl cursor-pointer hover:bg-[var(--bg-overlay)]/50 transition-colors"
                    >
                      {angleSourceImage ? (
                        <img src={angleSourceImage} alt="" className="w-14 h-14 rounded-lg object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-[var(--bg-overlay)] flex items-center justify-center">
                          <Upload className="w-5 h-5 text-[var(--text-tertiary)]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{angleSourceImageName || 'Upload custom image...'}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">Click to choose any image from files</p>
                      </div>
                      <input 
                        ref={angleFileInputRef}
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const b64 = await processImageFile(file);
                            setAngleSourceImage(b64);
                            setAngleSourceImageName(file.name);
                          } catch (err) {
                            toast.error('Failed to process image');
                          }
                        }} 
                      />
                    </div>
                    {angleSourceImage && (
                      <button 
                        onClick={() => { setAngleSourceImage(null); setAngleSourceImageName(null); }} 
                        className="text-[10px] text-rose-400/80 hover:text-rose-450 mt-1 pl-1 transition-colors block"
                      >
                        Remove custom image
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <Camera className="w-3 h-3" /> Camera Angle
                </label>
                <div className="bg-[var(--bg-elevated)]/60 border border-[var(--border-default)] rounded-2xl p-4 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-2">Horizontal Direction</p>
                    <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto">
                      {grid.map((row, ri) =>
                        row.map((cell, ci) => {
                          if (!cell) {
                            return (
                              <div key={`${ri}-${ci}`} className="h-12 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-[var(--bg-overlay)]/40 flex items-center justify-center">
                                  <Camera className="w-4 h-4 text-[var(--text-muted)]" />
                                </div>
                              </div>
                            );
                          }
                          const isActive = angleHorizontal === cell.id;
                          return (
                            <button
                              key={cell.id}
                              onClick={() => setAngleHorizontal(cell.id)}
                              className={`h-12 rounded-xl text-[10px] font-bold transition-all ${
                                isActive
                                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                                  : 'bg-[var(--bg-overlay)]/60 text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-white'
                              }`}
                            >
                              {cell.label}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-2">Vertical Elevation</p>
                    <div className="flex gap-1.5">
                      {VERTICAL_POSITIONS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setAngleVertical(p.id)}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${
                            angleVertical === p.id
                              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                              : 'bg-[var(--bg-overlay)]/60 text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-2">Shot Distance</p>
                    <div className="flex gap-1.5">
                      {DISTANCE_OPTIONS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setAngleDistance(p.id)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                            angleDistance === p.id
                              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                              : 'bg-[var(--bg-overlay)]/60 text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <Cpu className="w-3 h-3" /> Model
                </label>
                <div className="relative">
                  <select
                    value={angleModel}
                    onChange={e => setAngleModel(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none appearance-none pr-10"
                  >
                    {ANGLE_MODELS.map(m => {
                      const displayCost = billingInfo?.isCreator
                        ? `$${m.price.toFixed(3)}`
                        : `${Math.ceil(m.price * 100) * 2} credits`;
                      return (
                        <option key={m.id} value={m.id}>
                          {m.name} ({displayCost}){m.nsfw ? ' 🔞' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
                </div>
                {angleModelInfo?.nsfw && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    🔞 Uncensored — NSFW content enabled
                  </span>
                )}
              </div>

              <button
                onClick={handleAngleGenerate}
                disabled={angleGenerating || !angleSourceImg}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {angleGenerating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  : <><Camera className="w-4 h-4" /> Apply Camera Angle</>}
              </button>

              {!angleSourceImg && !angleGenerating && (
                <p className="text-center text-xs text-[var(--text-tertiary)]">Upload an image or set a persona reference image to get started</p>
              )}
            </div>

            {/* Right Output Column */}
            <div className="space-y-3 lg:sticky lg:top-4">
              <div className="aspect-square rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] overflow-hidden relative group">
                {angleGenerating ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
                    <p className="text-xs text-[var(--text-tertiary)] animate-pulse">Repositioning camera...</p>
                  </div>
                ) : angleResult?.imageUrl ? (
                  <>
                    <img src={angleResult.imageUrl} alt="Angle result" className="absolute inset-0 w-full h-full object-contain" />
                    <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {
                        const a = document.createElement('a');
                        a.href = angleResult.imageUrl;
                        a.download = `reangled_image_${Date.now()}.png`;
                        a.target = '_blank';
                        a.click();
                      }} className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-black/80" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg">
                      <span className="text-[10px] text-white font-medium">{angleResult.model}</span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Camera className="w-10 h-10 text-[var(--text-muted)] opacity-25" />
                    <p className="text-xs text-[var(--text-muted)]">Your reangled image will appear here</p>
                  </div>
                )}
              </div>

              {angleResult && !angleGenerating && (
                <button onClick={handleSaveAngleImage} disabled={angleSaved} className="w-full py-2.5 rounded-xl text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                  {angleSaved ? <><Check className="w-4 h-4" /> Saved!</> : <><CheckCircle2 className="w-4 h-4" /> Save to Library</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (activeTool === 'camera-angles') {
    return renderAngleToolMode();
  }

  if (!activeTool) {
    return (
      <>
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20 px-6 lg:px-12 py-8 bg-[var(--bg-base)]">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight"><span className="gradient-text">AI Toolbox</span></h1>
              <p className="text-[var(--text-tertiary)] text-sm mt-1.5 font-medium">Unified AI content generation and image editing suite for your personas</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Core Editor Tools */}
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id as ToolType)}
                  className="group relative flex flex-col rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--accent-primary)] transition-all overflow-hidden text-left shadow-lg hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="relative h-48 w-full flex bg-black overflow-hidden shrink-0">
                    {/* Before Image */}
                    <div className="relative w-1/2 h-full border-r border-white/20 overflow-hidden">
                      {tool.demoBefore.endsWith('.mp4') ? (
                        <video src={tool.demoBefore} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                      ) : (
                        <img src={tool.demoBefore} alt="Before" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                      )}
                      <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-black text-white uppercase tracking-widest shadow-md border border-white/10">Before</div>
                    </div>
                    {/* After Image */}
                    <div className="relative w-1/2 h-full overflow-hidden">
                      {tool.demoAfter.endsWith('.mp4') ? (
                        <video src={tool.demoAfter} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                      ) : (
                        <img src={tool.demoAfter} alt="After" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                      )}
                      <div className="absolute top-3 right-3 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-blue-600 backdrop-blur-md rounded text-[8px] font-black text-white uppercase tracking-widest shadow-xl border border-white/20">After</div>
                    </div>
                    
                    {/* Lightning Separator */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center z-10 shadow-2xl group-hover:rotate-180 transition-transform duration-700 text-white group-hover:text-[var(--accent-primary)]">
                       <Wand2 size={14} />
                    </div>
                  </div>
                  
                  <div className="p-5 relative flex-1 flex flex-col justify-center">
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-10 rounded-bl-full transition-opacity`} />
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white shadow-lg shadow-black/20 shrink-0`}>
                        <Icon size={20} />
                      </div>
                      <h3 className="text-base font-black text-[var(--text-primary)] tracking-tight">{tool.title}</h3>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">{tool.desc}</p>
                  </div>
                </button>
              );
            })}

            {/* Voice Studio */}
            <button
              onClick={() => setShowVoiceStudio(true)}
              className="group relative flex flex-col rounded-3xl bg-[var(--bg-elevated)] border border-cyan-500/20 hover:border-cyan-500/50 transition-all overflow-hidden text-left shadow-lg hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="relative h-48 w-full bg-black overflow-hidden">
                <img src="/demo/voice_studio_hero.png" alt="Voice Studio" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                    <Mic size={20} />
                  </div>
                  <h3 className="text-base font-black text-[var(--text-primary)] tracking-tight">Voice Studio</h3>
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest">Free</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">AI Text-to-Speech script generator & multi-engine cloner.</p>
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
              <div className="p-5 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
                    <Video size={20} />
                  </div>
                  <h3 className="text-base font-black text-[var(--text-primary)] tracking-tight">Talking Head</h3>
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest">AI Video</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">Animate any portrait image with perfectly lip-synced audio.</p>
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
              <div className="p-5 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                    <Video size={20} />
                  </div>
                  <h3 className="text-base font-black text-[var(--text-primary)] tracking-tight">Story Chain</h3>
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest">New</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">Generate sequential images with consistent identity.</p>
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
              <div className="p-5 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Camera size={20} />
                  </div>
                  <h3 className="text-base font-black text-[var(--text-primary)] tracking-tight">Pro Headshot</h3>
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-widest">New</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">Professional studio headshots for business & social media.</p>
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
              <div className="p-5 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                    <Settings2 size={20} />
                  </div>
                  <h3 className="text-base font-black text-[var(--text-primary)] tracking-tight">Time Machine</h3>
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-widest">Fun</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">Travel through 14 eras — 1920s to Cyberpunk 2077.</p>
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
              <div className="p-5 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
                    <Sparkles size={20} />
                  </div>
                  <h3 className="text-base font-black text-[var(--text-primary)] tracking-tight">Hairstyle Try-On</h3>
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase tracking-widest">New</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">Preview 144 haircut & color combos instantly.</p>
              </div>
            </button>

            {/* Motion Control */}
            <button
              onClick={() => setShowMotionControl(true)}
              className="group relative flex flex-col rounded-3xl bg-[var(--bg-elevated)] border border-violet-500/20 hover:border-violet-500/50 transition-all overflow-hidden text-left shadow-lg hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="relative h-48 w-full bg-black overflow-hidden">
                <img src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80" alt="Motion Control" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
                    <Video size={20} />
                  </div>
                  <h3 className="text-base font-black text-[var(--text-primary)] tracking-tight">Motion Control</h3>
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-widest">AI Video</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">Replicate any movement or dance from video templates.</p>
              </div>
            </button>

            {/* Virtual Try-On */}
            <button
              onClick={() => setShowVirtualTryOn(true)}
              className="group relative flex flex-col rounded-3xl bg-[var(--bg-elevated)] border border-rose-500/20 hover:border-rose-500/50 transition-all overflow-hidden text-left shadow-lg hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="relative h-48 w-full bg-black overflow-hidden">
                <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80" alt="Virtual Try-On" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                    <Shirt size={20} />
                  </div>
                  <h3 className="text-base font-black text-[var(--text-primary)] tracking-tight">Virtual Try-On</h3>
                  <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-widest">Fashion AI</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">Dress your persona in any outfit instantly.</p>
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
      {showMotionControl && (
        <MotionControlStudio persona={persona} isOpen={showMotionControl} onClose={() => setShowMotionControl(false)} />
      )}
      {showVirtualTryOn && (
        <VirtualTryOnModal persona={persona} onClose={() => setShowVirtualTryOn(false)} />
      )}
    </>
    );
  }

  const currentToolDetails = TOOLS.find(t => t.id === activeTool);
  const ToolIcon = currentToolDetails?.icon || (activeTool === 'face-swap' ? ArrowLeftRight : Sparkles);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar pb-20 bg-[var(--bg-base)]">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setActiveTool(null); setSourceImage(null); setSourceVideo(null); setSourceVideoName(null); setResultImage(null); }}
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
        
        {activeTool === 'video-edit' ? (
          videoModels.length > 0 && (
            <div className="flex items-center gap-2">
              <Settings2 size={14} className="text-[var(--text-tertiary)]" />
              <select 
                value={selectedVideoModel}
                onChange={(e) => setSelectedVideoModel(e.target.value)}
                className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] outline-none cursor-pointer"
              >
                {videoModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )
        ) : editModels.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newVal = !allowNsfw;
                setAllowNsfw(newVal);
                toast.success(newVal ? 'Uncensored content generation enabled!' : 'Safety filter enabled.');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                allowNsfw 
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400' 
                  : 'bg-zinc-800/40 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Toggle safety content filter for image edits"
            >
              <Shield size={12} className={allowNsfw ? 'text-rose-400' : 'text-zinc-400'} />
              {allowNsfw ? '🔞 Uncensored' : '🛡️ Safe Mode'}
            </button>
            <Settings2 size={14} className="text-[var(--text-tertiary)]" />
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] outline-none cursor-pointer"
            >
              <option value="auto">✨ Automatic (Best AI for Tool)</option>
              {editModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {selectedModel === 'auto' && autoModelReason && (
              <div className="flex items-center gap-1.5 mt-1">
                <Zap size={10} className="text-amber-400" />
                <span className="text-[9px] text-amber-400/80 font-medium">{autoModelReason}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {activeTool === 'skin-enhancer' || activeTool === 'upscaler' ? (
          <>
            {/* BATCH SIDEBAR */}
            <div className="w-full lg:w-80 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Batch Options</h3>
                  
                  {activeTool === 'skin-enhancer' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[11px] font-bold text-[var(--text-secondary)]">
                        <span>Enhancement Strength</span>
                        <span className="text-[var(--accent-primary)] font-mono">{Math.round(batchEnhancementStrength * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="1.0" 
                        step="0.05" 
                        value={batchEnhancementStrength} 
                        onChange={(e) => setBatchEnhancementStrength(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
                      />
                      <p className="text-[9px] text-[var(--text-muted)] leading-relaxed">Adjusts how strongly blemishes are softened and texture is smoothed.</p>
                    </div>
                  )}

                  {activeTool === 'upscaler' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-tertiary)]">Target Upscale Quality</label>
                      <select 
                        value={batchUpscaleResolution} 
                        onChange={(e) => setBatchUpscaleResolution(e.target.value)}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="2k">🖥️ 2K Resolution (High Definition)</option>
                        <option value="4k">📺 4K Resolution (Ultra High Definition)</option>
                      </select>
                      <p className="text-[9px] text-[var(--text-muted)] leading-relaxed">4K upscaling uses high-fidelity neural networks to reconstruct details.</p>
                    </div>
                  )}
                </div>

                {batchItems.length > 0 && (
                  <div className="pt-4 border-t border-white/5 space-y-3">
                    <div className="flex justify-between text-[11px] font-bold text-[var(--text-secondary)]">
                      <span>Total Files:</span>
                      <span className="text-white font-mono">{batchItems.length}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-[var(--text-secondary)]">
                      <span>Processed:</span>
                      <span className="text-white font-mono">
                        {batchItems.filter(item => item.status === 'done').length} / {batchItems.length}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        batchItems.forEach(item => URL.revokeObjectURL(item.previewUrl));
                        setBatchItems([]);
                      }}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10"
                    >
                      Clear Queue
                    </button>
                  </div>
                )}
              </div>

              {/* FOOTER ACTIONS */}
              <div className="shrink-0 p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-2">
                <button
                  onClick={handleBatchExecute}
                  disabled={batchItems.length === 0 || isBatchProcessing}
                  className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    batchItems.length === 0 || isBatchProcessing
                      ? 'bg-white/5 text-white/30 cursor-not-allowed border border-transparent'
                      : `bg-gradient-to-r ${currentToolDetails?.color} hover:brightness-110 text-white hover:scale-[1.01] shadow-lg shadow-black/20`
                  }`}
                >
                  {isBatchProcessing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {isBatchProcessing ? 'Batch Processing...' : `Process Batch (${batchItems.length})`}
                </button>

                {batchItems.some(item => item.status === 'done') && (
                  <button
                    onClick={saveBatchToLibrary}
                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Camera size={14} />
                    Save Finished to Library
                  </button>
                )}
              </div>
            </div>

            {/* BATCH VIEWPORT */}
            <div className="flex-1 bg-black overflow-hidden relative flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {batchItems.length === 0 ? (
                  <div 
                    onClick={() => batchFileInputRef.current?.click()}
                    className="h-full border-2 border-dashed border-white/10 hover:border-[var(--accent-primary)]/40 rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-white/[0.01] hover:bg-white/[0.02] transition-all cursor-pointer relative min-h-[300px]"
                  >
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      ref={batchFileInputRef} 
                      onChange={handleBatchFileSelect}
                      className="hidden" 
                    />
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400 mb-4 border border-white/5">
                      <Upload size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Upload Batch Images</h3>
                    <p className="text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed mb-1">
                      Drag and drop multiple low-resolution or portrait images here, or click to browse.
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold">Supports PNG, JPG, WebP — as many images as you want</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Batch Processing Queue</h3>
                      <span className="text-xs text-[var(--text-muted)]">Completed images can be saved directly to vault</span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {batchItems.map((item) => (
                        <div 
                          key={item.id} 
                          className={`group relative rounded-2xl overflow-hidden border bg-[var(--bg-elevated)] flex flex-col transition-all duration-300 ${
                            item.status === 'processing' ? 'border-violet-500/50 shadow-lg shadow-violet-500/5' :
                            item.status === 'done' ? 'border-emerald-500/50' :
                            item.status === 'failed' ? 'border-rose-500/50' : 'border-white/5'
                          }`}
                        >
                          <div className="relative aspect-square w-full bg-black/45 overflow-hidden">
                            <img 
                              src={item.status === 'done' && item.resultUrl ? item.resultUrl : item.previewUrl} 
                              alt="Preview" 
                              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" 
                            />
                            
                            {item.status === 'processing' && (
                              <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                                <Loader2 size={24} className="animate-spin text-violet-400" />
                                <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">Processing</span>
                              </div>
                            )}
                            
                            {item.status === 'done' && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500/90 flex items-center justify-center text-white shadow border border-emerald-400/20">
                                <CheckCircle2 size={14} />
                              </div>
                            )}
                            
                            {item.status === 'failed' && (
                              <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-3 text-center gap-1.5">
                                <AlertTriangle size={20} className="text-rose-400" />
                                <span className="text-[8px] font-bold text-rose-300 leading-tight truncate max-w-full">
                                  {item.error || 'Failed'}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="p-2.5 flex items-center justify-between gap-2 border-t border-white/5">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold text-zinc-300 truncate leading-none mb-1">{item.file.name}</p>
                              <p className="text-[8px] font-mono text-zinc-500 font-bold leading-none">
                                {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                            {item.status === 'idle' && !isBatchProcessing && (
                              <button 
                                onClick={() => {
                                  URL.revokeObjectURL(item.previewUrl);
                                  setBatchItems(prev => prev.filter(x => x.id !== item.id));
                                }}
                                className="p-1 rounded bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 transition-colors"
                              >
                                  <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Editor sidebar */}
            <div className="w-full lg:w-80 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Source Image/Video Panel */}
            {activeTool === 'video-edit' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Target Video</label>
                {sourceVideo ? (
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-[var(--border-default)] group bg-black/40">
                    <video src={sourceVideo} className="w-full h-full object-cover" muted playsInline />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                       <button onClick={() => { setSourceVideo(null); setSourceVideoName(null); setResultImage(null); }} className="p-2 bg-rose-500 rounded-full text-white"><X size={16}/></button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full aspect-square rounded-2xl border-2 border-dashed border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer"
                  >
                    <Upload size={24} />
                    <span className="text-xs font-bold">Upload Video</span>
                    <span className="text-[10px] text-[var(--text-muted)]">MP4, MOV, WebM supported</span>
                  </div>
                )}
                <input type="file" ref={videoInputRef} hidden accept="video/*" onChange={handleVideoUpload} />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Target Image</label>
                {sourceImage ? (
                  <div className="relative aspect-square rounded-2xl overflow-hidden border border-[var(--border-default)] group">
                    <img src={sourceImage} alt="Source" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                       <button onClick={() => { setSourceImage(null); setResultImage(null); }} className="p-2 bg-rose-500 rounded-full text-white"><X size={16}/></button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                      isDragging
                        ? 'border-[#00D4FF] bg-[#00D4FF]/10 text-[#00D4FF] scale-[1.02] shadow-[0_0_30px_rgba(0,212,255,0.15)]'
                        : 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5'
                    }`}
                  >
                    <Upload size={24} className={isDragging ? 'animate-bounce' : ''} />
                    <span className="text-xs font-bold">{isDragging ? 'Drop Image Here' : 'Upload or Drop Image'}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">PNG, JPG, WEBP supported</span>
                  </div>
                )}
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
              </div>
            )}

            {/* Masking Canvas Toggle */}
            {sourceImage && (activeTool === 'beautify' || activeTool === 'morph' || activeTool === 'muscle' || activeTool === 'ink' || activeTool === 'teleport') && (
              <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5"><PenTool size={14} className="text-cyan-400" /> Paint Mask</span>
                    <span className="text-[10px] text-[var(--text-muted)] block">Edit only selected areas</span>
                  </div>
                  <button
                    onClick={() => {
                      setPaintMaskEnabled(!paintMaskEnabled);
                      if (!paintMaskEnabled) {
                        setResultImage(null);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${paintMaskEnabled ? 'bg-cyan-500' : 'bg-white/10'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${paintMaskEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {paintMaskEnabled && (
                  <div className="space-y-4 pt-2 border-t border-white/5">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)]">
                        <span>Brush Size: {brushSize}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="100" 
                        value={brushSize} 
                        onChange={(e) => setBrushSize(parseInt(e.target.value))} 
                        className="w-full accent-cyan-400" 
                      />
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleUndo} 
                        disabled={canvasHistory.length <= 1}
                        className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] border border-white/10 transition-colors disabled:opacity-30"
                      >
                        Undo
                      </button>
                      <button 
                        onClick={handleClearMask}
                        className="flex-1 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[10px] border border-rose-500/20 transition-colors"
                      >
                        Clear Mask
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tool specific controls */}
            {activeTool === 'beautify' && (
              <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-300 text-sm">
                Automated precision workflow active. This tool will strictly optimize facial structure without damaging identity.
              </div>
            )}

            {/* Prompt Templates */}
            {activeTool !== 'video-edit' && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-1.5"><FileText size={12} className="text-violet-400" /> Prompt Templates</span>
                  <span className="text-[8px]">{showTemplates ? '▲' : '▼'}</span>
                </button>
                {showTemplates && (
                  <div className="space-y-1.5">
                    {[
                      { label: '📸 Instagram Glow-Up', prompt: 'Enhance skin for an Instagram-ready glow. Soft studio lighting, flawless complexion, dewy finish. Keep the face exactly the same.' },
                      { label: '🎬 TikTok Energy', prompt: 'Add vibrant, high-energy look. Bright colors, sharp contrast, youthful glow. Maintain all facial features identically.' },
                      { label: '💼 Professional LinkedIn', prompt: 'Clean, corporate headshot refinement. Subtle skin smoothing, professional lighting. No feature changes.' },
                      { label: '✨ Red Carpet Ready', prompt: 'Glamorous red carpet enhancement. Flawless skin, soft contouring highlights. Preserve exact bone structure and identity.' },
                      { label: '🌿 Natural & Minimal', prompt: 'Minimal, barely-there enhancement. Just remove blemishes and even skin tone. Keep everything else 100% natural.' },
                    ].map((tmpl, i) => (
                      <button
                        key={i}
                        onClick={() => setCustomPromptOverride(tmpl.prompt)}
                        className="w-full text-left p-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20 transition-all"
                      >
                        <span className="text-xs font-bold text-white block">{tmpl.label}</span>
                        <span className="text-[10px] text-[var(--text-muted)] line-clamp-1 mt-0.5">{tmpl.prompt}</span>
                      </button>
                    ))}
                    {savedPrompts.length > 0 && (
                      <>
                        <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider pt-2 border-t border-[var(--border-subtle)]">Your Saved Prompts</div>
                        {savedPrompts.map((sp, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <button
                              onClick={() => setCustomPromptOverride(sp.prompt)}
                              className="flex-1 text-left p-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-all"
                            >
                              <span className="text-xs font-bold text-white block">💾 {sp.label}</span>
                              <span className="text-[10px] text-[var(--text-muted)] line-clamp-1 mt-0.5">{sp.prompt}</span>
                            </button>
                            <button
                              onClick={() => {
                                const next = savedPrompts.filter((_, j) => j !== i);
                                setSavedPrompts(next);
                                localStorage.setItem('ai_tools_saved_prompts', JSON.stringify(next));
                              }}
                              className="p-1.5 rounded-lg text-rose-400/50 hover:text-rose-400 transition-colors shrink-0"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                    <button
                      onClick={() => {
                        const currentPrompt = customPromptOverride || getToolPrompt();
                        const label = currentPrompt.slice(0, 30) + '...';
                        const next = [...savedPrompts, { label, prompt: currentPrompt, tool: activeTool || '' }];
                        setSavedPrompts(next);
                        localStorage.setItem('ai_tools_saved_prompts', JSON.stringify(next));
                        toast.success('Prompt saved!');
                      }}
                      className="w-full p-2 rounded-xl border border-dashed border-violet-500/30 text-[10px] font-bold text-violet-400 hover:bg-violet-500/10 transition-colors"
                    >
                      + Save Current Prompt
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Video Editor controls */}
            {activeTool === 'video-edit' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Styling Prompt</label>
                  <textarea
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder="e.g. Cartoon anime style, 3D animated model, vintage movie look..."
                    className="w-full h-24 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-3 text-sm text-white outline-none resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                    <span>Styling Strength: {Math.round(editStrength * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={editStrength * 100}
                    onChange={(e) => setEditStrength(parseInt(e.target.value) / 100)}
                    className="w-full accent-violet-500"
                  />
                  <p className="text-[9px] text-[var(--text-muted)] leading-relaxed">
                    Lower strength keeps the original video structure; higher strength transforms the video more aggressively.
                  </p>
                </div>
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
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Design Description</label>
                    <button 
                      onClick={() => setShowInkSuggestions(!showInkSuggestions)}
                      className="flex items-center gap-1 text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors bg-violet-500/10 hover:bg-violet-500/20 px-2 py-0.5 rounded-full border border-violet-500/20"
                    >
                      <Sparkles size={11} /> 
                      {showInkSuggestions ? 'Hide Ideas' : 'View Ideas'}
                    </button>
                  </div>
                  <textarea 
                    value={inkDesc} 
                    onChange={(e) => setInkDesc(e.target.value)} 
                    placeholder="e.g. Neo-traditional rose with dagger..." 
                    className="w-full h-24 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-3 text-sm text-white outline-none resize-none" 
                  />

                  {showInkSuggestions && (
                    <div className="mt-3 bg-[var(--bg-surface)] border border-[var(--border-default)] p-3 rounded-xl space-y-3 shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white">Visual Tattoo Styles</span>
                        <span className="text-[10px] text-[var(--text-muted)]">Click any style to apply</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { title: 'Neo-Traditional Rose', desc: 'Bold, dark linework with deep color saturation and dynamic shading of a blooming rose', icon: '🌹' },
                          { title: 'Tribal Geometric', desc: 'Crisp black geometric and symmetrical tribal patterns with intricate sacred symbols', icon: '⚜️' },
                          { title: 'Japanese Dragon', desc: 'Classic Irezumi wind bars, a coiling dragon with scales and delicate cherry blossoms', icon: '🐉' },
                          { title: 'Fine Line Minimalist', desc: 'Delicate fine line minimalist black botanical stems and clean aesthetic script', icon: '🌿' },
                          { title: 'Black & Grey Portrait', desc: 'Highly detailed, photorealistic black and grey portrait with cinematic contrast', icon: '🗿' },
                          { title: 'Traditional Dagger', desc: 'Bold old-school American traditional dagger with vibrant reds and stark black shading', icon: '🗡️' }
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setInkDesc(`${item.title}: ${item.desc}`);
                              setShowInkSuggestions(false);
                            }}
                            className="flex flex-col text-left bg-[var(--bg-elevated)] hover:bg-violet-500/10 border border-[var(--border-default)] hover:border-violet-500/40 rounded-lg p-2.5 transition-all gap-1 h-full select-none"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm bg-violet-500/20 w-6 h-6 rounded flex items-center justify-center">{item.icon}</span>
                              <span className="text-xs font-bold text-white leading-tight">{item.title}</span>
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)] leading-relaxed line-clamp-2 mt-0.5">{item.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTool === 'teleport' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Destination Preset</label>
                  <select 
                    value={teleportPreset} 
                    onChange={(e) => {
                      setTeleportPreset(e.target.value);
                      if (e.target.value !== 'Custom') {
                        setTeleportLoc(e.target.value);
                      } else {
                        setTeleportLoc('');
                      }
                    }} 
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-3 text-sm text-white outline-none"
                  >
                    <option>Paris, Eiffel Tower</option>
                    <option>New York, Times Square</option>
                    <option>Tokyo, Shibuya Crossing</option>
                    <option>Rome, Colosseum</option>
                    <option>London, Big Ben</option>
                    <option>Bali, Tropical Beach</option>
                    <option>Dubai, Burj Khalifa</option>
                    <option>Custom</option>
                  </select>
                </div>

                {teleportPreset === 'Custom' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Custom Destination</label>
                    <input 
                      type="text" 
                      value={teleportLoc} 
                      onChange={(e) => setTeleportLoc(e.target.value)} 
                      placeholder="e.g. Santorini, Greece" 
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-3 text-sm text-white outline-none" 
                    />
                  </div>
                )}
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
                activeTool === 'video-edit' ? handleVideoEditExecute :
                handleExecute
              }
              disabled={
                isProcessing ||
                (activeTool === 'video-edit' ? !sourceVideo : !sourceImage) ||
                (activeTool === 'face-swap' && !faceSwapFaceImage) ||
                (activeTool === 'virtual-tryon' && !garmentImage)
              }
              className={`w-full py-3.5 rounded-xl font-bold flex flex-col items-center justify-center transition-all shadow-lg ${
                isProcessing ||
                (activeTool === 'video-edit' ? !sourceVideo : !sourceImage) ||
                (activeTool === 'face-swap' && !faceSwapFaceImage) ||
                (activeTool === 'virtual-tryon' && !garmentImage)
                  ? 'bg-white/5 text-white/30 shadow-none cursor-not-allowed' 
                  : `bg-gradient-to-r ${currentToolDetails?.color} hover:brightness-110 text-white hover:scale-[1.01]`
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Processing...</div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <ToolIcon size={18} /> 
                    {activeTool === 'bg-remover' ? 'Remove Background' : activeTool === 'virtual-tryon' ? 'Try On ($0.12)' : activeTool === 'video-edit' ? 'Stylize Video' : 'Apply Effect'}
                  </div>
                  <span className="text-[9px] opacity-50 font-medium mt-0.5">⌘ Enter</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 bg-black overflow-hidden relative flex flex-col">
          <div className="relative flex-1 flex flex-col items-center justify-center p-6">
             {!(activeTool === 'video-edit' ? sourceVideo : sourceImage) && !resultImage && (
               <div className="text-[var(--text-tertiary)] flex flex-col items-center gap-4 opacity-50">
                  {activeTool === 'video-edit' ? <Video size={48} /> : <ImageIcon size={48} />}
                  <p>Upload a source {activeTool === 'video-edit' ? 'video' : 'image'} to begin editing</p>
               </div>
             )}
             
             {isProcessing && (activeTool === 'video-edit' ? sourceVideo : sourceImage) && !resultImage && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
                 <div className="flex flex-col items-center text-white drop-shadow-xl">
                   <Loader2 size={40} className="animate-spin text-violet-400 mb-4" />
                   <div className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-full font-bold">Applying AI Video Effects...</div>
                 </div>
               </div>
             )}

             {!(activeTool === 'video-edit') && sourceImage && !resultImage && !isProcessing && (
                <div className="relative max-w-3xl w-full h-full flex flex-col items-center justify-center gap-4">
                  <div 
                    className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[var(--bg-elevated)] flex items-center justify-center select-none"
                    style={{ 
                      width: canvasSize.width || 'auto', 
                      height: canvasSize.height || 'auto',
                      maxHeight: '65vh',
                      maxWidth: '100%'
                    }}
                  >
                    <img 
                      ref={imageRef}
                      src={sourceImage} 
                      alt="Source image to edit" 
                      className="max-h-[65vh] max-w-full object-contain pointer-events-none"
                      onLoad={updateCanvasSize}
                    />
                    
                    {paintMaskEnabled && canvasSize.width > 0 && (
                      <div 
                        className="absolute inset-0 z-40 overflow-hidden cursor-none"
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                        }}
                        onMouseEnter={() => setShowBrushCursor(true)}
                        onMouseLeave={() => {
                          setShowBrushCursor(false);
                          stopDrawing();
                        }}
                      >
                        <canvas
                          ref={maskCanvasRef}
                          width={canvasSize.width}
                          height={canvasSize.height}
                          className="absolute inset-0 opacity-80"
                          onMouseDown={startDrawing}
                          onMouseMove={(e) => {
                            draw(e);
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                          }}
                          onMouseUp={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />
                        
                        {showBrushCursor && (
                          <div
                            className="absolute border border-cyan-400 rounded-full pointer-events-none mix-blend-difference bg-cyan-400/20 z-50 animate-pulse"
                            style={{
                              width: brushSize,
                              height: brushSize,
                              left: mousePos.x - brushSize / 2,
                              top: mousePos.y - brushSize / 2,
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {paintMaskEnabled && (
                    <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <PenTool size={12} /> Paint mode active. Drag to paint regions to modify.
                    </p>
                  )}
                </div>
              )}

             {activeTool === 'video-edit' && sourceVideo && !resultImage && !isProcessing && (
                <div className="relative max-w-3xl w-full h-full flex flex-col items-center justify-center gap-4">
                  <div className="relative h-full w-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-[var(--bg-elevated)] flex items-center justify-center">
                    <video src={sourceVideo} controls className="max-h-[65vh] max-w-full object-contain" />
                  </div>
                </div>
              )}

             {resultImage && sourceImage && (
               <div className="relative max-w-3xl w-full h-full flex flex-col items-center justify-center gap-4">
                 <BeforeAfterSlider beforeImage={sourceImage} afterImage={resultImage} />
                 <div className="absolute bottom-4 z-30 flex gap-3">
                   <button onClick={() => setResultImage(null)} className="px-6 py-2.5 rounded-xl bg-black/80 hover:bg-black text-white font-bold backdrop-blur-xl border border-white/10 transition-colors">Discard</button>
                   {upscaleModels.length > 0 && (
                     <button
                       onClick={async () => {
                         if (!resultImage || isUpscaling) return;
                         setIsUpscaling(true);
                         try {
                           const data = await upscaleImage(resultImage, upscaleModels[0].id);
                           setResultImage(data.imageUrl);
                           setResultHistory(prev => [...prev, { imageUrl: data.imageUrl, timestamp: Date.now(), tool: '4k-enhance' }]);
                           toast.success('Image upscaled to 4K!');
                         } catch (err: any) {
                           toast.error(err.message || 'Upscale failed');
                         } finally {
                           setIsUpscaling(false);
                         }
                       }}
                       disabled={isUpscaling}
                       className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold backdrop-blur-xl border border-white/20 shadow-lg hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50"
                     >
                       {isUpscaling ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpCircle size={16} />} {isUpscaling ? 'Enhancing...' : '4K Enhance'}
                     </button>
                   )}
                   <button onClick={saveToLibrary} className={`px-6 py-2.5 rounded-xl bg-gradient-to-r ${currentToolDetails?.color} text-white font-bold backdrop-blur-xl border border-white/20 shadow-lg hover:scale-105 transition-transform flex items-center gap-2`}>
                     <Camera size={16} /> Save to Library
                   </button>
                 </div>
               </div>
             )}

             {resultImage && !sourceImage && (
               <div className="relative max-w-3xl w-full h-full flex flex-col items-center justify-center gap-4">
                 <div className="relative h-full w-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-[var(--bg-elevated)] flex items-center justify-center">
                   {activeTool === 'video-edit' ? (
                     <video src={resultImage} controls autoPlay loop className="max-w-full max-h-full object-contain" />
                   ) : (
                     <img src={resultImage} alt="Result" className="max-w-full max-h-full object-contain" />
                   )}
                 </div>
                 <div className="absolute bottom-4 flex gap-3">
                   <button onClick={() => setResultImage(null)} className="px-6 py-2.5 rounded-xl bg-black/80 hover:bg-black text-white font-bold backdrop-blur-xl border border-white/10 transition-colors">Discard</button>
                   {activeTool === 'video-edit' && (
                     <button
                       onClick={() => {
                         const a = document.createElement('a');
                         a.href = resultImage;
                         a.download = `stylized_video_${Date.now()}.mp4`;
                         a.target = '_blank';
                         a.click();
                       }}
                       className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold backdrop-blur-xl border border-white/10 transition-colors flex items-center gap-2"
                     >
                       Download
                     </button>
                   )}
                   {upscaleModels.length > 0 && activeTool !== 'video-edit' && (
                     <button
                       onClick={async () => {
                         if (!resultImage || isUpscaling) return;
                         setIsUpscaling(true);
                         try {
                           const data = await upscaleImage(resultImage, upscaleModels[0].id);
                           setResultImage(data.imageUrl);
                           setResultHistory(prev => [...prev, { imageUrl: data.imageUrl, timestamp: Date.now(), tool: '4k-enhance' }]);
                           toast.success('Image upscaled to 4K!');
                         } catch (err: any) {
                           toast.error(err.message || 'Upscale failed');
                         } finally {
                           setIsUpscaling(false);
                         }
                       }}
                       disabled={isUpscaling}
                       className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold backdrop-blur-xl border border-white/20 shadow-lg hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50"
                     >
                       {isUpscaling ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpCircle size={16} />} {isUpscaling ? 'Enhancing...' : '4K Enhance'}
                     </button>
                   )}
                   <button onClick={saveToLibrary} className={`px-6 py-2.5 rounded-xl bg-gradient-to-r ${currentToolDetails?.color} text-white font-bold backdrop-blur-xl border border-white/20 shadow-lg hover:scale-105 transition-transform flex items-center gap-2`}>
                     {activeTool === 'video-edit' ? <Video size={16} /> : <Camera size={16} />} Save to Library
                   </button>
                 </div>
               </div>
             )}
          </div>

          {/* Auto-Caption Panel */}
          {autoCaption && resultImage && (
            <div className="shrink-0 border-t border-white/10 bg-[#0d1117]/95 backdrop-blur-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <FileText size={12} className="text-violet-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Auto-Caption</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(autoCaption);
                      setCaptionCopied(true);
                      setTimeout(() => setCaptionCopied(false), 2000);
                      toast.success('Caption copied!');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-[10px] font-bold transition-colors border border-violet-500/20"
                  >
                    {captionCopied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                    {captionCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => setAutoCaption(null)}
                    className="p-1 rounded-lg text-white/30 hover:text-white/60 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-white/70 leading-relaxed line-clamp-3">{autoCaption}</p>
            </div>
          )}

          {/* Generation History Filmstrip */}
          {resultHistory.length > 0 && (
            <div className="shrink-0 border-t border-white/10 bg-[#0a0e17]/90 backdrop-blur-xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">History ({resultHistory.length})</span>
                <button
                  onClick={() => { setResultHistory([]); setResultImage(null); }}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider"
                >
                  Clear All
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {resultHistory.map((entry, idx) => (
                  <button
                    key={entry.timestamp}
                    onClick={() => setResultImage(entry.imageUrl)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
                      resultImage === entry.imageUrl
                        ? 'border-[#00D4FF] shadow-[0_0_12px_rgba(0,212,255,0.4)]'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img src={entry.imageUrl} alt={`Result ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    )}
  </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Virtual Try-On Modal
// ─────────────────────────────────────────────────────
function VirtualTryOnModal({ persona, onClose }: { persona: Persona; onClose: () => void }) {
  const [personImage, setPersonImage] = useState<string | null>(persona.referenceImage || null);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const personRef = React.useRef<HTMLInputElement>(null);
  const garmentRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setter(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!personImage || !garmentImage) { toast.error('Upload both a person photo and a garment photo'); return; }
    setIsGenerating(true);
    setResultImage(null);
    try {
      const result = await virtualTryOn(personImage, garmentImage);
      setResultImage(result.imageUrl);
      toast.success('Try-On complete!');
    } catch (err: any) {
      toast.error(err.message || 'Try-On failed. Check your API configuration.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-[var(--bg-base)] border border-rose-500/20 rounded-3xl overflow-hidden w-full max-w-2xl shadow-2xl shadow-rose-900/20">
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-pink-600 flex items-center justify-center text-white"><Shirt size={20} /></div>
              <div>
                <h2 className="text-xl font-bold text-white">Virtual Try-On</h2>
                <p className="text-xs text-[var(--text-tertiary)]">Upload person + garment to preview the look</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors"><X size={18} /></button>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block mb-2">Person / Reference Photo</label>
                <div onClick={() => personRef.current?.click()}
                  className="relative aspect-[3/4] rounded-2xl border-2 border-dashed border-rose-500/30 hover:border-rose-500/60 transition-colors cursor-pointer overflow-hidden bg-[var(--bg-elevated)] flex items-center justify-center">
                  {personImage ? <img src={personImage} className="w-full h-full object-cover" alt="Person" /> : (
                    <div className="text-center p-4"><Upload size={24} className="text-rose-400 mx-auto mb-2" /><p className="text-xs text-[var(--text-tertiary)]">Upload person photo</p></div>
                  )}
                  <input ref={personRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, setPersonImage)} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-pink-300 uppercase tracking-wider block mb-2">Garment / Outfit</label>
                <div onClick={() => garmentRef.current?.click()}
                  className="relative aspect-[3/4] rounded-2xl border-2 border-dashed border-pink-500/30 hover:border-pink-500/60 transition-colors cursor-pointer overflow-hidden bg-[var(--bg-elevated)] flex items-center justify-center">
                  {garmentImage ? <img src={garmentImage} className="w-full h-full object-cover" alt="Garment" /> : (
                    <div className="text-center p-4"><Shirt size={24} className="text-pink-400 mx-auto mb-2" /><p className="text-xs text-[var(--text-tertiary)]">Upload garment</p></div>
                  )}
                  <input ref={garmentRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, setGarmentImage)} />
                </div>
              </div>
            </div>
            {resultImage && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl overflow-hidden border border-rose-500/20">
                <img src={resultImage} className="w-full max-h-[280px] object-contain bg-black" alt="Try-On Result" />
                <div className="bg-[var(--bg-elevated)] p-3 flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-bold">✓ Try-On Complete</span>
                  <button onClick={() => { const a = document.createElement('a'); a.href = resultImage!; a.download = 'tryon_result.png'; a.click(); }}
                    className="text-xs font-bold text-white bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/30 px-3 py-1 rounded-lg transition-colors">Download</button>
                </div>
              </motion.div>
            )}
            <button onClick={handleGenerate} disabled={isGenerating || !personImage || !garmentImage}
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20">
              {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Generating…</> : <><Shirt size={16} /> Generate Try-On</>}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
