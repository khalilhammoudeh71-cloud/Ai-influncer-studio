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
  Users
} from 'lucide-react';
import { Persona, Tab } from '../types';
import { api } from '../services/apiService';
import { generatePersonaPlan } from '../utils/personaEngine';
import { generateImage, upscaleImage } from '../services/imageService';
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

const BASE_PRESETS: CustomPreset[] = [
  {
    name: "🎮 Twitch Gamer Sofia",
    prompt: "Create a gamer girl named Sofia who streams on Twitch, Minecraft niche. Schedule a 7-day flirty OnlyFans planner, a beach photo, and log $50 tips."
  },
  {
    name: "👔 Finance Coach Marco",
    prompt: "Create a stock trading finance motivator Marco on Twitter. Write a voice narrative about elite mindset, generate a luxury office photo, and log $150 sponsorship."
  },
  {
    name: "🏝️ Travel Blogger Elena",
    prompt: "Create a luxury travel blogger Elena, post platform Instagram. Write a script, generate a video of her on a tropical beach at sunset, and log $200 revenue."
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
async function stitchVideoSegments(videoUrls: string[]): Promise<string> {
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

  const playAndRecordSegment = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = url;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;

      let isEnded = false;
      let animFrameId: number;
      
      const renderFrame = () => {
        if (isEnded) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        animFrameId = requestAnimationFrame(renderFrame);
      };

      video.onplay = () => {
        renderFrame();
      };

      video.onended = () => {
        isEnded = true;
        cancelAnimationFrame(animFrameId);
        resolve();
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
      for (const url of videoUrls) {
        await playAndRecordSegment(url);
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
      content: "Hello! I am your AI Auto-Pilot Agent. Tell me who you want to build today!\n\nI can create a custom persona, design their content schedule, generate starting visuals, produce voice narrations, render cinematic video edits, and log sponsor/subscription revenue.\n\nNow supporting voice transcription input, dynamic model self-correction, and human-in-the-loop parameter adjustments before execution!",
      status: 'normal'
    }
  ]);
  
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [canvasTab, setCanvasTab] = useState<'profile' | 'planner' | 'studio' | 'chat' | 'feed' | 'analytics'>('profile');
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  
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

  const sendMessage = async () => {
    if ((!inputText.trim() && attachments.length === 0) || isSending) return;

    const userMessage: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: inputText,
      attachments: [...attachments]
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
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
      
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
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
    setCanvasTab('feed');
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

      const stepsList = targetMsg.execSteps || [];

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
          if (!createdPersona) {
            createdPersona = personas[0] || null;
            if (!createdPersona || createdPersona.id === 'empty') throw new Error('No active persona detected.');
            createdPersonaId = createdPersona.id;
          }

          if (memoryFaceImage && createdPersona) {
            addLocalLog(`🧠 [Memory System]: Syncing reference face photo for visual generation.`);
            createdPersona.referenceImage = memoryFaceImage;
          }

          let modelId = step.params.modelId || 'google:nano-banana-pro';
          addLocalLog(`Chosen Model ID: ${modelId}`, true, true);
          addLocalLog(`⏳ Spinning up visual generation pipeline...`);
          addLocalLog(`📝 Prompt: "${step.params.prompt}"`);

          let result;
          try {
            result = await generateImage({
              persona: createdPersona,
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
            let fallbackModel = 'google:nano-banana-pro';
            result = await generateImage({
              persona: createdPersona,
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

          const updatedPersona = {
            ...createdPersona,
            avatar: imageUrl,
            referenceImage: imageUrl
          };
          const savedPersona = await api.personas.update(updatedPersona);
          
          setPersonas(prev => prev.map(p => p.id === createdPersonaId ? savedPersona : p));

          addLocalLog(`✅ Profile avatar fully synced!`);
          updateStepStatus(i, 'success', imageUrl);
        }

        else if (step.type === 'generate_video') {
          if (!createdPersona) {
            createdPersona = personas[0] || null;
            if (!createdPersona || createdPersona.id === 'empty') throw new Error('No active persona detected.');
            createdPersonaId = createdPersona.id;
          }

          // Check if continuity frame requested from previous step
          let finalSourceImage = createdPersona.avatar || null;
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

            const stitchedMovieUrl = await stitchVideoSegments(urlsToStitch);
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

      {/* LEFT COLUMN: Agent Conversational Console */}
      <div className="w-1/2 flex flex-col h-full border-r border-white/5 relative">
        {/* Header */}
        <div className="flex-none flex items-center justify-between border-b border-white/5 px-6 py-4 bg-[var(--bg-elevated)]/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight">Super Agent Console</h1>
              <p className="text-[var(--text-muted)] text-[9px] font-bold uppercase tracking-wider">Multi-Agent Workspace</p>
            </div>
          </div>
          <div className="text-[9px] font-bold text-[var(--text-muted)] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Multi-API Routing
          </div>
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
                              </span>
                            </div>
                            <div>
                              {step.status === 'pending' && <span className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Pending</span>}
                              {step.status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />}
                              {step.status === 'success' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                              {step.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                            </div>
                          </div>

                          {/* Render step outputs inline with actions */}
                          {step.status === 'success' && step.resultUrl && (
                            <div className="pl-3 space-y-2">
                              {step.type === 'generate_image' && (
                                <div className="space-y-2 bg-white/5 p-2 rounded-lg border border-white/5">
                                  {step.resultUrl.endsWith('.mp4') || step.resultUrl.includes('blob:') ? (
                                    <video src={step.resultUrl} controls className="w-40 rounded border border-white/10" />
                                  ) : (
                                    <img src={step.resultUrl} alt="Visual Output" className="w-32 h-32 rounded object-cover border border-white/10" />
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
                                <div className="text-[10px] text-zinc-400">
                                  🎬 Will stitch video segments from steps: <span className="font-bold text-white">{(step.params.segmentIndices || []).map((x: number) => x + 1).join(', ')}</span>
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

        {/* Suggestion & Template Preset selection Row */}
        <div className="flex-none p-3 border-t border-white/5 bg-[var(--bg-elevated)]/15">
          <div className="max-w-full space-y-2">
            {/* Custom Template Presets Row */}
            {customPresets.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest shrink-0 flex items-center gap-0.5">
                  <Clock size={10} /> Presets:
                </span>
                <div className="flex gap-1.5 shrink-0">
                  {customPresets.map((p, idx) => (
                    <div
                      key={idx}
                      onClick={() => setInputText(p.prompt)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/5 bg-violet-950/20 hover:border-violet-500/20 text-[10px] font-bold text-violet-300 hover:text-white cursor-pointer transition-all"
                    >
                      <span>{p.name}</span>
                      <button
                        onClick={(e) => deletePreset(idx, e)}
                        className="w-3.5 h-3.5 rounded-full hover:bg-rose-500/30 flex items-center justify-center text-zinc-400 hover:text-white"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Base Suggestions Row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest shrink-0">Base:</span>
              <div className="flex gap-1.5">
                {BASE_PRESETS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputText(s.prompt)}
                    className="px-2.5 py-1 rounded-full border border-white/5 bg-white/[0.01] hover:border-pink-500/20 text-[10px] font-bold text-zinc-400 hover:text-white transition-all whitespace-nowrap"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Input bar */}
        <div className="flex-none p-4 border-t border-white/5 bg-[var(--bg-elevated)]/30 backdrop-blur-md">
          <div className="flex items-center gap-2">
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
              onClick={sendMessage}
              disabled={isSending || (!inputText.trim() && attachments.length === 0)}
              className="w-11 h-11 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 flex items-center justify-center text-white shadow-lg transition-all"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Agent Canvas Workspace */}
      <div className="w-1/2 flex flex-col h-full bg-[var(--bg-elevated)]/5">
        {/* Navigation Tabs bar */}
        <div className="flex-none flex items-center justify-between border-b border-white/5 px-6 py-4 bg-black/20">
          <span className="text-xs font-black text-pink-400 uppercase tracking-widest flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-pink-400" /> Canvas Workspace
          </span>
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/5 p-1 rounded-xl">
            {(['profile', 'planner', 'studio', 'chat', 'feed', 'analytics'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setCanvasTab(tab)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                  canvasTab === tab
                    ? 'bg-gradient-to-r from-pink-500/20 to-violet-500/20 border border-pink-500/30 text-white'
                    : 'text-zinc-400 hover:text-white border border-transparent'
                }`}
              >
                {tab === 'profile' && 'Card'}
                {tab === 'planner' && 'Calendar'}
                {tab === 'studio' && '🎙️ Cloning'}
                {tab === 'chat' && '💬 Chat Box'}
                {tab === 'feed' && '📱 Feed'}
                {tab === 'analytics' && '📊 Stats'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Canvas panels */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* PROFILE BOARD */}
          {canvasTab === 'profile' && (
            <div className="space-y-6 max-w-md mx-auto">
              {activeDraft?.createStep ? (
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
              ) : (
                <div className="h-64 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-white/[0.01]">
                  <UserPlus className="w-8 h-8 text-zinc-600 mb-2.5 animate-pulse" />
                  <div className="text-xs font-black text-zinc-400 uppercase tracking-widest">No Profile Draft Active</div>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">Prompt the agent on the left to generate an influencer setup draft.</p>
                </div>
              )}
            </div>
          )}

          {/* CALENDAR PLANNER BOARD */}
          {canvasTab === 'planner' && (
            <div className="space-y-4 max-w-md mx-auto">
              {activeDraft?.planStep ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">
                      7-Day theme: {activeDraft.planStep.params.theme || 'Default Niche'}
                    </span>
                    <span className="text-[9px] font-black uppercase text-pink-400 bg-pink-500/15 px-2 py-0.5 rounded border border-pink-500/10 tracking-widest">
                      {activeDraft.planStep.params.platform || 'Instagram'}
                    </span>
                  </div>

                  {/* 7 Days planner loop */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                      <div key={day} className="bg-[var(--bg-elevated)] border border-white/5 p-4 rounded-xl flex gap-3 relative overflow-hidden shadow">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                          <span className="text-xs font-black text-zinc-300">D{day}</span>
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase text-pink-400 tracking-wider">Post Concept</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          </div>
                          <p className="text-xs text-zinc-300 font-bold leading-normal">
                            Generate a post showcasing {activeDraft.createStep?.params.name || 'Sofia'} following the niche aesthetic guidelines.
                          </p>
                          <div className="text-[10px] text-zinc-400 italic">
                            Hook: "Check out day {day} of the journey..."
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-white/[0.01]">
                  <CalendarRange className="w-8 h-8 text-zinc-600 mb-2.5 animate-pulse" />
                  <div className="text-xs font-black text-zinc-400 uppercase tracking-widest">No Post Schedule Draft</div>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">Instruct the agent to generate a 7-day plan on platforms like OnlyFans/Instagram.</p>
                </div>
              )}
            </div>
          )}

          {/* CLONING STUDIO BOARD (Voice cloning + Lip-sync Talking Avatars) */}
          {canvasTab === 'studio' && (
            <div className="space-y-5 max-w-md mx-auto bg-[var(--bg-elevated)] p-6 rounded-2xl border border-white/5 shadow-xl relative">
              <span className="text-xs font-black text-violet-400 uppercase tracking-widest flex items-center gap-1">
                <Volume2 className="w-4 h-4 text-violet-400" /> Voice & Talking Avatar Studio
              </span>
              <p className="text-[10px] text-zinc-400 font-bold leading-relaxed pb-3 border-b border-white/5">
                Upload reference voice/video file, select avatar portrait, and create cloned talking photos.
              </p>

              <div className="space-y-4">
                {/* Engine Selector */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Voice Engine</span>
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
                      <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Voice Name</span>
                      <input
                        type="text"
                        value={voiceNameInput}
                        onChange={(e) => setVoiceNameInput(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500/30"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Description</span>
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
                  <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">1. Reference Voice (Audio/Video file)</span>
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
                  <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">2. Avatar Photo (For lip-sync talking photo)</span>
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
                  <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">3. Script text</span>
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

          {/* SOCIAL PUBLISHING SIMULATOR FEED BOARD */}
          {canvasTab === 'feed' && (
            <div className="space-y-5 max-w-md mx-auto">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-400" /> Mock Social Publishing Feed
              </span>

              {publishedPosts.length === 0 ? (
                <div className="h-64 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-white/[0.01]">
                  <Globe className="w-8 h-8 text-zinc-600 mb-2.5 animate-pulse" />
                  <div className="text-xs font-black text-zinc-400 uppercase tracking-widest">No Posts Published Yet</div>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">Click "🚀 Publish" under generated visuals in the chat pipeline on the left to see posts here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {publishedPosts.map((post) => (
                    <div key={post.id} className="bg-[var(--bg-elevated)] border border-white/5 rounded-2xl p-4 shadow space-y-3 relative overflow-hidden">
                      {/* Platform badge */}
                      <span className="absolute top-3 right-3 text-[8px] font-black uppercase text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full tracking-wider">
                        {post.platform}
                      </span>

                      {/* Post media */}
                      <div className="rounded-xl overflow-hidden border border-white/5 bg-black/40">
                        {post.imageUrl.endsWith('.mp4') || post.imageUrl.includes('blob:') ? (
                          <video src={post.imageUrl} controls className="w-full max-h-72 object-cover" />
                        ) : (
                          <img src={post.imageUrl} alt="Social content" className="w-full max-h-72 object-cover" />
                        )}
                      </div>

                      {/* Ticking Engagement Stats */}
                      <div className="flex justify-between text-[10px] text-zinc-400 border-b border-white/5 pb-2.5 font-bold">
                        <span className="flex items-center gap-1">👁️ {post.views} Views</span>
                        <span className="flex items-center gap-1 text-pink-400">❤️ {post.likes} Likes</span>
                        <span className="flex items-center gap-1 text-cyan-400">💬 {post.comments.length} Comments</span>
                      </div>

                      {/* OnlyFans Tips Ticker */}
                      {post.platform.toLowerCase().includes('onlyfans') && post.tips.length > 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl space-y-1.5">
                          <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block">💰 Live Tips Ticker</span>
                          <div className="space-y-1 text-[10px]">
                            {post.tips.slice(-3).map((tip, tIdx) => (
                              <div key={tIdx} className="flex justify-between text-zinc-300 font-bold">
                                <span>👤 User {tip.user}</span>
                                <span className="text-emerald-400">+${tip.amount} tip</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* caption */}
                      <p className="text-xs text-zinc-300 leading-relaxed font-medium">"{post.caption}"</p>

                      {/* comments section */}
                      {post.comments.length > 0 && (
                        <div className="space-y-1 pt-1.5 text-[10px] text-zinc-400 leading-normal border-t border-white/5">
                          <span className="font-black text-[8px] uppercase tracking-wider text-zinc-500">Live Comments:</span>
                          {post.comments.slice(-3).map((c, cIdx) => (
                            <div key={cIdx} className="italic text-zinc-300">"{c}"</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PREDICTIVE ANALYTICS DASHBOARD BOARD */}
          {canvasTab === 'analytics' && (
            <div className="space-y-5 max-w-md mx-auto">
              <span className="text-xs font-black text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-violet-400" /> Predictive Analytics Dashboard
              </span>

              {activeDraft ? (
                <div className="space-y-4">
                  {/* Scorecards */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-[var(--bg-elevated)] border border-white/5 p-4 rounded-xl space-y-1 text-center">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider block">Estimated CPM</span>
                      <span className="text-lg font-black text-white">${metrics.cpm.toFixed(2)}</span>
                    </div>
                    <div className="bg-[var(--bg-elevated)] border border-white/5 p-4 rounded-xl space-y-1 text-center">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider block">Conversion rate Index</span>
                      <span className="text-lg font-black text-pink-400">{metrics.conversion.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Growth charts list */}
                  <div className="bg-[var(--bg-elevated)] border border-white/5 p-5 rounded-2xl space-y-4">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Projected 30-Day Growth Index</span>
                    
                    {/* Followers growth bar */}
                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between font-bold">
                        <span className="text-zinc-300">Followers Traffic Momentum</span>
                        <span className="text-violet-400">+{metrics.growthIndex}% Index</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full" 
                          style={{ width: `${metrics.growthIndex}%` }}
                        />
                      </div>
                    </div>

                    {/* Projected monthly revenue scorecard */}
                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between font-bold">
                        <span className="text-zinc-300">Projected Monthly Earnings</span>
                        <span className="text-emerald-400">${metrics.projection.toLocaleString()}/mo</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" 
                          style={{ width: `${Math.min(100, (metrics.projection / 15000) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Niche suitability insights */}
                  <div className="bg-[var(--bg-elevated)] border border-white/5 p-5 rounded-2xl space-y-3 text-xs leading-normal">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Niche Traffic Suitability Insights</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0 border border-pink-500/20 text-pink-400">
                        <Award className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-zinc-300 font-bold">
                        {activeDraft.createStep.params.niche || 'General'} niche has a high engagement multipliers on {activeDraft.createStep.params.platform || 'Instagram'}.
                      </p>
                    </div>
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
        </div>
      </div>
    </div>
  );
}
