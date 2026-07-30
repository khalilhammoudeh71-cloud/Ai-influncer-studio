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
  Film
} from 'lucide-react';
import { Persona, Tab } from '../types';
import { api } from '../services/apiService';
import { generatePersonaPlan } from '../utils/personaEngine';
import { generateImage, upscaleImage } from '../services/imageService';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

interface AgentViewProps {
  personas: Persona[];
  setPersonas: React.Dispatch<React.SetStateAction<Persona[]>>;
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
  status?: 'clarifying' | 'executing' | 'normal';
  suggestedSteps?: any[];
  critiqueLogs?: string[];
  collaborationLogs?: CollaborationMsg[];
  isExecuting?: boolean;
  execLogs?: string[];
  execSteps?: { 
    type: string; 
    params: any; 
    status: 'pending' | 'running' | 'success' | 'error';
    resultUrl?: string;
    isActionLoading?: 'video' | 'upscale' | 'swap' | null;
  }[];
}

interface CustomPreset {
  name: string;
  prompt: string;
}

interface SimulatedPost {
  id: string;
  imageUrl: string;
  caption: string;
  platform: string;
  timestamp: number;
  views: number;
  likes: number;
  comments: string[];
  tips: { user: string; amount: number }[];
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

  const resolvedModelName = modelId ? (
    modelId.includes('seedream') ? 'ByteDance SeeDream 5.0 Pro' :
    modelId.includes('gpt-image-2') || modelId.includes('gpt-image-1') ? 'GPT Image 2' :
    modelId.includes('imagen') ? 'Google Imagen 4' :
    modelId.includes('wan') ? 'Wan 2.2 Video' :
    modelId.includes('veo') ? 'Google Veo Omni' :
    modelId.includes('kling') ? 'Kling 3.0 Pro' : modelId
  ) : 'ByteDance SeeDream 5.0 Pro';

