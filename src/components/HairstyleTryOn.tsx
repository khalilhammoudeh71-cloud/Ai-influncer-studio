import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Loader2, Download, Scissors } from 'lucide-react';
import { Persona } from '../types';
import { generateImage } from '../services/imageService';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';

interface Props { persona: Persona; onClose: () => void; }

const HAIRSTYLES = [
  { id: 'pixie-cut', label: 'Pixie Cut', desc: 'Short, textured, modern pixie', emoji: '✨' },
  { id: 'bob', label: 'Bob', desc: 'Classic chin-length bob, sleek', emoji: '💇' },
  { id: 'long-straight', label: 'Long Straight', desc: 'Silky long straight hair', emoji: '🪮' },
  { id: 'long-wavy', label: 'Long Wavy', desc: 'Flowing waves, beachy texture', emoji: '🌊' },
  { id: 'curly', label: 'Curly', desc: 'Natural bouncy curls', emoji: '🌀' },
  { id: 'braids', label: 'Braids', desc: 'Elegant braided style', emoji: '🎀' },
  { id: 'updo-bun', label: 'Updo / Bun', desc: 'Sleek or messy top bun', emoji: '👑' },
  { id: 'buzz-cut', label: 'Buzz Cut', desc: 'Very short, clean cut', emoji: '💈' },
  { id: 'shag', label: 'Shag', desc: 'Layered, textured, 70s-inspired', emoji: '🎸' },
  { id: 'ponytail', label: 'Ponytail', desc: 'High or low, sleek or casual', emoji: '🏃' },
  { id: 'bangs', label: 'Curtain Bangs', desc: 'Face-framing curtain bangs', emoji: '🌸' },
  { id: 'afro', label: 'Afro', desc: 'Natural volumous afro', emoji: '🌟' },
];

const COLORS = [
  { id: 'natural', label: 'Natural', color: 'bg-transparent border-white/20', textColor: 'text-white/60' },
  { id: 'platinum-blonde', label: 'Platinum', color: 'bg-yellow-100', textColor: 'text-gray-800' },
  { id: 'honey-blonde', label: 'Honey', color: 'bg-amber-400', textColor: 'text-gray-900' },
  { id: 'auburn-red', label: 'Auburn', color: 'bg-red-700', textColor: 'text-white' },
  { id: 'copper', label: 'Copper', color: 'bg-orange-600', textColor: 'text-white' },
  { id: 'jet-black', label: 'Black', color: 'bg-gray-900', textColor: 'text-white' },
  { id: 'chocolate-brown', label: 'Brown', color: 'bg-amber-900', textColor: 'text-white' },
  { id: 'pastel-pink', label: 'Pink', color: 'bg-pink-300', textColor: 'text-gray-800' },
  { id: 'pastel-lavender', label: 'Lavender', color: 'bg-purple-300', textColor: 'text-gray-800' },
  { id: 'blue', label: 'Blue', color: 'bg-blue-500', textColor: 'text-white' },
  { id: 'silver-gray', label: 'Silver', color: 'bg-gray-400', textColor: 'text-gray-900' },
  { id: 'ombre-dark-to-light', label: 'Ombré', color: 'bg-gradient-to-r from-gray-800 to-amber-300', textColor: 'text-white' },
];

export default function HairstyleTryOn({ persona, onClose }: Props) {
  const [style, setStyle] = useState('long-wavy');
  const [color, setColor] = useState('natural');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const generate = async () => {
    setIsGenerating(true);
    setResult(null);
    const styleInfo = HAIRSTYLES.find(s => s.id === style)!;
    const colorInfo = COLORS.find(c => c.id === color)!;
    const colorStr = color === 'natural' ? 'their natural hair color' : `${colorInfo.label} colored hair`;

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
        additionalInstructions: `HAIRSTYLE PREVIEW — showing this exact person with a new hairstyle.
Hairstyle: ${styleInfo.label} — ${styleInfo.desc}.
Hair color: ${colorStr}.
The person's FACE and identity must remain PERFECTLY identical — same face, same features, same skin.
ONLY the hair should change. Keep the same face shape, eyes, nose, mouth.
Shot: Close-up portrait, well-lit, clean background so the hairstyle is clearly visible.
Quality: Ultra sharp, salon-quality photography, you can see individual hair strands.
Lighting: Soft professional beauty lighting highlighting the hair texture and shine.`,
      });
      const single = Array.isArray(res) ? res[0] : res;
      setResult(single.imageUrl);
      toast.success('Hairstyle preview ready!');
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all"><X size={20} /></button>
          <div>
            <h1 className="text-lg font-black text-white flex items-center gap-2"><Scissors size={20} className="text-pink-400" /> Hairstyle Try-On</h1>
            <p className="text-[10px] text-white/40">Preview different haircuts & colors before you commit</p>
          </div>
        </div>
        {persona.referenceImage && <img src={persona.referenceImage} alt="" className="w-8 h-8 rounded-lg object-cover ring-2 ring-pink-500/30" />}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Settings */}
        <div className="w-full lg:w-[380px] border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto p-5 space-y-6">
          {/* Hairstyle */}
          <div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Hairstyle</p>
            <div className="grid grid-cols-3 gap-2">
              {HAIRSTYLES.map(s => (
                <button key={s.id} onClick={() => setStyle(s.id)}
                  className={cn('p-2.5 rounded-xl border text-center transition-all', style === s.id ? 'border-pink-500/50 bg-pink-500/10 ring-1 ring-pink-500/20' : 'border-white/5 bg-white/[0.02] hover:border-white/15')}>
                  <span className="text-lg block mb-0.5">{s.emoji}</span>
                  <p className="text-[10px] font-bold text-white">{s.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Hair Color</p>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map(c => (
                <button key={c.id} onClick={() => setColor(c.id)}
                  className={cn('rounded-xl border p-1.5 transition-all flex flex-col items-center gap-1', color === c.id ? 'border-pink-500/50 ring-1 ring-pink-500/20' : 'border-white/5 hover:border-white/20')}>
                  <div className={cn('w-8 h-8 rounded-lg border', c.color)} />
                  <p className="text-[8px] font-bold text-white/50">{c.label}</p>
                </button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={isGenerating}
            className={cn('w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all', isGenerating ? 'bg-white/5 text-white/30' : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:brightness-110 text-white shadow-lg shadow-pink-500/20')}>
            {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Generating Preview...</> : <><Scissors size={16} /> Preview This Look</>}
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 flex items-center justify-center p-6">
          {result ? (
            <div className="space-y-4 text-center">
              <motion.img initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} src={result} alt="" className="max-h-[60vh] rounded-2xl shadow-2xl mx-auto" />
              <p className="text-sm font-bold text-pink-300">
                {HAIRSTYLES.find(s => s.id === style)?.emoji} {HAIRSTYLES.find(s => s.id === style)?.label}
                {color !== 'natural' && ` • ${COLORS.find(c => c.id === color)?.label}`}
              </p>
              <div className="flex gap-3 justify-center">
                <a href={result} download={`hairstyle-${style}.jpg`} target="_blank" className="px-6 py-2.5 rounded-xl bg-pink-500 text-white font-bold text-xs flex items-center gap-2 hover:brightness-110"><Download size={14} /> Download</a>
                <button onClick={generate} disabled={isGenerating} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10"><Sparkles size={14} /> Try Again</button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto"><Scissors size={32} className="text-pink-400" /></div>
              <h3 className="text-xl font-black text-white">Hairstyle Try-On</h3>
              <p className="text-sm text-white/40 max-w-md">Pick a cut and color — see how you'd look before visiting the salon. 12 styles × 12 colors = 144 combinations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
