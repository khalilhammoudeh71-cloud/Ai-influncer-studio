import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, ChevronDown, ImageIcon, Video, Loader2, AlertCircle, Camera, MessageSquareQuote, Copy, Bookmark, Check, Phone, PhoneOff, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Persona, NavActions } from '../types';
import { ModelInfo, fetchAllModelTypes, editImage, generateVideo, textToSpeech } from '../services/imageService';
import { cn } from '../utils/cn';
import { api } from '../services/apiService';
import toast from 'react-hot-toast';

// ── Typewriter hook ──────────────────────────────────────
function useTypewriter(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= text.length) { clearInterval(interval); setDone(true); return; }
      setDisplayed(text.slice(0, i + 1));
      i++;
    }, speed);
    return () => clearInterval(interval);
  }, [text]);
  return { displayed, done };
}

// ── localStorage helpers ──────────────────────────────────
const HISTORY_KEY = (personaId: string) => `chat_history_${personaId}`;
const MAX_STORED = 60; // messages cap per persona

function loadHistory(personaId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY(personaId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch { return []; }
}

function saveHistory(personaId: string, msgs: ChatMessage[]) {
  try {
    const toStore = msgs.slice(-MAX_STORED);
    localStorage.setItem(HISTORY_KEY(personaId), JSON.stringify(toStore));
  } catch { /* quota */ }
}

interface Props {
  personas: Persona[];
  persona: Persona;
  nav: NavActions;
}

type MessageType = 'text' | 'image' | 'video' | 'loading' | 'error';
type MessageRole = 'user' | 'persona';

interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  timestamp: Date;
}

const IMAGE_KEYWORDS = [
  'image', 'photo', 'pic', 'picture', 'selfie', 'shot', 'snap', 'show me',
  'send me', 'generate', 'make me', 'create', 'post', 'share a', 'share your',
  'what do you look like', 'what are you wearing', 'outfit', 'fit check',
];

const VIDEO_KEYWORDS = [
  'video', 'clip', 'reel', 'animate', 'animation', 'moving', 'motion', 'tiktok',
  'short', 'film', 'record', 'make a video', 'shoot a',
];

