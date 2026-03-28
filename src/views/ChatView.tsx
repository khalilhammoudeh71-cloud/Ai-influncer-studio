import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, ChevronDown, ImageIcon, Video, Loader2, AlertCircle, Camera } from 'lucide-react';
import { Persona } from '../types';
import { ModelInfo, fetchAllModelTypes, editImage, generateVideo } from '../services/imageService';
import { cn } from '../utils/cn';

interface Props {
  personas: Persona[];
  activePersona: Persona;
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

export default function ChatView({ personas, activePersona: propActivePersona }: Props) {
  const [selectedPersonaId, setSelectedPersonaId] = useState(propActivePersona.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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
  }, []);

  useEffect(() => {
    resetConversation(activePersona);
  }, [selectedPersonaId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      <header className="sticky top-0 z-10 bg-[#0A0A0A] border-b border-white/5">
        <div className="p-5 pt-10 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Chat</h1>
            {activePersona.referenceImage && (
              <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5">
                <Camera size={12} className="text-indigo-400" />
                <span className="text-[10px] text-gray-400">Ref image ready</span>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
              {activePersona.referenceImage ? (
                <img src={activePersona.referenceImage} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-600/30 flex items-center justify-center">
                  <Bot size={12} className="text-indigo-400" />
                </div>
              )}
            </div>
            <select
              value={selectedPersonaId}
              onChange={e => {
                setSelectedPersonaId(e.target.value);
              }}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-2xl pl-11 pr-9 py-2.5 text-sm text-white outline-none appearance-none focus:border-indigo-500/50 transition-colors"
            >
              {personas.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.niche}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] uppercase tracking-wider font-bold text-gray-600 block mb-1">
                Image Model
              </label>
              <div className="relative">
                <select
                  value={selectedEditModelId}
                  onChange={e => setSelectedEditModelId(e.target.value)}
                  disabled={!modelsLoaded || editModels.length === 0}
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-3 pr-7 py-2 text-xs text-white outline-none appearance-none focus:border-indigo-500/50 transition-colors disabled:opacity-50"
                >
                  {editModels.length === 0 && <option value="">Loading…</option>}
                  {editModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {isNsfw(m) ? '🔓 NSFW — ' : ''}{m.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              {selectedEditModel && isNsfw(selectedEditModel) && (
                <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-wider text-red-300 bg-red-500/20 border border-red-500/30 rounded-full px-2 py-0.5">
                  🔓 NSFW
                </span>
              )}
            </div>

            <div>
              <label className="text-[9px] uppercase tracking-wider font-bold text-gray-600 block mb-1">
                Video Model
              </label>
              <div className="relative">
                <select
                  value={selectedVideoModelId}
                  onChange={e => setSelectedVideoModelId(e.target.value)}
                  disabled={!modelsLoaded || videoModels.length === 0}
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-3 pr-7 py-2 text-xs text-white outline-none appearance-none focus:border-indigo-500/50 transition-colors disabled:opacity-50"
                >
                  {videoModels.length === 0 && <option value="">Loading…</option>}
                  {videoModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {isNsfw(m) ? '🔓 NSFW — ' : ''}{m.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              {selectedVideoModel && isNsfw(selectedVideoModel) && (
                <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-wider text-red-300 bg-red-500/20 border border-red-500/30 rounded-full px-2 py-0.5">
                  🔓 NSFW
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} persona={activePersona} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 bg-[#0A0A0A] border-t border-white/5 p-4 pb-8">
        <div className="flex items-end gap-3">
          <div className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-2xl px-4 py-3 focus-within:border-indigo-500/40 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${activePersona.name}…`}
              rows={1}
              className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none resize-none leading-relaxed"
              style={{ maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center transition-all flex-shrink-0',
              input.trim() && !isGenerating
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
                : 'bg-white/5 text-gray-600'
            )}
          >
            {isGenerating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 text-center mt-2">
          Ask for images or videos anytime — the persona will generate them using their reference image.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ msg, persona }: { msg: ChatMessage; persona: Persona }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-end">
      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-indigo-600/20 flex items-center justify-center">
        {persona.referenceImage ? (
          <img src={persona.referenceImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <Bot size={14} className="text-indigo-400" />
        )}
      </div>

      <div className="max-w-[80%]">
        {msg.type === 'text' && (
          <div className="bg-[#1A1A1A] border border-white/5 text-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed">
            {msg.content}
          </div>
        )}

        {msg.type === 'loading' && (
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-indigo-400" />
            <span className="text-xs text-gray-500">Generating…</span>
          </div>
        )}

        {msg.type === 'image' && (
          <div className="rounded-2xl rounded-bl-sm overflow-hidden border border-white/10 max-w-xs">
            <img
              src={msg.content}
              alt="Generated"
              className="w-full object-cover"
              onError={e => { (e.target as HTMLImageElement).alt = 'Failed to load image'; }}
            />
            <div className="bg-[#1A1A1A] px-3 py-1.5 flex items-center gap-1.5">
              <ImageIcon size={11} className="text-indigo-400" />
              <span className="text-[10px] text-gray-500">Generated image</span>
            </div>
          </div>
        )}

        {msg.type === 'video' && (
          <div className="rounded-2xl rounded-bl-sm overflow-hidden border border-white/10 max-w-xs">
            <video
              src={msg.content}
              controls
              autoPlay
              loop
              muted
              playsInline
              className="w-full"
            />
            <div className="bg-[#1A1A1A] px-3 py-1.5 flex items-center gap-1.5">
              <Video size={11} className="text-indigo-400" />
              <span className="text-[10px] text-gray-500">Generated video</span>
            </div>
          </div>
        )}

        {msg.type === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-start gap-2">
            <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-red-300">{msg.content}</span>
          </div>
        )}
      </div>
    </div>
  );
}
