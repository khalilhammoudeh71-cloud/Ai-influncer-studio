import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { 
  Users, 
  Search,
  Calendar, 
  PlusCircle, 
  MessageSquare, 
  MessageCircle,
  Settings,
  Mic,
  Wrench,
  Sparkles,
  ChevronDown,
  Bell,
  Cpu,
  Palette,
  Check
} from 'lucide-react';
import { cn } from './utils/cn';
import { Persona, RevenueEntry, PlannedPost, Tab, NavEntry } from './types';
import BackButton from './components/BackButton';
import { api } from './services/apiService';
import PersonasView from './views/PersonasView';
import PlannerView from './views/PlannerView';
import CreateView from './views/CreateView';
import AssistantView from './views/AssistantView';
import SettingsView from './views/SettingsView';
import GalleryView from './views/GalleryView';
import LandingView from './views/LandingView';
import PersonaBuilderView from './views/PersonaBuilderView';
import CreatorHubView from './views/CreatorHubView';
import RevenueView from './views/RevenueView';
import AgentView from './views/AgentView';
import OnboardingTour from './components/OnboardingTour';
import CommandPalette from './components/CommandPalette';
import LeftSidebar from './components/LeftSidebar';
import TrendView from './views/TrendView';


const EMPTY_PERSONA: Persona = {
  id: 'empty',
  name: '',
  niche: '',
  tone: '',
  platform: '',
  status: 'Draft',
  avatar: '',
  personalityTraits: [],
  visualStyle: '',
  audienceType: '',
  contentBoundaries: '',
  bio: '',
  brandVoiceRules: '',
  contentGoals: '',
  personaNotes: '',
};

import { supabase } from './lib/supabase';
import toast from 'react-hot-toast';

