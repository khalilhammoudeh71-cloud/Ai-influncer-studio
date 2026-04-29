import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  PlusCircle, 
  MessageSquare, 
  MessageCircle,
  Settings,
  Mic,
  Wrench
} from 'lucide-react';
import { cn } from './utils/cn';
import { Persona, RevenueEntry, PlannedPost } from './types';
import { api } from './services/apiService';
import PersonasView from './views/PersonasView';
import PlannerView from './views/PlannerView';
import CreateView from './views/CreateView';
import AssistantView from './views/AssistantView';
import ChatView from './views/ChatView';
import SettingsView from './views/SettingsView';
import VoiceView from './views/VoiceView';
import AIToolsView from './views/AIToolsView';

type Tab = 'personas' | 'planner' | 'create' | 'assistant' | 'chat' | 'settings' | 'voice' | 'ai-tools';

export const INTERNAL_FALLBACK_PERSONAS: Persona[] = [
  {
    id: 'fallback-luxury',
    name: 'Luxury Persona',
    niche: 'Luxury Lifestyle',
    tone: 'Elite, Arrogant, Wealthy',
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

function Onboarding({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-[var(--bg-base)] relative overflow-hidden">
      <div className="absolute top-[-30%] left-[-20%] w-[70%] h-[70%] bg-violet-600/10 blur-[180px] rounded-full" />
      <div className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] bg-fuchsia-600/10 blur-[180px] rounded-full" />
      <div className="absolute top-[20%] right-[5%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[30%] left-[10%] w-[25%] h-[25%] bg-sky-500/5 blur-[100px] rounded-full" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="z-10 max-w-sm"
      >
        <div className="mb-12 flex justify-center">
          <motion.div
            initial={{ scale: 0.6, rotate: -10 }}
            animate={{ scale: 1, rotate: 3 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-[28px] blur-2xl opacity-50" />
            <div className="relative w-28 h-28 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-[28px] flex items-center justify-center"
              style={{ boxShadow: '0 20px 60px -8px rgba(139, 92, 246, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}
            >
              <Users size={52} className="text-white" strokeWidth={1.5} />
            </div>
          </motion.div>
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-[42px] font-extrabold tracking-tight mb-4 leading-[1.1]"
        >
          <span className="gradient-text">AI Influencer</span>
          <br />
          <span className="text-[var(--text-primary)]">Studio</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-[var(--text-secondary)] text-[15px] mb-14 leading-relaxed max-w-[280px] mx-auto"
        >
          The premium command center for your digital personas. Plan, create, and scale your AI empire.
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={onComplete}
          className="w-full premium-button py-[18px] px-8 text-white font-bold rounded-2xl text-base"
        >
          Get Started
        </motion.button>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mt-10 text-[10px] text-[var(--text-muted)] uppercase tracking-[0.25em] font-medium"
        >
          Experience the future of creation
        </motion.p>
      </motion.div>
    </div>
  );
}

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
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-[var(--text-tertiary)] text-sm">Loading your studio...</p>
        </motion.div>
      </div>
    );
  }

  const activePersona = personas.find(p => p.id === selectedPersonaId) || personas[0] || INTERNAL_FALLBACK_PERSONAS[0];

  const tabs = [
    { id: 'personas', label: 'Personas', icon: Users },
    { id: 'planner', label: 'Planner', icon: Calendar },
    { id: 'create', label: 'Create', icon: PlusCircle },
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'ai-tools', label: 'AI Tools', icon: Wrench },
    { id: 'assistant', label: 'Assistant', icon: MessageSquare },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'personas': return <PersonasView personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} selectedId={selectedPersonaId} />;
      case 'planner': return <PlannerView persona={activePersona} personas={personas} onSelectPersona={setSelectedPersonaId} />;
      case 'voice': return <VoiceView persona={activePersona} personas={personas} onSelectPersona={setSelectedPersonaId} />;
      case 'ai-tools': return <AIToolsView persona={activePersona} personas={personas} onSelectPersona={setSelectedPersonaId} />;
      case 'assistant': return <AssistantView persona={activePersona} personas={personas} />;
      case 'chat': return <ChatView personas={personas} activePersona={activePersona} />;
      case 'settings': return <SettingsView />;
      default: return <PersonasView personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} selectedId={selectedPersonaId} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden relative">
      <div className="ambient-glow top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-500/[0.04] blur-[100px] rounded-full" />

      {/* ── Top app bar ─────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)', boxShadow: '0 2px 12px -2px rgba(139,92,246,0.45)' }}
            >
              <Users size={16} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-[15px] font-extrabold tracking-tight gradient-text">AI Studio</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setActiveTab('personas')}
            className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-full pl-1.5 pr-3 py-1 hover:border-violet-500/30 transition-all"
          >
            {activePersona.referenceImage ? (
              <img
                src={activePersona.referenceImage}
                alt={activePersona.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-violet-500/40"
              />
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}
              >
                {activePersona.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-semibold text-[var(--text-secondary)] max-w-[110px] truncate">
              {activePersona.name}
            </span>
          </motion.button>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pt-[54px] pb-[88px] relative z-10">
        <div style={{ display: activeTab === 'create' ? 'block' : 'none' }}>
          <CreateView persona={activePersona} personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} />
        </div>
        <AnimatePresence mode="wait">
          {activeTab !== 'create' && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {renderContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Bottom tab bar ──────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50">
        <div className="action-bar" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div
            className="flex items-center gap-0.5 px-2 pt-2 pb-3 overflow-x-auto scrollbar-hide"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-0.5 min-w-[60px] flex-1 py-1 relative"
                >
                  <div className="relative p-2 rounded-xl">
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: 'linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(217,70,239,0.18) 100%)',
                          boxShadow: '0 0 24px -4px rgba(139,92,246,0.35)',
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 32 }}
                      />
                    )}
                    <Icon
                      size={21}
                      strokeWidth={isActive ? 2.2 : 1.6}
                      className={cn(
                        "relative z-10 transition-all duration-200",
                        isActive ? "text-violet-300" : "text-[var(--text-muted)]"
                      )}
                    />
                  </div>
                  <span className={cn(
                    "text-[9.5px] font-bold tracking-wide transition-all duration-200 leading-none",
                    isActive ? "text-violet-300" : "text-[var(--text-muted)]"
                  )}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-[18px] h-0.5 rounded-full"
                      style={{ background: 'linear-gradient(90deg, #8b5cf6, #d946ef)', boxShadow: '0 0 8px rgba(139,92,246,0.6)' }}
                      transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>
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
          return parsed.map((p: Partial<Persona> & { id?: string }) => ({
            ...p,
            id: p.id && p.id.startsWith('user-') ? p.id : `user-${p.id || Date.now() + Math.random()}`,
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
