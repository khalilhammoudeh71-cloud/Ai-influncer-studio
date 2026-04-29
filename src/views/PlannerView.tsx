import { useState, useEffect } from 'react';
import { Sparkles, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Persona, PlannedPost } from '../types';
import { generatePersonaPlan } from '../utils/personaEngine';
import { api } from '../services/apiService';

interface PlannerViewProps {
  persona: Persona;
  personas: Persona[];
  onSelectPersona: (id: string) => void;
}

export default function PlannerView({ persona, personas, onSelectPersona }: PlannerViewProps) {
  const [plan, setPlan] = useState<(PlannedPost & { id: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [platform, setPlatform] = useState(persona.platform);

  useEffect(() => {
    setPlatform(persona.platform);
  }, [persona.id]);

  useEffect(() => {
    setIsLoading(true);
    api.plannedPosts.get(persona.id, platform)
      .then(posts => {
        if (posts && posts.length > 0) {
          setPlan(posts.map((p, i) => ({ ...p, id: `plan-${i}` })));
        } else {
          setPlan([]);
        }
      })
      .catch(() => setPlan([]))
      .finally(() => setIsLoading(false));
  }, [persona.id, platform]);

  const handleGenerate = () => {
    const generated = generatePersonaPlan(persona, platform, "Weekly Growth");
    setPlan(generated);
    api.plannedPosts.save(persona.id, platform, generated.map(({ day, type, hook, angle, cta }) => ({ day, type, hook, angle, cta })))
      .catch(err => console.error('[Planner] Save error:', err));
  };

  const handleReset = () => {
    setPlan([]);
    api.plannedPosts.save(persona.id, platform, [])
      .catch(err => console.error('[Planner] Reset error:', err));
  };

  return (
    <div className="p-5">
      <header className="premium-header mb-8 pt-6 pb-2">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="gradient-text">Content Planner</span>
          </h1>
          <div className="flex items-center gap-3 mt-2">
            {persona.referenceImage && (
              <img 
                src={persona.referenceImage} 
                alt={persona.name} 
                className="w-8 h-8 rounded-lg object-cover ring-2 ring-violet-500/25 shadow-lg shadow-violet-500/10"
              />
            )}
            <p className="text-[var(--text-tertiary)] text-sm font-medium">Scale velocity for <span className="text-violet-400">{persona.name}</span></p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="premium-card p-3.5 rounded-xl relative">
          <label className="text-[9px] uppercase font-bold text-[var(--text-muted)] mb-1 block tracking-[0.15em]">Persona</label>
          <select
            value={persona.id}
            onChange={e => onSelectPersona(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none appearance-none pr-5 cursor-pointer"
          >
            {personas.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-3 bottom-3.5 text-[var(--text-muted)] pointer-events-none" />
        </div>
        <div className="premium-card p-3.5 rounded-xl cursor-pointer" onClick={() => {
            const platforms = ['Instagram', 'TikTok', 'YouTube', 'Twitter/X'];
            const nextIdx = (platforms.indexOf(platform) + 1) % platforms.length;
            setPlatform(platforms[nextIdx]);
        }}>
          <label className="text-[9px] uppercase font-bold text-[var(--text-muted)] mb-1 block tracking-[0.15em]">Platform</label>
          <div className="flex justify-between items-center text-sm font-medium text-[var(--text-primary)]">
            {platform}
            <ChevronDown size={14} className="text-[var(--text-muted)]" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : plan.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-8 flex flex-col items-center text-center"
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-2xl animate-pulse" />
            <Sparkles className="text-violet-400 relative z-10" size={36} />
          </div>
          <h2 className="text-xl font-bold mb-2 text-[var(--text-primary)]">No weekly plan active</h2>
          <p className="text-[var(--text-tertiary)] text-sm mb-8 max-w-[220px] leading-relaxed">
            Ready to generate 7 days of <span className="text-violet-400">{persona.tone.split(',')[0].toLowerCase().trim()}</span> content?
          </p>
          <motion.button 
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGenerate}
            className="w-full premium-button py-4 flex items-center justify-center gap-2 text-white"
          >
            <Sparkles size={18} />
            Generate Weekly Plan
          </motion.button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2.5">
              <div className="neon-line w-3" />
              <h3 className="font-bold text-[var(--text-primary)]">Next 7 Days</h3>
            </div>
            <button 
              onClick={handleReset}
              className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider hover:text-rose-400 transition-colors"
            >
              Reset
            </button>
          </div>
          
          {plan.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="premium-card rounded-xl p-4 flex gap-4"
            >
              <div className="h-12 w-12 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15" />
                <span className="text-[9px] uppercase text-violet-300/60 relative z-10">Day</span>
                <span className="leading-none text-violet-300 relative z-10">{post.day}</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-violet-400 uppercase tracking-tight">{post.type}</span>
                  <CheckCircle2 size={16} className="text-[var(--text-muted)]" />
                </div>
                <h4 className="font-medium text-sm mb-1 text-[var(--text-primary)]">{post.hook}</h4>
                <div className="flex gap-4 mt-2">
                   <div className="text-[11px] text-[var(--text-tertiary)]">
                      <span className="block opacity-50 uppercase text-[9px] font-bold">Angle</span>
                      {post.angle}
                   </div>
                   <div className="text-[11px] text-[var(--text-tertiary)]">
                      <span className="block opacity-50 uppercase text-[9px] font-bold">CTA</span>
                      {post.cta}
                   </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
