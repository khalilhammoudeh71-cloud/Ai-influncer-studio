import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, Zap, Image as ImageIcon, Target, Mic, Brain, ArrowRight, CheckCircle2, KeyRound, MailCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface LandingViewProps {
  onGetStarted: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

function getAuthRedirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const SHOWCASE_IMAGES = [
  '/examples/influencer1.png',
  '/examples/influencer2.png',
  '/examples/influencer3.png',
  '/examples/influencer4.png',
];

const SHOWCASE_CAPTIONS = [
  { name: 'Sophia Laurent', niche: 'Fashion & Luxury', desc: 'Rooftop editorial, golden hour' },
  { name: 'Marcus Vega', niche: 'Lifestyle & Culture', desc: 'Candid café moment, London' },
  { name: 'Elena Moreau', niche: 'Travel & Elegance', desc: 'Parisian suite, Eiffel Tower view' },
  { name: 'Jake Carter', niche: 'Fitness & Wellness', desc: 'Training session, neon gym' },
];

const FEATURE_IMAGES = [
  '/examples/feature_identity.png',
  '/examples/feature_planner.png',
  '/examples/feature_voice.png',
  '/examples/feature_assistant.png',
];

/* ── Animated floating orbs behind hero ── */
function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* ── Large morphing gradient blobs ── */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 600, height: 600, background: 'radial-gradient(circle, rgba(231,196,119,0.24) 0%, rgba(231,196,119,0.06) 50%, transparent 70%)', filter: 'blur(60px)' }}
        animate={{
          x: ['-5%', '12%', '-8%', '-5%'],
          y: ['-8%', '10%', '5%', '-8%'],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ top: '-15%', left: '-8%' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ width: 500, height: 500, background: 'radial-gradient(circle, rgba(242,213,141,0.18) 0%, rgba(242,213,141,0.04) 50%, transparent 70%)', filter: 'blur(50px)' }}
        animate={{
          x: ['8%', '-15%', '5%', '8%'],
          y: ['5%', '-8%', '12%', '5%'],
          scale: [1, 0.85, 1.2, 1],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ top: '10%', right: '-5%' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ width: 450, height: 450, background: 'radial-gradient(circle, rgba(185,150,85,0.16) 0%, rgba(185,150,85,0.04) 50%, transparent 70%)', filter: 'blur(55px)' }}
        animate={{
          x: ['0%', '18%', '-10%', '0%'],
          y: ['0%', '-12%', '8%', '0%'],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ bottom: '5%', left: '20%' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ width: 350, height: 350, background: 'radial-gradient(circle, rgba(231,196,119,0.14) 0%, transparent 60%)', filter: 'blur(40px)' }}
        animate={{
          x: ['10%', '-8%', '15%', '10%'],
          y: ['-5%', '15%', '-3%', '-5%'],
          scale: [0.9, 1.15, 1, 0.9],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ top: '40%', left: '40%' }}
      />

      {/* ── Pulsing rings ── */}
      <motion.div
        className="absolute rounded-full border border-[var(--accent-primary)]/20"
        style={{ width: 300, height: 300, top: '15%', left: '10%' }}
        animate={{ scale: [1, 1.6, 1], opacity: [0.15, 0, 0.15] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full border border-[var(--accent-secondary)]/15"
        style={{ width: 250, height: 250, bottom: '20%', right: '15%' }}
        animate={{ scale: [1, 1.8, 1], opacity: [0.12, 0, 0.12] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute rounded-full border border-[var(--accent-tertiary)]/15"
        style={{ width: 200, height: 200, top: '50%', left: '35%' }}
        animate={{ scale: [1, 2, 1], opacity: [0.1, 0, 0.1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      {/* ── Sweeping light beams ── */}
      <motion.div
        className="absolute"
        style={{
          width: '120%',
          height: 2,
          background: 'linear-gradient(90deg, transparent 0%, rgba(231,196,119,0.32) 30%, rgba(242,213,141,0.22) 70%, transparent 100%)',
          top: '30%',
          left: '-10%',
          filter: 'blur(1px)',
        }}
        animate={{ x: ['-20%', '20%', '-20%'], opacity: [0, 0.6, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute"
        style={{
          width: '100%',
          height: 1.5,
          background: 'linear-gradient(90deg, transparent 0%, rgba(185,150,85,0.25) 40%, rgba(231,196,119,0.2) 60%, transparent 100%)',
          top: '65%',
          left: '0%',
          filter: 'blur(1px)',
        }}
        animate={{ x: ['15%', '-25%', '15%'], opacity: [0, 0.5, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      {/* ── Floating particles (larger & brighter) ── */}
      {Array.from({ length: 35 }).map((_, i) => {
        const size = Math.random() * 5 + 2;
        const colors = [
          'rgba(231,196,119,0.7)',
          'rgba(242,213,141,0.6)',
          'rgba(185,150,85,0.55)',
          'rgba(217,186,114,0.6)',
          'rgba(161,161,170,0.4)',
        ];
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: colors[i % colors.length],
              boxShadow: `0 0 ${size * 3}px ${colors[i % colors.length]}`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -(Math.random() * 80 + 40), 0],
              x: [0, (Math.random() - 0.5) * 60, 0],
              opacity: [0, 1, 0],
              scale: [0.5, 1.2, 0.5],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              delay: Math.random() * 6,
              ease: 'easeInOut',
            }}
          />
        );
      })}

      {/* ── Subtle grid overlay ── */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(231,196,119,0.32) 1px, transparent 1px), linear-gradient(90deg, rgba(231,196,119,0.32) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Diagonal shimmer sweep ── */}
      <motion.div
        className="absolute"
        style={{
          width: '200%',
          height: '200%',
          top: '-50%',
          left: '-50%',
          background: 'linear-gradient(135deg, transparent 42%, rgba(231,196,119,0.05) 48%, rgba(242,213,141,0.03) 52%, transparent 58%)',
        }}
        animate={{ x: ['-30%', '30%'], y: ['-30%', '30%'] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

export default function LandingView({ onGetStarted }: LandingViewProps) {
  const [activeShowcase, setActiveShowcase] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        toast.success('Signed in successfully!');
        setShowAuthModal(false);
        onGetStarted();
      } else if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: getAuthRedirectUrl(),
        });
        if (error) throw error;
        setRecoveryEmail(normalizedEmail);
        setRecoverySent(true);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success('Account created successfully!');
          setShowAuthModal(false);
          onGetStarted();
        } else {
          setConfirmationEmail(normalizedEmail);
        }
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!confirmationEmail) return;
    setResendLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: confirmationEmail,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    });
    setResendLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('A new confirmation link is on its way.');
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      onGetStarted();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthRedirectUrl(),
        },
      });

      if (error) throw error;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Google authentication failed'));
      setGoogleLoading(false);
    }
  };

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setEmail('');
    setPassword('');
    setConfirmationEmail('');
    setRecoveryEmail('');
    setRecoverySent(false);
    setShowAuthModal(true);
  };

  const switchAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setPassword('');
    setConfirmationEmail('');
    setRecoveryEmail('');
    setRecoverySent(false);
  };

  const scrollToFeatures = () => {
    const el = document.getElementById('features-anchor');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveShowcase(prev => (prev + 1) % SHOWCASE_IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 80, damping: 18 }
    }
  };

  return (
    <div className="studio-public-theme min-h-screen w-screen overflow-x-hidden bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col relative selection:bg-[var(--accent-primary)] selection:text-[#161108]">

      {/* === Fixed Background Ambience === */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--accent-primary)]/[0.07] blur-[180px]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[50%] h-[50%] rounded-full bg-[var(--accent-secondary)]/[0.05] blur-[160px]" />
      </div>

      {/* === Navigation === */}
      <nav className="relative z-20 w-full max-w-7xl mx-auto px-6 lg:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl overflow-hidden border border-[#E7C477]/35 shadow-xl shadow-black/50 bg-[#080C14] p-1 flex items-center justify-center">
            <img src="/logo.png" alt="AI Influencer Studio" className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <div className="flex flex-col min-w-0 hidden sm:flex">
            <span className="text-[15px] font-bold text-white tracking-[0.02em] font-['Cinzel',serif] leading-tight">
              AI INFLUENCER
            </span>
            <span className="text-[10px] font-['Montserrat',sans-serif] text-[#D9BA72] tracking-[0.38em] uppercase font-bold mt-0.5">
              STUDIO
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openAuth('signin')}
            className="px-5 py-2 rounded-full text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={() => openAuth('signup')}
            className="btn-gold-primary px-5 py-2.5 text-sm hover:scale-[1.03] active:scale-95 cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* === Hero Section === */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-10 pt-12 lg:pt-20 pb-20">
        {/* Animated visual behind hero */}
        <HeroBackground />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Copy */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-col"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[11px] font-bold uppercase tracking-[0.18em] backdrop-blur-md w-fit mb-7">
              <Zap size={13} />
              The Future of Digital Stardom
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.08] tracking-[-0.02em] mb-6">
              Build your own
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-tertiary)]">
                AI influencer empire.
              </span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-base sm:text-lg text-[var(--text-muted)] max-w-lg leading-relaxed mb-10">
              Generate photorealistic images, orchestrate viral content plans, and clone voices — all from a single studio. No camera, no model, no limits.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => openAuth('signup')}
                className="btn-gold-primary group flex items-center gap-3 px-7 py-3.5 text-base hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                Enter the Studio
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={scrollToFeatures}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-full border border-white/10 bg-white/[0.04] text-white font-semibold text-base hover:bg-white/[0.08] transition-colors backdrop-blur-sm cursor-pointer"
              >
                View Features
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div variants={itemVariants} className="flex items-center gap-8 mt-12 pt-8 border-t border-white/[0.06]">
              <div>
                <p className="text-2xl font-black text-white">246+</p>
                <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">AI Models</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-2xl font-black text-white">∞</p>
                <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Generations</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-2xl font-black text-white">4K</p>
                <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Resolution</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Visual Showcase */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* Main Showcase Image */}
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeShowcase}
                  src={SHOWCASE_IMAGES[activeShowcase]}
                  alt={SHOWCASE_CAPTIONS[activeShowcase].name}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              </AnimatePresence>

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

              {/* Caption */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeShowcase}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="absolute bottom-0 left-0 right-0 p-6"
                >
                  <p className="text-white font-bold text-lg">{SHOWCASE_CAPTIONS[activeShowcase].name}</p>
                  <p className="text-white/60 text-sm mt-0.5">{SHOWCASE_CAPTIONS[activeShowcase].niche} — {SHOWCASE_CAPTIONS[activeShowcase].desc}</p>
                </motion.div>
              </AnimatePresence>

              {/* "AI Generated" Badge */}
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                <Sparkles size={12} className="text-[var(--accent-primary)]" />
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">AI Generated</span>
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="flex gap-3 mt-4">
              {SHOWCASE_IMAGES.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveShowcase(i)}
                  className={`relative flex-1 aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                    i === activeShowcase
                      ? 'border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/25 scale-[1.02]'
                      : 'border-white/10 opacity-50 hover:opacity-80'
                  }`}
                >
                  <img src={src} alt={SHOWCASE_CAPTIONS[i].name} className="w-full h-full object-cover" />
                  {i === activeShowcase && (
                    <div className="absolute inset-0 bg-[var(--accent-primary)]/10" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* === Features Section with Visuals === */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-bold text-[var(--accent-primary)] uppercase tracking-[0.2em] mb-4">Everything You Need</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">One studio. Infinite creators.</h2>
        </motion.div>

        <div className="space-y-20">
          {/* Feature 1: Consistent Identity */}
          <FeatureRow
            image={FEATURE_IMAGES[0]}
            icon={<ImageIcon size={22} />}
            title="Consistent Visual Identity"
            desc="Our unique facial-lock technology analyzes your persona's reference image and ensures they look physically identical in every single scene, outfit, and environment you generate. No more face drift between shots."
            reverse={false}
            delay={0}
          />
          {/* Feature 2: Content Planner */}
          <FeatureRow
            image={FEATURE_IMAGES[1]}
            icon={<Target size={22} />}
            title="Autonomous Content Planner"
            desc="Automatically map out weeks of viral, niche-specific hooks, captions, and posting strategies. The AI builds complete weekly calendars aligned with your persona's brand voice and audience targets."
            reverse={true}
            delay={0.1}
          />
          {/* Feature 3: Voice Cloning */}
          <FeatureRow
            image={FEATURE_IMAGES[2]}
            icon={<Mic size={22} />}
            title="Voice Cloning & Speech"
            desc="Generate natural speech with multiple voice profiles. Script your persona's dialogue, enhance it with AI, and export broadcast-ready audio files in seconds. Ten unique vocal identities."
            reverse={false}
            delay={0.2}
          />
          {/* Feature 4: AI Assistant */}
          <FeatureRow
            image={FEATURE_IMAGES[3]}
            icon={<Brain size={22} />}
            title="Context-Aware AI Assistant"
            desc="Chat with an AI that remembers your persona's niche, content history, voice rules, and visual style. Ask it to brainstorm ideas, write scripts, refine captions, or plan a month of content — instantly."
            reverse={true}
            delay={0.3}
          />
        </div>
      </section>

      {/* === Showcase Gallery === */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-10 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-xs font-bold text-[var(--accent-primary)] uppercase tracking-[0.2em] mb-4">Showcase</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Created entirely with AI</h2>
          <p className="text-[var(--text-muted)] mt-3 max-w-lg mx-auto">Every image below was generated inside the studio. No photographers, no models, no post-production.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {SHOWCASE_IMAGES.map((src, i) => (
            <div key={i} className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/[0.06] hover:border-[var(--accent-primary)]/30 transition-all duration-500">
              <img
                src={src}
                alt={SHOWCASE_CAPTIONS[i].name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <p className="text-white font-bold text-sm">{SHOWCASE_CAPTIONS[i].name}</p>
                <p className="text-white/50 text-xs mt-0.5">{SHOWCASE_CAPTIONS[i].niche}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* === CTA Section === */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] p-12 md:p-16 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(231,196,119,0.12) 0%, rgba(36,36,40,0.88) 50%, rgba(18,18,20,0.96) 100%)' }}
        >
          <div className="absolute top-[-40%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[var(--accent-primary)]/[0.08] blur-[120px] pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4 relative z-10">Ready to create your first persona?</h2>
          <p className="text-[var(--text-muted)] max-w-lg mx-auto mb-8 relative z-10">Join the studio and start generating photorealistic content in under 60 seconds.</p>
          <button
            onClick={() => openAuth('signup')}
            className="btn-gold-primary group inline-flex items-center gap-3 px-8 py-4 text-lg hover:-translate-y-0.5 relative z-10 cursor-pointer"
          >
            Get Started Now
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </section>

      {/* === Footer === */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-10 py-10 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-semibold text-white/60">AI Influencer Studio</span>
        </div>
        <p className="text-xs text-white/30">© {new Date().getFullYear()} All rights reserved.</p>
      </footer>

      {/* Auth Modal overlay */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-dialog-title"
              className="w-full max-w-md bg-[var(--bg-modal)]/95 border border-[var(--border-default)] rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl"
            >
              {/* Glow Orbs inside Modal */}
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-[var(--accent-primary)]/10 blur-xl rounded-full" />
              <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-[var(--accent-secondary)]/10 blur-xl rounded-full" />
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 id="auth-dialog-title" className="text-2xl font-black text-white">
                  {confirmationEmail
                    ? 'Check Your Email'
                    : recoverySent
                      ? 'Reset Link Sent'
                      : authMode === 'signin'
                        ? 'Welcome Back'
                        : authMode === 'signup'
                          ? 'Create Account'
                          : 'Reset Password'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  aria-label="Close authentication dialog"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {confirmationEmail ? (
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 mb-5">
                    <MailCheck size={30} />
                  </div>
                  <p className="text-sm text-white/65 leading-relaxed">
                    We sent a confirmation link to <span className="text-white font-bold break-all">{confirmationEmail}</span>.
                  </p>
                  <p className="text-xs text-white/40 leading-relaxed mt-3 mb-6">
                    Open the email and select the confirmation link. You will return here signed in and ready to create.
                  </p>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendLoading}
                    className="btn-gold-primary w-full py-3.5 text-sm active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? 'Sending...' : 'Resend Confirmation Email'}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchAuthMode('signin')}
                    className="w-full mt-3 py-2.5 text-white/50 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : recoverySent ? (
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/25 text-[var(--accent-primary)] mb-5">
                    <CheckCircle2 size={30} />
                  </div>
                  <p className="text-sm text-white/65 leading-relaxed">
                    If an account exists for <span className="text-white font-bold break-all">{recoveryEmail}</span>, a secure reset link is on its way.
                  </p>
                  <p className="text-xs text-white/40 leading-relaxed mt-3 mb-6">
                    Check your inbox and spam folder. The link will bring you back to create a new password.
                  </p>
                  <button
                    type="button"
                    onClick={() => switchAuthMode('signin')}
                    className="btn-gold-secondary w-full py-3.5 text-sm cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <>
                  {authMode !== 'forgot' && (
                    <>
                      <button
                        type="button"
                        onClick={handleGoogleAuth}
                        disabled={googleLoading || loading}
                        className="relative z-10 w-full py-3.5 rounded-full border border-white/15 bg-white text-[#111827] font-bold text-sm hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                          <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.703-1.568 2.684-3.878 2.684-6.614Z" />
                          <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.836.859-3.047.859-2.344 0-4.328-1.585-5.037-3.715H.955v2.332A9 9 0 0 0 9 18Z" />
                          <path fill="#FBBC05" d="M3.963 10.705A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.168.281-1.705V4.963H.955A9 9 0 0 0 0 9c0 1.452.347 2.827.955 4.037l3.008-2.332Z" />
                          <path fill="#EA4335" d="M9 3.58c1.322 0 2.508.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .955 4.963l3.008 2.332C4.672 5.165 6.656 3.58 9 3.58Z" />
                        </svg>
                        {googleLoading
                          ? 'Connecting to Google...'
                          : authMode === 'signup'
                            ? 'Sign Up with Google'
                            : 'Continue with Google'}
                      </button>

                      <div className="relative z-10 flex items-center gap-3 my-5" aria-hidden="true">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">or use email</span>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>
                    </>
                  )}

                  {authMode === 'forgot' && (
                    <div className="relative z-10 flex items-start gap-3 rounded-2xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/[0.07] p-4 mb-5">
                      <KeyRound size={18} className="text-[var(--accent-primary)] mt-0.5 shrink-0" />
                      <p className="text-xs text-white/55 leading-relaxed">Enter your account email and we will send you a secure password-reset link.</p>
                    </div>
                  )}

                  <form onSubmit={handleAuthSubmit} className="space-y-4 relative z-10">
                    <div>
                      <label htmlFor="auth-email" className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-wider block mb-1.5">Email Address</label>
                      <input
                        id="auth-email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="name@example.com"
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                        className="luxury-input w-full px-4 py-3.5 text-sm"
                      />
                    </div>

                    {authMode !== 'forgot' && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="auth-password" className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-wider">Password</label>
                          {authMode === 'signin' && (
                            <button
                              type="button"
                              onClick={() => switchAuthMode('forgot')}
                              className="text-[10px] font-bold text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] hover:underline cursor-pointer"
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <input
                          id="auth-password"
                          type="password"
                          autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                          required
                          minLength={authMode === 'signup' ? 8 : undefined}
                          placeholder="••••••••"
                          value={password}
                          onChange={event => setPassword(event.target.value)}
                          className="luxury-input w-full px-4 py-3.5 text-sm"
                        />
                        {authMode === 'signup' && <p className="text-[10px] text-white/35 mt-1.5">Use at least 8 characters.</p>}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-gold-primary w-full py-3.5 text-sm active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                      {loading
                        ? 'Processing...'
                        : authMode === 'signin'
                          ? 'Sign In'
                          : authMode === 'signup'
                            ? 'Sign Up'
                            : 'Send Reset Link'}
                    </button>
                  </form>

                  <div className="mt-6 text-center text-xs text-white/60 relative z-10">
                    {authMode === 'signin' ? (
                      <p>
                        Don't have an account?{' '}
                        <button
                          type="button"
                          onClick={() => switchAuthMode('signup')}
                          className="text-[var(--accent-primary)] font-bold hover:text-[var(--accent-secondary)] hover:underline cursor-pointer bg-transparent border-0"
                        >
                          Sign Up
                        </button>
                      </p>
                    ) : (
                      <p>
                        {authMode === 'signup' ? 'Already have an account?' : 'Remember your password?'}{' '}
                        <button
                          type="button"
                          onClick={() => switchAuthMode('signin')}
                          className="text-[var(--accent-primary)] font-bold hover:text-[var(--accent-secondary)] hover:underline cursor-pointer bg-transparent border-0"
                        >
                          Sign In
                        </button>
                      </p>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Feature Row: alternating image + text layout ── */
function FeatureRow({ image, icon, title, desc, reverse, delay }: {
  image: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  reverse: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay, duration: 0.6 }}
      className={`grid grid-cols-1 md:grid-cols-2 gap-10 items-center ${reverse ? 'md:[direction:rtl]' : ''}`}
    >
      {/* Image */}
      <div className={`relative group ${reverse ? 'md:[direction:ltr]' : ''}`}>
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/30">
          <img src={image} alt={title} className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-700" />
          {/* Glow effect behind image */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
        {/* Decorative glow orb */}
        <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-[var(--accent-primary)]/[0.1] blur-[60px] pointer-events-none" />
      </div>

      {/* Text */}
      <div className={`flex flex-col ${reverse ? 'md:[direction:ltr]' : ''}`}>
        <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[var(--accent-primary)] mb-5">
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{title}</h3>
        <p className="text-[var(--text-muted)] text-base leading-relaxed max-w-md">{desc}</p>
      </div>
    </motion.div>
  );
}