function detectIntent(message: string): 'image' | 'video' | 'chat' {
  const lower = message.toLowerCase();
  if (VIDEO_KEYWORDS.some(k => lower.includes(k))) return 'video';
  if (IMAGE_KEYWORDS.some(k => lower.includes(k))) return 'image';
  return 'chat';
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function AssistantView({ personas, persona: propActivePersona, nav }: Props) {
  const [selectedPersonaId, setSelectedPersonaId] = useState(propActivePersona.id);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory(propActivePersona.id));
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [savingMsgId, setSavingMsgId] = useState<string | null>(null);
  const [savedMsgIds, setSavedMsgIds] = useState<Set<string>>(new Set());

  const [activeSegment, setActiveSegment] = useState<'chat' | 'replies'>('chat');
  const [replyInput, setReplyInput] = useState('');
  const [generatedReplies, setGeneratedReplies] = useState<string[]>([]);

  // ── Voice Call States & Refs ──────────────────────────────
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'speaking' | 'listening' | 'disconnected'>('disconnected');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [callTranscript, setCallTranscript] = useState<Array<{ id: string; role: 'user' | 'persona'; content: string }>>([]);
  const [callInput, setCallInput] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<any>(null);

  // Format timer duration (e.g. 00:05)
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Play TTS helper
  const playTTS = async (text: string) => {
    if (!speakerOn) {
      setCallStatus('listening');
      return;
    }
    setCallStatus('speaking');
    try {
      const voiceParams: any = {
        text,
        voiceName: activePersona.name,
      };
      if ((activePersona as any).voiceEngine) {
        voiceParams.engine = (activePersona as any).voiceEngine;
        voiceParams.voiceId = (activePersona as any).voiceId;
      }
      
      const { audioUrl } = await textToSpeech(voiceParams);
      
      // Stop current audio if any
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setCallStatus('listening');
      };
      
      audio.onerror = () => {
        setCallStatus('listening');
      };
      
      // Only play if call is still active
      if (callTimerRef.current) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (err: any) {
      console.error("TTS call failed", err);
      setCallStatus('listening');
    }
  };

  // Start Call
  const handleStartCall = () => {
    setIsCallActive(true);
    setCallStatus('connecting');
    setCallDuration(0);
    setCallTranscript([
      { id: uid(), role: 'persona', content: `Calling ${activePersona.name}...` }
    ]);
    
    // Simulate connection delay
    setTimeout(() => {
      setCallStatus('connected');
      // Set initial greeting
      const greetings: Record<string, string> = {
        luxury: `Hey. Glad you found your way here. What's on your mind?`,
        playful: `Omg hiii! I was literally just thinking about you 😄 What's up?`,
        edgy: `Yo. What do you want.`,
        default: `Hey! Good to hear from you. What's going on?`,
      };
      const tone = activePersona.tone.toLowerCase();
      let greeting = greetings.default;
      if (tone.includes('luxury') || tone.includes('elite')) greeting = greetings.luxury;
      else if (tone.includes('playful') || tone.includes('flirty') || tone.includes('seductive')) greeting = greetings.playful;
      else if (tone.includes('edgy') || tone.includes('bold')) greeting = greetings.edgy;

      setCallTranscript([
        { id: uid(), role: 'persona', content: greeting }
      ]);
      
      // Start the clock timer
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      // Play the greeting using text-to-speech
      playTTS(greeting);
    }, 1800);
  };

  // End Call
  const handleEndCall = useCallback(() => {
    setCallStatus('disconnected');
    setIsCallActive(false);
    
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  // Cleanup on unmount or persona change
  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (audioRef.current) audioRef.current.pause();
    };
  }, [selectedPersonaId]);

  // Send message inside Live Call
  const handleSendCallMessage = async () => {
    const text = callInput.trim();
    if (!text || callStatus === 'speaking' || callStatus === 'connecting') return;
    
    setCallInput('');
    
    const userMsg = { id: uid(), role: 'user' as const, content: text };
    setCallTranscript(prev => [...prev, userMsg]);
    
    setCallStatus('speaking');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: activePersona,
          messages: callTranscript.filter(t => t.content.indexOf('Calling') !== 0).map(m => ({ role: m.role, type: 'text', content: m.content })),
          userMessage: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed call dialogue response');
      
      const reply = data.reply;
      
      setCallTranscript(prev => [...prev, { id: uid(), role: 'persona', content: reply }]);
      
      // Sync into command center chat history
      setMessages(prev => [...prev, 
        { id: uid(), role: 'user', type: 'text', content: text, timestamp: new Date() },
        { id: uid(), role: 'persona', type: 'text', content: reply, timestamp: new Date() }
      ]);
      
      playTTS(reply);
    } catch (err) {
      console.error(err);
      setCallStatus('listening');
      toast.error("Call connection interrupted. Try again.");
    }
  };

  const [editModels, setEditModels] = useState<ModelInfo[]>([]);
  const [videoModels, setVideoModels] = useState<ModelInfo[]>([]);
  const [selectedEditModelId, setSelectedEditModelId] = useState('');
  const [selectedVideoModelId, setSelectedVideoModelId] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activePersona = personas.find(p => p.id === selectedPersonaId) || propActivePersona;

  const selectedEditModel = editModels.find(m => m.id === selectedEditModelId);
  const selectedVideoModel = videoModels.find(m => m.id === selectedVideoModelId);

  useEffect(() => {
    fetchAllModelTypes().then(({ editModels: em, videoModels: vm }) => {
      setEditModels(em);
      setVideoModels(vm);
      if (em.length > 0) setSelectedEditModelId(em[0].id);
      if (vm.length > 0) setSelectedVideoModelId(vm[0].id);
      setModelsLoaded(true);
    }).catch(() => setModelsLoaded(true));
  }, []);

  const resetConversation = useCallback((persona: Persona) => {
    const greetings: Record<string, string> = {
      luxury: `Hey. Glad you found your way here. What's on your mind?`,
      playful: `Omg hiii! I was literally just thinking about you 😄 What's up?`,
      edgy: `Yo. What do you want.`,
      default: `Hey! Good to hear from you. What's going on?`,
    };
    const tone = persona.tone.toLowerCase();
    let greeting = greetings.default;
    if (tone.includes('luxury') || tone.includes('elite')) greeting = greetings.luxury;
    else if (tone.includes('playful') || tone.includes('flirty') || tone.includes('seductive')) greeting = greetings.playful;
    else if (tone.includes('edgy') || tone.includes('bold')) greeting = greetings.edgy;

    setMessages([{
      id: uid(),
      role: 'persona',
      type: 'text',
      content: greeting,
      timestamp: new Date(),
    }]);
    setGeneratedReplies([]);
    setReplyInput('');
  }, []);

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length > 1) saveHistory(selectedPersonaId, messages);
  }, [messages, selectedPersonaId]);

  useEffect(() => {
    // Load persisted history or reset when persona changes
    const history = loadHistory(selectedPersonaId);
    if (history.length > 0) {
      setMessages(history);
    } else {
      resetConversation(personas.find(p => p.id === selectedPersonaId) || propActivePersona);
    }
    setSavedMsgIds(new Set());
  }, [selectedPersonaId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeSegment === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeSegment]);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>): string => {
    const id = uid();
    setMessages(prev => [...prev, { ...msg, id, timestamp: new Date() }]);
    return id;
  }, []);

  const replaceMessage = useCallback((id: string, update: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...update } : m));
  }, []);

  // Save to Vault from chat
  const handleSaveToVault = async (msg: ChatMessage) => {
    if (savingMsgId === msg.id) return;
    setSavingMsgId(msg.id);
    try {
      const media = {
        id: `chat-${msg.id}`,
        url: msg.content,
        prompt: `Chat: ${activePersona.name}`,
        timestamp: msg.timestamp.getTime(),
        model: msg.type === 'video' ? selectedVideoModelId : selectedEditModelId,
        mediaType: msg.type as 'image' | 'video',
      };
      const updated = { ...activePersona, visualLibrary: [...(activePersona.visualLibrary || []), media] };
      await api.updatePersonaInVault(updated);
      await api.images.create(activePersona.id, media);
      setSavedMsgIds(prev => new Set(prev).add(msg.id));
      toast.success('Saved to Visual Library!');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingMsgId(null);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY(selectedPersonaId));
    resetConversation(activePersona);
    toast.success('Conversation cleared');
  };

  const getPersonaImageAck = (): string => {
    const tone = activePersona.tone.toLowerCase();
    if (tone.includes('luxury') || tone.includes('elite')) return 'Give me a moment.';
    if (tone.includes('playful') || tone.includes('flirty')) return 'Ooh hold on, let me get you something good 📸';
    if (tone.includes('edgy') || tone.includes('bold')) return 'Fine. One sec.';
    return 'Sure, give me a sec to send that over!';
  };

  const getPersonaVideoAck = (): string => {
    const tone = activePersona.tone.toLowerCase();
    if (tone.includes('luxury') || tone.includes('elite')) return 'I will send you a clip. One moment.';
    if (tone.includes('playful') || tone.includes('flirty')) return 'Eeek okay give me a minute, making something cute for you 🎬';
    if (tone.includes('edgy') || tone.includes('bold')) return 'Alright. Filming.';
    return "Okay, putting together a quick video for you!";
  };

  const getNoRefImageResponse = (type: 'image' | 'video'): string => {
    const tone = activePersona.tone.toLowerCase();
    if (tone.includes('luxury') || tone.includes('elite')) {
      return type === 'image'
        ? "I don't just send photos to anyone. Set up my profile properly first."
        : "My presence isn't captured that easily. Set up my reference image first.";
    }
    if (tone.includes('playful') || tone.includes('flirty')) {
      return type === 'image'
        ? "I'd love to share but you need to set up my reference image first! Go to my persona and generate one, then come back 📸"
        : "I wanna make a video for you but I need my reference image set up first! Quick — go set it up and come back 🎬";
    }
    return type === 'image'
      ? "I need my reference image set up before I can share photos. Head to my persona profile and generate one!"
      : "I need my reference image before I can make videos. Set that up in my persona profile first.";
  };

  async function handleSend() {
    const text = input.trim();
    if (!text || isGenerating) return;
    setInput('');
    setIsGenerating(true);

    addMessage({ role: 'user', type: 'text', content: text });

    const intent = detectIntent(text);

    try {
      if (intent === 'image') {
        if (!activePersona.referenceImage) {
          addMessage({ role: 'persona', type: 'text', content: getNoRefImageResponse('image') });
        } else {
          addMessage({ role: 'persona', type: 'text', content: getPersonaImageAck() });
          const loadingId = addMessage({ role: 'persona', type: 'loading', content: '' });
          try {
            const result = await editImage(activePersona.referenceImage, text, selectedEditModelId);
            replaceMessage(loadingId, { type: 'image', content: result.imageUrl });
          } catch (err) {
            replaceMessage(loadingId, {
              type: 'error',
              content: err instanceof Error ? err.message : 'Image generation failed',
            });
          }
        }
      } else if (intent === 'video') {
        if (!activePersona.referenceImage) {
          addMessage({ role: 'persona', type: 'text', content: getNoRefImageResponse('video') });
        } else {
          addMessage({ role: 'persona', type: 'text', content: getPersonaVideoAck() });
          const loadingId = addMessage({ role: 'persona', type: 'loading', content: '' });
          try {
            const result = await generateVideo(text, selectedVideoModelId, activePersona.referenceImage);
            replaceMessage(loadingId, { type: 'video', content: result.videoUrl });
          } catch (err) {
            replaceMessage(loadingId, {
              type: 'error',
              content: err instanceof Error ? err.message : 'Video generation failed',
            });
          }
        }
      } else {
        const loadingId = addMessage({ role: 'persona', type: 'loading', content: '' });
        try {
          const textMessages = messages.filter(m => m.type === 'text');
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              persona: activePersona,
              messages: textMessages.map(m => ({ role: m.role, type: m.type, content: m.content })),
              userMessage: text,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Chat failed');
          replaceMessage(loadingId, { type: 'text', content: data.reply });
        } catch (err) {
          replaceMessage(loadingId, {
            type: 'error',
            content: 'Something went wrong. Try again?',
          });
        }
      }
    } finally {
      setIsGenerating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }
  
  const handleGenerateReplies = async () => {
    if (!replyInput.trim()) return;
    setIsGenerating(true);
    setGeneratedReplies([]);
    try {
      const prompt = `You are ${activePersona.name}, an AI influencer with this personality: ${activePersona.tone}. Your niche is: ${activePersona.niche}.

Someone left this comment/DM on your post:
"${replyInput}"

Write 3 different reply options in your authentic voice. Each should:
- Sound natural, not robotic
- Match your personality perfectly
- Be appropriately short (1-3 sentences for comments, up to 4 for DMs)
- Include 1-2 relevant emojis
- Be ready to post as-is

Return ONLY a JSON array of 3 strings (no markdown, no keys, just the array).`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: activePersona,
          messages: [],
          userMessage: prompt,
          systemOverride: `You are ${activePersona.name}. Respond ONLY with a valid JSON array of 3 reply strings.`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate replies');

      const raw: string = data.reply || '';
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          const parsed: string[] = JSON.parse(match[0]);
          setGeneratedReplies(parsed.slice(0, 3));
        } catch {
          // Fallback: split by newline
          setGeneratedReplies(raw.split('\n').filter(l => l.trim()).slice(0, 3));
        }
      } else {
        setGeneratedReplies([raw]);
      }
    } catch (err: any) {
      toast.error('Could not generate replies');
    } finally {
      setIsGenerating(false);
    }
  };

  const NSFW_MODEL_IDS = new Set([
    'wavespeed-ai/wan2.1-i2v-480p-turbo',
    'wavespeed-ai/wan2.1-i2v-720p-turbo',
    'wavespeed-ai/wan2.2-i2v-ultra',
    'wavespeed-ai/wan2.2-t2v-ultra',
    'bytedance/seedream-3.0',
    'seededit-v3',
    'wan22',
  ]);

  function isNsfw(model: ModelInfo): boolean {
    if (model.nsfw) return true;
    const id = model.id.toLowerCase();
    for (const nsfwId of NSFW_MODEL_IDS) {
      if (id.includes(nsfwId.toLowerCase())) return true;
    }
    return false;
  }

  return (
    <div className="flex flex-col bg-[var(--bg-base)] max-w-[1200px] mx-auto w-full" style={{ height: 'calc(100vh - 142px)' }}>
      <header className="sticky top-0 z-10 bg-[var(--bg-base)]/95 backdrop-blur-xl border-b border-[var(--border-subtle)] premium-header">
        <div className="p-5 pt-4 space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold tracking-tight">
              <span className="gradient-text">Command Center</span>
            </h1>
            <div className="flex items-center gap-2">
              {activePersona.referenceImage && (
                <div className="flex items-center gap-2 bg-violet-500/10 rounded-full px-3 py-1.5 border border-violet-500/20">
                  <Camera size={12} className="text-violet-400" />
                  <span className="text-[10px] text-violet-300">Ref image ready</span>
                </div>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartCall}
                className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-full px-4 py-1.5 border border-emerald-500/20 transition-all font-bold text-[10px] uppercase tracking-wider"
              >
                <Phone size={12} className="animate-pulse" />
                <span>Call</span>
              </motion.button>
            </div>
          </div>
          
          <div className="flex segment-control relative">
            {(['chat', 'replies'] as const).map(seg => (
              <button
                key={seg}
                onClick={() => setActiveSegment(seg)}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-[9px] relative z-10 transition-colors duration-200",
                  activeSegment === seg ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
              >
                {seg === 'chat' ? 'Chat & Generate' : 'Generate Replies'}
              </button>
            ))}
            <motion.div
              layoutId="assistant-segment-pill"
              className="absolute inset-y-[3px] rounded-[9px] pointer-events-none"
              style={{
                left: activeSegment === 'chat' ? '3px' : '50%',
                right: activeSegment === 'replies' ? '3px' : '50%',
                background: 'linear-gradient(135deg, #7c3aed 0%, #d946ef 100%)',
                boxShadow: '0 2px 12px -2px rgba(139,92,246,0.4)',
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          </div>

          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
              {activePersona.referenceImage ? (
                <img src={activePersona.referenceImage} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-violet-600/30 flex items-center justify-center">
                  <Bot size={12} className="text-violet-400" />
                </div>
              )}
            </div>
            <select
              value={selectedPersonaId}
              onChange={e => {
                setSelectedPersonaId(e.target.value);
              }}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl pl-11 pr-9 py-2.5 text-sm text-[var(--text-primary)] outline-none appearance-none focus:border-violet-500/50 transition-colors duration-200"
            >
              {personas.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.niche}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          </div>

          {activeSegment === 'chat' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] uppercase tracking-[0.15em] font-bold text-[var(--text-muted)] block mb-1">
                  Image Model
                </label>
                <div className="relative">
                  <select
                    value={selectedEditModelId}
                    onChange={e => setSelectedEditModelId(e.target.value)}
                    disabled={!modelsLoaded || editModels.length === 0}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-3 pr-7 py-2 text-xs text-[var(--text-primary)] outline-none appearance-none focus:border-violet-500/50 transition-colors duration-200 disabled:opacity-50"
                  >
                    {editModels.length === 0 && <option value="">Loading…</option>}
                    {editModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {isNsfw(m) ? '🔞 NSFW — ' : ''}{m.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                </div>
                {selectedEditModel && isNsfw(selectedEditModel) && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-wider text-rose-300 bg-rose-500/20 border border-rose-500/30 rounded-full px-2 py-0.5">
                    🔞 NSFW
                  </span>
                )}
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-[0.15em] font-bold text-[var(--text-muted)] block mb-1">
                  Video Model
                </label>
                <div className="relative">
                  <select
                    value={selectedVideoModelId}
                    onChange={e => setSelectedVideoModelId(e.target.value)}
                    disabled={!modelsLoaded || videoModels.length === 0}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-3 pr-7 py-2 text-xs text-[var(--text-primary)] outline-none appearance-none focus:border-violet-500/50 transition-colors duration-200 disabled:opacity-50"
                  >
                    {videoModels.length === 0 && <option value="">Loading…</option>}
                    {videoModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {isNsfw(m) ? '🔞 NSFW — ' : ''}{m.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                </div>
                {selectedVideoModel && isNsfw(selectedVideoModel) && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-wider text-rose-300 bg-rose-500/20 border border-rose-500/30 rounded-full px-2 py-0.5">
                    🔞 NSFW
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {activeSegment === 'chat' ? (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                persona={activePersona}
                isLatest={i === messages.length - 1}
                onSaveToVault={handleSaveToVault}
                isSaving={savingMsgId === msg.id}
                isSaved={savedMsgIds.has(msg.id)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="sticky bottom-0 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)] to-transparent p-4 pb-8 pt-6">
            <div className="flex items-end gap-2.5">
              <div className="flex-1 premium-input px-4 py-3 focus-within:border-violet-500/40 bg-[var(--bg-elevated)]">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${activePersona.name}…`}
                  rows={1}
                  className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none resize-none leading-relaxed"
                  style={{ maxHeight: '120px' }}
                />
              </div>
              {/* Clear history button */}
              {messages.length > 1 && (
                <button
                  onClick={clearHistory}
                  title="Clear chat history"
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-rose-400 hover:border-rose-500/30 transition-colors flex-shrink-0 text-xs font-bold"
                >
                  ✕
                </button>
              )}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={handleSend}
                disabled={!input.trim() || isGenerating}
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
                  input.trim() && !isGenerating
                    ? 'premium-button text-white'
                    : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                )}
              >
                {isGenerating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </motion.button>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] text-center mt-2.5 tracking-wide">
              Ask for images or videos anytime
            </p>
          </div>
        </>
      ) : (
        <div className="flex-1 p-6 overflow-y-auto space-y-8">
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-2">Paste Comment / DM</label>
            <textarea 
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              placeholder="Ex: 'You are so pretty! Where did you get that jacket?'"
              className="w-full premium-input bg-[var(--bg-surface)] p-4 text-sm min-h-[100px] outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-xl border border-[var(--border-default)] focus:border-violet-500/50 transition-colors"
            />
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGenerateReplies}
            disabled={isGenerating}
            className="w-full premium-button py-4 flex items-center justify-center gap-2 text-white font-bold rounded-xl disabled:opacity-50"
          >
             <MessageSquareQuote size={18} />
             Generate Replies
          </motion.button>

          {generatedReplies.length > 0 && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-2">AI-Generated Replies</label>
              {generatedReplies.map((reply, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4 relative group"
                >
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { navigator.clipboard.writeText(reply); toast.success('Copied!'); }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-[var(--text-muted)] hover:text-emerald-400 transition-colors"
                      title="Copy"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed pr-16 whitespace-pre-wrap">{reply}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Voice Call Simulator Overlay */}
      <AnimatePresence>
        {isCallActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#0B0F19]/90 backdrop-blur-2xl flex flex-col justify-between p-6 overflow-hidden rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {activePersona.avatar ? (
                  <img src={activePersona.avatar} alt={activePersona.name} className="w-10 h-10 rounded-full border border-violet-500/30 object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                    <Bot size={18} className="text-violet-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-white text-base leading-tight">{activePersona.name}</h3>
                  <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">{activePersona.niche}</span>
                </div>
              </div>
              
              {/* Call Timer / Duration */}
              {callStatus !== 'connecting' && (
                <div className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs font-mono text-gray-300">
                  {formatDuration(callDuration)}
                </div>
              )}
            </div>

            {/* Visualizer Area */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6 my-4 relative">
              {/* Status Indicator */}
              <div className="text-center z-10">
                <span className="text-[10px] text-violet-400 font-bold uppercase tracking-widest block mb-1">
                  {callStatus === 'connecting' ? 'Calling...' : 
                   callStatus === 'speaking' ? 'Speaking...' :
                   callStatus === 'listening' ? 'Listening' : 'Connected'}
                </span>
                <p className="text-xs text-gray-400 font-medium">
                  {callStatus === 'connecting' ? 'Establishing secure connection...' : 
                   callStatus === 'speaking' ? `${activePersona.name} is responding` :
                   callStatus === 'listening' ? 'Speak now or type below...' : 'Call in progress'}
                </p>
              </div>

              {/* Pulsing Glowing Avatar */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* Outer Glow Pulse Rings */}
                <motion.div
                  animate={{
                    scale: callStatus === 'speaking' ? [1, 1.2, 1] : [1, 1.08, 1],
                    opacity: callStatus === 'speaking' ? [0.4, 0.8, 0.4] : [0.2, 0.4, 0.2]
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: callStatus === 'speaking' ? 1.5 : 3,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 rounded-full bg-violet-600/20 blur-xl"
                />
                <motion.div
                  animate={{
                    scale: callStatus === 'speaking' ? [1, 1.35, 1] : [1, 1.15, 1],
                    opacity: callStatus === 'speaking' ? [0.25, 0.5, 0.25] : [0.1, 0.2, 0.1]
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: callStatus === 'speaking' ? 2 : 4,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-[-10px] rounded-full bg-teal-500/10 blur-2xl"
                />

                {/* Main Avatar Wrapper */}
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-violet-500/40 shadow-2xl relative z-10">
                  {activePersona.referenceImage ? (
                    <img src={activePersona.referenceImage} alt={activePersona.name} className="w-full h-full object-cover" />
                  ) : activePersona.avatar ? (
                    <img src={activePersona.avatar} alt={activePersona.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-violet-950 flex items-center justify-center">
                      <Bot size={48} className="text-violet-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Waveform Visualizer */}
              <div className="h-10 flex items-end justify-center gap-1 w-full max-w-[240px] px-4 z-10">
                {[...Array(16)].map((_, i) => {
                  const animationDuration = 0.5 + Math.random() * 0.8;
                  return (
                    <motion.div
                      key={i}
                      animate={callStatus === 'speaking' ? {
                        height: [8, 16 + Math.random() * 24, 8]
                      } : callStatus === 'listening' ? {
                        height: [8, 12, 8]
                      } : {
                        height: [8, 8, 8]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: animationDuration,
                        ease: "easeInOut",
                        delay: i * 0.03
                      }}
                      className={cn(
                        "w-1.5 rounded-full",
                        callStatus === 'speaking' ? "bg-gradient-to-t from-violet-600 to-fuchsia-400" :
                        callStatus === 'listening' ? "bg-teal-500/40" : "bg-gray-700"
                      )}
                      style={{ height: '8px' }}
                    />
                  );
                })}
              </div>

              {/* Scrolling Call Transcript Display */}
              <div className="w-full max-w-[400px] h-20 bg-white/5 rounded-xl border border-white/5 p-3 overflow-y-auto text-xs space-y-2 flex flex-col justify-end custom-scrollbar">
                {callTranscript.length === 0 ? (
                  <p className="text-[10px] text-gray-500 text-center italic">Start of Call</p>
                ) : (
                  callTranscript.slice(-3).map((item, idx) => (
                    <div key={item.id || idx} className="leading-relaxed">
                      <span className={cn("font-bold uppercase text-[9px] mr-1.5 tracking-wider", item.role === 'user' ? 'text-teal-400' : 'text-violet-400')}>
                        {item.role === 'user' ? 'You' : activePersona.name}:
                      </span>
                      <span className="text-gray-300">{item.content}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Actions & Call Input */}
            <div className="space-y-4">
              {callStatus !== 'connecting' && (
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-2 focus-within:border-violet-500/50 transition-all">
                    <input
                      type="text"
                      value={callInput}
                      onChange={e => setCallInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSendCallMessage();
                      }}
                      placeholder={`Say something to ${activePersona.name}...`}
                      disabled={callStatus === 'speaking'}
                      className="w-full bg-transparent outline-none text-xs text-white placeholder-gray-500 disabled:opacity-50"
                    />
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={handleSendCallMessage}
                    disabled={!callInput.trim() || callStatus === 'speaking'}
                    className="premium-button text-white text-xs px-4 py-2.5 rounded-xl font-bold flex-shrink-0 disabled:opacity-50 flex items-center justify-center"
                  >
                    Send
                  </motion.button>
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-6">
                {/* Mute Toggle */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsMuted(!isMuted)}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200",
                    isMuted 
                      ? "bg-rose-500/20 border-rose-500/30 text-rose-400" 
                      : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                  )}
                  title={isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </motion.button>

                {/* Red End Call Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleEndCall}
                  className="w-14 h-14 rounded-full flex items-center justify-center bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 border border-rose-500/30 transition-all animate-pulse"
                  title="End Call"
                >
                  <PhoneOff size={22} />
                </motion.button>

                {/* Speaker Toggle */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    const nextVal = !speakerOn;
                    setSpeakerOn(nextVal);
                    if (!nextVal && audioRef.current) {
                      audioRef.current.pause();
                    }
                  }}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200",
                    !speakerOn
                      ? "bg-rose-500/20 border-rose-500/30 text-rose-400"
                      : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                  )}
                  title={speakerOn ? "Mute Speaker" : "Unmute Speaker"}
                >
                  {speakerOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface BubbleProps {
  msg: ChatMessage;
  persona: Persona;
  isLatest: boolean;
  onSaveToVault: (msg: ChatMessage) => void;
  isSaving: boolean;
  isSaved: boolean;
}

function MessageBubble({ msg, persona, isLatest, onSaveToVault, isSaving, isSaved }: BubbleProps) {
  const isUser = msg.role === 'user';
  // Only animate the very latest text message from persona
  const shouldType = !isUser && msg.type === 'text' && isLatest;
  const { displayed, done } = useTypewriter(shouldType ? msg.content : '', 14);
  const textToShow = shouldType ? displayed : msg.content;

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed shadow-lg shadow-violet-500/15">
          {msg.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 items-end"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-violet-600/20 flex items-center justify-center">
        {persona.referenceImage ? (
          <img src={persona.referenceImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <Bot size={14} className="text-violet-400" />
        )}
      </div>

      <div className="max-w-[80%] space-y-1">
        {msg.type === 'text' && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed">
            {textToShow}
            {shouldType && !done && (
              <span className="inline-block w-0.5 h-3.5 bg-violet-400 ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        )}

        {msg.type === 'loading' && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl rounded-bl-sm px-5 py-3.5 flex items-center gap-2.5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}

        {msg.type === 'image' && (
          <div className="rounded-2xl rounded-bl-sm overflow-hidden border border-[var(--border-default)] max-w-xs">
            <img
              src={msg.content}
              alt="Generated"
              className="w-full object-cover"
              onError={e => { (e.target as HTMLImageElement).alt = 'Failed to load image'; }}
            />
            <div className="bg-[var(--bg-surface)] px-3 py-1.5 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <ImageIcon size={11} className="text-violet-400" />
                <span className="text-[10px] text-[var(--text-tertiary)]">Generated image</span>
              </div>
              <button
                onClick={() => onSaveToVault(msg)}
                disabled={isSaving || isSaved}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold transition-all ${
                  isSaved ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-violet-500/20 hover:bg-violet-500/30 text-violet-400'
                }`}
              >
                {isSaving ? <Loader2 size={9} className="animate-spin" /> : isSaved ? <Check size={9} /> : <Bookmark size={9} />}
                {isSaved ? 'Saved' : 'Save to Vault'}
              </button>
            </div>
          </div>
        )}

        {msg.type === 'video' && (
          <div className="rounded-2xl rounded-bl-sm overflow-hidden border border-[var(--border-default)] max-w-xs">
            <video src={msg.content} controls autoPlay loop muted playsInline className="w-full" />
            <div className="bg-[var(--bg-surface)] px-3 py-1.5 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <Video size={11} className="text-violet-400" />
                <span className="text-[10px] text-[var(--text-tertiary)]">Generated video</span>
              </div>
              <button
                onClick={() => onSaveToVault(msg)}
                disabled={isSaving || isSaved}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold transition-all ${
                  isSaved ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-violet-500/20 hover:bg-violet-500/30 text-violet-400'
                }`}
              >
                {isSaving ? <Loader2 size={9} className="animate-spin" /> : isSaved ? <Check size={9} /> : <Bookmark size={9} />}
                {isSaved ? 'Saved' : 'Save to Vault'}
              </button>
            </div>
          </div>
        )}

        {msg.type === 'error' && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-start gap-2">
            <AlertCircle size={14} className="text-rose-400 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-rose-300">{msg.content}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
