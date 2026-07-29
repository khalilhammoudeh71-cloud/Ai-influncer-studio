import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Users, PlusCircle, MessageSquare, Settings, Wand2, Calendar, ChevronRight, X, Lightbulb } from 'lucide-react';

interface OnboardingTourProps {
  onComplete: () => void;
}

const TOUR_STEPS = [
  {
    title: 'Welcome to AI Influencer Studio',
    description: 'Your all-in-one command center for building, managing, and scaling AI-powered digital personas. Let\u2019s take a quick tour!',
    icon: Sparkles,
    gradient: 'from-violet-600 to-fuchsia-600',
    tip: 'This tour takes 30 seconds. You can skip anytime.',
  },
  {
    title: 'Persona Hub',
    description: 'Create and manage unlimited AI personas. Each persona has its own identity sheet, voice, personality traits, and visual library.',
    icon: Users,
    gradient: 'from-cyan-500 to-blue-600',
    tip: 'Start by creating your first persona with a unique name and niche.',
  },
  {
    title: 'Visual Studio',
    description: 'Generate stunning images and videos using 30+ AI models. Use the identity sheet to maintain 100% face consistency across all content.',
    icon: PlusCircle,
    gradient: 'from-emerald-500 to-teal-600',
    tip: 'Upload a reference image for the best identity-preserving results.',
  },
  {
    title: 'AI Editing Tools',
    description: 'Beautify, body morph, teleport, face swap, virtual try-on, and more. Every tool preserves your persona\u2019s exact identity.',
    icon: Wand2,
    gradient: 'from-amber-500 to-orange-600',
    tip: 'Use the Before/After slider to compare edits instantly.',
  },
  {
    title: 'Content Planner',
    description: 'Generate a 7-day content strategy with hooks, captions, image prompts, and video scripts — all tailored to your persona\u2019s voice.',
    icon: Calendar,
    gradient: 'from-pink-500 to-rose-600',
    tip: 'Click "Generate All Content" after creating a plan to batch-produce every asset.',
  },
  {
    title: 'AI Assistant',
    description: 'Chat with a persona-aware AI that knows your brand voice, content history, and audience. Get instant ideas, scripts, and feedback.',
    icon: MessageSquare,
    gradient: 'from-indigo-500 to-violet-600',
    tip: 'Ask it to brainstorm viral hooks or refine a caption.',
  },
  {
    title: 'You\u2019re All Set!',
    description: 'Your studio is ready. Start by exploring the Personas tab and creating your first AI influencer. The future of digital content starts now.',
    icon: Sparkles,
    gradient: 'from-cyan-500 to-violet-600',
    tip: 'Pro tip: Use Settings \u2192 Theme to switch between Dark and Light mode.',
  },
];

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  }, [isLast, onComplete]);

  const handleSkip = () => {
    onComplete();
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft' && step > 0) setStep(s => s - 1);
      if (e.key === 'Escape') handleSkip();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNext, step]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0B0F17]/95 backdrop-blur-xl">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br ${current.gradient} opacity-10 blur-[120px] rounded-full transition-all duration-700`} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-lg w-full mx-4"
        >
          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute -top-12 right-0 text-xs font-bold text-white/40 hover:text-white transition-colors flex items-center gap-1"
          >
            Skip Tour <X size={14} />
          </button>

          <div className="bg-[#111827]/80 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${current.gradient} flex items-center justify-center shadow-xl`}
                style={{ boxShadow: `0 8px 40px -8px rgba(99, 102, 241, 0.4)` }}
              >
                <current.icon size={28} className="text-white" />
              </div>
            </div>

            {/* Content */}
            <h2 className="text-2xl font-black text-center text-white tracking-tight mb-3">
              {current.title}
            </h2>
            <p className="text-sm text-[#94A3B8] text-center leading-relaxed mb-6 max-w-md mx-auto">
              {current.description}
            </p>

            {/* Tip */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 mb-6">
              <Lightbulb size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-200/70 leading-relaxed">{current.tip}</p>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-6">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step
                      ? 'w-8 bg-gradient-to-r ' + current.gradient
                      : i < step
                      ? 'w-3 bg-white/30'
                      : 'w-3 bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              {step > 0 ? (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:text-white hover:bg-white/5 transition-all"
                >
                  Back
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={handleNext}
                className={`px-8 py-3 rounded-xl bg-gradient-to-r ${current.gradient} text-white font-black text-sm uppercase tracking-wider shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2`}
              >
                {isLast ? 'Start Creating' : 'Next'}
                {!isLast && <ChevronRight size={16} />}
              </button>
            </div>
          </div>

          {/* Step counter */}
          <p className="text-center mt-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">
            Step {step + 1} of {TOUR_STEPS.length}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
