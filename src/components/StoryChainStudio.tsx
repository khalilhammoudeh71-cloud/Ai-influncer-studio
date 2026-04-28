import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Plus, Trash2, Sparkles, Loader2, ChevronLeft, ChevronRight, Download, Copy, ClipboardCheck, X, BookOpen } from 'lucide-react';
import { Persona } from '../types';
import { generateImage, type GenerateImageResult } from '../services/imageService';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

interface StoryChainStudioProps {
  persona: Persona;
  onClose: () => void;
}

interface StoryScene {
  id: string;
  title: string;
  description: string;
  result?: GenerateImageResult;
  isGenerating?: boolean;
}

const STORY_TEMPLATES = [
  { name: 'Day in My Life', scenes: ['Morning routine with coffee', 'Heading to work looking stylish', 'Power lunch meeting', 'Evening workout at the gym', 'Sunset rooftop wind-down'] },
  { name: 'Product Launch', scenes: ['Teaser close-up shot', 'Unboxing reveal moment', 'Using the product candid', 'Results / transformation', 'Call-to-action pose'] },
  { name: 'Travel Vlog', scenes: ['Airport departure selfie', 'Exploring the streets', 'Iconic landmark photo', 'Local food experience', 'Sunset golden hour shot'] },
  { name: 'Fitness Journey', scenes: ['Pre-workout motivation', 'Intense training session', 'Post-workout glow', 'Healthy meal prep', 'Progress mirror selfie'] },
];

