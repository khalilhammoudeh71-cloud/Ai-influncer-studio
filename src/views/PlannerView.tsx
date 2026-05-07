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
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Persona, PlannedPost, NavActions } from '../types';
import { generatePersonaPlan } from '../utils/personaEngine';
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

export default function PlannerView({ persona, personas, onSelectPersona, nav }: PlannerViewProps) {
  const [plan, setPlan] = useState<(PlannedPost & { id: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [platform, setPlatform] = useState(persona.platform);
  const [goal, setGoal] = useState<GoalType>('Grow followers');
  const [frequency, setFrequency] = useState<FrequencyType>('1 post/day');
  
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

  const handleGenerate = () => {
    setIsLoading(true);
    // Simulate complex AI thinking
    setTimeout(() => {
      const generated = generatePersonaPlan(persona, platform, goal);
      setPlan(generated);
      api.plannedPosts.save(persona.id, platform, generated.map(({ day, type, hook, angle, cta }) => ({ day, type, hook, angle, cta })))
        .then(() => toast.success('7-Day Strategy Generated!'))
        .catch(err => console.error('[Planner] Save error:', err))
        .finally(() => setIsLoading(false));
    }, 1500);
  };

  const handleReset = () => {
    setPlan([]);
    api.plannedPosts.save(persona.id, platform, [])
      .then(() => toast.success('Plan reset'))
      .catch(err => console.error('[Planner] Reset error:', err));
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
    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20 p-6 max-w-[1600px] mx-auto w-full">
      {/* ── HEADER ── */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/80">Growth Command Center</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
            Content Planner
            <Sparkles className="text-cyan-400" size={24} />
          </h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-1.5 font-medium max-w-lg">
            Build a data-backed 7-day posting strategy for your persona.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[var(--bg-elevated)]/40 p-2 rounded-2xl border border-[var(--border-subtle)] backdrop-blur-md">
          <div className="flex items-center gap-3 px-3">
            <div className="relative">
              <img 
                src={persona.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150"} 
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-cyan-500/20" 
                alt="Persona" 
              />
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                <Calendar size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Weekly Roadmap</h2>
                <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">7 Days · {frequency}</p>
              </div>
            </div>
            
            {plan.length > 0 && (
              <div className="flex gap-2">
                <button onClick={handleReset} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500/10 transition-colors">
                  Reset Plan
                </button>
                <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-[var(--bg-elevated)] text-white hover:bg-[var(--bg-overlay)] border border-white/5 transition-colors flex items-center gap-1.5">
                  <Download size={12} /> Export
                </button>
              </div>
            )}
          </div>

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
              plan.map((post, i) => (
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
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Ready</span>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--text-muted)] group-hover:text-cyan-400 transition-colors">
                      <span className="text-[10px] font-bold">Edit</span>
                      <ChevronRight size={12} />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

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
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-black text-sm uppercase tracking-[0.1em] shadow-xl shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                Generate Weekly Plan
              </button>
              
              <button className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
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
                    <p className="text-sm font-bold text-white">3</p>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                    <p className="text-[10px] text-[var(--text-muted)] font-bold mb-1">Stories</p>
                    <p className="text-sm font-bold text-white">4</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Best Posting Window</label>
                <div className="flex items-center gap-2 text-cyan-400">
                  <Clock size={14} />
                  <span className="text-sm font-bold">7:00 PM — 9:00 PM</span>
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
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'More Reels', icon: <Video size={10} /> },
                  { label: 'Educational', icon: <BookOpen size={10} /> },
                  { label: 'Controversial', icon: <TrendingUp size={10} /> },
                  { label: 'Sales Focused', icon: <ShoppingBag size={10} /> }
                ].map(chip => (
                  <button key={chip.label} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-bold text-[var(--text-tertiary)] hover:text-white hover:border-cyan-500/30 transition-all flex items-center gap-1.5">
                    {chip.icon}
                    {chip.label}
                  </button>
                ))}
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
    </div>
  );
}