function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [forceLanding, setForceLanding] = useState(localStorage.getItem('force_landing') === 'true');

  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [newAssetsCount, setNewAssetsCount] = useState(0); // #6 gallery badge

  // Listen to Supabase authentication state
  useEffect(() => {
    // Automatically bypass authentication in local development mode
    if (import.meta.env.DEV && !forceLanding) {
      setUser({
        id: 'mock-user-id',
        email: 'khalilhammoudeh71@gmail.com',
        email_confirmed_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString()
      });
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch billing & credits when user changes
  useEffect(() => {
    if (user && (user.email_confirmed_at || user.confirmed_at)) {
      api.billing.get()
        .then(setBillingInfo)
        .catch(err => console.error('Failed to load billing info:', err));
    } else {
      setBillingInfo(null);
    }
  }, [user]);

  // Check Stripe Checkout parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_checkout') === 'success') {
      toast.success('Payment successful! Your account is updated.', { id: 'stripe-success' });
      window.history.replaceState({}, document.title, window.location.pathname);
      if (user) {
        api.billing.get().then(setBillingInfo).catch(() => {});
      }
    } else if (params.get('stripe_checkout') === 'cancel') {
      toast.error('Payment cancelled.', { id: 'stripe-cancel' });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // ⌘K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      if (e.key === '?' && !['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement).tagName)) {
        setShowShortcutsModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // 🎨 Multi-Theme Engine State
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    return localStorage.getItem('ai_studio_theme') || 'gold';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('ai_studio_theme', activeTheme);
  }, [activeTheme]);

  const THEMES = [
    { id: 'gold', name: 'Midnight Gold', desc: 'Obsidian & Gold (Executive)', dot: 'bg-amber-400' },
    { id: 'emerald', name: 'Slate Emerald', desc: 'Slate & Mint Emerald (Pro)', dot: 'bg-emerald-400' },
    { id: 'rosegold', name: 'Rose Gold Velvet', desc: 'Rose Gold & Fashion Pink', dot: 'bg-rose-400' },
    { id: 'cyber', name: 'Electric Cyber', desc: 'Neon Cyan & Magenta', dot: 'bg-cyan-400' },
    { id: 'violet', name: 'Imperial Violet', desc: 'Royal Purple & Indigo', dot: 'bg-purple-400' },
    { id: 'mint', name: 'Matrix Mint', desc: 'Dark Teal & Matrix Green', dot: 'bg-teal-400' },
  ];
  
  const [navStack, setNavStack] = useState<NavEntry[]>(() => {
    const saved = localStorage.getItem('ai_influencer_nav_stack');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    const savedTab = localStorage.getItem('ai_influencer_active_tab') as Tab;
    return [{ view: savedTab || 'personas' }];
  });

  const currentNav = navStack[navStack.length - 1];
  const activeTab = (currentNav.view === 'persona-builder' ? 'personas' : currentNav.view) as Tab;

  // Clear gallery badge when visiting gallery
  useEffect(() => {
    if (currentNav.view === 'gallery') {
      setNewAssetsCount(0);
    }
  }, [currentNav?.view]);

  const pushView = useCallback((entry: NavEntry) => {
    setNavStack(prev => {
      const next = [...prev, entry];
      localStorage.setItem('ai_influencer_nav_stack', JSON.stringify(next));
      return next;
    });
  }, []);

  const popView = useCallback(() => {
    setNavStack(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      localStorage.setItem('ai_influencer_nav_stack', JSON.stringify(next));
      return next;
    });
  }, []);

  const replaceView = useCallback((entry: NavEntry) => {
    setNavStack([entry]);
    localStorage.setItem('ai_influencer_nav_stack', JSON.stringify([entry]));
  }, []);

  const [personas, setPersonasLocal] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(() => {
    const saved = localStorage.getItem('ai_influencer_selected_id');
    const legacySelected = localStorage.getItem('selected_persona_id');
    const id = saved || legacySelected;
    return (id && (id.startsWith('user-') || id === 'empty')) ? id : 'empty';
  });

  const hasMigrated = useRef(false);
  const prevTabRef = useRef<Tab>('personas');
  const tabDirectionRef = useRef<'right' | 'left'>('right');
  const recentPersonaIds = useRef<string[]>(
    (() => { try { return JSON.parse(localStorage.getItem('recent_persona_ids') || '[]') as string[]; } catch { return []; } })()
  );


  // Track recently used persona
  const trackPersonaUse = (id: string) => {
    const list = [id, ...recentPersonaIds.current.filter((x: string) => x !== id)].slice(0, 10);
    recentPersonaIds.current = list;
    localStorage.setItem('recent_persona_ids', JSON.stringify(list));
  };

  const loadPersonas = useCallback(async () => {
    try {
      const data = await api.personas.list();
      setPersonasLocal(data);
      return data;
    } catch (err) {
      console.error('[API] Failed to load personas:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    async function init() {
      if (!user) return;
      try {
        setIsLoading(true);
        let serverPersonas = await loadPersonas();

        if (!hasMigrated.current && !localStorage.getItem('ai_influencer_db_migrated')) {
          hasMigrated.current = true;

          const localPersonas = getLocalStoragePersonas();
          const localRevenue = getLocalStorageRevenue(localPersonas);
          const localPlans = getLocalStoragePlans(localPersonas);

          if (localPersonas.length > 0) {
            console.log(`[Migration] Migrating ${localPersonas.length} personas to server...`);
            try {
              await api.migrate({ personas: localPersonas, revenueEntries: localRevenue, plannedPosts: localPlans });
              serverPersonas = await loadPersonas();
              localStorage.setItem('ai_influencer_db_migrated', 'true');
              console.log('[Migration] Complete');
            } catch (err) {
              console.error('[Migration] Failed, will retry on next load:', err);
            }
          } else {
            localStorage.setItem('ai_influencer_db_migrated', 'true');
          }
        }
      } catch (err) {
        console.error('[App Init] Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [loadPersonas, user]);

  const setPersonas = useCallback(async (value: Persona[] | ((prev: Persona[]) => Persona[])) => {
    const oldPersonas = personas;
    const newPersonas = typeof value === 'function' ? value(oldPersonas) : value;
    setPersonasLocal(newPersonas);

    const oldIds = new Set(oldPersonas.map(p => p.id));
    const newIds = new Set(newPersonas.map(p => p.id));

    const added = newPersonas.filter(p => !oldIds.has(p.id));
    const removed = oldPersonas.filter(p => !newIds.has(p.id));
    const updated = newPersonas.filter(p => {
      if (!oldIds.has(p.id)) return false;
      const old = oldPersonas.find(o => o.id === p.id);
      return old && JSON.stringify(old) !== JSON.stringify(p);
    });

    try {
      await Promise.all([
        ...added.map(p => api.personas.create(p)),
        ...removed.map(p => api.personas.delete(p.id)),
        ...updated.map(p => api.personas.update(p)),
      ]);
    } catch (err) {
      console.error('[API] Sync error:', err);
    }
  }, [personas]);

  useEffect(() => {
    if (selectedPersonaId && selectedPersonaId !== 'empty' && personas.length > 0 && !personas.find(p => p.id === selectedPersonaId)) {
      setSelectedPersonaId(personas[0]?.id || 'empty');
    }
  }, [personas, selectedPersonaId]);

  useEffect(() => {
    localStorage.setItem('ai_influencer_selected_id', selectedPersonaId);
  }, [selectedPersonaId]);

  useEffect(() => {
    localStorage.setItem('ai_influencer_active_tab', activeTab);
  }, [activeTab]);

  const [showTour, setShowTour] = useState(false);

  const handleTourComplete = () => {
    localStorage.setItem('ai_influencer_tour_complete', 'true');
    setShowTour(false);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-5"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)', boxShadow: '0 8px 40px -8px rgba(139,92,246,0.6)' }}
            >
              <Sparkles size={28} className="text-white" />
            </div>
            <div className="absolute -inset-1 rounded-2xl border border-violet-500/20 animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[var(--text-primary)] text-sm font-semibold">Loading your studio</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user || forceLanding) {
    return <LandingView onGetStarted={() => { localStorage.removeItem('force_landing'); setForceLanding(false); }} />;
  }

  // Email verification gate
  const isConfirmed = !!user.email_confirmed_at || !!user.confirmed_at;
  if (!isConfirmed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#06080d] text-white p-6 relative">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-violet-600/[0.08] blur-[150px]" />
        </div>
        <div className="premium-card max-w-md w-full rounded-3xl p-8 border border-white/10 bg-[#0B0F17]/80 backdrop-blur-xl relative z-10 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-violet-500/10 border border-violet-500/20 text-violet-400 mb-6 animate-pulse">
            <Bell size={28} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Verify your email</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
            We sent a verification link to <span className="text-white font-bold">{user.email}</span>. Please verify your email address to unlock the studio.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                supabase.auth.refreshSession().then(({ data: { session } }) => {
                  if (session?.user?.email_confirmed_at) {
                    setUser(session.user);
                    toast.success('Email verified successfully!');
                  } else {
                    toast.error('Email not verified yet. Please check your inbox.');
                  }
                });
              }}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full text-white font-bold text-sm hover:brightness-110 active:scale-98 transition-all shadow-lg shadow-violet-500/20 cursor-pointer"
            >
              I Have Verified My Email
            </button>
            <button
              onClick={async () => {
                const { error } = await supabase.auth.resend({
                  type: 'signup',
                  email: user.email,
                });
                if (error) {
                  toast.error(error.message);
                } else {
                  toast.success('Verification email resent!');
                }
              }}
              className="w-full py-3 bg-white/5 border border-white/10 rounded-full text-white font-semibold text-sm hover:bg-white/10 transition-all cursor-pointer"
            >
              Resend Verification Link
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full py-3 bg-transparent text-white/50 text-xs font-semibold hover:text-white transition-colors mt-2 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showTour) {
    return <OnboardingTour onComplete={handleTourComplete} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-5"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)', boxShadow: '0 8px 40px -8px rgba(139,92,246,0.6)' }}
            >
              <Sparkles size={28} className="text-white" />
            </div>
            <div className="absolute -inset-1 rounded-2xl border border-violet-500/20 animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[var(--text-primary)] text-sm font-semibold">Loading your studio</p>
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400/60 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const activePersona = personas.find(p => p.id === selectedPersonaId) || EMPTY_PERSONA;
  const hasPersonas = personas.length > 0 && personas[0].id !== 'empty';

  const tabs = [
    { id: 'personas', label: 'Personas', icon: Users },
    { id: 'create', label: 'AI Studio', icon: PlusCircle },
    { id: 'intelligence', label: 'AI Toolbox', icon: Wrench },
    { id: 'planner', label: 'Planner', icon: Calendar },
    { id: 'gallery', label: 'Gallery', icon: Sparkles },
    { id: 'assistant', label: 'Assistant', icon: MessageSquare },
    { id: 'agent', label: 'Auto-Pilot', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getTabDirection = (from: Tab, to: Tab) => {
    const fromIdx = tabs.findIndex(t => t.id === from);
    const toIdx = tabs.findIndex(t => t.id === to);
    const dir = toIdx > fromIdx ? 'right' : 'left';
    tabDirectionRef.current = dir;
    return dir;
  };

  const navActions = { push: pushView, pop: popView, replace: replaceView };

  // Clear gallery badge when visiting gallery
  const renderContent = () => {
    const view = currentNav.view;
    const subView = currentNav.subView;
    const params = currentNav.params;

    if (view === 'persona-builder') {
      const personaId = params?.persona?.id;
      const livePersona = personas.find(p => p.id === personaId) || params?.persona || {};
      return (
        <PersonaBuilderView 
          persona={livePersona}
          onChange={() => {}}
          onSave={(finalPersona) => {
            if (params?.onSave) params.onSave(finalPersona);
            popView();
          }}
          onCancel={popView}
        />
      );
    }

    switch (view) {
      case 'personas': return <PersonasView personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} selectedId={selectedPersonaId} navigateToTab={(t) => replaceView({ view: t })} nav={navActions} billingInfo={billingInfo} />;
      case 'create': return <CreateView persona={activePersona} personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} subView={subView} nav={navActions} billingInfo={billingInfo} />;
      case 'gallery': return <GalleryView personas={personas} activePersona={activePersona} nav={navActions} onPersonasChange={setPersonas} />;
      case 'intelligence': return <CreatorHubView persona={activePersona} personas={personas} nav={navActions} initialTool={params?.initialTool} billingInfo={billingInfo} />;
      case 'planner': return <PlannerView persona={activePersona} personas={personas} onSelectPersona={setSelectedPersonaId} nav={navActions} />;
      case 'assistant': return <AssistantView persona={activePersona} personas={personas} nav={navActions} />;
      case 'agent': return <AgentView personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} nav={navActions} />;
      case 'revenue': return <RevenueView persona={activePersona} />;
      case 'trends': return <TrendView persona={activePersona} nav={navActions} />;
      case 'settings': return (
        <SettingsView 
          nav={navActions} 
          personas={personas} 
          user={user} 
          billingInfo={billingInfo} 
          onBillingUpdate={() => {
            api.billing.get().then(setBillingInfo).catch(() => {});
          }} 
        />
      );
      default: return <PersonasView personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} selectedId={selectedPersonaId} navigateToTab={(t) => replaceView({ view: t })} nav={navActions} />;
    }
  };

  if (window.location.pathname === '/persona/builder' || window.location.pathname.includes('/persona/builder')) {
    const BuilderWrapper = () => {
      const [p, setP] = useState<Persona>(() => ({
        id: `user-${Date.now()}`,
        name: 'Isabella Laurent',
        niche: 'Luxury Lifestyle',
        tone: 'Luxury, Confident, Exclusive, Aspirational, High-status, Sophisticated',
        platform: 'Instagram',
        status: 'Draft',
        avatar: '',
        personalityTraits: ['Elite', 'Exclusive', 'High-status'],
        visualStyle: 'Sophisticated & Modern',
        audienceType: 'General',
        contentBoundaries: '',
        bio: 'Elite, sophisticated, and influential. Embodies success, refinement, and aspirational living.',
        brandVoiceRules: '',
        contentGoals: '',
        personaNotes: ''
      }));

      const handleSaveNewPersona = async () => {
        const updated = [...personas, p];
        setPersonasLocal(updated);
        setSelectedPersonaId(p.id);
        try {
          await api.personas.create(p);
        } catch (err) {
          console.error('[API] Failed to create persona in builder:', err);
        }
        window.location.pathname = '/';
      };

      return (
        <PersonaBuilderView 
          persona={p}
          onChange={setP}
          onSave={handleSaveNewPersona}
          onCancel={() => { window.location.pathname = '/'; }}
        />
      );
    };

    try {
      return <BuilderWrapper />;
    } catch (err) {
      return (
        <div className="min-h-screen bg-[#0B0F17] text-white p-8 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-4">PERSONA BUILDER ROUTE IS WORKING</h1>
          <p className="text-red-400 mb-2">Error rendering component:</p>
          <pre className="p-4 bg-black/50 border border-red-500/30 rounded-xl text-xs max-w-lg overflow-auto">
            {err instanceof Error ? err.stack : String(err)}
          </pre>
        </div>
      );
    }
  }


  return (
    <div className="flex h-screen w-screen bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden">
      {/* Left Sidebar Navigation */}
      <LeftSidebar 
        activeTab={activeTab} 
        onNavigate={(tab, params) => {
          getTabDirection(activeTab, tab);
          if (tab !== activeTab) {
            prevTabRef.current = activeTab;
          }
          const { subView, ...restParams } = params || {};
          replaceView({ 
            view: tab, 
            subView: subView,
            params: Object.keys(restParams).length > 0 ? restParams : undefined
          });
        }}
        activePersona={activePersona}
        newAssetsCount={newAssetsCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="ambient-glow top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-500/[0.04] blur-[100px] rounded-full pointer-events-none" />

      {/* ── Top app bar ─────────────────────────────────────────── */}
      <header className="flex-none bg-[#0B0F17]/90 backdrop-blur-xl border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between px-6 py-2">
          
          {/* Back Button & Logo */}
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {(navStack.length > 1 || activeTab !== 'personas') && (
                <BackButton 
                  onClick={() => {
                    if (navStack.length > 1) {
                      popView();
                    } else {
                      replaceView({ view: prevTabRef.current || 'personas' });
                    }
                  }} 
                  className="mr-2" 
                />
              )}
            </AnimatePresence>
            <div className="w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #00F5C2 0%, #00D4FF 100%)', boxShadow: '0 0 16px rgba(0, 245, 194, 0.4)' }}>
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-transparent border-b-[#0B0F17]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[14px] font-extrabold tracking-widest text-white uppercase">AI Influencer</span>
              <span className="text-[10px] font-semibold text-[#00D4FF] tracking-[0.2em] uppercase">Studio</span>
            </div>
          </div>

          {/* Search Bar — opens Command Palette */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8 relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <button 
              onClick={() => setShowCommandPalette(true)}
              className="w-full bg-[#111827] border border-[#334155] rounded-full py-1.5 pl-11 pr-12 text-sm text-left text-[var(--text-muted)] hover:border-[#00D4FF] focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-all cursor-pointer"
            >
              Search personas, tools or actions...
            </button>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <kbd className="text-[10px] font-bold text-[var(--text-muted)] bg-white/5 border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
            </div>
          </div>

          {/* Right Actions */}
          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* 🎨 Theme Selector Dropdown */}
            <div className="relative group">
              <button
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer text-xs font-bold text-white shadow-sm"
                onClick={() => {
                  const el = document.getElementById('theme-switcher-dropdown');
                  if (el) el.classList.toggle('hidden');
                }}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${THEMES.find(t => t.id === activeTheme)?.dot || 'bg-amber-400'} shadow-sm`} />
                <span className="hidden md:inline font-extrabold tracking-wide text-[11px]">
                  {THEMES.find(t => t.id === activeTheme)?.name}
                </span>
                <Palette size={13} className="text-zinc-400" />
              </button>

              <div id="theme-switcher-dropdown" className="hidden absolute right-0 top-full mt-2 w-56 bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-xl p-2 z-[100] space-y-1">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-2.5 py-1 border-b border-white/5 flex items-center justify-between">
                  <span>Theme Palette</span>
                  <span className="text-[8px] text-amber-400 font-extrabold">6 Presets</span>
                </p>
                <div className="space-y-1 pt-1">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setActiveTheme(theme.id);
                        document.getElementById('theme-switcher-dropdown')?.classList.add('hidden');
                        toast.success(`Switched theme to ${theme.name}!`);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all ${
                        activeTheme === theme.id
                          ? 'bg-white/10 border border-white/20 font-bold text-white shadow'
                          : 'hover:bg-white/5 border border-transparent text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${theme.dot} shrink-0 shadow-sm`} />
                        <div>
                          <p className="text-xs font-extrabold leading-tight">{theme.name}</p>
                          <p className="text-[9px] text-zinc-400 leading-tight">{theme.desc}</p>
                        </div>
                      </div>
                      {activeTheme === theme.id && (
                        <Check size={14} className="text-amber-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => pushView({ view: 'create' })}
              className="hidden sm:flex items-center gap-2 bg-transparent border border-[#00D4FF]/40 px-5 py-1.5 rounded-full text-sm font-bold text-white hover:bg-[#00D4FF]/10 transition-all shadow-[0_0_16px_rgba(0,212,255,0.15)] hover:shadow-[0_0_24px_rgba(0,212,255,0.3)]"
            >
              <PlusCircle size={16} className="text-[#00F5C2]" /> Create
            </button>

            {/* Persona Quick-Switcher */}
            <div className="relative group">
              {hasPersonas ? (
                <>
                  <button
                    className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#111827]/60 border border-[#334155]/60 hover:border-[#00D4FF]/40 transition-all cursor-pointer"
                    onClick={() => {
                      const el = document.getElementById('persona-switcher-dropdown');
                      if (el) el.classList.toggle('hidden');
                    }}
                  >
                    <div className={`w-6 h-6 rounded-lg overflow-hidden border border-[#334155] shrink-0 ${activePersona.id !== 'empty' ? 'avatar-ring-active' : ''}`}>
                      {activePersona.id !== 'empty' && (activePersona.avatar || activePersona.referenceImage) ? (
                        <img
                          src={activePersona.avatar || activePersona.referenceImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#1e293b] flex items-center justify-center text-[#64748b]">
                          <Users size={12} />
                        </div>
                      )}
                    </div>
                    <div className="hidden sm:block text-left max-w-[100px]">
                      <p className="text-[10px] font-black text-[#00D4FF] uppercase tracking-widest leading-none">Active</p>
                      <p className="text-[11px] font-bold text-white truncate leading-tight">
                        {activePersona.id === 'empty' ? 'No Persona' : activePersona.name}
                      </p>
                    </div>
                    <ChevronDown size={12} className="text-[#64748B] hidden sm:block" />
                  </button>
                  {/* Dropdown */}
                  <div id="persona-switcher-dropdown" className="hidden absolute right-0 top-full mt-2 w-64 bg-[#111827]/95 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 backdrop-blur-xl overflow-hidden z-[100]">
                    <div className="p-2 border-b border-white/5">
                      <p className="text-[9px] font-black text-[#475569] uppercase tracking-[0.15em] px-2 py-1">Switch Persona</p>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto p-1.5 space-y-1">
                      {/* No Persona Selection */}
                      <button
                        onClick={() => {
                          setSelectedPersonaId('empty');
                          document.getElementById('persona-switcher-dropdown')?.classList.add('hidden');
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all ${
                          selectedPersonaId === 'empty'
                            ? 'bg-[#00D4FF]/10 border border-[#00D4FF]/20'
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#334155] shrink-0 flex items-center justify-center bg-[#1e293b] text-[#64748b]">
                          <Users size={16} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className={`text-xs font-bold truncate ${selectedPersonaId === 'empty' ? 'text-white' : 'text-[#CBD5E1]'}`}>No Persona</p>
                          <p className="text-[9px] text-[#64748B] truncate">General Mode (Default)</p>
                        </div>
                        {selectedPersonaId === 'empty' && (
                          <div className="w-2 h-2 rounded-full bg-[#00F5C2] shrink-0 shadow-[0_0_6px_rgba(0,245,194,0.5)]" />
                        )}
                      </button>

                      {/* Recently-used sort */}
                      {[...personas].sort((a, b) => {
                        const ri = recentPersonaIds.current;
                        const ai = ri.indexOf(a.id), bi = ri.indexOf(b.id);
                        if (ai === -1 && bi === -1) return 0;
                        if (ai === -1) return 1;
                        if (bi === -1) return -1;
                        return ai - bi;
                      }).map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedPersonaId(p.id);
                            trackPersonaUse(p.id);
                            document.getElementById('persona-switcher-dropdown')?.classList.add('hidden');
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all ${
                            p.id === selectedPersonaId
                              ? 'bg-[#00D4FF]/10 border border-[#00D4FF]/20'
                              : 'hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#334155] shrink-0">
                            {p.avatar || p.referenceImage ? (
                              <img
                                src={p.avatar || p.referenceImage}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-[#1e293b] flex items-center justify-center text-[#64748b]">
                                <Users size={16} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className={`text-xs font-bold truncate ${p.id === selectedPersonaId ? 'text-white' : 'text-[#CBD5E1]'}`}>{p.name}</p>
                            <p className="text-[9px] text-[#64748B] truncate">{p.niche || 'Digital Creator'}</p>
                          </div>
                          {p.id === selectedPersonaId && (
                            <div className="w-2 h-2 rounded-full bg-[#00F5C2] shrink-0 shadow-[0_0_6px_rgba(0,245,194,0.5)]" />
                          )}
                        </button>
                      ))}
                    </div>
                    {/* Create New Persona Button */}
                    <div className="p-1.5 border-t border-white/5 bg-[#111827]/40">
                      <button
                        onClick={() => {
                          document.getElementById('persona-switcher-dropdown')?.classList.add('hidden');
                          pushView({
                            view: 'persona-builder',
                            params: {
                              persona: {
                                id: `user-${Date.now()}`,
                                name: 'New Persona',
                                niche: 'Luxury Lifestyle',
                                tone: 'Luxury, Confident, Exclusive',
                                platform: 'Instagram',
                                status: 'Draft',
                                avatar: '',
                                personalityTraits: [],
                                visualStyle: 'Sophisticated & Modern',
                                audienceType: 'General',
                                contentBoundaries: '',
                                bio: '',
                                brandVoiceRules: '',
                                contentGoals: '',
                                personaNotes: ''
                              },
                              onSave: (updated: Persona) => {
                                setPersonas([...personas, updated]);
                              }
                            }
                          });
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-600/15 border border-violet-500/20 text-violet-300 hover:bg-violet-600/25 hover:text-white transition-all text-xs font-bold cursor-pointer"
                      >
                        <PlusCircle size={14} className="text-[#00F5C2]" />
                        Create New Persona
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => replaceView({ view: 'personas' })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 hover:border-violet-400/50 transition-all cursor-pointer"
                >
                  <PlusCircle size={14} className="text-violet-400" />
                  <span className="text-[11px] font-bold text-violet-300 hidden sm:inline">Create Persona</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* ── Breadcrumb (nested views only) ───────────────────── */}
      {(navStack.length > 1 || currentNav.subView) && (() => {
        // Deduplicate consecutive entries with the same view for cleaner breadcrumbs
        const deduped = navStack.filter((entry, i, arr) => i === 0 || entry.view !== arr[i - 1].view);
        return (
        <div className="flex-none px-6 py-1.5 bg-[#0B0F17]/60 border-b border-[var(--border-subtle)] backdrop-blur-sm flex items-center gap-1.5 text-[10px] font-bold overflow-x-auto scrollbar-hide">
          {deduped.map((entry, i) => {
            const viewLabels: Record<string, string> = {
              'personas': 'Personas', 'create': 'Create', 'gallery': 'Gallery',
              'assistant': 'Assistant', 'settings': 'Settings', 'persona-builder': 'Persona Builder',
              'trends': 'Trend Radar',
            };
            const subViewLabels: Record<string, string> = {
              'ai-tools': 'AI Tools', 'planner': 'Content Planner', 'voice': 'Voice Studio',
              'visual-generator': 'Visual Studio', 'content': 'Content Writer',
              'stitcher': 'Video Editor',
            };
            const isLast = i === deduped.length - 1;
            return (
              <span key={i} className="flex items-center gap-1.5 shrink-0">
                {i > 0 && <span className="text-[#334155]">/</span>}
                <button
                  onClick={() => {
                    if (!isLast) {
                      // Find original index in navStack for this deduped entry
                      const origIdx = navStack.indexOf(entry);
                      for (let j = 0; j < navStack.length - origIdx - 1; j++) popView();
                    }
                  }}
                  className={`uppercase tracking-[0.12em] transition-colors ${
                    isLast ? 'text-[#00D4FF]' : 'text-[#64748B] hover:text-white cursor-pointer'
                  }`}
                >
                  {viewLabels[entry.view] || entry.view}
                </button>
                {isLast && entry.subView && (
                  <>
                    <span className="text-[#334155]">/</span>
                    <span className="text-[#00F5C2] uppercase tracking-[0.12em]">
                      {subViewLabels[entry.subView] || entry.subView}
                    </span>
                  </>
                )}
              </span>
            );
          })}
        </div>
        );
      })()}

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className={`w-full h-full ${tabDirectionRef.current === 'right' ? 'tab-enter-right' : 'tab-enter-left'}`} key={activeTab}>
          {renderContent()}
        </div>
      </main>
    </div>
    <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1a103c', color: '#fff', border: '1px solid rgba(139, 92, 246, 0.3)' } }} />
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        personas={personas}
        onNavigate={(tab) => { replaceView({ view: tab }); }}
        onSelectPersona={setSelectedPersonaId}
        onOpenSubView={(tab, subView) => { replaceView({ view: tab, subView }); }}
      />
      {/* #10 Keyboard shortcuts modal */}
      <AnimatePresence>
        {showShortcutsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowShortcutsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0B0F17] border border-[rgba(56,189,248,0.15)] rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
                  <p className="text-xs text-[#64748B]">Press <span className="kbd-key">?</span> to toggle</p>
                </div>
                <button onClick={() => setShowShortcutsModal(false)} className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-colors">
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>
              <div className="space-y-1">
                {[
                  { keys: ['⌘', 'K'], label: 'Open Command Palette' },
                  { keys: ['?'], label: 'Show Keyboard Shortcuts' },
                  { keys: ['Esc'], label: 'Close modal / Go back' },
                  { keys: ['↑', '↓'], label: 'Navigate list items' },
                  { keys: ['Enter'], label: 'Confirm / Submit' },
                  { keys: ['⌘', 'Enter'], label: 'Send message in chat' },
                ].map(({ keys, label }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                    <span className="text-sm text-[#CBD5E1]">{label}</span>
                    <div className="flex items-center gap-1">
                      {keys.map((k, i) => <span key={i} className="kbd-key">{k}</span>)}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#475569] text-center mt-4">More shortcuts coming soon ✦</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

  );
}

function getLocalStoragePersonas(): Persona[] {
  const keys = [
    'ai_influencer_personas',
    'ai-influencer-studio-personas',
    'personas_data',
    'studio_personas'
  ];

  for (const key of keys) {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: any) => ({
            name: '',
            niche: '',
            tone: 'Photorealistic',
            platform: '',
            status: 'Draft',
            avatar: '',
            visualStyle: 'Realistic, highly detailed',
            audienceType: '',
            contentBoundaries: '',
            bio: '',
            brandVoiceRules: '',
            contentGoals: '',
            personaNotes: '',
            ...p,
            id: p.id && typeof p.id === 'string' && p.id.startsWith('user-') ? p.id : `user-${p.id || Date.now() + Math.random()}`,
            personalityTraits: Array.isArray(p.personalityTraits) ? p.personalityTraits : [],
            visualLibrary: Array.isArray(p.visualLibrary) ? p.visualLibrary : []
          }));
        }
      } catch {
        continue;
      }
    }
  }
  return [];
}

function getLocalStorageRevenue(personaList: Persona[]): Record<string, RevenueEntry[]> {
  const result: Record<string, RevenueEntry[]> = {};
  for (const p of personaList) {
    const saved = localStorage.getItem(`revenue_entries_${p.id}`);
    if (saved) {
      try {
        const entries = JSON.parse(saved);
        if (Array.isArray(entries) && entries.length > 0) {
          result[p.id] = entries;
        }
      } catch {
        continue;
      }
    }
  }
  return result;
}

function getLocalStoragePlans(personaList: Persona[]): Record<string, Record<string, PlannedPost[]>> {
  const result: Record<string, Record<string, PlannedPost[]>> = {};
  const platforms = ['Instagram', 'TikTok', 'YouTube', 'Twitter', 'LinkedIn'];
  for (const p of personaList) {
    for (const platform of platforms) {
      const keys = [
        `planned_posts_${p.id}_${platform}`,
        `content_plan_${p.id}_${platform}`,
      ];
      for (const key of keys) {
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const posts = JSON.parse(saved);
            if (Array.isArray(posts) && posts.length > 0) {
              if (!result[p.id]) result[p.id] = {};
              result[p.id][platform] = posts;
              break;
            }
          } catch {
            continue;
          }
        }
      }
    }
  }
  return result;
}

export default App;
