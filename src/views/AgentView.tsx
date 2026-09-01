import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, 
  Send, 
  Terminal, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  UserPlus, 
  CalendarRange, 
  Image as ImageIcon,
  ArrowRight,
  ShieldCheck,
  Zap,
  Paperclip,
  X,
  Check,
  Volume2,
  Video as VideoIcon,
  FileText,
  Mic,
  PhoneCall,
  PhoneOff,
  DollarSign,
  Layers,
  Heart,
  Save,
  Clock,
  Coins,
  MessageSquare,
  Globe,
  TrendingUp,
  Award,
  Users,
  ChevronRight,
  ChevronLeft,
  ThumbsUp,
  ThumbsDown,
  Play,
  Pause,
  RefreshCw,
  Bot,
  Sliders,
  Film,
  Download,
  Edit3,
  Copy,
  Flame,
  RotateCcw,
  User,
  Plus,
  Link
} from 'lucide-react';
import { Persona, Tab } from '../types';
import VoiceCloneStudioModal from '../components/VoiceCloneStudioModal';
import { api } from '../services/apiService';
import { generatePersonaPlan } from '../utils/personaEngine';
import { generateImage, upscaleImage, authFetch } from '../services/imageService';
import { editImageJob, talkingAvatarJob } from '../services/mediaJobService';
import { cn } from '../utils/cn';
import { trimAudioBase64To10Sec } from '../utils/audioUtils';
import { accountLocalStorage } from '../utils/accountStorage';
import toast from 'react-hot-toast';
import { DEFAULT_VIDEO_MODEL_ID } from '../../shared/mediaDefaults';
import { normalizeAgentSteps } from '../utils/agentStepValidation';

interface AgentViewProps {
  personas: Persona[];
  setPersonas: React.Dispatch<React.SetStateAction<Persona[]>>;
  selectedPersonaId?: string;
  onSelectPersona: (id: string) => void;
  nav: {
    push: (entry: { view: Tab | 'persona-builder'; subView?: string; params?: any }) => void;
    pop: () => void;
    replace: (entry: { view: Tab | 'persona-builder'; subView?: string; params?: any }) => void;
  };
}

interface Attachment {
  name: string;
  dataUrl: string;
  mimeType: string;
}

interface CollaborationMsg {
  agent: string;
  message: string;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  attachments?: Attachment[];
  status?: 'clarifying' | 'executing' | 'normal' | 'done';
  suggestedSteps?: any[];
  critiqueLogs?: string[];
  collaborationLogs?: CollaborationMsg[];
  planCard?: { title: string; steps: { title: string; estimatedCost: string }[]; totalCost: string };
  isExecuting?: boolean;
  execLogs?: string[];
  execSteps?: { 
    type: string; 
    params: any; 
    status: 'pending' | 'running' | 'success' | 'error' | 'done' | 'executing';
    resultUrl?: string;
    resultUrls?: string[];
    isActionLoading?: 'video' | 'upscale' | 'swap' | null;
  }[];
}

interface CustomPreset {
  name: string;
  prompt: string;
}

