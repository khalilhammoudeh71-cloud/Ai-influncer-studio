import { useState, useEffect, useRef } from 'react';
import {
  User, Bell, Shield, LogOut, Globe, Moon, Sun, Sparkles, HelpCircle, Crown,
  ChevronRight, Camera, Check, Loader2, BarChart3, Image as ImageIcon, Video,
  Calendar, Zap, Server, RefreshCcw, Edit3, X, Key, Star, Trash2, Upload, Plus,
  Heart, Sparkle, Eye, ShieldCheck, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Persona, NavActions, CreatorProfile } from '../types';
import { api } from '../services/apiService';
import { fetchAllModelTypes, ModelInfo } from '../services/imageService';
import { supabase } from '../lib/supabase';
import { useCreatorProfile, saveCreatorProfile } from '../utils/creatorProfile';
import { processImageFile } from '../utils/imageProcessing';
import { accountLocalStorage } from '../utils/accountStorage';
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
  activeTheme?: string;
  setActiveTheme?: (theme: string) => void;
}

const PREF_KEY = 'ai_studio_prefs';

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch { return {}; }
}
function savePrefs(prefs: Record<string, any>) {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
}

type ApiStatus = { openai: boolean; gemini: boolean; wavespeed: boolean; elevenlabs: boolean; database: boolean; databaseConnected: boolean; heygen: boolean };

