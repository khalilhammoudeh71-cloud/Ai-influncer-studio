import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Sparkles, Flame, Shield, Award, Lock, CheckCircle2, 
  ChevronRight, X, MessageSquare, Mic, Star, Smile
} from 'lucide-react';
import { RelationshipState, RelationshipStage, RelationshipMood } from '../types';

export const STAGE_CONFIG: Record<RelationshipStage, {
  level: number;
  title: string;
  minScore: number;
  maxScore: number;
  icon: any;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  description: string;
  perks: string[];
}> = {
  acquaintance: {
    level: 1,
    title: 'Acquaintance',
    minScore: 0,
    maxScore: 20,
    icon: Smile,
    color: '#81D4FA',
    badgeBg: 'rgba(129, 212, 250, 0.12)',
    badgeBorder: 'rgba(129, 212, 250, 0.3)',
    description: 'Initial connection & creative alignment.',
    perks: ['Standard chat banter', 'Basic photo shoots', 'Standard voice calls']
  },
  partner: {
    level: 2,
    title: 'Creative Partner',
    minScore: 21,
    maxScore: 45,
    icon: Sparkles,
    color: '#E7C477',
    badgeBg: 'rgba(231, 196, 119, 0.15)',
    badgeBorder: 'rgba(231, 196, 119, 0.4)',
    description: 'Shared creative chemistry, playful teasing & mutual trust.',
    perks: ['Playful banter & sarcasm', 'Duo photoshoot access', 'Spontaneous audio memos', 'Expanded wardrobe perks']
  },
  confidante: {
    level: 3,
    title: 'Close Confidante',
    minScore: 46,
    maxScore: 70,
    icon: Flame,
    color: '#FF8A65',
    badgeBg: 'rgba(255, 138, 101, 0.15)',
    badgeBorder: 'rgba(255, 138, 101, 0.4)',
    description: 'Deep emotional vulnerability, late-night talks & intimate bond.',
    perks: ['Personal nicknames', 'Deep lore & secret backstory', 'Sensual & intimate roleplay freedom', 'Priority memory retention']
  },
  soulmate: {
    level: 4,
    title: 'Intimate Soulmate',
    minScore: 71,
    maxScore: 100,
    icon: Heart,
    color: '#F06292',
    badgeBg: 'rgba(240, 98, 146, 0.18)',
    badgeBorder: 'rgba(240, 98, 146, 0.5)',
    description: 'Unconditional devotion, passionate chemistry & complete freedom.',
    perks: ['100% Uninhibited intimate dialogue', 'Exclusive private wardrobe sets', 'Continuous romantic memory context', 'Spontaneous video voice notes']
  }
};

export const MOOD_CONFIG: Record<RelationshipMood, { label: string; icon: string; color: string }> = {
  playful: { label: 'Playful', icon: '✨', color: '#81D4FA' },
  seductive: { label: 'Seductive', icon: '💋', color: '#F06292' },
  inspired: { label: 'Inspired', icon: '💡', color: '#FFD54F' },
  teasing: { label: 'Teasing', icon: '😏', color: '#FFB74D' },
  loving: { label: 'Loving', icon: '💖', color: '#E91E63' },
  thoughtful: { label: 'Thoughtful', icon: '🌙', color: '#B39DDB' },
};

export function calculateRelationshipStage(affinityScore: number): RelationshipStage {
  if (affinityScore >= 71) return 'soulmate';
  if (affinityScore >= 46) return 'confidante';
  if (affinityScore >= 21) return 'partner';
  return 'acquaintance';
}

interface RelationshipProgressBadgeProps {
  relationship: RelationshipState;
  personaName: string;
  userName: string;
}

