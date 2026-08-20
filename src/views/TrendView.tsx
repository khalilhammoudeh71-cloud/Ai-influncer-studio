import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Users, Target, Zap, Volume2, Sparkles, 
  ArrowUpRight, Copy, Check, Loader2, RefreshCw, BarChart2,
  LineChart, Compass, MessageSquare, AlertCircle, Play
} from 'lucide-react';
import { Persona, NavActions } from '../types';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

interface TrendViewProps {
  persona: Persona | null;
  nav: NavActions;
}

interface TrendCard {
  id: string;
  title: string;
  category: 'topic' | 'sound' | 'niche';
  niche: string;
  velocity: string;
  velocityNum: number;
  reach: string;
  desc: string;
  soundUrl?: string;
}

const SAMPLE_TRENDS: TrendCard[] = [
  {
    id: 'trend-1',
    title: 'Quiet Luxury Gym Aesthetics',
    category: 'niche',
    niche: 'Fitness & Lifestyle',
    velocity: '+320%',
    velocityNum: 320,
    reach: '1.2M weekly',
    desc: 'High-contrast, warm gym lighting showing micro-workouts in neutral outfits. Focuses on premium, minimalist vibes rather than loud music.',
  },
  {
    id: 'trend-2',
    title: 'ASMR Desk Setup & Tech Snaps',
    category: 'niche',
    niche: 'Tech & Lifestyle',
    velocity: '+240%',
    velocityNum: 240,
    reach: '890K weekly',
    desc: 'Slowing down keycap clicks, mouse snaps, and warm fairy lights. Short vertical videos showing typing soundscapes with soft lifestyle voiceovers.',
  },
  {
    id: 'trend-3',
    title: 'Dopamine Dressing Glow-up',
    category: 'topic',
    niche: 'Fashion & Beauty',
    velocity: '+190%',
    velocityNum: 190,
    reach: '2.5M weekly',
    desc: 'Rapid wardrobe transition cuts syncing colors with the ambient mood. Highly cinematic color-graded reels showing confidence and outfit matches.',
  },
  {
    id: 'trend-4',
    title: 'Ambient Wavespeed Lofi Beats',
    category: 'sound',
    niche: 'Aesthetic / General',
    velocity: '+140%',
    velocityNum: 140,
    reach: '650K weekly',
    desc: 'A calming, high-fidelity lofi audio track suitable for motivational background narratives, vlogs, and office studies.',
    soundUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  },
  {
    id: 'trend-5',
    title: 'Phonk Core Gym Motivation',
    category: 'sound',
    niche: 'Fitness / Aggressive',
    velocity: '+285%',
    velocityNum: 285,
    reach: '3.1M weekly',
    desc: 'Fast, high-energy Phonk music track synced with hard visual transitions, posing slips, and epic gym lighting.',
    soundUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
  },
  {
    id: 'trend-6',
    title: 'AI Day in the Life Vlogs',
    category: 'topic',
    niche: 'AI Art & Tech',
    velocity: '+410%',
    velocityNum: 410,
    reach: '4.8M weekly',
    desc: 'Highly aesthetic hyperrealistic daily vlogs displaying morning routines, rendering setups, and virtual lifestyle segments.',
  }
];

interface Competitor {
  name: string;
  avatar: string;
  followers: string;
  followersNum: number;
  engagement: string;
  engagementNum: number;
  niche: string;
  avgViews: string;
  monthlyEarnings: string;
}

const COMPETITORS: Competitor[] = [
  {
    name: 'Lil Miquela',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    followers: '2.6M',
    followersNum: 2600000,
    engagement: '3.4%',
    engagementNum: 3.4,
    niche: 'Virtual Fashion & Pop Art',
    avgViews: '120K',
    monthlyEarnings: '$15K - $22K'
  },
  {
    name: 'Milla Sofia',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    followers: '150K',
    followersNum: 150000,
    engagement: '5.8%',
    engagementNum: 5.8,
    niche: 'AI Travel & Lifestyle',
    avgViews: '45K',
    monthlyEarnings: '$4K - $7K'
  },
  {
    name: 'Rozy (Virtual)',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    followers: '170K',
    followersNum: 170000,
    engagement: '4.2%',
    engagementNum: 4.2,
    niche: 'South Korean Virtual Creator',
    avgViews: '30K',
    monthlyEarnings: '$5K - $9K'
  }
];

