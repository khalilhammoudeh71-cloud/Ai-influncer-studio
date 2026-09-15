import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, Image as ImageIcon, Target, Mic, ArrowRight, CheckCircle2, KeyRound, MailCheck } from 'lucide-react';
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

  return (
    <div className="studio-public-theme min-h-screen w-screen overflow-x-hidden bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col relative selection:bg-[var(--accent-primary)] selection:text-[#161108]">

      <nav className="welcome-nav" aria-label="Welcome navigation">
        <a href="#" className="welcome-brand"><img src="/logo.png" alt="" /><span>AI Influencer Studio</span></a>
        <div className="welcome-nav-actions">
          <a href="#features-anchor" className="welcome-how-link">How it works</a>
          <button onClick={() => openAuth('signin')} className="btn-gold-secondary px-5 py-2.5">Sign in</button>
        </div>
      </nav>
      <main className="welcome-main">
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-intro">
            <p className="welcome-kicker"><Sparkles size={16} /> Your creative studio, powered by AI</p>
            <h1 id="welcome-title">An influencer.<br />A world of possibilities.</h1>
            <p className="welcome-description">Create a digital character with a look and personality of their own. Then bring them to life in photos, videos, and voice.</p>
            <div className="welcome-actions">
              <button onClick={() => openAuth('signup')} className="btn-gold-primary px-7 py-3.5">Create your account <ArrowRight size={17} /></button>
              <button onClick={scrollToFeatures} className="welcome-text-button">See how it works <ChevronRight size={16} /></button>
            </div>
            <p className="welcome-note">Start with one character. Build at your own pace.</p>
            <div className="welcome-formats" aria-label="What you can create">
              <span><ImageIcon size={17} /> Photos</span><span><Target size={17} /> Content plans</span><span><Mic size={17} /> Voiceovers</span>
            </div>
          </div>
          <div className="welcome-showcase">
            <figure className="welcome-portrait">
              <img src={SHOWCASE_IMAGES[activeShowcase]} alt={`${SHOWCASE_CAPTIONS[activeShowcase].name}, an example AI influencer`} fetchPriority="high" />
              <span className="welcome-example-label">AI-generated example</span>
              <figcaption><strong>{SHOWCASE_CAPTIONS[activeShowcase].name}</strong><span>{SHOWCASE_CAPTIONS[activeShowcase].niche}</span></figcaption>
            </figure>
            <div className="welcome-photo-selector" aria-label="Choose an example influencer">
              {SHOWCASE_IMAGES.map((src, i) => <button key={src} type="button" aria-label={`Show ${SHOWCASE_CAPTIONS[i].name}`} aria-pressed={activeShowcase === i} onClick={() => setActiveShowcase(i)}><img src={src} alt="" /><span>{SHOWCASE_CAPTIONS[i].name.split(' ')[0]}</span></button>)}
            </div>
          </div>
        </section>
        <section id="features-anchor" className="welcome-workflow" aria-labelledby="workflow-title">
          <div className="welcome-section-heading"><h2 id="workflow-title">From first idea to finished content.</h2><p>Three places to start. Everything stays together in your studio.</p></div>
          <ol className="welcome-steps">
            {[
              {title: 'Meet your influencer', description: 'Choose their appearance, give them a name, and shape their personality. We call this their persona.', image: '/examples/feature_identity.png'},
              {title: 'Make something together', description: 'Describe a photo, write a video idea, or turn a script into a voiceover. Guided controls help you get started.', image: '/examples/feature_voice.png'},
              {title: 'Build your next post', description: 'Find your creations in the Library and organize upcoming content in the Planner.', image: '/examples/feature_planner.png'},
            ].map((step, i) => <li key={step.title}><img src={step.image} alt="" loading="lazy" /><div><span className="welcome-step-number">{i + 1}</span><h3>{step.title}</h3><p>{step.description}</p></div></li>)}
          </ol>
        </section>
        <section className="welcome-closing"><div><h2>Your first character starts here.</h2><p>Give your idea a name, a face, and a voice.</p></div><button onClick={() => openAuth('signup')} className="btn-gold-primary px-7 py-3.5">Create your account <ArrowRight size={17} /></button></section>
      </main>
      <footer className="welcome-footer"><span>AI Influencer Studio</span><span>© {new Date().getFullYear()}</span></footer>

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
