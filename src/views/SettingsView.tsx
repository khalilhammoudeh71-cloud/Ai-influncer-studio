import { useState, useEffect } from 'react';
import {
  User, Bell, Shield, LogOut, Globe, Moon, Sun, Sparkles, HelpCircle, Crown,
  ChevronRight, Camera, Check, Loader2, BarChart3, Image as ImageIcon, Video,
  Calendar, Zap, Server, RefreshCcw, Edit3, X, Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Persona, NavActions } from '../types';
import { api } from '../services/apiService';
import { fetchAllModelTypes, ModelInfo } from '../services/imageService';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Props {
  nav: NavActions;
  personas: Persona[];
  user: any;
  billingInfo: {
    email: string;
    subscriptionStatus: string;
    credits: number;
    stripeCustomerId?: string;
    subscriptionPriceId?: string;
    isCreator?: boolean;
  } | null;
  onBillingUpdate: () => void;
}

const PREF_KEY = 'ai_studio_prefs';

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch { return {}; }
}
function savePrefs(prefs: Record<string, any>) {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
}

type ApiStatus = { openai: boolean; gemini: boolean; wavespeed: boolean; elevenlabs: boolean; database: boolean; databaseConnected: boolean; heygen: boolean };

export default function SettingsView({ nav, personas, user, billingInfo, onBillingUpdate }: Props) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('ai_studio_theme') as 'dark' | 'light') || 'dark');

  // Profile
  const [profileName, setProfileName] = useState<string>(() => loadPrefs().displayName || user?.email?.split('@')[0] || 'Creator');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profileName);

  // Model prefs
  const [editModels, setEditModels] = useState<ModelInfo[]>([]);
  const [videoModels, setVideoModels] = useState<ModelInfo[]>([]);
  const [defaultImageModel, setDefaultImageModel] = useState<string>(() => loadPrefs().defaultImageModel || '');
  const [defaultVideoModel, setDefaultVideoModel] = useState<string>(() => loadPrefs().defaultVideoModel || '');
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // API status
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // HeyGen key
  const [heygenKeyInput, setHeygenKeyInput] = useState<string>(() => loadPrefs().heygenApiKey || '');

  // Stripe loading state
  const [stripeLoading, setStripeLoading] = useState<string | null>(null);

  const saveHeygenKey = () => {
    savePrefs({ ...loadPrefs(), heygenApiKey: heygenKeyInput.trim() });
    toast.success('HeyGen API key saved!');
    checkApiStatus();
  };

  const handleCheckout = async (priceId: string, type: 'subscription' | 'credits') => {
    setStripeLoading(priceId);
    try {
      const res = await api.billing.createCheckout(priceId, type);
      if (res?.url) {
        window.location.href = res.url;
      } else {
        toast.error('Failed to retrieve checkout redirect link.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Checkout failed');
    } finally {
      setStripeLoading(null);
    }
  };

  const handlePortal = async () => {
    setStripeLoading('portal');
    try {
      const res = await api.billing.portal();
      if (res?.url) {
        window.location.href = res.url;
      } else {
        toast.error('Failed to retrieve customer portal link.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Portal redirect failed');
    } finally {
      setStripeLoading(null);
    }
  };

  // Computed stats
  const totalImages = personas.reduce((sum, p) => sum + (p.visualLibrary?.filter(i => !i.mediaType || i.mediaType === 'image').length || 0), 0);
  const totalVideos = personas.reduce((sum, p) => sum + (p.visualLibrary?.filter(i => i.mediaType === 'video').length || 0), 0);
  const totalAssets = totalImages + totalVideos;

  useEffect(() => {
    fetchAllModelTypes().then(({ editModels: em, videoModels: vm }) => {
      setEditModels(em);
      setVideoModels(vm);
      if (!defaultImageModel && em.length > 0) setDefaultImageModel(em[0].id);
      if (!defaultVideoModel && vm.length > 0) setDefaultVideoModel(vm[0].id);
      setModelsLoaded(true);
    }).catch(() => setModelsLoaded(true));

    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    setLoadingStatus(true);
    const status = await api.getConfigStatus();
    const clientKey = loadPrefs().heygenApiKey;
    const fullStatus: ApiStatus = {
      ...status,
      heygen: !!clientKey
    };
    setApiStatus(fullStatus);
    setLoadingStatus(false);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('ai_studio_theme', next);
    document.documentElement.setAttribute('data-theme', next === 'light' ? 'light' : '');
  };

  const saveName = () => {
    const trimmed = nameInput.trim() || 'Creator';
    setProfileName(trimmed);
    savePrefs({ ...loadPrefs(), displayName: trimmed });
    setEditingName(false);
    toast.success('Name updated!');
  };

  const saveModelPrefs = (imageModel: string, videoModel: string) => {
    savePrefs({ ...loadPrefs(), defaultImageModel: imageModel, defaultVideoModel: videoModel });
    toast.success('Model preferences saved');
  };

  const StatusDot = ({ ok }: { ok: boolean }) => (
    <div className={`w-2.5 h-2.5 rounded-full ${ok ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-rose-400/60'}`} />
  );

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pb-20">
      <div className="p-6 max-w-2xl mx-auto space-y-8">
        {/* ── Header ── */}
        <header className="premium-header pt-6 pb-2">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="gradient-text">Settings</span>
          </h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-1.5 font-medium">Manage your studio, preferences, and integrations</p>
        </header>

        {/* ── Profile Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-card rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top left, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)', boxShadow: '0 4px 20px -4px rgba(139,92,246,0.5)' }}>
            <User size={26} className="text-white" />
          </div>
          <div className="flex-1 min-w-0 relative z-10">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  className="bg-[var(--bg-elevated)] border border-violet-500/50 rounded-lg px-3 py-1.5 text-sm text-white font-bold outline-none focus:ring-1 focus:ring-violet-500 w-40"
                />
                <button onClick={saveName} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"><Check size={14} /></button>
                <button onClick={() => setEditingName(false)} className="p-1.5 bg-white/5 text-[var(--text-muted)] rounded-lg hover:bg-white/10 transition-colors"><X size={14} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[var(--text-primary)]">{profileName}</h3>
                {billingInfo && (billingInfo.subscriptionStatus === 'active' || billingInfo.subscriptionStatus === 'trialing') ? (
                  <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                    <Crown size={9} className="text-amber-400" />
                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Pro</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Free</span>
                  </div>
                )}
                <button onClick={() => { setNameInput(profileName); setEditingName(true); }} className="p-1 rounded-md text-[var(--text-muted)] hover:text-violet-400 transition-colors">
                  <Edit3 size={12} />
                </button>
              </div>
            )}
            <p className="text-[var(--text-tertiary)] text-xs mt-0.5">{user?.email || 'Creator'}</p>
            <p className="text-[var(--text-tertiary)] text-[10px] mt-0.5 opacity-60">{personas.length} persona{personas.length !== 1 ? 's' : ''} · {totalAssets} assets in vault</p>
          </div>
        </motion.div>

        {/* ── Billing & Subscription Card ── */}
        <motion.section 
          initial={{ opacity: 0, y: 12 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.08 }}
          className="premium-card rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at bottom right, rgba(0,212,255,0.06) 0%, transparent 70%)' }} />
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-subtle)] pb-5 mb-5">
            <div>
              <h3 className="text-sm font-black text-white tracking-wider uppercase mb-1 flex items-center gap-1.5">
                <Crown size={14} className="text-amber-400" /> Billing & Plan
              </h3>
              <p className="text-xs text-[var(--text-tertiary)]">Manage payments, credits, and active subscriptions</p>
            </div>
            
            {billingInfo ? (
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Active Plan</p>
                <p className="text-sm font-extrabold text-white">
                  {billingInfo.subscriptionStatus === 'active' || billingInfo.subscriptionStatus === 'trialing' ? 'Pro Influencer ($29/mo)' : 'Free Tier'}
                </p>
              </div>
            ) : (
              <div className="w-20 h-5 bg-white/5 rounded animate-pulse" />
            )}
          </div>

          {billingInfo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Left Column: Credits Status */}
              <div className="space-y-4">
                <div className="bg-[#111827]/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest leading-none mb-1">
                      {billingInfo.isCreator ? "Available Balance (USD)" : "Available Balance"}
                    </p>
                    <p className="text-3xl font-black text-white">
                      {billingInfo.isCreator ? `$${(billingInfo.credits / 100).toFixed(2)}` : billingInfo.credits}
                    </p>
                    <p className="text-[9px] text-[var(--text-muted)] mt-1 font-medium">
                      {billingInfo.isCreator ? "USD spent on image/video/speech gens" : "Credits spent on image/video/speech gens"}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                    <Zap size={20} />
                  </div>
                </div>

                {/* Buy Add-on Packs */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Top Up Credits</p>
                  <div className="flex gap-2">
                    <button
                      disabled={!!stripeLoading}
                      onClick={() => handleCheckout('price_100_credits_placeholder', 'credits')}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {stripeLoading === 'price_100_credits_placeholder' ? 'Loading...' : '+100 Credits ($5)'}
                    </button>
                    <button
                      disabled={!!stripeLoading}
                      onClick={() => handleCheckout('price_500_credits_placeholder', 'credits')}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {stripeLoading === 'price_500_credits_placeholder' ? 'Loading...' : '+500 Credits ($19)'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Plan Management */}
              <div className="space-y-4">
                <div className="bg-[#111827]/40 border border-white/5 rounded-2xl p-4 space-y-3">
                  {billingInfo.subscriptionStatus === 'active' || billingInfo.subscriptionStatus === 'trialing' ? (
                    <>
                      <p className="text-xs text-[var(--text-primary)] font-semibold">Your Pro subscription is active.</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">Cancel/modify your payment method, view invoice history, and manage details inside Stripe portal.</p>
                      <button
                        disabled={!!stripeLoading}
                        onClick={handlePortal}
                        className="w-full py-2.5 bg-[#00D4FF]/10 hover:bg-[#00D4FF]/20 border border-[#00D4FF]/20 text-[#00D4FF] rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {stripeLoading === 'portal' ? 'Redirecting...' : 'Manage via Stripe Portal'}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-[var(--text-primary)] font-semibold">Unlock full capacity with Pro.</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">Subscribe to get 1,000 monthly credits, high-speed priority visual processing, HD videos, and premium HeyGen avatars.</p>
                      <button
                        disabled={!!stripeLoading}
                        onClick={() => handleCheckout('price_monthly_sub_placeholder', 'subscription')}
                        className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-violet-500/10 cursor-pointer disabled:opacity-50"
                      >
                        {stripeLoading === 'price_monthly_sub_placeholder' ? 'Loading...' : 'Subscribe for $29/mo'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.section>

        {/* ── Usage Stats ── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] ml-4 mb-3">Your Studio Stats</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: User, label: 'Personas', value: personas.length, color: 'text-violet-400', bg: 'from-violet-500/10' },
              { icon: ImageIcon, label: 'Images', value: totalImages, color: 'text-emerald-400', bg: 'from-emerald-500/10' },
              { icon: Video, label: 'Videos', value: totalVideos, color: 'text-cyan-400', bg: 'from-cyan-500/10' },
              { icon: BarChart3, label: 'Total Assets', value: totalAssets, color: 'text-amber-400', bg: 'from-amber-500/10' },
            ].map(stat => (
              <div key={stat.label} className={`premium-card rounded-2xl p-4 bg-gradient-to-br ${stat.bg} to-transparent`}>
                <stat.icon size={18} className={`${stat.color} mb-2`} />
                <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Theme & Display ── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] ml-4 mb-3">Display</h3>
          <div className="premium-card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 border border-[var(--border-subtle)] rounded-xl flex items-center justify-center">
                  {theme === 'dark' ? <Moon size={18} className="text-[var(--text-secondary)]" /> : <Sun size={18} className="text-amber-400" />}
                </div>
                <span className="font-medium text-sm text-[var(--text-primary)]">Theme</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-tertiary)]">{theme === 'dark' ? 'Dark' : 'Light'}</span>
                <div
                  onClick={toggleTheme}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 cursor-pointer ${theme === 'dark' ? 'bg-violet-600' : 'bg-amber-400'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${theme === 'light' ? 'translate-x-5' : 'translate-x-0'}`}>
                    {theme === 'dark' ? <Moon size={10} className="text-violet-600" /> : <Sun size={10} className="text-amber-500" />}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 border border-[var(--border-subtle)] rounded-xl flex items-center justify-center">
                  <Globe size={18} className="text-[var(--text-secondary)]" />
                </div>
                <span className="font-medium text-sm text-[var(--text-primary)]">Language</span>
              </div>
              <span className="text-xs text-[var(--text-tertiary)]">English</span>
            </div>
          </div>
        </motion.section>

        {/* ── Default Model Preferences ── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] ml-4 mb-3">Default AI Models</h3>
          <div className="premium-card rounded-2xl p-5 space-y-4">
            <p className="text-xs text-[var(--text-tertiary)]">These models are used as defaults in Create Studio and the AI Assistant when no specific model is selected.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-violet-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <ImageIcon size={10} /> Default Image Model
                </label>
                <select
                  value={defaultImageModel}
                  disabled={!modelsLoaded}
                  onChange={e => {
                    setDefaultImageModel(e.target.value);
                    saveModelPrefs(e.target.value, defaultVideoModel);
                  }}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 transition-colors disabled:opacity-50"
                >
                  {editModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Video size={10} /> Default Video Model
                </label>
                <select
                  value={defaultVideoModel}
                  disabled={!modelsLoaded}
                  onChange={e => {
                    setDefaultVideoModel(e.target.value);
                    saveModelPrefs(defaultImageModel, e.target.value);
                  }}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
                >
                  {videoModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            {!modelsLoaded && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Loader2 size={12} className="animate-spin" /> Loading models from server…
              </div>
            )}
          </div>
        </motion.section>

        {/* ── HeyGen AI Integration ── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] ml-4 mb-3">HeyGen AI Integration</h3>
          <div className="premium-card rounded-2xl p-5 space-y-4">
            <p className="text-xs text-[var(--text-tertiary)]">HeyGen is specialized in highly photorealistic talking avatars. Add your personal HeyGen API Key below to enable it in the Talking Head Studio.</p>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-violet-400 uppercase tracking-wider block flex items-center gap-1.5">
                <Key size={10} /> HeyGen API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Enter your HeyGen API Key..."
                  value={heygenKeyInput}
                  onChange={e => setHeygenKeyInput(e.target.value)}
                  className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50 transition-colors"
                />
                <button
                  onClick={saveHeygenKey}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 text-xs font-bold rounded-xl text-white transition-all shadow-lg shadow-violet-500/15 shrink-0"
                >
                  Save
                </button>
              </div>
              {loadPrefs().heygenApiKey && (
                <p className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                  <Check size={10} /> API key is saved locally
                </p>
              )}
            </div>
          </div>
        </motion.section>

        {/* ── API / Service Status ── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-3 ml-4">
            <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">Service Status</h3>
            <button
              onClick={checkApiStatus}
              disabled={loadingStatus}
              className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)] hover:text-white transition-colors"
            >
              <RefreshCcw size={11} className={loadingStatus ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
          <div className="premium-card rounded-2xl overflow-hidden">
            {[
              { key: 'gemini', label: 'Google Gemini', desc: 'Chat, content generation' },
              { key: 'openai', label: 'OpenAI', desc: 'TTS, fallback generation' },
              { key: 'wavespeed', label: 'WaveSpeed AI', desc: 'Image & video generation' },
              { key: 'elevenlabs', label: 'ElevenLabs', desc: 'Voice synthesis' },
              { key: 'heygen', label: 'HeyGen AI', desc: 'Talking avatar generation' },
              { key: 'databaseConnected', label: 'Database', desc: 'Personas, images, plans' },
            ].map((svc, idx, arr) => (
              <div
                key={svc.key}
                className={`flex items-center justify-between p-4 ${idx !== arr.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 border border-[var(--border-subtle)] rounded-xl flex items-center justify-center">
                    <Server size={16} className="text-[var(--text-secondary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{svc.label}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{svc.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {loadingStatus ? (
                    <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />
                  ) : apiStatus ? (
                    <>
                      <StatusDot ok={!!(apiStatus as any)[svc.key]} />
                      <span className={`text-[10px] font-bold ${(apiStatus as any)[svc.key] ? 'text-emerald-400' : 'text-rose-400/70'}`}>
                        {(apiStatus as any)[svc.key] ? 'Connected' : 'Not configured'}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)]">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Support / Dev ── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] ml-4 mb-3">Support & Account</h3>
          <div className="premium-card rounded-2xl overflow-hidden">
            {[
              {
                icon: Sparkles,
                label: 'View Landing Page',
                desc: 'Replay the onboarding flow',
                onClick: () => { localStorage.removeItem('ai_influencer_onboarding_complete'); window.location.reload(); }
              },
              {
                icon: HelpCircle,
                label: 'Replay Feature Tour',
                desc: 'Walk through all features again',
                onClick: () => { localStorage.removeItem('ai_influencer_tour_complete'); localStorage.removeItem('ai_influencer_onboarding_complete'); window.location.reload(); }
              },
              {
                icon: LogOut,
                label: 'Clear All Chat History',
                desc: 'Remove stored conversations from all personas',
                onClick: () => {
                  personas.forEach(p => localStorage.removeItem(`chat_history_${p.id}`));
                  toast.success('All chat history cleared');
                }
              },
              {
                icon: LogOut,
                label: 'Sign Out',
                desc: 'Log out of your account',
                color: 'text-rose-400',
                onClick: () => {
                  localStorage.setItem('force_landing', 'true');
                  supabase.auth.signOut().then(() => {
                    toast.success('Signed out successfully');
                    window.location.reload();
                  });
                }
              },
            ].map((item, idx, arr) => (
              <div
                key={item.label}
                onClick={item.onClick}
                className={`flex items-center justify-between p-4 hover:bg-[var(--bg-elevated)] transition-all duration-200 cursor-pointer ${idx !== arr.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 border border-[var(--border-subtle)] rounded-xl flex items-center justify-center">
                    <item.icon size={18} className={item.color || 'text-[var(--text-secondary)]'} />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${item.color || 'text-[var(--text-primary)]'}`}>{item.label}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{item.desc}</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-[var(--text-muted)]" />
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Footer ── */}
        <div className="pt-4 text-center">
          <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">AI Influencer Studio v1.1.0</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 italic opacity-60">Made for the future of digital presence.</p>
        </div>
      </div>
    </div>
  );
}