export default function TrendView({ persona: activePersona, nav }: TrendViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'topic' | 'sound' | 'niche'>('all');
  const [selectedTrend, setSelectedTrend] = useState<TrendCard | null>(SAMPLE_TRENDS[0]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor>(COMPETITORS[0]);
  const [loading, setLoading] = useState(false);
  const [scriptResult, setScriptResult] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [audio] = useState(() => new Audio());

  const handlePlaySound = (url: string, id: string) => {
    if (isPlaying === id) {
      audio.pause();
      setIsPlaying(null);
    } else {
      audio.src = url;
      audio.play().catch(e => console.warn('Audio play failed:', e));
      setIsPlaying(id);
      audio.onended = () => setIsPlaying(null);
    }
  };

  const handleHijackTrend = async (trend: TrendCard) => {
    setLoading(true);
    setScriptResult(null);
    try {
      const response = await fetch('/api/generate-trend-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trendName: trend.title,
          trendDescription: trend.desc,
          trendNiche: trend.niche,
          persona: activePersona
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate trend script');
      }

      const data = await response.json();
      setScriptResult(data);
      toast.success('Trend script generated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to generate trend script');
    } finally {
      setLoading(false);
    }
  };

  const filteredTrends = SAMPLE_TRENDS.filter(t => 
    selectedCategory === 'all' ? true : t.category === selectedCategory
  );

  const copyToClipboard = (text: string, label = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 select-none">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E7C477]/10 pb-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif text-[#F5F1E8] tracking-tight flex items-center gap-3">
            Trend Radar
            <span className="text-[#E7C477] text-xl font-normal">✨</span>
          </h1>
          <p className="text-xs md:text-sm text-[#8C909A] mt-1 font-sans">
            Monitor real-time social metrics and hijack high-virality trends automatically.
          </p>
        </div>
        {activePersona && activePersona.id !== 'empty' ? (
          <div className="flex items-center gap-2.5 bg-cyan-950/20 border border-cyan-500/20 px-4 py-2 rounded-2xl shadow-inner">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-cyan-400/20 shrink-0">
              {activePersona.avatar || activePersona.referenceImage ? (
                <img src={activePersona.avatar || activePersona.referenceImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#1e293b] flex items-center justify-center text-cyan-400 font-bold text-xs">
                  {activePersona.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-black text-white">{activePersona.name}</p>
              <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">{activePersona.niche}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-2xl">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-300">No Persona Selected (General Mode)</span>
          </div>
        )}
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Heatmap & Hijacker */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Trend Heatmap Grid */}
          <div className="premium-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#00F5C2]" />
                  Viral Trend Heatmap
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">Select a trend card to analyze and draft content.</p>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex gap-1.5 bg-[#0B0F17]/50 border border-white/5 p-1 rounded-xl overflow-x-auto scrollbar-hide">
                {(['all', 'topic', 'sound', 'niche'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                      selectedCategory === cat
                        ? "bg-cyan-500/15 border border-cyan-500/20 text-cyan-400"
                        : "text-zinc-400 hover:text-white border border-transparent"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Heatmap Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTrends.map(trend => {
                const isSelected = selectedTrend?.id === trend.id;
                return (
                  <div
                    key={trend.id}
                    onClick={() => setSelectedTrend(trend)}
                    className={cn(
                      "premium-card p-4 flex flex-col justify-between gap-4 cursor-pointer transition-all border relative overflow-hidden group",
                      isSelected 
                        ? "border-cyan-500/40 bg-cyan-950/5 shadow-md shadow-cyan-950/20" 
                        : "border-white/5 hover:border-white/10 hover:bg-white/[0.01]"
                    )}
                  >
                    {/* Glowing highlight indicator */}
                    {isSelected && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-violet-500" />
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                          trend.category === 'topic' ? "bg-violet-500/10 text-violet-400 border-violet-500/20" :
                          trend.category === 'sound' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        )}>
                          {trend.category}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black text-[#00F5C2]">{trend.velocity}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#00F5C2] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </div>
                      </div>
                      
                      <h3 className="text-sm font-bold text-white leading-snug">{trend.title}</h3>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">{trend.desc}</p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[10px] text-[var(--text-muted)] font-bold">
                      <span>Niche: <span className="text-white">{trend.niche}</span></span>
                      <span>{trend.reach}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hijacker Details Panel */}
          {selectedTrend && (
            <div className="premium-card p-5 space-y-6 border border-cyan-500/15">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Active Trend Target</span>
                  <h2 className="text-lg font-bold text-white mt-1">{selectedTrend.title}</h2>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  {selectedTrend.soundUrl && (
                    <button
                      onClick={() => handlePlaySound(selectedTrend.soundUrl!, selectedTrend.id)}
                      className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-white font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <Play className={cn("w-3.5 h-3.5", isPlaying === selectedTrend.id ? "text-cyan-400 animate-pulse" : "text-white")} />
                      {isPlaying === selectedTrend.id ? 'Pause Sound' : 'Play Reference Sound'}
                    </button>
                  )}
                  <button
                    disabled={loading}
                    onClick={() => handleHijackTrend(selectedTrend)}
                    className="premium-button flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2.5 px-5 text-xs font-black uppercase tracking-wider"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Hijack Trend {activePersona?.name ? `with ${activePersona.name}` : ''}
                  </button>
                </div>
              </div>

              {/* Simulated Loading State */}
              {loading && (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-xs text-[var(--text-secondary)] font-bold animate-pulse">
                    Gemini Co-Pilot is analyzing hooks and visual matches...
                  </p>
                </div>
              )}

              {/* Script Generation Result */}
              {!loading && scriptResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-4 space-y-2">
                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider block">Script Concept & Angle</span>
                    <p className="text-xs text-cyan-300 font-bold leading-relaxed">"{scriptResult.concept}"</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Hook Line (1st 3s)</span>
                      <button
                        onClick={() => copyToClipboard(scriptResult.hook, 'Hook copied!')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <Copy size={12} /> Copy Hook
                      </button>
                    </div>
                    <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4">
                      <p className="text-sm font-black text-white italic">"{scriptResult.hook}"</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Vertical Video Script</span>
                      <button
                        onClick={() => copyToClipboard(scriptResult.voiceoverScript, 'Script copied!')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <Copy size={12} /> Copy Script
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      readOnly
                      value={scriptResult.voiceoverScript}
                      className="w-full bg-[var(--bg-input)] border border-white/5 rounded-xl py-3 px-4 outline-none text-[var(--text-secondary)] text-xs leading-relaxed"
                    />
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Recommended Visual Prompts (Use in Image/Video Studio)</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {scriptResult.visualPrompts?.map((prompt: string, idx: number) => (
                        <div key={idx} className="premium-card p-3 flex flex-col justify-between gap-3 border border-white/5">
                          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-4">"{prompt}"</p>
                          <button
                            onClick={() => copyToClipboard(prompt, `Prompt ${idx+1} copied!`)}
                            className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-white font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <Copy size={10} /> Copy Prompt
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <div className="flex flex-wrap gap-1.5">
                      {scriptResult.hashtags?.map((tag: string, idx: number) => (
                        <span key={idx} className="text-[10px] text-cyan-400 bg-cyan-400/5 px-2.5 py-1 rounded border border-cyan-500/10 font-bold">{tag}</span>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => nav.push({ view: 'create', subView: 'image' })}
                      className="flex items-center gap-1 text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest"
                    >
                      Open Creator Studio <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}

        </div>

        {/* Right 1 Column: Competitor Matchup */}
        <div className="space-y-6">
          <div className="premium-card p-5 space-y-6">
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                Competitor Analysis
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">Benchmark metrics against top virtual influencers.</p>
            </div>

            {/* Select Competitor */}
            <div className="grid grid-cols-3 gap-2">
              {COMPETITORS.map(comp => (
                <button
                  key={comp.name}
                  onClick={() => setSelectedCompetitor(comp)}
                  className={cn(
                    "p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center",
                    selectedCompetitor.name === comp.name
                      ? "border-violet-500/40 bg-violet-950/10 text-white"
                      : "border-white/5 hover:border-white/10 hover:bg-white/[0.01] text-zinc-400"
                  )}
                >
                  <img src={comp.avatar} alt="" className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                  <span className="text-[9px] font-black leading-none truncate max-w-full">{comp.name}</span>
                </button>
              ))}
            </div>

            {/* Competitor Profile Details */}
            <div className="premium-card p-4 border border-white/5 bg-[#0B0F17]/40 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Niche / Target</span>
                <span className="text-[10px] font-bold text-violet-400">{selectedCompetitor.niche}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Est. Brand Income</span>
                <span className="text-xs font-black text-white">{selectedCompetitor.monthlyEarnings}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Avg. Video Views</span>
                <span className="text-xs font-black text-white">{selectedCompetitor.avgViews}</span>
              </div>
            </div>

            {/* Head-to-Head Stats Comparison */}
            {activePersona && activePersona.id !== 'empty' ? (
              <div className="space-y-5">
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Head-to-Head Comparison</span>
                
                {/* Followers Comparison */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-cyan-400">{activePersona.name} (75K)</span>
                    <span className="text-violet-400">{selectedCompetitor.name} ({selectedCompetitor.followers})</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                    <div className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-full" style={{ width: `${(75000 / (75000 + selectedCompetitor.followersNum)) * 100}%` }} />
                    <div className="bg-gradient-to-r from-violet-500 to-violet-400 h-full" style={{ width: `${(selectedCompetitor.followersNum / (75000 + selectedCompetitor.followersNum)) * 100}%` }} />
                  </div>
                </div>

                {/* Engagement Comparison */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-cyan-400">{activePersona.name} (4.8%)</span>
                    <span className="text-violet-400">{selectedCompetitor.name} ({selectedCompetitor.engagement})</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                    <div className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-full" style={{ width: `${(4.8 / (4.8 + selectedCompetitor.engagementNum)) * 100}%` }} />
                    <div className="bg-gradient-to-r from-violet-500 to-violet-400 h-full" style={{ width: `${(selectedCompetitor.engagementNum / (4.8 + selectedCompetitor.engagementNum)) * 100}%` }} />
                  </div>
                </div>

                {/* Simulated Competitor SVG Chart */}
                <div className="border border-white/5 rounded-2xl p-4 space-y-3 bg-[#0B0F17]/30">
                  <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Audience Demographics Match</span>
                  
                  {/* SVG Map representation */}
                  <svg viewBox="0 0 100 50" className="w-full h-24 overflow-visible">
                    <path d="M 10 40 Q 25 10 40 30 T 70 20 T 90 10" fill="none" stroke="rgba(139, 92, 246, 0.4)" strokeWidth="2" strokeDasharray="3,3" />
                    <path d="M 10 40 Q 20 20 35 15 T 60 30 T 90 20" fill="none" stroke="rgba(34, 211, 238, 0.7)" strokeWidth="2" />
                    
                    {/* Dots */}
                    <circle cx="90" cy="20" r="3" fill="#00D4FF" />
                    <circle cx="90" cy="10" r="3" fill="#a78bfa" />
                    
                    {/* Gridlines */}
                    <line x1="10" y1="40" x2="90" y2="40" stroke="rgba(255,255,255,0.05)" />
                    <line x1="10" y1="10" x2="90" y2="10" stroke="rgba(255,255,255,0.05)" />
                  </svg>
                  
                  <div className="flex justify-between text-[8px] text-[var(--text-muted)] font-black uppercase tracking-widest pt-1">
                    <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Isabella (US / EU focus)</div>
                    <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-400" /> {selectedCompetitor.name}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center gap-2 border border-dashed border-white/5 rounded-2xl text-center bg-white/[0.01]">
                <AlertCircle className="w-5 h-5 text-zinc-500" />
                <span className="text-[11px] text-zinc-400 font-bold px-4 leading-relaxed">
                  Select a persona in the top header switcher to enable head-to-head metrics comparison.
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
