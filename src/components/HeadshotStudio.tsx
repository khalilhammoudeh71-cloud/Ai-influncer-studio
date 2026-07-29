import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Download, Camera, Briefcase, Building2, TreePine, Palette } from 'lucide-react';
import { Persona } from '../types';
import { generateImage } from '../services/imageService';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

interface Props { persona: Persona; onClose: () => void; }

const BACKGROUNDS = [
  { id: 'corporate', label: 'Corporate', desc: 'Clean studio, navy/gray gradient', icon: Building2, color: 'from-slate-500 to-gray-600' },
  { id: 'creative', label: 'Creative', desc: 'Colorful bokeh, artistic blur', icon: Palette, color: 'from-pink-500 to-purple-500' },
  { id: 'outdoor', label: 'Outdoor', desc: 'Natural light, soft greenery', icon: TreePine, color: 'from-emerald-500 to-teal-500' },
  { id: 'studio', label: 'Studio White', desc: 'Pure white seamless backdrop', icon: Camera, color: 'from-gray-300 to-white' },
  { id: 'executive', label: 'Executive', desc: 'Mahogany office, warm tones', icon: Briefcase, color: 'from-amber-700 to-orange-800' },
];

const ATTIRES = [
  { id: 'business-suit', label: 'Business Suit', emoji: '👔' },
  { id: 'casual-smart', label: 'Smart Casual', emoji: '👕' },
  { id: 'creative-professional', label: 'Creative Pro', emoji: '🎨' },
  { id: 'medical-coat', label: 'Lab Coat', emoji: '🥼' },
  { id: 'tech-startup', label: 'Tech/Startup', emoji: '💻' },
  { id: 'academic', label: 'Academic', emoji: '🎓' },
];

const FRAMINGS = [
  { id: 'tight-headshot', label: 'Tight Headshot', desc: 'Shoulders up, classic LinkedIn' },
  { id: 'medium-portrait', label: 'Medium Portrait', desc: 'Waist up, editorial feel' },
  { id: 'environmental', label: 'Environmental', desc: 'Half-body with context' },
];

export default function HeadshotStudio({ persona, onClose }: Props) {
  const [background, setBackground] = useState('corporate');
  const [attire, setAttire] = useState('business-suit');
  const [framing, setFraming] = useState('tight-headshot');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const generate = async () => {
    setIsGenerating(true);
    setResult(null);
    const bgInfo = BACKGROUNDS.find(b => b.id === background);
    const attireInfo = ATTIRES.find(a => a.id === attire);
    const framingInfo = FRAMINGS.find(f => f.id === framing);

    try {
      const res = await generateImage({
        persona,
        modelId: 'wavespeed-ai/flux-dev',
        environment: 'None',
        outfitStyle: 'None',
        framing: 'None',
        mood: 'None',
        naturalLook: true,
        identityLock: true,
        additionalInstructions: `Professional headshot photo for LinkedIn/resume/business use.
Background: ${bgInfo?.desc || background}.
Attire: ${attireInfo?.label || attire} — clean, well-fitted, professional.
Framing: ${framingInfo?.desc || framing}.
Lighting: Soft, flattering studio lighting with gentle fill. No harsh shadows.
Expression: Confident, approachable, warm smile. Direct eye contact with camera.
Quality: Ultra high resolution, sharp focus on eyes, shallow depth of field on background.
Style: Clean, modern professional photography. Magazine-quality headshot.`,
      });
      const single = Array.isArray(res) ? res[0] : res;
      setResult(single.imageUrl);
      toast.success('Professional headshot ready!');
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all"><X size={20} /></button>
          <div>
            <h1 className="text-lg font-black text-white flex items-center gap-2"><Camera size={20} className="text-blue-400" /> Pro Headshot Studio</h1>
            <p className="text-[10px] text-white/40">Professional headshots for LinkedIn, resumes & business</p>
          </div>
        </div>
        {persona.referenceImage && <img src={persona.referenceImage} alt="" className="w-8 h-8 rounded-lg object-cover ring-2 ring-blue-500/30" />}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Settings */}
        <div className="w-full lg:w-[380px] border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto p-5 space-y-6">
          {/* Background */}
          <div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Background</p>
            <div className="grid grid-cols-2 gap-2">
              {BACKGROUNDS.map(bg => (
                <button key={bg.id} onClick={() => setBackground(bg.id)}
                  className={cn('p-3 rounded-xl border text-left transition-all', background === bg.id ? 'border-blue-500/50 bg-blue-500/10 ring-1 ring-blue-500/20' : 'border-white/5 bg-white/[0.02] hover:border-white/15')}>
                  <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white mb-2', bg.color)}><bg.icon size={14} /></div>
                  <p className="text-xs font-bold text-white">{bg.label}</p>
                  <p className="text-[9px] text-white/30">{bg.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Attire */}
          <div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Attire</p>
            <div className="flex flex-wrap gap-2">
              {ATTIRES.map(a => (
                <button key={a.id} onClick={() => setAttire(a.id)}
                  className={cn('px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5', attire === a.id ? 'border-blue-500/50 bg-blue-500/10 text-blue-300' : 'border-white/5 text-white/50 hover:text-white')}>
                  <span>{a.emoji}</span> {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Framing */}
          <div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Framing</p>
            <div className="space-y-2">
              {FRAMINGS.map(f => (
                <button key={f.id} onClick={() => setFraming(f.id)}
                  className={cn('w-full p-3 rounded-xl border text-left transition-all', framing === f.id ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/5 bg-white/[0.02] hover:border-white/15')}>
                  <p className="text-xs font-bold text-white">{f.label}</p>
                  <p className="text-[9px] text-white/30">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={isGenerating}
            className={cn('w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all', isGenerating ? 'bg-white/5 text-white/30' : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:brightness-110 text-white shadow-lg shadow-blue-500/20')}>
            {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Generating Headshot...</> : <><Camera size={16} /> Generate Professional Headshot</>}
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 flex items-center justify-center p-6">
          {result ? (
            <div className="space-y-4 text-center">
              <motion.img initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} src={result} alt="" className="max-h-[60vh] rounded-2xl shadow-2xl mx-auto" />
              <div className="flex gap-3 justify-center">
                <a href={result} download="headshot.jpg" target="_blank" className="px-6 py-2.5 rounded-xl bg-blue-500 text-white font-bold text-xs flex items-center gap-2 hover:brightness-110"><Download size={14} /> Download</a>
                <button onClick={generate} disabled={isGenerating} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10"><Sparkles size={14} /> Regenerate</button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto"><Camera size={32} className="text-blue-400" /></div>
              <h3 className="text-xl font-black text-white">Pro Headshot Studio</h3>
              <p className="text-sm text-white/40 max-w-md">Choose your background, attire, and framing to generate a magazine-quality professional headshot.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
