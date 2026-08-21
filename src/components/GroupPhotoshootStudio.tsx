import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Sparkles, 
  Camera, 
  CheckCircle2, 
  Loader2, 
  Wand2, 
  Image as ImageIcon, 
  Download, 
  Share2, 
  Layers,
  Sparkle,
  Plus,
  Check,
  User
} from 'lucide-react';
import { Persona } from '../types';
import { useCreatorProfile } from '../utils/creatorProfile';
import toast from 'react-hot-toast';

interface GroupPhotoshootStudioProps {
  personas: Persona[];
  activePersona: Persona;
}

const CROSSOVER_PRESETS = [
  {
    id: 'paris-fashion',
    title: 'Paris Fashion Week Runway',
    desc: 'High-fashion editorial posing on a cobblestone street near Eiffel Tower at sunset.',
    concept: 'Parisian high-fashion editorial magazine cover shoot',
    setting: 'Eiffel Tower cobblestone street during golden hour'
  },
  {
    id: 'met-gala',
    title: 'Met Gala Red Carpet',
    desc: 'Glamorous haute couture evening gowns/tuxedos under flashes of paparazzi lights.',
    concept: 'Met Gala red carpet arrival in haute couture fashion',
    setting: 'Metropolitan museum red carpet stairs with camera flashes'
  },
  {
    id: 'miami-yacht',
    title: 'Miami Luxury Yacht Party',
    desc: 'Chic summer resortwear on a luxury yacht overlooking Biscayne Bay.',
    concept: 'Summer luxury yacht lifestyle photoshoot',
    setting: 'Sleek white yacht deck overlooking turquoise ocean waters'
  },
  {
    id: 'cafe-date',
    title: 'Metropolitan Cafe Catch-up',
    desc: 'Casual luxury streetwear at an outdoor espresso bar in SoHo.',
    concept: 'Candid lifestyle coffee date photoshoot',
    setting: 'Outdoor European marble espresso table with fresh pastries'
  },
  {
    id: 'cyberpunk-night',
    title: 'Neon Cyberpunk Night Out',
    desc: 'Futuristic techwear with vibrant neon reflections on rainy street.',
    concept: 'Cyberpunk futuristic streetwear editorial',
    setting: 'Tokyo Shibuya crossing under rainy neon night lights'
  }
];

