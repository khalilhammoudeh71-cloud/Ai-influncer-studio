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
  Coins
} from 'lucide-react';
import { Persona, Tab } from '../types';
import { api } from '../services/apiService';
import { generatePersonaPlan } from '../utils/personaEngine';
import { generateImage } from '../services/imageService';
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
  execSteps?: { type: string; params: any; status: 'pending' | 'running' | 'success' | 'error' }[];
}

interface CustomPreset {
  name: string;
  prompt: string;
}

const BASE_PRESETS: CustomPreset[] = [
  {
    name: "🎮 Twitch Gamer Sofia",
    prompt: "Create a gamer girl named Sofia who streams on Twitch, Minecraft niche. Schedule a 7-day flirty Instagram planner, a video of her streaming, and log $50 tips."
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
  const [canvasTab, setCanvasTab] = useState<'profile' | 'planner' | 'media'>('profile');
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

    // Find the user prompt that triggered this
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
            ? data.suggestedSteps.map((s: any) => ({ ...s, status: 'pending' }))
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

  const runPipeline = async (messageId: string) => {
    const targetMsg = messages.find(m => m.id === messageId);
    if (!targetMsg || !targetMsg.execSteps || targetMsg.isExecuting) return;

    // Set executing state
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

    const updateStepStatus = (stepIdx: number, status: 'pending' | 'running' | 'success' | 'error') => {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId && m.execSteps) {
          const updated = [...m.execSteps];
          updated[stepIdx].status = status;
          return { ...m, execSteps: updated };
        }
        return m;
      }));
    };

    addLocalLog('🤖 Auto-Pilot Pipeline initialized...', true);
    
    try {
      // Multimodal Memory Scanner: Find latest reference photo in history
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
          updateStepStatus(i, 'success');
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
            addLocalLog(`⚠️ [Self-Correction] Model ${modelId} failed: ${firstErr.message || 'unknown error'}`);
            
            let fallbackModel = 'google:nano-banana-pro';
            if (modelId.startsWith('wavespeed:')) {
              fallbackModel = 'venice:lustify-v8';
            } else if (modelId.startsWith('venice:')) {
              fallbackModel = 'google:nano-banana-pro';
            }
            
            addLocalLog(`🔄 Retrying pipeline with fallback model: ${fallbackModel}...`);
            modelId = fallbackModel;
            
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

          addLocalLog(`⏳ Syncing persona profile avatar reference...`);
          const updatedPersona = {
            ...createdPersona,
            avatar: imageUrl,
            referenceImage: imageUrl
          };
          const savedPersona = await api.personas.update(updatedPersona);
          
          setPersonas(prev => prev.map(p => p.id === createdPersonaId ? savedPersona : p));

          addLocalLog(`✅ Profile avatar fully synced!`);
          updateStepStatus(i, 'success');
        }

        else if (step.type === 'generate_video') {
          if (!createdPersona) {
            createdPersona = personas[0] || null;
            if (!createdPersona || createdPersona.id === 'empty') throw new Error('No active persona detected.');
            createdPersonaId = createdPersona.id;
          }

          let modelId = step.params.modelId || 'google:veo-omni';
          addLocalLog(`Chosen Video Model: ${modelId}`, true, true);
          addLocalLog(`⏳ Spinning up video generation pipeline...`);
          addLocalLog(`📝 Motion Prompt: "${step.params.prompt}"`);

          let result;
          try {
            result = await api.images.generateVideo({
              prompt: step.params.prompt,
              modelId,
              strength: step.params.strength || 0.6,
              sourceImage: createdPersona.avatar || null
            });
          } catch (firstErr: any) {
            addLocalLog(`⚠️ [Self-Correction] Video model ${modelId} failed. Retrying with fallback: google:veo-omni...`);
            modelId = 'google:veo-omni';
            result = await api.images.generateVideo({
              prompt: step.params.prompt,
              modelId,
              strength: step.params.strength || 0.6,
              sourceImage: createdPersona.avatar || null
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
          addLocalLog(`✅ Video asset successfully generated & saved to library.`);
          updateStepStatus(i, 'success');
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
          addLocalLog(`✅ Audio narration generated successfully: ${data.audioUrl}`);
          updateStepStatus(i, 'success');
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
      
      setTimeout(() => {
        nav.replace({ view: 'personas' });
      }, 3000);

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

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[var(--bg-base)]">
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
                                {step.type === 'generate_video' && `4. Generate Action Video Clip`}
                                {step.type === 'generate_voice' && `5. Generate Narrative Voiceover`}
                                {step.type === 'log_revenue' && `6. Log Financial Transaction`}
                              </span>
                            </div>
                            <div>
                              {step.status === 'pending' && <span className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Pending</span>}
                              {step.status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-pink-400" />}
                              {step.status === 'success' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                              {step.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                            </div>
                          </div>

                          {/* Inline Parameters controls */}
                          {!msg.isExecuting && (
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
                                <div>
                                  <label className="text-[8px] uppercase tracking-wider text-zinc-500 font-black">Video Prompt</label>
                                  <textarea
                                    value={step.params.prompt || ''}
                                    onChange={(e) => handleParamChange(msg.id, idx, 'prompt', e.target.value)}
                                    className="w-full h-12 bg-white/5 border border-white/5 rounded p-1.5 text-[11px] text-white outline-none focus:border-pink-500/20 resize-none"
                                  />
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
            {(['profile', 'planner', 'media'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setCanvasTab(tab)}
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                  canvasTab === tab
                    ? 'bg-gradient-to-r from-pink-500/20 to-violet-500/20 border border-pink-500/30 text-white'
                    : 'text-zinc-400 hover:text-white border border-transparent'
                }`}
              >
                {tab === 'profile' && 'Influencer Card'}
                {tab === 'planner' && '7-Day Calendar'}
                {tab === 'media' && 'Media Preview'}
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
                  {/* Decorative glowing gradient circle */}
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
                      7-Day content schedule theme: {activeDraft.planStep.params.theme || 'Default Niche'}
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

          {/* MEDIA PREVIEW BOARD */}
          {canvasTab === 'media' && (
            <div className="space-y-6 max-w-md mx-auto">
              {/* Image step draft layout */}
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

              {/* Video step draft layout */}
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

              {/* Voice step draft layout */}
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

              {/* Revenue step draft layout */}
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
