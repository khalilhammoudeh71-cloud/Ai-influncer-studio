import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, 
  Calendar, 
  PlusCircle, 
  MessageSquare, 
  MessageCircle,
  Settings
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

type Tab = 'personas' | 'planner' | 'create' | 'assistant' | 'chat' | 'settings';

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
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-[#0A0A0A] relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full" />
      <div className="z-10 max-w-sm">
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-3">
            <Users size={48} className="text-white" strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          AI Influencer Studio
        </h1>
        <p className="text-gray-400 text-lg mb-12 leading-relaxed">
          The premium command center for your digital personas. Plan, create, and scale your AI empire.
        </p>
        <button
          onClick={onComplete}
          className="w-full py-4 px-8 bg-white text-black font-semibold rounded-2xl hover:bg-gray-200 transition-all active:scale-95 shadow-xl shadow-white/5"
        >
          Get Started
        </button>
        <p className="mt-6 text-xs text-gray-500 uppercase tracking-widest font-medium">
          Experience the future of creation
        </p>
      </div>
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
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading your studio...</p>
        </div>
      </div>
    );
  }

  const activePersona = personas.find(p => p.id === selectedPersonaId) || personas[0] || INTERNAL_FALLBACK_PERSONAS[0];

  const tabs = [
    { id: 'personas', label: 'Personas', icon: Users },
    { id: 'planner', label: 'Planner', icon: Calendar },
    { id: 'create', label: 'Create', icon: PlusCircle },
    { id: 'assistant', label: 'Assistant', icon: MessageSquare },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'personas': return <PersonasView personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} selectedId={selectedPersonaId} />;
      case 'planner': return <PlannerView persona={activePersona} />;
      case 'create': return <CreateView persona={activePersona} personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} />;
      case 'assistant': return <AssistantView persona={activePersona} personas={personas} />;
      case 'chat': return <ChatView personas={personas} activePersona={activePersona} />;
      case 'settings': return <SettingsView />;
      default: return <PersonasView personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} selectedId={selectedPersonaId} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-white overflow-hidden font-sans">
      <main className="flex-1 overflow-y-auto pb-24">
        {renderContent()}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-[#121212]/90 backdrop-blur-xl border-t border-white/5 pb-8 pt-3 px-2 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all duration-200 min-w-[64px]",
                  isActive ? "text-indigo-400" : "text-gray-500 hover:text-gray-400"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-all duration-200",
                  isActive && "bg-indigo-400/10"
                )}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-medium tracking-wide">
                  {tab.label}
                </span>
              </button>
            );
          })}
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