export default function SettingsView({ nav, personas, user, billingInfo, onBillingUpdate, activeTheme, setActiveTheme }: Props) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('ai_studio_theme') as 'dark' | 'light') || 'dark');

  // Creator Profile State
  const [creatorProfile, updateCreatorProfile] = useCreatorProfile();
  const [creatorName, setCreatorName] = useState(creatorProfile.name);
  const [creatorRole, setCreatorRole] = useState(creatorProfile.role);
  const [creatorAppearance, setCreatorAppearance] = useState(creatorProfile.appearance);
  const [creatorBio, setCreatorBio] = useState(creatorProfile.bio);
  const [creatorGender, setCreatorGender] = useState(creatorProfile.gender || 'Male');
  const [creatorPhotos, setCreatorPhotos] = useState<string[]>(creatorProfile.photos || []);
  const [primaryPhoto, setPrimaryPhoto] = useState<string | undefined>(creatorProfile.primaryPhoto);
  const [customDynamic, setCustomDynamic] = useState(creatorProfile.customDynamic || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingCreatorProfile, setIsSavingCreatorProfile] = useState(false);
  const [showAppearanceGuide, setShowAppearanceGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCreatorName(creatorProfile.name);
    setCreatorRole(creatorProfile.role);
    setCreatorAppearance(creatorProfile.appearance);
    setCreatorBio(creatorProfile.bio);
    setCreatorGender(creatorProfile.gender || 'Male');
    setCreatorPhotos(creatorProfile.photos || []);
    setPrimaryPhoto(creatorProfile.primaryPhoto);
    setCustomDynamic(creatorProfile.customDynamic || '');
  }, [creatorProfile]);

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


  const saveModelPrefs = (imageModel: string, videoModel: string) => {
    savePrefs({ ...loadPrefs(), defaultImageModel: imageModel, defaultVideoModel: videoModel });
    toast.success('Model preferences saved');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingPhoto(true);
    try {
      const newPhotoUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await processImageFile(file, 1024, 0.85);
        newPhotoUrls.push(dataUrl);
      }
      if (newPhotoUrls.length > 0) {
        const mergedPhotos = [...creatorPhotos, ...newPhotoUrls];
        const newPrimary = primaryPhoto || mergedPhotos[0];
        setCreatorPhotos(mergedPhotos);
        setPrimaryPhoto(newPrimary);
        
        // Auto-save to backend to convert base64 into file URLs immediately
        const saved = await updateCreatorProfile({
          name: creatorName.trim() || 'Creator',
          role: creatorRole.trim(),
          appearance: creatorAppearance.trim(),
          bio: creatorBio.trim(),
          gender: creatorGender,
          photos: mergedPhotos,
          primaryPhoto: newPrimary,
          customDynamic: customDynamic.trim(),
        });
        if (saved && Array.isArray(saved.photos)) {
          setCreatorPhotos(saved.photos);
          setPrimaryPhoto(saved.primaryPhoto);
        }
        toast.success(`Uploaded and saved ${newPhotoUrls.length} reference photo${newPhotoUrls.length > 1 ? 's' : ''}!`);
      }
    } catch (err: any) {
      toast.error('Failed to process image: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    const nextPhotos = creatorPhotos.filter(p => p !== photoUrl);
    const nextPrimary = primaryPhoto === photoUrl ? (nextPhotos.length > 0 ? nextPhotos[0] : undefined) : primaryPhoto;
    setCreatorPhotos(nextPhotos);
    setPrimaryPhoto(nextPrimary);
    await updateCreatorProfile({
      photos: nextPhotos,
      primaryPhoto: nextPrimary
    });
  };

  const handleSetPrimaryPhoto = async (photoUrl: string) => {
    setPrimaryPhoto(photoUrl);
    await updateCreatorProfile({
      primaryPhoto: photoUrl
    });
    toast.success('Set as primary reference photo for duo shoots ⭐');
  };

  const handleSaveCreatorIdentity = async () => {
    setIsSavingCreatorProfile(true);
    try {
      const cleanName = creatorName.trim() || 'Creator';
      const updated = await updateCreatorProfile({
        name: cleanName,
        role: creatorRole.trim(),
        appearance: creatorAppearance.trim(),
        bio: creatorBio.trim(),
        gender: creatorGender,
        photos: creatorPhotos,
        primaryPhoto: primaryPhoto || (creatorPhotos.length > 0 ? creatorPhotos[0] : undefined),
        customDynamic: customDynamic.trim(),
      });
      if (updated && Array.isArray(updated.photos)) {
        setCreatorPhotos(updated.photos);
        setPrimaryPhoto(updated.primaryPhoto);
      }
      // Also sync profile name in settings
      savePrefs({ ...loadPrefs(), displayName: cleanName });
      toast.success('Creator Identity & Reference Vault saved! All personas now recognize you.');
    } catch (err: any) {
      toast.error('Failed to save creator profile: ' + (err?.message || ''));
    } finally {
      setIsSavingCreatorProfile(false);
    }
  };

  const StatusDot = ({ ok }: { ok: boolean }) => (
    <div className={`w-2.5 h-2.5 rounded-full ${ok ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-rose-400/60'}`} />
  );

  const APPEARANCE_SUGGESTIONS = [
    'Short dark hair',
    'Athletic build',
    'Sharp facial features',
    'Trimmed beard',
    'Hazel / Brown eyes',
    'Minimalist luxury streetwear',
    'Tailored black blazer',
    'Clean warm lighting'
  ];

  const ROLE_PRESETS = [
    'Creator & Creative Director',
    'Close Intimate Partner',
    'Best Friend & Confidante',
    'Studio Producer & Manager',
    'Creative Collaborator'
  ];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pb-20 select-none">
      <div className="p-6 max-w-3xl mx-auto space-y-8">
        {/* ── Header ── */}
        <header className="border-b border-[#E7C477]/10 pb-4">
          <h1 className="text-3xl md:text-4xl font-serif text-[#F5F1E8] tracking-tight flex items-center gap-3">
            Settings
            <span className="text-[#E7C477] text-xl font-normal">✨</span>
          </h1>
          <p className="text-xs md:text-sm text-[#8C909A] mt-1 font-sans">Manage your studio, creator identity, preferences, and integrations.</p>
        </header>

        {/* ── Creator Identity & Reference Vault Card ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-card rounded-2xl p-6 relative overflow-hidden space-y-6 border border-[#E7C477]/20"
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, rgba(231,196,119,0.08) 0%, transparent 70%)' }} />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7C477]/15 pb-5">
            <div className="flex items-center gap-4">
              {/* Creator Avatar Preview */}
              <div className="relative group">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-[#E7C477] via-[#D4AF37] to-[#B99655] flex items-center justify-center text-zinc-950 font-bold shadow-lg shadow-amber-950/40 border-2 border-[#E7C477]/40 shrink-0">
                  {primaryPhoto ? (
                    <img 
                      src={primaryPhoto} 
                      alt="Creator" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (primaryPhoto.startsWith('/uploads/') && !target.dataset.retried) {
                          target.dataset.retried = 'true';
                          target.src = '/api' + primaryPhoto;
                        } else if (!target.dataset.fallback) {
                          target.dataset.fallback = 'true';
                          target.src = '/logo.png';
                        }
                      }}
                    />
                  ) : (
                    <User size={28} className="text-zinc-950/90" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#E7C477] hover:bg-[#F2D58D] text-zinc-950 shadow-md transition-transform active:scale-90 cursor-pointer"
                  title="Upload creator photo"
                >
                  <Camera size={11} />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {creatorName || 'Creator Profile'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#E7C477]/15 text-[#F2D58D] border border-[#E7C477]/30 flex items-center gap-1">
                    <Sparkles size={10} className="text-[#E7C477]" /> Universal Sync
                  </span>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  All personas recognize your appearance, role, and dynamic for personalized conversations & duo photo shoots.
                </p>
              </div>
            </div>

            <button
              onClick={handleSaveCreatorIdentity}
              disabled={isSavingCreatorProfile}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E7C477] to-amber-500 hover:from-[#F2D58D] hover:to-amber-400 text-zinc-950 text-xs font-bold tracking-wide transition-all shadow-md shadow-amber-950/40 border border-[#E7C477]/40 flex items-center justify-center gap-1.5 shrink-0 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSavingCreatorProfile ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Save Creator Identity</span>
            </button>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Preferred Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center justify-between">
                <span>Creator Name / Nickname</span>
                <span className="text-[10px] text-[#E7C477] font-normal lowercase">how personas address you</span>
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={e => setCreatorName(e.target.value)}
                placeholder="e.g., Dr. H, Alex, Chris"
                className="w-full bg-[var(--bg-elevated)] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E7C477]/60 focus:ring-1 focus:ring-[#E7C477]/40 transition-all font-medium"
              />
            </div>

            {/* Role & Dynamic */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center justify-between">
                <span>Relationship & Role</span>
                <span className="text-[10px] text-[#E7C477] font-normal lowercase">your dynamic with personas</span>
              </label>
              <input
                type="text"
                value={creatorRole}
                onChange={e => setCreatorRole(e.target.value)}
                placeholder="e.g., Creator & Director, Close Partner, Best Friend"
                className="w-full bg-[var(--bg-elevated)] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E7C477]/60 focus:ring-1 focus:ring-[#E7C477]/40 transition-all font-medium"
              />
            </div>
          </div>

          {/* Quick Role Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-[var(--text-muted)] self-center mr-1">Quick Presets:</span>
            {ROLE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCreatorRole(preset)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                  creatorRole === preset
                    ? 'bg-[#E7C477]/15 text-[#F2D58D] border border-[#E7C477]/40 shadow-sm shadow-amber-950/30'
                    : 'bg-white/5 text-[var(--text-tertiary)] hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Physical Appearance Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Camera size={12} className="text-[#E7C477]" /> Physical Appearance & Visual Prompts
              </label>
              <span className="text-[10px] text-zinc-400 font-medium">Used for AI Duo Photoshoots & Solo Shots</span>
            </div>
            <textarea
              rows={2}
              value={creatorAppearance}
              onChange={e => setCreatorAppearance(e.target.value)}
              placeholder="Describe your physical features (e.g., Male in 30s, short textured dark hair, trimmed stubble, hazel eyes, sharp jawline, athletic build, chic streetwear style)..."
              className="w-full bg-[var(--bg-elevated)] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E7C477]/60 focus:ring-1 focus:ring-[#E7C477]/40 transition-all font-medium resize-none leading-relaxed"
            />
            {/* Quick Appearance Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">Add Trait:</span>
              {APPEARANCE_SUGGESTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (!creatorAppearance.includes(tag)) {
                      setCreatorAppearance(prev => prev ? `${prev}, ${tag}` : tag);
                    }
                  }}
                  className="px-2 py-0.5 rounded-md text-[10px] bg-white/5 hover:bg-[#E7C477]/15 text-zinc-300 hover:text-[#F2D58D] border border-white/5 hover:border-[#E7C477]/30 transition-all cursor-pointer"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Bio & Aesthetic Vision */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Creator Bio & Lifestyle Vibe
            </label>
            <input
              type="text"
              value={creatorBio}
              onChange={e => setCreatorBio(e.target.value)}
              placeholder="e.g., Studio founder, visual artist, lover of architecture, travel, and high-fashion editorial aesthetics"
              className="w-full bg-[var(--bg-elevated)] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E7C477]/60 focus:ring-1 focus:ring-[#E7C477]/40 transition-all font-medium"
            />
          </div>

          {/* Reference Photos Vault */}
          <div className="space-y-3 pt-2 border-t border-[#E7C477]/15">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-[#E7C477]" /> Reference Headshots & Photos Vault ({creatorPhotos.length})
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Upload photos of yourself. Mark your favorite as <strong className="text-[#E7C477]">Primary ⭐</strong> to automatically use in Duo Shots & Crossover Shoots.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="px-3 py-1.5 rounded-lg bg-[#E7C477]/15 hover:bg-[#E7C477]/25 border border-[#E7C477]/30 text-[#F2D58D] hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isUploadingPhoto ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                <span>Upload Photos</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* Photo Grid */}
            {creatorPhotos.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {creatorPhotos.map((photoUrl, idx) => {
                  const isPrimary = primaryPhoto === photoUrl || (!primaryPhoto && idx === 0);
                  return (
                    <div
                      key={idx}
                      className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        isPrimary
                          ? 'border-[#E7C477] shadow-md shadow-amber-950/40'
                          : 'border-white/10 hover:border-[#E7C477]/50'
                      }`}
                    >
                      <img 
                        src={photoUrl} 
                        alt={`Creator ref ${idx + 1}`} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          // If /uploads/ path failed via root, retry via /api/uploads/
                          const target = e.currentTarget;
                          if (photoUrl.startsWith('/uploads/') && !target.dataset.retried) {
                            target.dataset.retried = 'true';
                            target.src = '/api' + photoUrl;
                          } else if (!target.dataset.fallback) {
                            target.dataset.fallback = 'true';
                            target.src = '/logo.png';
                          }
                        }}
                      />
                      
                      {/* Overlay Controls */}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 backdrop-blur-[2px]">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(photoUrl)}
                            className="p-1 rounded-md bg-black/70 text-zinc-300 hover:text-rose-400 hover:bg-rose-500/20 transition-all"
                            title="Delete photo"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSetPrimaryPhoto(photoUrl)}
                          className={`w-full py-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            isPrimary
                              ? 'bg-[#E7C477] text-zinc-950'
                              : 'bg-white/20 text-white hover:bg-[#E7C477] hover:text-zinc-950'
                          }`}
                        >
                          <Star size={10} className={isPrimary ? 'fill-zinc-950' : ''} />
                          {isPrimary ? 'Primary' : 'Set Primary'}
                        </button>
                      </div>

                      {/* Primary Badge on Card */}
                      {isPrimary && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-[#E7C477] text-zinc-950 text-[8px] font-black uppercase tracking-wider shadow-sm flex items-center gap-0.5 pointer-events-none">
                          <Star size={8} className="fill-zinc-950" /> Primary
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 hover:border-[#E7C477]/40 rounded-xl p-6 text-center cursor-pointer transition-all bg-white/[0.02] hover:bg-[#E7C477]/[0.03] space-y-2"
              >
                <div className="w-10 h-10 rounded-full bg-[#E7C477]/10 text-[#E7C477] mx-auto flex items-center justify-center">
                  <Upload size={18} />
                </div>
                <p className="text-xs font-semibold text-zinc-300">Click to upload your headshots & portraits</p>
                <p className="text-[10px] text-zinc-500">Supports JPG, PNG, WebP, HEIC. Upload 1 to 5 clear face/body portraits.</p>
              </div>
            )}
          </div>
        </motion.section>

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

        {/* ── Theme & Visual Aesthetics ── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] ml-4 mb-3 flex items-center gap-1.5">
            <Sparkles size={12} className="text-cyan-400" /> Studio Color Theme & Aesthetics
          </h3>
          <div className="premium-card rounded-2xl p-5 space-y-4">
            <p className="text-xs text-[var(--text-tertiary)]">
              Choose your studio workspace color palette. Theme preferences are saved to your browser automatically.
            </p>

            {/* 9 Preset Color Themes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'mint', name: 'Matrix Mint', desc: 'Dark Teal & Matrix Green', dot: 'bg-teal-400', border: 'border-teal-500' },
                { id: 'cyber', name: 'Electric Cyber', desc: 'Neon Cyan & Electric Blue', dot: 'bg-cyan-400', border: 'border-cyan-500' },
                { id: 'graphite', name: 'Graphite Slate', desc: 'Smooth Executive Gray', dot: 'bg-slate-400', border: 'border-slate-400' },
                { id: 'emerald', name: 'Slate Emerald', desc: 'Deep Emerald & Mint', dot: 'bg-emerald-400', border: 'border-emerald-500' },
                { id: 'violet', name: 'Imperial Violet', desc: 'Royal Purple & Indigo', dot: 'bg-purple-400', border: 'border-purple-500' },
                { id: 'gold', name: 'Midnight Gold', desc: 'Obsidian & Gold Accents', dot: 'bg-amber-400', border: 'border-amber-500' },
                { id: 'rosegold', name: 'Rose Gold Velvet', desc: 'Rose Gold & Fashion Pink', dot: 'bg-rose-400', border: 'border-rose-500' },
                { id: 'light-luxe', name: 'Platinum Slate', desc: 'Crisp Alabaster (Light)', dot: 'bg-indigo-500', border: 'border-indigo-500' },
                { id: 'light-pearl', name: 'Champagne Pearl', desc: 'Warm Ivory & Gold (Light)', dot: 'bg-amber-500', border: 'border-amber-500' },
              ].map((t) => {
                const isActive = (activeTheme || localStorage.getItem('ai_studio_theme') || 'mint') === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (setActiveTheme) setActiveTheme(t.id);
                      document.documentElement.setAttribute('data-theme', t.id);
                      localStorage.setItem('ai_studio_theme', t.id);
                      toast.success(`Studio theme set to ${t.name}`);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isActive
                        ? `bg-white/[0.07] ${t.border} text-white shadow-lg shadow-cyan-500/10`
                        : 'bg-white/[0.02] border-white/10 text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full ${t.dot} shrink-0 mt-0.5 shadow-md`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{t.name}</span>
                        {isActive && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">{t.desc}</p>
                    </div>
                  </div>
                );
              })}
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
                  personas.forEach(p => accountLocalStorage.removeItem(`chat_history_${p.id}`));
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
