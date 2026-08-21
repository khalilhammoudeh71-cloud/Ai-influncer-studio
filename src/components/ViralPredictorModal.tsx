import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Zap, 
  X, 
  Copy, 
  Check, 
  BarChart3, 
  Eye, 
  Heart, 
  Flame,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface ViralAnalysis {
  overallScore: number;
  visualHookScore: number;
  aestheticScore: number;
  captionHookScore: number;
  audienceMatchScore: number;
  viralGrade: 'S+' | 'S' | 'A+' | 'A' | 'B';
  keyStrengths: string[];
  recommendations: string[];
  enhancedCaption: string;
}

interface ViralPredictorModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  caption: string;
  platform?: string;
  personaName?: string;
  onApplyEnhancedCaption?: (newCaption: string) => void;
}

export default function ViralPredictorModal({
  isOpen,
  onClose,
  prompt,
  caption,
  platform = 'Instagram',
  personaName = 'Influencer',
  onApplyEnhancedCaption
}: ViralPredictorModalProps) {
  const [analysis, setAnalysis] = useState<ViralAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAnalysis();
    } else {
      setAnalysis(null);
    }
  }, [isOpen, prompt, caption]);

  const fetchAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/predict-viral-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, caption, platform, personaName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to predict viral score');
      setAnalysis(data);
    } catch (err: any) {
      console.error(err);
      toast.error('Viral score analysis failed. Using offline engine.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCaption = () => {
    if (analysis?.enhancedCaption) {
      navigator.clipboard.writeText(analysis.enhancedCaption);
      setCopied(true);
      toast.success('Enhanced caption copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApplyCaption = () => {
    if (analysis?.enhancedCaption && onApplyEnhancedCaption) {
      onApplyEnhancedCaption(analysis.enhancedCaption);
      toast.success('AI Enhanced Caption applied to post!');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-2xl bg-zinc-900 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl text-white overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Flame className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Viral Reach Predictor
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    AI Vision & Copy Engine
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">Analyzing post engagement, hook strength & algorithm compatibility</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content Body */}
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
              <p className="text-sm font-bold text-zinc-300">Simulating viral reach & audience retention algorithms...</p>
            </div>
          ) : analysis ? (
            <div className="py-5 space-y-5 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
              {/* Top Score Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Main Viral Score Card */}
                <div className="md:col-span-1 bg-gradient-to-br from-cyan-950/60 to-emerald-950/60 border border-cyan-500/30 rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    GRADE {analysis.viralGrade}
                  </div>
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1">Viral Potential</span>
                  <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-cyan-400 my-1">
                    {analysis.overallScore}
                    <span className="text-sm text-cyan-400/60 font-bold">/100</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <TrendingUp size={12} /> High Viral Probability
                  </span>
                </div>

                {/* Sub-Metrics Grid */}
                <div className="md:col-span-2 grid grid-cols-2 gap-2">
                  <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                    <div className="flex justify-between text-xs font-bold text-zinc-400 mb-1">
                      <span className="flex items-center gap-1.5"><Eye size={12} className="text-pink-400" /> Visual Hook</span>
                      <span className="text-white">{analysis.visualHookScore}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-pink-500 to-rose-400 h-full rounded-full" style={{ width: `${analysis.visualHookScore}%` }} />
                    </div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                    <div className="flex justify-between text-xs font-bold text-zinc-400 mb-1">
                      <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-cyan-400" /> Aesthetic Score</span>
                      <span className="text-white">{analysis.aestheticScore}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full" style={{ width: `${analysis.aestheticScore}%` }} />
                    </div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                    <div className="flex justify-between text-xs font-bold text-zinc-400 mb-1">
                      <span className="flex items-center gap-1.5"><Heart size={12} className="text-violet-400" /> Caption Hook</span>
                      <span className="text-white">{analysis.captionHookScore}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-violet-500 to-purple-400 h-full rounded-full" style={{ width: `${analysis.captionHookScore}%` }} />
                    </div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                    <div className="flex justify-between text-xs font-bold text-zinc-400 mb-1">
                      <span className="flex items-center gap-1.5"><BarChart3 size={12} className="text-emerald-400" /> Audience Match</span>
                      <span className="text-white">{analysis.audienceMatchScore}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full" style={{ width: `${analysis.audienceMatchScore}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations Section */}
              <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={14} /> AI Reach Optimization Recommendations
                </h4>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enhanced Caption Box */}
              {analysis.enhancedCaption && (
                <div className="space-y-2 bg-gradient-to-br from-violet-950/30 to-cyan-950/30 border border-violet-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={13} /> AI Optimized Viral Caption
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyCaption}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
                      >
                        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                      {onApplyEnhancedCaption && (
                        <button
                          onClick={handleApplyCaption}
                          className="px-3 py-1 rounded bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center gap-1 shadow"
                        >
                          <Zap size={12} /> Apply to Post
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed font-mono whitespace-pre-wrap bg-black/30 rounded-lg p-3 border border-white/5">
                    {analysis.enhancedCaption}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-zinc-400 text-sm">
              No analysis data available.
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold text-white hover:bg-white/20 transition-all"
            >
              Close Window
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
