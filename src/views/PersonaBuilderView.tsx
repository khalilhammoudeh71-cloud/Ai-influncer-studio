import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, Save, Sparkles, Upload, X, Info, Image as ImageIcon, Video, Mic, Volume2, MessageSquare, Plus, Check, Camera, Diamond, Dumbbell, ShoppingBag, Briefcase, Activity, Sliders } from 'lucide-react';
import { Persona } from '../types';
import { identitySheetPlaceholders } from '../data/demoAssets';

interface PersonaBuilderViewProps {
  persona: Persona;
  onChange: (p: Persona) => void;
  onSave: () => void;
  onCancel: () => void;
}

const PERSONA_TYPES = [
  { id: 'luxury', label: 'Luxury\nInfluencer', icon: Diamond },
  { id: 'fitness', label: 'Fitness\nCreator', icon: Dumbbell },
  { id: 'fashion', label: 'Fashion\nModel', icon: ShoppingBag },
  { id: 'ugc', label: 'UGC\nCreator', icon: MessageSquare },
  { id: 'professional', label: 'Professional', icon: Briefcase },
  { id: 'healthcare', label: 'Dental /\nHealthcare', icon: Activity },
  { id: 'custom', label: 'Custom', icon: Sliders }
];

export default function PersonaBuilderView({ persona, onChange, onSave, onCancel }: PersonaBuilderViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState('luxury');
  const [isGeneratingAngles, setIsGeneratingAngles] = useState(false);
  const [realAngles, setRealAngles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isGeneratingAngles && Object.keys(realAngles).length === 0) {
      generateAngles();
    }
  }, [persona.referenceImage]);

  const generateAngles = async () => {
    const baseImage = persona.referenceImage || "/isabella_laurent_reference.png";
    setIsGeneratingAngles(true);

    const targetAngles = [
      { label: "High Angle", p: "As part of a 9 angle identity sheet: high angle shot. Using the reference photo for identity and style consistency, generate a new image of the exact same subject. High angle shot of the exact same woman looking slightly down. Maintain exact facial features, hair, and clothing perfectly." },
      { label: "Eye Level", p: "As part of a 9 angle identity sheet: eye level shot. Using the reference photo for identity and style consistency, generate a direct eye level portrait looking at the camera of the exact same woman. Maintain exact facial features, hair, and clothing perfectly." },
      { label: "Low Angle", p: "As part of a 9 angle identity sheet: low angle shot. Using the reference photo for identity and style consistency, generate a low angle shot from below looking up towards the camera of the exact same woman. Maintain exact facial features, hair, and clothing perfectly." },
      { label: "Profile Left", p: "As part of a 9 angle identity sheet: left side profile view. Using the reference photo for identity and style consistency, generate a 90 degree left side profile view of the exact same woman. Maintain exact facial features, hair, and clothing perfectly." },
      { label: "Front View", p: "As part of a 9 angle identity sheet: front view. Using the reference photo for identity and style consistency, generate a front view portrait of the exact same woman looking straight at camera. Maintain exact facial features, hair, and clothing perfectly." },
      { label: "Profile Right", p: "As part of a 9 angle identity sheet: right side profile view. Using the reference photo for identity and style consistency, generate a 90 degree right side profile view of the exact same woman. Maintain exact facial features, hair, and clothing perfectly." },
      { label: "Three-Quarter Left", p: "As part of a 9 angle identity sheet: three-quarter left view. Using the reference photo for identity and style consistency, generate a three quarter view to the left side of the exact same woman. Maintain exact facial features, hair, and clothing perfectly." },
      { label: "Over-the-Shoulder", p: "As part of a 9 angle identity sheet: over-the-shoulder view. Using the reference photo for identity and style consistency, generate an over the shoulder shot looking back at the camera of the exact same woman. Maintain exact facial features, hair, and clothing perfectly." },
      { label: "Three-Quarter Right", p: "As part of a 9 angle identity sheet: three-quarter right view. Using the reference photo for identity and style consistency, generate a three quarter view to the right side of the exact same woman. Maintain exact facial features, hair, and clothing perfectly." }
    ];

    const promises = targetAngles.map(async (angle) => {
      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referenceImage: baseImage,
            modelId: 'google:nano-banana-pro',
            isChatContext: true,
            chatPrompt: angle.p
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.imageUrl) {
            setRealAngles(prev => ({ ...prev, [angle.label]: data.imageUrl }));
          }
        }
      } catch (e) {
        console.error(e);
      }
    });

    await Promise.all(promises);
    setIsGeneratingAngles(false);
  };
  
  // Handlers for inputs
  const updateField = (field: keyof Persona, value: any) => {
    onChange({ ...persona, [field]: value });
  };

  const handleToneRemove = (t: string) => {
    const tones = (persona.tone || '').split(',').map(s => s.trim()).filter(Boolean);
    updateField('tone', tones.filter(tone => tone !== t).join(', '));
  };

  const handleToneAdd = () => {
    const newTone = prompt('Enter a new tone trait:');
    if (newTone && newTone.trim()) {
      const currentTones = (persona.tone || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!currentTones.includes(newTone.trim())) {
        updateField('tone', [...currentTones, newTone.trim()].join(', '));
      }
    }
  };

  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 400;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
            } else {
              if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            } else {
              resolve(reader.result as string);
            }
          };
          img.onerror = () => resolve(reader.result as string);
          img.src = reader.result as string;
        } catch {
          resolve(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const compressed = await Promise.all(files.map(compressImage));
    const [primary, ...extras] = compressed;
    const existingExtras = persona.additionalReferenceImages || [];
    onChange({
      ...persona,
      referenceImage: persona.referenceImage ? persona.referenceImage : primary,
      additionalReferenceImages: persona.referenceImage ? [...existingExtras, primary, ...extras] : [...existingExtras, ...extras],
    });
    e.target.value = '';
  };

  const removeReferenceImage = (index: number) => {
    if (index === -1) {
      // Removing primary
      const extras = persona.additionalReferenceImages || [];
      if (extras.length > 0) {
        onChange({ ...persona, referenceImage: extras[0], additionalReferenceImages: extras.slice(1) });
      } else {
        onChange({ ...persona, referenceImage: undefined });
      }
    } else {
      const extras = [...(persona.additionalReferenceImages || [])];
      extras.splice(index, 1);
      onChange({ ...persona, additionalReferenceImages: extras });
    }
  };

  const allImages = [
    ...(persona.referenceImage ? [persona.referenceImage] : []),
    ...(persona.additionalReferenceImages || [])
  ];

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white p-4 md:p-6 pb-96 font-sans selection:bg-[#00D4FF]/30 select-none animate-in fade-in duration-500 overflow-x-hidden">
      <div className="max-w-[1360px] mx-auto flex flex-col lg:flex-row items-start gap-6 relative">
        
        {/* LEFT COLUMN */}
        <div className="flex-1 w-full lg:max-w-[calc(100%-436px)] space-y-4">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold text-[#00D4FF] tracking-[0.2em] uppercase mb-0.5 drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]">Persona Builder</p>
              <h1 className="text-[34px] font-extrabold tracking-tight text-white mb-1 leading-none flex items-center gap-2">
                Create Your Persona <Sparkles size={28} className="text-[#00D4FF]" />
              </h1>
              <p className="text-sm font-medium text-[#94A3B8]">Build a reusable AI identity for images, videos, talking avatars, and content.</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center justify-between mt-2 mb-4 relative px-4 py-2 border border-[#334155]/60 bg-[#0F172A]/40 backdrop-blur-xl rounded-2xl">
            <div className="absolute top-7 left-8 right-8 h-[1px] bg-[#334155] -z-10" />
            {[
              { num: 1, label: 'Type' },
              { num: 2, label: 'References' },
              { num: 3, label: 'Identity' },
              { num: 4, label: 'Identity Sheet' },
              { num: 5, label: 'Save' }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 relative z-10">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${step.num === 1 ? 'bg-[#00D4FF]/15 border-[#00D4FF] text-[#00D4FF] shadow-[0_0_16px_rgba(0,212,255,0.4)] ring-4 ring-[#00D4FF]/10' : 'bg-[#0B0F17] border-[#334155] text-[#94A3B8]'}`}>
                  {step.num}
                </div>
                <span className={`text-[10px] font-bold transition-all duration-300 ${step.num === 1 ? 'text-[#00D4FF]' : 'text-[#94A3B8]'}`}>{step.label}</span>
              </div>
            ))}
          </div>

          {/* Persona Type Card */}
          <div className="bg-[#0F172A]/70 border border-[#334155] backdrop-blur-xl rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00D4FF]/5 via-transparent to-transparent opacity-50" />
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-white mb-3.5 relative z-10">
              <UserIcon className="text-[#00D4FF]" size={18} /> Choose Persona Type
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 relative z-10">
              {PERSONA_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedType(type.id);
                    updateField('niche', type.label.replace('\n', ' '));
                  }}
                  className={`relative flex flex-col items-center justify-center text-center p-2.5 rounded-xl border transition-all duration-300 shrink-0 select-none cursor-pointer ${
                    selectedType === type.id 
                    ? 'bg-[#00D4FF]/10 border-[#00D4FF] shadow-[0_0_24px_rgba(0,212,255,0.3)] text-white' 
                    : 'bg-[#111827]/80 border-[#334155] text-[#94A3B8] hover:border-[#00D4FF]/50 hover:text-[#CBD5E1]'
                  }`}
                >
                  <type.icon size={22} strokeWidth={1.5} className={`mb-2 ${selectedType === type.id ? 'text-[#00D4FF] drop-shadow-[0_0_8px_#00D4FF]' : 'text-[#64748B]'}`} />
                  <span className="text-[10px] font-bold leading-tight whitespace-pre-line tracking-tight">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload References Card */}
          <div className="bg-[#0F172A]/70 border border-[#334155] backdrop-blur-xl rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00F5C2]/5 via-transparent to-transparent opacity-50" />
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-white mb-3 relative z-10">
              <ImageIcon className="text-[#00D4FF]" size={18} /> Upload Reference Images
            </h3>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#334155] hover:border-[#00D4FF]/60 bg-[#0B0F17]/40 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group mb-3.5 h-[120px] relative z-10 hover:bg-[#111827]/50"
            >
              <div className="w-10 h-10 rounded-xl bg-[#111827] border border-[#334155] flex items-center justify-center mb-2 group-hover:scale-110 group-hover:border-[#00D4FF]/50 transition-all shadow-xl">
                <Upload size={18} className="text-[#00D4FF] drop-shadow-[0_0_6px_#00D4FF]" />
              </div>
              <p className="text-xs text-white font-bold mb-0.5">Drag & drop images here or <span className="text-[#00D4FF] hover:underline">click to browse</span></p>
              <p className="text-[10px] text-[#64748B] font-medium">JPG, PNG, WebP up to 20MB each</p>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} multiple accept="image/*" className="hidden" />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide relative z-10">
              {allImages.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-[#334155] group shadow-xl">
                  <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                  <button onClick={() => removeReferenceImage(i - (persona.referenceImage ? 1 : 0))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white hover:bg-rose-500/90 transition-all opacity-0 group-hover:opacity-100 shadow-xl border border-white/10">
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-[#334155] hover:border-[#00D4FF]/50 flex flex-col items-center justify-center text-[#64748B] hover:text-[#00D4FF] transition-all bg-[#0B0F17]/30 shrink-0 group">
                <Plus size={20} className="group-hover:scale-110 transition-transform duration-300" />
                <span className="text-[9px] font-bold tracking-wide mt-0.5">Add</span>
              </button>
            </div>
            
            <div className="flex items-start gap-2 mt-4 text-[#94A3B8] bg-[#111827]/40 border border-[#334155]/40 rounded-xl p-2.5 relative z-10">
              <Info size={14} className="shrink-0 mt-0.5 text-[#00D4FF]" />
              <p className="text-[11px] font-medium leading-relaxed"><strong>Best results:</strong> front-facing, side angle, clear lighting, no sunglasses, multiple expressions.</p>
            </div>
          </div>

          {/* Identity Details Form */}
          <div className="bg-[#0F172A]/70 border border-[#334155] backdrop-blur-xl rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1]/5 via-transparent to-transparent opacity-50" />
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-white mb-4 relative z-10">
              <UserIcon className="text-[#00D4FF]" size={18} /> Identity Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 relative z-10">
              <div>
                <label className="block text-[10px] font-bold text-[#CBD5E1] uppercase tracking-[0.15em] mb-1.5">Persona Name</label>
                <input type="text" value={persona.name} onChange={e => updateField('name', e.target.value)} className="w-full bg-[#111827]/80 border border-[#334155] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#64748B] font-semibold outline-none transition-all shadow-md" placeholder="e.g. Isabella Laurent" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#CBD5E1] uppercase tracking-[0.15em] mb-1.5">Age Range</label>
                <select className="w-full bg-[#111827]/80 border border-[#334155] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold outline-none appearance-none transition-all cursor-pointer shadow-md">
                  <option>18-24</option>
                  <option selected>25-35</option>
                  <option>36-45</option>
                  <option>46+</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#CBD5E1] uppercase tracking-[0.15em] mb-1.5">Content Niche</label>
                <input type="text" value={persona.niche} onChange={e => updateField('niche', e.target.value)} className="w-full bg-[#111827]/80 border border-[#334155] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#64748B] font-semibold outline-none transition-all shadow-md" placeholder="e.g. Luxury Lifestyle" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#CBD5E1] uppercase tracking-[0.15em] mb-1.5">Style / Vibe</label>
                <input type="text" value={persona.visualStyle} onChange={e => updateField('visualStyle', e.target.value)} className="w-full bg-[#111827]/80 border border-[#334155] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#64748B] font-semibold outline-none transition-all shadow-md" placeholder="e.g. Sophisticated & Modern" />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#CBD5E1] uppercase tracking-[0.15em] mb-1.5">Brand Personality</label>
                  <input type="text" value={(persona.personalityTraits || []).join(', ')} onChange={e => updateField('personalityTraits', e.target.value.split(',').map(s => s.trim()))} className="w-full bg-[#111827]/80 border border-[#334155] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#64748B] font-semibold outline-none transition-all shadow-md" placeholder="e.g. Elite, Exclusive, High-status" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#CBD5E1] uppercase tracking-[0.15em] mb-1.5">Tone Traits</label>
                  <div className="flex flex-wrap gap-1.5 bg-[#111827]/50 border border-[#334155]/60 rounded-xl p-2 min-h-[42px] items-center shadow-md">
                    {(persona.tone || '').split(',').map(s => s.trim()).filter(Boolean).map((t, i) => (
                      <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#00F5C2]/15 border border-[#00F5C2]/30 text-[#00F5C2] drop-shadow-[0_0_6px_rgba(0,245,194,0.15)] animate-in fade-in duration-300">
                        {t} <button onClick={() => handleToneRemove(t)} className="hover:text-rose-400 transition-colors"><X size={10} /></button>
                      </span>
                    ))}
                    <button onClick={handleToneAdd} className="w-6 h-6 rounded-full bg-[#111827] border border-[#334155] flex items-center justify-center text-[#94A3B8] hover:text-white hover:border-[#00D4FF] hover:bg-[#00D4FF]/10 transition-all duration-300">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-[412px] shrink-0 space-y-4 lg:sticky lg:top-4 h-auto">
          
          {/* Live Persona Preview Hero */}
          <div className="relative rounded-2xl overflow-hidden border border-[#334155]/80 bg-[#0F172A]/80 shadow-2xl h-[280px] group transition-all duration-300 hover:border-[#00D4FF]/40">
            <div className="absolute top-4 left-5 flex items-center gap-1.5 z-20">
              <Sparkles size={14} className="text-[#00D4FF] animate-pulse" />
              <span className="text-[11px] font-bold text-white tracking-wide drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]">Live Preview</span>
            </div>
            
            <div className="absolute top-4 right-5 px-2.5 py-0.5 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-1.5 z-20">
              <div className="w-1 h-1 rounded-full bg-[#00F5C2] shadow-[0_0_8px_#00F5C2]" />
              <span className="text-[9px] font-black text-white uppercase tracking-wider">AI Preview</span>
            </div>

            <img 
              src={persona.referenceImage || "/isabella_laurent_reference.png"} 
              alt="Preview" 
              className="absolute right-0 top-0 bottom-0 h-full w-[65%] object-cover object-center transition-transform duration-700 group-hover:scale-105" 
            />

            <div className="absolute inset-0 p-5 flex flex-col justify-end w-[65%] z-10 bg-gradient-to-r from-[#0F172A]/95 via-[#0F172A]/60 to-transparent">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-[24px] font-extrabold text-white tracking-tight leading-tight uppercase">{persona.name || 'Isabella Laurent'}</h2>
              </div>
              <p className="text-[11px] font-bold text-[#CBD5E1] uppercase tracking-[0.1em] mb-2 text-[#00F5C2] drop-shadow-[0_0_6px_#00F5C2]">{persona.niche || 'Luxury Lifestyle Influencer'}</p>
              
              <p className="text-[10px] text-[#94A3B8] font-medium leading-relaxed mb-3 max-w-[240px]">
                {persona.bio || 'Elite, sophisticated, and influential. Embodies success, refinement, and aspirational living.'}
              </p>
              
              <div className="flex flex-wrap gap-1 max-w-[240px]">
                {(persona.tone || 'Luxury, Confident, Exclusive, Elegant').split(',').map((t, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#111827]/85 border border-[#334155]/80 text-[#CBD5E1] backdrop-blur-md tracking-tight hover:border-[#00D4FF]/50 hover:text-white transition-colors duration-200">
                    {t.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Identity Sheet Preview */}
          <div className="bg-[#0F172A]/70 border border-[#334155] backdrop-blur-xl rounded-2xl p-4 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00D4FF]/5 via-transparent to-transparent opacity-30" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2 relative z-10">
              <h3 className="flex items-center gap-1.5 text-[14px] font-bold text-white uppercase tracking-wider">
                <Camera className="text-[#00D4FF]" size={15} /> Identity Sheet Preview
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateAngles}
                  disabled={isGeneratingAngles}
                  className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#0B0F17] bg-gradient-to-r from-[#00F5C2] to-[#00D4FF] rounded-lg border border-transparent hover:scale-105 transition-all duration-300 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingAngles ? 'Generating...' : 'Generate with Nano Banana'}
                </button>
                <div className="flex items-center gap-1 bg-[#0B0F17]/70 border border-[#334155] px-2 py-0.5 rounded-full shadow-lg">
                  <span className="text-[10px] font-black text-[#94A3B8]">9 / 9</span>
                  <Check size={12} className="text-[#00F5C2]" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 relative z-10">
              {identitySheetPlaceholders.map((angle, idx) => {
                const getFallbackImage = (label: string) => {
                  const base = persona.referenceImage || "/isabella_laurent_reference.png";
                  if (!base.includes('images.unsplash.com')) return base;
                  const baseNoParams = base.split('?')[0];
                  if (label === "Front Portrait") return `${baseNoParams}?auto=format&fit=crop&w=800&q=80`;
                  if (label === "Left 45°") return `${baseNoParams}?auto=format&fit=crop&w=800&q=80&crop=focalpoint&fp-x=0.48&fp-y=0.38&fp-z=1.3`;
                  if (label === "Right 45°") return `${baseNoParams}?auto=format&fit=crop&w=800&q=80&crop=focalpoint&fp-x=0.52&fp-y=0.38&fp-z=1.3`;
                  if (label === "Profile Left") return `${baseNoParams}?auto=format&fit=crop&w=800&q=80&crop=focalpoint&fp-x=0.45&fp-y=0.38&fp-z=1.4`;
                  if (label === "Smiling Portrait") return `${baseNoParams}?auto=format&fit=crop&w=800&q=80&crop=focalpoint&fp-x=0.5&fp-y=0.35&fp-z=1.5`;
                  if (label === "Neutral Portrait") return `${baseNoParams}?auto=format&fit=crop&w=800&q=80&crop=focalpoint&fp-x=0.5&fp-y=0.4&fp-z=1.2`;
                  if (label === "Upper Body") return `${baseNoParams}?auto=format&fit=crop&w=800&q=80&crop=focalpoint&fp-x=0.5&fp-y=0.48&fp-z=1`;
                  if (label === "Full Body") return `${baseNoParams}?auto=format&fit=crop&w=800&q=80&crop=focalpoint&fp-x=0.5&fp-y=0.65&fp-z=1`;
                  if (label === "Lifestyle Shot") return `${baseNoParams}?auto=format&fit=crop&w=800&q=80&crop=entropy`;
                  return base;
                };

                return (
                  <div key={idx} className="relative rounded-lg overflow-hidden aspect-[4/5] border border-[#334155]/80 bg-[#111827] group cursor-pointer shadow-lg hover:border-[#00D4FF]/40 transition-all duration-300">
                    <img src={realAngles[angle.label] || angle.img || getFallbackImage(angle.label)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                    <div className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-md border border-white/10 px-2 py-1 rounded-md text-[8px] font-black text-white tracking-wide z-10 uppercase shadow-md">{angle.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* What you'll unlock */}
          <div className="bg-[#0F172A]/70 border border-[#334155] backdrop-blur-xl rounded-2xl p-4 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1]/5 via-transparent to-transparent opacity-30" />
            <h3 className="flex items-center gap-1.5 text-[14px] font-bold text-white mb-3 uppercase tracking-wider relative z-10">
              <Sparkles className="text-[#00D4FF]" size={15} /> What you'll unlock
            </h3>
            
            <div className="grid grid-cols-5 gap-1.5 relative z-10">
              {[
                { title: 'Images', desc: 'Visuals', icon: ImageIcon },
                { title: 'Videos', desc: 'Cinematic', icon: Video },
                { title: 'Talking Avatar', desc: 'Persona', icon: Mic },
                { title: 'Voice', desc: 'Custom AI', icon: Volume2 },
                { title: 'Content Assistant', desc: 'Ideas & cap', icon: MessageSquare }
              ].map((item, idx) => (
                <div key={idx} className="bg-[#111827]/80 border border-[#334155] rounded-xl p-2.5 flex flex-col items-center justify-center text-center hover:border-[#00D4FF]/40 hover:bg-[#111827]/95 transition-all duration-300 shadow-md">
                  <item.icon size={16} className="text-[#00D4FF] mb-1 drop-shadow-[0_0_6px_rgba(0,212,255,0.4)]" />
                  <span className="text-[10px] font-bold text-white mb-0.5 tracking-tight">{item.title}</span>
                  <span className="text-[8px] text-[#94A3B8] font-semibold leading-tight">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B0F17]/95 backdrop-blur-2xl border-t border-[#334155] py-3.5 px-6 shadow-2xl select-none">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between">
          <button onClick={onCancel} className="flex items-center gap-1.5 text-[#94A3B8] hover:text-white font-bold text-xs transition-colors uppercase tracking-wider">
            <ChevronLeft size={16} /> Back
          </button>
          
          <div className="flex items-center gap-3">
            <button onClick={onSave} className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#334155] text-white hover:bg-[#1F2937] hover:border-[#94A3B8]/60 transition-all duration-300 text-xs font-bold uppercase tracking-wider shadow-lg bg-[#0B0F17]/40">
              <Save size={16} /> Save Draft
            </button>
            <button onClick={onSave} className="flex items-center gap-1.5 px-6 py-3 rounded-full bg-gradient-to-r from-[#00F5C2] via-[#00D4FF] to-[#6366F1] text-[#0B0F17] font-black uppercase tracking-wider text-xs shadow-[0_0_24px_rgba(0,212,255,0.4)] hover:shadow-[0_0_36px_rgba(0,245,194,0.6)] hover:scale-[1.03] transition-all duration-300 cursor-pointer">
              Continue to Identity Sheet <ArrowRightIcon className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const UserIcon = ({ className, size }: { className?: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
