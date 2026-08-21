import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, Briefcase, Award, Zap, Columns, 
  Share2, Users, Target, Cpu, Crown, 
  MessageSquare, X, Copy, Check, Loader2,
  TrendingUp, AlertTriangle, CheckCircle2, ChevronRight, 
  Info, AlertCircle, Sparkles, Send, RefreshCw, BarChart2
} from 'lucide-react';
import { Persona, NavActions } from '../types';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';
import AIToolsView from './AIToolsView';

interface CreatorHubViewProps {
  persona: Persona;
  personas: Persona[];
  nav: NavActions;
  initialTool?: any;
  billingInfo?: any;
}

const TOOLS_CONFIG = [
  {
    id: 'brand-deal',
    title: 'Brand Deal Analyzer',
    desc: 'Evaluate brand deal fit, rates, contract flags, and draft custom counter-offers.',
    icon: Briefcase,
    color: 'from-amber-500 to-orange-600',
    glow: 'rgba(245, 158, 11, 0.15)',
  },
  {
    id: 'media-kit',
    title: 'Media Kit Generator',
    desc: 'Instantly generate an aesthetic media kit and rate card tailored to your persona.',
    icon: Award,
    color: 'from-teal-400 to-emerald-600',
    glow: 'rgba(20, 184, 166, 0.15)',
  },
  {
    id: 'viral-hooks',
    title: 'Viral Hook Generator',
    desc: 'Generate high-virality short-form hooks categorized by psychological triggers.',
    icon: Zap,
    color: 'from-violet-500 to-indigo-600',
    glow: 'rgba(139, 92, 246, 0.15)',
  },
  {
    id: 'ab-tester',
    title: 'A/B Caption Tester',
    desc: 'Simulate engagement of two captions and generate an optimized hybrid version.',
    icon: Columns,
    color: 'from-blue-500 to-cyan-600',
    glow: 'rgba(59, 130, 246, 0.15)',
  },
  {
    id: 'platform-adapter',
    title: 'Cross-Platform Adapter',
    desc: 'Reframe any post idea perfectly across Instagram, TikTok, YouTube, X, and LinkedIn.',
    icon: Share2,
    color: 'from-pink-500 to-rose-600',
    glow: 'rgba(236, 72, 153, 0.15)',
  },
  {
    id: 'collab-engine',
    title: 'Persona Collab Engine',
    desc: 'Merge aesthetics and voices of two system personas into collaborative content.',
    icon: Users,
    color: 'from-sky-400 to-blue-600',
    glow: 'rgba(56, 189, 248, 0.15)',
  },
  {
    id: 'avatar-profiler',
    title: 'Audience Avatar Profiler',
    desc: 'Generate humanized demographic profiles of your ideal audience segments.',
    icon: Target,
    color: 'from-fuchsia-500 to-purple-600',
    glow: 'rgba(217, 70, 239, 0.15)',
  },
  {
    id: 'repurpose-studio',
    title: 'Content Repurpose Studio',
    desc: 'Turn any long-form text or transcript into sliding carousels, threads, and short scripts.',
    icon: Cpu,
    color: 'from-emerald-400 to-green-600',
    glow: 'rgba(52, 211, 153, 0.15)',
  },
  {
    id: 'dream-collab',
    title: 'Dream Collab Picker',
    desc: 'Identify celebrity and top creator alignment details and draft direct pitches.',
    icon: Crown,
    color: 'from-rose-500 to-red-600',
    glow: 'rgba(244, 63, 94, 0.15)',
  },
  {
    id: 'comment-intelligence',
    title: 'Comment Intelligence',
    desc: 'Scan comment sections, extract sentiment ratios, and craft customized context replies.',
    icon: MessageSquare,
    color: 'from-indigo-500 to-purple-600',
    glow: 'rgba(99, 102, 241, 0.15)',
  }
];

