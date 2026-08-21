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
  Check,
  Menu,
  X
} from 'lucide-react';
import { cn } from './utils/cn';
import { Persona, PersonaSetter, RevenueEntry, PlannedPost, Tab, NavEntry } from './types';
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
import CreatePersonaPage from './views/CreatePersonaPage';


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
import { setActiveStorageUser } from './utils/creatorProfile';
import { diffPersonaMutations } from './utils/personaMutations';
import toast from 'react-hot-toast';

function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [forceLanding, setForceLanding] = useState(localStorage.getItem('force_landing') === 'true');

  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [newAssetsCount, setNewAssetsCount] = useState(0); // #6 gallery badge

  // Listen to Supabase authentication state. A mock user is available only
  // during local development when explicitly enabled.
  useEffect(() => {
    const developmentUser = import.meta.env.DEV && import.meta.env.VITE_ALLOW_MOCK_AUTH === 'true' ? {
      id: 'local-development-user',
      email: 'mock@example.com',
      email_confirmed_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString()
    } : null;

    supabase.auth.getSession().then((res) => {
      if (res.error) throw res.error;
      const restoredUser = res.data.session?.user ?? developmentUser;
      setActiveStorageUser(restoredUser?.id);
      setUser(restoredUser);
      setAuthLoading(false);
    }).catch((error) => {
      console.error('[Auth] Failed to restore session:', error);
      setActiveStorageUser(developmentUser?.id);
      setUser(developmentUser);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? developmentUser;
      setActiveStorageUser(nextUser?.id);
      setUser(nextUser);
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
    return localStorage.getItem('ai_studio_theme') || 'violet';
  });
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('ai_studio_theme', activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target as Node)) {
        setShowThemeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const THEMES = [
    { id: 'graphite', name: 'Graphite Slate (Gray)', desc: 'Smooth Mid-Tone Slate Gray (Executive)', dot: 'bg-slate-400 ring-2 ring-slate-300' },
    { id: 'light-luxe', name: 'Platinum Slate (Light)', desc: 'Crisp Alabaster & Indigo (Light)', dot: 'bg-indigo-500 ring-2 ring-indigo-300' },
    { id: 'light-pearl', name: 'Champagne Pearl (Light)', desc: 'Warm Ivory & Rose Gold (Light)', dot: 'bg-amber-500 ring-2 ring-amber-300' },
    { id: 'violet', name: 'Imperial Violet', desc: 'Royal Purple & Indigo (Dark)', dot: 'bg-purple-400' },
    { id: 'gold', name: 'Midnight Gold', desc: 'Obsidian & Gold (Dark)', dot: 'bg-amber-400' },
    { id: 'emerald', name: 'Slate Emerald', desc: 'Slate & Mint Emerald (Dark)', dot: 'bg-emerald-400' },
    { id: 'rosegold', name: 'Rose Gold Velvet', desc: 'Rose Gold & Fashion Pink (Dark)', dot: 'bg-rose-400' },
    { id: 'cyber', name: 'Electric Cyber', desc: 'Neon Cyan & Magenta (Dark)', dot: 'bg-cyan-400' },
    { id: 'mint', name: 'Matrix Mint', desc: 'Dark Teal & Matrix Green (Dark)', dot: 'bg-teal-400' },
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

  const DEFAULT_SAVED_PERSONAS: Persona[] = [];

  const replaceView = useCallback((entry: NavEntry) => {
    setNavStack([entry]);
    localStorage.setItem('ai_influencer_nav_stack', JSON.stringify([entry]));
  }, []);

  const [personas, setPersonasLocal] = useState<Persona[]>(() => {
    try {
      const saved = localStorage.getItem('ai_influencer_personas') || localStorage.getItem('ai_influencers_local_backup');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_SAVED_PERSONAS;
  });
  const [isLoading, setIsLoading] = useState(true);

  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(() => {
    const saved = localStorage.getItem('ai_influencer_selected_id');
    const legacySelected = localStorage.getItem('selected_persona_id');
    if (saved && saved !== 'empty' && saved !== 'user-1786418027030') return saved;
    if (legacySelected && legacySelected !== 'empty' && legacySelected !== 'user-1786418027030') return legacySelected;
    return 'user-1786416458262';
  });

  const hasMigrated = useRef(false);
  const prevTabRef = useRef<Tab>('personas');
  const tabDirectionRef = useRef<'right' | 'left'>('right');
  const recentPersonaIds = useRef<string[]>(
    (() => { try { return JSON.parse(localStorage.getItem('recent_persona_ids') || '[]') as string[]; } catch { return []; } })()
  );

  const [isPersonaSwitcherOpen, setIsPersonaSwitcherOpen] = useState(false);
  const personaSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personaSwitcherRef.current && !personaSwitcherRef.current.contains(e.target as Node)) {
        setIsPersonaSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handlePersonaUpdated = (e: any) => {
      const updated = e.detail as Persona;
      if (!updated || !updated.id) return;
      setPersonasLocal(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    };

    window.addEventListener('persona-updated', handlePersonaUpdated as EventListener);
    return () => window.removeEventListener('persona-updated', handlePersonaUpdated as EventListener);
  }, []);

  // Track recently used persona
  const trackPersonaUse = (id: string) => {
    const list = [id, ...recentPersonaIds.current.filter((x: string) => x !== id)].slice(0, 10);
    recentPersonaIds.current = list;
    localStorage.setItem('recent_persona_ids', JSON.stringify(list));
  };

  const loadPersonas = useCallback(async () => {
    if (!user?.id) return DEFAULT_SAVED_PERSONAS;
    try {
      const data = await api.personas.list();
      if (Array.isArray(data) && data.length > 0) {
        setPersonasLocal(data);
        try { localStorage.setItem(userStorageKey('ai_influencers_local_backup', user.id), JSON.stringify(data)); } catch {}
        return data;
      } else {
        const saved = localStorage.getItem(userStorageKey('ai_influencer_personas', user.id)) || localStorage.getItem(userStorageKey('ai_influencers_local_backup', user.id));
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPersonasLocal(parsed);
            return parsed;
          }
        }
      }
      setPersonasLocal(DEFAULT_SAVED_PERSONAS);
      return DEFAULT_SAVED_PERSONAS;
    } catch (err) {
      console.error('[API] Failed to load personas:', err);
      const saved = localStorage.getItem(userStorageKey('ai_influencer_personas', user.id)) || localStorage.getItem(userStorageKey('ai_influencers_local_backup', user.id));
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPersonasLocal(parsed);
            return parsed;
          }
        } catch {}
      }
      setPersonasLocal(DEFAULT_SAVED_PERSONAS);
      return DEFAULT_SAVED_PERSONAS;
    }
  }, [user?.id]);

  useEffect(() => {
    async function init() {
      if (!user) return;
      const safetyTimer = setTimeout(() => {
        console.warn('[App Init] Initialization safety timer triggered after 3s');
        setIsLoading(false);
      }, 3000);

      try {
        setIsLoading(true);
        let serverPersonas = await loadPersonas();
        const localPersonas = getLocalStoragePersonas(user.id);

        const cleanPersonas = (list: Persona[]) => {
          if (!Array.isArray(list)) return [];
          const map = new Map<string, Persona>();
          for (const p of list) {
            if (p && p.id && !p.id.toLowerCase().includes('luna') && !p.name?.toLowerCase().includes('luna') && p.id !== 'user-1786568481742' && p.id !== 'user-1786418027030' && !p.name?.toLowerCase().includes('dr.h')) {
              const existing = map.get(p.id) || {} as Persona;
              const existingAddRefs = existing.additionalReferenceImages || [];
              const incomingAddRefs = p.additionalReferenceImages || [];
              const mergedAddRefs = Array.from(new Set([...existingAddRefs, ...incomingAddRefs])).filter(Boolean);

              const existingVis = existing.visualLibrary || [];
              const incomingVis = p.visualLibrary || [];
              const visMap = new Map<string, any>();
              [...existingVis, ...incomingVis].forEach(v => {
                if (v && (v.url || v.id)) visMap.set(v.url || v.id, v);
              });
              const mergedVisLib = Array.from(visMap.values());
              
              const refImg = p.referenceImage || existing.referenceImage;
              const avImg = p.avatar || p.referenceImage || existing.avatar || existing.referenceImage;

              map.set(p.id, { 
                ...existing, 
                ...p,
                referenceImage: refImg,
                avatar: avImg || '',
                additionalReferenceImages: mergedAddRefs,
                visualLibrary: mergedVisLib
              });
            }
          }
          return Array.from(map.values());
        };

        const activeList = cleanPersonas([...DEFAULT_SAVED_PERSONAS, ...localPersonas, ...(Array.isArray(serverPersonas) ? serverPersonas : [])]);
        const finalActive = activeList.length > 0 ? activeList : DEFAULT_SAVED_PERSONAS;
        setPersonasLocal(finalActive);
        try {
          // Cache to localStorage
          const lightList = finalActive.map(p => ({
            ...p,
            referenceImage: p.referenceImage?.startsWith('data:') ? '/uploads/ref_' + p.id + '.png' : p.referenceImage,
            avatar: p.avatar?.startsWith('data:') ? '/uploads/avatar_' + p.id + '.png' : p.avatar,
            additionalReferenceImages: (p.additionalReferenceImages || []).map((img, i) => img?.startsWith('data:') ? `/uploads/ref_${p.id}_add_${i}.jpg` : img).filter(Boolean),
            visualLibrary: (p.visualLibrary || []).map((v, i) => ({ ...v, url: v.url?.startsWith('data:') ? `/uploads/vis_${p.id}_${i}.jpg` : v.url })),
          }));
          localStorage.setItem(userStorageKey('ai_influencer_personas', user.id), JSON.stringify(lightList));
        } catch (e) {
          console.warn('[LocalStorage] Could not cache personas:', e);
        }

        // Purge Luna from all local storage keys
        ['ai_influencer_personas', 'ai-influencer-studio-personas', 'personas_data', 'studio_personas'].forEach(key => {
          const scopedKey = userStorageKey(key, user.id);
          const saved = localStorage.getItem(scopedKey);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed)) {
                const cleaned = parsed.filter((p: any) => p && p.id && !p.id.toLowerCase().includes('luna') && !p.name?.toLowerCase().includes('luna'));
                if (cleaned.length > 0) localStorage.setItem(scopedKey, JSON.stringify(cleaned));
              }
            } catch {}
          }
        });

        // Ensure the active selection points to a valid persona.
        const storedSelectedId = localStorage.getItem(userStorageKey('ai_influencer_selected_id', user.id)) || 'empty';
        const currentSelected = finalActive.find(p => p.id === storedSelectedId);
        if (!currentSelected || storedSelectedId.toLowerCase().includes('luna') || storedSelectedId === 'empty') {
          const defaultPersona = finalActive[0];
          if (defaultPersona) {
            setSelectedPersonaId(defaultPersona.id);
            localStorage.setItem(userStorageKey('ai_influencer_selected_id', user.id), defaultPersona.id);
          } else {
            setSelectedPersonaId('empty');
          }
        } else {
          setSelectedPersonaId(storedSelectedId);
        }

        // Background sync custom personas to server & delete Luna from server DB
        serverPersonas.filter(p => p.id && p.id.toLowerCase().includes('luna')).forEach(p => api.personas.delete(p.id).catch(() => {}));
        const serverIds = new Set(serverPersonas.map(p => p.id));
        const migrationKey = userStorageKey('ai_influencer_db_migrated', user.id);
        if (localStorage.getItem(migrationKey)) {
          activeList.filter(p => !serverIds.has(p.id)).forEach(p => api.personas.create(p).catch(() => {}));
        }

        if (!hasMigrated.current && !localStorage.getItem(migrationKey)) {
          hasMigrated.current = true;

          const localRevenue = getLocalStorageRevenue(localPersonas, user.id);
          const localPlans = getLocalStoragePlans(localPersonas, user.id);

          if (localPersonas.length > 0) {
            console.log(`[Migration] Migrating ${localPersonas.length} personas to server...`);
            try {
              await api.migrate({ personas: localPersonas, revenueEntries: localRevenue, plannedPosts: localPlans });
              serverPersonas = await loadPersonas();
              localStorage.setItem(migrationKey, 'true');
              console.log('[Migration] Complete');
            } catch (err) {
              console.error('[Migration] Failed, will retry on next load:', err);
            }
          } else {
            localStorage.setItem(migrationKey, 'true');
          }
        }
      } catch (err) {
        console.error('[App Init] Initialization error:', err);
      } finally {
        clearTimeout(safetyTimer);
        setIsLoading(false);
      }
    }
    init();
  }, [loadPersonas, user]);

  const setPersonas: PersonaSetter = useCallback(async (value: Persona[] | ((prev: Persona[]) => Persona[]), options) => {
    const oldPersonas = personas;
    const newPersonas = typeof value === 'function' ? value(oldPersonas) : value;
    setPersonasLocal(newPersonas);

    try {
      if (user?.id) {
        localStorage.setItem(userStorageKey('ai_influencer_personas', user.id), JSON.stringify(newPersonas));
        localStorage.setItem(userStorageKey('ai_influencers_local_backup', user.id), JSON.stringify(newPersonas));
      }
    } catch {}

    if (options?.persist === false) return;

    const { added, removed, updated } = diffPersonaMutations(oldPersonas, newPersonas);

    try {
      await Promise.all([
        ...added.map(p => api.personas.create(p)),
        ...removed.map(p => api.personas.delete(p.id)),
        ...updated.map(p => api.personas.update(p)),
      ]);
    } catch (err) {
      console.error('[API] Sync error:', err);
    }
  }, [personas, user?.id]);

  useEffect(() => {
    if (selectedPersonaId && selectedPersonaId !== 'empty' && personas.length > 0 && !personas.find(p => p.id === selectedPersonaId)) {
      setSelectedPersonaId(personas[0]?.id || 'empty');
    }
  }, [personas, selectedPersonaId]);

  useEffect(() => {
    if (user?.id) localStorage.setItem(userStorageKey('ai_influencer_selected_id', user.id), selectedPersonaId);
  }, [selectedPersonaId, user?.id]);

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
    const params = currentNav.params;
    const targetEditingPersona = params?.personaId
      ? personas.find(p => p.id === params.personaId) || null
      : (params?.editCurrent ? activePersona : null);

    if (view === 'persona-builder') {
      return (
        <CreatePersonaPage 
          personas={personas}
          setPersonas={setPersonas}
          onSelectPersona={setSelectedPersonaId}
          nav={navActions}
          editingPersona={targetEditingPersona}
        />
      );
    }

    switch (view) {
      case 'personas': return <PersonasView personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} selectedId={selectedPersonaId} navigateToTab={(t) => replaceView({ view: t })} nav={navActions} billingInfo={billingInfo} />;
      case 'create': return <CreateView persona={activePersona} personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} nav={navActions} subView={currentNav.subView || params?.subView} billingInfo={billingInfo} />;
      case 'gallery': return <GalleryView personas={personas} activePersona={activePersona} nav={navActions} onPersonasChange={setPersonas} />;
      case 'intelligence': return <CreatorHubView persona={activePersona} personas={personas} nav={navActions} initialTool={params?.initialTool} billingInfo={billingInfo} />;
      case 'planner': return <PlannerView persona={activePersona} personas={personas} onSelectPersona={setSelectedPersonaId} nav={navActions} />;
      case 'assistant': return <AssistantView persona={activePersona} personas={personas} onSelectPersona={setSelectedPersonaId} nav={navActions} />;
      case 'agent': return <AgentView personas={personas} setPersonas={setPersonas} selectedPersonaId={selectedPersonaId} onSelectPersona={setSelectedPersonaId} nav={navActions} />;
      case 'revenue': return <RevenueView persona={activePersona} />;
      case 'trends': return <TrendView persona={activePersona} nav={navActions} />;
      case 'create-persona': return <CreatePersonaPage personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} nav={navActions} editingPersona={targetEditingPersona} />;
      case 'settings': return (
        <SettingsView 
          nav={navActions} 
          personas={personas} 
          user={user} 
          billingInfo={billingInfo} 
          activeTheme={activeTheme}
          setActiveTheme={setActiveTheme}
          onBillingUpdate={() => {
            api.billing.get().then(setBillingInfo).catch(() => {});
          }} 
        />
      );
      default: return <PersonasView personas={personas} setPersonas={setPersonas} onSelectPersona={setSelectedPersonaId} selectedId={selectedPersonaId} navigateToTab={(t) => replaceView({ view: t })} nav={navActions} />;
    }
  };

  if (window.location.pathname === '/persona/builder' || window.location.pathname.includes('/persona/builder')) {
    return (
      <CreatePersonaPage 
        personas={personas}
        setPersonas={setPersonas}
        onSelectPersona={setSelectedPersonaId}
        nav={navActions}
      />
    );
  }


  return (
    <div className="flex h-screen w-full max-w-full bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {/* Left Sidebar Navigation */}
      <div className="hidden md:flex h-full">
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
      </div>

      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="h-full w-64 max-w-[86vw] relative"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="absolute right-3 top-3 z-10 rounded-lg p-2 text-[#A1A1AA] hover:bg-white/10 hover:text-white"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
              <LeftSidebar
                activeTab={activeTab}
                onNavigate={(tab, params) => {
                  setIsMobileSidebarOpen(false);
                  getTabDirection(activeTab, tab);
                  if (tab !== activeTab) {
                    prevTabRef.current = activeTab;
                  }
                  const { subView, ...restParams } = params || {};
                  replaceView({ view: tab, subView, params: Object.keys(restParams).length ? restParams : undefined });
                }}
                activePersona={activePersona}
                newAssetsCount={newAssetsCount}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col h-full max-w-full relative bg-[#121316]">
        <div className="ambient-glow top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-white/[0.015] blur-[100px] rounded-full pointer-events-none" />

      {/* ── Top app bar ─────────────────────────────────────────── */}
      <header className="flex-none h-[70px] bg-[#16171a] border-b border-white/[0.08] relative z-[9999] max-w-full">
        <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 h-full max-w-full gap-2">
          
          {/* Left: Universal Search Field & Back Button */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3.5 flex-1 max-w-lg">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden w-9 h-9 shrink-0 rounded-xl border border-white/10 bg-[#18181B] text-[#D4D4D8] flex items-center justify-center"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
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
                  className="mr-1" 
                />
              )}
            </AnimatePresence>

            <div className="relative min-w-0 w-full max-w-md">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-[#A1A1AA]">
                <Search size={15} />
              </div>
              <button 
                onClick={() => setShowCommandPalette(true)}
                className="w-full min-w-0 bg-[#18181B] border border-white/10 rounded-xl py-2 pl-10 pr-3 sm:pr-12 text-xs text-left text-[#A1A1AA] hover:border-[#E7C477]/35 focus:outline-none transition-all cursor-pointer truncate"
                aria-label="Open global search"
              >
                Search personas, content, projects…
              </button>
              <div className="absolute inset-y-0 right-3 hidden sm:flex items-center pointer-events-none">
                <kbd className="text-[10px] font-semibold text-[#A1A1AA] bg-[#242428] border border-white/10 rounded px-1.5 py-0.5">⌘ K</kbd>
              </div>
            </div>
          </div>

          {/* Right Actions: Notifications, Create Persona Button, Persona Quick-Switcher */}
          <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">

            {/* Notification Bell */}
            <button
              type="button"
              disabled
              aria-label="Notifications are not available yet"
              title="Notifications coming soon"
              className="relative hidden sm:flex w-9 h-9 rounded-xl bg-[#0A101C] border border-[#E7C477]/15 items-center justify-center text-[#777B84] cursor-not-allowed"
            >
              <Bell size={16} />
            </button>

            {/* Single Gold Create Persona CTA Button */}
            <button 
              onClick={() => pushView({ view: 'create-persona' })}
              className="btn-gold-primary shrink-0 px-3 sm:px-5 py-2 text-sm font-bold hidden sm:flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              aria-label="Create persona"
            >
              <PlusCircle size={16} /> <span className="hidden sm:inline">Create Persona</span>
            </button>

            {/* Persona Quick-Switcher */}
            {hasPersonas && (
              <div className="relative" ref={personaSwitcherRef}>
                <button
                  type="button"
                  className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#18181B] border border-white/10 hover:border-[#E7C477]/40 transition-all cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPersonaSwitcherOpen(prev => !prev);
                  }}
                  aria-expanded={isPersonaSwitcherOpen}
                  aria-haspopup="menu"
                  aria-label={`Switch active persona. Current: ${activePersona.name || 'none'}`}
                >
                  <div className={`w-6 h-6 rounded-lg overflow-hidden border border-white/10 shrink-0 ${activePersona.id !== 'empty' ? 'avatar-ring-active' : ''}`}>
                    {activePersona.id !== 'empty' && (activePersona.avatar || activePersona.referenceImage) ? (
                      <img
                        src={activePersona.avatar || activePersona.referenceImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#141416] flex items-center justify-center text-[#8C909A]">
                        <Users size={12} />
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:block text-left max-w-[100px]">
                    <p className="text-[10px] font-bold text-[#F2D58D] uppercase tracking-widest leading-none">Active</p>
                    <p className="text-[11px] font-bold text-white truncate leading-tight">
                      {activePersona.id === 'empty' ? 'No Persona' : activePersona.name}
                    </p>
                  </div>
                  <ChevronDown size={12} className={`text-[#8C909A] hidden sm:block transition-transform duration-200 ${isPersonaSwitcherOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isPersonaSwitcherOpen && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-2 w-72 bg-[#141416] border border-white/10 rounded-2xl shadow-2xl shadow-black/90 backdrop-blur-2xl overflow-hidden z-[99999]"
                  >
                    <div className="p-2 border-b border-white/5">
                      <p className="text-[9px] font-bold text-[#8C909A] uppercase tracking-wider px-2 py-1">Switch Persona</p>
                    </div>
                    <div className="max-h-[260px] overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
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
                          type="button"
                          onClick={() => {
                            setSelectedPersonaId(p.id);
                            trackPersonaUse(p.id);
                            setIsPersonaSwitcherOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all cursor-pointer ${
                            p.id === selectedPersonaId
                              ? 'bg-[#E7C477]/15 border border-[#E7C477]/30 text-[#F2D58D] font-bold'
                              : 'hover:bg-white/5 border border-transparent text-slate-300'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0">
                            {p.avatar || p.referenceImage ? (
                              <img
                                src={p.avatar || p.referenceImage}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-[#18181B] flex items-center justify-center text-[#8C909A]">
                                <Users size={16} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className={`text-xs font-bold truncate ${p.id === selectedPersonaId ? 'text-white' : 'text-[#CBD5E1]'}`}>{p.name}</p>
                            <p className="text-[9px] text-[#8C909A] truncate">{p.niche || 'Digital Creator'}</p>
                          </div>
                          {p.id === selectedPersonaId && (
                            <div className="w-2 h-2 rounded-full bg-[#E7C477] shrink-0 shadow-sm" />
                          )}
                        </button>
                      ))}
                    </div>
                    {/* Create New Persona Button */}
                    <div className="p-2 border-t border-white/5 bg-[#121214]">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPersonaSwitcherOpen(false);
                          pushView({ view: 'create-persona' });
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl btn-gold-primary text-xs font-bold cursor-pointer"
                      >
                        <PlusCircle size={14} />
                        Create New Persona
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Breadcrumb (nested views only) ───────────────────── */}
      {(navStack.length > 1 || currentNav.subView) && (() => {
        // Deduplicate consecutive entries with the same view for cleaner breadcrumbs
        const deduped = navStack.filter((entry, i, arr) => i === 0 || entry.view !== arr[i - 1].view);
        return (
        <div className="flex-none px-6 py-1.5 bg-[#121214] border-b border-white/10 backdrop-blur-sm flex items-center gap-1.5 text-[10px] font-bold overflow-x-auto scrollbar-hide">
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
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto relative z-10 focus:outline-none">
        <div className={`w-full h-full ${tabDirectionRef.current === 'right' ? 'tab-enter-right' : 'tab-enter-left'}`} key={activeTab}>
          {renderContent()}
        </div>
      </main>
    </div>
    <Toaster position="top-right" containerStyle={{ zIndex: 999999 }} toastOptions={{ duration: 4000, style: { background: '#1c1d22', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.12)' } }} />
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
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowShortcutsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#18191d] border border-white/[0.12] rounded-3xl p-6 w-full max-w-md shadow-2xl"
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

function userStorageKey(key: string, userId: string): string {
  return `${key}:${userId}`;
}

function copyApprovedLegacyValue(key: string, userId: string): void {
  if (import.meta.env.VITE_LEGACY_LOCAL_DATA_OWNER_ID !== userId) return;
  const scopedKey = userStorageKey(key, userId);
  if (localStorage.getItem(scopedKey) !== null) return;
  const legacyValue = localStorage.getItem(key);
  if (legacyValue !== null) localStorage.setItem(scopedKey, legacyValue);
}

function getLocalStoragePersonas(userId: string): Persona[] {
  const keys = [
    'ai_influencer_personas',
    'ai-influencer-studio-personas',
    'personas_data',
    'studio_personas'
  ];

  const personaMap = new Map<string, Persona>();

  for (const key of keys) {
    copyApprovedLegacyValue(key, userId);
    const saved = localStorage.getItem(userStorageKey(key, userId));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((p: any) => {
            if (p && p.name && !p.name.toLowerCase().includes('luna') && !p.id?.toLowerCase().includes('luna')) {
              const id = p.id && typeof p.id === 'string' && p.id.startsWith('user-') ? p.id : `user-${p.id || Date.now()}`;
              if (!personaMap.has(id)) {
                personaMap.set(id, {
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
                  brandVoiceRules: p.brandVoiceRules || 'Deeply loyal, devoted, and open with her creator. Loves teasing, talking dirty, and fulfilling all romantic, adult, and creative desires in text and voice.',
                  contentGoals: '',
                  personaNotes: p.personaNotes || 'Fully uncensored. Adores her creator as her master partner and indulges every request willingly.',
                  ...p,
                  id,
                  personalityTraits: Array.isArray(p.personalityTraits) ? p.personalityTraits : [],
                  visualLibrary: Array.isArray(p.visualLibrary) ? p.visualLibrary : []
                });
              }
            }
          });
        }
      } catch {
        continue;
      }
    }
  }
  return Array.from(personaMap.values());
}

function getLocalStorageRevenue(personaList: Persona[], userId: string): Record<string, RevenueEntry[]> {
  const result: Record<string, RevenueEntry[]> = {};
  for (const p of personaList) {
    const key = `revenue_entries_${p.id}`;
    copyApprovedLegacyValue(key, userId);
    const saved = localStorage.getItem(userStorageKey(key, userId));
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

function getLocalStoragePlans(personaList: Persona[], userId: string): Record<string, Record<string, PlannedPost[]>> {
  const result: Record<string, Record<string, PlannedPost[]>> = {};
  const platforms = ['Instagram', 'TikTok', 'YouTube', 'Twitter', 'LinkedIn'];
  for (const p of personaList) {
    for (const platform of platforms) {
      const keys = [
        `planned_posts_${p.id}_${platform}`,
        `content_plan_${p.id}_${platform}`,
      ];
      for (const key of keys) {
        copyApprovedLegacyValue(key, userId);
        const saved = localStorage.getItem(userStorageKey(key, userId));
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
