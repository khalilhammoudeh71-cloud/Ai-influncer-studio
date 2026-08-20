import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  ChevronDown, 
  CheckCircle2, 
  Calendar, 
  Target, 
  Zap, 
  Clock, 
  BarChart3, 
  Layers, 
  Send, 
  FileText, 
  RotateCcw, 
  Download, 
  Plus, 
  MoreHorizontal,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  ShoppingBag,
  Award,
  Video,
  Image as ImageIcon,
  BookOpen,
  Loader2,
  Copy,
  ChevronUp,
  UserRound,
  Link as LinkIcon,
  Globe,
  Settings,
  Eye,
  EyeOff,
  Check,
  ExternalLink,
  CalendarDays,
  Trash2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Persona, PlannedPost, NavActions } from '../types';
import { api } from '../services/apiService';
import toast from 'react-hot-toast';

interface PlannerViewProps {
  persona: Persona;
  personas: Persona[];
  onSelectPersona: (id: string) => void;
  nav: NavActions;
}

type GoalType = 'Grow followers' | 'Boost engagement' | 'Promote offer' | 'Build authority' | 'Drive DMs';
type FrequencyType = '1 post/day' | '2 posts/day' | '3 posts/week' | 'Custom';

const GOALS: GoalType[] = ['Grow followers', 'Boost engagement', 'Promote offer', 'Build authority', 'Drive DMs'];
const FREQUENCIES: FrequencyType[] = ['1 post/day', '2 posts/day', '3 posts/week', 'Custom'];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Posting window suggestions per platform
const POSTING_WINDOWS: Record<string, string> = {
  Instagram: '6:00 PM — 9:00 PM',
  TikTok: '7:00 PM — 11:00 PM',
  YouTube: '2:00 PM — 4:00 PM',
  'Twitter/X': '8:00 AM — 10:00 AM',
  Threads: '9:00 AM — 11:00 AM',
  OnlyFans: '8:00 PM — 11:00 PM',
};

// Content mix by platform
const CONTENT_MIX: Record<string, { reels: number; stories: number }> = {
  Instagram: { reels: 4, stories: 3 },
  TikTok: { reels: 6, stories: 1 },
  YouTube: { reels: 2, stories: 0 },
  'Twitter/X': { reels: 2, stories: 5 },
  Threads: { reels: 1, stories: 6 },
  OnlyFans: { reels: 5, stories: 2 },
};

const PREVIEW_IMAGES = [
  'https://images.unsplash.com/photo-1511512578047-dfb367046420',
  'https://images.unsplash.com/photo-1542751371-adc38448a05e',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
  'https://images.unsplash.com/photo-1601987177651-8edfe6c20009',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5',
  'https://images.unsplash.com/photo-1563089145-599997674d42',
];

import ViralPredictorModal from '../components/ViralPredictorModal';
import { Flame } from 'lucide-react';

