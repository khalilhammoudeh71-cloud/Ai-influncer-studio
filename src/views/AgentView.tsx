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
  DollarSign
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

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  attachments?: Attachment[];
  status?: 'clarifying' | 'executing' | 'normal';
  suggestedSteps?: any[];
  isExecuting?: boolean;
  execLogs?: string[];
  execSteps?: { type: string; params: any; status: 'pending' | 'running' | 'success' | 'error' }[];
}

const SUGGESTIONS = [
  {
    label: "ASMR Sofia (Swimsuit/OnlyFans)",
    prompt: "Create a flirty swimsuit model Sofia, ASMR niche, platforms OnlyFans & Instagram. Generate a 7-day flirty schedule, a beach video clip of her, and log $50 subscription revenue."
  },
  {
    label: "Fitness Marco (TikTok/Gym)",
    prompt: "Create a fitness motivator Marco, TikTok plan. Write a voice narration script, generate a gym photo of him, and log $150 sponsorship revenue."
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

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
      let createdPersona: Persona | null = null;
      let createdPersonaId = '';

      // Reads execSteps directly (allowing users to edit parameters inline!)
      const stepsList = targetMsg.execSteps || [];

      for (let i = 0; i < stepsList.length; i++) {
        const step = stepsList[i];
        updateStepStatus(i, 'running');

        if (step.type === 'create_persona') {
          addLocalLog(`⏳ Building persona profile '${step.params.name}'...`);
          
          const uniqueId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const fallbackAvatar = step.params.outfit === 'Swimsuit' || step.params.outfit === 'Lingerie'
            ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'
            : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';

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

          // Update parent context
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
            
            // Dynamic Fallback selection rules
            let fallbackModel = 'google:nano-banana-pro';
            if (modelId.startsWith('wavespeed:')) {
              fallbackModel = 'venice:lustify-v8'; // Try Venice first
            } else if (modelId.startsWith('venice:')) {
              fallbackModel = 'google:nano-banana-pro'; // Try Google next
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

          // Save visual asset
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

          // Update avatar references
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
          addLocalLog(`⏳ Spinning up cinematic video generation pipeline...`);
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

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-base)]">
      {/* Header */}
      <div className="flex-none flex items-center justify-between border-b border-white/5 px-6 lg:px-12 py-4 bg-[var(--bg-elevated)]/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">Auto-Pilot Agent</h1>
            <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">Conversational Auto-Pilot</p>
          </div>
        </div>
        <div className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Multi-API Routing
        </div>
      </div>

      {/* Messages thread list */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 space-y-6 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-3xl ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
          >
            <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1.5 px-2">
              {msg.role === 'model' ? '🤖 Agent' : '👤 You'}
            </span>

            <div className={`p-5 rounded-3xl relative overflow-hidden shadow-xl border ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-pink-500/10 to-violet-500/10 border-pink-500/20 text-white rounded-tr-none'
                : 'bg-[var(--bg-elevated)] border-white/5 text-[var(--text-primary)] rounded-tl-none'
            }`}>
              <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</div>

              {/* Attachments rendering */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2.5 mt-3 pt-3 border-t border-white/5">
                  {msg.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-white/5 border border-white/5 rounded-xl text-xs">
                      {att.mimeType.startsWith('image/') ? (
                        <img src={att.dataUrl} alt={att.name} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        getAttachmentIcon(att.mimeType)
                      )}
                      <span className="max-w-[120px] truncate text-[10px] font-bold text-[var(--text-tertiary)]">{att.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Human-in-the-Loop plan proposal */}
              {msg.role === 'model' && msg.suggestedSteps && (
                <div className="mt-5 p-5 bg-black/40 border border-pink-500/10 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3 gap-4">
                    <span className="text-xs font-black text-pink-400 uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Proposed Action Plan (Editable)
                    </span>
                    {!msg.isExecuting && (
                      <button
                        onClick={() => runPipeline(msg.id)}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 font-black text-[10px] uppercase tracking-wider text-white shadow-lg flex items-center gap-1 transition-all hover:-translate-y-0.5"
                      >
                        Approve & Execute <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Steps with Interactive Parameter Editing */}
                  <div className="space-y-4 divide-y divide-white/5 pt-1">
                    {msg.execSteps?.map((step, idx) => (
                      <div key={idx} className="pt-3 first:pt-0 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-white">
                              {step.type === 'create_persona' && <UserPlus className="w-3 h-3 text-pink-400" />}
                              {step.type === 'generate_content_plan' && <CalendarRange className="w-3 h-3 text-indigo-400" />}
                              {step.type === 'generate_image' && <ImageIcon className="w-3 h-3 text-emerald-400" />}
                              {step.type === 'generate_video' && <VideoIcon className="w-3 h-3 text-cyan-400" />}
                              {step.type === 'generate_voice' && <Volume2 className="w-3 h-3 text-amber-400" />}
                              {step.type === 'log_revenue' && <DollarSign className="w-3 h-3 text-rose-400" />}
                            </div>
                            <span className="font-bold text-[var(--text-secondary)]">
                              {step.type === 'create_persona' && 'Create Persona Profile'}
                              {step.type === 'generate_content_plan' && 'Build 7-Day Content Schedule'}
                              {step.type === 'generate_image' && 'Generate visual library starting asset'}
                              {step.type === 'generate_video' && 'Produce cinematic editing video clip'}
                              {step.type === 'generate_voice' && 'Synthesize voice narration script'}
                              {step.type === 'log_revenue' && 'Log Revenue vault income'}
                            </span>
                          </div>
                          <div>
                            {step.status === 'pending' && <span className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Pending</span>}
                            {step.status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-pink-400" />}
                            {step.status === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
                            {step.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                          </div>
                        </div>

                        {/* Interactive Edit Fields */}
                        {!msg.isExecuting && (
                          <div className="pl-8 space-y-2">
                            {step.type === 'create_persona' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-black">Name</label>
                                  <input
                                    type="text"
                                    value={step.params.name || ''}
                                    onChange={(e) => handleParamChange(msg.id, idx, 'name', e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-xs text-white outline-none focus:border-pink-500/20"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-black">Niche</label>
                                  <input
                                    type="text"
                                    value={step.params.niche || ''}
                                    onChange={(e) => handleParamChange(msg.id, idx, 'niche', e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-xs text-white outline-none focus:border-pink-500/20"
                                  />
                                </div>
                              </div>
                            )}

                            {step.type === 'generate_content_plan' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-black">Platform</label>
                                  <input
                                    type="text"
                                    value={step.params.platform || ''}
                                    onChange={(e) => handleParamChange(msg.id, idx, 'platform', e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-xs text-white outline-none focus:border-pink-500/20"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-black">Topic</label>
                                  <input
                                    type="text"
                                    value={step.params.theme || ''}
                                    onChange={(e) => handleParamChange(msg.id, idx, 'theme', e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-xs text-white outline-none focus:border-pink-500/20"
                                  />
                                </div>
                              </div>
                            )}

                            {step.type === 'generate_image' && (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-black">Visual Prompt</label>
                                  <textarea
                                    value={step.params.prompt || ''}
                                    onChange={(e) => handleParamChange(msg.id, idx, 'prompt', e.target.value)}
                                    className="w-full h-16 bg-white/5 border border-white/5 rounded p-2 text-xs text-white outline-none focus:border-pink-500/20 resize-none"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-black">Model ID</label>
                                    <input
                                      type="text"
                                      value={step.params.modelId || ''}
                                      onChange={(e) => handleParamChange(msg.id, idx, 'modelId', e.target.value)}
                                      className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-xs text-white outline-none focus:border-pink-500/20 font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-black">Outfit Style</label>
                                    <input
                                      type="text"
                                      value={step.params.outfit || ''}
                                      onChange={(e) => handleParamChange(msg.id, idx, 'outfit', e.target.value)}
                                      className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-xs text-white outline-none focus:border-pink-500/20"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {step.type === 'generate_video' && (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-black">Video Prompt</label>
                                  <textarea
                                    value={step.params.prompt || ''}
                                    onChange={(e) => handleParamChange(msg.id, idx, 'prompt', e.target.value)}
                                    className="w-full h-16 bg-white/5 border border-white/5 rounded p-2 text-xs text-white outline-none focus:border-pink-500/20 resize-none"
                                  />
                                </div>
                              </div>
                            )}

                            {step.type === 'generate_voice' && (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-black">Narration Script</label>
                                  <textarea
                                    value={step.params.text || ''}
                                    onChange={(e) => handleParamChange(msg.id, idx, 'text', e.target.value)}
                                    className="w-full h-16 bg-white/5 border border-white/5 rounded p-2 text-xs text-white outline-none focus:border-pink-500/20 resize-none"
                                  />
                                </div>
                              </div>
                            )}

                            {step.type === 'log_revenue' && (
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-black">Amount</label>
                                  <input
                                    type="number"
                                    value={step.params.amount || 0}
                                    onChange={(e) => handleParamChange(msg.id, idx, 'amount', Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-xs text-white outline-none focus:border-pink-500/20 font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-black">Source</label>
                                  <input
                                    type="text"
                                    value={step.params.source || ''}
                                    onChange={(e) => handleParamChange(msg.id, idx, 'source', e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-xs text-white outline-none focus:border-pink-500/20"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-black">Platform</label>
                                  <input
                                    type="text"
                                    value={step.params.platform || ''}
                                    onChange={(e) => handleParamChange(msg.id, idx, 'platform', e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded px-2 py-1 text-xs text-white outline-none focus:border-pink-500/20"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Execution logs terminal inside checklist */}
                  {(msg.execLogs && msg.execLogs.length > 0) && (
                    <div className="p-4 bg-black border border-white/5 rounded-xl h-40 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-1.5 custom-scrollbar shadow-inner">
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
          <div className="flex items-start mr-auto max-w-3xl animate-pulse">
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1.5 px-2">🤖 Agent</span>
              <div className="p-5 rounded-3xl bg-[var(--bg-elevated)] border border-white/5 rounded-tl-none flex items-center gap-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                <span className="text-xs text-[var(--text-muted)] font-medium">Agent is composing response...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion tags */}
      {messages.length === 1 && (
        <div className="flex-none px-6 lg:px-12 py-3 border-t border-white/5 bg-[var(--bg-elevated)]/10">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-3 items-center">
            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest shrink-0">Try Prompts:</span>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(s.prompt)}
                  className="px-3.5 py-1.5 rounded-full border border-white/5 bg-white/[0.01] hover:border-pink-500/20 text-xs font-semibold text-[var(--text-secondary)] hover:text-white transition-all text-left"
                >
                  💡 {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input panel block */}
      <div className="flex-none p-4 lg:p-6 border-t border-white/5 bg-[var(--bg-elevated)]/40 backdrop-blur-md">
        <div className="max-w-3xl mx-auto">
          {/* File previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2.5 mb-3 bg-[var(--bg-input)] p-3 border border-white/5 rounded-2xl shadow-inner">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-white/5 border border-white/5 rounded-xl text-xs relative group">
                  {att.mimeType.startsWith('image/') ? (
                    <img src={att.dataUrl} alt={att.name} className="w-10 h-10 rounded object-cover" />
                  ) : (
                    getAttachmentIcon(att.mimeType)
                  )}
                  <div className="flex flex-col">
                    <span className="max-w-[120px] truncate text-[10px] font-bold text-white leading-tight">{att.name}</span>
                    <span className="text-[8px] font-black text-[var(--text-muted)] uppercase mt-0.5">{att.mimeType.split('/')[0]}</span>
                  </div>
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="w-4 h-4 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center text-white absolute -top-1.5 -right-1.5 shadow-md"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Form input controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              className="w-12 h-12 rounded-2xl border border-white/5 bg-[var(--bg-input)] hover:border-pink-500/20 flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-all shadow"
            >
              <Paperclip size={18} />
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Mic transcription trigger */}
            <button
              onClick={toggleListening}
              disabled={isSending}
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all shadow ${
                isListening 
                  ? 'bg-rose-500/20 border-rose-500 text-rose-500 animate-pulse'
                  : 'bg-[var(--bg-input)] border-white/5 text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <Mic size={18} />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isSending}
              placeholder={isListening ? "Listening... Speak clearly" : "Tell the agent what to build, attach reference files..."}
              className="flex-1 h-12 bg-[var(--bg-input)] border border-white/5 rounded-2xl px-4 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-pink-500/40 outline-none transition-all shadow-inner"
            />

            <button
              onClick={sendMessage}
              disabled={isSending || (!inputText.trim() && attachments.length === 0)}
              className="w-12 h-12 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 flex items-center justify-center text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