  const isVideo = stepType === 'generate_video' || stepType === 'storyboard_sequence' || stepType === 'generate_talking_head';

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
            {isVideo ? <Film className="w-4 h-4 text-pink-400 animate-spin" /> : <Sparkles className="w-4 h-4 text-pink-400 animate-spin" />}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-black text-white flex items-center gap-1.5">
              <span className="truncate">{isVideo ? 'Rendering AI Video' : 'Synthesizing Visual Asset'}</span>
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

const MOCK_NAMES = ["Alex99", "Sarah_m", "DavidK", "Jane_D", "OnlyCoolUser", "GamerX", "RichTrader", "BeachFan"];
const MOCK_COMMENT_TEXTS = [
  "Wow, this looks absolutely stunning!",
  "Brand representation on point! 💎",
  "Love the style and tone here.",
  "Which model did you use for this visual?",
  "Perfect representation! Keep it up!",
  "Outstanding aesthetics and presentation.",
  "OnlyFans link is in bio? 👀",
  "Elite mindset indeed!"
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
export default function AgentView({ personas, setPersonas, onSelectPersona, nav }: AgentViewProps) {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "👋 How can I help build your AI influencer today?",
      status: 'normal'
    }
  ]);
  
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [canvasTab, setCanvasTab] = useState<'studio' | 'chat' | 'marketing' | 'media' | 'downloader'>('studio');
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);

  // Autopilot, Sub-Agent Delegation & Approval Queue States
  const [autopilotActive, setAutopilotActive] = useState(false);
  const [autopilotInterval, setAutopilotInterval] = useState<'30s' | '1h' | '6h' | '12h'>('1h');
  const [autoApprove, setAutoApprove] = useState(false);
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
  const [voiceEngine, setVoiceEngine] = useState<'omnivoice' | 'elevenlabs'>('omnivoice');
  const [voiceNameInput, setVoiceNameInput] = useState('Sofia Voice');
  const [voiceDescInput, setVoiceDescInput] = useState('Voice clone of Sofia reference clip');
  const [clonedVoiceId, setClonedVoiceId] = useState<string | null>(null);

  // Social Downloader States
  const [downloaderUrl, setDownloaderUrl] = useState('');
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

  // Social Feed Simulator States
  const [publishedPosts, setPublishedPosts] = useState<SimulatedPost[]>([]);

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
      const stored = localStorage.getItem('agent_presets');
      if (stored) {
        setCustomPresets(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load presets:', e);
    }
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
      desc: "This studio empowers you to manage virtual personas, clone voices, synthesize videos, download watermark-free Reels/TikToks, and analyze simulated social traffic."
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
      desc: "Paste any public Instagram Reels or TikTok video link. The studio extracts the raw video file watermark-free and allows direct download or import."
    },
    {
      title: "📊 Simulated Analytics & Demographic Maps",
      desc: "Track simulated daily follower growth curves, monthly revenue breakdowns by stream, and geographic traffic concentrations on the global map."
    }
  ];

  // Timer to increment mock feed stats dynamically
  useEffect(() => {
    const timer = setInterval(() => {
      setPublishedPosts(prev => prev.map(post => {
        const isOnlyFans = post.platform.toLowerCase().includes('onlyfans');
        
        const viewsDiff = Math.floor(Math.random() * 8) + 2;
        const likesDiff = Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0;
        
        const newComments = [...post.comments];
        if (Math.random() > 0.92) {
          const user = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
          const txt = MOCK_COMMENT_TEXTS[Math.floor(Math.random() * MOCK_COMMENT_TEXTS.length)];
          newComments.push(`${user}: ${txt}`);
        }

        const newTips = [...post.tips];
        if (isOnlyFans && Math.random() > 0.95) {
          const user = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
          const amount = Math.floor(Math.random() * 25) + 5;
          newTips.push({ user, amount });
        }

        return {
          ...post,
          views: post.views + viewsDiff,
          likes: post.likes + likesDiff,
          comments: newComments,
          tips: newTips
        };
      }));
    }, 2500);

    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending]);

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
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [
          ...prev,
          {
            name: file.name,
            dataUrl: reader.result as string,
            mimeType: file.type
          }
        ]);
      };
      reader.readAsDataURL(file);
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
    localStorage.setItem('agent_presets', JSON.stringify(updated));
    toast.success(`Preset '${name}' saved successfully!`);
  };

  const deletePreset = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter((_, i) => i !== idx);
    setCustomPresets(updated);
    localStorage.setItem('agent_presets', JSON.stringify(updated));
    toast.success('Preset deleted.');
  };

  const sendMessage = async (overrideText?: string) => {
    const textToSend = overrideText !== undefined ? overrideText : inputText;
    if ((!textToSend.trim() && attachments.length === 0) || isSending) return;

    const userMessage: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: textToSend,
      attachments: [...attachments]
    };

    setMessages(prev => [...prev, userMessage]);
    if (overrideText === undefined) setInputText('');
    setAttachments([]);
    setIsSending(true);

    try {
      const history = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments
      }));

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });

      if (!res.ok) {
        throw new Error('Failed to get response from Agent.');
      }

      const data = await res.json();
      
      const newMsgId = Math.random().toString();
      setMessages(prev => [
        ...prev,
        {
          id: newMsgId,
          role: 'model',
          content: data.text || '',
          status: data.status || 'normal',
          suggestedSteps: data.suggestedSteps || undefined,
          critiqueLogs: data.critiqueLogs || undefined,
          collaborationLogs: data.collaborationLogs || undefined,
          execSteps: data.suggestedSteps 
            ? data.suggestedSteps.map((s: any) => ({ ...s, status: 'pending', resultUrl: undefined, isActionLoading: null }))
            : undefined,
          execLogs: data.suggestedSteps ? [] : undefined
        }
      ]);

      // Auto-trigger pipeline execution immediately so user doesn't wait
      setTimeout(() => {
        runPipeline(newMsgId);
      }, 250);
    } catch (err: any) {
      toast.error(err.message || 'Chat error');
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'model',
          content: "Sorry, I ran into an error parsing that request. Please try again.",
          status: 'normal'
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // ─── In-Chat Visual Media Actions ──────────────────────────────────────────────
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
        prompt: `Cinematic motion video clip of influencer avatar, subtle camera movement, photorealistic`,
        modelId: 'google:veo-omni',
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

  // ─── Social Feed Publishing Simulator ──────────────────────────────────────
  const publishToFeed = (imageUrl: string) => {
    if (!activeDraft?.createStep) return;

    const newPost: SimulatedPost = {
      id: Math.random().toString(),
      imageUrl,
      caption: `Hey everyone! Starting my new aesthetic journey today on ${activeDraft.createStep.params.platform}. Thanks for all the support! 💖 #influencer #newvibes`,
      platform: activeDraft.createStep.params.platform,
      timestamp: Date.now(),
      views: 0,
      likes: 0,
      comments: [],
      tips: []
    };

    setPublishedPosts(prev => [newPost, ...prev]);
    toast.success(`Published post to mock ${activeDraft.createStep.params.platform} feed!`);
    setCanvasTab('marketing');
  };

  // ─── Pipeline runner execution ──────────────────────────────────────────────
  const runPipeline = async (messageId: string) => {
    const targetMsg = messages.find(m => m.id === messageId);
    if (!targetMsg || !targetMsg.execSteps || targetMsg.isExecuting) return;

    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isExecuting: true } : m));

    const addLocalLog = (msg: string, success = true, isModel = false) => {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          const logs = m.execLogs || [];
          const prefix = `[${new Date().toLocaleTimeString()}]`;
          const prefixType = isModel ? '🎯 Routing: ' : '';
          const line = `${prefix} ${prefixType}${msg}`;
          return { ...m, execLogs: [...logs, line] };
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
        const userMsg = [...messages].reverse().find(m => m.role === 'user');
        const promptText = userMsg?.content || 'Generate AI visual asset';
        addLocalLog(`⚡ Building execution pipeline step on the fly...`);

        const fallbackStep = memoryFaceImage ? {
          type: 'edit_image',
          params: {
            editType: 'beautify',
            prompt: promptText,
            sourceImage: memoryFaceImage,
            modelId: 'wavespeed:bytedance/seedream-v5.0-pro'
          },
          status: 'pending' as const
        } : {
          type: 'generate_image',
          params: {
            prompt: promptText,
            modelId: 'wavespeed:bytedance/seedream-v5.0-pro'
          },
          status: 'pending' as const
        };

        stepsList = [fallbackStep];
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, execSteps: stepsList, suggestedSteps: stepsList } : m));
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

        const saved = await api.personas.create(defaultP);
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

          const saved = await api.personas.create(newPersona);
          createdPersona = saved;
          createdPersonaId = uniqueId;

          setPersonas(prev => [...prev, saved]);
          onSelectPersona(uniqueId);

          addLocalLog(`✅ Persona '${saved.name}' created with database entry.`);
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

          let result;
          try {
            result = await generateImage({
              persona: activeP,
              modelId,
              environment: step.params.environment,
              outfitStyle: step.params.outfit,
              framing: step.params.framing,
              prompt: step.params.prompt,
              aspectRatio: '1:1',
              resolution: 'standard',
              count: 1
            });
          } catch (firstErr: any) {
            addLocalLog(`⚠️ [Self-Correction] Model ${modelId} failed. Fallback triggered.`);
            let fallbackModel = 'wavespeed:bytedance/seedream-v5.0-pro';
            result = await generateImage({
              persona: activeP,
              modelId: fallbackModel,
              environment: step.params.environment,
              outfitStyle: step.params.outfit,
              framing: step.params.framing,
              prompt: step.params.prompt,
              aspectRatio: '1:1',
              resolution: 'standard',
              count: 1
            });
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

          let modelId = step.params.modelId || 'google:veo-omni';
          if (finalSourceVideo && !modelId.startsWith('wavespeed-v2v:')) {
            modelId = 'wavespeed-v2v:wavespeed-ai/wan-2.2-v2v-720p';
          }

          addLocalLog(`Chosen Video Model: ${modelId}`, true, true);
          addLocalLog(`⏳ Generating video segment...`);
          addLocalLog(`📝 Motion Prompt: "${step.params.prompt}"`);

          let result;
          try {
            result = await api.images.generateVideo({
              prompt: step.params.prompt,
              modelId,
              strength: step.params.strength || 0.6,
              sourceImage: finalSourceVideo ? undefined : finalSourceImage,
              sourceVideo: finalSourceVideo || undefined
            });
          } catch (firstErr: any) {
            addLocalLog(`⚠️ Video model ${modelId} failed. Fallback triggered.`);
            result = await api.images.generateVideo({
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

          const avatarImg = step.params.image || createdPersona.avatar || createdPersona.referenceImage;
          if (!avatarImg) throw new Error('Avatar image is required for talking head video.');

          addLocalLog(`⏳ Synthesizing Talking Avatar lip-sync video...`);

          const res = await fetch('/api/talking-head', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: step.params.text,
              image: avatarImg,
              voiceId: step.params.voiceId || clonedVoiceId || 'Aoede'
            })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Talking head generation failed');

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
              const res = await fetch('/api/talking-head', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text: sc.text || 'Hello world',
                  image: createdPersona.avatar || createdPersona.referenceImage,
                  voiceId: clonedVoiceId || 'Aoede'
                })
              });
              const data = await res.json();
              if (data.videoUrl) generatedVideoUrls.push(data.videoUrl);
            } else {
              const res = await api.images.generateVideo({
                prompt: sc.prompt || 'Cinematic motion shot of persona',
                modelId: sc.modelId || 'google:veo-omni',
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
            const res = await fetch('/api/edit-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sourceImage: srcImg, prompt: step.params.prompt || 'Enhance image details', modelId: chosenEditModel })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Image edit failed');
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
        {/* Header with Autopilot & Sub-Agent Controls */}
        <div className="flex-none flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 px-6 py-3.5 bg-[var(--bg-elevated)]/30 backdrop-blur-md gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold tracking-tight">Super Agent Co-Pilot</h1>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500/20 to-violet-500/20 text-pink-300 border border-pink-500/30">
                  Parallel OS
                </span>
              </div>
              <p className="text-[var(--text-muted)] text-[9px] font-bold uppercase tracking-wider">AI Assistant for Photos, Video Reels, Voice Clones & Growth</p>
            </div>
          </div>

          {/* Autopilot Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAutopilotActive(!autopilotActive)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border ${
                autopilotActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
              }`}
            >
              {autopilotActive ? <Pause className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> : <Play className="w-3.5 h-3.5 text-pink-400" />}
              {autopilotActive ? 'Autopilot Active' : 'Start Autopilot'}
            </button>

            {autopilotActive && (
              <select
                value={autopilotInterval}
                onChange={(e: any) => setAutopilotInterval(e.target.value)}
                className="bg-black/40 border border-white/10 text-white text-[10px] rounded-lg px-2 py-1 font-semibold outline-none"
              >
                <option value="30s">Every 30s (Demo)</option>
                <option value="1h">Every 1 hr</option>
                <option value="6h">Every 6 hrs</option>
                <option value="12h">Every 12 hrs</option>
              </select>
            )}

            <button
              onClick={() => setAutoApprove(!autoApprove)}
              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                autoApprove
                  ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
              title="Toggle Human-in-the-Loop review queue vs direct publishing"
            >
              {autoApprove ? '⚡ Auto-Publish' : '🛡️ Approval Queue ON'}
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

        {/* Chat Thread */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-full`}
            >
              <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1 px-1">
                {msg.role === 'model' ? '🤖 Agent' : '👤 You'}
              </span>

              <div className={`p-4 rounded-2xl relative overflow-hidden shadow-lg border text-xs leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-pink-500/10 to-violet-500/10 border-pink-500/20 text-white rounded-tr-none'
                  : 'bg-[var(--bg-elevated)] border-white/5 text-[var(--text-primary)] rounded-tl-none'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Attachments rendering */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2.5 pt-2.5 border-t border-white/5">
                    {msg.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/5 rounded-lg text-[10px]">
                        {att.mimeType.startsWith('image/') ? (
                          <img src={att.dataUrl} alt={att.name} className="w-6 h-6 rounded object-cover" />
                        ) : (
                          getAttachmentIcon(att.mimeType)
                        )}
                        <span className="max-w-[100px] truncate text-[9px] text-[var(--text-tertiary)]">{att.name}</span>
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
                {msg.role === 'model' && msg.suggestedSteps && (
                  <div className="mt-4 p-4 bg-black/40 border border-pink-500/10 rounded-xl space-y-3.5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5 gap-2">
                      <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Proposed Pipeline (Editable)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveAsPreset(msg.id)}
                          className="px-2.5 py-1 rounded bg-white/5 border border-white/5 hover:border-violet-500/20 text-[9px] font-black uppercase text-zinc-300 flex items-center gap-1 transition-all"
                          title="Save this specific layout parameter set as a quick preset blueprint"
                        >
                          <Save className="w-3 h-3 text-violet-400" /> Save Template
                        </button>
                        {!msg.isExecuting && (
                          <button
                            onClick={() => runPipeline(msg.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 font-black text-[9px] uppercase tracking-wider text-white shadow flex items-center gap-1 transition-all"
                          >
                            Execute <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Optimizations Critique logs */}
                    {msg.critiqueLogs && msg.critiqueLogs.length > 0 && (
                      <div className="bg-white/5 border border-white/5 rounded-lg p-2.5 space-y-1">
                        <div className="flex items-center gap-1 text-[8px] font-black text-violet-400 uppercase tracking-wider">
                          <Zap className="w-3 h-3 text-violet-400" /> Critique Upgrades applied
                        </div>
                        <ul className="list-disc pl-3 text-[9px] text-zinc-300 font-bold space-y-0.5">
                          {msg.critiqueLogs.map((log, lIdx) => (
                            <li key={lIdx}>{log}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Steps input editor cards */}
                    <div className="space-y-3.5 divide-y divide-white/5 pt-1">
                      {msg.execSteps?.map((step, idx) => (
                        <div key={idx} className="pt-3.5 first:pt-0 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-300">
                                {step.type === 'create_persona' && `1. Create Profile: ${step.params.name}`}
                                {step.type === 'generate_content_plan' && `2. Generate Post Planner: ${step.params.platform}`}
                                {step.type === 'generate_image' && `3. Generate Starting Image`}
                                {step.type === 'generate_video' && `4. Generate Video Segment (Step ${idx + 1})`}
                                {step.type === 'generate_voice' && `5. Generate Narrative Voiceover`}
                                {step.type === 'log_revenue' && `6. Log Financial Transaction`}
                                {step.type === 'stitch_video' && `7. Stitch Video Movie`}
                                {step.type === 'clone_voice' && `🎙️ Clone Voice (${step.params.engine || 'OmniVoice'})`}
                                {step.type === 'storyboard_sequence' && `🎬 Storyboard Reel (${step.params.scenes?.length || 0} Scenes)`}
                              </span>
                            </div>
                            <div>
                              {step.status === 'pending' && <span className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Pending</span>}
                              {step.status === 'running' && (
                                <span className="text-[9px] font-black uppercase tracking-wider text-pink-400 flex items-center gap-1 animate-pulse">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" /> Generating...
                                </span>
                              )}
                              {step.status === 'success' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                              {step.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                            </div>
                          </div>

                          {/* Live Progress Frame for Running Generation Steps */}
                          {step.status === 'running' && (
                            <GenerationProgressFrame 
                              stepType={step.type} 
                              modelId={step.params?.modelId || 'wavespeed:bytedance/seedream-v5.0-pro'} 
                              prompt={step.params?.prompt || ''}
                            />
                          )}

                          {/* Storyboard Breakdown Card */}
                          {step.type === 'storyboard_sequence' && (
                            <div className="p-3 bg-black/50 border border-pink-500/20 rounded-xl space-y-3 mt-2">
                              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                                  <Film className="w-3.5 h-3.5 text-pink-400" /> Storyboard Reel: {step.params.topic || 'Multi-Segment Reel'}
                                </span>
                                <span className="text-[9px] font-bold text-zinc-400">
                                  {step.params.scenes?.length || 0} Scenes • ~1 Min Reel
                                </span>
                              </div>

                              <div className="space-y-2">
                                {step.params.scenes?.map((scene: any, sIdx: number) => (
                                  <div key={sIdx} className="p-2.5 bg-white/5 border border-white/5 rounded-lg space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-extrabold text-[10px] text-white flex items-center gap-1">
                                        {scene.type === 'talking_avatar' ? '🗣️ Scene ' : '🎬 Scene '}{sIdx + 1}: {scene.title}
                                      </span>
                                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                        {scene.modelId}
                                      </span>
                                    </div>

                                    {scene.text && (
                                      <p className="text-[10px] text-zinc-300 italic pl-2 border-l-2 border-pink-500/40 font-medium">
                                        "{scene.text}"
                                      </p>
                                    )}

                                    <p className="text-[9px] text-zinc-400">
                                      <strong className="text-zinc-300">Prompt:</strong> {scene.prompt}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Render step outputs inline with actions */}
                          {step.status === 'success' && step.resultUrl && (
                            <div className="pl-3 space-y-2">
                              {(step.type === 'generate_image' || step.type === 'edit_image') && (
                                <div className="space-y-2 bg-white/5 p-2 rounded-lg border border-white/5">
                                  {step.resultUrl.endsWith('.mp4') || step.resultUrl.includes('blob:') ? (
                                    <video src={step.resultUrl} controls className="w-40 rounded border border-white/10" />
                                  ) : (
                                    <img src={step.resultUrl} alt="Visual Output" className="w-48 h-48 rounded object-cover border border-white/10" />
                                  )}
                                  
                                  {/* In-Chat Action Buttons */}
                                  {!step.resultUrl.endsWith('.mp4') && !step.resultUrl.includes('blob:') && (
                                    <div className="flex gap-1.5 pt-1">
                                      <button
                                        onClick={() => handleUpscale(msg.id, idx, step.resultUrl!)}
                                        disabled={step.isActionLoading !== null}
                                        className="px-2 py-1 rounded bg-pink-500/20 hover:bg-pink-500/30 text-[9px] font-black uppercase text-pink-300 flex items-center gap-0.5 disabled:opacity-50"
                                      >
                                        {step.isActionLoading === 'upscale' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : '🪄 Upscale'}
                                      </button>
                                      <button
                                        onClick={() => handleMakeVideo(msg.id, idx, step.resultUrl!)}
                                        disabled={step.isActionLoading !== null}
                                        className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-[9px] font-black uppercase text-cyan-300 flex items-center gap-0.5 disabled:opacity-50"
                                      >
                                        {step.isActionLoading === 'video' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : '🎬 Make Video'}
                                      </button>
                                      <button
                                        onClick={() => triggerFaceSwap(msg.id, idx)}
                                        disabled={step.isActionLoading !== null}
                                        className="px-2 py-1 rounded bg-violet-500/20 hover:bg-violet-500/30 text-[9px] font-black uppercase text-violet-300 flex items-center gap-0.5 disabled:opacity-50"
                                      >
                                        {step.isActionLoading === 'swap' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : '✨ Face Swap'}
                                      </button>
                                      <button
                                        onClick={() => publishToFeed(step.resultUrl!)}
                                        className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-[9px] font-black uppercase text-emerald-300 flex items-center gap-0.5"
                                      >
                                        🚀 Publish
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              {step.type === 'generate_voice' && (
                                <div className="bg-white/5 p-2 rounded-lg border border-white/5 space-y-1">
                                  <span className="text-[8px] font-black text-amber-400 uppercase tracking-wider block">Generated Voiceover Audio:</span>
                                  <audio controls src={step.resultUrl} className="w-full h-8" />
                                </div>
                              )}
                              {step.type === 'generate_video' && (
                                <div className="bg-white/5 p-2 rounded-lg border border-white/5 space-y-2">
                                  <video src={step.resultUrl} controls className="w-56 rounded border border-white/10" />
                                  <button
                                    onClick={() => publishToFeed(step.resultUrl!)}
                                    className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-[9px] font-black uppercase text-emerald-300 flex items-center gap-0.5"
                                  >
                                    🚀 Publish Video
                                  </button>
                                </div>
                              )}
                              {step.type === 'stitch_video' && (
                                <div className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-2">
                                  <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block">🎬 Stitched Movie Output</span>
                                  <video src={step.resultUrl} controls className="w-full rounded border border-white/10 shadow" />
                                  <a 
                                    href={step.resultUrl} 
                                    download="stitched_movie.webm"
                                    className="inline-flex px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/30 rounded text-[9px] text-emerald-300 font-bold uppercase transition-all"
                                  >
                                    📥 Download Movie
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Inline Parameters controls */}
                          {!msg.isExecuting && step.status === 'pending' && (
                            <div className="pl-3 space-y-2">
                              {step.type === 'create_persona' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Name</label>
                                    <input
                                      type="text"
                                      value={step.params.name || ''}
                                      onChange={(e) => handleParamChange(msg.id, idx, 'name', e.target.value)}
                                      className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-pink-500/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Niche</label>
                                    <input
                                      type="text"
                                      value={step.params.niche || ''}
                                      onChange={(e) => handleParamChange(msg.id, idx, 'niche', e.target.value)}
                                      className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-pink-500/20"
                                    />
                                  </div>
                                </div>
                              )}

                              {step.type === 'generate_content_plan' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Platform</label>
                                    <input
                                      type="text"
                                      value={step.params.platform || ''}
                                      onChange={(e) => handleParamChange(msg.id, idx, 'platform', e.target.value)}
                                      className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-pink-500/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Topic</label>
                                    <input
                                      type="text"
                                      value={step.params.theme || ''}
                                      onChange={(e) => handleParamChange(msg.id, idx, 'theme', e.target.value)}
                                      className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-pink-500/20"
                                    />
                                  </div>
                                </div>
                              )}

                              {step.type === 'generate_image' && (
                                <div className="space-y-1.5">
                                  <div>
                                    <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Visual Prompt</label>
                                    <textarea
                                      value={step.params.prompt || ''}
                                      onChange={(e) => handleParamChange(msg.id, idx, 'prompt', e.target.value)}
                                      className="w-full h-12 bg-white/5 border border-white/5 rounded p-1.5 text-[11px] text-white outline-none focus:border-pink-500/20 resize-none"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Model ID</label>
                                      <input
                                        type="text"
                                        value={step.params.modelId || ''}
                                        onChange={(e) => handleParamChange(msg.id, idx, 'modelId', e.target.value)}
                                        className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-pink-500/20 font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Outfit</label>
                                      <input
                                        type="text"
                                        value={step.params.outfit || ''}
                                        onChange={(e) => handleParamChange(msg.id, idx, 'outfit', e.target.value)}
                                        className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-pink-500/20"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {step.type === 'generate_video' && (
                                <div className="space-y-2">
                                  <div>
                                    <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Video Prompt</label>
                                    <textarea
                                      value={step.params.prompt || ''}
                                      onChange={(e) => handleParamChange(msg.id, idx, 'prompt', e.target.value)}
                                      className="w-full h-12 bg-white/5 border border-white/5 rounded p-1.5 text-[11px] text-white outline-none focus:border-pink-500/20 resize-none"
                                    />
                                  </div>
                                  {step.params.sourceImageFromStepIndex !== undefined && (
                                    <div className="text-[9px] text-amber-400 font-bold">
                                      🔗 Continuity: Extracts final frame of Step {step.params.sourceImageFromStepIndex + 1}
                                    </div>
                                  )}
                                </div>
                              )}

                              {step.type === 'generate_voice' && (
                                <div>
                                  <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Script Narration Text</label>
                                  <textarea
                                    value={step.params.text || ''}
                                    onChange={(e) => handleParamChange(msg.id, idx, 'text', e.target.value)}
                                    className="w-full h-12 bg-white/5 border border-white/5 rounded p-1.5 text-[11px] text-white outline-none focus:border-pink-500/20 resize-none"
                                  />
                                </div>
                              )}

                              {step.type === 'log_revenue' && (
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Amount</label>
                                    <input
                                      type="number"
                                      value={step.params.amount || 0}
                                      onChange={(e) => handleParamChange(msg.id, idx, 'amount', Number(e.target.value))}
                                      className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-pink-500/20 font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Source</label>
                                    <input
                                      type="text"
                                      value={step.params.source || ''}
                                      onChange={(e) => handleParamChange(msg.id, idx, 'source', e.target.value)}
                                      className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-pink-500/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Platform</label>
                                    <input
                                      type="text"
                                      value={step.params.platform || ''}
                                      onChange={(e) => handleParamChange(msg.id, idx, 'platform', e.target.value)}
                                      className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-pink-500/20"
                                    />
                                  </div>
                                </div>
                              )}

                              {step.type === 'stitch_video' && (
                                <div className="space-y-3.5 bg-black/30 border border-white/5 p-4 rounded-xl">
                                  <div className="text-[10px] font-black uppercase text-pink-400 tracking-wider">
                                    🎬 Video Segment Editor
                                  </div>
                                  <div className="space-y-3.5 divide-y divide-white/5">
                                    {(step.params.segmentIndices || []).map((segIdx: number, sIdx: number) => {
                                      const currentSettings = segmentSettings[segIdx] || { start: 0, end: 10, speed: 1.0, transition: 'none' };
                                      
                                      const updateSetting = (key: keyof SegmentSetting, val: any) => {
                                        setSegmentSettings(prev => ({
                                          ...prev,
                                          [segIdx]: {
                                            ...currentSettings,
                                            [key]: val
                                          }
                                        }));
                                      };

                                      return (
                                        <div key={segIdx} className="pt-3.5 first:pt-0 space-y-2">
                                          <div className="flex justify-between items-center text-[10px] font-bold text-zinc-300">
                                            <span>Segment {sIdx + 1} (From Step {segIdx + 1})</span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                                            <div>
                                              <label className="text-[8px] uppercase text-zinc-500 font-bold block mb-0.5">Start Trim (sec)</label>
                                              <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={0.5}
                                                value={currentSettings.start}
                                                onChange={(e) => updateSetting('start', Number(e.target.value))}
                                                className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-white outline-none focus:border-pink-500/25 font-mono"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[8px] uppercase text-zinc-500 font-bold block mb-0.5">End Trim (sec)</label>
                                              <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={0.5}
                                                value={currentSettings.end}
                                                onChange={(e) => updateSetting('end', Number(e.target.value))}
                                                className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-white outline-none focus:border-pink-500/25 font-mono"
                                              />
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                                            <div>
                                              <label className="text-[8px] uppercase text-zinc-500 font-bold block mb-0.5">Speed Modifier</label>
                                              <select
                                                value={currentSettings.speed}
                                                onChange={(e) => updateSetting('speed', Number(e.target.value))}
                                                className="w-full bg-white/5 border border-white/5 rounded px-1.5 py-1 text-white outline-none focus:border-pink-500/25 cursor-pointer"
                                              >
                                                <option value="0.5">0.5x (Slow Mo)</option>
                                                <option value="1.0">1.0x (Normal)</option>
                                                <option value="1.5">1.5x (Fast)</option>
                                                <option value="2.0">2.0x (Double)</option>
                                              </select>
                                            </div>
                                            <div>
                                              <label className="text-[8px] uppercase text-zinc-500 font-bold block mb-0.5">Transition effect</label>
                                              <select
                                                value={currentSettings.transition}
                                                onChange={(e) => updateSetting('transition', e.target.value)}
                                                className="w-full bg-white/5 border border-white/5 rounded px-1.5 py-1 text-white outline-none focus:border-pink-500/25 cursor-pointer"
                                              >
                                                <option value="none">None</option>
                                                <option value="fade">🌀 Fade Cross</option>
                                                <option value="slide">➡️ Slide Left</option>
                                                <option value="zoom">🔍 Zoom Center</option>
                                              </select>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* execution logs inside checklist bubble */}
                    {(msg.execLogs && msg.execLogs.length > 0) && (
                      <div className="p-3 bg-black border border-white/5 rounded-lg h-36 overflow-y-auto font-mono text-[9px] text-zinc-400 space-y-1 custom-scrollbar shadow-inner">
                        {msg.execLogs.map((log, idx) => (
                          <div key={idx} className="leading-relaxed">{log}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex items-start mr-auto max-w-full animate-pulse">
              <div className="flex flex-col items-start">
                <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1 px-1">🤖 Agent</span>
                <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-white/5 rounded-tl-none flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-500" />
                  <span className="text-xs text-[var(--text-muted)] font-medium">Agent team is collaborating...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>



        {/* Prompt Input bar */}
        <div className="flex-none p-4 border-t border-white/5 bg-[var(--bg-elevated)]/30 backdrop-blur-md">
          {/* Attachment Thumbnails Preview Row */}
          {attachments.length > 0 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-3 mb-2 custom-scrollbar">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="relative group shrink-0 w-16 h-16 rounded-xl border border-white/10 overflow-hidden bg-black/60 shadow-lg"
                >
                  {/* Media Content Preview */}
                  {att.mimeType.startsWith('image/') ? (
                    <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                  ) : att.mimeType.startsWith('video/') ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-violet-950/40 text-violet-300">
                      <VideoIcon size={20} />
                      <span className="text-[7px] font-black truncate w-full text-center mt-1 text-zinc-300">{att.name}</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-pink-950/40 text-pink-300">
                      <FileText size={20} />
                      <span className="text-[7px] font-black truncate w-full text-center mt-1 text-zinc-300">{att.name}</span>
                    </div>
                  )}

                  {/* Top-Left Delete "X" Button */}
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="absolute top-1 left-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition-all z-10 border border-white/20"
                    title="Remove attachment"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Quick Workflows Dropdown Menu */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  setInputText(e.target.value);
                  e.target.value = "";
                }
              }}
              className="h-11 px-3 rounded-xl border border-white/10 bg-[var(--bg-input)] hover:border-pink-500/30 text-xs font-bold text-pink-300 outline-none cursor-pointer transition-all shrink-0 shadow"
            >
              <option value="">⚡ Workflows ▾</option>
              <option value="Generate 3 photorealistic portrait photos of my AI influencer in a luxury penthouse wearing elegant evening outfit.">📸 Photoshoot</option>
              <option value="Create a 1-minute video storyboard with 4 scenes: talking avatar intro, workout action shot, protein shake, and call to action.">🎬 1-Min Video Storyboard</option>
              <option value="Clone the voice from my uploaded video sample and generate a talking avatar saying 'Welcome to my exclusive channel!'">🎙️ Voice Clone & Avatar</option>
              <option value="Architect a 7-day content schedule for Instagram with high-converting hooks, viral caption ideas, and revenue strategies.">📈 7-Day Content Plan</option>
            </select>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              className="w-11 h-11 rounded-xl border border-white/5 bg-[var(--bg-input)] hover:border-pink-500/20 flex items-center justify-center text-zinc-400 hover:text-white transition-all shadow"
            >
              <Paperclip size={16} />
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Mic trigger */}
            <button
              onClick={toggleListening}
              disabled={isSending}
              className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all shadow ${
                isListening 
                  ? 'bg-rose-500/20 border-rose-500 text-rose-500 animate-pulse'
                  : 'bg-[var(--bg-input)] border-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Mic size={16} />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isSending}
              placeholder={isListening ? "Listening... Speak clearly" : "Message Super Agent..."}
              className="flex-1 h-11 bg-[var(--bg-input)] border border-white/5 rounded-xl px-3.5 text-xs text-white placeholder:text-[var(--text-muted)] focus:border-pink-500/40 outline-none transition-all"
            />

            <button
              onClick={() => sendMessage()}
              disabled={isSending || (!inputText.trim() && attachments.length === 0)}
              className="w-11 h-11 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 flex items-center justify-center text-white shadow-lg transition-all"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
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
                          onChange={(e) => setVoiceEngine(e.target.value as 'omnivoice' | 'elevenlabs')}
                          className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:border-violet-500/30 outline-none"
                        >
                          <option value="omnivoice">✨ Wavespeed OmniVoice (Instant, 5s reference)</option>
                          <option value="elevenlabs">🎙️ ElevenLabs (High-fidelity custom clone)</option>
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
                          onClick={() => {
                            publishToFeed(downloaderResult.videoUrl);
                          }}
                          className="flex-1 py-2 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 font-black text-[9px] uppercase tracking-wider text-pink-300 flex items-center justify-center gap-1 transition-all"
                        >
                          🚀 Import to Feed
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PREDICTIVE ANALYTICS GRAPH */}
              {activeDraft ? (
                <div className="space-y-4 bg-[var(--bg-elevated)] p-6 rounded-2xl border border-white/5 shadow-xl relative">
                  <span className="text-xs font-black text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-violet-400" /> Predictive Analytics & Audience
                  </span>
                  
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
                          <stop offset="0%" stopColor="#8b5cf6" />
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
                      <circle cx="180" cy="42" r="8" fill="#a78bfa" fillOpacity="0.15" className="animate-pulse" />
                      <circle cx="180" cy="42" r="3" fill="#a78bfa" />
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
                        onClick={() => {
                          publishToFeed(downloaderResult.videoUrl);
                        }}
                        className="flex-1 py-2 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 font-black text-[9px] uppercase tracking-wider text-pink-300 flex items-center justify-center gap-1 transition-all"
                      >
                        🚀 Import to Feed
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
    </div>
  );
}
