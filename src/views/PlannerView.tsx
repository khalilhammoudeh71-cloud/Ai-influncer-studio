import { useState, useEffect } from 'react';
import { Sparkles, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Persona, PlannedPost } from '../types';
import { generatePersonaPlan } from '../utils/personaEngine';
import { api } from '../services/apiService';

interface PlannerViewProps {
  persona: Persona;
}

export default function PlannerView({ persona }: PlannerViewProps) {
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
    <div className="p-6">
      <header className="mb-8 pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Content Planner</h1>
        <div className="flex items-center gap-4 mt-1">
          {persona.referenceImage && (
            <img 
              src={persona.referenceImage} 
              alt={persona.name} 
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/20"
            />
          )}
          <p className="text-gray-400 text-sm">Scale velocity for {persona.name}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#1A1A1A] p-3 rounded-2xl border border-white/5 opacity-60">
          <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Persona</label>
          <div className="flex justify-between items-center text-sm font-medium">
            {persona.name}
          </div>
        </div>
        <div className="bg-[#1A1A1A] p-3 rounded-2xl border border-white/5 cursor-pointer" onClick={() => {
            const platforms = ['Instagram', 'TikTok', 'YouTube', 'Twitter/X'];
            const nextIdx = (platforms.indexOf(platform) + 1) % platforms.length;
            setPlatform(platforms[nextIdx]);
        }}>
          <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Platform</label>
          <div className="flex justify-between items-center text-sm font-medium">
            {platform}
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : plan.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4">
            <Sparkles className="text-indigo-400" size={32} />
          </div>
          <h2 className="text-lg font-bold mb-2">No weekly plan active</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-[200px]">
            Ready to generate 7 days of {persona.tone.toLowerCase()} content?
          </p>
          <button 
            onClick={handleGenerate}
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            Generate Weekly Plan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Next 7 Days</h3>
            <button 
              onClick={handleReset}
              className="text-indigo-400 text-xs font-bold uppercase tracking-wider"
            >
              Reset
            </button>
          </div>
          
          {plan.map((post) => (
            <div key={post.id} className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-4 flex gap-4">
              <div className="bg-indigo-500/10 h-12 w-12 rounded-xl flex flex-col items-center justify-center text-indigo-400 font-bold shrink-0">
                <span className="text-[10px] uppercase opacity-60">Day</span>
                <span className="leading-none">{post.day}</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-tight">{post.type}</span>
                  <CheckCircle2 size={16} className="text-gray-700" />
                </div>
                <h4 className="font-medium text-sm mb-1">{post.hook}</h4>
                <div className="flex gap-4 mt-2">
                   <div className="text-[11px] text-gray-500">
                      <span className="block opacity-50 uppercase text-[9px] font-bold">Angle</span>
                      {post.angle}
                   </div>
                   <div className="text-[11px] text-gray-500">
                      <span className="block opacity-50 uppercase text-[9px] font-bold">CTA</span>
                      {post.cta}
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
