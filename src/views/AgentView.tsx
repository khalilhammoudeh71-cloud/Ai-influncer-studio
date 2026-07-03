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
  Zap
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

interface AgentLog {
  id: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'model';
  message: string;
  timestamp: string;
}

interface AgentTaskStep {
  type: 'create_persona' | 'generate_content_plan' | 'generate_image';
  params: any;
  status: 'pending' | 'running' | 'success' | 'error';
}

const SUGGESTIONS = [
  {
    label: "Tech Reviewer",
    desc: "Create a tech reviewer named Isabella, YouTube plan, and a studio photo.",
    prompt: "Create a tech reviewer named Isabella who is insightful and posts on YouTube. Generate a 7-day content schedule for her, and generate a portrait image of her at a high-end tech desk."
  },
  {
    label: "Swimsuit Model (NSFW)",
    desc: "Create a flirty swimsuit model Sofia, OnlyFans plan, and beach swimsuit photo.",
    prompt: "Create a flirty fitness and swimsuit influencer named Sofia who streams swimsuit content on OnlyFans. Generate a 7-day flirty plan for her, and make a highly realistic portrait photo of her in a blue bikini on a tropical beach."
  },
  {
    label: "Luxury Lifestyle",
    desc: "Create a luxury blogger Marco, Instagram plan, and luxury car photo.",
    prompt: "Create a luxury lifestyle influencer named Marco, high-status and exclusive tone, who posts on Instagram. Generate a 7-day premium plan, and generate a portrait image of him next to a private jet or sports car."
  }
];

