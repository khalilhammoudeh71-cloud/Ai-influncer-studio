import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, Zap, Image as ImageIcon, Target, Mic, Brain, ArrowRight } from 'lucide-react';

interface LandingViewProps {
  onGetStarted: () => void;
  isLoggedIn?: boolean;
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
        style={{ width: 600, height: 600, background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0.08) 50%, transparent 70%)', filter: 'blur(60px)' }}
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
        style={{ width: 500, height: 500, background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0.06) 50%, transparent 70%)', filter: 'blur(50px)' }}
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
        style={{ width: 450, height: 450, background: 'radial-gradient(circle, rgba(236,72,153,0.22) 0%, rgba(168,85,247,0.06) 50%, transparent 70%)', filter: 'blur(55px)' }}
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
        style={{ width: 350, height: 350, background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 60%)', filter: 'blur(40px)' }}
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
        className="absolute rounded-full border border-blue-400/15"
        style={{ width: 250, height: 250, bottom: '20%', right: '15%' }}
        animate={{ scale: [1, 1.8, 1], opacity: [0.12, 0, 0.12] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute rounded-full border border-pink-400/10"
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
          background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.4) 30%, rgba(59,130,246,0.3) 70%, transparent 100%)',
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
          background: 'linear-gradient(90deg, transparent 0%, rgba(236,72,153,0.3) 40%, rgba(139,92,246,0.25) 60%, transparent 100%)',
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
          'rgba(139,92,246,0.7)',
          'rgba(59,130,246,0.6)',
          'rgba(236,72,153,0.5)',
          'rgba(168,85,247,0.6)',
          'rgba(96,165,250,0.5)',
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
          backgroundImage: `linear-gradient(rgba(139,92,246,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.4) 1px, transparent 1px)`,
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
          background: 'linear-gradient(135deg, transparent 42%, rgba(139,92,246,0.06) 48%, rgba(59,130,246,0.04) 52%, transparent 58%)',
        }}
        animate={{ x: ['-30%', '30%'], y: ['-30%', '30%'] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

export default function LandingView({ onGetStarted, isLoggedIn }: LandingViewProps) {
  const [activeShowcase, setActiveShowcase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveShowcase(prev => (prev + 1) % SHOWCASE_IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 80, damping: 18 }
    }
  };

  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-[#06080d] flex flex-col relative selection:bg-[var(--accent-primary)] selection:text-white">

      {/* === Fixed Background Ambience === */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--accent-primary)]/[0.07] blur-[180px]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[50%] h-[50%] rounded-full bg-[var(--accent-secondary)]/[0.05] blur-[160px]" />
      </div>

      {/* === Navigation === */}
      <nav className="relative z-20 w-full max-w-7xl mx-auto px-6 lg:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center shadow-lg shadow-[var(--accent-primary)]/25">
            <Sparkles className="text-white" size={20} />
          </div>
          <span className="font-bold text-lg text-white tracking-tight hidden sm:block">AI Influencer Studio</span>
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <button
              onClick={onGetStarted}
              className="px-5 py-2.5 rounded-full text-sm font-bold bg-white text-[#0a0c12] hover:bg-white/90 transition-all hover:scale-[1.03] active:scale-95 shadow-xl shadow-white/10"
            >
              Go to Dashboard →
            </button>
          ) : (
            <>
              <button
                onClick={onGetStarted}
                className="px-5 py-2 rounded-full text-sm font-semibold text-white/70 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={onGetStarted}
                className="px-5 py-2.5 rounded-full text-sm font-bold bg-white text-[#0a0c12] hover:bg-white/90 transition-all hover:scale-[1.03] active:scale-95 shadow-xl shadow-white/10"
              >
                Get Started Free
              </button>
            </>
          )}
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
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] via-violet-400 to-[var(--accent-secondary)]">
                AI influencer empire.
              </span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-base sm:text-lg text-[var(--text-muted)] max-w-lg leading-relaxed mb-10">
              Generate photorealistic images, orchestrate viral content plans, and clone voices — all from a single studio. No camera, no model, no limits.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4">
              <button
                onClick={onGetStarted}
                className="group flex items-center gap-3 px-7 py-3.5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full text-white font-bold text-base hover:shadow-[0_0_50px_rgba(139,92,246,0.35)] transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                Enter the Studio
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onGetStarted}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-full border border-white/10 bg-white/[0.04] text-white font-semibold text-base hover:bg-white/[0.08] transition-colors backdrop-blur-sm"
              >
                Try for Free
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
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(88,28,135,0.08) 50%, rgba(30,10,60,0.15) 100%)' }}
        >
          <div className="absolute top-[-40%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[var(--accent-primary)]/[0.08] blur-[120px] pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4 relative z-10">Ready to create your first persona?</h2>
          <p className="text-[var(--text-muted)] max-w-lg mx-auto mb-8 relative z-10">Join the studio and start generating photorealistic content in under 60 seconds.</p>
          <button
            onClick={onGetStarted}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-[#0a0c12] rounded-full font-bold text-lg hover:shadow-[0_0_50px_rgba(255,255,255,0.15)] transition-all hover:-translate-y-0.5 relative z-10"
          >
            Get Started — It's Free
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