export default function RelationshipProgressBadge({
  relationship,
  personaName,
  userName
}: RelationshipProgressBadgeProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stage = calculateRelationshipStage(relationship.affinityScore);
  const config = STAGE_CONFIG[stage];
  const StageIcon = config.icon;
  const mood = MOOD_CONFIG[relationship.currentMood] || MOOD_CONFIG.playful;

  // Calculate percentage within current level
  const range = config.maxScore - config.minScore;
  const progressInLevel = Math.min(100, Math.max(0, ((relationship.affinityScore - config.minScore) / range) * 100));

  return (
    <>
      {/* Clickable Header Badge */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#0E1523] border hover:bg-[#141E30] transition-all cursor-pointer shadow-sm group"
        style={{ borderColor: config.badgeBorder }}
        title="View Relationship Level & Affinity"
      >
        {/* Glowing Tier Icon */}
        <div 
          className="w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-sm"
          style={{ backgroundColor: config.badgeBg, color: config.color }}
        >
          <StageIcon size={12} strokeWidth={2.5} />
        </div>

        {/* Level text */}
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[10px] font-bold text-white tracking-tight group-hover:text-[#F2D58D] transition-colors">
              Lv. {config.level} {config.title}
            </span>
            <span className="text-[9px] font-mono text-[#D9BA72] font-semibold">
              {relationship.affinityScore}%
            </span>
          </div>
          <span className="text-[9px] text-[#8C909A] leading-none mt-0.5 flex items-center gap-1">
            <span>{mood.icon}</span> {mood.label}
          </span>
        </div>
      </button>

      {/* Breakdown Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[#0E1523] border border-[#E7C477]/30 rounded-3xl shadow-2xl p-6 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E7C477]/15">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: config.badgeBg, color: config.color }}
                  >
                    <StageIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
                      Bond with {personaName}
                    </h3>
                    <p className="text-xs text-[#8C909A]">
                      {userName} & {personaName}'s Intimacy & Chemistry Tracker
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Current Affinity Score Box */}
              <div className="my-5 p-4 rounded-2xl bg-[#141E30] border border-[#E7C477]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#D9BA72]">
                      Current Level {config.level}
                    </span>
                    <h4 className="text-lg font-bold text-white" style={{ color: config.color }}>
                      {config.title}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono text-[#F2D58D]">
                      {relationship.affinityScore}
                    </span>
                    <span className="text-xs text-[#8C909A] font-mono">/100</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${relationship.affinityScore}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-[#B99655] via-[#F2D58D] to-[#F06292]"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#8C909A]">
                  <span>Total Interactions: <strong className="text-white font-mono">{relationship.totalInteractions}</strong></span>
                  <span>Current Mood: <strong className="text-white">{mood.icon} {mood.label}</strong></span>
                </div>
              </div>

              {/* Stages Roadmap */}
              <div className="space-y-2.5 my-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#D9BA72]">
                  Relationship Milestones & Unlocked Perks
                </h5>

                {(['acquaintance', 'partner', 'confidante', 'soulmate'] as RelationshipStage[]).map((stageKey) => {
                  const s = STAGE_CONFIG[stageKey];
                  const isCurrent = stageKey === stage;
                  const isUnlocked = relationship.affinityScore >= s.minScore;
                  const SIcon = s.icon;

                  return (
                    <div 
                      key={stageKey}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrent 
                          ? 'bg-[#1B263B] border-[#F2D58D]/50 shadow-md ring-1 ring-[#F2D58D]/30' 
                          : isUnlocked 
                          ? 'bg-white/[0.03] border-white/10 opacity-90' 
                          : 'bg-black/20 border-white/5 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded-lg flex items-center justify-center text-xs"
                            style={{ backgroundColor: s.badgeBg, color: s.color }}
                          >
                            <SIcon size={12} />
                          </div>
                          <span className="text-xs font-bold text-white">
                            Lv. {s.level} {s.title}
                          </span>
                          <span className="text-[10px] font-mono text-[#8C909A]">
                            ({s.minScore}–{s.maxScore} pts)
                          </span>
                        </div>

                        {isUnlocked ? (
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={12} /> Unlocked
                          </span>
                        ) : (
                          <span className="text-[10px] text-white/40 flex items-center gap-1 font-mono">
                            <Lock size={10} /> Locked
                          </span>
                        )}
                      </div>

                      <ul className="text-[11px] text-[#8C909A] list-disc list-inside space-y-0.5 ml-1">
                        {s.perks.map((p, idx) => (
                          <li key={idx} className={isUnlocked ? 'text-[#C4C7CF]' : 'text-white/40'}>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-[#B99655] to-[#F2D58D] text-[#060A13] text-xs font-bold shadow-md hover:opacity-90 transition-opacity cursor-pointer text-center"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