export default function StoryChainStudio({ persona, onClose }: StoryChainStudioProps) {
  const [scenes, setScenes] = useState<StoryScene[]>([
    { id: `s-${Date.now()}`, title: 'Scene 1', description: '' },
    { id: `s-${Date.now() + 1}`, title: 'Scene 2', description: '' },
    { id: `s-${Date.now() + 2}`, title: 'Scene 3', description: '' },
  ]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [activeScene, setActiveScene] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const filmstripRef = useRef<HTMLDivElement>(null);

  const addScene = () => {
    if (scenes.length >= 8) return toast.error('Maximum 8 scenes');
    setScenes(prev => [...prev, { id: `s-${Date.now()}`, title: `Scene ${prev.length + 1}`, description: '' }]);
  };

  const removeScene = (id: string) => {
    if (scenes.length <= 2) return toast.error('Minimum 2 scenes');
    setScenes(prev => prev.filter(s => s.id !== id));
    if (activeScene >= scenes.length - 1) setActiveScene(Math.max(0, scenes.length - 2));
  };

  const updateScene = (id: string, desc: string) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, description: desc } : s));
  };

  const applyTemplate = (template: typeof STORY_TEMPLATES[0]) => {
    setScenes(template.scenes.map((desc, i) => ({
      id: `s-${Date.now() + i}`,
      title: `Scene ${i + 1}`,
      description: desc,
    })));
    setShowTemplates(false);
    setActiveScene(0);
    toast.success(`Applied "${template.name}" template`);
  };

  const generateAllScenes = async () => {
    const emptyScenes = scenes.filter(s => !s.description.trim());
    if (emptyScenes.length > 0) return toast.error(`${emptyScenes.length} scenes have empty descriptions`);

    setIsGeneratingAll(true);
    const personaWithRef = { ...persona };
    const characterDesc = `The SAME person (${persona.name}) appears in every scene. Maintain perfect identity consistency — same face, body, and features throughout the entire visual story.`;

    const updated = [...scenes];
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], isGenerating: true };
      setScenes([...updated]);
      setActiveScene(i);

      try {
        const result = await generateImage({
          persona: personaWithRef,
          modelId: 'wavespeed-ai/flux-dev',
          environment: 'None',
          outfitStyle: 'None',
          framing: 'None',
          mood: 'None',
          additionalInstructions: `${characterDesc}\n\nScene ${i + 1} of ${updated.length}: ${updated[i].description}`,
          naturalLook: true,
          identityLock: true,
        });

        const singleResult = Array.isArray(result) ? result[0] : result;
        updated[i] = { ...updated[i], result: singleResult, isGenerating: false };
      } catch (err: any) {
        updated[i] = { ...updated[i], isGenerating: false };
        toast.error(`Scene ${i + 1} failed: ${err.message}`);
      }
      setScenes([...updated]);
    }

    setIsGeneratingAll(false);
    toast.success('Story chain complete!');
  };

  const completedCount = scenes.filter(s => s.result).length;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all">
            <X size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              <Film size={20} className="text-amber-400" /> Visual Story Chain
            </h1>
            <p className="text-[10px] text-white/40">Generate sequential images with consistent identity</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={cn("px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all",
              showTemplates ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            <BookOpen size={14} /> Templates
          </button>
          {persona.referenceImage && (
            <img src={persona.referenceImage} alt={persona.name} className="w-8 h-8 rounded-lg object-cover ring-2 ring-amber-500/30" />
          )}
          <span className="text-xs font-bold text-white/60">{persona.name}</span>
        </div>
      </div>

      {/* Templates Dropdown */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/10"
          >
            <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {STORY_TEMPLATES.map(t => (
                <button
                  key={t.name}
                  onClick={() => applyTemplate(t)}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-left group"
                >
                  <p className="text-sm font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">{t.name}</p>
                  <p className="text-[9px] text-white/40 leading-relaxed">{t.scenes.length} scenes: {t.scenes.join(' → ')}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Scene List (Left) */}
        <div className="w-full lg:w-[350px] border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Scenes ({scenes.length})</span>
            <button onClick={addScene} className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1">
              <Plus size={12} /> Add Scene
            </button>
          </div>
          {scenes.map((scene, i) => (
            <div
              key={scene.id}
              onClick={() => setActiveScene(i)}
              className={cn(
                'rounded-xl border p-3 cursor-pointer transition-all',
                activeScene === i
                  ? 'border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/15'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                  <span className="text-xs font-bold text-white">{scene.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  {scene.isGenerating && <Loader2 size={12} className="text-amber-400 animate-spin" />}
                  {scene.result && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  <button onClick={(e) => { e.stopPropagation(); removeScene(scene.id); }} className="p-1 rounded hover:bg-white/10 text-white/20 hover:text-rose-400 transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <textarea
                value={scene.description}
                onChange={e => updateScene(scene.id, e.target.value)}
                onClick={e => e.stopPropagation()}
                placeholder="Describe this scene..."
                className="w-full bg-transparent text-[11px] text-white/70 outline-none resize-none placeholder:text-white/20 h-12"
              />
              {scene.result && (
                <img src={scene.result.imageUrl} alt="" className="w-full h-16 object-cover rounded-lg mt-2 opacity-70" />
              )}
            </div>
          ))}

          {/* Generate All Button */}
          <button
            onClick={generateAllScenes}
            disabled={isGeneratingAll || scenes.some(s => !s.description.trim())}
            className={cn(
              'w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-4',
              isGeneratingAll || scenes.some(s => !s.description.trim())
                ? 'bg-white/5 text-white/30'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-black shadow-lg shadow-amber-500/20'
            )}
          >
            {isGeneratingAll ? (
              <><Loader2 size={16} className="animate-spin" /> Generating {completedCount}/{scenes.length}...</>
            ) : (
              <><Sparkles size={16} /> Generate All {scenes.length} Scenes</>
            )}
          </button>
        </div>

        {/* Preview (Right) */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
          {completedCount > 0 ? (
            <div className="w-full max-w-3xl space-y-6">
              {/* Active Scene Preview */}
              <div className="relative">
                {scenes[activeScene]?.result ? (
                  <motion.img
                    key={scenes[activeScene].id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={scenes[activeScene].result!.imageUrl}
                    alt=""
                    className="w-full max-h-[50vh] object-contain rounded-2xl shadow-2xl"
                  />
                ) : scenes[activeScene]?.isGenerating ? (
                  <div className="w-full aspect-[3/4] max-h-[50vh] rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 size={32} className="text-amber-400 animate-spin mx-auto mb-3" />
                      <p className="text-sm font-bold text-white/60">Generating Scene {activeScene + 1}...</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-[3/4] max-h-[50vh] rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                    <p className="text-sm text-white/30">Scene not yet generated</p>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur text-xs font-bold text-white">
                  Scene {activeScene + 1}: {scenes[activeScene]?.description?.substring(0, 60) || 'Untitled'}
                </div>
              </div>

              {/* Filmstrip */}
              <div ref={filmstripRef} className="flex gap-2 overflow-x-auto pb-2 hidden-scrollbar">
                {scenes.map((scene, i) => (
                  <button
                    key={scene.id}
                    onClick={() => setActiveScene(i)}
                    className={cn(
                      'shrink-0 w-20 h-20 rounded-xl border-2 overflow-hidden transition-all relative',
                      activeScene === i ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-white/10 hover:border-white/25'
                    )}
                  >
                    {scene.result ? (
                      <img src={scene.result.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/[0.03] flex items-center justify-center">
                        {scene.isGenerating ? <Loader2 size={14} className="text-amber-400 animate-spin" /> : <span className="text-[10px] text-white/30">{i + 1}</span>}
                      </div>
                    )}
                    <span className="absolute bottom-0.5 right-0.5 text-[7px] font-bold bg-black/60 text-white px-1 rounded">{i + 1}</span>
                  </button>
                ))}
              </div>

              {/* Nav Buttons */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setActiveScene(Math.max(0, activeScene - 1))}
                  disabled={activeScene === 0}
                  className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-bold text-white/60">{activeScene + 1} / {scenes.length}</span>
                <button
                  onClick={() => setActiveScene(Math.min(scenes.length - 1, activeScene + 1))}
                  disabled={activeScene === scenes.length - 1}
                  className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                <Film size={32} className="text-amber-400" />
              </div>
              <h3 className="text-xl font-black text-white">Visual Story Chain</h3>
              <p className="text-sm text-white/40 max-w-md">
                Define 2–8 scenes, then generate them sequentially with consistent character identity. 
                Use a template to get started quickly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