export default function AgentView({ personas, setPersonas, onSelectPersona, nav }: AgentViewProps) {
  const [prompt, setPrompt] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [steps, setSteps] = useState<AgentTaskStep[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (type: AgentLog['type'], message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { id: Math.random().toString(), type, message, timestamp: time }]);
  };

  const handleSuggestionClick = (p: string) => {
    setPrompt(p);
  };

  const runAgent = async () => {
    if (!prompt.trim() || isExecuting) return;
    setIsExecuting(true);
    setLogs([]);
    setSteps([]);

    addLog('info', '🤖 Agent initiated. Contacting parsing brain...');
    
    try {
      // Step 1: Parse prompt to structured instructions via backend
      const res = await fetch('/api/agent/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) {
        throw new Error('Failed to parse instruction with Gemini.');
      }

      const data = await res.json();
      const parsedSteps: AgentTaskStep[] = (data.steps || []).map((s: any) => ({
        ...s,
        status: 'pending' as const
      }));

      if (parsedSteps.length === 0) {
        addLog('warning', '⚠️ Gemini couldn\'t extract any valid steps. Try rephrasing.');
        setIsExecuting(false);
        return;
      }

      setSteps(parsedSteps);
      addLog('success', `Parsed successfully! Prepared ${parsedSteps.length} tasks.`);

      // Find if we have image generation task to display selected model
      const imageStep = parsedSteps.find(s => s.type === 'generate_image');
      if (imageStep && imageStep.params.modelId) {
        addLog('model', `🎯 Dynamic Model Routing: Selected model [${imageStep.params.modelId}] based on prompt theme.`);
      }

      // Step 2: Execute steps sequentially
      let createdPersona: Persona | null = null;
      let createdPersonaId = '';

      for (let i = 0; i < parsedSteps.length; i++) {
        const step = parsedSteps[i];
        
        // Update task status to running
        setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'running' as const } : s));

        if (step.type === 'create_persona') {
          addLog('info', `⏳ Creating persona '${step.params.name}'...`);
          
          const uniqueId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          
          // Seed temporary avatar until generated image arrives
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

          // Save to backend
          const saved = await api.personas.create(newPersona);
          createdPersona = saved;
          createdPersonaId = uniqueId;

          // Update parent state
          setPersonas(prev => [...prev, saved]);
          onSelectPersona(uniqueId);

          addLog('success', `✅ Persona '${saved.name}' created with ID: ${uniqueId}`);
          setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'success' as const } : s));
        }

        else if (step.type === 'generate_content_plan') {
          if (!createdPersona) {
            // Find existing if we didn't just create one
            createdPersona = personas[0] || null;
            if (!createdPersona || createdPersona.id === 'empty') {
              throw new Error('No active persona to create content plan for.');
            }
            createdPersonaId = createdPersona.id;
          }

          addLog('info', `⏳ Planning 7-day content schedule for ${createdPersona.name} [${step.params.platform}]...`);
          
          const plan = generatePersonaPlan(createdPersona, step.params.platform, step.params.theme || 'Growth');
          
          // Save planner content plan to database
          await api.plannedPosts.save(createdPersonaId, step.params.platform, plan.map(({ day, type, hook, angle, cta }) => ({ day, type, hook, angle, cta })));

          addLog('success', `✅ Scheduled 7 posts successfully in Content Planner.`);
          setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'success' as const } : s));
        }

        else if (step.type === 'generate_image') {
          if (!createdPersona) {
            createdPersona = personas[0] || null;
            if (!createdPersona || createdPersona.id === 'empty') {
              throw new Error('No active persona to generate image for.');
            }
            createdPersonaId = createdPersona.id;
          }

          const chosenModel = step.params.modelId || 'google:nano-banana-pro';
          addLog('info', `⏳ Spinning up visual generation pipeline using [${chosenModel}]...`);
          addLog('info', `📝 Prompt: "${step.params.prompt}"`);

          const result = await generateImage({
            persona: createdPersona,
            modelId: chosenModel,
            environment: step.params.environment,
            outfitStyle: step.params.outfit,
            framing: step.params.framing,
            prompt: step.params.prompt,
            aspectRatio: '1:1',
            resolution: 'standard',
            count: 1
          });

          const imageUrl = Array.isArray(result) ? result[0].imageUrl : result.imageUrl;
          const promptUsed = Array.isArray(result) ? result[0].promptUsed : result.promptUsed;
          const resolvedModel = Array.isArray(result) ? result[0].model : result.model;

          // Save image to persona visual library
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
          addLog('success', `✅ Asset successfully generated & saved to library.`);

          // Update avatar of persona with generated image
          addLog('info', `⏳ Overwriting persona avatar with newly generated asset...`);
          const updatedPersona = {
            ...createdPersona,
            avatar: imageUrl,
            referenceImage: imageUrl
          };
          const savedPersona = await api.personas.update(updatedPersona);
          
          // Update parent state with updated persona
          setPersonas(prev => prev.map(p => p.id === createdPersonaId ? savedPersona : p));

          addLog('success', `✅ Avatar updated successfully!`);
          setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'success' as const } : s));
        }
      }

      addLog('success', '🏆 Autopilot execution complete! Redirecting you to the dashboard...');
      toast.success('Agent completed all tasks successfully!');
      
      // Wait a moment for the logs to sink in, then redirect to personas view
      setTimeout(() => {
        nav.replace({ view: 'personas' });
      }, 3000);

    } catch (err: any) {
      addLog('error', `❌ Error: ${err.message || 'Execution halted.'}`);
      // Mark current running step as error
      setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' as const } : s));
      toast.error('Agent execution failed.');
    } finally {
      setIsExecuting(false);
    }
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'create_persona': return <UserPlus className="w-4 h-4 text-pink-400" />;
      case 'generate_content_plan': return <CalendarRange className="w-4 h-4 text-indigo-400" />;
      case 'generate_image': return <ImageIcon className="w-4 h-4 text-emerald-400" />;
      default: return <Cpu className="w-4 h-4 text-violet-400" />;
    }
  };

  const getStepLabel = (type: string, params: any) => {
    switch (type) {
      case 'create_persona': return `Create Persona: ${params.name || 'Unnamed'}`;
      case 'generate_content_plan': return `Schedule 7-day ${params.platform || 'Instagram'} Plan`;
      case 'generate_image': return `Generate starting image (${params.modelId ? params.modelId.split(':')[0] : 'default'})`;
      default: return 'Custom Action';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20 px-6 lg:px-12 py-8 bg-[var(--bg-base)]">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/5 pb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="gradient-text">Auto-Pilot Agent</span>
            </h1>
            <p className="text-[var(--text-tertiary)] text-sm mt-1.5 font-medium">
              Give simple commands to automate persona setups, planner slots, and image generations.
            </p>
          </div>
        </div>

        {/* Input prompt card */}
        <div className="rounded-3xl bg-[var(--bg-elevated)] border border-white/5 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
          <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" /> Enter Agent Instructions
          </h3>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isExecuting}
            placeholder="e.g. Create a flirty swimsuit model Sofia, generate a 7-day TikTok schedule, and generate a portrait image of her in a bikini on a tropical beach."
            className="w-full h-32 bg-[var(--bg-input)] border border-white/5 rounded-2xl p-4 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-pink-500/40 outline-none resize-none transition-all shadow-inner"
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Smart NSFW Model Routing Enabled
            </span>
            <button
              onClick={runAgent}
              disabled={isExecuting || !prompt.trim()}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-bold text-xs transition-all shadow-lg flex items-center gap-2 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Executing Action...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Run Agent
                </>
              )}
            </button>
          </div>
        </div>

        {/* Suggestions Panel */}
        {!isExecuting && steps.length === 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Quick Start Templates</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(s.prompt)}
                  className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-white/5 hover:border-pink-500/20 hover:bg-white/[0.01] transition-all text-left shadow-md flex flex-col justify-between h-40 group"
                >
                  <div>
                    <span className="text-xs font-bold text-white group-hover:text-pink-400 transition-colors">{s.label}</span>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5 leading-relaxed">{s.desc}</p>
                  </div>
                  <div className="text-[10px] font-bold text-pink-400 flex items-center gap-1 mt-3">
                    Use Template <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Executing Terminal & Pipeline log */}
        {(isExecuting || logs.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
            {/* Task list list */}
            <div className="lg:col-span-1 space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Pipeline Tasks</h4>
              <div className="rounded-3xl bg-[var(--bg-elevated)] border border-white/5 p-5 space-y-4 shadow-lg">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                        {getStepIcon(step.type)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">{getStepLabel(step.type, step.params)}</p>
                      </div>
                    </div>
                    <div>
                      {step.status === 'pending' && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)]">Pending</span>}
                      {step.status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />}
                      {step.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {step.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                    </div>
                  </div>
                ))}
                {steps.length === 0 && (
                  <div className="text-center py-6 text-xs text-[var(--text-muted)]">Parsing instructions...</div>
                )}
              </div>
            </div>

            {/* Terminal log logs */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-pink-400" /> Console Logs
              </h4>
              <div className="rounded-3xl bg-black border border-white/5 p-6 h-[320px] overflow-y-auto font-mono text-xs flex flex-col gap-2.5 shadow-2xl custom-scrollbar">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="text-[var(--text-muted)] shrink-0 select-none">[{log.timestamp}]</span>
                    <span className={
                      log.type === 'success' ? 'text-emerald-400' :
                      log.type === 'error' ? 'text-rose-400 font-bold' :
                      log.type === 'warning' ? 'text-amber-400' :
                      log.type === 'model' ? 'text-cyan-400 font-bold' :
                      'text-[var(--text-secondary)]'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={consoleEndRef} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
