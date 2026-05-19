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
  ChevronDown
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
import OnboardingTour from './components/OnboardingTour';
import CommandPalette from './components/CommandPalette';


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

function App() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const saved = localStorage.getItem('ai_influencer_onboarding_complete');
    return saved !== 'true';
  });

  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // ⌘K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Restore theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('ai_studio_theme');
    if (savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);
  
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
    return (id && id.startsWith('user-')) ? id : '';
  });

  const hasMigrated = useRef(false);
  const prevTabRef = useRef<Tab>('personas');

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

      setIsLoading(false);
    }
    init();
  }, [loadPersonas]);

  const setPersonas = useCallback(async (newPersonas: Persona[]) => {
    const oldPersonas = personas;
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
    if (selectedPersonaId && personas.length > 0 && !personas.find(p => p.id === selectedPersonaId)) {
      setSelectedPersonaId(personas[0]?.id || '');
    }
  }, [personas, selectedPersonaId]);

  useEffect(() => {
    localStorage.setItem('ai_influencer_selected_id', selectedPersonaId);
  }, [selectedPersonaId]);

  useEffect(() => {
    localStorage.setItem('ai_influencer_active_tab', activeTab);
  }, [activeTab]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('ai_influencer_onboarding_complete', 'true');
    setShowOnboarding(false);
    // Show tour for first-time users
    const tourSeen = localStorage.getItem('ai_influencer_tour_complete');
    if (!tourSeen) setShowTour(true);
  };

  const [showTour, setShowTour] = useState(false);

  const handleTourComplete = () => {
    localStorage.setItem('ai_influencer_tour_complete', 'true');
    setShowTour(false);
  };

  if (showOnboarding) {
    return <LandingView onGetStarted={handleOnboardingComplete} />;
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

  const activePersona = personas.find(p => p.id === selectedPersonaId) || personas[0] || EMPTY_PERSONA;
  const hasPersonas = personas.length > 0 && personas[0].id !== 'empty';

  const tabs = [
    { id: 'personas', label: 'Personas', icon: Users },
    { id: 'create', label: 'Create', icon: PlusCircle },
    { id: 'gallery', label: 'Gallery', icon: Sparkles },
    { id: 'assistant', label: 'Assistant', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getTabDirection = (from: Tab, to: Tab) => {
    const fromIdx = tabs.findIndex(t => t.id === from);
    const toIdx = tabs.findIndex(t => t.id === to);
    return toIdx > fromIdx ? 1 : -1;
  };

  const navActions = { push: pushView, pop: popView, replace: replaceView };

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
      case 'personas': return <PersonasView personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} selectedId={selectedPersonaId} navigateToTab={(t) => replaceView({ view: t })} nav={navActions} />;
      case 'create': return <CreateView persona={activePersona} personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} subView={subView} nav={navActions} />;
      case 'gallery': return <GalleryView personas={personas} activePersona={activePersona} nav={navActions} />;
      case 'assistant': return <AssistantView persona={activePersona} personas={personas} nav={navActions} />;
      case 'settings': return <SettingsView nav={navActions} />;
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
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150',
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
    <div className="flex flex-col h-screen bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden relative">
      <div className="ambient-glow top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-500/[0.04] blur-[100px] rounded-full" />

      {/* ── Top app bar ─────────────────────────────────────────── */}
      <header className="flex-none bg-[#0B0F17]/90 backdrop-blur-xl border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between px-6 py-2">
          
          {/* Back Button & Logo */}
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {navStack.length > 1 && (
                <BackButton onClick={popView} className="mr-2" />
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
                    <div className="w-6 h-6 rounded-lg overflow-hidden border border-[#334155] shrink-0">
                      <img
                        src={activePersona.avatar || activePersona.referenceImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&h=64'}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="hidden sm:block text-left max-w-[100px]">
                      <p className="text-[10px] font-black text-[#00D4FF] uppercase tracking-widest leading-none">Active</p>
                      <p className="text-[11px] font-bold text-white truncate leading-tight">{activePersona.name}</p>
                    </div>
                    <ChevronDown size={12} className="text-[#64748B] hidden sm:block" />
                  </button>
                  {/* Dropdown */}
                  <div id="persona-switcher-dropdown" className="hidden absolute right-0 top-full mt-2 w-64 bg-[#111827]/95 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 backdrop-blur-xl overflow-hidden z-[100]">
                    <div className="p-2 border-b border-white/5">
                      <p className="text-[9px] font-black text-[#475569] uppercase tracking-[0.15em] px-2 py-1">Switch Persona</p>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto p-1.5">
                      {personas.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedPersonaId(p.id);
                            document.getElementById('persona-switcher-dropdown')?.classList.add('hidden');
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all ${
                            p.id === selectedPersonaId
                              ? 'bg-[#00D4FF]/10 border border-[#00D4FF]/20'
                              : 'hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#334155] shrink-0">
                            <img
                              src={p.avatar || p.referenceImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&h=64'}
                              alt=""
                              className="w-full h-full object-cover"
                            />
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
            };
            const subViewLabels: Record<string, string> = {
              'ai-tools': 'AI Tools', 'planner': 'Content Planner', 'voice': 'Voice Studio',
              'visual-generator': 'Visual Studio', 'content': 'Content Writer',
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
        <div className="w-full h-full">
          {renderContent()}
        </div>
      </main>

      <nav className="flex-none z-50">
        <div className="action-bar" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div
            className="flex items-center gap-0 px-1 pt-0 pb-0.5 overflow-x-auto scrollbar-hide"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => { prevTabRef.current = activeTab; replaceView({ view: tab.id as Tab }); }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-0 min-w-[56px] flex-1 py-0 relative"
                >
                  <div className="relative p-1 rounded-xl">
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: 'rgba(0, 212, 255, 0.08)',
                          border: '1px solid rgba(0, 245, 194, 0.2)'
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 32 }}
                      />
                    )}
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.2 : 1.6}
                      className={cn(
                        "relative z-10 transition-all duration-200",
                        isActive ? "text-[#00F5C2]" : "text-[var(--text-muted)]"
                      )}
                    />
                  </div>
                  <span className={cn(
                    "text-[9.5px] font-bold tracking-wide transition-all duration-200 leading-none",
                    isActive ? "text-[#00F5C2]" : "text-[var(--text-muted)]"
                  )}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-[12px] h-0.5 rounded-full"
                      style={{ background: '#00F5C2' }}
                      transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1a103c', color: '#fff', border: '1px solid rgba(139, 92, 246, 0.3)' } }} />
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        personas={personas}
        onNavigate={(tab) => { replaceView({ view: tab }); }}
        onSelectPersona={setSelectedPersonaId}
        onOpenSubView={(tab, subView) => { replaceView({ view: tab, subView }); }}
      />
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