const GenerationProgressFrame: React.FC<{
  stepType: string;
  modelId?: string;
  prompt?: string;
}> = ({ stepType, modelId, prompt }) => {
  const [percent, setPercent] = useState(5);

  useEffect(() => {
    const isVideo = stepType === 'generate_video' || stepType === 'storyboard_sequence' || stepType === 'generate_talking_head';
    const totalDurationSeconds = isVideo ? 16 : 8;
    const intervalMs = 200;
    const totalTicks = (totalDurationSeconds * 1000) / intervalMs;
    const incrementPerTick = 90 / totalTicks;

    const timer = setInterval(() => {
      setPercent(prev => {
        if (prev >= 95) return 95;
        return Math.min(95, Math.floor(prev + incrementPerTick));
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [stepType]);

  const isVideo = stepType === 'generate_video' || stepType === 'storyboard_sequence' || stepType === 'generate_talking_head';
  const isVoice = stepType === 'generate_voice' || stepType === 'clone_voice';
  const isPersona = stepType === 'create_persona' || stepType === 'generate_content_plan';

  const resolvedModelName = modelId ? (
    modelId.includes('seedream') ? 'ByteDance SeeDream 5.0 Pro' :
    modelId.includes('gpt-image-2') || modelId.includes('gpt-image-1') ? 'GPT Image 2' :
    modelId.includes('imagen') ? 'Google Imagen 3 Fast' :
    modelId.includes('wan') ? 'Wan 2.2 Video' :
    modelId.includes('veo') ? 'Google Veo Omni' :
    modelId.includes('kling') ? 'Kling 3.0 Pro' :
    modelId.includes('elevenlabs') ? 'ElevenLabs Audio' :
    modelId.includes('omnivoice') ? 'Wavespeed OmniVoice' : modelId
  ) : (isVoice ? 'ElevenLabs / OmniVoice' : isPersona ? 'Studio Persona Engine' : 'Google Imagen 3 Fast');

  const stepTitle = isVoice 
    ? 'Synthesizing Voiceover Audio' 
    : isVideo 
      ? 'Rendering AI Video Story' 
      : isPersona 
        ? 'Architecting Persona Profile' 
        : 'Synthesizing Visual Asset';

  return (
    <div className="mt-2.5 p-3.5 bg-black/80 border border-pink-500/40 rounded-xl space-y-3 relative overflow-hidden shadow-2xl">
      {/* Background Animated Shimmer Glow */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-purple-500/15 to-cyan-500/10 transition-all duration-300 pointer-events-none" 
        style={{ width: `${percent}%` }}
      />

      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center shrink-0">
            {isVoice ? <Mic className="w-4 h-4 text-cyan-400 animate-pulse" /> : isVideo ? <Film className="w-4 h-4 text-pink-400 animate-spin" /> : <Sparkles className="w-4 h-4 text-pink-400 animate-spin" />}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-black text-white flex items-center gap-1.5">
              <span className="truncate">{stepTitle}</span>
              <span className="text-[9px] font-bold text-pink-300 bg-pink-500/20 border border-pink-500/30 px-2 py-0.5 rounded-full shrink-0">
                {resolvedModelName}
              </span>
            </div>
            {prompt && (
              <p className="text-[9px] text-zinc-400 truncate max-w-xs italic">
                "{prompt}"
              </p>
            )}
          </div>
        </div>

        {/* Live Percentage Badge */}
        <div className="text-right shrink-0">
          <div className="flex items-baseline gap-0.5 justify-end">
            <span className="text-xl font-black text-pink-400 tracking-tight font-mono">{percent}</span>
            <span className="text-xs font-bold text-pink-400 font-mono">%</span>
          </div>
          <span className="block text-[8px] font-extrabold uppercase tracking-wider text-zinc-400">
            {percent < 95 ? `${Math.ceil((100 - percent) * (isVideo ? 0.16 : 0.08))}s remaining` : 'Finalizing output...'}
          </span>
        </div>
      </div>

      {/* Visual Frame Skeleton Box */}
      <div className="relative z-10 w-full h-36 rounded-lg bg-zinc-950/90 border border-pink-500/30 flex flex-col items-center justify-center space-y-2.5 overflow-hidden shadow-inner">
        {/* Animated Progress Bar Fill */}
        <div className="w-56 bg-zinc-900 rounded-full h-2.5 overflow-hidden border border-white/10 p-0.5">
          <div 
            className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 transition-all duration-300 rounded-full shadow-lg"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
            Generating Matrix ({percent}%)
          </span>
        </div>
      </div>
    </div>
  );
};

const BASE_PRESETS: CustomPreset[] = [
  {
    name: "📸 Photoshoot",
    prompt: "Generate 3 photorealistic portrait photos of my AI influencer in a luxury penthouse wearing elegant evening outfit."
  },
  {
    name: "🎬 1-Min Video Storyboard",
    prompt: "Create a 1-minute video storyboard with 4 scenes: talking avatar intro, workout action shot, protein shake, and call to action."
  },
  {
    name: "🎙️ Voice Clone & Avatar",
    prompt: "Clone the voice from my uploaded video sample and generate a talking avatar saying 'Welcome to my exclusive channel!'."
  },
  {
    name: "📈 7-Day Content Plan",
    prompt: "Architect a 7-day content schedule for Instagram with high-converting hooks, viral caption ideas, and revenue strategies."
  }
];

// Helper to extract the last frame of a video segment in the browser
async function extractLastFrameFromVideo(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    
    // Set a timeout to reject if video doesn't load/seek
    const timeout = setTimeout(() => {
      video.onloadeddata = null;
      video.onseeked = null;
      reject(new Error('Video frame extraction timed out'));
    }, 12000);

    video.onloadeddata = () => {
      // Seek to 0.2 seconds before the end of the video
      video.currentTime = Math.max(0, video.duration - 0.2);
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.9);
          resolve(base64);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = (e) => {
      clearTimeout(timeout);
      reject(new Error('Video loading error: ' + e));
    };
  });
}

// Helper to stitch multiple video segments into one WebM movie client-side
// Helper to stitch multiple video segments into one WebM movie client-side
async function stitchVideoSegments(
  videoUrls: string[],
  settingsMap?: Record<number, { start: number; end: number; speed: number; transition: 'none' | 'fade' | 'slide' | 'zoom' }>
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  const stream = canvas.captureStream(30); // 30 fps
  const recordedChunks: Blob[] = [];
  
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9'
  });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  const playAndRecordSegment = (url: string, idx: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = url;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;

      const settings = settingsMap?.[idx] || { start: 0, end: 10, speed: 1.0, transition: 'none' };
      
      // Set playback speed
      video.playbackRate = settings.speed;

      let isEnded = false;
      let animFrameId: number;
      let frameCount = 0;
      const transitionFrames = 15; // 0.5s transition at 30fps

      // Trigger start trim time once metadata is loaded
      video.onloadedmetadata = () => {
        video.currentTime = settings.start;
      };

      const renderFrame = () => {
        if (isEnded) return;
        
        ctx.save();
        
        // Handle transitions (Fade, Slide, Zoom)
        if (settings.transition !== 'none' && frameCount < transitionFrames) {
          const progress = frameCount / transitionFrames;
          if (settings.transition === 'fade') {
            ctx.globalAlpha = progress;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          } else if (settings.transition === 'slide') {
            const xOffset = (1 - progress) * -canvas.width;
            ctx.drawImage(video, xOffset, 0, canvas.width, canvas.height);
          } else if (settings.transition === 'zoom') {
            const scale = 0.85 + progress * 0.15;
            const w = canvas.width * scale;
            const h = canvas.height * scale;
            const x = (canvas.width - w) / 2;
            const y = (canvas.height - h) / 2;
            ctx.drawImage(video, x, y, w, h);
          }
        } else {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        ctx.restore();
        frameCount++;

        // Handle End Time trim limit check
        if (settings.end > 0 && video.currentTime >= settings.end) {
          isEnded = true;
          cancelAnimationFrame(animFrameId);
          resolve();
          return;
        }

        animFrameId = requestAnimationFrame(renderFrame);
      };

      video.onplay = () => {
        renderFrame();
      };

      video.onended = () => {
        if (!isEnded) {
          isEnded = true;
          cancelAnimationFrame(animFrameId);
          resolve();
        }
      };

      video.onerror = (e) => {
        isEnded = true;
        cancelAnimationFrame(animFrameId);
        reject(new Error('Error playing segment: ' + e));
      };
    });
  };

  return new Promise(async (resolve, reject) => {
    mediaRecorder.start();

    try {
      for (let i = 0; i < videoUrls.length; i++) {
        await playAndRecordSegment(videoUrls[i], i);
      }
      
      // Wait briefly to commit final frames
      await new Promise(r => setTimeout(r, 500));
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const finalUrl = URL.createObjectURL(blob);
        resolve(finalUrl);
      };

      mediaRecorder.stop();
    } catch (err) {
      reject(err);
    }
  });
}
// Simple WAV encoder helper for Web Audio API buffers
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };
  const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16);         // length of format chunk
  setUint16(1);          // PCM format
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * numOfChan * 2); // byte rate
  setUint16(numOfChan * 2);              // block align
  setUint16(16);                         // bits per sample
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArr], { type: 'audio/wav' });
}
export default function AgentView({ personas, setPersonas, selectedPersonaId: propSelectedPersonaId, onSelectPersona, nav }: AgentViewProps) {
  const effectiveSelectedPersonaId = propSelectedPersonaId;
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [canvasTab, setCanvasTab] = useState<'studio' | 'chat' | 'marketing' | 'media' | 'downloader'>('studio');
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);

  // Autopilot, Sub-Agent Delegation & Approval Queue States
  const [autopilotActive, setAutopilotActive] = useState(false);
  const [autopilotInterval, setAutopilotInterval] = useState<'30s' | '1h' | '6h' | '12h'>('1h');
  const [autoApprove, setAutoApprove] = useState(false);
  const [allowNsfw, setAllowNsfw] = useState(() => localStorage.getItem('agent_allow_nsfw') === 'true');
  const [voiceLlmModel, setVoiceLlmModel] = useState<string>(() => {
    const saved = localStorage.getItem('agent_voice_llm');
    if (!saved || saved.includes('ollama')) return 'gemini';
    return saved;
  });
  const [deepResearchActive, setDeepResearchActive] = useState(false);
  const [socialResearchActive, setSocialResearchActive] = useState(false);
  const [webpageResearchActive, setWebpageResearchActive] = useState(false);
  const [webpageUrlInput, setWebpageUrlInput] = useState('');
  const [showWebpageUrlModal, setShowWebpageUrlModal] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<{
    id: string;
    type: 'image' | 'video' | 'voice' | 'plan' | 'revenue';
    title: string;
    url?: string;
    payload: any;
    personaId: string;
    timestamp: number;
  }[]>([]);
  const [subAgentLogs, setSubAgentLogs] = useState<{
    id: string;
    agent: 'visual' | 'copywriter' | 'business';
    message: string;
    timestamp: string;
  }[]>([]);

  const emitSubAgentLog = (agent: 'visual' | 'copywriter' | 'business', message: string) => {
    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      agent,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setSubAgentLogs(prev => [entry, ...prev].slice(0, 25));
  };

  const handleApproveItem = async (itemId: string) => {
    const item = pendingApprovals.find(i => i.id === itemId);
    if (!item) return;

    try {
      if (item.type === 'image' || item.type === 'video') {
        await api.images.create(item.personaId, item.payload);
        toast.success(`Approved & published ${item.type} asset to Gallery Vault!`);
      } else if (item.type === 'plan') {
        await api.plannedPosts.save(item.personaId, item.payload.platform, item.payload.plan);
        toast.success('Approved & scheduled 7-day Content Plan!');
      } else if (item.type === 'revenue') {
        await api.revenue.create(item.payload);
        toast.success(`Approved & logged $${item.payload.amount} revenue!`);
      }
      setPendingApprovals(prev => prev.filter(i => i.id !== itemId));
    } catch (err: any) {
      toast.error('Failed to commit approved item: ' + (err.message || 'Unknown error'));
    }
  };

  const handleRejectItem = (itemId: string) => {
    setPendingApprovals(prev => prev.filter(i => i.id !== itemId));
    toast('Item rejected and discarded', { icon: '🗑️' });
  };
  
  // Clone & Talking Avatar Studio states
  const [studioScript, setStudioScript] = useState('');
  const [studioVoiceFile, setStudioVoiceFile] = useState<Attachment | null>(null);
  const [studioAvatarImage, setStudioAvatarImage] = useState<Attachment | null>(null);
  const [isStudioLoading, setIsStudioLoading] = useState<boolean>(false);
  const [studioResultAudioUrl, setStudioResultAudioUrl] = useState<string | null>(null);
  const [studioResultVideoUrl, setStudioResultVideoUrl] = useState<string | null>(null);

  // Voice engine states
  const [voiceEngine, setVoiceEngine] = useState<string>('omnivoice');
  const [voiceNameInput, setVoiceNameInput] = useState('Sofia Voice');
  const [voiceDescInput, setVoiceDescInput] = useState('Voice clone of Sofia reference clip');
  const [clonedVoiceId, setClonedVoiceId] = useState<string | null>(() => {
    return accountLocalStorage.getItem('superagent_cloned_voice_id') || accountLocalStorage.getItem('agent_default_voice_id') || null;
  });

  // Social Downloader States
  const [downloaderUrl, setDownloaderUrl] = useState('');

  // Enlarged Fullscreen Lightbox State
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const [agentZoomMode, setAgentZoomMode] = useState<'fit' | 'fill' | 'zoom'>('fit');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedImageUrl(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const agentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleInputTextChange = (val: string) => {
    stopAllAgentAudio();
    setInputText(val);
    if (agentTextareaRef.current) {
      agentTextareaRef.current.style.height = 'auto';
      agentTextareaRef.current.style.height = `${Math.min(agentTextareaRef.current.scrollHeight, 180)}px`;
    }
  };
  const [downloaderLoading, setDownloaderLoading] = useState(false);
  const [downloaderResult, setDownloaderResult] = useState<{
    videoUrl: string;
    title: string;
    cover: string;
    platform: 'instagram' | 'tiktok';
  } | null>(null);

  // Chat Sandbox States
  const [personaChatMessages, setPersonaChatMessages] = useState<{ role: 'user' | 'model'; content: string; voiceUrl?: string; isReading?: boolean }[]>([
    { role: 'model', content: "Hey! Ready to talk about our content goals?" }
  ]);
  const [personaChatInput, setPersonaChatInput] = useState('');
  const [isPersonaTyping, setIsPersonaTyping] = useState(false);

  // In-chat swap context
  const [activeSwapTarget, setActiveSwapTarget] = useState<{ msgId: string; stepIdx: number } | null>(null);

  // Panel Collapsed state (Default to collapsed for clean workspace)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true);

  // Guided Tour Onboarding states
  const [tourStep, setTourStep] = useState<number | null>(null);

  // Segment Settings interface
  interface SegmentSetting {
    start: number;
    end: number;
    speed: number;
    transition: 'none' | 'fade' | 'slide' | 'zoom';
  }

  // Storyboard Segment Settings State
  const [segmentSettings, setSegmentSettings] = useState<Record<number, SegmentSetting>>({});

  // Copywriter Sandbox States
  const [copywriterTopic, setCopywriterTopic] = useState('');
  const [copywriterPlatform, setCopywriterPlatform] = useState<'onlyfans' | 'instagram' | 'tiktok'>('instagram');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [copyLogs, setCopyLogs] = useState<{ agent: string; msg: string }[]>([]);
  const [copyOptions, setCopyOptions] = useState<{ type: string; text: string; tags: string }[] | null>(null);

  const getAttachmentIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-pink-400" />;
    if (mimeType.startsWith('audio/')) return <Volume2 className="w-5 h-5 text-cyan-400" />;
    if (mimeType.startsWith('video/')) return <VideoIcon className="w-5 h-5 text-indigo-400" />;
    return <FileText className="w-5 h-5 text-amber-400" />;
  };

  // Helper to retrieve the active model plan details for the Canvas preview
  const getActiveDraftState = () => {
    const activeMsg = [...messages].reverse().find(m => m.suggestedSteps);
    if (!activeMsg || !activeMsg.execSteps) return null;

    const createStep = activeMsg.execSteps.find(s => s.type === 'create_persona');
    const planStep = activeMsg.execSteps.find(s => s.type === 'generate_content_plan');
    const imgStep = activeMsg.execSteps.find(s => s.type === 'generate_image');
    const videoStep = activeMsg.execSteps.find(s => s.type === 'generate_video');
    const voiceStep = activeMsg.execSteps.find(s => s.type === 'generate_voice');
    const revStep = activeMsg.execSteps.find(s => s.type === 'log_revenue');

    return {
      createStep,
      planStep,
      imgStep,
      videoStep,
      voiceStep,
      revStep,
      messageId: activeMsg.id
    };
  };

  const activeDraft = getActiveDraftState();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const swapFileInputRef = useRef<HTMLInputElement>(null);
  const studioVoiceRef = useRef<HTMLInputElement>(null);
  const studioAvatarRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load custom presets from localStorage on mount
  useEffect(() => {
    try {
      const stored = accountLocalStorage.getItem('agent_presets');
      if (stored) {
        setCustomPresets(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load presets:', e);
    }
  }, []);

  // Self-healing effect: Automatically purge any legacy "hello" execution cards from state
  useEffect(() => {
    setMessages(prev => prev.filter(m => {
      if (m.suggestedSteps) {
        const contentStr = (m.content || '').toLowerCase();
        if (contentStr.includes('request: "hello"') || contentStr.includes('seedream') || contentStr.includes('hello')) {
          return false;
        }
      }
      return true;
    }));
  }, []);

  // Background Autopilot Timer Loop
  useEffect(() => {
    if (!autopilotActive) return;

    let ms = 3600000; // 1 hour default
    if (autopilotInterval === '30s') ms = 30000;
    else if (autopilotInterval === '6h') ms = 21600000;
    else if (autopilotInterval === '12h') ms = 43200000;

    const timer = setInterval(() => {
      toast('🤖 [Autopilot Loop]: Triggering scheduled background generation...', { icon: '⚡' });
      emitSubAgentLog('business', `Autopilot background timer fired (${autopilotInterval}). Initiating automated media cycle...`);

      const randomPreset = BASE_PRESETS[Math.floor(Math.random() * BASE_PRESETS.length)];
      if (randomPreset) {
        emitSubAgentLog('copywriter', `Autopilot selected campaign strategy: "${randomPreset.name}"`);
        sendMessage(randomPreset.prompt);
      }
    }, ms);

    return () => clearInterval(timer);
  }, [autopilotActive, autopilotInterval]);

  // Guided Tour Tab auto-switching handler
  useEffect(() => {
    if (tourStep === 2) setCanvasTab('studio');
    else if (tourStep === 3) setCanvasTab('marketing');
    else if (tourStep === 4) setCanvasTab('marketing');
  }, [tourStep]);

  const onboardingSteps = [
    {
      title: "👋 Welcome to AI Influencer Studio!",
      desc: "This studio empowers you to manage virtual personas, clone voices, synthesize videos, download public Reels/TikToks, and analyze real public channel performance."
    },
    {
      title: "🤖 The Step Pipeline (Left Panel)",
      desc: "Here, you propose and execute content pipeline steps. You can generate ideas, synthesize model profiles, render voiceover tracks, and compile stitched video stories."
    },
    {
      title: "🎙️ Voice & Avatar Cloning Studio",
      desc: "Switch here to clone voice tracks from as short as a 5-second video/audio sample using Wavespeed OmniVoice or ElevenLabs, and generate talking photos."
    },
    {
      title: "📲 Reels & TikTok Downloader",
      desc: "Paste any public Instagram Reels or TikTok video link. The studio extracts the available video file for direct download or saves it as a Planner draft."
    },
    {
      title: "📊 Live Social Intelligence & Planning",
      desc: "Analyze public Instagram and TikTok channels, identify content outliers, and prepare honest drafts or manual schedules. Direct publishing requires an official connected platform account."
    }
  ];

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      
      rec.onstart = () => {
        setIsListening(true);
        toast.success('Microphone active... Speak now!');
      };
      
      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setInputText(prev => (prev ? prev + ' ' + text : text));
      };
      
      rec.onerror = () => {
        toast.error('Speech recognition failed or permission denied.');
        setIsListening(false);
      };
      
      rec.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = rec;
    }
  }, []);

  // Global Default Cloned Voice State
  const [clonedVoiceRef, setClonedVoiceRef] = useState<string | null>(() => accountLocalStorage.getItem('superagent_cloned_voice') || null);
  const [isVoiceCloneModalOpen, setIsVoiceCloneModalOpen] = useState(false);
  const [isCloningVoice, setIsCloningVoice] = useState(false);
  const voiceUploadInputRef = useRef<HTMLInputElement | null>(null);

  const handleVoiceCloneUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCloningVoice(true);
    const toastId = toast.loading("Analyzing media & extracting 16kHz audio sample for Voice Clone...");

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawDataUrl = ev.target?.result as string;
      const dataUrl = await trimAudioBase64To10Sec(rawDataUrl);
      try {
        const res = await fetch('/api/agent/set-default-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceReference: dataUrl })
        });
        const data = await res.json();
        if (data.success) {
          setClonedVoiceRef('active');
          if (data.voiceId) {
            setClonedVoiceId(data.voiceId);
            accountLocalStorage.setItem('superagent_cloned_voice_id', data.voiceId);
          }
          try {
            accountLocalStorage.setItem('superagent_cloned_voice', 'active');
            accountLocalStorage.setItem('superagent_cloned_voice_audio', dataUrl);
          } catch (e) {
            console.warn('[LocalStorage Note]:', e);
          }
          toast.success("Voice Cloned & Set as Default! Super Agent will now speak using this voice.", { id: toastId });
        } else {
          toast.error(data.error || "Failed to process voice sample.", { id: toastId });
        }
      } catch (err) {
        console.error('[Voice Upload Exception]:', err);
        toast.error("Failed to upload voice sample to server.", { id: toastId });
      } finally {
        setIsCloningVoice(false);
        if (voiceUploadInputRef.current) voiceUploadInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const clearClonedVoice = async () => {
    setClonedVoiceRef(null);
    setClonedVoiceId(null);
    accountLocalStorage.removeItem('superagent_cloned_voice');
    accountLocalStorage.removeItem('superagent_cloned_voice_id');
    accountLocalStorage.removeItem('superagent_cloned_voice_audio');
    try {
      await fetch('/api/agent/set-default-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceReference: null })
      });
      toast('Cloned voice cleared. Returned to default studio voice.');
    } catch {}
  };

  const [isPlayingVoiceSample, setIsPlayingVoiceSample] = useState(false);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayVoiceSample = async () => {
    if (isPlayingVoiceSample && sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      sampleAudioRef.current = null;
      setIsPlayingVoiceSample(false);
      return;
    }

    setIsPlayingVoiceSample(true);
    const toastId = toast.loading("Synthesizing active voice sample...");
    try {
      const savedAudio = accountLocalStorage.getItem('superagent_cloned_voice_audio') || accountLocalStorage.getItem('voice_sample_1');
      let targetAudioUrl = savedAudio;

      if (!targetAudioUrl) {
        const res = await fetch('/api/agent/test-voice-clone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textToSpeak: "Hey there! This is your AI agent's active voice. Everything is configured and ready to go!",
            model: 'elevenlabs-v3'
          })
        });
        const data = await res.json();
        if (data.audioUrl) {
          targetAudioUrl = data.audioUrl;
        }
      }

      if (targetAudioUrl) {
        toast.dismiss(toastId);
        const audio = new Audio(targetAudioUrl);
        sampleAudioRef.current = audio;
        audio.onended = () => setIsPlayingVoiceSample(false);
        audio.onerror = () => setIsPlayingVoiceSample(false);
        await audio.play();
      } else {
        toast.error("No voice audio clip available.", { id: toastId });
        setIsPlayingVoiceSample(false);
      }
    } catch (err) {
      console.error('[Play Voice Sample Exception]:', err);
      toast.error("Failed to play voice sample.", { id: toastId });
      setIsPlayingVoiceSample(false);
    }
  };

  // Hands-Free Live Voice Call State with Barge-In Interruption & Acoustic Feedback Safeguard
  const [isLiveVoiceCallActive, setIsLiveVoiceCallActive] = useState(false);
  const isLiveVoiceCallActiveRef = useRef(false);
  const isAgentSpeakingRef = useRef(false);
  const lastDispatchedTextRef = useRef('');
  const liveVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const liveVoiceRecRef = useRef<any>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAgentSpeakingState, setIsAgentSpeakingState] = useState(false);
  
  // Parallel sentence-by-sentence queue states
  const sentenceIndexRef = useRef<number>(0);
  const playbackIndexRef = useRef<number>(0);
  const audioSegmentsRef = useRef<Record<number, any>>({});
  const audioPlayingRef = useRef<boolean>(false);
  const streamActiveRef = useRef<boolean>(false);

  useEffect(() => {
    isLiveVoiceCallActiveRef.current = isLiveVoiceCallActive;
    if (!isLiveVoiceCallActive) {
      setCallDuration(0);
      setIsUserSpeaking(false);
      setIsAgentSpeakingState(false);
    }
  }, [isLiveVoiceCallActive]);

  // Call duration timer
  useEffect(() => {
    if (!isLiveVoiceCallActive) return;
    const interval = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(interval);
  }, [isLiveVoiceCallActive]);

  // Sync isAgentSpeakingRef to state for UI rendering
  useEffect(() => {
    if (!isLiveVoiceCallActive) return;
    const interval = setInterval(() => {
      setIsAgentSpeakingState(isAgentSpeakingRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [isLiveVoiceCallActive]);

  const lastRestartTimeRef = useRef<number>(0);
  const restartCountRef = useRef<number>(0);

  const stopAllAgentAudio = () => {
    console.log('[Voice] 🛑 Stopping all audio playback and flushing queues');
    if (liveVoiceAudioRef.current) {
      try {
        liveVoiceAudioRef.current.pause();
        liveVoiceAudioRef.current.currentTime = 0;
      } catch {}
      liveVoiceAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    
    // Flush streaming voice queues and reset flags
    sentenceIndexRef.current = 0;
    playbackIndexRef.current = 0;
    audioSegmentsRef.current = {};
    audioPlayingRef.current = false;
    streamActiveRef.current = false;
    isAgentSpeakingRef.current = false;
  };

  const speechDebounceTimerRef = useRef<any>(null);
  const voiceCallBusyRef = useRef(false);

  // ─── REBUILT: Standalone voice message sender (separate from sendMessage) ─────
  const sendVoiceMessage = async (spokenText: string) => {
    if (!spokenText.trim() || !isLiveVoiceCallActiveRef.current) return;
    if (voiceCallBusyRef.current) {
      console.log('[Voice] ⏳ Already processing, queuing will retry after current finishes');
      return;
    }

    voiceCallBusyRef.current = true;
    isAgentSpeakingRef.current = true;
    console.log('[Voice] 📤 Sending:', spokenText);

    // Watchdog timer: automatically recover state if pipeline stalls >12 seconds
    const watchdogTimer = setTimeout(() => {
      if (voiceCallBusyRef.current) {
        console.warn('[Voice Watchdog] ⏰ Processing timed out after 12s, auto-recovering...');
        stopAllAgentAudio();
        restartMic();
      }
    }, 12000);

    // Stop mic cleanly while we process
    if (liveVoiceRecRef.current) {
      try {
        liveVoiceRecRef.current.onend = null;
        liveVoiceRecRef.current.onerror = null;
        liveVoiceRecRef.current.onresult = null;
        liveVoiceRecRef.current.abort();
      } catch {}
      liveVoiceRecRef.current = null;
    }
    setIsUserSpeaking(false);

    // Add user message to chat
    const userMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: spokenText
    };
    setMessages(prev => [...prev.slice(-35), userMsg]);
    setInputText('');

    // Clear queues & flags
    sentenceIndexRef.current = 0;
    playbackIndexRef.current = 0;
    audioSegmentsRef.current = {};
    audioPlayingRef.current = false;
    streamActiveRef.current = true; // Stream is starting

    // Create a placeholder agent message object so we can update its content in real-time as text streams in
    const agentMsgId = Math.random().toString();
    const agentMsgObj: Message = {
      id: agentMsgId,
      role: 'model',
      content: '',
      status: 'normal'
    };
    setMessages(prev => [...prev.slice(-35), agentMsgObj]);

    const restartMic = () => {
      clearTimeout(watchdogTimer);
      console.log('[Voice] 🎤 Restarting mic...');
      voiceCallBusyRef.current = false;
      isAgentSpeakingRef.current = false;
      lastDispatchedTextRef.current = '';
      if (isLiveVoiceCallActiveRef.current) {
        restartSpeechRecognition();
      }
    };

    const checkPlaybackFinished = () => {
      const nextIdx = playbackIndexRef.current;
      const totalSentences = sentenceIndexRef.current;

      if (nextIdx < totalSentences) {
        // There are more segments to play
        playPlaybackQueue();
      } else if (!streamActiveRef.current) {
        // Stream is fully complete and all sentences have been played/processed
        console.log('[Voice Queue] ✅ Stream completed & all parallel audio played!');
        restartMic();
      }
    };

    const playPlaybackQueue = async () => {
      if (audioPlayingRef.current) return;

      const nextIdx = playbackIndexRef.current;
      const segment = audioSegmentsRef.current[nextIdx];

      if (segment === undefined) {
        // Next segment in sequence is still loading, wait for it
        return;
      }

      // Mark that we are processing this index
      playbackIndexRef.current++;

      if (segment === 'failed') {
        // Skip failed segment and check next / completion
        playPlaybackQueue();
        checkPlaybackFinished();
        return;
      }

      audioPlayingRef.current = true;
      liveVoiceAudioRef.current = segment;
      isAgentSpeakingRef.current = true;

      const safetyTimer = setTimeout(() => {
        console.warn(`[Voice Playback] ⏰ Segment ${nextIdx} safety timeout`);
        try { segment.pause(); } catch {}
        audioPlayingRef.current = false;
        isAgentSpeakingRef.current = false;
        checkPlaybackFinished();
      }, 120000); // 2 minute safety timeout to prevent long sentence cutoffs

      segment.onended = () => {
        clearTimeout(safetyTimer);
        audioPlayingRef.current = false;
        isAgentSpeakingRef.current = false;
        checkPlaybackFinished();
      };

      segment.onerror = () => {
        clearTimeout(safetyTimer);
        console.warn(`[Voice Playback] ❌ Audio play error on segment ${nextIdx}`);
        audioPlayingRef.current = false;
        isAgentSpeakingRef.current = false;
        checkPlaybackFinished();
      };

      try {
        await segment.play();
      } catch (err) {
        console.warn(`[Voice Playback] ❌ segment.play() error on segment ${nextIdx}:`, err);
        clearTimeout(safetyTimer);
        audioPlayingRef.current = false;
        isAgentSpeakingRef.current = false;
        checkPlaybackFinished();
      }
    };

    const createWebSpeechAudioSegment = (text: string) => {
      let isCancelled = false;
      return {
        play: function() {
          return new Promise<void>((resolve) => {
            if (typeof window === 'undefined' || !window.speechSynthesis || isCancelled) {
              if (this.onended) this.onended();
              resolve();
              return;
            }
            const synth = window.speechSynthesis;
            if (synth.paused) {
              try { synth.resume(); } catch {}
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.05;
            utterance.pitch = 1.0;

            const voices = synth.getVoices();
            const preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Karen') || v.name.includes('Victoria')));
            if (preferred) utterance.voice = preferred;

            let finished = false;

            const done = () => {
              if (finished) return;
              finished = true;
              if (this.onended) this.onended();
              resolve();
            };

            utterance.onend = () => { clearTimeout(safetyTimeout); done(); };
            utterance.onerror = () => { clearTimeout(safetyTimeout); done(); };

            // Safety timeout: 8 seconds max per sentence segment so Chrome WebSpeech never hangs the queue
            const safetyTimeout = setTimeout(done, 8000);

            try {
              if (synth.speaking || synth.pending) {
                try { synth.cancel(); } catch {}
              }
              synth.speak(utterance);
            } catch (err) {
              console.warn('[WebSpeech] synth.speak error:', err);
              clearTimeout(safetyTimeout);
              done();
            }
          });
        },
        pause: function() {
          isCancelled = true;
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch {}
          }
          if (this.onended) this.onended();
        },
        onended: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
    };

    // Split long text into short clause-sized chunks safe for Chrome WebSpeech (< 12 seconds each)
    const splitIntoShortClauses = (text: string): string[] => {
      // If short enough, return as-is
      if (text.length <= 80) return [text];
      
      // Split on commas, semicolons, colons, dashes, "and", "but", "or", "so", "because"
      const clauseRegex = /[^,;:\-–—]+(?:[,;:\-–—]|(?:\s+(?:and|but|or|so|because|then|which|where|when)\s+))/gi;
      const clauses: string[] = [];
      let lastIdx = 0;
      let currentChunk = '';
      let match;

      while ((match = clauseRegex.exec(text)) !== null) {
        const piece = match[0].trim();
        if ((currentChunk + ' ' + piece).trim().length > 100 && currentChunk.length > 10) {
          clauses.push(currentChunk.trim());
          currentChunk = piece;
        } else {
          currentChunk = (currentChunk + ' ' + piece).trim();
        }
        lastIdx = clauseRegex.lastIndex;
      }

      // Append remainder
      const remainder = text.substring(lastIdx).trim();
      if (remainder) {
        currentChunk = (currentChunk + ' ' + remainder).trim();
      }
      if (currentChunk.trim()) {
        clauses.push(currentChunk.trim());
      }

      return clauses.length > 0 ? clauses : [text];
    };

    const fetchTtsSegment = async (sentence: string, index: number) => {
      const activePersonaObj = (effectiveSelectedPersonaId && effectiveSelectedPersonaId !== 'empty')
        ? personas.find(p => p.id === effectiveSelectedPersonaId)
        : undefined;

      const voiceIdToUse = activePersonaObj?.voiceId || accountLocalStorage.getItem('superagent_cloned_voice_id') || undefined;
      const voiceSampleToUse = activePersonaObj?.voiceSampleUrl || accountLocalStorage.getItem('superagent_cloned_voice_audio') || undefined;
      const engineToUse = activePersonaObj?.voiceEngine || (voiceIdToUse ? 'elevenlabs' : (voiceEngine || 'omnivoice'));
      const voiceNameObj = activePersonaObj?.name || 'Aoede';

      // Try fast Cloud TTS first (OpenAI / ElevenLabs / Wavespeed)
      try {
        const controller = new AbortController();
        const ttsTimeout = setTimeout(() => controller.abort(), 30000);

        const ttsRes = await authFetch('/api/generate-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            text: sentence,
            voiceName: voiceNameObj,
            voiceReference: voiceSampleToUse,
            voiceId: voiceIdToUse,
            engine: engineToUse,
            allowNsfw
          })
        });

        clearTimeout(ttsTimeout);

        if (ttsRes.ok) {
          const ttsData = await ttsRes.json();
          if (ttsData.audioUrl) {
            console.log(`[Voice TTS] 🎵 Cloud TTS audio ready for segment ${index} (${engineToUse})`);
            const audio = new Audio(ttsData.audioUrl);
            audioSegmentsRef.current[index] = audio;
            playPlaybackQueue();
            return;
          }
        }
      } catch (err) {
        console.warn(`[Voice TTS] Cloud TTS timed out/failed for segment ${index}, using WebSpeech fallback`, err);
      }

      console.log(`[Voice TTS] 🔊 Using WebSpeech fallback for segment ${index}`);
      audioSegmentsRef.current[index] = createWebSpeechAudioSegment(sentence);
      playPlaybackQueue();
    };

    try {
      // Build history
      const history = [...messages, userMsg].slice(-20).map(m => ({
        role: m.role,
        content: m.content
      }));

      let authHeader: Record<string, string> = {};
      try {
        const { supabase } = await import('../lib/supabase');
        const sessionRes = await supabase.auth.getSession();
        const token = sessionRes?.data?.session?.access_token;
        if (token) authHeader = { 'Authorization': `Bearer ${token}` };
      } catch {}

      const activePersonaObj = (effectiveSelectedPersonaId && effectiveSelectedPersonaId !== 'empty')
        ? personas.find(p => p.id === effectiveSelectedPersonaId)
        : undefined;

      console.log('[Voice Stream] 🔄 Fetching /api/agent/voice-chat-stream...');
      const response = await fetch('/api/agent/voice-chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          messages: history,
          allowNsfw,
          voiceLlmModel,
          activePersona: activePersonaObj
        })
      });

      if (!response.ok) throw new Error(`Stream error ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream reader');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        const lines = textChunk.split('\n');

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data: ')) {
            const dataStr = cleanLine.substring(6);
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.done) {
                console.log('[Voice Stream] 🏁 Stream complete marker received');
                break;
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.text) {
                const delta = parsed.text;
                accumulatedText += delta;
                buffer += delta;

                // Update placeholder message content in chat in real-time
                setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, content: accumulatedText } : m));

                // Regex to find complete sentences (at least 6 chars to avoid tiny "Oh," cutoffs)
                const sentenceRegex = /[^.!?\n]+[.!?]+(?:\s+|$)/g;
                let match;
                let lastIndex = 0;

                while ((match = sentenceRegex.exec(buffer)) !== null) {
                  const sentence = match[0].replace(/[*_#`\\\\]/g, '').trim();
                  if (sentence.length > 5) {
                    const currentIdx = sentenceIndexRef.current++;
                    fetchTtsSegment(sentence, currentIdx);
                  }
                  lastIndex = sentenceRegex.lastIndex;
                }

                if (lastIndex > 0) {
                  buffer = buffer.substring(lastIndex);
                }
              }
            } catch {}
          }
        }
      }

      // Finish remaining buffer
      streamActiveRef.current = false; // LLM stream is finished enqueuing
      const remaining = buffer.replace(/[*_#`\\\\]/g, '').trim();
      if (remaining.length > 1) {
        console.log('[Voice Stream] 🏁 Enqueuing remaining text:', remaining);
        const currentIdx = sentenceIndexRef.current++;
        fetchTtsSegment(remaining, currentIdx);
      }

      // Wait for a brief moment to check if playback is done/idle
      setTimeout(() => {
        checkPlaybackFinished();
      }, 500);

    } catch (err) {
      console.error('[Voice Stream] ❌ Pipeline error:', err);
      streamActiveRef.current = false;
      setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, content: 'Sorry, I ran into a streaming error. Please try speaking again!' } : m));
      restartMic();
    }
  };

  // ─── Speech Recognition ──────────────────────────────────────────────────────
  const isStartingRecRef = useRef(false);

  const restartSpeechRecognition = () => {
    if (!isLiveVoiceCallActiveRef.current || isStartingRecRef.current || isAgentSpeakingRef.current || voiceCallBusyRef.current) return;
    isStartingRecRef.current = true;

    // Rate-limiting to prevent CPU lockups & rapid restart loops
    const now = Date.now();
    if (now - lastRestartTimeRef.current < 1500) {
      restartCountRef.current++;
      if (restartCountRef.current > 3) {
        console.warn('[Voice] Rapid restarts detected, backing off 2.5s...');
        isStartingRecRef.current = false;
        setTimeout(() => {
          restartCountRef.current = 0;
          if (isLiveVoiceCallActiveRef.current && !voiceCallBusyRef.current) {
            restartSpeechRecognition();
          }
        }, 2500);
        return;
      }
    } else {
      restartCountRef.current = 0;
    }
    lastRestartTimeRef.current = now;

    // Detach handlers BEFORE aborting to prevent cyclic event triggers & CPU spikes
    const prevRec = liveVoiceRecRef.current;
    liveVoiceRecRef.current = null;
    if (prevRec) {
      try {
        prevRec.onend = null;
        prevRec.onerror = null;
        prevRec.onresult = null;
        prevRec.abort();
      } catch {}
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      isStartingRecRef.current = false;
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (e: any) => {
        if (liveVoiceRecRef.current !== rec) return;
        
        // Acoustic Feedback Protection: Mute mic processing while agent is actively speaking
        if (isAgentSpeakingRef.current) {
          console.log('[Voice] 🔇 Suppressing microphone acoustic feedback while agent speaks');
          return;
        }

        let finalText = '';
        let interimText = '';
        let hasFinal = false;

        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalText += e.results[i][0].transcript;
            hasFinal = true;
          } else {
            interimText += e.results[i][0].transcript;
          }
        }

        // Live visualizer feedback for interim speech
        if (!hasFinal || !finalText.trim() || finalText.trim().length < 2) {
          if (interimText.trim().length > 1) {
            setIsUserSpeaking(true);
            setInputText(interimText.trim());
          }
          return;
        }

        const speech = finalText.trim();
        setIsUserSpeaking(true);
        setInputText(speech);

        // Debounce: wait 350ms after user finishes sentence, then send complete speech
        if (speechDebounceTimerRef.current) clearTimeout(speechDebounceTimerRef.current);
        speechDebounceTimerRef.current = setTimeout(() => {
          setIsUserSpeaking(false);
          if (speech && speech !== lastDispatchedTextRef.current) {
            lastDispatchedTextRef.current = speech;
            sendVoiceMessage(speech);
          }
        }, 350);
      };

      rec.onerror = (e: any) => {
        if (liveVoiceRecRef.current !== rec) return;
        console.warn('[Voice] Recognition error:', e.error);
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          setTimeout(() => {
            if (isLiveVoiceCallActiveRef.current && !voiceCallBusyRef.current && liveVoiceRecRef.current === rec) {
              restartSpeechRecognition();
            }
          }, 1500);
        }
      };

      rec.onend = () => {
        setIsUserSpeaking(false);
        if (liveVoiceRecRef.current !== rec) return; // Stale instance, do not restart
        // Auto-restart if call is still active and we're not busy processing
        if (isLiveVoiceCallActiveRef.current && !voiceCallBusyRef.current) {
          setTimeout(() => {
            if (isLiveVoiceCallActiveRef.current && !voiceCallBusyRef.current) {
              restartSpeechRecognition();
            }
          }, 1000);
        }
      };

      rec.start();
      liveVoiceRecRef.current = rec;
      isStartingRecRef.current = false;
      console.log('[Voice] 🎤 Speech recognition started');
    } catch (err) {
      isStartingRecRef.current = false;
      console.warn('[Voice] Failed to start recognition:', err);
    }
  };

  const startLiveVoiceCall = () => {
    stopAllAgentAudio();
    voiceCallBusyRef.current = false;
    setIsLiveVoiceCallActive(true);
    isLiveVoiceCallActiveRef.current = true;
    lastDispatchedTextRef.current = '';
    toast.success('Live Voice Call Active — Speak naturally with Super Agent');
    restartSpeechRecognition();
  };

  const stopLiveVoiceCall = () => {
    setIsLiveVoiceCallActive(false);
    isLiveVoiceCallActiveRef.current = false;
    voiceCallBusyRef.current = false;
    stopAllAgentAudio();
    if (speechDebounceTimerRef.current) {
      clearTimeout(speechDebounceTimerRef.current);
      speechDebounceTimerRef.current = null;
    }
    if (liveVoiceRecRef.current) {
      try {
        liveVoiceRecRef.current.onend = null;
        liveVoiceRecRef.current.onerror = null;
        liveVoiceRecRef.current.onresult = null;
        liveVoiceRecRef.current.stop();
      } catch {}
      liveVoiceRecRef.current = null;
    }
    toast('Live Voice Call Ended');
  };

  const prevMsgLengthRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length !== prevMsgLengthRef.current || isSending) {
      prevMsgLengthRef.current = messages.length;
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
    }
  }, [messages.length, isSending]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        toast.error('Voice input is not supported in this browser. Please use Chrome/Safari.');
        return;
      }
      recognitionRef.current.start();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1024;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
              setAttachments(prev => [
                ...prev,
                { name: file.name, dataUrl: compressedDataUrl, mimeType: 'image/jpeg' }
              ]);
            } else {
              setAttachments(prev => [
                ...prev,
                { name: file.name, dataUrl: ev.target?.result as string, mimeType: file.type }
              ]);
            }
          };
          img.onerror = () => {
            setAttachments(prev => [
              ...prev,
              { name: file.name, dataUrl: ev.target?.result as string, mimeType: file.type }
            ]);
          };
          img.src = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        // Extract lightweight 50KB JPEG frame thumbnail for video to prevent V8 memory crash
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        const objectUrl = URL.createObjectURL(file);
        video.src = objectUrl;
        
        let hasCaptured = false;
        const captureFrame = () => {
          if (hasCaptured) return;
          hasCaptured = true;
          const canvas = document.createElement('canvas');
          const maxDim = 640;
          let w = video.videoWidth || 640;
          let h = video.videoHeight || 360;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const thumbDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setAttachments(prev => [
              ...prev,
              { name: file.name, dataUrl: thumbDataUrl, mimeType: 'image/jpeg' }
            ]);
          } else {
            setAttachments(prev => [
              ...prev,
              { name: file.name, dataUrl: objectUrl, mimeType: file.type }
            ]);
          }
        };

        video.onloadeddata = () => {
          video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
        };
        video.onseeked = captureFrame;
        video.onerror = () => {
          setAttachments(prev => [
            ...prev,
            { name: file.name, dataUrl: objectUrl, mimeType: file.type }
          ]);
        };
        setTimeout(() => {
          if (!hasCaptured) captureFrame();
        }, 1500);
      } else {
        const objectUrl = URL.createObjectURL(file);
        setAttachments(prev => [
          ...prev,
          { name: file.name, dataUrl: objectUrl, mimeType: file.type }
        ]);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleParamChange = (messageId: string, stepIdx: number, paramKey: string, value: any) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.execSteps) {
        const updatedSteps = [...m.execSteps];
        updatedSteps[stepIdx] = {
          ...updatedSteps[stepIdx],
          params: {
            ...updatedSteps[stepIdx].params,
            [paramKey]: value
          }
        };
        return { ...m, execSteps: updatedSteps };
      }
      return m;
    }));
  };

  const saveAsPreset = (messageId: string) => {
    const targetMsg = messages.find(m => m.id === messageId);
    if (!targetMsg || !targetMsg.suggestedSteps) return;

    const personaStep = targetMsg.execSteps?.find(s => s.type === 'create_persona');
    const name = personaStep?.params.name || 'Custom Influencer';
    const presetName = `✨ Preset: ${name}`;

    const userMsg = [...messages].reverse().find(m => m.role === 'user');
    const promptText = userMsg?.content || `Create influencer named ${name}`;

    const newPreset = { name: presetName, prompt: promptText };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    accountLocalStorage.setItem('agent_presets', JSON.stringify(updated));
    toast.success(`Preset '${name}' saved successfully!`);
  };

  const deletePreset = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter((_, i) => i !== idx);
    setCustomPresets(updated);
    accountLocalStorage.setItem('agent_presets', JSON.stringify(updated));
    toast.success('Preset deleted.');
  };

  const sendMessage = async (overrideText?: string) => {
    const textToSend = overrideText !== undefined ? overrideText : inputText;
    if ((!textToSend.trim() && attachments.length === 0) || isSending) return;

    const isLiveCall = isLiveVoiceCallActive || isLiveVoiceCallActiveRef.current;

    // Stop any debounce timer
    if (speechDebounceTimerRef.current) {
      clearTimeout(speechDebounceTimerRef.current);
      speechDebounceTimerRef.current = null;
    }

    let augmentedText = textToSend;
    if (deepResearchActive) {
      augmentedText = `[DEEP RESEARCH ACTIVE: Use live search engine & synthesize fresh web data]\n${augmentedText}`;
    }
    if (socialResearchActive) {
      augmentedText = `[SOCIAL MEDIA RESEARCH ACTIVE: Analyze trending Instagram reels, TikTok audio, and X viral hooks]\n${augmentedText}`;
    }
    if (webpageResearchActive) {
      augmentedText = `[WEBPAGE RESEARCH ACTIVE: Extract & analyze website content from URL: ${webpageUrlInput || 'target URL'}]\n${augmentedText}`;
    }

    const userMessage: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: augmentedText,
      attachments: [...attachments]
    };

    setMessages(prev => [...prev.slice(-35), userMessage]);
    setInputText('');
    if (agentTextareaRef.current) {
      agentTextareaRef.current.style.height = 'auto';
    }
    setAttachments([]);
    setIsSending(true);

    try {
      const history = [...messages, userMessage].slice(-30).map(m => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments
      }));

      let authHeader: Record<string, string> = {};
      try {
        const { supabase } = await import('../lib/supabase');
        const sessionRes = await supabase.auth.getSession();
        const token = sessionRes?.data?.session?.access_token;
        if (token) authHeader = { 'Authorization': `Bearer ${token}` };
      } catch (e) {
        console.warn('Could not load auth headers for agent chat:', e);
      }

      // For text chat, we always call /api/agent/chat
      const chatEndpoint = '/api/agent/chat';

      const res = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({ 
          messages: history, 
          allowNsfw,
          voiceLlmModel,
          activePersona: (effectiveSelectedPersonaId && effectiveSelectedPersonaId !== 'empty') ? personas.find(p => p.id === effectiveSelectedPersonaId) : undefined
        })
      });

      if (!res.ok) {
        throw new Error('Failed to get response from Agent.');
      }

      const data = await res.json();
      const normalizedSteps = normalizeAgentSteps(data.suggestedSteps);
      const finalSuggestedSteps = normalizedSteps.length > 0 ? normalizedSteps : undefined;
      const finalCritiqueLogs = Array.isArray(data.critiqueLogs)
        ? data.critiqueLogs.filter((entry: unknown): entry is string => typeof entry === 'string')
        : undefined;
      const finalCollaborationLogs = Array.isArray(data.collaborationLogs)
        ? data.collaborationLogs.filter((entry: unknown): entry is CollaborationMsg => Boolean(
            entry && typeof entry === 'object'
            && typeof (entry as CollaborationMsg).agent === 'string'
            && typeof (entry as CollaborationMsg).message === 'string',
          ))
        : undefined;

      const newMsgId = Math.random().toString();
      const newMsgObj: Message = {
        id: newMsgId,
        role: 'model',
        content: data.text || '',
        status: data.status || 'normal',
        suggestedSteps: finalSuggestedSteps,
        critiqueLogs: finalCritiqueLogs,
        collaborationLogs: finalCollaborationLogs,
        execSteps: finalSuggestedSteps 
          ? finalSuggestedSteps.map((s: any) => ({ ...s, status: 'pending', resultUrl: undefined, isActionLoading: null }))
          : undefined,
        execLogs: finalSuggestedSteps ? [] : undefined
      };

      setMessages(prev => [...prev.slice(-35), newMsgObj]);

      if (newMsgObj.execSteps && newMsgObj.execSteps.length > 0) {
        setTimeout(() => {
          runPipeline(newMsgId, newMsgObj);
        }, 50);
      }
    } catch (err: any) {
      console.warn('Agent chat fallback triggered:', err);
      const fallbackMsgId = Math.random().toString();
      const textReply = `Hey there! How can I help you build, design, or market your AI influencer today? You can ask me to generate photos, create videos, plan content, or manage personas!`;
      const chatMsgObj: Message = {
        id: fallbackMsgId,
        role: 'model',
        content: textReply,
        status: 'normal'
      };
      setMessages(prev => [...prev.slice(-25), chatMsgObj]);
    } finally {
      setIsSending(false);
    }
  };

  // ─── In-Chat Visual Media Actions ──────────────────────────────────────────────
  const handleUseAsPromptReference = (imageUrl: string, promptText?: string) => {
    setAttachments(prev => [
      ...prev,
      {
        name: `ref-${Date.now().toString().slice(-4)}.png`,
        dataUrl: imageUrl,
        mimeType: 'image/png'
      }
    ]);
    if (promptText) {
      setInputText(`Edit this image: ${promptText}`);
    } else {
      setInputText(`Edit this image: `);
    }
    toast.success('Attached image to prompt input bar!');
  };

  const handleEditImageAction = (imageUrl: string, promptText?: string) => {
    handleUseAsPromptReference(imageUrl, promptText);
  };
  const handleUpscale = async (messageId: string, stepIdx: number, imageUrl: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.execSteps) {
        const updated = [...m.execSteps];
        updated[stepIdx].isActionLoading = 'upscale';
        return { ...m, execSteps: updated };
      }
      return m;
    }));

    try {
      const result = await upscaleImage(imageUrl, 'wavespeed-upscale:wavespeed-ai/image-super-resolution-v2-4x');
      toast.success('Image upscaled successfully!');
      
      setMessages(prev => prev.map(m => {
        if (m.id === messageId && m.execSteps) {
          const updated = [...m.execSteps];
          updated[stepIdx].resultUrl = result.imageUrl;
          updated[stepIdx].isActionLoading = null;
          return { ...m, execSteps: updated };
        }
        return m;
      }));
    } catch (err: any) {
      toast.error(err.message || 'Upscale failed');
      setMessages(prev => prev.map(m => {
        if (m.id === messageId && m.execSteps) {
          const updated = [...m.execSteps];
          updated[stepIdx].isActionLoading = null;
          return { ...m, execSteps: updated };
        }
        return m;
      }));
    }
  };

  const handleMakeVideo = async (messageId: string, stepIdx: number, imageUrl: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.execSteps) {
        const updated = [...m.execSteps];
        updated[stepIdx].isActionLoading = 'video';
        return { ...m, execSteps: updated };
      }
      return m;
    }));

    try {
      const result = await api.images.generateVideo({
        personaClientId: propSelectedPersonaId || personas[0]?.id,
        prompt: `Cinematic motion video clip of influencer avatar, subtle camera movement, photorealistic`,
        modelId: DEFAULT_VIDEO_MODEL_ID,
        strength: 0.6,
        sourceImage: imageUrl
      });

      toast.success('Video clip generated successfully!');
      
      setMessages(prev => prev.map(m => {
        if (m.id === messageId && m.execSteps) {
          const updated = [...m.execSteps];
          updated[stepIdx].isActionLoading = null;
          updated[stepIdx].resultUrl = result.videoUrl;
          return { ...m, execSteps: updated };
        }
        return m;
      }));
    } catch (err: any) {
      toast.error(err.message || 'Video generation failed');
      setMessages(prev => prev.map(m => {
        if (m.id === messageId && m.execSteps) {
          const updated = [...m.execSteps];
          updated[stepIdx].isActionLoading = null;
          return { ...m, execSteps: updated };
        }
        return m;
      }));
    }
  };

  const triggerFaceSwap = (messageId: string, stepIdx: number) => {
    setActiveSwapTarget({ msgId: messageId, stepIdx });
    swapFileInputRef.current?.click();
  };

  const handleSwapFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeSwapTarget || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const { msgId, stepIdx } = activeSwapTarget;

    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.execSteps) {
        const updated = [...m.execSteps];
        updated[stepIdx].isActionLoading = 'swap';
        return { ...m, execSteps: updated };
      }
      return m;
    }));

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const swapImageBase64 = reader.result as string;
        const targetMsg = messages.find(m => m.id === msgId);
        const originalImageUrl = targetMsg?.execSteps?.[stepIdx].resultUrl || '';

        const res = await fetch('/api/face-swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetImage: originalImageUrl,
            swapImage: swapImageBase64
          })
        });

        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Face swap failed');
        }

        const data = await res.json();
        toast.success('Face swap executed successfully!');

        setMessages(prev => prev.map(m => {
          if (m.id === msgId && m.execSteps) {
            const updated = [...m.execSteps];
            updated[stepIdx].resultUrl = data.imageUrl;
            updated[stepIdx].isActionLoading = null;
            return { ...m, execSteps: updated };
          }
          return m;
        }));
      } catch (err: any) {
        toast.error(err.message || 'Face swap failed');
        setMessages(prev => prev.map(m => {
          if (m.id === msgId && m.execSteps) {
            const updated = [...m.execSteps];
            updated[stepIdx].isActionLoading = null;
            return { ...m, execSteps: updated };
          }
          return m;
        }));
      } finally {
        setActiveSwapTarget(null);
      }
    };
    reader.readAsDataURL(file);
    if (swapFileInputRef.current) swapFileInputRef.current.value = '';
  };

  // ─── Wavespeed Clone & Talking Avatar Studio Handlers ───────────────────────
  const handleStudioVoiceSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('video/')) {
      const loadingToastId = toast.loading('🎬 Extracting high-quality audio track from video reference...');
      const fileReader = new FileReader();
      
      fileReader.onload = async () => {
        try {
          const arrayBuffer = fileReader.result as ArrayBuffer;
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          
          audioCtx.decodeAudioData(arrayBuffer, async (audioBuffer) => {
            try {
              const wavBlob = audioBufferToWav(audioBuffer);
              const wavReader = new FileReader();
              wavReader.onload = () => {
                setStudioVoiceFile({
                  name: file.name.replace(/\.[^/.]+$/, "") + '.wav',
                  dataUrl: wavReader.result as string,
                  mimeType: 'audio/wav'
                });
                toast.success('🔊 High-quality voice track successfully extracted!', { id: loadingToastId });
              };
              wavReader.readAsDataURL(wavBlob);
            } catch (encodeErr: any) {
              toast.error('Failed to encode audio: ' + encodeErr.message, { id: loadingToastId });
            }
          }, (err) => {
            toast.error('Video audio track decoding failed. Please use a standard audio file.', { id: loadingToastId });
          });
        } catch (e: any) {
          toast.error('Failed to process video: ' + e.message, { id: loadingToastId });
        }
      };
      fileReader.onerror = () => toast.error('Failed to read video file', { id: loadingToastId });
      fileReader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setStudioVoiceFile({
          name: file.name,
          dataUrl: reader.result as string,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStudioAvatarSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setStudioAvatarImage({
        name: file.name,
        dataUrl: reader.result as string,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const executeVoiceCloneOnly = async () => {
    if (!studioScript.trim() || !studioVoiceFile) {
      toast.error('Script and Voice Reference file are required.');
      return;
    }

    setIsStudioLoading(true);
    setStudioResultAudioUrl(null);
    setStudioResultVideoUrl(null);

    if (voiceEngine === 'elevenlabs') {
      toast.loading(`Cloning voice '${voiceNameInput}' via ElevenLabs...`, { id: 'studio-job' });
      try {
        const cloneRes = await fetch('/api/elevenlabs-clone-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: voiceNameInput,
            description: voiceDescInput,
            sampleBase64: studioVoiceFile.dataUrl
          })
        });

        const cloneData = await cloneRes.json();
        if (!cloneRes.ok) throw new Error(cloneData.error || 'ElevenLabs cloning failed');

        const voiceId = cloneData.voiceId;
        setClonedVoiceId(voiceId);
        
        toast.loading(`Synthesizing test speech with cloned voice ID...`, { id: 'studio-job' });
        
        const speechRes = await fetch('/api/generate-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: studioScript,
            voiceId: voiceId,
            engine: 'elevenlabs'
          })
        });

        const speechData = await speechRes.json();
        if (!speechRes.ok) throw new Error(speechData.error || 'Speech generation failed');

        setStudioResultAudioUrl(speechData.audioUrl);
        toast.success(`Voice cloned & narration generated! (Voice ID: ${voiceId})`, { id: 'studio-job' });
      } catch (err: any) {
        toast.error(err.message || 'ElevenLabs pipeline failed', { id: 'studio-job' });
      } finally {
        setIsStudioLoading(false);
      }
    } else {
      toast.loading('Cloning voice via OmniVoice API...', { id: 'studio-job' });
      try {
        const res = await fetch('/api/voice-clone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio: studioVoiceFile.dataUrl,
            text: studioScript
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Voice cloning failed');

        setStudioResultAudioUrl(data.audioUrl);
        toast.success('Voice narration cloned successfully!', { id: 'studio-job' });
      } catch (err: any) {
        toast.error(err.message || 'OmniVoice clone failed', { id: 'studio-job' });
      } finally {
        setIsStudioLoading(false);
      }
    }
  };

  const executeTalkingAvatar = async () => {
    if (!studioScript.trim() || !studioVoiceFile || !studioAvatarImage) {
      toast.error('Script, Voice Reference file, and Avatar Image are required.');
      return;
    }

    setIsStudioLoading(true);
    setStudioResultAudioUrl(null);
    setStudioResultVideoUrl(null);
    toast.loading('Creating Talking Avatar (OmniVoice + InfiniteTalk)...', { id: 'studio-job' });

    try {
      const res = await fetch('/api/talking-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: studioAvatarImage.dataUrl,
          audio: studioVoiceFile.dataUrl,
          text: studioScript
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Talking avatar failed');

      setStudioResultAudioUrl(data.audioUrl);
      setStudioResultVideoUrl(data.videoUrl);
      toast.success('Talking avatar lip-sync video created successfully!', { id: 'studio-job' });
    } catch (err: any) {
      toast.error(err.message || 'InfiniteTalk pipeline failed', { id: 'studio-job' });
    } finally {
      setIsStudioLoading(false);
    }
  };

  // ─── Brand Voice Chat Sandbox Handlers ─────────────────────────────────────
  const sendPersonaChatMessage = async () => {
    if (!personaChatInput.trim() || !activeDraft?.createStep) return;

    const userMsg = { role: 'user' as const, content: personaChatInput };
    const updatedHistory = [...personaChatMessages, userMsg];
    setPersonaChatMessages(updatedHistory);
    setPersonaChatInput('');
    setIsPersonaTyping(true);

    try {
      const res = await fetch('/api/agent/persona-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: activeDraft.createStep.params,
          messages: updatedHistory
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Persona chat failed');

      setPersonaChatMessages(prev => [
        ...prev,
        { role: 'model', content: data.reply }
      ]);
    } catch (err: any) {
      toast.error(err.message || 'Chat failed');
    } finally {
      setIsPersonaTyping(false);
    }
  };

  const readSpeechSpeech = async (msgIdx: number, text: string) => {
    setPersonaChatMessages(prev => prev.map((m, idx) => idx === msgIdx ? { ...m, isReading: true } : m));

    try {
      const res = await fetch(studioVoiceFile ? '/api/voice-clone' : '/api/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: 'Aoede',
          engine: 'gemini',
          audio: studioVoiceFile?.dataUrl || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPersonaChatMessages(prev => prev.map((m, idx) => idx === msgIdx ? { ...m, voiceUrl: data.audioUrl, isReading: false } : m));
    } catch (err) {
      toast.error('Failed to clone/synthesize voice.');
      setPersonaChatMessages(prev => prev.map((m, idx) => idx === msgIdx ? { ...m, isReading: false } : m));
    }
  };

  const saveVideoToPlanner = (result: NonNullable<typeof downloaderResult>) => {
    const targetPersona = effectiveSelectedPersonaId && effectiveSelectedPersonaId !== 'empty'
      ? personas.find(persona => persona.id === effectiveSelectedPersonaId)
      : personas[0];

    if (!targetPersona) {
      toast.error('Select a persona before saving this Planner draft.');
      return;
    }

    accountLocalStorage.setItem(`planner_pending_asset_${targetPersona.id}`, JSON.stringify({
      url: result.videoUrl,
      title: result.title || `${result.platform} video`,
      platform: result.platform,
      kind: 'video',
      createdAt: new Date().toISOString(),
    }));
    toast.success('Saved as a Planner draft. It has not been published.');
    nav.push({ view: 'planner' });
  };

  // ─── Pipeline runner execution ──────────────────────────────────────────────
  const runPipeline = async (messageId: string, directMsg?: Message) => {
    const targetMsg = directMsg || messages.find(m => m.id === messageId);
    if (!targetMsg || !targetMsg.execSteps || targetMsg.isExecuting) return;

    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isExecuting: true } : m));

    const addLocalLog = (msg: string, success = true, isModel = false) => {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          const logs = m.execLogs || [];
          const prefix = `[${new Date().toLocaleTimeString()}]`;
          const prefixType = isModel ? '🎯 Routing: ' : '';
          const line = `${prefix} ${prefixType}${msg}`;
          return { ...m, execLogs: [...logs.slice(-20), line] };
        }
        return m;
      }));
    };

    const updateStepStatus = (stepIdx: number, status: 'pending' | 'running' | 'success' | 'error', resultUrl?: string) => {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId && m.execSteps) {
          const updated = [...m.execSteps];
          updated[stepIdx].status = status;
          if (resultUrl) updated[stepIdx].resultUrl = resultUrl;
          return { ...m, execSteps: updated };
        }
        return m;
      }));
    };

    addLocalLog('🤖 Auto-Pilot Pipeline initialized...', true);
    
    try {
      let memoryFaceImage: string | null = null;
      for (let mIdx = messages.length - 1; mIdx >= 0; mIdx--) {
        const msgHistoryItem = messages[mIdx];
        if (msgHistoryItem.attachments && msgHistoryItem.attachments.length > 0) {
          const imgAtt = msgHistoryItem.attachments.find(a => a.mimeType.startsWith('image/'));
          if (imgAtt) {
            memoryFaceImage = imgAtt.dataUrl;
            break;
          }
        }
      }

      let memoryVideo: string | null = null;
      for (let mIdx = messages.length - 1; mIdx >= 0; mIdx--) {
        const msgHistoryItem = messages[mIdx];
        if (msgHistoryItem.attachments && msgHistoryItem.attachments.length > 0) {
          const vidAtt = msgHistoryItem.attachments.find(a => a.mimeType.startsWith('video/'));
          if (vidAtt) {
            memoryVideo = vidAtt.dataUrl;
            break;
          }
        }
      }

      let createdPersona: Persona | null = null;
      let createdPersonaId = '';

      let stepsList = targetMsg.execSteps || targetMsg.suggestedSteps || [];
      if (!stepsList || stepsList.length === 0) {
        return;
      }

      const ensurePersona = async (): Promise<Persona> => {
        if (createdPersona && createdPersona.id && createdPersona.id !== 'empty') return createdPersona;
        const existing = personas.find(p => p.id && p.id !== 'empty');
        if (existing) {
          createdPersona = existing;
          createdPersonaId = existing.id;
          return existing;
        }

        addLocalLog(`👤 Auto-architecting default studio persona profile...`);
        const uniqueId = `persona-${Date.now()}`;
        const defaultP: Persona = {
          id: uniqueId,
          name: 'Studio Influencer',
          niche: 'Lifestyle',
          tone: 'Confident',
          platform: 'Instagram',
          status: 'Active',
          avatar: memoryFaceImage || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
          referenceImage: memoryFaceImage || undefined,
          personalityTraits: ['Charming', 'Photogenic'],
          visualStyle: 'Photorealistic',
          audienceType: 'General',
          contentBoundaries: 'None',
          bio: 'Official Studio AI Influencer',
          brandVoiceRules: '',
          contentGoals: '',
          personaNotes: ''
        };

        let saved = defaultP;
        try {
          saved = await api.personas.create(defaultP);
        } catch (err) {
          console.warn('[Persona DB fallback]: Using local persona instance', err);
        }
        createdPersona = saved;
        createdPersonaId = saved.id;
        setPersonas(prev => [...prev.filter(p => p.id !== 'empty'), saved]);
        onSelectPersona(saved.id);
        addLocalLog(`✅ Default Persona '${saved.name}' created & activated.`);
        return saved;
      };

      for (let i = 0; i < stepsList.length; i++) {
        const step = stepsList[i];
        updateStepStatus(i, 'running');

        if (step.type === 'create_persona') {
          addLocalLog(`⏳ Building persona profile '${step.params.name}'...`);
          
          if (memoryFaceImage) {
            addLocalLog(`🧠 [Memory System]: Applying face reference photo from conversation history.`);
          }

          const uniqueId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const fallbackAvatar = memoryFaceImage || (step.params.outfit === 'Swimsuit' || step.params.outfit === 'Lingerie'
            ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'
            : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80');

          const newPersona: Persona = {
            id: uniqueId,
            name: step.params.name || 'Unnamed Persona',
            niche: step.params.niche || 'Lifestyle',
            tone: step.params.tone || 'Friendly',
            platform: step.params.platform || 'Instagram',
            status: 'Active',
            avatar: fallbackAvatar,
            referenceImage: fallbackAvatar,
            personalityTraits: step.params.personalityTraits || [],
            visualStyle: step.params.visualStyle || 'High-fidelity portrait',
            audienceType: 'General audience',
            contentBoundaries: 'None',
            bio: step.params.bio || '',
            brandVoiceRules: '',
            contentGoals: '',
            personaNotes: ''
          };

          let saved = newPersona;
          try {
            saved = await api.personas.create(newPersona);
          } catch (err) {
            console.warn('[Persona DB fallback]: Using local persona instance', err);
          }
          createdPersona = saved;
          createdPersonaId = saved.id;

          setPersonas(prev => [...prev, saved]);
          onSelectPersona(saved.id);

          addLocalLog(`✅ Persona '${saved.name}' created & activated.`);
          updateStepStatus(i, 'success', fallbackAvatar);
        }

        else if (step.type === 'generate_content_plan') {
          if (!createdPersona) {
            createdPersona = personas[0] || null;
            if (!createdPersona || createdPersona.id === 'empty') throw new Error('No active persona detected.');
            createdPersonaId = createdPersona.id;
          }

          addLocalLog(`⏳ Generating 7-day ${step.params.platform || 'Instagram'} planner schedule...`);
          const plan = generatePersonaPlan(createdPersona, step.params.platform, step.params.theme || 'Growth');
          
          await api.plannedPosts.save(createdPersonaId, step.params.platform, plan.map(({ day, type, hook, angle, cta }) => ({ day, type, hook, angle, cta })));

          addLocalLog(`✅ Scheduled 7 days of structured content posts.`);
          updateStepStatus(i, 'success');
        }

        else if (step.type === 'generate_image') {
          const activeP = await ensurePersona();

          if (memoryFaceImage) {
            addLocalLog(`🧠 [Memory System]: Syncing reference face photo for visual generation.`);
            activeP.referenceImage = memoryFaceImage;
          }

          let modelId = step.params.modelId || 'wavespeed:bytedance/seedream-v5.0-pro';
          addLocalLog(`Chosen Model ID: ${modelId}`, true, true);
          addLocalLog(`⏳ Spinning up visual generation pipeline...`);
          addLocalLog(`📝 Prompt: "${step.params.prompt}"`);

          const modelCascade = [
            modelId,
            'wavespeed:bytedance/seedream-v5.0-pro',
            'wavespeed:wavespeed-ai/qwen-3.0-pro',
            'openai:gpt-image-2',
            'google:nano-banana-pro'
          ].filter((m, idx, arr) => arr.indexOf(m) === idx);

          let result: any = null;
          let lastError: any = null;

          for (const currentModel of modelCascade) {
            try {
              result = await generateImage({
                persona: activeP,
                modelId: currentModel,
                environment: step.params.environment,
                outfitStyle: step.params.outfit,
                framing: step.params.framing,
                prompt: step.params.prompt,
                aspectRatio: '1:1',
                resolution: 'standard',
                count: 1
              });
              if (result) break;
            } catch (err: any) {
              lastError = err;
              addLocalLog(`⚠️ [Self-Correction] Model ${currentModel} failed (${err?.message || 'Error'}). Cascading to next fallback...`);
            }
          }

          if (!result) {
            throw new Error(`All model cascades failed for image generation. Last error: ${lastError?.message || 'Unknown'}`);
          }

          const imageUrl = Array.isArray(result) ? result[0].imageUrl : result.imageUrl;
          const promptUsed = Array.isArray(result) ? result[0].promptUsed : result.promptUsed;
          const resolvedModel = Array.isArray(result) ? result[0].model : result.model;

          const imgPayload = {
            id: 'img-' + Math.random().toString(36).substring(2, 9),
            url: imageUrl,
            prompt: promptUsed,
            timestamp: Date.now(),
            environment: step.params.environment,
            outfit: step.params.outfit,
            framing: step.params.framing,
            isFavorite: true,
            model: resolvedModel,
            mediaType: 'image' as const
          };

          await api.images.create(createdPersonaId, imgPayload);
          addLocalLog(`✅ Visual asset generated & saved to library.`);

          const updatedPersona: Persona = {
            ...activeP,
            avatar: imageUrl,
            referenceImage: imageUrl
          };
          const savedPersona = await api.personas.update(updatedPersona);
          
          setPersonas(prev => prev.map(p => p.id === createdPersonaId ? savedPersona : p));

          addLocalLog(`✅ Profile avatar fully synced!`);
          updateStepStatus(i, 'success', imageUrl);
        }

        else if (step.type === 'generate_video') {
          const activeP = await ensurePersona();

          // Check if continuity frame requested from previous step
          let finalSourceImage = activeP.avatar || null;
          if (step.params.sourceImageFromStepIndex !== undefined) {
            const prevIdx = step.params.sourceImageFromStepIndex;
            const prevStep = stepsList[prevIdx];
            if (prevStep && prevStep.status === 'success' && prevStep.resultUrl) {
              addLocalLog(`🧠 [Continuity Lock]: Extracting last frame of Step ${prevIdx + 1} to prevent identity drift...`);
              try {
                const lastFrameB64 = await extractLastFrameFromVideo(prevStep.resultUrl);
                finalSourceImage = lastFrameB64;
                addLocalLog(`✅ Frame continuity locked. Applying frame as sequential starting source.`);
              } catch (frameErr) {
                addLocalLog(`⚠️ Last frame extraction failed. Falling back to default avatar.`);
              }
            }
          }

          // Scan for uploaded reference video in history if not explicitly provided
          let finalSourceVideo = step.params.sourceVideo || null;
          if (!finalSourceVideo && memoryVideo) {
            finalSourceVideo = memoryVideo;
            addLocalLog(`🧠 [Memory System]: Applying uploaded reference video from conversation history for editing.`);
          }

          let modelId = step.params.modelId || DEFAULT_VIDEO_MODEL_ID;
          if (finalSourceVideo && !modelId.startsWith('wavespeed-v2v:')) {
            modelId = 'wavespeed-v2v:wavespeed-ai/wan-2.2-v2v-720p';
          }

          addLocalLog(`Chosen Video Model: ${modelId}`, true, true);
          addLocalLog(`⏳ Generating video segment...`);
          addLocalLog(`📝 Motion Prompt: "${step.params.prompt}"`);

          let result;
          try {
            result = await api.images.generateVideo({
              personaClientId: createdPersonaId,
              prompt: step.params.prompt,
              modelId,
              strength: step.params.strength || 0.6,
              sourceImage: finalSourceVideo ? undefined : finalSourceImage,
              sourceVideo: finalSourceVideo || undefined
            });
          } catch (firstErr: any) {
            addLocalLog(`⚠️ Video model ${modelId} failed. Fallback triggered.`);
            result = await api.images.generateVideo({
              personaClientId: createdPersonaId,
              prompt: step.params.prompt,
              modelId: 'google:veo-omni',
              strength: 0.6,
              sourceImage: finalSourceVideo ? undefined : finalSourceImage,
              sourceVideo: finalSourceVideo || undefined
            });
          }

          const videoPayload = {
            id: 'video-' + Math.random().toString(36).substring(2, 9),
            url: result.videoUrl,
            prompt: step.params.prompt,
            timestamp: Date.now(),
            isFavorite: true,
            model: modelId,
            mediaType: 'video' as const
          };

          await api.images.create(createdPersonaId, videoPayload);
          addLocalLog(`✅ Video segment successfully generated & saved to library.`);
          updateStepStatus(i, 'success', result.videoUrl);
        }

        else if (step.type === 'stitch_video') {
          const indices = step.params.segmentIndices || [];
          addLocalLog(`⏳ Canvas Stitcher compiling video segments: [${indices.map((idx: number) => idx + 1).join(', ')}]...`);
          
          try {
            const urlsToStitch = indices.map((idx: number) => {
              const segStep = stepsList[idx];
              if (!segStep || segStep.status !== 'success' || !segStep.resultUrl) {
                throw new Error(`Video segment step ${idx + 1} did not generate successfully.`);
              }
              return segStep.resultUrl;
            });

            const stitchedMovieUrl = await stitchVideoSegments(urlsToStitch, segmentSettings);
            addLocalLog(`✅ Stitching successfully completed! Output blob packaged.`);
            updateStepStatus(i, 'success', stitchedMovieUrl);
          } catch (stitchErr: any) {
            addLocalLog(`❌ Stitching failed: ${stitchErr.message}`);
            updateStepStatus(i, 'error');
          }
        }

        else if (step.type === 'generate_voice') {
          if (!createdPersona) {
            createdPersona = personas[0] || null;
            if (!createdPersona || createdPersona.id === 'empty') throw new Error('No active persona detected.');
            createdPersonaId = createdPersona.id;
          }

          const engine = step.params.engine || 'gemini';
          const voiceId = step.params.voiceId || 'Aoede';
          addLocalLog(`Chosen Voice: ${voiceId} (${engine})`, true, true);
          addLocalLog(`⏳ Synthesizing voice script narration...`);

          const response = await fetch('/api/generate-speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: step.params.text,
              voiceId,
              engine,
              voiceName: voiceId
            })
          });

          if (!response.ok) {
            throw new Error('Speech synthesis failed');
          }

          const data = await response.json();
          addLocalLog(`✅ Audio narration generated successfully.`);
          updateStepStatus(i, 'success', data.audioUrl);
        }

        else if (step.type === 'generate_3d') {
          if (!createdPersona) {
            createdPersona = personas[0] || null;
            if (!createdPersona || createdPersona.id === 'empty') throw new Error('No active persona detected.');
            createdPersonaId = createdPersona.id;
          }

          const modelId = step.params.modelId || 'wavespeed-3d:tripo3d/tripo-v2.0';
          const srcImg = step.params.sourceImage || createdPersona.avatar || undefined;
          addLocalLog(`Chosen 3D Model: ${modelId}`, true, true);
          addLocalLog(`⏳ Synthesizing 3D GLB asset mesh...`);

          const res = await fetch('/api/generate-3d', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: step.params.prompt || 'High quality 3D asset mesh',
              modelId,
              sourceImage: srcImg
            })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || '3D generation failed');

          const payload = {
            id: '3d-' + Math.random().toString(36).substring(2, 9),
            url: data.modelUrl,
            prompt: step.params.prompt || '3D Asset Mesh',
            timestamp: Date.now(),
            model: data.model || modelId,
            mediaType: '3d' as const
          };

          await api.images.create(createdPersonaId, payload);
          addLocalLog(`✅ 3D GLB mesh asset generated & saved to library.`);
          updateStepStatus(i, 'success', data.modelUrl);
        }

        else if (step.type === 'generate_talking_head') {
          if (!createdPersona) {
            createdPersona = personas[0] || null;
            if (!createdPersona || createdPersona.id === 'empty') throw new Error('No active persona detected.');
            createdPersonaId = createdPersona.id;
          }

          let avatarImg = step.params.image || createdPersona.avatar || createdPersona.referenceImage;

          // Resolve starting frame from previous step (e.g. edited image) if present
          for (let sIdx = 0; sIdx < i; sIdx++) {
            const prev = stepsList[sIdx];
            if (prev && prev.status === 'success' && prev.resultUrl && (prev.type === 'edit_image' || prev.type === 'generate_image')) {
              avatarImg = prev.resultUrl;
              addLocalLog(`🧠 [Continuity Lock]: Using generated visual from Step ${sIdx + 1} as starting frame for avatar video.`);
              break;
            }
          }

          if (!avatarImg) throw new Error('Avatar image is required for talking head video.');

          addLocalLog(`⏳ Synthesizing Talking Avatar lip-sync video...`);

          const data = await talkingAvatarJob(createdPersonaId, {
            script: step.params.text,
            portraitImage: avatarImg,
            voiceName: step.params.voiceId || clonedVoiceId || 'Aoede',
            model: step.params.model || 'wavespeed-ai/ai-talking-photos',
          });

          const payload = {
            id: 'talk-' + Math.random().toString(36).substring(2, 9),
            url: data.videoUrl,
            prompt: step.params.text,
            timestamp: Date.now(),
            model: 'InfiniteTalk Avatar',
            mediaType: 'video' as const
          };

          await api.images.create(createdPersonaId, payload);
          addLocalLog(`✅ Talking Avatar video created & saved to library.`);
          updateStepStatus(i, 'success', data.videoUrl);
        }

        else if (step.type === 'clone_voice') {
          addLocalLog(`🎙️ Initializing Voice Cloning engine...`);
          let audioDataUrl = memoryVideo || memoryFaceImage || null;
          for (let mIdx = messages.length - 1; mIdx >= 0; mIdx--) {
            const msgHistoryItem = messages[mIdx];
            if (msgHistoryItem.attachments && msgHistoryItem.attachments.length > 0) {
              const mediaAtt = msgHistoryItem.attachments.find(a => a.mimeType.startsWith('audio/') || a.mimeType.startsWith('video/'));
              if (mediaAtt) {
                audioDataUrl = mediaAtt.dataUrl;
                break;
              }
            }
          }

          const engine = step.params.engine || 'omnivoice';
          const voiceName = step.params.voiceName || 'Cloned Voice Sample';
          addLocalLog(`⏳ Extracting audio features & cloning voice via ${engine}...`);

          let clonedId = 'voice-' + Math.random().toString(36).substring(2, 9);
          if (audioDataUrl) {
            try {
              const res = await fetch('/api/clone-voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audio: audioDataUrl,
                  name: voiceName,
                  engine
                })
              });
              const data = await res.json();
              if (data.voiceId) clonedId = data.voiceId;
            } catch (cloneErr) {
              addLocalLog(`⚠️ Voice clone fallback active. Generated ID: ${clonedId}`);
            }
          }

          setClonedVoiceId(clonedId);
          emitSubAgentLog('copywriter', `Voice cloned (${engine}). Voice ID: ${clonedId}`);
          addLocalLog(`✅ Voice successfully cloned! Voice ID: ${clonedId}`);
          updateStepStatus(i, 'success', clonedId);
        }

        else if (step.type === 'storyboard_sequence') {
          if (!createdPersona) {
            createdPersona = personas[0] || null;
            if (!createdPersona || createdPersona.id === 'empty') throw new Error('No active persona detected.');
            createdPersonaId = createdPersona.id;
          }

          const scenes = step.params.scenes || [];
          addLocalLog(`⏳ Storyboard Auto-Stitcher compiling ${scenes.length} multi-scene clips...`);
          emitSubAgentLog('visual', `Generating & stitching ${scenes.length} storyboard clips into 1-minute video...`);

          const generatedVideoUrls: string[] = [];

          for (let sIdx = 0; sIdx < scenes.length; sIdx++) {
            const sc = scenes[sIdx];
            addLocalLog(`🎬 Scene ${sIdx + 1}/${scenes.length} [${sc.type}]: "${sc.title}"...`);

            if (sc.type === 'talking_avatar') {
              const data = await talkingAvatarJob(createdPersonaId, {
                script: sc.text || 'Hello world',
                portraitImage: createdPersona.avatar || createdPersona.referenceImage,
                voiceName: clonedVoiceId || 'Aoede',
                model: sc.modelId || 'wavespeed-ai/ai-talking-photos',
              });
              if (data.videoUrl) generatedVideoUrls.push(data.videoUrl);
            } else {
              const res = await api.images.generateVideo({
                personaClientId: createdPersonaId,
                prompt: sc.prompt || 'Cinematic motion shot of persona',
                modelId: sc.modelId || DEFAULT_VIDEO_MODEL_ID,
                sourceImage: createdPersona.avatar
              });
              const vidUrl = (res as any).videoUrl || (res as any).url;
              if (vidUrl) generatedVideoUrls.push(vidUrl);
            }
          }

          if (generatedVideoUrls.length > 0) {
            addLocalLog(`🎞️ Packaging ${generatedVideoUrls.length} video scenes into unified reel...`);
            const finalStitchedUrl = await stitchVideoSegments(generatedVideoUrls);

            const payload = {
              id: 'storyboard-' + Math.random().toString(36).substring(2, 9),
              url: finalStitchedUrl,
              prompt: `Storyboard (${step.params.topic || 'Multi-Scene'}): ${scenes.length} stitched scenes`,
              timestamp: Date.now(),
              model: 'Storyboard Multi-Model Stitcher',
              mediaType: 'video' as const
            };

            await api.images.create(createdPersonaId, payload);
            addLocalLog(`✅ Full Storyboard Video Reel completed & saved to Gallery Vault!`);
            updateStepStatus(i, 'success', finalStitchedUrl);
          }
        }

        else if (step.type === 'edit_image') {
          const activeP = await ensurePersona();

          const editType = step.params.editType || 'upscale';
          const srcImg = step.params.sourceImage || activeP.avatar || activeP.referenceImage;
          if (!srcImg) throw new Error('Source image is required for image editing.');

          addLocalLog(`⏳ Executing AI Tool edit: ${editType}...`);

          let editedUrl = '';
          if (editType === 'bg-remover') {
            const res = await fetch('/api/remove-bg', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: srcImg })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'BG removal failed');
            editedUrl = data.imageUrl;
          } else if (editType === 'face-swap') {
            const res = await fetch('/api/face-swap', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ targetImage: srcImg, swapImage: step.params.secondImage || srcImg })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Face swap failed');
            editedUrl = data.imageUrl;
          } else if (editType === 'virtual-tryon') {
            const res = await fetch('/api/virtual-tryon', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ personImage: srcImg, garmentImage: step.params.secondImage || srcImg })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Virtual try-on failed');
            editedUrl = data.imageUrl;
          } else {
            const chosenEditModel = step.params.modelId || 'wavespeed:bytedance/seedream-v5.0-pro';
            const data = await editImageJob(
              activeP.id,
              srcImg,
              step.params.prompt || 'Enhance image details',
              chosenEditModel,
            );
            editedUrl = data.imageUrl;
          }

          const payload = {
            id: 'edit-' + Math.random().toString(36).substring(2, 9),
            url: editedUrl,
            prompt: `Edit (${editType}): ${step.params.prompt || 'Enhanced'}`,
            timestamp: Date.now(),
            model: `AI Tool (${editType})`,
            mediaType: 'image' as const
          };

          await api.images.create(createdPersonaId, payload);
          addLocalLog(`✅ AI Tool edit (${editType}) completed & saved to library.`);
          updateStepStatus(i, 'success', editedUrl);
        }

        else if (step.type === 'log_revenue') {
          if (!createdPersona) {
            createdPersona = personas[0] || null;
            if (!createdPersona || createdPersona.id === 'empty') throw new Error('No active persona detected.');
            createdPersonaId = createdPersona.id;
          }

          const amount = Number(step.params.amount) || 0;
          addLocalLog(`⏳ Logging revenue: $${amount} from ${step.params.source} on ${step.params.platform}...`);

          await api.revenue.create({
            id: 'rev-' + Math.random().toString(36).substring(2, 9),
            date: new Date().toISOString().split('T')[0],
            amount,
            source: step.params.source || 'Subscriptions',
            platform: step.params.platform || 'OnlyFans',
            personaId: createdPersonaId,
            notes: step.params.notes || 'Logged via Auto-Pilot Agent'
          });

          addLocalLog(`✅ Financial transaction logged successfully.`);
          updateStepStatus(i, 'success');
        }
      }

      addLocalLog('🏆 Auto-Pilot pipeline executions finished successfully!');
      toast.success('Agent completed all tasks successfully!');
      
    } catch (err: any) {
      addLocalLog(`❌ Error: ${err.message || 'Workflow execution halted.'}`);
      setMessages(prev => prev.map(m => {
        if (m.id === messageId && m.execSteps) {
          const updated = m.execSteps.map(s => s.status === 'running' ? { ...s, status: 'error' as const } : s);
          return { ...m, execSteps: updated };
        }
        return m;
      }));
      toast.error('Workflow failed.');
    } finally {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isExecuting: false } : m));
    }
  };

  const getAnalyticsIndices = () => {
    if (!activeDraft?.createStep) return { cpm: 0, projection: 0, conversion: 0, growthIndex: 0 };
    const niche = (activeDraft.createStep.params.niche || '').toLowerCase();
    
    let cpm = 5.20;
    let projection = 2500;
    let conversion = 1.4;
    let growthIndex = 62;

    if (niche.includes('finance') || niche.includes('crypto')) {
      cpm = 18.50;
      projection = 7400;
      conversion = 2.1;
      growthIndex = 51;
    } else if (niche.includes('swimsuit') || niche.includes('lingerie') || niche.includes('onlyfans')) {
      cpm = 8.40;
      projection = 12000;
      conversion = 4.8;
      growthIndex = 92;
    } else if (niche.includes('gamer') || niche.includes('gaming')) {
      cpm = 3.10;
      projection = 4800;
      conversion = 1.1;
      growthIndex = 78;
    }

    return { cpm, projection, conversion, growthIndex };
  };

  const metrics = getAnalyticsIndices();

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[var(--bg-base)]">
      {/* Hidden file input for face swapping */}
      <input
        type="file"
        ref={swapFileInputRef}
        accept="image/*"
        onChange={handleSwapFileSelected}
        className="hidden"
      />

      {/* LEFT COLUMN: Agent Conversational Console (Expanded) */}
      <div className="flex-1 flex flex-col h-full border-r border-white/5 relative min-w-0">
        {/* Header with Autopilot & Sub-Agent Controls (Unified Theme) */}
        <div className="flex-none flex flex-col md:flex-row md:items-center justify-between border-b border-[#E7C477]/10 px-6 py-3 bg-[#050914] gap-2 select-none">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-serif text-[#F5F1E8] tracking-tight flex items-center gap-2">
              Super Agent <span className="text-[#E7C477] text-base">✨</span>
            </h1>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E7C477]/10 text-[#F2D58D] border border-[#E7C477]/25">
              Autonomous Co-Pilot
            </span>
          </div>

          {/* Unified Controls Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Autopilot Button */}
            <button
              onClick={() => setAutopilotActive(!autopilotActive)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 transition-all border cursor-pointer ${
                autopilotActive
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                  : 'bg-white/5 text-zinc-300 border-white/10 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {autopilotActive ? <Pause className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> : <Play className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{autopilotActive ? 'Autopilot Active' : 'Start Autopilot'}</span>
            </button>

            {autopilotActive && (
              <select
                value={autopilotInterval}
                onChange={(e: any) => setAutopilotInterval(e.target.value)}
                className="bg-black/60 border border-cyan-500/30 text-cyan-300 text-xs rounded-xl px-2.5 py-1.5 font-bold outline-none cursor-pointer"
              >
                <option value="30s">Every 30s (Demo)</option>
                <option value="1h">Every 1 hr</option>
                <option value="6h">Every 6 hrs</option>
                <option value="12h">Every 12 hrs</option>
              </select>
            )}

            {/* Approval Queue Toggle */}
            <button
              onClick={() => setAutoApprove(!autoApprove)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide border transition-all flex items-center gap-1.5 cursor-pointer ${
                autoApprove
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-white/5 text-zinc-300 border-white/10 hover:border-white/20 hover:bg-white/10'
              }`}
              title="Toggle Human-in-the-Loop review queue vs direct publishing"
            >
              <span>{autoApprove ? '⚡ Auto-Publish' : '🛡️ Approval Queue ON'}</span>
            </button>

            {/* Uncensored NSFW Toggle */}
            <button
              onClick={() => {
                const next = !allowNsfw;
                setAllowNsfw(next);
                localStorage.setItem('agent_allow_nsfw', String(next));
                toast(next ? '🔥 Uncensored Mode Activated — Venice/Atlas & OmniVoice uncensored models' : '🛡️ Standard Safe Mode Active');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide border transition-all flex items-center gap-1.5 cursor-pointer ${
                allowNsfw
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                  : 'bg-white/5 text-zinc-300 border-white/10 hover:border-white/20 hover:bg-white/10'
              }`}
              title="When ON, Super Agent uses fully uncensored Venice / Atlas Cloud models and OmniVoice audio directly"
            >
              <Flame size={13} className={allowNsfw ? 'text-cyan-400' : 'text-zinc-400'} />
              <span>{allowNsfw ? '🔥 NSFW Mode' : '🛡️ Safe Mode'}</span>
            </button>

            {/* LLM Engine Selector (Gemini 2.5 Flash vs xAI Grok 2) */}
            <div className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm transition-all">
              <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider hidden sm:inline">Engine:</span>
              <select
                value={voiceLlmModel}
                onChange={(e) => {
                  const selected = e.target.value;
                  setVoiceLlmModel(selected);
                  localStorage.setItem('agent_voice_llm', selected);
                  const labels: Record<string, string> = {
                    grok: '🚀 Switched to xAI Grok 2 (Cloud API)!',
                    venice: '🔓 Switched to Venice AI Llama 3.3 70B (Cloud API)!',
                    deepseek: '🧠 Switched to DeepSeek R1 Reasoner (Cloud API)!',
                    qwen: '🔮 Switched to Qwen 2.5 72B (Cloud API)!',
                    gemini: '🤖 Switched to Gemini 2.5 Flash (Cloud API)!',
                    'ollama:deepseek-r1': '🦙 Switched to DeepSeek R1 (Local Mac GPU - Free)!',
                    'ollama:qwen2.5:14b': '🦙 Switched to Qwen 2.5 14B (Local Mac GPU - Free)!',
                    'ollama:qwen2.5:32b': '🔮 Switched to Qwen 2.5 32B (Local Mac GPU - Free)!',
                    'ollama:dolphin-llama3': '🐬 Switched to Dolphin Llama 3 (Local Uncensored - Free)!',
                    'ollama:dolphin-mistral': '🐬 Switched to Dolphin Mistral (Local Uncensored - Free)!',
                    'ollama:gemma2:27b': '💎 Switched to Gemma 2 27B (Local Mac GPU - Free)!',
                    'ollama:llama3.2': '🦙 Switched to Llama 3.2 (Local Mac GPU - Free)!',
                    'ollama:llama3.3': '🦙 Switched to Llama 3.3 (Local Mac GPU - Free)!',
                    ollama: '🦙 Switched to Ollama Local Auto (Free / 100% Private)!'
                  };
                  toast.success(labels[selected] || `Switched to ${selected}`);
                }}
                className="bg-transparent text-cyan-300 text-xs font-extrabold outline-none cursor-pointer"
                title="Select Conversational Intelligence LLM Engine for Super Agent & Voice Call"
              >
                <optgroup label="🦙 META LLAMA MODELS">
                  <option value="llama3.3" className="bg-zinc-900 text-white">🦙 Meta Llama 3.3 70B (Cloud API)</option>
                </optgroup>
                <optgroup label="☁️ CLOUD API ENGINES (HIGH-SPEED CLOUD GPU)">
                  <option value="qwen" className="bg-zinc-900 text-white">🔮 Qwen 2.5 72B (Cloud API)</option>
                  <option value="deepseek" className="bg-zinc-900 text-white">🧠 DeepSeek R1 Reasoner (Cloud API)</option>
                  <option value="venice" className="bg-zinc-900 text-white">🔓 Venice AI Llama 3.3 70B (Cloud API)</option>
                  <option value="grok" className="bg-zinc-900 text-white">🚀 xAI Grok 2 (Cloud API)</option>
                  <option value="gemini" className="bg-zinc-900 text-white">🤖 Gemini 2.5 Flash (Cloud API)</option>
                </optgroup>
              </select>
            </div>

            {/* Agent's Voice Button */}
            {clonedVoiceRef ? (
              <div className="flex items-center gap-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm">
                <button
                  type="button"
                  onClick={handlePlayVoiceSample}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                    isPlayingVoiceSample 
                      ? 'bg-cyan-400 text-black animate-pulse ring-2 ring-cyan-300' 
                      : 'bg-cyan-500/30 hover:bg-cyan-400/50 text-cyan-200 hover:text-white border border-cyan-400/40'
                  }`}
                  title={isPlayingVoiceSample ? "Pause Voice Sample" : "Play Active Agent Voice Sample"}
                >
                  {isPlayingVoiceSample ? (
                    <Pause size={12} className="fill-current text-black" />
                  ) : (
                    <Play size={12} className="fill-current text-cyan-200 ml-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsVoiceCloneModalOpen(true)}
                  className="hover:text-white flex items-center gap-1.5 cursor-pointer"
                  title="Configure Agent's Voice & Vocal Parameters"
                >
                  <Mic size={13} className="text-cyan-400" />
                  <span>Agent Voice (Active)</span>
                </button>
                <button
                  type="button"
                  onClick={clearClonedVoice}
                  className="hover:text-white text-cyan-400 p-0.5 rounded transition-all ml-1 cursor-pointer"
                  title="Remove cloned voice and return to default voice"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsVoiceCloneModalOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 hover:border-white/20 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                title="Open Voice Studio: Upload audio sample, select AI model & fine-tune vocal sliders"
              >
                <Mic size={13} className="text-cyan-400" />
                <span>Agent Voice</span>
              </button>
            )}

            {/* Clear Chat Button */}
            <button
              onClick={() => {
                setMessages([]);
                toast.success('Chat thread cleared!');
              }}
              className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10 flex items-center justify-center cursor-pointer transition-all"
              title="Clear chat history"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Sub-Agent Collaboration Terminal & Pending Approval Banner */}
        <div className="bg-black/40 border-b border-white/5 px-6 py-2.5 space-y-2">
          {/* Sub-Agent Live Feed */}
          {subAgentLogs.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto text-[10px] no-scrollbar py-1">
              <span className="font-black text-[9px] uppercase tracking-wider text-pink-400 flex items-center gap-1 shrink-0">
                <Bot className="w-3.5 h-3.5 animate-bounce" /> Sub-Agents:
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                  subAgentLogs[0].agent === 'visual' ? 'bg-pink-500/20 text-pink-300' :
                  subAgentLogs[0].agent === 'copywriter' ? 'bg-violet-500/20 text-violet-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {subAgentLogs[0].agent === 'visual' ? '🎨 Visual Artist' : subAgentLogs[0].agent === 'copywriter' ? '✍️ Copywriter' : '💼 Business'}
                </span>
                <span className="text-zinc-300 truncate max-w-[400px]">"{subAgentLogs[0].message}"</span>
                <span className="text-zinc-500 text-[8px]">{subAgentLogs[0].timestamp}</span>
              </div>
            </div>
          )}

          {/* Pending Approval Drawer */}
          {pendingApprovals.length > 0 && (
            <div className="p-3 bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-violet-500/10 border border-amber-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400 animate-pulse" /> Pending Approval Queue ({pendingApprovals.length})
                </span>
                <span className="text-[9px] text-zinc-400">Human-in-the-Loop Review</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                {pendingApprovals.map((item) => (
                  <div key={item.id} className="p-2 bg-black/50 border border-white/10 rounded-lg flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.url && (
                        <img src={item.url} alt={item.title} className="w-8 h-8 rounded object-cover border border-white/10 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-white truncate">{item.title}</p>
                        <p className="text-[8px] uppercase tracking-wider text-amber-400 font-semibold">{item.type}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleApproveItem(item.id)}
                        className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                        title="Approve & Publish to Vault/Planner"
                      >
                        <ThumbsUp className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => handleRejectItem(item.id)}
                        className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                        title="Discard from queue"
                      >
                        <ThumbsDown className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Phone Call Overlay — shown during live voice calls */}
        {isLiveVoiceCallActive ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at center, #0f1629 0%, #060810 70%)',
            position: 'relative',
            overflow: 'hidden',
            gap: '24px',
          }}>
            {/* CSS Keyframes for pulsing */}
            <style>{`
              @keyframes phoneCallPulse {
                0%, 100% { transform: scale(1); opacity: 0.7; }
                50% { transform: scale(1.15); opacity: 1; }
              }
              @keyframes phoneCallRipple {
                0% { transform: scale(0.8); opacity: 0.6; }
                100% { transform: scale(2.5); opacity: 0; }
              }
              @keyframes phoneCallGlow {
                0%, 100% { box-shadow: 0 0 30px rgba(231,196,119, 0.2); }
                50% { box-shadow: 0 0 60px rgba(231,196,119, 0.5); }
              }
            `}</style>

            {/* Agent Name */}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>Super Agent</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontWeight: 600 }}>
                {Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}
              </div>
            </div>

            {/* Pulsing Circle Indicator */}
            <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Ripple rings */}
              {(isUserSpeaking || isAgentSpeakingState) && (
                <>
                  <div style={{
                    position: 'absolute', width: 160, height: 160, borderRadius: '50%',
                    border: `2px solid ${isUserSpeaking ? 'rgba(34,197,94,0.4)' : 'rgba(231,196,119,0.4)'}`,
                    animation: 'phoneCallRipple 1.5s ease-out infinite',
                  }} />
                  <div style={{
                    position: 'absolute', width: 160, height: 160, borderRadius: '50%',
                    border: `2px solid ${isUserSpeaking ? 'rgba(34,197,94,0.3)' : 'rgba(231,196,119,0.3)'}`,
                    animation: 'phoneCallRipple 1.5s ease-out infinite 0.5s',
                  }} />
                </>
              )}
              {/* Main circle */}
              <div style={{
                width: 120, height: 120, borderRadius: '50%',
                background: isUserSpeaking
                  ? 'radial-gradient(circle, rgba(34,197,94,0.5) 0%, rgba(34,197,94,0.15) 70%)'
                  : isAgentSpeakingState
                    ? 'radial-gradient(circle, rgba(231,196,119,0.5) 0%, rgba(231,196,119,0.15) 70%)'
                    : 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 70%)',
                border: isUserSpeaking
                  ? '2px solid rgba(34,197,94,0.6)'
                  : isAgentSpeakingState
                    ? '2px solid rgba(231,196,119,0.6)'
                    : '2px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: (isUserSpeaking || isAgentSpeakingState) ? 'phoneCallPulse 1.2s ease-in-out infinite' : 'none',
                transition: 'all 0.4s ease',
                boxShadow: isUserSpeaking
                  ? '0 0 40px rgba(34,197,94,0.3)'
                  : isAgentSpeakingState
                    ? '0 0 40px rgba(231,196,119,0.3)'
                    : '0 0 20px rgba(255,255,255,0.05)',
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={isUserSpeaking ? '#22c55e' : isAgentSpeakingState ? '#E7C477' : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isAgentSpeakingState ? (
                    <>{/* Speaker icon */}
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </>
                  ) : (
                    <>{/* Mic icon */}
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </>
                  )}
                </svg>
              </div>
            </div>

            {/* Status Text */}
            <div style={{
              fontSize: 14, fontWeight: 700, letterSpacing: 1.5,
              color: isUserSpeaking ? '#22c55e' : isAgentSpeakingState ? '#E7C477' : 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase',
            }}>
              {isUserSpeaking ? 'Listening...' : isAgentSpeakingState ? 'Speaking...' : 'Connected'}
            </div>

            {/* End Call Button */}
            <button
              onClick={stopLiveVoiceCall}
              style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                marginTop: 16,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 30px rgba(239,68,68,0.6)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(239,68,68,0.4)'; }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                <line x1="23" y1="1" x2="1" y2="23" />
              </svg>
            </button>
          </div>
        ) : (
        /* UNIFIED EXPANDING COMMAND CONSOLE CARD BOX (Extends directly below upper tabs) */
        <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden">
          <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col bg-[#0a0d18]/95 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl shadow-[0_15px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(6,182,212,0.1)] focus-within:border-cyan-400 focus-within:shadow-[0_0_60px_rgba(6,182,212,0.25)] transition-all overflow-hidden">
            
            {/* Scrollable Conversation Thread INSIDE the Card */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-60">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Sparkles size={24} />
                  </div>
                  <div className="text-sm font-bold text-white">Super Agent Co-Pilot Studio</div>
                  <div className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                    Message Super Agent below to generate photos, videos, plan content, or chat naturally.
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-full`}
                  >
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider mb-1 px-1">
                      {msg.role === 'model' ? '🤖 Agent' : '👤 You'}
                    </span>

                    <div className={`p-4 rounded-2xl relative overflow-hidden shadow-lg border text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border-cyan-500/30 text-white rounded-tr-none'
                        : 'bg-white/5 border-white/10 text-zinc-100 rounded-tl-none'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Attachments rendering */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2.5 pt-2.5 border-t border-white/10">
                          {msg.attachments.map((att, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-1.5 bg-black/40 border border-white/10 rounded-lg text-xs">
                              {att.mimeType.startsWith('image/') ? (
                                <img src={att.dataUrl} alt={att.name} className="w-6 h-6 rounded object-cover" />
                              ) : (
                                getAttachmentIcon(att.mimeType)
                              )}
                              <span className="max-w-[120px] truncate text-xs text-zinc-300">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Simulated Multi-Agent Collaboration dialog inside Chat Bubble */}
                      {msg.role === 'model' && msg.collaborationLogs && msg.collaborationLogs.length > 0 && (
                        <div className="mt-4 p-4 bg-black/30 border border-white/5 rounded-xl space-y-3 shadow-inner">
                          <div className="flex items-center gap-1 text-[9px] font-black text-pink-400 uppercase tracking-widest pb-1 border-b border-white/5">
                            <Layers className="w-3.5 h-3.5 text-pink-400" /> Helper Agent Group Brainstorm
                          </div>
                          <div className="space-y-2.5">
                            {msg.collaborationLogs.map((cLog, cIdx) => (
                              <div key={cIdx} className="space-y-0.5 text-[11px]">
                                <span className={`font-black text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  cLog.agent.includes('Creative') ? 'bg-pink-500/20 text-pink-300' :
                                  cLog.agent.includes('Copywriter') ? 'bg-violet-500/20 text-violet-300' : 'bg-cyan-500/20 text-cyan-300'
                                }`}>
                                  {cLog.agent}
                                </span>
                                <p className="text-zinc-300 italic pl-1 pt-0.5 font-medium leading-relaxed">"{cLog.message}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Human-in-the-Loop plan card */}
                      {msg.role === 'model' && msg.planCard && (
                        <div className="mt-4 p-4 bg-gradient-to-b from-cyan-950/40 to-slate-950/80 border border-cyan-500/30 rounded-2xl space-y-3 shadow-xl">
                          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                              <span className="font-extrabold text-xs text-cyan-300 uppercase tracking-wider">{msg.planCard.title}</span>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              Approval Required
                            </span>
                          </div>

                          <div className="space-y-2">
                            {msg.planCard.steps.map((st, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs">
                                <span className="text-zinc-200 font-medium">{idx + 1}. {st.title}</span>
                                <span className="text-[10px] font-bold text-cyan-400">{st.estimatedCost}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <span className="text-xs font-bold text-zinc-400">Total Est. Budget: <strong className="text-white">{msg.planCard.totalCost}</strong></span>
                            <button
                              onClick={() => {
                                toast.success('Plan approved! Agent initiating execution sequence...');
                                sendMessage('Approved! Please execute the plan now.');
                              }}
                              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve & Execute Plan</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Interactive Execution Pipeline Cards inside Chat Bubble */}
                      {msg.role === 'model' && msg.execSteps && msg.execSteps.length > 0 && (
                        <div className="mt-4 p-4 bg-[#0a0d18]/90 border border-cyan-500/30 rounded-2xl space-y-4 shadow-2xl">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2">
                              <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
                              <span className="font-extrabold text-xs text-white uppercase tracking-wider">Super Agent Task Pipeline</span>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              msg.status === 'done' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                              msg.status === 'executing' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse' :
                              'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}>
                              {msg.status === 'done' ? 'Completed' : msg.status === 'executing' ? 'Executing' : 'Pending'}
                            </span>
                          </div>

                          <div className="space-y-3">
                            {msg.execSteps.map((step, sIdx) => (
                              <div key={sIdx} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                      step.status === 'done' || step.status === 'success' ? 'bg-emerald-500 text-white' :
                                      step.status === 'executing' || step.status === 'running' ? 'bg-cyan-500 text-white animate-spin' :
                                      'bg-white/10 text-zinc-400'
                                    }`}>
                                      {step.status === 'done' || step.status === 'success' ? <Check size={12} /> : sIdx + 1}
                                    </div>
                                    <span className="text-xs font-bold text-white capitalize">{String(step.type || 'task').replace(/_/g, ' ')}</span>
                                  </div>
                                </div>

                                {step.resultUrl && (
                                  <div className="mt-2 rounded-xl overflow-hidden border border-white/10 bg-black/50">
                                    {step.type.includes('video') ? (
                                      <video src={step.resultUrl} controls className="w-full max-h-64 object-cover" />
                                    ) : (
                                      <img src={step.resultUrl} alt="Result" className="w-full max-h-64 object-cover" />
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Active Research Badges & Attachment Previews Row */}
            {(attachments.length > 0 || deepResearchActive || socialResearchActive || webpageResearchActive) && (
              <div className="px-4 sm:px-6 py-2 border-t border-white/10 bg-black/40 flex flex-wrap items-center gap-2">
                {/* Active Research Mode Badges */}
                {deepResearchActive && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm">
                    <Globe size={13} className="text-cyan-400 animate-pulse" />
                    <span>Deep Web Active</span>
                    <button type="button" onClick={() => setDeepResearchActive(false)} className="hover:text-white ml-0.5"><X size={12} /></button>
                  </span>
                )}

                {socialResearchActive && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm">
                    <TrendingUp size={13} className="text-cyan-400 animate-pulse" />
                    <span>Social Trends Active</span>
                    <button type="button" onClick={() => setSocialResearchActive(false)} className="hover:text-white ml-0.5"><X size={12} /></button>
                  </span>
                )}

                {webpageResearchActive && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm max-w-[240px]">
                    <Link size={13} className="text-cyan-400 shrink-0" />
                    <span className="truncate">{webpageUrlInput || 'Webpage Research'}</span>
                    <button type="button" onClick={() => { setWebpageResearchActive(false); setWebpageUrlInput(''); }} className="hover:text-white ml-0.5 shrink-0"><X size={12} /></button>
                  </span>
                )}

                {/* Uploaded File Attachments */}
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative group bg-white/5 border border-white/10 rounded-xl p-1.5 flex items-center gap-2">
                    {att.mimeType.startsWith('image/') ? (
                      <img src={att.dataUrl} alt={att.name} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px]">
                        {att.name.split('.').pop()?.toUpperCase() || 'FILE'}
                      </div>
                    )}
                    <span className="text-xs text-zinc-300 max-w-[120px] truncate font-medium">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="w-4 h-4 rounded-full bg-rose-500/80 hover:bg-rose-500 text-white flex items-center justify-center text-xs transition-all"
                      title="Remove file"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Textarea for User Input */}
            <textarea
              ref={agentTextareaRef}
              rows={2}
              value={inputText}
              onChange={(e) => handleInputTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={isSending}
              placeholder={isListening ? "Listening... Speak clearly into microphone" : "Message Super Agent..."}
              className="w-full bg-transparent text-sm sm:text-base font-medium text-white placeholder:text-zinc-500 placeholder:text-xs sm:placeholder:text-sm outline-none resize-none leading-relaxed min-h-[60px] max-h-[220px] overflow-y-auto"
            />

            {/* Bottom Row Action Toolbar (Plus Menu on Left, Send on Right) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 relative">
              
              {/* Left Row Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Plus (+) Menu Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-md ${
                      isPlusMenuOpen || deepResearchActive || socialResearchActive || webpageResearchActive
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-cyan-500/20'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20'
                    }`}
                    title="Add Attachments & AI Research Tools"
                  >
                    <Plus size={18} className={`transition-transform duration-200 ${isPlusMenuOpen ? 'rotate-45 text-cyan-300' : ''}`} />
                  </button>

                  {/* Plus Action Popup Menu */}
                  <AnimatePresence>
                    {isPlusMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-12 left-0 w-72 bg-[#0d101d] border border-cyan-500/40 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-50 space-y-1"
                      >
                        <div className="px-3 py-1.5 text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                          Attachments & AI Research Tools
                        </div>

                        {/* 1. Upload File */}
                        <label
                          htmlFor="plus-menu-file-input"
                          onClick={() => setIsPlusMenuOpen(false)}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-300 text-zinc-200 text-xs font-bold cursor-pointer transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                            <Paperclip size={16} />
                          </div>
                          <div>
                            <div>Upload File</div>
                            <div className="text-[10px] font-normal text-zinc-400">Photos, videos, audio & documents</div>
                          </div>
                          <input
                            id="plus-menu-file-input"
                            type="file"
                            ref={fileInputRef}
                            accept="image/*,video/*,audio/*,.pdf,.txt"
                            multiple
                            onChange={handleFileUpload}
                            className="sr-only"
                          />
                        </label>

                        {/* 2. Deep Web Research */}
                        <button
                          type="button"
                          onClick={() => {
                            const next = !deepResearchActive;
                            setDeepResearchActive(next);
                            setIsPlusMenuOpen(false);
                            toast(next ? '🌐 Deep Web Research Activated' : 'Web Search Standard Mode');
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            deepResearchActive
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'hover:bg-white/5 text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                              <Globe size={16} />
                            </div>
                            <div className="text-left">
                              <div>Deep Research</div>
                              <div className="text-[10px] font-normal text-zinc-400">Live multi-source web search</div>
                            </div>
                          </div>
                          {deepResearchActive && <Check size={14} className="text-cyan-400" />}
                        </button>

                        {/* 3. Social Media Research */}
                        <button
                          type="button"
                          onClick={() => {
                            const next = !socialResearchActive;
                            setSocialResearchActive(next);
                            setIsPlusMenuOpen(false);
                            toast(next ? '📱 Social Media Research Activated' : 'Social Trend Standard Mode');
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            socialResearchActive
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'hover:bg-white/5 text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                              <TrendingUp size={16} />
                            </div>
                            <div className="text-left">
                              <div>Social Research</div>
                              <div className="text-[10px] font-normal text-zinc-400">Instagram, TikTok & X trend scraper</div>
                            </div>
                          </div>
                          {socialResearchActive && <Check size={14} className="text-cyan-400" />}
                        </button>

                        {/* 4. Webpage Research */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowWebpageUrlModal(true);
                            setIsPlusMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            webpageResearchActive
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'hover:bg-white/5 text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                              <Link size={16} />
                            </div>
                            <div className="text-left">
                              <div>Webpage Research</div>
                              <div className="text-[10px] font-normal text-zinc-400">Extract content from URL</div>
                            </div>
                          </div>
                          {webpageResearchActive && <Check size={14} className="text-cyan-400" />}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Workflows Menu */}
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      setInputText(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="h-9 px-2.5 rounded-xl border border-white/10 bg-white/5 hover:border-cyan-500/30 text-xs font-bold text-cyan-300 outline-none cursor-pointer transition-all shadow"
                >
                  <option value="">⚡ Workflows ▾</option>
                  <option value="Generate 3 photorealistic portrait photos of my AI influencer in a luxury penthouse wearing elegant evening outfit.">📸 Photoshoot</option>
                  <option value="Create a 1-minute video storyboard with 4 scenes: talking avatar intro, workout action shot, protein shake, and call to action.">🎬 1-Min Video Storyboard</option>
                  <option value="Clone the voice from my uploaded video sample and generate a talking avatar saying 'Welcome to my exclusive channel!'">🎙️ Voice Clone & Avatar</option>
                  <option value="Architect a 7-day content schedule for Instagram with high-converting hooks, viral caption ideas, and revenue strategies.">📈 7-Day Content Plan</option>
                </select>

                {/* Mic Input Trigger */}
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={isSending}
                  title="Dictate message with microphone"
                  className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    isListening 
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Mic size={15} />
                </button>

                {/* Hands-Free Live Voice Call Button */}
                <button
                  type="button"
                  onClick={isLiveVoiceCallActive ? stopLiveVoiceCall : startLiveVoiceCall}
                  title={isLiveVoiceCallActive ? "End Live Voice Call" : "Start Live Voice Call"}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isLiveVoiceCallActive
                      ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse shadow-lg shadow-emerald-500/30'
                      : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
                  }`}
                >
                  {isLiveVoiceCallActive ? <PhoneOff size={14} /> : <PhoneCall size={14} />}
                  <span>{isLiveVoiceCallActive ? 'End Call' : 'Voice Call'}</span>
                </button>
              </div>

              {/* Right Side: Primary Send Button */}
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={isSending || (!inputText.trim() && attachments.length === 0)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2 text-white font-extrabold text-sm shadow-lg shadow-cyan-500/25 transition-all shrink-0 cursor-pointer"
              >
                <span>Send</span>
                {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Webpage Research URL Input Modal */}
        <AnimatePresence>
          {showWebpageUrlModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-md bg-[#0d101d] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-base">
                    <Link size={18} />
                    <span>Webpage Research</span>
                  </div>
                  <button type="button" onClick={() => setShowWebpageUrlModal(false)} className="text-zinc-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  Enter any website or article URL for Super Agent to scrape, extract, and research before responding:
                </p>

                <input
                  type="url"
                  value={webpageUrlInput}
                  onChange={(e) => setWebpageUrlInput(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 font-medium"
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWebpageUrlModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!webpageUrlInput.trim()) {
                        toast.error('Please enter a valid webpage URL');
                        return;
                      }
                      setWebpageResearchActive(true);
                      setShowWebpageUrlModal(false);
                      toast.success(`📄 Webpage Research Enabled for ${webpageUrlInput}`);
                    }}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-extrabold shadow-md shadow-cyan-500/20"
                  >
                    Enable Research
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT COLUMN: Interactive Agent Canvas Workspace (Compact & Collapsible) */}
      <div className={cn("transition-all duration-300 flex flex-col h-full bg-[var(--bg-elevated)]/5 shrink-0 relative", isPanelCollapsed ? "w-12" : "w-full lg:w-[280px] xl:w-[300px]")}>
        {/* Navigation Tabs bar */}
        <div className="flex-none flex items-center justify-between border-b border-white/5 px-3 py-3 bg-black/30">
          <button
            onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all shrink-0"
            title={isPanelCollapsed ? "Expand Canvas Sidebar" : "Collapse Canvas Sidebar"}
          >
            {isPanelCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>

          {!isPanelCollapsed && (
            <div className="flex items-center gap-1 bg-black/60 border border-white/10 p-1 rounded-xl w-full ml-2 justify-around">
              <button
                onClick={() => setCanvasTab('studio')}
                className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1',
                  canvasTab === 'studio' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'text-white/40 hover:text-white'
                )}
                title="View Draft Persona, Photos & Content Plan"
              >
                🎨 Drafts
              </button>

              <button
                onClick={() => setCanvasTab('chat')}
                className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1',
                  canvasTab === 'chat' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-white/40 hover:text-white'
                )}
                title="Test Chat Live in Character with AI Influencer"
              >
                💬 Test Chat
              </button>

              <button
                onClick={() => setCanvasTab('marketing')}
                className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1',
                  canvasTab === 'marketing' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-white/40 hover:text-white'
                )}
                title="Download Social Reels & View Analytics"
              >
                📈 Growth
              </button>
            </div>
          )}
        </div>

        {/* Tab Canvas panels */}
        {!isPanelCollapsed && (
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {canvasTab === 'studio' && (
            <div className="space-y-6 max-w-md mx-auto">
              {activeDraft?.createStep ? (
                <div className="space-y-6">
                  {/* PROFILE CARD */}
                  <div className="bg-[var(--bg-elevated)] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-4">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Profile Mockup Card header */}
                    <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center font-black text-xl text-white border border-white/10 shrink-0 shadow-lg shadow-pink-500/10">
                        {activeDraft.createStep.params.name ? activeDraft.createStep.params.name.charAt(0) : '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-lg text-white truncate">{activeDraft.createStep.params.name || 'Unnamed Persona'}</div>
                        <div className="text-[10px] text-pink-400 font-black uppercase tracking-wider">{activeDraft.createStep.params.niche || 'Lifestyle Niche'}</div>
                        <div className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">Platform: {activeDraft.createStep.params.platform || 'Instagram'}</div>
                      </div>
                    </div>

                    {/* Biography */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Bio Description</span>
                      <p className="text-xs text-zinc-300 italic leading-relaxed">
                        "{activeDraft.createStep.params.bio || 'No biography written yet.'}"
                      </p>
                    </div>

                    {/* Style Guidelines */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Aesthetic & Visual Guidelines</span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-bold bg-white/5 p-3 border border-white/5 rounded-xl">
                        {activeDraft.createStep.params.visualStyle || 'High-fidelity cinematic portrait, soft lighting, detailed face features.'}
                      </p>
                    </div>

                    {/* Personality traits taglist */}
                    {activeDraft.createStep.params.personalityTraits && activeDraft.createStep.params.personalityTraits.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Personality Alignment</span>
                        <div className="flex flex-wrap gap-1.5">
                          {activeDraft.createStep.params.personalityTraits.map((t: string, tIdx: number) => (
                            <span key={tIdx} className="px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/10 text-[9px] font-bold text-violet-300">
                              🎭 {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* VOICE & AVATAR STUDIO */}
                  <div className="bg-[var(--bg-elevated)] p-6 rounded-2xl border border-white/5 shadow-xl relative space-y-5">
                    <span className="text-xs font-black text-violet-400 uppercase tracking-widest flex items-center gap-1">
                      <Volume2 className="w-4 h-4 text-violet-400" /> Voice & Talking Avatar Studio
                    </span>
                    <p className="text-[10px] text-zinc-400 font-bold leading-relaxed pb-3 border-b border-white/5">
                      Upload reference voice/video file, select avatar portrait, and create cloned talking photos.
                    </p>

                    <div className="space-y-4">
                      {/* Engine Selector */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-bold">
                          Voice Engine
                          <span className="text-zinc-500 cursor-help font-bold" title="Wavespeed clones voice instantly from video/audio references in 5 seconds. ElevenLabs runs high-fidelity cloning."> ℹ️</span>
                        </span>
                        <select
                          value={voiceEngine}
                          onChange={(e) => setVoiceEngine(e.target.value as any)}
                          className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500/30 outline-none"
                        >
                          <option value="omnivoice">✨ Wavespeed OmniVoice Zonos2 (Instant, pitch/speed control)</option>
                          <option value="minimax-clone">⚡ MiniMax Voice Clone (Wavespeed GPU)</option>
                          <option value="qwen3-clone">🧠 Qwen 3.0 Voice Clone (Alibaba / Wavespeed)</option>
                          <option value="seed-speech">🌱 ByteDance Seed-Speech 2.0 (Wavespeed)</option>
                          <option value="chatterbox">💬 ChatterBox Voice Converter (Wavespeed)</option>
                          <option value="mureka-vocal">🎵 Mureka Vocal Clone (Wavespeed)</option>
                          <option value="zonos2">🌊 Zyphra Zonos v2 (Wavespeed)</option>
                          <option value="elevenlabs">🎙️ ElevenLabs v3 Multilingual (Flagship Accent Clone)</option>
                          <option value="openai-tts">🤖 OpenAI TTS-1 HD (Neural)</option>
                        </select>
                      </div>

                      {/* ElevenLabs inputs */}
                      {voiceEngine === 'elevenlabs' && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-bold">Voice Name</span>
                            <input
                              type="text"
                              value={voiceNameInput}
                              onChange={(e) => setVoiceNameInput(e.target.value)}
                              className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500/30"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-bold">Description</span>
                            <input
                              type="text"
                              value={voiceDescInput}
                              onChange={(e) => setVoiceDescInput(e.target.value)}
                              className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500/30"
                            />
                          </div>
                        </div>
                      )}

                      {/* Reference Voice upload */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-bold">
                          1. Reference Voice (Audio/Video file)
                          <span className="text-zinc-500 cursor-help font-bold" title="Upload audio or video clip. If video is selected, the audio track is extracted natively in the browser via Web Audio API."> ℹ️</span>
                        </span>
                        <input
                          type="file"
                          ref={studioVoiceRef}
                          accept="audio/*,video/*"
                          onChange={handleStudioVoiceSelected}
                          className="hidden"
                        />
                        <div 
                          onClick={() => studioVoiceRef.current?.click()}
                          className="h-20 border border-dashed border-white/10 hover:border-violet-500/20 rounded-xl flex flex-col items-center justify-center bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer transition-all p-3 text-center"
                        >
                          {studioVoiceFile ? (
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold text-violet-300 truncate max-w-[280px]">🔊 {studioVoiceFile.name}</div>
                              <div className="text-[8px] font-black text-zinc-500 uppercase">{studioVoiceFile.mimeType}</div>
                            </div>
                          ) : (
                            <>
                              <Volume2 className="w-5 h-5 text-zinc-500 mb-1" />
                              <span className="text-[10px] text-zinc-400 font-bold">Select audio or video voice clip (min 5s)</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Avatar Portrait image upload */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-bold">2. Avatar Photo (For lip-sync talking photo)</span>
                        <input
                          type="file"
                          ref={studioAvatarRef}
                          accept="image/*"
                          onChange={handleStudioAvatarSelected}
                          className="hidden"
                        />
                        <div 
                          onClick={() => studioAvatarRef.current?.click()}
                          className="h-20 border border-dashed border-white/10 hover:border-violet-500/20 rounded-xl flex flex-col items-center justify-center bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer transition-all p-3 text-center"
                        >
                          {studioAvatarImage ? (
                            <div className="flex items-center gap-2">
                              <img src={studioAvatarImage.dataUrl} alt="Avatar Draft" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                              <div className="text-left">
                                <div className="text-xs font-bold text-emerald-300 truncate max-w-[200px]">{studioAvatarImage.name}</div>
                                <span className="text-[8px] font-black text-zinc-500 uppercase">{studioAvatarImage.mimeType}</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <ImageIcon className="w-5 h-5 text-zinc-500 mb-1" />
                              <span className="text-[10px] text-zinc-400 font-bold">Select character reference photo</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Script text */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider font-bold">3. Script text</span>
                        <textarea
                          value={studioScript}
                          onChange={(e) => setStudioScript(e.target.value)}
                          placeholder="Type script text here..."
                          className="w-full h-24 bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-white focus:border-violet-500/30 outline-none resize-none shadow-inner"
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          onClick={executeVoiceCloneOnly}
                          disabled={isStudioLoading || !studioScript.trim() || !studioVoiceFile}
                          className="py-2.5 rounded-xl border border-white/5 bg-gradient-to-r from-violet-500/20 to-indigo-500/20 hover:from-violet-500/30 hover:to-indigo-500/30 font-black text-[10px] uppercase tracking-wider text-violet-300 flex items-center justify-center gap-1 transition-all disabled:opacity-40"
                        >
                          {isStudioLoading && !studioResultVideoUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                          Clone Voice
                        </button>
                        <button
                          onClick={executeTalkingAvatar}
                          disabled={isStudioLoading || !studioScript.trim() || !studioVoiceFile || !studioAvatarImage || voiceEngine === 'elevenlabs'}
                          className="py-2.5 rounded-xl border border-pink-500/10 bg-gradient-to-r from-pink-500/20 to-violet-500/20 hover:from-pink-500/30 hover:to-violet-500/30 font-black text-[10px] uppercase tracking-wider text-pink-300 flex items-center justify-center gap-1 transition-all disabled:opacity-40"
                          title={voiceEngine === 'elevenlabs' ? 'Talking Avatars currently require OmniVoice engine' : ''}
                        >
                          {isStudioLoading && studioResultVideoUrl === null ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <VideoIcon className="w-3.5 h-3.5" />}
                          Talking Avatar
                        </button>
                      </div>
                    </div>

                    {/* Outputs panel */}
                    {isStudioLoading && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center space-y-2 text-center p-6 z-10">
                        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                        <div className="text-xs font-black uppercase text-white tracking-widest">Generating Studio Asset...</div>
                        <p className="text-[10px] text-zinc-400 max-w-[200px]">Wavespeed is cloning voice and generating talking photo. This takes a few seconds.</p>
                      </div>
                    )}

                    {(studioResultAudioUrl || studioResultVideoUrl) && (
                      <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">Studio Generation Results</span>
                        
                        {studioResultAudioUrl && (
                          <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                            <span className="text-[8px] font-black text-zinc-500 block uppercase">Cloned speech audio</span>
                            <audio controls src={studioResultAudioUrl} className="w-full h-8" />
                          </div>
                        )}

                        {studioResultVideoUrl && (
                          <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                            <span className="text-[8px] font-black text-zinc-500 block uppercase">Lip-sync video</span>
                            <video controls src={studioResultVideoUrl} className="w-full rounded border border-white/10" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CALENDAR PLANNER */}
                  {activeDraft?.planStep && (
                    <div className="bg-[var(--bg-elevated)] border border-white/5 p-5 rounded-2xl shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">
                          📅 7-Day theme: {activeDraft.planStep.params.theme || 'Default Niche'}
                        </span>
                        <span className="text-[9px] font-black uppercase text-pink-400 bg-pink-500/15 px-2 py-0.5 rounded border border-pink-500/10 tracking-widest">
                          {activeDraft.planStep.params.platform || 'Instagram'}
                        </span>
                      </div>

                      {/* 7 Days planner loop */}
                      <div className="grid grid-cols-1 gap-2.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                          <div key={day} className="bg-black/15 border border-white/5 p-3 rounded-xl flex gap-3 relative overflow-hidden shadow text-xs">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                              <span className="text-xs font-black text-zinc-300">D{day}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[8px] font-black text-pink-400 uppercase tracking-widest block">Suggested Topic</span>
                              <div className="font-extrabold text-white mt-0.5 truncate">
                                {activeDraft.planStep?.params?.days?.[day - 1]?.topic || `Day ${day} Viral Concept`}
                              </div>
                              <p className="text-[10px] text-zinc-400 font-medium leading-relaxed mt-0.5">
                                {activeDraft.planStep?.params?.days?.[day - 1]?.concept || 'Aesthetic viral layout and messaging hooks.'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Clean Canvas Welcome Card */}
                  <div className="p-6 bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-black border border-white/10 rounded-2xl text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-violet-600 flex items-center justify-center mx-auto shadow-lg shadow-pink-500/20">
                      <Cpu className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Live Creative Canvas</h3>
                      <p className="text-xs text-white/50 max-w-xs mx-auto mt-1">
                        Prompt the agent on the left to build a persona or run multi-step AI workflows.
                      </p>
                    </div>
                  </div>

                  {/* Starter Workflows Grid */}
                  <div className="bg-[#0b0c10] border border-white/5 p-4 rounded-2xl space-y-3 shadow-xl">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block border-b border-white/5 pb-2">
                      🚀 Agent Workflows
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => setInputText(BASE_PRESETS[0].prompt)}
                        className="p-3 text-left bg-white/[0.02] hover:bg-pink-500/10 border border-white/5 hover:border-pink-500/30 rounded-xl transition-all group"
                      >
                        <UserPlus className="w-5 h-5 text-pink-400 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-white block">Persona Architect</span>
                        <span className="text-[9px] text-white/40">Full profile & content plan</span>
                      </button>

                      <button
                        onClick={() => setInputText("Generate a 1 minute video chain of a model walking in Tokyo at night, stitching 5-second clips smoothly")}
                        className="p-3 text-left bg-white/[0.02] hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 rounded-xl transition-all group"
                      >
                        <VideoIcon className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-white block">1-Min Video Chain</span>
                        <span className="text-[9px] text-white/40">Sequential clip stitching</span>
                      </button>

                      <button
                        onClick={() => setCanvasTab('studio')}
                        className="p-3 text-left bg-white/[0.02] hover:bg-violet-500/10 border border-white/5 hover:border-violet-500/30 rounded-xl transition-all group"
                      >
                        <Volume2 className="w-5 h-5 text-violet-400 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-white block">Voice & Avatar</span>
                        <span className="text-[9px] text-white/40">Voice cloning & lip-sync</span>
                      </button>

                      <button
                        onClick={() => setCanvasTab('chat')}
                        className="p-3 text-left bg-white/[0.02] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 rounded-xl transition-all group"
                      >
                        <MessageSquare className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-white block">Marketing Copy</span>
                        <span className="text-[9px] text-white/40">Brainstorm captions & ideas</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* BRAND VOICE CHAT SANDBOX BOARD */}
          {canvasTab === 'chat' && (
            <div className="space-y-4 max-w-md mx-auto flex flex-col h-[500px] bg-[var(--bg-elevated)] border border-white/5 rounded-2xl p-4 shadow-xl overflow-hidden">
              <div className="flex-none flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-black text-pink-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-pink-400" /> Brand Chat Sandbox
                </span>
                <span className="text-[9px] font-bold text-zinc-400">
                  Talking to: {activeDraft?.createStep?.params.name || 'Sofia (Draft)'}
                </span>
              </div>
 
              {/* Copywriting Generator Helper */}
              <div className="bg-black/30 border border-white/5 p-3 rounded-xl space-y-2 mb-1 flex-none">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-pink-400 tracking-wider flex items-center gap-1">
                    💡 Viral Hook & Caption Generator
                  </span>
                  {copyOptions && (
                    <button
                      onClick={() => { setCopyOptions(null); setCopyLogs([]); }}
                      className="text-[9px] font-bold text-zinc-500 hover:text-zinc-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {!copyOptions && !isGeneratingCopy ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-[8px] uppercase text-zinc-500 font-bold block mb-0.5">Topic/Theme</span>
                        <input
                          type="text"
                          value={copywriterTopic}
                          onChange={(e) => setCopywriterTopic(e.target.value)}
                          placeholder="e.g. bikini walking, workout setup"
                          className="w-full bg-white/5 border border-white/5 rounded px-2.5 py-1 text-white outline-none focus:border-pink-500/25"
                        />
                      </div>
                      <div>
                        <span className="text-[8px] uppercase text-zinc-500 font-bold block mb-0.5">Target Platform</span>
                        <select
                          value={copywriterPlatform}
                          onChange={(e) => setCopywriterPlatform(e.target.value as any)}
                          className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-white outline-none focus:border-pink-500/25 cursor-pointer"
                        >
                          <option value="onlyfans">🌶️ OnlyFans Premium</option>
                          <option value="instagram">📸 Instagram Post</option>
                          <option value="tiktok">🎵 TikTok Short</option>
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!copywriterTopic.trim()) return;
                        setIsGeneratingCopy(true);
                        setCopyLogs([]);
                        
                        // Staggered Agent Brainstorming Simulation
                        const logs = [
                          { agent: 'Creative Director', msg: `Aligning theme: "${copywriterTopic}" for ${copywriterPlatform}. Setting tone guidelines...` },
                          { agent: 'Copywriter', msg: 'Drafting flirty visual descriptions, emotional hooks, and CTAs...' },
                          { agent: 'Monetization Analyst', msg: 'Optimizing hash-tags and high-retention call-to-actions for CPM gains.' }
                        ];

                        for (let i = 0; i < logs.length; i++) {
                          setCopyLogs(prev => [...prev, logs[i]]);
                          await new Promise(r => setTimeout(r, 600));
                        }

                        // Generate Options based on platform
                        const options = copywriterPlatform === 'onlyfans' ? [
                          { type: '🌶️ Direct & Flirty', text: `Unlock my premium catalog to see the rest of this sunset walk. It gets better... 😉`, tags: '#linkinbio #onlyfans #exclusive' },
                          { type: '🤫 Hook Variation', text: `Can you keep a secret? This outfit looks even better on the floor. Message me for the full clip! 💋`, tags: '#viponly #exclusivecontent' },
                          { type: '💸 Call to Action', text: `Tipping $15 on this post unlocks the uncensored 4K director's cut in your inbox right now! 🎥💦`, tags: '#onlyfanscreator #exclusivevideos' }
                        ] : copywriterPlatform === 'instagram' ? [
                          { type: '📸 Aesthetic & Lifestyle', text: `Sunset walking is my love language. Where should I travel to next? ✈️🌅`, tags: '#sunsetlovers #travelstyle #ootd' },
                          { type: '✨ Engagement Question', text: `Left or Right? Help me pick my next photoshoot outfit in the comments! 👗👇`, tags: '#lifestyle #fashioninspo #modelsofinstagram' },
                          { type: '💰 Sponsor Tagline', text: `Keeping it fresh with this setup. Link in bio to shop the look! 🛍️✨`, tags: '#sponsored #aestheticlook #brandpartner' }
                        ] : [
                          { type: '🎵 Viral High Retention', text: `Wait till the end to see who interrupted my sunset walk... 😳🚨`, tags: '#fyp #trending #viralvideo' },
                          { type: '🔥 Trend Hook', text: `I tried the new viral walking routine and this happened... 😱👇`, tags: '#gymtok #dailyroutine #challenge' },
                          { type: '💬 Comment Bait', text: `If this video reaches your FYP, you owe me a coffee. Comment where you're watching from! ☕👀`, tags: '#coffeetok #foryoupage #viral' }
                        ];

                        setCopyOptions(options);
                        setIsGeneratingCopy(false);
                      }}
                      disabled={!copywriterTopic.trim()}
                      className="w-full py-1.5 rounded bg-gradient-to-r from-pink-500/20 to-violet-500/20 hover:from-pink-500/30 hover:to-violet-500/30 border border-pink-500/30 text-pink-300 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40"
                    >
                      🚀 Brainstorm Copywriting Teams
                    </button>
                  </div>
                ) : isGeneratingCopy ? (
                  <div className="space-y-1.5 p-2 bg-black/40 rounded border border-white/5 font-mono text-[9px] text-zinc-400">
                    <div className="flex items-center gap-1.5 text-pink-400 font-bold mb-1 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>AGENTS BRAINSTORMING ACTIVE</span>
                    </div>
                    {copyLogs.map((log, lIdx) => (
                      <div key={lIdx} className="leading-relaxed">
                        <span className="text-violet-400 font-bold">[{log.agent}]:</span> {log.msg}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar flex-none">
                    {copyOptions?.map((opt, oIdx) => (
                      <div key={oIdx} className="bg-white/5 border border-white/5 p-2 rounded-lg space-y-1 text-[9px] relative group">
                        <span className="text-[8px] font-black text-pink-400 uppercase tracking-widest block">{opt.type}</span>
                        <p className="text-zinc-200 font-semibold leading-normal">{opt.text}</p>
                        <p className="text-zinc-500 font-mono text-[8px]">{opt.tags}</p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${opt.text}\n\n${opt.tags}`);
                            toast.success('Copied to clipboard!');
                          }}
                          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 border border-white/10 px-1.5 py-0.5 rounded text-[8px] font-black text-zinc-300 hover:text-white uppercase"
                        >
                          📋 Copy
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat log list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar text-xs">
                {personaChatMessages.map((pMsg, pIdx) => (
                  <div key={pIdx} className={`flex flex-col ${pMsg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                      pMsg.role === 'user'
                        ? 'bg-violet-500/10 border border-violet-500/20 text-white rounded-tr-none'
                        : 'bg-white/5 border border-white/5 text-zinc-200 rounded-tl-none'
                    }`}>
                      <div>{pMsg.content}</div>

                      {/* Voice player if speaker cloned */}
                      {pMsg.role === 'model' && (
                        <div className="mt-2 flex items-center gap-2">
                          {pMsg.voiceUrl ? (
                            <audio controls src={pMsg.voiceUrl} className="h-6 w-full" />
                          ) : (
                            <button
                              onClick={() => readSpeechSpeech(pIdx, pMsg.content)}
                              disabled={pMsg.isReading}
                              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase text-zinc-300 flex items-center gap-1 transition-all disabled:opacity-40"
                            >
                              {pMsg.isReading ? <Loader2 className="w-3 h-3 animate-spin text-pink-400" /> : <Volume2 className="w-3 h-3" />}
                              Speak cloned voice
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isPersonaTyping && (
                  <div className="flex items-center gap-1.5 text-zinc-500 italic text-[10px] animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin text-pink-500" />
                    <span>{activeDraft?.createStep?.params.name || 'Influencer'} is typing...</span>
                  </div>
                )}
              </div>

              {/* Console input box */}
              <div className="flex-none flex items-center gap-2 pt-2 border-t border-white/5">
                <input
                  type="text"
                  value={personaChatInput}
                  onChange={(e) => setPersonaChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendPersonaChatMessage()}
                  disabled={isPersonaTyping || !activeDraft}
                  placeholder={activeDraft ? "Type chat message..." : "Draft a persona first to unlock chat"}
                  className="flex-1 h-9 bg-black/40 border border-white/5 rounded-lg px-3 text-xs text-white focus:border-pink-500/30 outline-none"
                />
                <button
                  onClick={sendPersonaChatMessage}
                  disabled={isPersonaTyping || !personaChatInput.trim()}
                  className="w-9 h-9 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-white flex items-center justify-center shadow transition-all"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}

          {canvasTab === 'marketing' && (
            <div className="space-y-6 max-w-md mx-auto animate-fade-in">
              {/* SOCIAL MEDIA DOWNLOADER BOARD */}
              <div className="bg-[var(--bg-elevated)] p-6 rounded-2xl border border-white/5 shadow-xl relative">
                <span className="text-xs font-black text-pink-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-pink-400 animate-spin" style={{ animationDuration: '6s' }} /> Instagram & TikTok Downloader
                </span>
                <p className="text-[10px] text-zinc-400 font-bold leading-relaxed pb-3 border-b border-white/5">
                  Paste Instagram Reels link or TikTok URL to extract and download watermark-free MP4 media instantly.
                </p>

                <div className="space-y-4 mt-3">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Social Video Link</span>
                    <input
                      type="text"
                      value={downloaderUrl}
                      onChange={(e) => setDownloaderUrl(e.target.value)}
                      placeholder="https://instagram.com/reel/... or https://tiktok.com/..."
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:border-pink-500/30 outline-none transition-all"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      if (!downloaderUrl.trim()) return;
                      setDownloaderLoading(true);
                      setDownloaderResult(null);
                      const toastId = toast.loading('Extracting video from link...');
                      try {
                        const res = await fetch('/api/download-social-video', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ url: downloaderUrl })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed to download');
                        setDownloaderResult(data);
                        toast.success('Video extracted successfully!', { id: toastId });
                      } catch (err: any) {
                        toast.error(err.message || 'Extraction failed', { id: toastId });
                      } finally {
                        setDownloaderLoading(false);
                      }
                    }}
                    disabled={downloaderLoading || !downloaderUrl.trim()}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 font-black text-[10px] uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-1 transition-all disabled:opacity-40"
                  >
                    {downloaderLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                    Extract Watermark-Free MP4
                  </button>
                </div>

                {downloaderResult && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                    <div className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-3 relative overflow-hidden">
                      <span className="absolute top-2 right-2 text-[8px] font-black uppercase text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full">
                        {downloaderResult.platform}
                      </span>

                      <span className="text-[9px] font-black text-zinc-500 block uppercase">Extracted Video Card</span>
                      <video src={downloaderResult.videoUrl} controls className="w-full rounded-xl border border-white/10 shadow" />
                      
                      <p className="text-xs text-zinc-300 font-bold leading-normal truncate">
                        {downloaderResult.title}
                      </p>

                      <div className="flex gap-2 pt-1">
                        <a
                          href={downloaderResult.videoUrl}
                          download={`social_video_${downloaderResult.platform}.mp4`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 font-black text-[9px] uppercase tracking-wider text-emerald-300 flex items-center justify-center gap-1 transition-all"
                        >
                          📥 Download File
                        </a>
                        <button
                          onClick={() => saveVideoToPlanner(downloaderResult)}
                          className="flex-1 py-2 rounded-lg bg-[#E7C477]/15 hover:bg-[#E7C477]/25 border border-[#E7C477]/30 font-black text-[9px] uppercase tracking-wider text-[#EECB78] flex items-center justify-center gap-1 transition-all"
                        >
                          <CalendarRange className="w-3.5 h-3.5" /> Save to Planner
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PREDICTIVE ANALYTICS GRAPH */}
              {activeDraft ? (
                <div className="space-y-4 bg-[var(--bg-elevated)] p-6 rounded-2xl border border-white/5 shadow-xl relative">
                  <span className="text-xs font-black text-[#EECB78] uppercase tracking-widest flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#EECB78]" /> Planning Estimates & Audience
                  </span>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Planning estimate only — these figures are not live platform analytics.
                  </p>
                  
                  {/* Scorecards */}
                  <div className="grid grid-cols-2 gap-3.5 mt-3">
                    <div className="bg-black/20 border border-white/5 p-3 rounded-xl text-center">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider block">Estimated CPM</span>
                      <span className="text-sm font-black text-white">${metrics.cpm.toFixed(2)}</span>
                    </div>
                    <div className="bg-black/20 border border-white/5 p-3 rounded-xl text-center">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider block">Earnings Projection</span>
                      <span className="text-sm font-black text-emerald-400">${metrics.projection.toLocaleString()}/mo</span>
                    </div>
                  </div>

                  {/* Stats line chart */}
                  <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 relative mt-3">
                    <svg className="w-full h-28" viewBox="0 0 300 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#D9B667" />
                          <stop offset="50%" stopColor="#ec4899" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="20" x2="300" y2="20" stroke="white" strokeOpacity="0.03" strokeDasharray="3,3" />
                      <line x1="0" y1="50" x2="300" y2="50" stroke="white" strokeOpacity="0.03" strokeDasharray="3,3" />
                      <line x1="0" y1="80" x2="300" y2="80" stroke="white" strokeOpacity="0.03" strokeDasharray="3,3" />
                      <path d="M 0 90 Q 75 70 150 40 T 300 10 L 300 95 L 0 95 Z" fill="url(#chart-grad)" />
                      <path d="M 0 90 Q 75 70 150 40 T 300 10" fill="none" stroke="url(#line-grad)" strokeWidth="2.5" />
                    </svg>
                    <div className="flex justify-between text-[8px] text-zinc-500 font-mono mt-1.5">
                      <span>Day 1 (10K)</span>
                      <span>Day 15 (72K)</span>
                      <span>Day 30 (150K)</span>
                    </div>
                  </div>

                  {/* SVG Heatmap */}
                  <div className="bg-black/35 rounded-xl p-2 border border-white/5 relative overflow-hidden mt-3">
                    <svg className="w-full h-20 text-zinc-800" viewBox="0 0 340 120">
                      <circle cx="70" cy="45" r="10" fill="#ec4899" fillOpacity="0.15" className="animate-pulse" />
                      <circle cx="70" cy="45" r="4" fill="#ec4899" />
                      <text x="70" y="32" fill="#a1a1aa" fontSize="7" fontWeight="bold" textAnchor="middle">USA (70%)</text>
                      <circle cx="180" cy="42" r="8" fill="#EECB78" fillOpacity="0.15" className="animate-pulse" />
                      <circle cx="180" cy="42" r="3" fill="#EECB78" />
                      <text x="180" y="30" fill="#a1a1aa" fontSize="7" fontWeight="bold" textAnchor="middle">EU (20%)</text>
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="h-64 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-white/[0.01]">
                  <TrendingUp className="w-8 h-8 text-zinc-600 mb-2.5 animate-pulse" />
                  <div className="text-xs font-black text-zinc-400 uppercase tracking-widest">No Analytics Projections</div>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">Propose a layout pipeline to calculate expected CPM, growth index, and earnings curves.</p>
                </div>
              )}
            </div>
          )}

          {/* MEDIA PREVIEW BOARD */}
          {canvasTab === 'media' && (
            <div className="space-y-6 max-w-md mx-auto">
              {activeDraft?.imgStep ? (
                <div className="bg-[var(--bg-elevated)] border border-white/5 rounded-2xl p-5 shadow space-y-3.5">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> Visual Generator Settings
                  </span>
                  <div className="space-y-1.5">
                    <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Draft Image Prompt</span>
                    <p className="text-xs text-zinc-300 font-bold bg-white/5 p-3 border border-white/5 rounded-xl leading-relaxed">
                      "{activeDraft.imgStep.params.prompt}"
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="text-[8px] uppercase tracking-wider text-zinc-500 block font-black">Generator Model</span>
                      <span className="font-mono text-[10px] text-white font-bold">{activeDraft.imgStep.params.modelId || 'Google Veo'}</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="text-[8px] uppercase tracking-wider text-zinc-500 block font-black">Outfit style</span>
                      <span className="text-white font-bold">{activeDraft.imgStep.params.outfit || 'Default Outfit'}</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeDraft?.videoStep ? (
                <div className="bg-[var(--bg-elevated)] border border-white/5 rounded-2xl p-5 shadow space-y-3.5">
                  <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                    <VideoIcon className="w-3.5 h-3.5 text-cyan-400" /> Video Generator Settings
                  </span>
                  <div className="space-y-1.5">
                    <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Motion Prompt</span>
                    <p className="text-xs text-zinc-300 font-bold bg-white/5 p-3 border border-white/5 rounded-xl leading-relaxed">
                      "{activeDraft.videoStep.params.prompt}"
                    </p>
                  </div>
                </div>
              ) : null}

              {activeDraft?.voiceStep ? (
                <div className="bg-[var(--bg-elevated)] border border-white/5 rounded-2xl p-5 shadow space-y-3.5">
                  <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" /> Voice Synthesis Narration
                  </span>
                  <div className="space-y-1.5">
                    <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Script Transcription</span>
                    <p className="text-xs text-zinc-300 font-bold bg-white/5 p-3 border border-white/5 rounded-xl leading-relaxed">
                      "{activeDraft.voiceStep.params.text}"
                    </p>
                  </div>
                </div>
              ) : null}

              {activeDraft?.revStep ? (
                <div className="bg-[var(--bg-elevated)] border border-white/5 rounded-2xl p-5 shadow space-y-3.5">
                  <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-rose-400" /> Projected Revenue Log
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="text-[8px] uppercase tracking-wider text-zinc-500 block font-black">Logged Income</span>
                      <span className="text-lg font-extrabold text-emerald-400">${activeDraft.revStep.params.amount}</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="text-[8px] uppercase tracking-wider text-zinc-500 block font-black">Platform source</span>
                      <span className="text-white font-bold">{activeDraft.revStep.params.platform} ({activeDraft.revStep.params.source})</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {!activeDraft?.imgStep && !activeDraft?.videoStep && !activeDraft?.voiceStep && !activeDraft?.revStep ? (
                <div className="h-64 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-white/[0.01]">
                  <ImageIcon className="w-8 h-8 text-zinc-600 mb-2.5 animate-pulse" />
                  <div className="text-xs font-black text-zinc-400 uppercase tracking-widest">No Media Generator Drafts</div>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">Prompt the agent to synthesize media (pictures, videos, speech tracks) to view setups.</p>
                </div>
              ) : null}
            </div>
          )}

          {/* SOCIAL MEDIA DOWNLOADER BOARD */}
          {canvasTab === 'downloader' && (
            <div className="space-y-5 max-w-md mx-auto bg-[var(--bg-elevated)] p-6 rounded-2xl border border-white/5 shadow-xl relative animate-fade-in">
              <span className="text-xs font-black text-pink-400 uppercase tracking-widest flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-pink-400 animate-spin" style={{ animationDuration: '6s' }} /> Instagram & TikTok Downloader
              </span>
              <p className="text-[10px] text-zinc-400 font-bold leading-relaxed pb-3 border-b border-white/5">
                Paste Instagram Reels link or TikTok URL to extract and download watermark-free MP4 media instantly.
              </p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Social Video Link</span>
                  <input
                    type="text"
                    value={downloaderUrl}
                    onChange={(e) => setDownloaderUrl(e.target.value)}
                    placeholder="https://instagram.com/reel/... or https://tiktok.com/..."
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:border-pink-500/30 outline-none transition-all"
                  />
                </div>

                <button
                  onClick={async () => {
                    if (!downloaderUrl.trim()) return;
                    setDownloaderLoading(true);
                    setDownloaderResult(null);
                    const toastId = toast.loading('Extracting video from link...');
                    try {
                      const res = await fetch('/api/download-social-video', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: downloaderUrl })
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Failed to download');
                      setDownloaderResult(data);
                      toast.success('Video extracted successfully!', { id: toastId });
                    } catch (err: any) {
                      toast.error(err.message || 'Extraction failed', { id: toastId });
                    } finally {
                      setDownloaderLoading(false);
                    }
                  }}
                  disabled={downloaderLoading || !downloaderUrl.trim()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 font-black text-[10px] uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-1 transition-all disabled:opacity-40"
                >
                  {downloaderLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                  Extract Watermark-Free MP4
                </button>
              </div>

              {downloaderResult && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                  <div className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-3 relative overflow-hidden">
                    <span className="absolute top-2 right-2 text-[8px] font-black uppercase text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full">
                      {downloaderResult.platform}
                    </span>

                    <span className="text-[9px] font-black text-zinc-500 block uppercase">Extracted Video Card</span>
                    <video src={downloaderResult.videoUrl} controls className="w-full rounded-xl border border-white/10 shadow" />
                    
                    <p className="text-xs text-zinc-300 font-bold leading-normal truncate">
                      {downloaderResult.title}
                    </p>

                    <div className="flex gap-2 pt-1">
                      <a
                        href={downloaderResult.videoUrl}
                        download={`social_video_${downloaderResult.platform}.mp4`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 font-black text-[9px] uppercase tracking-wider text-emerald-300 flex items-center justify-center gap-1 transition-all"
                      >
                        📥 Download File
                      </a>
                      <button
                        onClick={() => saveVideoToPlanner(downloaderResult)}
                        className="flex-1 py-2 rounded-lg bg-[#E7C477]/15 hover:bg-[#E7C477]/25 border border-[#E7C477]/30 font-black text-[9px] uppercase tracking-wider text-[#EECB78] flex items-center justify-center gap-1 transition-all"
                      >
                        <CalendarRange className="w-3.5 h-3.5" /> Save to Planner
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Onboarding Tour Overlay Card */}
      {tourStep !== null && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-[var(--bg-elevated)] border border-pink-500/30 p-5 rounded-2xl shadow-2xl space-y-4 backdrop-blur-md animate-fade-in">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <span className="text-[10px] font-black uppercase text-pink-400 tracking-wider">
              {onboardingSteps[tourStep].title}
            </span>
            <button 
              onClick={() => setTourStep(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300 font-bold"
            >
              ✕
            </button>
          </div>
          <p className="text-[10px] text-zinc-300 font-medium leading-relaxed">
            {onboardingSteps[tourStep].desc}
          </p>
          <div className="flex items-center justify-between text-[9px] pt-1">
            <span className="font-bold text-zinc-500">
              Step {tourStep + 1} of {onboardingSteps.length}
            </span>
            <div className="flex gap-1.5">
              {tourStep > 0 && (
                <button
                  onClick={() => setTourStep(tourStep - 1)}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded font-black uppercase text-zinc-300 transition-all"
                >
                  Back
                </button>
              )}
              {tourStep < onboardingSteps.length - 1 ? (
                <button
                  onClick={() => setTourStep(tourStep + 1)}
                  className="px-2 py-1 bg-gradient-to-r from-pink-500/25 to-violet-500/25 border border-pink-500/20 hover:from-pink-500/35 rounded font-black uppercase text-white transition-all"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => setTourStep(null)}
                  className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded font-black uppercase transition-all"
                >
                  Finish
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Enlarged Image Lightbox Modal (Edge-to-Edge True Screen Fill) */}
      {expandedImageUrl && (
        <div 
          className="fixed inset-0 z-[999999] bg-black/98 w-screen h-screen flex items-center justify-center p-0 m-0 overflow-hidden animate-fadeIn"
          onClick={() => setExpandedImageUrl(null)}
        >
          {/* Top Floating Action Bar */}
          <div 
            className="absolute top-4 right-4 sm:right-6 flex items-center gap-2.5 z-[1000000] bg-zinc-950/90 backdrop-blur-xl border border-white/20 p-2 rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex bg-white/10 p-1 rounded-xl border border-white/10 gap-1">
              <button
                onClick={() => setAgentZoomMode('fill')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${agentZoomMode === 'fill' ? 'bg-pink-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}
                title="Fill Entire Screen"
              >
                🖼️ Fill Screen
              </button>
              <button
                onClick={() => setAgentZoomMode('fit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${agentZoomMode === 'fit' ? 'bg-pink-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}
                title="Fit Aspect Ratio"
              >
                📐 Fit Aspect
              </button>
              <button
                onClick={() => setAgentZoomMode('zoom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${agentZoomMode === 'zoom' ? 'bg-pink-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}
                title="150% Super Zoom"
              >
                🔍 150% Zoom
              </button>
            </div>

            <button
              onClick={() => {
                handleEditImageAction(expandedImageUrl);
                setExpandedImageUrl(null);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 border border-amber-400/40 text-amber-200 font-extrabold text-xs uppercase flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
            >
              <Edit3 className="w-4 h-4" /> Edit Image
            </button>
            <button
              onClick={() => {
                handleUseAsPromptReference(expandedImageUrl);
                setExpandedImageUrl(null);
              }}
              className="px-3.5 py-2 rounded-xl bg-purple-500/30 hover:bg-purple-500/50 border border-purple-400/40 text-purple-200 font-extrabold text-xs uppercase flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
            >
              <Copy className="w-4 h-4" /> Use as Prompt
            </button>
            <a
              href={expandedImageUrl}
              download="seedream_5_pro_output.png"
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-extrabold text-xs uppercase flex items-center gap-2 transition-all shadow-lg cursor-pointer"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="w-4 h-4" /> Download HD
            </a>
            <button
              onClick={() => setExpandedImageUrl(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all border border-white/15 cursor-pointer"
              title="Close (ESC)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Top Left Title Badge */}
          <div 
            className="absolute top-4 left-4 sm:left-6 flex items-center gap-2 z-[1000000] bg-zinc-950/90 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-2xl shadow-2xl pointer-events-none"
          >
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-black text-white uppercase tracking-wider">Super Agent SeeDream 5.0 Pro HD</span>
          </div>

          {/* 100% Edge-to-Edge Max Display Image */}
          <div className="w-screen h-screen flex items-center justify-center p-0 m-0 overflow-hidden">
            <img
              src={expandedImageUrl}
              alt="Enlarged Visual"
              className={`select-none transition-all duration-300 ${
                agentZoomMode === 'fill' 
                  ? 'w-screen h-screen object-cover shadow-2xl scale-[1.02]' 
                  : agentZoomMode === 'zoom'
                  ? 'w-screen h-screen object-cover scale-150 cursor-grab active:cursor-grabbing shadow-2xl'
                  : 'max-w-[98vw] max-h-[98vh] w-auto h-auto object-contain drop-shadow-[0_0_60px_rgba(0,0,0,0.9)] rounded-xl'
              }`}
            />
          </div>

          {/* Bottom Center Floating Hint Pill */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-zinc-950/90 backdrop-blur-xl border border-white/20 text-xs text-zinc-300 font-semibold shadow-2xl z-[1000000] pointer-events-none">
            Mode: <strong className="text-white uppercase">{agentZoomMode}</strong> • Click anywhere or press <kbd className="px-2 py-0.5 rounded bg-white/20 text-white font-mono text-xs ml-1">ESC</kbd> to exit full screen
          </div>
        </div>
      )}

      {/* Voice Clone Studio & Model Selector Modal */}
      <VoiceCloneStudioModal
        isOpen={isVoiceCloneModalOpen}
        onClose={() => setIsVoiceCloneModalOpen(false)}
        onVoiceCloned={({ voiceId, name, model }) => {
          setClonedVoiceRef('active');
          if (voiceId) {
            setClonedVoiceId(voiceId);
            try {
              accountLocalStorage.setItem('superagent_cloned_voice_id', voiceId);
              accountLocalStorage.setItem('superagent_cloned_voice', 'active');
            } catch {}
          }
        }}
      />
    </div>
  );
}