export default function GroupPhotoshootStudio({ personas, activePersona }: GroupPhotoshootStudioProps) {
  const [creatorProfile] = useCreatorProfile();
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>(() => {
    if (personas.length >= 2) return [personas[0].id, personas[1].id];
    if (personas.length === 1) return [personas[0].id, 'creator'];
    return [];
  });
  const [selectedPresetId, setSelectedPresetId] = useState(CROSSOVER_PRESETS[0].id);
  const [customConcept, setCustomConcept] = useState('');
  const [customSetting, setCustomSetting] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9' | '4:5'>('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  const togglePersonaSelection = (id: string) => {
    if (selectedPersonaIds.includes(id)) {
      if (selectedPersonaIds.length <= 2) {
        toast.error('Select at least 2 participants for a crossover photoshoot');
        return;
      }
      setSelectedPersonaIds(prev => prev.filter(pId => pId !== id));
    } else {
      if (selectedPersonaIds.length >= 3) {
        toast.error('You can select up to 3 participants for a photoshoot');
        return;
      }
      setSelectedPersonaIds(prev => [...prev, id]);
    }
  };

  const handleGeneratePhotoshoot = async () => {
    const selectedParticipants = selectedPersonaIds.map(id => {
      if (id === 'creator') {
        return {
          id: 'creator',
          name: creatorProfile.name || 'Creator',
          visualStyle: creatorProfile.appearance || 'Charismatic stylish creator',
          avatar: creatorProfile.primaryPhoto,
          image: creatorProfile.primaryPhoto,
        };
      }
      const found = personas.find(p => p.id === id);
      return found ? {
        id: found.id,
        name: found.name,
        visualStyle: found.visualStyle,
        avatar: found.avatar || found.referenceImage,
        image: found.referenceImage || found.avatar,
      } : null;
    }).filter(Boolean);

    if (selectedParticipants.length < 2) {
      toast.error('Select at least 2 participants');
      return;
    }

    const preset = CROSSOVER_PRESETS.find(p => p.id === selectedPresetId);
    const concept = customConcept || preset?.concept || 'Fashion photoshoot';
    const setting = customSetting || preset?.setting || 'Studio lighting';

    setIsGenerating(true);
    setResultImageUrl(null);
    toast.loading(`Synthesizing dual photoshoot with ${selectedParticipants.map(p => p?.name).join(' & ')}...`, { id: 'group-shoot' });

    try {
      const res = await fetch('/api/multi-persona-photoshoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personas: selectedParticipants,
          concept,
          setting,
          aspectRatio
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed multi-persona photoshoot');

      setResultImageUrl(data.imageUrl);
      toast.success('Crossover photoshoot generated with identity lock!', { id: 'group-shoot' });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Photoshoot generation failed', { id: 'group-shoot' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-teal-900/40 via-cyan-900/30 to-zinc-900 border border-teal-500/30 p-6 overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                <Sparkles size={11} /> Dual-Identity AI Engine
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              Multi-Persona & Creator Crossover Shoots
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl mt-1">
              Combine your AI Influencers and yourself in the same scene. Dual face-locking ensures all identities remain 100% consistent in a single shot.
            </p>
          </div>
          <button
            onClick={handleGeneratePhotoshoot}
            disabled={isGenerating || selectedPersonaIds.length < 2}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {isGenerating ? 'Generating Group Shot...' : 'Generate Crossover Shoot'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Config Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Persona & Creator Selection */}
          <div className="bg-[var(--bg-card)] border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} /> 1. Select Participants ({selectedPersonaIds.length}/3)
              </h3>
              <span className="text-[11px] text-zinc-400">Pick 2 or 3 (Personas + Creator)</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Creator Card */}
              <button
                type="button"
                onClick={() => togglePersonaSelection('creator')}
                className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedPersonaIds.includes('creator')
                    ? 'bg-[#E7C477]/15 border-[#E7C477]/50 shadow-md shadow-amber-950/30'
                    : 'bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100 hover:border-[#E7C477]/30'
                }`}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-[#E7C477] to-amber-600 flex items-center justify-center text-zinc-950 shrink-0 border border-[#E7C477]/40 shadow-sm">
                  {creatorProfile.primaryPhoto ? (
                    <img src={creatorProfile.primaryPhoto} alt="Creator" className="w-full h-full object-cover" />
                  ) : (
                    <User size={18} className="text-zinc-950" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-bold text-white truncate">{creatorProfile.name || 'You (Creator)'}</h4>
                  </div>
                  <p className="text-[10px] text-[#F2D58D] truncate">⭐ Creator Profile</p>
                </div>
                {selectedPersonaIds.includes('creator') && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#E7C477] text-zinc-950 flex items-center justify-center font-bold">
                    <Check size={10} />
                  </div>
                )}
              </button>

              {/* Persona Cards */}
              {personas.map(p => {
                const isSelected = selectedPersonaIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePersonaSelection(p.id)}
                    className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-teal-500/15 border-teal-500/50 shadow-md shadow-teal-500/10'
                        : 'bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100 hover:border-white/20'
                    }`}
                  >
                    <img
                      src={p.avatar || p.referenceImage || 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1'}
                      alt={p.name}
                      className="w-10 h-10 rounded-lg object-cover border border-white/10"
                    />
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-white truncate">{p.name}</h4>
                      <p className="text-[10px] text-zinc-400 truncate">{p.niche}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-teal-500 text-white flex items-center justify-center">
                        <Check size={10} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Crossover Presets */}
          <div className="bg-[var(--bg-card)] border border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <Camera size={14} /> 2. Crossover Concept Presets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CROSSOVER_PRESETS.map(preset => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => { setSelectedPresetId(preset.id); setCustomConcept(''); setCustomSetting(''); }}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-teal-500/15 border-teal-500/50 shadow-md shadow-teal-500/10'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <h4 className="text-xs font-bold text-white mb-1 flex items-center justify-between">
                      {preset.title}
                      {isSelected && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">ACTIVE</span>}
                    </h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{preset.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aspect Ratio Picker */}
          <div className="bg-[var(--bg-card)] border border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} /> 3. Canvas Aspect Ratio
            </h3>
            <div className="flex gap-2">
              {(['1:1', '9:16', '16:9', '4:5'] as const).map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    aspectRatio === ratio
                      ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                      : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Result Output */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[var(--bg-card)] border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon size={14} className="text-teal-400" /> Crossover Photo Canvas
            </h3>

            {isGenerating ? (
              <div className="aspect-square rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center p-6 text-center gap-3">
                <Loader2 size={32} className="text-teal-400 animate-spin" />
                <p className="text-xs font-bold text-zinc-300">Rendering multi-person diffusion with Seedream v5.0 Pro...</p>
                <p className="text-[10px] text-zinc-500">Executing dual face-lock identity pass</p>
              </div>
            ) : resultImageUrl ? (
              <div className="space-y-3">
                <div className="relative aspect-square rounded-xl overflow-hidden border border-teal-500/30 group">
                  <img src={resultImageUrl} alt="Group photoshoot result" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex items-end justify-between">
                    <a
                      href={resultImageUrl}
                      download="crossover-photoshoot.png"
                      className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md"
                    >
                      <Download size={14} /> Download
                    </a>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 size={12} /> Both Identities Locked
                  </span>
                  <span>Seedream v5.0 Pro</span>
                </div>
              </div>
            ) : (
              <div className="aspect-square rounded-xl bg-black/40 border border-dashed border-white/10 flex flex-col items-center justify-center p-6 text-center text-zinc-500 gap-2">
                <Users size={32} className="text-zinc-600 mb-1" />
                <p className="text-xs font-bold text-zinc-400">No Crossover Shot Generated Yet</p>
                <p className="text-[11px] text-zinc-500 max-w-[200px]">Select 2 personas on the left and click Generate to see them together!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