export default function CreatorHubView({ persona: activePersona, personas, nav, initialTool, billingInfo }: CreatorHubViewProps) {
  const [toolboxSection, setToolboxSection] = useState<'all' | 'creative' | 'marketing'>('all');

  useEffect(() => {
    if (initialTool) {
      setToolboxSection('creative');
    } else {
      setActiveTool(null);
      setToolboxSection('all');
    }
  }, [initialTool]);

  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Tool Specific States
  // 1. Brand Deal
  const [dealText, setDealText] = useState('');
  const [brandDealResult, setBrandDealResult] = useState<any>(null);

  // 2. Media Kit
  const [mediaKitResult, setMediaKitResult] = useState<any>(null);

  // 3. Viral Hooks
  const [topic, setTopic] = useState('');
  const [hooksCount, setHooksCount] = useState(10);
  const [hooksResult, setHooksResult] = useState<any[]>([]);

  // 4. A/B Tester
  const [captionA, setCaptionA] = useState('');
  const [captionB, setCaptionB] = useState('');
  const [abTestResult, setAbTestResult] = useState<any>(null);

  // 5. Cross-Platform Adapter
  const [originalContent, setOriginalContent] = useState('');
  const [adaptedResult, setAdaptedResult] = useState<any>(null);
  const [selectedPlatformTab, setSelectedPlatformTab] = useState<'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'linkedin'>('instagram');

  // 6. Collab Engine
  const [collabPersonaId, setCollabPersonaId] = useState('');
  const [collabResult, setCollabResult] = useState<any>(null);

  // 7. Audience Avatar
  const [avatarResult, setAvatarResult] = useState<any>(null);
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState(0);

  // 8. Repurpose Studio
  const [longContent, setLongContent] = useState('');
  const [repurposeResult, setRepurposeResult] = useState<any>(null);
  const [repurposeTab, setRepurposeTab] = useState<'carousel' | 'hooks' | 'tweets' | 'shorts' | 'email' | 'reel'>('carousel');

  // 9. Dream Collab
  const [dreamCollabResult, setDreamCollabResult] = useState<any[]>([]);

  // 10. Comment Intelligence
  const [commentsInput, setCommentsInput] = useState('');
  const [commentsResult, setCommentsResult] = useState<any>(null);

  const copyToClipboard = (text: string, label = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleRunTool = async (toolId: string) => {
    if (!activePersona || activePersona.id === 'empty') {
      toast.error('Please create or select an active persona first!');
      return;
    }

    setLoading(true);
    try {
      let endpoint = '';
      let body: any = {};

      switch (toolId) {
        case 'brand-deal':
          if (!dealText.trim()) throw new Error('Please input the brand proposal text!');
          endpoint = '/api/analyze-brand-deal';
          body = { persona: activePersona, dealText };
          break;
        case 'media-kit':
          endpoint = '/api/generate-media-kit';
          body = { persona: activePersona };
          break;
        case 'viral-hooks':
          if (!topic.trim()) throw new Error('Please input content topic!');
          endpoint = '/api/viral-hooks';
          body = { persona: activePersona, topic, count: hooksCount };
          break;
        case 'ab-tester':
          if (!captionA.trim() || !captionB.trim()) throw new Error('Please input both Caption A and Caption B!');
          endpoint = '/api/ab-test-captions';
          body = { persona: activePersona, captionA, captionB };
          break;
        case 'platform-adapter':
          if (!originalContent.trim()) throw new Error('Please input original content to adapt!');
          endpoint = '/api/adapt-content';
          body = { persona: activePersona, content: originalContent };
          break;
        case 'collab-engine':
          const targetPersona = personas.find(p => p.id === collabPersonaId);
          if (!targetPersona) throw new Error('Please select a second persona to collaborate with!');
          endpoint = '/api/persona-collab';
          body = { personaA: activePersona, personaB: targetPersona };
          break;
        case 'avatar-profiler':
          endpoint = '/api/audience-profile';
          body = { persona: activePersona };
          break;
        case 'repurpose-studio':
          if (!longContent.trim()) throw new Error('Please input content to repurpose!');
          endpoint = '/api/repurpose-content';
          body = { persona: activePersona, content: longContent };
          break;
        case 'dream-collab':
          endpoint = '/api/dream-collab';
          body = { persona: activePersona };
          break;
        case 'comment-intelligence':
          if (!commentsInput.trim()) throw new Error('Please paste some comments to analyze!');
          const commentList = commentsInput.split('\n').filter(line => line.trim().length > 0);
          endpoint = '/api/analyze-comments';
          body = { persona: activePersona, comments: commentList };
          break;
        default:
          throw new Error('Unknown tool selected');
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${res.status}`);
      }

      const data = await res.json();

      // Set state based on tool
      switch (toolId) {
        case 'brand-deal': setBrandDealResult(data); break;
        case 'media-kit': setMediaKitResult(data); break;
        case 'viral-hooks': setHooksResult(data); break;
        case 'ab-tester': setAbTestResult(data); break;
        case 'platform-adapter': setAdaptedResult(data); setSelectedPlatformTab('instagram'); break;
        case 'collab-engine': setCollabResult(data); break;
        case 'avatar-profiler': setAvatarResult(data); setSelectedAvatarIdx(0); break;
        case 'repurpose-studio': setRepurposeResult(data); setRepurposeTab('carousel'); break;
        case 'dream-collab': setDreamCollabResult(data); break;
        case 'comment-intelligence': setCommentsResult(data); break;
      }
      toast.success('Tool execution completed successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'An error occurred during tool execution.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTool = (toolId: string) => {
    setActiveTool(toolId);
    // If it's a generator-style tool with no user inputs required, automatically execute it on open if no result yet
    if (toolId === 'media-kit' && !mediaKitResult) {
      handleRunTool('media-kit');
    }
    if (toolId === 'avatar-profiler' && !avatarResult) {
      handleRunTool('avatar-profiler');
    }
    if (toolId === 'dream-collab' && dreamCollabResult.length === 0) {
      handleRunTool('dream-collab');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto min-h-full select-none">
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#E7C477]/10 pb-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif text-[#F5F1E8] tracking-tight flex items-center gap-3">
            AI Toolbox
            <span className="text-[#E7C477] text-xl font-normal">✨</span>
          </h1>
          <p className="text-xs md:text-sm text-[#8C909A] mt-1 font-sans">
            Unified suite of visual creative editing and strategic marketing tools for{' '}
            <span className="text-[#F2D58D] font-medium">{activePersona.name || 'your persona'}</span>.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-3 bg-[#0A101C] border border-[#E7C477]/15 px-4 py-2 rounded-2xl">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#E7C477]/30 shrink-0">
            {activePersona.avatar ? (
              <img
                src={activePersona.avatar}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#0E1523] flex items-center justify-center text-[#8C909A]">
                <Users size={16} />
              </div>
            )}
          </div>
          <div className="text-left">
            <p className="text-[10px] font-semibold text-[#D9BA72] uppercase tracking-wider leading-none">Active Persona</p>
            <p className="text-xs font-bold text-[#F5F1E8] mt-1 leading-tight">{activePersona.name || 'Select a Persona'}</p>
          </div>
        </div>
      </header>

      {/* Segment Switcher */}
      <div className="flex w-full max-w-full justify-start overflow-x-auto pb-2 mb-6 sm:justify-center sm:mb-8">
        <div className="relative flex min-w-max p-1.5 bg-[#18181B] border border-[#E7C477]/20 rounded-2xl backdrop-blur-md shadow-lg shadow-black/40">
          <button
            onClick={() => setToolboxSection('all')}
            className={`relative px-4 sm:px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 z-10 cursor-pointer ${
              toolboxSection === 'all' ? 'text-[#141416]' : 'text-[#8C909A] hover:text-[#F5F1E8]'
            }`}
          >
            {toolboxSection === 'all' && (
              <motion.div
                layoutId="toolboxTabBg"
                className="absolute inset-0 bg-gradient-to-r from-[#F2D58D] to-[#B99655] rounded-xl -z-10 shadow-md shadow-amber-950/40"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="flex items-center gap-2">
              <Sparkles size={14} /> All Tools
            </span>
          </button>
          <button
            onClick={() => setToolboxSection('creative')}
            className={`relative px-4 sm:px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 z-10 cursor-pointer ${
              toolboxSection === 'creative' ? 'text-[#141416]' : 'text-[#8C909A] hover:text-[#F5F1E8]'
            }`}
          >
            {toolboxSection === 'creative' && (
              <motion.div
                layoutId="toolboxTabBg"
                className="absolute inset-0 bg-gradient-to-r from-[#F2D58D] to-[#B99655] rounded-xl -z-10 shadow-md shadow-amber-950/40"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="flex items-center gap-2">
              <Sparkles size={14} /> Creative & Editing
            </span>
          </button>
          <button
            onClick={() => setToolboxSection('marketing')}
            className={`relative px-4 sm:px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 z-10 cursor-pointer ${
              toolboxSection === 'marketing' ? 'text-[#141416]' : 'text-[#8C909A] hover:text-[#F5F1E8]'
            }`}
          >
            {toolboxSection === 'marketing' && (
              <motion.div
                layoutId="toolboxTabBg"
                className="absolute inset-0 bg-gradient-to-r from-[#F2D58D] to-[#B99655] rounded-xl -z-10 shadow-md shadow-amber-950/40"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="flex items-center gap-2">
              <Wrench size={14} /> Marketing & Strategy
            </span>
          </button>
        </div>
      </div>

      {toolboxSection === 'all' && (
        <div className="space-y-12">
          {/* Creative Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#E7C477]/10">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F2D58D] to-[#B99655] flex items-center justify-center text-[#141416] shadow-sm">
                <Sparkles size={14} />
              </div>
              <h2 className="text-sm font-bold text-[#F5F1E8] uppercase tracking-wider">Creative & Image/Video Production Suite</h2>
            </div>
            <AIToolsView 
              persona={activePersona} 
              personas={personas} 
              onSelectPersona={() => {}} 
              nav={nav} 
              initialTool={null}
              billingInfo={billingInfo}
            />
          </div>

          {/* Marketing Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#E7C477]/10">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F2D58D] to-[#B99655] flex items-center justify-center text-[#141416] shadow-sm">
                <Wrench size={14} />
              </div>
              <h2 className="text-sm font-bold text-[#F5F1E8] uppercase tracking-wider">Strategic Marketing & Co-Pilot Suite</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {TOOLS_CONFIG.map((tool) => {
                const Icon = tool.icon;
                return (
                  <motion.div
                    key={tool.id}
                    whileHover={{ y: -3, scale: 1.01 }}
                    onClick={() => handleOpenTool(tool.id)}
                    className="p-6 rounded-2xl bg-[#18181B] border border-white/10 hover:border-[#E7C477]/40 flex flex-col justify-between cursor-pointer group relative overflow-hidden h-[190px] shadow-lg transition-all duration-300"
                  >
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at 10% 10%, rgba(231,196,119,0.15) 0%, transparent 60%)`
                      }}
                    />
                    <div>
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.color} p-2.5 text-white flex items-center justify-center mb-3.5 shadow-md shadow-black/40`}>
                        <Icon size={22} />
                      </div>
                      <h3 className="text-base font-bold text-[#F5F1E8] group-hover:text-[#F2D58D] transition-colors">{tool.title}</h3>
                      <p className="text-xs text-[#8C909A] mt-1.5 line-clamp-2 leading-relaxed">{tool.desc}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#D9BA72] mt-3 uppercase tracking-wider opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                      Launch Tool <ChevronRight size={13} className="mt-0.5 animate-pulse text-[#E7C477]" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {toolboxSection === 'creative' && (
        <AIToolsView 
          persona={activePersona} 
          personas={personas} 
          onSelectPersona={() => {}} 
          nav={nav} 
          initialTool={initialTool}
          billingInfo={billingInfo}
        />
      )}

      {toolboxSection === 'marketing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOOLS_CONFIG.map((tool) => {
            const Icon = tool.icon;
            return (
              <motion.div
                key={tool.id}
                whileHover={{ y: -3, scale: 1.01 }}
                onClick={() => handleOpenTool(tool.id)}
                className="premium-card p-6 flex flex-col justify-between cursor-pointer group relative overflow-hidden h-[180px]"
                style={{
                  boxShadow: `0 8px 30px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255,255,255,0.02)`
                }}
              >
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 10% 10%, ${tool.glow} 0%, transparent 60%)`
                  }}
                />

                <div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} p-3 text-white flex items-center justify-center mb-4`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-[#00F5C2] transition-colors">{tool.title}</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1.5 line-clamp-2">{tool.desc}</p>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-black text-[#00D4FF] mt-3 uppercase tracking-wider opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                  Launch Tool <ChevronRight size={12} className="mt-0.5 animate-pulse" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal/Drawer Container */}
      <AnimatePresence>
        {activeTool && (() => {
          const config = TOOLS_CONFIG.find(t => t.id === activeTool);
          if (!config) return null;
          const Icon = config.icon;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
              onClick={() => setActiveTool(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 30 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#0B0F17] border border-white/10 w-full max-w-4xl h-[85vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl relative"
              >
                {/* Header */}
                <div className="flex-none flex justify-between items-center px-6 py-4 border-b border-white/5 bg-[#111827]/30 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.color} p-2.5 text-white flex items-center justify-center`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{config.title}</h2>
                      <p className="text-[11px] text-[var(--text-tertiary)]">{config.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTool(null)}
                    className="p-2 hover:bg-white/5 rounded-xl text-[var(--text-secondary)] hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content Panel (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6">
                  
                  {/* Tool 1: Brand Deal Analyzer */}
                  {activeTool === 'brand-deal' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">Paste partnership proposal email or DM</label>
                        <textarea
                          rows={6}
                          value={dealText}
                          onChange={(e) => setDealText(e.target.value)}
                          placeholder="Example: Hey Isabella! We love your lifestyle content and want to sponsor a post on your feed. We can offer $500 for a permanent post and require 3 weeks of category exclusivity..."
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[#00D4FF]/30 focus:border-[#00D4FF]/50 outline-none transition-all text-[var(--text-primary)] text-sm"
                        />
                        <button
                          disabled={loading}
                          onClick={() => handleRunTool('brand-deal')}
                          className="premium-button flex items-center justify-center gap-2 py-3 px-6 text-sm ml-auto disabled:opacity-50"
                        >
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
                          Analyze Proposal
                        </button>
                      </div>

                      {brandDealResult && (
                        <div className="space-y-6 pt-4 border-t border-white/5">
                          {/* Fit Score & Recommendation */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="premium-card p-5 flex flex-col items-center justify-center text-center">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Fit Score</span>
                              <div className="relative flex items-center justify-center w-24 h-24 mt-3">
                                {/* Score Indicator Ring */}
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                                  <circle 
                                    cx="48" cy="48" r="40" 
                                    stroke={brandDealResult.fitScore > 75 ? '#00F5C2' : brandDealResult.fitScore > 40 ? '#00D4FF' : '#EF4444'} 
                                    strokeWidth="6" fill="transparent" 
                                    strokeDasharray={`${2 * Math.PI * 40}`} 
                                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - brandDealResult.fitScore / 100)}`} 
                                  />
                                </svg>
                                <span className="absolute text-2xl font-black text-white">{brandDealResult.fitScore}</span>
                              </div>
                              <span className="text-xs font-bold text-white mt-3 bg-white/5 border border-white/10 px-3 py-1 rounded-full">{brandDealResult.fitLabel}</span>
                            </div>

                            <div className="md:col-span-2 premium-card p-5 flex flex-col justify-between">
                              <div>
                                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Verdict & fit analysis</span>
                                <p className="text-2xl font-black text-white mt-1.5">
                                  {brandDealResult.verdict === 'Accept' && <span className="text-emerald-400">Accept Deal ✦</span>}
                                  {brandDealResult.verdict === 'Negotiate' && <span className="text-[#00D4FF]">Negotiate Terms ⚡︎</span>}
                                  {brandDealResult.verdict === 'Pass' && <span className="text-red-400">Pass on Offer 🛑</span>}
                                </p>
                                <p className="text-sm text-[var(--text-secondary)] mt-2">{brandDealResult.fitReason}</p>
                              </div>

                              <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Suggested Rate</span>
                                  <span className="font-extrabold text-white text-lg">{brandDealResult.suggestedRate}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Rate Basis</span>
                                  <span className="text-[11px] text-[var(--text-secondary)] block line-clamp-2 mt-0.5">{brandDealResult.rateReason}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Red / Green Flags */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="premium-card p-5 border-emerald-500/10">
                              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                                <CheckCircle2 size={14} /> Green Flags
                              </span>
                              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                                {brandDealResult.greenFlags?.map((flag: string, i: number) => (
                                  <li key={i} className="flex gap-2 items-start">
                                    <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                                    <span>{flag}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="premium-card p-5 border-red-500/10">
                              <span className="text-[10px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                                <AlertTriangle size={14} /> Red Flags
                              </span>
                              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                                {brandDealResult.redFlags?.map((flag: string, i: number) => (
                                  <li key={i} className="flex gap-2 items-start">
                                    <span className="text-red-400 font-bold mt-0.5">⚠️</span>
                                    <span>{flag}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Negotiation Tips */}
                          <div className="premium-card p-5">
                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-3">Negotiation Strategies</span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {brandDealResult.negotiationTips?.map((tip: string, i: number) => (
                                <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-3.5 flex gap-2">
                                  <div className="w-5 h-5 rounded-full bg-[#00D4FF]/10 text-[#00D4FF] flex items-center justify-center font-bold text-xs shrink-0">{i+1}</div>
                                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{tip}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Counter Offer Email */}
                          <div className="premium-card p-5 relative">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Draft Response Email</span>
                              <button
                                onClick={() => copyToClipboard(brandDealResult.counterOfferEmail)}
                                className="flex items-center gap-1.5 text-xs text-[#00D4FF] hover:text-[#00F5C2] transition-colors"
                              >
                                <Copy size={13} /> Copy Pitch
                              </button>
                            </div>
                            <textarea
                              rows={8}
                              readOnly
                              value={brandDealResult.counterOfferEmail}
                              className="w-full bg-[var(--bg-input)] border border-white/5 rounded-xl py-3 px-4 outline-none text-[var(--text-secondary)] text-xs font-mono leading-relaxed"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tool 2: Media Kit Generator */}
                  {activeTool === 'media-kit' && (
                    <div className="space-y-6">
                      {loading && (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                          <Loader2 className="animate-spin text-[#00F5C2]" size={36} />
                          <p className="text-sm text-[var(--text-tertiary)] font-medium">Extracting persona details and structuring media kit...</p>
                        </div>
                      )}

                      {!loading && mediaKitResult && (
                        <div className="space-y-8">
                          {/* Top Info Strip */}
                          <div className="bg-gradient-to-r from-teal-500/10 to-[#00D4FF]/10 border border-teal-500/20 rounded-3xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-teal-400">
                              <Award size={180} />
                            </div>
                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-5">
                              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#00F5C2] shadow-lg shrink-0">
                                {activePersona.avatar ? (
                                  <img
                                    src={activePersona.avatar}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-[#1e293b] flex items-center justify-center text-[#64748b]">
                                    <Users size={32} />
                                  </div>
                                )}
                              </div>
                              <div className="text-center md:text-left">
                                <h3 className="text-2xl font-black text-white">{activePersona.name}</h3>
                                <p className="text-teal-400 font-bold text-xs uppercase tracking-widest mt-0.5">{mediaKitResult.tagline}</p>
                                <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-xl leading-relaxed">{mediaKitResult.bio}</p>
                              </div>
                            </div>
                          </div>

                          {/* Audience Stats Display */}
                          <div>
                            <h4 className="text-xs uppercase tracking-widest font-black text-[var(--text-muted)] mb-4">Audience Demographics & Engagement</h4>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                              {[
                                { label: 'Primary Age', value: mediaKitResult.audienceStats?.ageRange, color: 'text-violet-400' },
                                { label: 'Top Gender', value: mediaKitResult.audienceStats?.topGenders, color: 'text-pink-400' },
                                { label: 'Top Locations', value: mediaKitResult.audienceStats?.topLocations?.join(', '), color: 'text-[#00D4FF]' },
                                { label: 'Engagement Rate', value: mediaKitResult.audienceStats?.avgEngagementRate || '4.5%', color: 'text-[#00F5C2]' }
                              ].map((stat, i) => (
                                <div key={i} className="premium-card p-4 text-center">
                                  <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold tracking-wider">{stat.label}</span>
                                  <span className={`text-base font-black mt-2 block ${stat.color}`}>{stat.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Content Types & Brand Values */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="premium-card p-5">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-3">Content Formats & Niches</span>
                              <div className="flex flex-wrap gap-2">
                                {mediaKitResult.contentTypes?.map((type: string, i: number) => (
                                  <span key={i} className="tag-pill bg-white/5 border-white/10 text-white text-xs">{type}</span>
                                ))}
                              </div>
                            </div>

                            <div className="premium-card p-5">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-3">Brand Integrity Values</span>
                              <div className="flex flex-wrap gap-2">
                                {mediaKitResult.brandValues?.map((val: string, i: number) => (
                                  <span key={i} className="tag-pill text-teal-400 bg-teal-500/10 border-teal-500/25 text-xs">{val}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Packages & Deliverables */}
                          <div>
                            <h4 className="text-xs uppercase tracking-widest font-black text-[var(--text-muted)] mb-4">Content Sponsorship Packages</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {mediaKitResult.packages?.map((pkg: any, i: number) => (
                                <div key={i} className="premium-card p-5 flex flex-col justify-between h-[200px]">
                                  <div>
                                    <div className="flex justify-between items-start">
                                      <h5 className="font-extrabold text-sm text-white">{pkg.name}</h5>
                                      <span className="text-emerald-400 font-black text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">{pkg.price}</span>
                                    </div>
                                    <p className="text-[11px] text-[var(--text-secondary)] mt-2 leading-relaxed">{pkg.deliverables}</p>
                                  </div>
                                  <div className="pt-3 border-t border-white/5 mt-3">
                                    <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold tracking-wider">Ideal For</span>
                                    <span className="text-[10px] text-[var(--text-tertiary)] truncate block mt-0.5 font-medium">{pkg.ideal}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Past Collabs */}
                          <div className="premium-card p-5">
                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-2">Hypothetical / Past Partnerships</span>
                            <div className="flex gap-6 items-center text-xs text-[var(--text-secondary)]">
                              {mediaKitResult.pastCollabs?.map((collab: string, i: number) => (
                                <div key={i} className="flex items-center gap-1.5 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/5 font-semibold text-white">
                                  <span>✦</span> {collab}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Footer Closing */}
                          <div className="text-center py-4 text-xs text-[var(--text-muted)] font-medium">
                            {mediaKitResult.contactNote}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tool 3: Viral Hook Generator */}
                  {activeTool === 'viral-hooks' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">Content Topic / Subject</label>
                          <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. 5 toxic skincare habits you must stop"
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl py-3 px-4 focus:ring-2 focus:ring-[#00D4FF]/30 focus:border-[#00D4FF]/50 outline-none transition-all text-[var(--text-primary)] text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">Hook Count ({hooksCount})</label>
                          <div className="flex items-center gap-4">
                            <input
                              type="range"
                              min={5}
                              max={15}
                              value={hooksCount}
                              onChange={(e) => setHooksCount(parseInt(e.target.value))}
                              className="flex-1 accent-[#00F5C2]"
                            />
                            <button
                              disabled={loading}
                              onClick={() => handleRunTool('viral-hooks')}
                              className="premium-button flex items-center gap-2 py-3 px-5 text-xs disabled:opacity-50 shrink-0"
                            >
                              {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                              Generate
                            </button>
                          </div>
                        </div>
                      </div>

                      {hooksResult.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-white/5">
                          {hooksResult.map((hk: any, i: number) => (
                            <div key={i} className="premium-card p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-black text-[#00D4FF] bg-[#00D4FF]/10 px-2 py-0.5 rounded uppercase tracking-wider">{hk.type}</span>
                                  <span className="text-[10px] font-bold text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded">{hk.platform}</span>
                                  <span className="text-[10px] font-black text-emerald-400 ml-1">Score: {hk.viralityScore}/10</span>
                                </div>
                                <p className="text-sm font-bold text-white mt-1.5">"{hk.hook}"</p>
                                <p className="text-xs text-[var(--text-tertiary)] italic">Why it works: {hk.why}</p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(hk.hook, 'Hook copied!')}
                                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl text-xs text-white border border-white/5 shrink-0 transition-colors cursor-pointer"
                              >
                                <Copy size={13} /> Copy Hook
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tool 4: A/B Caption Tester */}
                  {activeTool === 'ab-tester' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-wider font-bold text-amber-400">Caption Option A</label>
                          <textarea
                            rows={5}
                            value={captionA}
                            onChange={(e) => setCaptionA(e.target.value)}
                            placeholder="Write caption A here..."
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 outline-none transition-all text-[var(--text-primary)] text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-wider font-bold text-violet-400">Caption Option B</label>
                          <textarea
                            rows={5}
                            value={captionB}
                            onChange={(e) => setCaptionB(e.target.value)}
                            placeholder="Write caption B here..."
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 outline-none transition-all text-[var(--text-primary)] text-sm"
                          />
                        </div>
                      </div>
                      <button
                        disabled={loading}
                        onClick={() => handleRunTool('ab-tester')}
                        className="premium-button flex items-center justify-center gap-2 py-3 px-6 text-sm ml-auto disabled:opacity-50"
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <BarChart2 size={16} />}
                        Simulate engagement
                      </button>

                      {abTestResult && (
                        <div className="space-y-6 pt-4 border-t border-white/5">
                          {/* Engagement Winner */}
                          <div className="premium-card p-5 bg-gradient-to-r from-violet-600/10 to-[#00D4FF]/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Predictive engagement winner</span>
                              <h3 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
                                {abTestResult.winner === 'A' && <span className="text-amber-400">Option A Wins 🏆</span>}
                                {abTestResult.winner === 'B' && <span className="text-violet-400">Option B Wins 🏆</span>}
                                {abTestResult.winner === 'Tie' && <span className="text-[#00D4FF]">It's a Tie! 🤝</span>}
                                <span className="text-xs font-bold text-[var(--text-secondary)] bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">{abTestResult.confidence}% confidence</span>
                              </h3>
                              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{abTestResult.winnerReason}</p>
                            </div>
                          </div>

                          {/* Side-by-side Score Comparison */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Score Card A */}
                            <div className="premium-card p-5 border-amber-500/20">
                              <h4 className="font-extrabold text-sm text-amber-400 mb-4 flex justify-between items-center">
                                Option A Metrics
                                <span className="text-base font-black text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">{abTestResult.scoreA?.overall}/10</span>
                              </h4>
                              <div className="space-y-3">
                                {[
                                  { label: 'Hook Strength', val: abTestResult.scoreA?.hookStrength },
                                  { label: 'CTA Clarity', val: abTestResult.scoreA?.ctaClarity },
                                  { label: 'Emotional Pull', val: abTestResult.scoreA?.emotionalPull },
                                  { label: 'Platform Fit', val: abTestResult.scoreA?.platformFit }
                                ].map((m, idx) => (
                                  <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-[11px] font-medium text-[var(--text-secondary)]">
                                      <span>{m.label}</span>
                                      <span>{m.val}/10</span>
                                    </div>
                                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-amber-400 h-full rounded-full" style={{ width: `${m.val * 10}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-[var(--text-tertiary)] italic mt-4 pt-3 border-t border-white/5">Critique: {abTestResult.scoreA?.feedback}</p>
                            </div>

                            {/* Score Card B */}
                            <div className="premium-card p-5 border-violet-500/20">
                              <h4 className="font-extrabold text-sm text-violet-400 mb-4 flex justify-between items-center">
                                Option B Metrics
                                <span className="text-base font-black text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">{abTestResult.scoreB?.overall}/10</span>
                              </h4>
                              <div className="space-y-3">
                                {[
                                  { label: 'Hook Strength', val: abTestResult.scoreB?.hookStrength },
                                  { label: 'CTA Clarity', val: abTestResult.scoreB?.ctaClarity },
                                  { label: 'Emotional Pull', val: abTestResult.scoreB?.emotionalPull },
                                  { label: 'Platform Fit', val: abTestResult.scoreB?.platformFit }
                                ].map((m, idx) => (
                                  <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-[11px] font-medium text-[var(--text-secondary)]">
                                      <span>{m.label}</span>
                                      <span>{m.val}/10</span>
                                    </div>
                                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-violet-500 h-full rounded-full" style={{ width: `${m.val * 10}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-[var(--text-tertiary)] italic mt-4 pt-3 border-t border-white/5">Critique: {abTestResult.scoreB?.feedback}</p>
                            </div>
                          </div>

                          {/* Optimized Hybrid Caption */}
                          <div className="premium-card p-5 relative">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles size={13} className="text-[#00F5C2]" /> Recommended Hybrid Caption
                              </span>
                              <button
                                onClick={() => copyToClipboard(abTestResult.hybridCaption, 'Hybrid caption copied!')}
                                className="flex items-center gap-1.5 text-xs text-[#00D4FF] hover:text-[#00F5C2] transition-colors"
                              >
                                <Copy size={13} /> Copy Caption
                              </button>
                            </div>
                            <textarea
                              rows={5}
                              readOnly
                              value={abTestResult.hybridCaption}
                              className="w-full bg-[var(--bg-input)] border border-white/5 rounded-xl py-3 px-4 outline-none text-[var(--text-secondary)] text-xs leading-relaxed"
                            />
                            <p className="text-[11px] text-[var(--text-tertiary)] mt-2">Hybrid strategy: {abTestResult.hybridReason}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tool 5: Cross-Platform Content Adapter */}
                  {activeTool === 'platform-adapter' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">Input original content (caption, hook, video concept)</label>
                        <textarea
                          rows={4}
                          value={originalContent}
                          onChange={(e) => setOriginalContent(e.target.value)}
                          placeholder="Example: Here is an idea: why eating sugar is ruining your focus, and 3 simple snacks to swap. This is for my lifestyle account Isabella."
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[#00D4FF]/30 focus:border-[#00D4FF]/50 outline-none transition-all text-[var(--text-primary)] text-sm"
                        />
                        <button
                          disabled={loading}
                          onClick={() => handleRunTool('platform-adapter')}
                          className="premium-button flex items-center justify-center gap-2 py-3 px-6 text-sm ml-auto disabled:opacity-50"
                        >
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                          Adapt across platforms
                        </button>
                      </div>

                      {adaptedResult && (
                        <div className="space-y-6 pt-4 border-t border-white/5">
                          {/* Platform Tabs */}
                          <div className="flex gap-2 border-b border-white/5 pb-2 overflow-x-auto scrollbar-hide">
                            {(['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin'] as const).map((plat) => (
                              <button
                                key={plat}
                                onClick={() => setSelectedPlatformTab(plat)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                                  selectedPlatformTab === plat 
                                    ? 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20'
                                    : 'text-[var(--text-muted)] hover:text-white'
                                }`}
                              >
                                {plat}
                              </button>
                            ))}
                          </div>

                          {/* Selected Platform Content View */}
                          <div className="premium-card p-5 space-y-4">
                            {selectedPlatformTab === 'instagram' && (
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Instagram Adaption</span>
                                  <button
                                    onClick={() => copyToClipboard(adaptedResult.instagram?.caption)}
                                    className="flex items-center gap-1.5 text-xs text-[#00D4FF] hover:text-[#00F5C2] transition-colors"
                                  >
                                    <Copy size={13} /> Copy Caption
                                  </button>
                                </div>
                                <textarea
                                  rows={5}
                                  readOnly
                                  value={adaptedResult.instagram?.caption}
                                  className="w-full bg-[var(--bg-input)] border border-white/5 rounded-xl py-3 px-4 outline-none text-[var(--text-secondary)] text-xs leading-relaxed"
                                />
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                  <div>
                                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Suggested Format</span>
                                    <span className="text-xs font-bold text-white block mt-0.5">{adaptedResult.instagram?.format}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Platform Tip</span>
                                    <span className="text-[11px] text-[var(--text-secondary)] block mt-0.5">{adaptedResult.instagram?.tip}</span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Hashtags</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {adaptedResult.instagram?.hashtags?.map((tag: string, i: number) => (
                                      <span key={i} className="text-[10px] text-violet-400 bg-violet-400/5 px-2 py-0.5 rounded border border-violet-500/10">{tag}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {selectedPlatformTab === 'tiktok' && (
                              <div className="space-y-4">
                                <div>
                                  <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Opening Hook</span>
                                  <p className="text-sm font-bold text-white mt-1">"{adaptedResult.tiktok?.hook}"</p>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Video Script Outline</span>
                                  <button
                                    onClick={() => copyToClipboard(adaptedResult.tiktok?.script)}
                                    className="flex items-center gap-1.5 text-xs text-[#00D4FF] hover:text-[#00F5C2] transition-colors"
                                  >
                                    <Copy size={13} /> Copy Script
                                  </button>
                                </div>
                                <textarea
                                  rows={5}
                                  readOnly
                                  value={adaptedResult.tiktok?.script}
                                  className="w-full bg-[var(--bg-input)] border border-white/5 rounded-xl py-3 px-4 outline-none text-[var(--text-secondary)] text-xs leading-relaxed"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Audio/Sound Suggestion</span>
                                    <span className="text-xs font-bold text-white block mt-0.5">{adaptedResult.tiktok?.soundSuggestion}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">TikTok Tip</span>
                                    <span className="text-[11px] text-[var(--text-secondary)] block mt-0.5">{adaptedResult.tiktok?.tip}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {selectedPlatformTab === 'youtube' && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Optimized SEO Title</span>
                                    <span className="text-sm font-bold text-[#00D4FF] block mt-1">{adaptedResult.youtube?.title}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Thumbnail Concept</span>
                                    <span className="text-xs text-[var(--text-secondary)] block mt-1">{adaptedResult.youtube?.thumbnail}</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Video Outline / Sections</span>
                                  <ul className="space-y-1.5 mt-1.5 text-xs text-[var(--text-secondary)]">
                                    {adaptedResult.youtube?.outline?.map((sect: string, idx: number) => (
                                      <li key={idx} className="flex gap-2">
                                        <span className="text-[#00F5C2] font-black">{idx + 1}.</span>
                                        <span>{sect}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Description Preview</span>
                                  <p className="text-xs text-[var(--text-tertiary)] italic mt-1 leading-relaxed">"{adaptedResult.youtube?.description}"</p>
                                </div>
                              </div>
                            )}

                            {selectedPlatformTab === 'twitter' && (
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Twitter/X Thread</span>
                                  <button
                                    onClick={() => copyToClipboard(adaptedResult.twitter?.thread?.join('\n\n'))}
                                    className="flex items-center gap-1.5 text-xs text-[#00D4FF] hover:text-[#00F5C2] transition-colors"
                                  >
                                    <Copy size={13} /> Copy Thread
                                  </button>
                                </div>
                                <div className="space-y-3">
                                  {adaptedResult.twitter?.thread?.map((tweet: string, i: number) => (
                                    <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-3 flex gap-2.5">
                                      <span className="text-[#00F5C2] font-extrabold text-xs">{i+1}/</span>
                                      <p className="text-xs text-white leading-relaxed">{tweet}</p>
                                    </div>
                                  ))}
                                </div>
                                <div className="pt-2">
                                  <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold mb-1.5">Standalone Tweet alternative</span>
                                  <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">"{adaptedResult.twitter?.standalone}"</p>
                                </div>
                              </div>
                            )}

                            {selectedPlatformTab === 'linkedin' && (
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">LinkedIn Professional Reframe</span>
                                  <button
                                    onClick={() => copyToClipboard(adaptedResult.linkedin?.post)}
                                    className="flex items-center gap-1.5 text-xs text-[#00D4FF] hover:text-[#00F5C2] transition-colors"
                                  >
                                    <Copy size={13} /> Copy Post
                                  </button>
                                </div>
                                <textarea
                                  rows={5}
                                  readOnly
                                  value={adaptedResult.linkedin?.post}
                                  className="w-full bg-[var(--bg-input)] border border-white/5 rounded-xl py-3 px-4 outline-none text-[var(--text-secondary)] text-xs leading-relaxed"
                                />
                                <div>
                                  <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Professional Angle Approach</span>
                                  <span className="text-xs font-bold text-[#00D4FF] block mt-0.5">{adaptedResult.linkedin?.angle}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tool 6: Persona Collab Engine */}
                  {activeTool === 'collab-engine' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div className="space-y-1.5">
                          <label className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">Select system persona to collaborate with</label>
                          <select
                            value={collabPersonaId}
                            onChange={(e) => setCollabPersonaId(e.target.value)}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl py-3 px-4 outline-none text-[var(--text-primary)] text-sm appearance-none"
                          >
                            <option value="">-- Choose Persona --</option>
                            {personas
                              .filter((p) => p.id !== activePersona.id && p.id !== 'empty')
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.niche})
                                </option>
                              ))}
                          </select>
                        </div>
                        <button
                          disabled={loading}
                          onClick={() => handleRunTool('collab-engine')}
                          className="premium-button flex items-center justify-center gap-2 py-3.5 px-6 text-sm disabled:opacity-50"
                        >
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                          Synthesize Collaboration
                        </button>
                      </div>

                      {collabResult && (
                        <div className="space-y-6 pt-4 border-t border-white/5">
                          {/* Chemistry Score banner */}
                          <div className="premium-card p-5 bg-gradient-to-r from-teal-500/10 to-[#00D4FF]/10 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-full bg-[#00F5C2]/10 border border-[#00F5C2]/20 flex items-center justify-center text-2xl font-black text-[#00F5C2]">
                                {collabResult.chemistryScore}%
                              </div>
                              <div>
                                <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Collab Compatibility</span>
                                <h4 className="text-lg font-extrabold text-white leading-tight">{collabResult.chemistryLabel}</h4>
                              </div>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] md:max-w-md leading-relaxed">{collabResult.chemistryExplain}</p>
                          </div>

                          {/* Concept Breakdown */}
                          <div className="premium-card p-5">
                            <span className="text-[10px] font-black text-[#00D4FF] uppercase tracking-wider block">Joint content concept</span>
                            <h3 className="text-xl font-bold text-white mt-1">"{collabResult.collabConcept}"</h3>
                            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{collabResult.conceptDescription}</p>

                            <div className="mt-4 pt-4 border-t border-white/5">
                              <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold mb-2">Ideal Formats</span>
                              <div className="flex gap-2 flex-wrap">
                                {collabResult.contentFormats?.map((form: string, idx: number) => (
                                  <span key={idx} className="tag-pill text-white bg-white/5 border-white/10 text-xs">{form}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Collab Script / Dialogue */}
                          {collabResult.collabDialogue && collabResult.collabDialogue.length > 0 && (
                            <div className="premium-card p-5">
                              <span className="text-[10px] font-black text-[#8B5CF6] uppercase tracking-wider block mb-3">Collaboration Script Dialogue</span>
                              <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {collabResult.collabDialogue.map((diag: any, idx: number) => {
                                  const isPersonaA = diag.speaker === activePersona.name;
                                  return (
                                    <div key={idx} className={cn("flex flex-col gap-1.5", isPersonaA ? "items-start" : "items-end")}>
                                      <span className={cn("text-[9px] font-black uppercase tracking-wider", isPersonaA ? "text-violet-400" : "text-[#00D4FF]")}>
                                        {diag.speaker}
                                      </span>
                                      <div className={cn(
                                        "px-3 py-2 rounded-xl text-xs max-w-[85%] leading-relaxed",
                                        isPersonaA 
                                          ? "bg-violet-500/10 text-violet-100 rounded-tl-none border border-violet-500/10" 
                                          : "bg-[#00D4FF]/10 text-[#00D4FF] rounded-tr-none border border-[#00D4FF]/10"
                                      )}>
                                        {diag.line}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Combined Voice Caption */}
                          <div className="premium-card p-5 relative">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Merged Voice Post Caption</span>
                              <button
                                onClick={() => copyToClipboard(collabResult.jointCaption, 'Joint caption copied!')}
                                className="flex items-center gap-1.5 text-xs text-[#00D4FF] hover:text-[#00F5C2] transition-colors"
                              >
                                <Copy size={13} /> Copy Caption
                              </button>
                            </div>
                            <textarea
                              rows={5}
                              readOnly
                              value={collabResult.jointCaption}
                              className="w-full bg-[var(--bg-input)] border border-white/5 rounded-xl py-3 px-4 outline-none text-[var(--text-secondary)] text-xs leading-relaxed"
                            />
                            <div className="flex flex-wrap gap-1 mt-2">
                              {collabResult.hashtags?.map((tag: string, idx: number) => (
                                <span key={idx} className="text-[10px] text-[#00D4FF] font-semibold">{tag}</span>
                              ))}
                            </div>
                          </div>

                          {/* Visual Generation Prompt */}
                          <div className="premium-card p-5">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles size={13} className="text-[#00F5C2]" /> Image Generation prompt
                              </span>
                              <button
                                onClick={() => copyToClipboard(collabResult.visualPrompt, 'Visual prompt copied!')}
                                className="text-xs text-[#00D4FF] hover:text-[#00F5C2] transition-colors flex items-center gap-1.5"
                              >
                                <Copy size={13} /> Copy Prompt
                              </button>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                              "{collabResult.visualPrompt}"
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tool 7: Audience Avatar Profiler */}
                  {activeTool === 'avatar-profiler' && (
                    <div className="space-y-6">
                      {loading && (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                          <Loader2 className="animate-spin text-[#00F5C2]" size={36} />
                          <p className="text-sm text-[var(--text-tertiary)] font-medium">Profiling demographic markers and consumer behavior...</p>
                        </div>
                      )}

                      {!loading && avatarResult && (
                        <div className="space-y-6">
                          {/* Overview Block */}
                          <div className="premium-card p-5 bg-gradient-to-r from-fuchsia-600/10 to-purple-600/10 border-fuchsia-500/10">
                            <span className="text-[10px] font-black text-fuchsia-400 uppercase tracking-wider">Psychographic Alignment Profile</span>
                            <p className="text-sm text-white mt-1.5 font-bold">{avatarResult.overview?.psychographic}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/5">
                              <div>
                                <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Age Core</span>
                                <span className="text-xs font-bold text-white block mt-0.5">{avatarResult.overview?.ageRange}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Gender core</span>
                                <span className="text-xs font-bold text-white block mt-0.5">{avatarResult.overview?.topGender}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Primary Audience Desire</span>
                                <span className="text-xs font-bold text-fuchsia-400 block mt-0.5">{avatarResult.overview?.primaryDesire}</span>
                              </div>
                            </div>
                          </div>

                          {/* Avatars Tabs */}
                          <div>
                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-3">Fictional Follower Personas</span>
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                              {avatarResult.avatars?.map((av: any, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => setSelectedAvatarIdx(idx)}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                                    selectedAvatarIdx === idx 
                                      ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20'
                                      : 'bg-white/5 text-[var(--text-muted)] border border-transparent hover:text-white'
                                  }`}
                                >
                                  {av.name} ({av.age}, {av.location})
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Avatar Details */}
                          {avatarResult.avatars?.[selectedAvatarIdx] && (() => {
                            const av = avatarResult.avatars[selectedAvatarIdx];
                            return (
                              <div className="premium-card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-lg font-black text-white">{av.name}</h4>
                                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{av.occupation} • {av.location}</p>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Personality Traits</span>
                                    <p className="text-xs text-white font-semibold mt-1">{av.personality}</p>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Core Desires</span>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">{av.desires}</p>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Pain Points & Frustrations</span>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">{av.painPoints}</p>
                                  </div>
                                </div>

                                <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                                  <div>
                                    <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Why they follow {activePersona.name}</span>
                                    <p className="text-xs text-white font-medium mt-1 leading-relaxed">{av.whyTheyFollow}</p>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Scroll Stoppers (Engagement Triggers)</span>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{av.scrollStoppers}</p>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Dream content piece</span>
                                    <p className="text-xs text-fuchsia-400 font-bold mt-1 leading-relaxed">"{av.dreamContent}"</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Demographics & Posting Times */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="premium-card p-5">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-3">Best Posting Hours</span>
                              <div className="grid grid-cols-3 gap-2">
                                {avatarResult.contentInsights?.bestPostingTimes?.map((time: string, idx: number) => (
                                  <div key={idx} className="bg-white/5 border border-white/5 py-2 px-3 rounded-xl text-center text-xs text-white font-bold">
                                    {time}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="premium-card p-5">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-2">High Impact Angles</span>
                              <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                                {avatarResult.contentInsights?.topContentAngles?.map((ang: string, idx: number) => (
                                  <li key={idx} className="flex gap-2">
                                    <span className="text-fuchsia-400">✦</span>
                                    <span>{ang}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tool 8: Content Repurpose Studio */}
                  {activeTool === 'repurpose-studio' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">Input long-form content (blog post, newsletter, script draft)</label>
                        <textarea
                          rows={6}
                          value={longContent}
                          onChange={(e) => setLongContent(e.target.value)}
                          placeholder="Paste your long text content here (up to 3,000 characters)..."
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[#00D4FF]/30 focus:border-[#00D4FF]/50 outline-none transition-all text-[var(--text-primary)] text-sm"
                        />
                        <button
                          disabled={loading}
                          onClick={() => handleRunTool('repurpose-studio')}
                          className="premium-button flex items-center justify-center gap-2 py-3 px-6 text-sm ml-auto disabled:opacity-50"
                        >
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <Cpu size={16} />}
                          Repurpose Content
                        </button>
                      </div>

                      {repurposeResult && (
                        <div className="space-y-6 pt-4 border-t border-white/5">
                          {/* Repurpose Tabs */}
                          <div className="flex gap-1.5 border-b border-white/5 pb-2 overflow-x-auto scrollbar-hide">
                            {[
                              { id: 'carousel', label: 'Carousels' },
                              { id: 'hooks', label: 'TikTok Hooks' },
                              { id: 'tweets', label: 'X Thread' },
                              { id: 'shorts', label: 'YT Short' },
                              { id: 'email', label: 'Newsletter' },
                              { id: 'reel', label: 'Insta Reel' }
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => setRepurposeTab(tab.id as any)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                                  repurposeTab === tab.id
                                    ? 'bg-[#00F5C2]/15 text-[#00F5C2] border border-[#00F5C2]/30'
                                    : 'text-[var(--text-muted)] hover:text-white'
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* Tab Content Display */}
                          <div className="premium-card p-5">
                            {repurposeTab === 'carousel' && (
                              <div className="space-y-4">
                                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Instagram Carousel Slide Outlines</span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {repurposeResult.carouselSlides?.map((slide: any, idx: number) => (
                                    <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-xl relative">
                                      <span className="absolute top-3 right-3 text-xs font-black text-emerald-400">Slide {slide.slideNumber}</span>
                                      <h5 className="font-extrabold text-sm text-white pr-10">{slide.headline}</h5>
                                      <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{slide.body}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {repurposeTab === 'hooks' && (
                              <div className="space-y-4">
                                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Viral TikTok Hooks</span>
                                <div className="space-y-2">
                                  {repurposeResult.tiktokHooks?.map((hk: string, idx: number) => (
                                    <div key={idx} className="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                      <p className="text-xs font-bold text-white">"{hk}"</p>
                                      <button
                                        onClick={() => copyToClipboard(hk, 'Hook copied')}
                                        className="text-[#00D4FF] hover:text-[#00F5C2] p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                                      >
                                        <Copy size={13} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {repurposeTab === 'tweets' && (
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">X/Twitter Thread Outline</span>
                                  <button
                                    onClick={() => copyToClipboard(repurposeResult.tweetIdeas?.join('\n\n'))}
                                    className="flex items-center gap-1.5 text-xs text-[#00D4FF] hover:text-[#00F5C2] transition-colors"
                                  >
                                    <Copy size={13} /> Copy Thread
                                  </button>
                                </div>
                                <div className="space-y-2">
                                  {repurposeResult.tweetIdeas?.map((tweet: string, idx: number) => (
                                    <div key={idx} className="bg-white/5 p-3 rounded-xl border border-white/5 text-xs text-[var(--text-secondary)] leading-relaxed">
                                      {tweet}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {repurposeTab === 'shorts' && (
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Suggested Video Title</span>
                                    <h4 className="text-sm font-extrabold text-white mt-0.5">{repurposeResult.youtubeshort?.title}</h4>
                                  </div>
                                  <button
                                    onClick={() => copyToClipboard(repurposeResult.youtubeshort?.script)}
                                    className="flex items-center gap-1.5 text-xs text-[#00D4FF] hover:text-[#00F5C2] transition-colors"
                                  >
                                    <Copy size={13} /> Copy Script
                                  </button>
                                </div>
                                <textarea
                                  rows={6}
                                  readOnly
                                  value={repurposeResult.youtubeshort?.script}
                                  className="w-full bg-[var(--bg-input)] border border-white/5 rounded-xl py-3 px-4 outline-none text-[var(--text-secondary)] text-xs leading-relaxed"
                                />
                              </div>
                            )}

                            {repurposeTab === 'email' && (
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Email Newsletter Draft</span>
                                  <button
                                    onClick={() => copyToClipboard(repurposeResult.emailSnippet?.body)}
                                    className="flex items-center gap-1.5 text-xs text-[#00D4FF] hover:text-[#00F5C2] transition-colors"
                                  >
                                    <Copy size={13} /> Copy Email
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Subject Line</span>
                                    <span className="text-xs font-bold text-white block mt-0.5">{repurposeResult.emailSnippet?.subject}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Preview Text</span>
                                    <span className="text-[11px] text-[var(--text-secondary)] block mt-0.5">{repurposeResult.emailSnippet?.preview}</span>
                                  </div>
                                </div>
                                <textarea
                                  rows={6}
                                  readOnly
                                  value={repurposeResult.emailSnippet?.body}
                                  className="w-full bg-[var(--bg-input)] border border-white/5 rounded-xl py-3 px-4 outline-none text-[var(--text-secondary)] text-xs leading-relaxed"
                                />
                              </div>
                            )}

                            {repurposeTab === 'reel' && (
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Instagram Reel Hook</span>
                                    <p className="text-xs font-bold text-[#00F5C2] mt-0.5">"{repurposeResult.instagramReel?.hook}"</p>
                                  </div>
                                  <button
                                    onClick={() => copyToClipboard(repurposeResult.instagramReel?.script)}
                                    className="flex items-center gap-1.5 text-xs text-[#00D4FF] hover:text-[#00F5C2] transition-colors"
                                  >
                                    <Copy size={13} /> Copy Script
                                  </button>
                                </div>
                                <textarea
                                  rows={6}
                                  readOnly
                                  value={repurposeResult.instagramReel?.script}
                                  className="w-full bg-[var(--bg-input)] border border-white/5 rounded-xl py-3 px-4 outline-none text-[var(--text-secondary)] text-xs leading-relaxed"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tool 9: Dream Collab Picker */}
                  {activeTool === 'dream-collab' && (
                    <div className="space-y-6">
                      {loading && (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                          <Loader2 className="animate-spin text-[#00F5C2]" size={36} />
                          <p className="text-sm text-[var(--text-tertiary)] font-medium">Scanning alignment indicators with celebrities and top creators...</p>
                        </div>
                      )}

                      {!loading && dreamCollabResult.length > 0 && (
                        <div className="space-y-6">
                          <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Recommended partnerships & celebrities</span>
                          <div className="space-y-4">
                            {dreamCollabResult.map((collab: any, idx: number) => (
                              <div key={idx} className="premium-card p-5 space-y-4">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                  <div>
                                    <h4 className="text-base font-black text-white flex items-center gap-2">
                                      {collab.name}
                                      <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">{collab.category}</span>
                                    </h4>
                                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Format: {collab.contentFormat} • Impact: {collab.estimatedImpact}</p>
                                  </div>
                                  <button
                                    onClick={() => copyToClipboard(collab.dmPitch, 'DM Pitch copied!')}
                                    className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl text-xs text-white border border-white/5 transition-colors cursor-pointer"
                                  >
                                    <Copy size={13} /> Copy Pitch
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                                  <div>
                                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Brand Synergy</span>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{collab.synergy}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Content Partnership Concept</span>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{collab.collabConcept}</p>
                                  </div>
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                  <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold mb-1.5">DM Pitch Draft (in persona tone)</span>
                                  <p className="text-xs text-white italic leading-relaxed">"{collab.dmPitch}"</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tool 10: Comment Intelligence Dashboard */}
                  {activeTool === 'comment-intelligence' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">Paste audience comments (One comment per line)</label>
                        <textarea
                          rows={5}
                          value={commentsInput}
                          onChange={(e) => setCommentsInput(e.target.value)}
                          placeholder="Example:
You look incredible Isabella! Where did you get that dress?
This lifestyle feels so fake.
How often do you travel?
Love the aesthetics in this post."
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[#00D4FF]/30 focus:border-[#00D4FF]/50 outline-none transition-all text-[var(--text-primary)] text-sm"
                        />
                        <button
                          disabled={loading}
                          onClick={() => handleRunTool('comment-intelligence')}
                          className="premium-button flex items-center justify-center gap-2 py-3 px-6 text-sm ml-auto disabled:opacity-50"
                        >
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                          Analyze Comments
                        </button>
                      </div>

                      {commentsResult && (
                        <div className="space-y-6 pt-4 border-t border-white/5">
                          {/* Sentiment Donuts & Score */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="premium-card p-5 flex flex-col items-center justify-center text-center">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Overall Sentiment</span>
                              <div className="text-4xl font-black text-white mt-4">{commentsResult.overallSentimentScore}%</div>
                              <span className="text-xs text-[#00F5C2] mt-1 font-bold">Positive/Hype Index</span>
                              <span className="text-[10px] text-[var(--text-muted)] mt-2">Analyzed {commentsResult.totalAnalyzed} comments</span>
                            </div>

                            <div className="md:col-span-2 premium-card p-5 space-y-3">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block">Sentiment Distribution Ratio</span>
                              <div className="space-y-2">
                                {[
                                  { label: 'Love & Appreciation', pct: commentsResult.sentiment?.love, color: 'bg-pink-400' },
                                  { label: 'Hype / Engagement', pct: commentsResult.sentiment?.hype, color: 'bg-emerald-400' },
                                  { label: 'Inquiries & Questions', pct: commentsResult.sentiment?.question, color: 'bg-[#00D4FF]' },
                                  { label: 'Criticisms & Skepticism', pct: commentsResult.sentiment?.criticism, color: 'bg-amber-400' },
                                  { label: 'Trolls & Negative', pct: commentsResult.sentiment?.troll, color: 'bg-red-400' },
                                  { label: 'Spam & Links', pct: commentsResult.sentiment?.spam, color: 'bg-slate-500' }
                                ].map((item, idx) => (
                                  <div key={idx} className="space-y-0.5">
                                    <div className="flex justify-between text-[10px] font-semibold text-[var(--text-secondary)]">
                                      <span>{item.label}</span>
                                      <span>{item.pct}%</span>
                                    </div>
                                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                      <div className={`${item.color} h-full rounded-full`} style={{ width: `${item.pct}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* High Priority Response Actions */}
                          <div>
                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-3">High Priority Engagement Actions</span>
                            <div className="space-y-4">
                              {commentsResult.topComments?.map((tc: any, idx: number) => (
                                <div key={idx} className="premium-card p-4 space-y-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="text-[10px] font-bold text-violet-400 bg-violet-400/5 border border-violet-500/10 px-2 py-0.5 rounded">{tc.category}</span>
                                      <p className="text-xs font-bold text-white mt-1.5">"{tc.comment}"</p>
                                    </div>
                                    <button
                                      onClick={() => copyToClipboard(tc.reply, 'Reply copied')}
                                      className="text-xs text-[#00D4FF] hover:text-[#00F5C2] flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Copy size={12} /> Copy Reply
                                    </button>
                                  </div>
                                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Suggested Response (in persona tone)</span>
                                    <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed mt-0.5">"{tc.reply}"</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Content Ideas & Insights */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="premium-card p-5">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-3">Suggested Content Topics from Comments</span>
                              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                                {commentsResult.contentIdeas?.map((idea: string, idx: number) => (
                                  <li key={idx} className="flex gap-2">
                                    <span className="text-[#00F5C2]">✦</span>
                                    <span>{idea}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="premium-card p-5">
                              <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider block mb-3">Emerging Insights & Warnings</span>
                              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                                {commentsResult.insights?.map((ins: string, idx: number) => (
                                  <li key={idx} className="flex gap-2">
                                    <span className="text-violet-400">⚡︎</span>
                                    <span>{ins}</span>
                                  </li>
                                ))}
                                {commentsResult.warning && (
                                  <li className="flex gap-2 text-red-400 font-semibold bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                    <span>{commentsResult.warning}</span>
                                  </li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
