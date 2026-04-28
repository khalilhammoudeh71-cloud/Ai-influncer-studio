import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Loader2, Download, Clock } from 'lucide-react';
import { Persona } from '../types';
import { generateImage } from '../services/imageService';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

interface Props { persona: Persona; onClose: () => void; }

const ERAS = [
  { id: '1920s', label: '1920s', name: 'Roaring Twenties', desc: 'Art deco, flapper dresses, jazz age glamour, sepia tones', emoji: '🎷', color: 'from-amber-700 to-yellow-900' },
  { id: '1950s', label: '1950s', name: 'Golden Era', desc: 'Pin-up style, Rockabilly, polished Hollywood glam', emoji: '🎬', color: 'from-rose-600 to-pink-800' },
  { id: '1960s', label: '1960s', name: 'Swinging Sixties', desc: 'Mod fashion, bold patterns, go-go boots, pop art', emoji: '✌️', color: 'from-orange-500 to-yellow-500' },
  { id: '1970s', label: '1970s', name: 'Disco Fever', desc: 'Afros, bell-bottoms, disco ball, gold chains, funk', emoji: '🕺', color: 'from-violet-600 to-purple-800' },
  { id: '1980s', label: '1980s', name: 'Neon Dreams', desc: 'Synthwave, big hair, shoulder pads, neon lights', emoji: '🎸', color: 'from-pink-500 to-cyan-500' },
  { id: '1990s', label: '1990s', name: 'Grunge Era', desc: 'Flannel, combat boots, MTV style, alternative', emoji: '📼', color: 'from-teal-600 to-emerald-800' },
  { id: '2000s', label: '2000s', name: 'Y2K', desc: 'Low-rise jeans, bedazzled everything, frosted tips', emoji: '💿', color: 'from-blue-400 to-purple-400' },
  { id: 'medieval', label: 'Medieval', name: 'Medieval Knight', desc: 'Armor, castle, torchlit, oil painting style', emoji: '⚔️', color: 'from-stone-600 to-stone-800' },
  { id: 'renaissance', label: 'Renaissance', name: 'Renaissance', desc: 'Classical painting, ornate clothing, Baroque style', emoji: '🎨', color: 'from-amber-500 to-red-800' },
  { id: 'victorian', label: 'Victorian', name: 'Victorian Era', desc: 'Top hats, corsets, steam, industrial elegance', emoji: '🎩', color: 'from-gray-600 to-gray-900' },
  { id: 'ancient-egypt', label: 'Ancient Egypt', name: 'Pharaoh Era', desc: 'Gold headdress, hieroglyphics, desert temples', emoji: '🏛️', color: 'from-yellow-600 to-amber-800' },
  { id: 'cyberpunk', label: 'Cyberpunk', name: 'Cyberpunk 2077', desc: 'Neon city, cybernetic implants, holographic UI', emoji: '🤖', color: 'from-cyan-500 to-violet-600' },
  { id: 'steampunk', label: 'Steampunk', name: 'Steampunk', desc: 'Brass goggles, clockwork, airships, Victorian-futurism', emoji: '⚙️', color: 'from-amber-600 to-stone-700' },
  { id: 'future-3000', label: '3000 AD', name: 'Far Future', desc: 'Space colony, silver suit, holographic surroundings', emoji: '🚀', color: 'from-indigo-500 to-blue-900' },
];

export default function TimeMachine({ persona, onClose }: Props) {
  const [selectedEra, setSelectedEra] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const generate = async () => {
    if (!selectedEra) return toast.error('Select an era first');
    setIsGenerating(true);
    setResult(null);
    const era = ERAS.find(e => e.id === selectedEra)!;

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
        additionalInstructions: `TIME MACHINE PORTRAIT — ${era.name} (${era.label})
Transport this EXACT person back in time to the ${era.label} era.
Style: ${era.desc}
The person's face and identity must remain PERFECTLY consistent — same face, same features, same person.
Only the clothing, hairstyle, setting, and photographic style should change to match the ${era.label} era.
Make it look like an authentic photograph or painting from that time period.
High detail, cinematic quality, dramatic lighting appropriate to the era.`,
      });
      const single = Array.isArray(res) ? res[0] : res;
      setResult(single.imageUrl);
      toast.success(`Welcome to the ${era.label}!`);
    } catch (err: any) {
      toast.error(err.message || 'Time travel failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const activeEra = ERAS.find(e => e.id === selectedEra);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all"><X size={20} /></button>
          <div>
            <h1 className="text-lg font-black text-white flex items-center gap-2"><Clock size={20} className="text-purple-400" /> Time Machine</h1>
            <p className="text-[10px] text-white/40">Travel through history — same face, different era</p>
          </div>
        </div>
        {persona.referenceImage && <img src={persona.referenceImage} alt="" className="w-8 h-8 rounded-lg object-cover ring-2 ring-purple-500/30" />}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Era Grid */}
        <div className="w-full lg:w-[420px] border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto p-5 space-y-4">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Choose Your Era</p>
          <div className="grid grid-cols-2 gap-2">
            {ERAS.map(era => (
              <button key={era.id} onClick={() => setSelectedEra(era.id)}
                className={cn('p-3 rounded-xl border text-left transition-all group', selectedEra === era.id ? 'border-purple-500/50 bg-purple-500/10 ring-1 ring-purple-500/20' : 'border-white/5 bg-white/[0.02] hover:border-white/15')}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{era.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-white">{era.label}</p>
                    <p className="text-[8px] text-white/30">{era.name}</p>
                  </div>
                </div>
                <p className="text-[9px] text-white/25 leading-relaxed">{era.desc}</p>
              </button>
            ))}
          </div>

          <button onClick={generate} disabled={isGenerating || !selectedEra}
            className={cn('w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-4', isGenerating || !selectedEra ? 'bg-white/5 text-white/30' : 'bg-gradient-to-r from-purple-500 to-violet-500 hover:brightness-110 text-white shadow-lg shadow-purple-500/20')}>
            {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Traveling to {activeEra?.label}...</> : <><Clock size={16} /> Travel to {activeEra?.label || '...'}</>}
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 flex items-center justify-center p-6">
          {result ? (
            <div className="space-y-4 text-center">
              <motion.img initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} src={result} alt="" className="max-h-[60vh] rounded-2xl shadow-2xl mx-auto" />
              <p className="text-sm font-bold text-purple-300">{activeEra?.emoji} {activeEra?.name} — {activeEra?.label}</p>
              <div className="flex gap-3 justify-center">
                <a href={result} download={`time-machine-${selectedEra}.jpg`} target="_blank" className="px-6 py-2.5 rounded-xl bg-purple-500 text-white font-bold text-xs flex items-center gap-2 hover:brightness-110"><Download size={14} /> Download</a>
                <button onClick={generate} disabled={isGenerating} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10"><Sparkles size={14} /> Regenerate</button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto"><Clock size={32} className="text-purple-400" /></div>
              <h3 className="text-xl font-black text-white">Time Machine</h3>
              <p className="text-sm text-white/40 max-w-md">Pick any era from Ancient Egypt to Cyberpunk 2077 — your persona travels through time while keeping their exact face.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
