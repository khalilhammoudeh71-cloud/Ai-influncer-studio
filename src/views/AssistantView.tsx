import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, ChevronDown, ImageIcon, Video, Loader2, AlertCircle, Camera, MessageSquareQuote, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { Persona } from '../types';
import { ModelInfo, fetchAllModelTypes, editImage, generateVideo } from '../services/imageService';
import { generatePersonaContent } from '../utils/personaEngine';
import { cn } from '../utils/cn';

interface Props {
  personas: Persona[];
  persona: Persona;
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

export default function AssistantView({ personas, persona: propActivePersona }: Props) {
  const [selectedPersonaId, setSelectedPersonaId] = useState(propActivePersona.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [activeSegment, setActiveSegment] = useState<'chat' | 'replies'>('chat');
  const [replyInput, setReplyInput] = useState('');
  const [generatedReplies, setGeneratedReplies] = useState<string[]>([]);

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

  useEffect(() => {
    resetConversation(activePersona);
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
  
  const handleGenerateReplies = () => {
    if (!replyInput.trim()) return;
    const mockPost = { day: 0, type: 'Comment', hook: replyInput, angle: '', cta: '' };
    const r1 = generatePersonaContent(activePersona, mockPost, activePersona.platform, 'Short Caption');
    const r2 = generatePersonaContent(activePersona, mockPost, activePersona.platform, 'Video Script');
    setGeneratedReplies([r1, r2]);
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
            {activePersona.referenceImage && (
              <div className="flex items-center gap-2 bg-violet-500/10 rounded-full px-3 py-1.5 border border-violet-500/20">
                <Camera size={12} className="text-violet-400" />
                <span className="text-[10px] text-violet-300">Ref image ready</span>
              </div>
            )}
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
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} persona={activePersona} />
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
            className="w-full premium-button py-4 flex items-center justify-center gap-2 text-white font-bold rounded-xl"
          >
             <MessageSquareQuote size={18} />
             Generate Replies
          </motion.button>

          {generatedReplies.length > 0 && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-2">Suggestions</label>
              {generatedReplies.map((reply, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4 relative group"
                >
                  <button 
                    onClick={() => navigator.clipboard.writeText(reply)}
                    className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Copy Reply"
                  >
                    <Copy size={16} />
                  </button>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed pr-8 whitespace-pre-wrap">{reply}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, persona }: { msg: ChatMessage; persona: Persona }) {
  const isUser = msg.role === 'user';

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

      <div className="max-w-[80%]">
        {msg.type === 'text' && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed">
            {msg.content}
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
            <div className="bg-[var(--bg-surface)] px-3 py-1.5 flex items-center gap-1.5">
              <ImageIcon size={11} className="text-violet-400" />
              <span className="text-[10px] text-[var(--text-tertiary)]">Generated image</span>
            </div>
          </div>
        )}

        {msg.type === 'video' && (
          <div className="rounded-2xl rounded-bl-sm overflow-hidden border border-[var(--border-default)] max-w-xs">
            <video
              src={msg.content}
              controls
              autoPlay
              loop
              muted
              playsInline
              className="w-full"
            />
            <div className="bg-[var(--bg-surface)] px-3 py-1.5 flex items-center gap-1.5">
              <Video size={11} className="text-violet-400" />
              <span className="text-[10px] text-[var(--text-tertiary)]">Generated video</span>
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