export default function PlannerView({ persona, personas, onSelectPersona, nav }: PlannerViewProps) {
  const [plan, setPlan] = useState<(PlannedPost & { id: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [platform, setPlatform] = useState(persona.platform);
  const [goal, setGoal] = useState<GoalType>('Grow followers');
  const [frequency, setFrequency] = useState<FrequencyType>('1 post/day');
  const [activeStrategyTweaks, setActiveStrategyTweaks] = useState<string[]>([]);
  const [batchContent, setBatchContent] = useState<Record<string, { caption: string; imagePrompt: string; videoScript: string }>>({});
  const [batchLoading, setBatchLoading] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // ── Viral Predictor Modal State ──
  const [viralModalOpen, setViralModalOpen] = useState(false);
  const [viralTargetPrompt, setViralTargetPrompt] = useState('');
  const [viralTargetCaption, setViralTargetCaption] = useState('');
  const [viralTargetPostId, setViralTargetPostId] = useState<string | null>(null);

  const handleOpenViralPredictor = (postId?: string, promptText?: string, captionText?: string) => {
    setViralTargetPostId(postId || null);
    setViralTargetPrompt(promptText || persona.visualStyle || '');
    setViralTargetCaption(captionText || '');
    setViralModalOpen(true);
  };

  const handleApplyEnhancedCaption = (newCaption: string) => {
    if (viralTargetPostId) {
      setPlan(prev => prev.map(item => item.id === viralTargetPostId ? { ...item, caption: newCaption } : item));
    }
  };

  // ── Tab State ──
  const [activeTab, setActiveTab] = useState<'roadmap' | 'feed'>('roadmap');

  // ── Connected Accounts State ──
  const [connectedAccounts, setConnectedAccounts] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`connected_accounts_${persona.id}`);
      return saved ? JSON.parse(saved) : {
        Instagram: true,
        TikTok: false,
        YouTube: false,
        'Twitter/X': true,
        Threads: false,
        OnlyFans: false
      };
    } catch {
      return { Instagram: true, TikTok: false, YouTube: false, 'Twitter/X': true, Threads: false, OnlyFans: false };
    }
  });

  // Save connected accounts when they change
  useEffect(() => {
    localStorage.setItem(`connected_accounts_${persona.id}`, JSON.stringify(connectedAccounts));
  }, [connectedAccounts, persona.id]);

  // ── Post Scheduling State ──
  // Key format: `${platform}_day_${post.day}`
  const [schedules, setSchedules] = useState<Record<string, { status: 'Draft' | 'Scheduled' | 'Published'; date?: string; time?: string; caption?: string }>>(() => {
    try {
      const saved = localStorage.getItem(`planner_schedules_${persona.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save schedules when they change
  useEffect(() => {
    localStorage.setItem(`planner_schedules_${persona.id}`, JSON.stringify(schedules));
  }, [schedules, persona.id]);

  // ── Scheduling Modal State ──
  const [schedulingPost, setSchedulingPost] = useState<(PlannedPost & { id: string }) | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleCaption, setScheduleCaption] = useState('');
  const [isSchedulingAction, setIsSchedulingAction] = useState(false);
  
  useEffect(() => {
    setPlatform(persona.platform);
  }, [persona.id]);

  useEffect(() => {
    setIsLoading(true);
    api.plannedPosts.get(persona.id, platform)
      .then(posts => {
        if (posts && posts.length > 0) {
          setPlan(posts.map((p, i) => ({ ...p, id: `plan-${i}-${Date.now()}` })));
        } else {
          setPlan([]);
        }
      })
      .catch(() => setPlan([]))
      .finally(() => setIsLoading(false));
  }, [persona.id, platform]);

  const handleGenerate = async (tweaks: string[] = activeStrategyTweaks) => {
    setIsLoading(true);
    setBatchContent({});
    try {
      const tweakNote = tweaks.length > 0 ? ` Strategy tweaks to apply: ${tweaks.join(', ')}.` : '';
      const prompt = `You are a social media strategist. Create a 7-day content plan for an AI influencer persona.

Persona: ${persona.name}
Niche: ${persona.niche}
Tone: ${persona.tone}
Platform: ${platform}
Goal: ${goal}
Posting Frequency: ${frequency}${tweakNote}

Return ONLY a JSON array of exactly 7 objects (no markdown, no explanation), each with:
- day: number (1-7)
- type: string (e.g. "Reel", "Carousel", "Story", "Static Post", "Live")
- hook: string (attention-grabbing opening line, max 15 words)
- angle: string (content theme/angle, 1 sentence)
- cta: string (call to action, max 10 words)

Make hooks punchy, specific to the persona's voice and niche. Vary content types across the 7 days.`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona,
          messages: [],
          userMessage: prompt,
          systemOverride: 'You are a professional social media content strategist. Respond ONLY with valid JSON arrays.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Plan generation failed');

      // Parse the JSON from the AI response
      let raw = data.reply || '';
      const match = raw.match(/\[\s*[\s\S]*?\s*\]/);
      if (!match) throw new Error('Could not parse plan from AI response');
      const parsed: PlannedPost[] = JSON.parse(match[0]);

      const generated = parsed.slice(0, 7).map((p, i) => ({ ...p, day: i + 1, id: `plan-${i}-${Date.now()}` }));
      setPlan(generated);
      await api.plannedPosts.save(persona.id, platform, generated.map(({ day, type, hook, angle, cta }) => ({ day, type, hook, angle, cta })));
      toast.success('✨ AI 7-Day Strategy Generated!');
    } catch (err: any) {
      console.error('[Planner] Generate error:', err);
      toast.error('Generation failed — check your connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPlan([]);
    setBatchContent({});
    setActiveStrategyTweaks([]);
    api.plannedPosts.save(persona.id, platform, [])
      .then(() => toast.success('Plan reset'))
      .catch(err => console.error('[Planner] Reset error:', err));
  };

  const handleStrategyTweak = (label: string) => {
    setActiveStrategyTweaks(prev => {
      const next = prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label];
      // Auto-regenerate if we already have a plan
      if (plan.length > 0) {
        setTimeout(() => handleGenerate(next), 50);
      }
      return next;
    });
  };

  const handleBatchGenerate = async () => {
    if (plan.length === 0) return;
    setBatchLoading(true);
    try {
      const content: Record<string, { caption: string; imagePrompt: string; videoScript: string }> = {};

      await Promise.all(plan.map(async (post) => {
        const prompt = `You are writing content for an AI influencer persona named ${persona.name} (${persona.niche}, tone: ${persona.tone}).

Create content for this ${platform} post:
- Type: ${post.type}
- Hook: "${post.hook}"
- Theme: ${post.angle}
- CTA: ${post.cta}

Return ONLY valid JSON (no markdown) with exactly these keys:
{
  "caption": "<150-word ${platform} caption in ${persona.name}'s voice, with relevant hashtags>",
  "imagePrompt": "<detailed Stable Diffusion image generation prompt for a photo to accompany this post>",
  "videoScript": "<30-second video script with [SCENE] markers and spoken text>"
}`;

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            persona,
            messages: [],
            userMessage: prompt,
            systemOverride: 'You are a professional content creator. Respond ONLY with valid JSON.',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const raw = data.reply || '';
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            content[post.id] = JSON.parse(match[0]);
          } catch {
            content[post.id] = { caption: raw, imagePrompt: post.angle, videoScript: post.hook };
          }
        }
      }));

      setBatchContent(content);
      toast.success(`🎯 Generated real AI content for all ${plan.length} days!`);
    } catch (err: any) {
      toast.error('Batch generation failed');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleExportPlan = () => {
    if (plan.length === 0) return;
    let text = `# ${persona.name} — ${platform} Content Plan\n`;
    text += `Goal: ${goal} | Frequency: ${frequency}\n\n`;
    plan.forEach((post, i) => {
      text += `## Day ${post.day} — ${DAYS[i]} — ${post.type}\n`;
      text += `Hook: ${post.hook}\n`;
      text += `Angle: ${post.angle}\n`;
      text += `CTA: ${post.cta}\n`;
      const bc = batchContent[post.id];
      if (bc) {
        text += `\nCaption:\n${bc.caption}\n`;
        text += `\nImage Prompt:\n${bc.imagePrompt}\n`;
        text += `\nVideo Script:\n${bc.videoScript}\n`;
      }
      text += '\n---\n\n';
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${persona.name.replace(/\s+/g, '_')}_content_plan.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Plan exported!');
  };

  const handleConfirmSchedule = () => {
    if (!schedulingPost) return;
    setIsSchedulingAction(true);
    const scheduleKey = `${platform}_day_${schedulingPost.day}`;
    
    // Simulate API delay
    setTimeout(() => {
      setSchedules(prev => ({
        ...prev,
        [scheduleKey]: {
          status: 'Scheduled',
          date: scheduleDate,
          time: scheduleTime,
          caption: scheduleCaption
        }
      }));
      setIsSchedulingAction(false);
      setSchedulingPost(null);
      toast.success('📅 Post successfully scheduled!');
    }, 800);
  };

  const handlePublishNow = () => {
    if (!schedulingPost) return;
    setIsSchedulingAction(true);
    const scheduleKey = `${platform}_day_${schedulingPost.day}`;

    // Simulate API delay
    setTimeout(() => {
      setSchedules(prev => ({
        ...prev,
        [scheduleKey]: {
          status: 'Published',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().split(' ')[0].slice(0, 5),
          caption: scheduleCaption
        }
      }));
      setIsSchedulingAction(false);
      setSchedulingPost(null);
      toast.success('🚀 Post published live successfully!');
    }, 1000);
  };

  const getContentTypeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('reel') || t.includes('video') || t.includes('short')) return <Video size={12} />;
    if (t.includes('carousel')) return <Layers size={12} />;
    if (t.includes('story')) return <Zap size={12} />;
    if (t.includes('caption')) return <FileText size={12} />;
    return <ImageIcon size={12} />;
  };

  const getGoalIcon = (g: GoalType) => {
    switch (g) {
      case 'Grow followers': return <TrendingUp size={14} />;
      case 'Boost engagement': return <Zap size={14} />;
      case 'Promote offer': return <ShoppingBag size={14} />;
      case 'Build authority': return <Award size={14} />;
      case 'Drive DMs': return <MessageSquare size={14} />;
      default: return <Target size={14} />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20 p-6 max-w-[1600px] mx-auto w-full select-none">
      {/* ── HEADER ── */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7C477]/10 pb-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif text-[#F5F1E8] tracking-tight flex items-center gap-3">
            Content Planner
            <span className="text-[#E7C477] text-xl font-normal">✨</span>
          </h1>
          <p className="text-xs md:text-sm text-[#8C909A] mt-1 font-sans">
            Plan, schedule, and publish content that drives growth.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[var(--bg-elevated)]/40 p-2 rounded-2xl border border-[var(--border-subtle)] backdrop-blur-md">
          <div className="flex items-center gap-3 px-3">
            <div className="relative">
              {persona.avatar ? (
                <img 
                  src={persona.avatar} 
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-cyan-500/20" 
                  alt="Persona" 
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--text-muted)] ring-2 ring-cyan-500/20">
                  <UserRound className="w-5 h-5" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full border-2 border-[#0B0F17] flex items-center justify-center">
                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest leading-none mb-1">Active Persona</p>
              <h3 className="text-sm font-bold text-white leading-none">{persona.name}</h3>
            </div>
          </div>
          <div className="h-8 w-px bg-[var(--border-subtle)]" />
          <button className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-white hover:bg-white/5 transition-colors">
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      {/* ── CONNECTED CHANNELS BAR ── */}
      <section className="premium-card p-4 rounded-2xl mb-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, rgba(139,92,246,0.06) 0%, transparent 60%)' }} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <h3 className="text-[10px] font-black text-violet-400 uppercase tracking-widest leading-none mb-1 flex items-center gap-1.5">
              <LinkIcon size={12} /> Connected Accounts
            </h3>
            <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Toggle connections to enable direct publishing mockup</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'Threads', 'OnlyFans'].map(p => {
              const connected = connectedAccounts[p];
              return (
                <button
                  key={p}
                  onClick={() => setConnectedAccounts(prev => ({ ...prev, [p]: !prev[p] }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    connected
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
                      : 'bg-white/5 border-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SETUP ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="premium-card p-4 rounded-2xl relative group">
          <label className="text-[9px] uppercase font-black text-[var(--text-muted)] mb-2 block tracking-widest flex items-center gap-1.5">
            <Target size={10} className="text-cyan-500" /> Goal
          </label>
          <div className="relative">
            <select
              value={goal}
              onChange={e => setGoal(e.target.value as GoalType)}
              className="w-full bg-transparent text-sm font-bold text-white outline-none appearance-none pr-8 cursor-pointer relative z-10"
            >
              {GOALS.map(g => (
                <option key={g} value={g} className="bg-[#0B0F17]">{g}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-hover:text-cyan-400 transition-colors pointer-events-none" />
          </div>
        </div>

        <div className="premium-card p-4 rounded-2xl relative group">
          <label className="text-[9px] uppercase font-black text-[var(--text-muted)] mb-2 block tracking-widest flex items-center gap-1.5">
            <Clock size={10} className="text-violet-500" /> Frequency
          </label>
          <div className="relative">
            <select
              value={frequency}
              onChange={e => setFrequency(e.target.value as FrequencyType)}
              className="w-full bg-transparent text-sm font-bold text-white outline-none appearance-none pr-8 cursor-pointer relative z-10"
            >
              {FREQUENCIES.map(f => (
                <option key={f} value={f} className="bg-[#0B0F17]">{f}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-hover:text-violet-400 transition-colors pointer-events-none" />
          </div>
        </div>

        <div className="premium-card p-4 rounded-2xl relative group">
          <label className="text-[9px] uppercase font-black text-[var(--text-muted)] mb-2 block tracking-widest flex items-center gap-1.5">
            <Zap size={10} className="text-amber-500" /> Platform
          </label>
          <div className="relative">
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              className="w-full bg-transparent text-sm font-bold text-white outline-none appearance-none pr-8 cursor-pointer relative z-10"
            >
              {['Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'Threads', 'OnlyFans'].map(p => (
                <option key={p} value={p} className="bg-[#0B0F17]">{p}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-hover:text-amber-400 transition-colors pointer-events-none" />
          </div>
        </div>

        <div className="premium-card p-4 rounded-2xl relative group">
          <label className="text-[9px] uppercase font-black text-[var(--text-muted)] mb-2 block tracking-widest flex items-center gap-1.5">
            <BarChart3 size={10} className="text-emerald-500" /> Strategy
          </label>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">Aggressive</span>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-3 h-1 rounded-full ${i <= 2 ? 'bg-emerald-500' : 'bg-emerald-500/20'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        {/* ── MAIN CALENDAR ── */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                <Calendar size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Weekly Roadmap</h2>
                <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">7 Days · {frequency}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              {/* Tab Toggles */}
              <div className="flex bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-subtle)] relative">
                {(['roadmap', 'feed'] as const).map(tabKey => (
                  <button
                    key={tabKey}
                    onClick={() => setActiveTab(tabKey)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all relative z-10 cursor-pointer ${
                      activeTab === tabKey ? 'text-white bg-gradient-to-r from-cyan-600 to-violet-600 shadow-md shadow-cyan-600/25' : 'text-[var(--text-muted)] hover:text-white'
                    }`}
                  >
                    {tabKey === 'roadmap' ? 'Roadmap View' : 'Feed Preview'}
                  </button>
                ))}
              </div>

              {plan.length > 0 && (
                <div className="flex gap-2">
                  <button onClick={handleReset} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer">
                    Reset
                  </button>
                  <button onClick={handleExportPlan} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-[var(--bg-elevated)] text-white hover:bg-[var(--bg-overlay)] border border-white/5 transition-colors flex items-center gap-1.5 cursor-pointer">
                    <Download size={12} /> Export
                  </button>
                </div>
              )}
            </div>
          </div>

          {activeTab === 'roadmap' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {isLoading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="premium-card rounded-3xl p-5 h-[240px] flex flex-col justify-center items-center gap-4 animate-pulse bg-white/[0.02]">
                    <div className="w-12 h-12 rounded-2xl bg-white/5" />
                    <div className="space-y-2 w-full">
                      <div className="h-3 bg-white/5 rounded w-2/3 mx-auto" />
                      <div className="h-2 bg-white/5 rounded w-1/2 mx-auto" />
                    </div>
                  </div>
                ))
              ) : plan.length === 0 ? (
                // PLACEHOLDERS
                DAYS.map((day, i) => (
                  <div key={day} className="premium-card rounded-3xl p-5 min-h-[240px] flex flex-col border-dashed border-[var(--border-default)] group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div>
                        <span className="text-[9px] font-black text-cyan-500/50 uppercase tracking-[0.2em]">{day}</span>
                        <div className="h-4 w-16 bg-white/5 rounded mt-1" />
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/10">
                        <ImageIcon size={14} />
                      </div>
                    </div>

                    <div className="space-y-2 flex-1 relative z-10">
                      <div className="h-3 bg-white/5 rounded w-full" />
                      <div className="h-3 bg-white/5 rounded w-4/5" />
                      <div className="h-2 bg-white/5 rounded w-1/2 mt-4" />
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-white/10" />
                        <span className="text-[9px] font-bold text-white/20 uppercase">Pending</span>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/10">
                        <Plus size={12} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // GENERATED PLAN
                plan.map((post, i) => {
                  const scheduleKey = `${platform}_day_${post.day}`;
                  const sched = schedules[scheduleKey];
                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="premium-card rounded-3xl p-5 min-h-[240px] flex flex-col group hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/5 transition-all relative overflow-hidden cursor-pointer"
                    >
                      {/* Thumbnail / Gradient Background */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent opacity-40 group-hover:opacity-70 transition-opacity pointer-events-none" />
                      
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                          <span className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.2em]">{DAYS[i]}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="px-2 py-0.5 rounded-md bg-white/10 border border-white/10 flex items-center gap-1">
                              {getContentTypeIcon(post.type)}
                              <span className="text-[9px] font-black text-white uppercase">{post.type}</span>
                            </div>
                          </div>
                        </div>
                        <button className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-tertiary)] hover:text-white transition-colors">
                          <MoreHorizontal size={14} />
                        </button>
                      </div>

                      <div className="flex-1 relative z-10">
                        <h4 className="text-sm font-bold text-white leading-snug group-hover:text-cyan-100 transition-colors">
                          “{post.hook}”
                        </h4>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-3 leading-relaxed line-clamp-2">
                          <span className="text-cyan-500/80 font-bold uppercase tracking-widest text-[8px] mr-1">Theme:</span>
                          {post.angle}
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-1.5">
                          {sched?.status === 'Published' ? (
                            <>
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Published</span>
                            </>
                          ) : sched?.status === 'Scheduled' ? (
                            <>
                              <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)] animate-pulse" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-violet-400">Scheduled ({sched.time})</span>
                            </>
                          ) : (
                            <>
                              <div className={`w-2 h-2 rounded-full ${batchContent[post.id] ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-white/20'}`} />
                              <span className={`text-[9px] font-bold uppercase tracking-widest ${batchContent[post.id] ? 'text-cyan-400' : 'text-[var(--text-muted)]'}`}>
                                {batchContent[post.id] ? 'Content Ready' : 'Pending'}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenViralPredictor(post.id, post.angle, batchContent[post.id]?.caption || post.hook);
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1 transition-all"
                          >
                            <Flame size={11} /> Viral Reach
                          </button>
                          <button
                            onClick={() => setExpandedCard(expandedCard === post.id ? null : post.id)}
                            className="flex items-center gap-1 text-[var(--text-muted)] group-hover:text-cyan-400 transition-colors"
                          >
                            <span className="text-[10px] font-bold">{expandedCard === post.id ? 'Collapse' : 'View'}</span>
                            {expandedCard === post.id ? <ChevronUp size={12} /> : <ChevronRight size={12} />}
                          </button>
                        </div>
                      </div>

                      {expandedCard === post.id && batchContent[post.id] && (
                        <div className="mt-3 pt-3 border-t border-white/5 space-y-3 relative z-10">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">Caption</span>
                              <button onClick={() => { navigator.clipboard.writeText(batchContent[post.id].caption); toast.success('Caption copied!'); }} className="p-1 rounded hover:bg-white/5 text-[var(--text-muted)] hover:text-white transition-colors"><Copy size={10} /></button>
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{batchContent[post.id].caption}</p>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[8px] font-black text-violet-500 uppercase tracking-widest">Image Prompt</span>
                              <button onClick={() => { navigator.clipboard.writeText(batchContent[post.id].imagePrompt); toast.success('Prompt copied!'); }} className="p-1 rounded hover:bg-white/5 text-[var(--text-muted)] hover:text-white transition-colors"><Copy size={10} /></button>
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{batchContent[post.id].imagePrompt}</p>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Video Script</span>
                              <button onClick={() => { navigator.clipboard.writeText(batchContent[post.id].videoScript); toast.success('Script copied!'); }} className="p-1 rounded hover:bg-white/5 text-[var(--text-muted)] hover:text-white transition-colors"><Copy size={10} /></button>
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{batchContent[post.id].videoScript}</p>
                          </div>

                          {/* ── SCHEDULE TRIGGER BUTTON ── */}
                          <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setScheduleCaption(batchContent[post.id].caption);
                                setScheduleTime(POSTING_WINDOWS[platform]?.split(' ')[0] || '18:00');
                                setScheduleDate(new Date(Date.now() + 86400000 * (post.day - 1)).toISOString().split('T')[0]);
                                setSchedulingPost(post);
                              }}
                              className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-violet-600 hover:brightness-110 text-white rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-cyan-600/10"
                            >
                              <CalendarDays size={12} />
                              {sched?.status ? 'Reschedule Post' : 'Schedule Post'}
                            </button>

                            {sched?.status && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSchedules(prev => {
                                    const next = { ...prev };
                                    delete next[scheduleKey];
                                    return next;
                                  });
                                  toast.success('Scheduling cancelled');
                                }}
                                title="Cancel schedule / reset status"
                                className="px-2 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          ) : (
            // ─── VISUAL FEED PREVIEW ───
            <div className="w-full">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="animate-spin text-cyan-500 w-8 h-8" />
                </div>
              ) : plan.length === 0 ? (
                <div className="premium-card rounded-3xl p-8 text-center space-y-4 max-w-md mx-auto relative overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at bottom left, rgba(6,182,212,0.06) 0%, transparent 60%)' }} />
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mx-auto border border-cyan-500/20 relative z-10">
                    <EyeOff size={20} />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-base font-bold text-white">No Feed Preview Available</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                      Generate a Content Plan and create visual/textual assets to preview your feed aesthetics!
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Platform-Specific Mock Feed Grids */}
                  {(platform === 'Instagram' || platform === 'OnlyFans') && (
                    <div className="max-w-md mx-auto bg-[#06080d]/80 rounded-3xl border border-white/5 overflow-hidden shadow-2xl p-4">
                      {/* Instagram Header Mock */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                        <div className="flex items-center gap-2">
                          {persona.avatar ? (
                            <img src={persona.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><UserRound size={12} /></div>
                          )}
                          <div>
                            <span className="text-xs font-bold text-white">{persona.name.replace(/\s+/g, '').toLowerCase()}</span>
                            <span className="text-[9px] text-[var(--text-muted)] block leading-none">AI Influencer</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-cyan-500 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Feed Preview</span>
                      </div>

                      {/* 3-Column Image Grid */}
                      <div className="grid grid-cols-3 gap-1 bg-[#06080d] rounded-2xl overflow-hidden">
                        {plan.map((post, index) => {
                          const scheduleKey = `${platform}_day_${post.day}`;
                          const sched = schedules[scheduleKey];
                          const hasContent = !!batchContent[post.id];
                          const imageUrl = PREVIEW_IMAGES[index % PREVIEW_IMAGES.length] + '?auto=format&fit=crop&w=400&h=400&q=80';
                          
                          const mockLikes = Math.floor(125 + (post.day * 15.5) + (index * 8));
                          const mockComments = Math.floor(22 + (post.day * 3.4) + (index * 2));

                          return (
                            <div key={post.id} className="aspect-square relative group overflow-hidden bg-white/5 border border-white/5">
                              <img src={imageUrl} alt="" className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${hasContent ? 'opacity-100' : 'opacity-20 blur-[2px]'}`} />
                              
                              {/* Hover Overlay */}
                              <div className="absolute inset-0 bg-[#0B0F17]/85 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2 text-left">
                                <div className="text-[8px] font-bold text-white/50 uppercase leading-none">Day {post.day} · {post.type}</div>
                                
                                <div className="my-1.5">
                                  <p className="text-[9px] text-white font-medium line-clamp-3 leading-snug">“{post.hook}”</p>
                                </div>
                                
                                <div className="space-y-1.5">
                                  <div className="flex gap-2 text-[9px] text-[var(--text-secondary)] font-bold">
                                    <span>❤️ {mockLikes}</span>
                                    <span>💬 {mockComments}</span>
                                  </div>
                                  
                                  {sched?.status === 'Published' ? (
                                    <span className="text-[8px] font-black uppercase text-emerald-400 block">Published</span>
                                  ) : sched?.status === 'Scheduled' ? (
                                    <span className="text-[8px] font-black uppercase text-violet-400 block">Sched: {sched.time}</span>
                                  ) : (
                                    <span className="text-[8px] font-black uppercase text-[var(--text-muted)] block">{hasContent ? 'Draft' : 'Pending Content'}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(platform === 'TikTok' || platform === 'YouTube') && (
                    <div className="max-w-xl mx-auto bg-[#06080d]/80 rounded-3xl border border-white/5 overflow-hidden shadow-2xl p-4">
                      {/* Mock Vertical Video Feed Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                        <div className="flex items-center gap-2">
                          {persona.avatar ? (
                            <img src={persona.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><UserRound size={12} /></div>
                          )}
                          <div>
                            <span className="text-xs font-bold text-white">@{persona.name.replace(/\s+/g, '_').toLowerCase()}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Shorts Grid</span>
                      </div>

                      {/* 2-Column Vertical Aspect Grid (9:16) */}
                      <div className="grid grid-cols-2 gap-3 bg-[#06080d]">
                        {plan.map((post, index) => {
                          const scheduleKey = `${platform}_day_${post.day}`;
                          const sched = schedules[scheduleKey];
                          const hasContent = !!batchContent[post.id];
                          const imageUrl = PREVIEW_IMAGES[(index + 3) % PREVIEW_IMAGES.length] + '?auto=format&fit=crop&w=400&h=711&q=80';
                          
                          const mockViews = ((1.2 + (post.day * 0.4) + (index * 0.2))).toFixed(1);
                          const mockLikes = Math.floor(82 + (post.day * 11) + (index * 5));

                          return (
                            <div key={post.id} className="aspect-[9/16] relative group overflow-hidden bg-white/5 border border-white/5 rounded-2xl">
                              <img src={imageUrl} alt="" className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${hasContent ? 'opacity-100' : 'opacity-20 blur-[2px]'}`} />
                              
                              {/* Bottom visual overlay (views always visible) */}
                              <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white flex items-center gap-1 pointer-events-none group-hover:opacity-0 transition-opacity">
                                <Eye size={10} /> {mockViews}K views
                              </div>

                              {/* Hover Details overlay */}
                              <div className="absolute inset-0 bg-[#0B0F17]/85 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3 text-left">
                                <div>
                                  <span className="text-[8px] font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">Day {post.day}</span>
                                  <p className="text-[10px] text-white font-bold mt-2 line-clamp-4 leading-normal">“{post.hook}”</p>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="space-y-0.5 text-[10px] text-[var(--text-secondary)] font-bold">
                                    <p>👁️ {mockViews}K views</p>
                                    <p>❤️ {mockLikes} likes</p>
                                  </div>
                                  
                                  {sched?.status === 'Published' ? (
                                    <span className="text-[9px] font-black uppercase text-emerald-400 block">Published</span>
                                  ) : sched?.status === 'Scheduled' ? (
                                    <span className="text-[9px] font-black uppercase text-violet-400 block">Sched: {sched.time}</span>
                                  ) : (
                                    <span className="text-[9px] font-black uppercase text-[var(--text-muted)] block">{hasContent ? 'Draft' : 'Pending Content'}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(platform === 'Twitter/X' || platform === 'Threads') && (
                    <div className="max-w-xl mx-auto bg-[#06080d]/80 rounded-3xl border border-white/5 overflow-hidden shadow-2xl p-4 space-y-4">
                      {/* Mock Feed Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/5">
                        <span className="text-xs font-bold text-white">Latest Thread Posts</span>
                        <span className="text-[10px] font-black text-cyan-500 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Twitter Mix</span>
                      </div>

                      <div className="space-y-3">
                        {plan.map((post, index) => {
                          const scheduleKey = `${platform}_day_${post.day}`;
                          const sched = schedules[scheduleKey];
                          const hasContent = !!batchContent[post.id];
                          const imageUrl = PREVIEW_IMAGES[(index + 5) % PREVIEW_IMAGES.length] + '?auto=format&fit=crop&w=800&h=450&q=80';
                          
                          const mockLikes = Math.floor(45 + (post.day * 8) + (index * 2));
                          const mockReposts = Math.floor(8 + (post.day * 1.5) + (index * 0.5));

                          return (
                            <div key={post.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors relative group">
                              {/* Schedule indicator badge */}
                              <div className="absolute top-4 right-4">
                                {sched?.status === 'Published' ? (
                                  <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Published</span>
                                ) : sched?.status === 'Scheduled' ? (
                                  <span className="text-[8px] font-black uppercase text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full">Scheduled ({sched.time})</span>
                                ) : (
                                  <span className="text-[8px] font-black uppercase text-[var(--text-muted)] bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-full">Draft</span>
                                )}
                              </div>

                              <div className="flex gap-3">
                                {/* User Avatar */}
                                {persona.avatar ? (
                                  <img src={persona.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center"><UserRound size={14} /></div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-white">{persona.name}</span>
                                    <span className="text-[10px] text-[var(--text-muted)]">@{persona.name.replace(/\s+/g, '').toLowerCase()}</span>
                                    <span className="text-[10px] text-[var(--text-muted)]">· Day {post.day}</span>
                                  </div>
                                  
                                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed whitespace-pre-wrap">
                                    {hasContent ? batchContent[post.id].caption : `“${post.hook}”\n\n${post.angle}`}
                                  </p>
                                  
                                  {/* Image attachment if it's an image/carousel type */}
                                  {hasContent && (post.type.toLowerCase().includes('image') || post.type.toLowerCase().includes('post') || post.type.toLowerCase().includes('carousel')) && (
                                    <div className="mt-3 rounded-xl overflow-hidden border border-white/5 aspect-video">
                                      <img src={imageUrl} alt="Attachment" className="w-full h-full object-cover" />
                                    </div>
                                  )}

                                  {/* Mock actions bar */}
                                  <div className="flex gap-6 mt-4 text-[10px] text-[var(--text-muted)] font-bold">
                                    <span>💬 {mockReposts + 4} Comments</span>
                                    <span>🔁 {mockReposts} Reposts</span>
                                    <span>❤️ {mockLikes} Likes</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── CTA AREA ── */}
          <div className="bg-gradient-to-r from-cyan-600/10 to-violet-600/10 rounded-3xl p-8 border border-white/5 text-center space-y-6">
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-xl font-bold text-white">Generate Your Weekly Command</h3>
              <p className="text-sm text-[var(--text-tertiary)]">
                Generate 7 days of post ideas, hooks, captions, and content angles tailored to your persona's voice and growth goals.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => handleGenerate()}
                disabled={isLoading}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-black text-sm uppercase tracking-[0.1em] shadow-xl shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                Generate Weekly Plan
              </button>
              
              {plan.length > 0 && (
                <button
                  onClick={handleBatchGenerate}
                  disabled={batchLoading}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-sm uppercase tracking-[0.1em] shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {batchLoading ? <Loader2 size={18} className="animate-spin" /> : <Layers size={18} />}
                  {batchLoading ? 'Generating...' : 'Generate All Content'}
                </button>
              )}
              
              <button onClick={() => handleGenerate()} className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
                <RotateCcw size={16} />
                Regenerate Ideas
              </button>
            </div>
          </div>
        </div>

        {/* ── STRATEGY SIDEBAR ── */}
        <aside className="space-y-6">
          <div className="premium-card rounded-3xl overflow-hidden p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
                <BarChart3 size={16} />
              </div>
              <h3 className="text-lg font-bold text-white">Plan Strategy</h3>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Platform Mix</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{platform}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Content Mix</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                    <p className="text-[10px] text-[var(--text-muted)] font-bold mb-1">Reels</p>
                    <p className="text-sm font-bold text-white">{CONTENT_MIX[platform]?.reels ?? 3}</p>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                    <p className="text-[10px] text-[var(--text-muted)] font-bold mb-1">Stories</p>
                    <p className="text-sm font-bold text-white">{CONTENT_MIX[platform]?.stories ?? 4}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Best Posting Window</label>
                <div className="flex items-center gap-2 text-cyan-400">
                  <Clock size={14} />
                  <span className="text-sm font-bold">{POSTING_WINDOWS[platform] || '7:00 PM — 9:00 PM'}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Estimated Effort</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">High Intensity</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className={`w-2 h-2 rounded-full ${i <= 4 ? 'bg-orange-500' : 'bg-white/10'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
              <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Strategy Tweaks</p>
              <p className="text-[9px] text-[var(--text-muted)] -mt-1">Click to toggle — auto-regenerates plan</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'More Reels', icon: <Video size={10} /> },
                  { label: 'Educational', icon: <BookOpen size={10} /> },
                  { label: 'Controversial', icon: <TrendingUp size={10} /> },
                  { label: 'Sales Focused', icon: <ShoppingBag size={10} /> },
                  { label: 'More Engagement', icon: <MessageSquare size={10} /> },
                  { label: 'Trend Riding', icon: <Zap size={10} /> },
                ].map(chip => {
                  const active = activeStrategyTweaks.includes(chip.label);
                  return (
                    <button
                      key={chip.label}
                      onClick={() => handleStrategyTweak(chip.label)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all flex items-center gap-1.5 border ${
                        active
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                          : 'bg-white/5 border-white/5 text-[var(--text-tertiary)] hover:text-white hover:border-cyan-500/30'
                      }`}
                    >
                      {chip.icon}
                      {chip.label}
                      {active && <span className="text-cyan-400">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="premium-card p-6 rounded-3xl bg-gradient-to-br from-violet-600/20 to-transparent border-violet-500/20">
            <h4 className="text-xs font-black text-violet-400 uppercase tracking-widest mb-2">Pro Tip</h4>
            <p className="text-[11px] text-violet-100/70 leading-relaxed font-medium">
              Shorter scripts with a clear hook in the first 5 seconds generate 40% more engagement. Try the "Controversial" strategy tweak to boost reach.
            </p>
          </div>
        </aside>
      </div>

      {/* ── Scheduling Modal Overlay ── */}
      <AnimatePresence>
        {schedulingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSchedulingAction) setSchedulingPost(null);
              }}
              className="absolute inset-0"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-xl bg-[#0b0f17]/95 border border-[#334155] rounded-[28px] overflow-hidden shadow-2xl p-6 md:p-8 z-10"
            >
              {/* Top ambient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-cyan-500/10 blur-2xl rounded-full" />

              {/* Close Button */}
              <button
                onClick={() => setSchedulingPost(null)}
                disabled={isSchedulingAction}
                className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-violet-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Schedule Content</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    Prepare Day {schedulingPost.day} post for publication on {platform}
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-5">
                {/* Connected Platforms indicator */}
                <div>
                  <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest block mb-2">
                    Publishing Target
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                      {platform} Account Connected
                    </span>
                  </div>
                </div>

                {/* Edit Caption */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest block">
                    Caption
                  </label>
                  <textarea
                    value={scheduleCaption}
                    onChange={(e) => setScheduleCaption(e.target.value)}
                    disabled={isSchedulingAction}
                    rows={4}
                    placeholder="Enter the post caption..."
                    className="w-full bg-[#06080d]/80 border border-[#334155] rounded-2xl p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none disabled:opacity-50 leading-relaxed"
                  />
                </div>

                {/* Date & Time Pickers */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest block">
                      Date
                    </label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      disabled={isSchedulingAction}
                      className="w-full bg-[#06080d]/80 border border-[#334155] rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest block">
                      Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      disabled={isSchedulingAction}
                      className="w-full bg-[#06080d]/80 border border-[#334155] rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setSchedulingPost(null)}
                  disabled={isSchedulingAction}
                  className="order-3 sm:order-1 w-full sm:w-auto px-5 py-3 bg-white/5 border border-white/5 hover:bg-white/10 text-white font-bold rounded-2xl text-xs transition-all cursor-pointer disabled:opacity-50 text-center"
                >
                  Cancel
                </button>

                <div className="order-2 flex-1 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handlePublishNow}
                    disabled={isSchedulingAction}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-600/10"
                  >
                    {isSchedulingAction ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Publish Now
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmSchedule}
                    disabled={isSchedulingAction}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-violet-500 hover:brightness-110 text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-cyan-500/10"
                  >
                    {isSchedulingAction ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Schedule Post
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ViralPredictorModal
        isOpen={viralModalOpen}
        onClose={() => setViralModalOpen(false)}
        prompt={viralTargetPrompt}
        caption={viralTargetCaption}
        platform={platform}
        personaName={persona.name}
        onApplyEnhancedCaption={handleApplyEnhancedCaption}
      />
    </div>
  );
}
