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
  Sparkles
} from 'lucide-react';
import { cn } from './utils/cn';
import { Persona, RevenueEntry, PlannedPost } from './types';
import { api } from './services/apiService';
import PersonasView from './views/PersonasView';
import PlannerView from './views/PlannerView';
import CreateView from './views/CreateView';
import AssistantView from './views/AssistantView';
import SettingsView from './views/SettingsView';
import GalleryView from './views/GalleryView';
import LandingView from './views/LandingView';
import PersonaBuilderView from './views/PersonaBuilderView';

type Tab = 'personas' | 'create' | 'gallery' | 'assistant' | 'settings';

const INTERNAL_FALLBACK_PERSONAS: Persona[] = [
  {
    id: 'fallback-luxury',
    name: 'Luxury Persona',
    niche: 'Luxury Lifestyle',
    tone: 'Luxury, Confident, Exclusive',
    platform: 'Instagram',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150',
    personalityTraits: ['Ambitious', 'Cold', 'Sophisticated'],
    visualStyle: 'High-contrast, gold accents, minimalism',
    audienceType: 'Aspirational high-earners',
    contentBoundaries: 'No low-budget topics',
    bio: 'Living the life you only see in dreams.',
    brandVoiceRules: 'Never use emojis except ✨ and 🥂. Use short, sharp sentences.',
    contentGoals: 'Build mystery and desire',
    personaNotes: 'Internal reference'
  }
];

function App() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const saved = localStorage.getItem('ai_influencer_onboarding_complete');
    return saved !== 'true';
  });
  
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('ai_influencer_active_tab');
    return (saved as Tab) || 'personas';
  });

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
  };

  if (showOnboarding) {
    return <LandingView onGetStarted={handleOnboardingComplete} />;
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

  const activePersona = personas.find(p => p.id === selectedPersonaId) || personas[0] || INTERNAL_FALLBACK_PERSONAS[0];

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

  const renderContent = () => {
    switch (activeTab) {
      case 'personas': return <PersonasView personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} selectedId={selectedPersonaId} navigateToTab={setActiveTab} />;
      case 'create': return <CreateView persona={activePersona} personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} />;
      case 'gallery': return <GalleryView personas={personas} activePersona={activePersona} />;
      case 'assistant': return <AssistantView persona={activePersona} personas={personas} />;
      case 'settings': return <SettingsView />;
      default: return <PersonasView personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} selectedId={selectedPersonaId} navigateToTab={setActiveTab} />;
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
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #00F5C2 0%, #00D4FF 100%)', boxShadow: '0 0 16px rgba(0, 245, 194, 0.4)' }}>
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-transparent border-b-[#0B0F17]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[14px] font-extrabold tracking-widest text-white uppercase">AI Influencer</span>
              <span className="text-[10px] font-semibold text-[#00D4FF] tracking-[0.2em] uppercase">Studio</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8 relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <input 
              type="text" 
              placeholder="Search personas, tools or creations..." 
              className="w-full bg-[#111827] border border-[#334155] rounded-full py-1.5 pl-11 pr-12 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-all"
            />
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <span className="text-xs font-semibold text-[var(--text-muted)]">⌘K</span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-5">
            <button 
              onClick={() => setActiveTab('create')}
              className="hidden sm:flex items-center gap-2 bg-transparent border border-[#00D4FF]/40 px-5 py-1.5 rounded-full text-sm font-bold text-white hover:bg-[#00D4FF]/10 transition-all shadow-[0_0_16px_rgba(0,212,255,0.15)] hover:shadow-[0_0_24px_rgba(0,212,255,0.3)]"
            >
              <PlusCircle size={16} className="text-[#00F5C2]" /> Create
            </button>
            <button className="relative text-[var(--text-muted)] hover:text-white transition-colors">
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </button>
            <button className="w-8 h-8 rounded-full overflow-hidden border border-[#334155] hover:border-[#00D4FF] transition-colors shrink-0">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop" alt="Profile" className="w-full h-full object-cover" />
            </button>
          </div>

        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <AnimatePresence mode="wait" custom={getTabDirection(prevTabRef.current, activeTab)}>
            <motion.div
              key={activeTab}
              custom={getTabDirection(prevTabRef.current, activeTab)}
              variants={{
                enter: (dir: number) => ({ opacity: 0, x: dir * 18, filter: 'blur(2px)' }),
                center: { opacity: 1, x: 0, filter: 'blur(0px)' },
                exit: (dir: number) => ({ opacity: 0, x: dir * -18, filter: 'blur(2px)' })
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {renderContent()}
            </motion.div>
        </AnimatePresence>
      </main>

      <nav className="flex-none z-50">
        <div className="action-bar" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div
            className="flex items-center gap-0 px-1 pt-0.5 pb-1 overflow-x-auto scrollbar-hide"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => { prevTabRef.current = activeTab; setActiveTab(tab.id as Tab); }}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-0 min-w-[60px] flex-1 py-0.5 relative"
                >
                  <div className="relative p-1.5 rounded-xl">
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: 'linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(0,245,194,0.1) 100%)',
                          boxShadow: '0 0 24px -4px rgba(0,245,194,0.25)',
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 32 }}
                      />
                    )}
                    <Icon
                      size={21}
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
                      className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-[18px] h-0.5 rounded-full"
                      style={{ background: '#00F5C2', boxShadow: '0 0 8px rgba(0,245,194,0.6)' }}
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
