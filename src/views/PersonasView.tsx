import { Plus, Search, Edit2, Trash2, X, Check, Camera, Upload, Image as ImageIcon, AlertTriangle, Sparkles } from 'lucide-react';
import { useState, useRef } from 'react';
import { cn } from '../utils/cn';
import { Persona, GeneratedImage } from '../types';
import { VisualGenerator } from '../components/VisualGenerator';

interface PersonasViewProps {
  personas: Persona[];
  setPersonas: (p: Persona[]) => void;
  onSelectPersona: (id: string) => void;
  selectedId: string;
}

export default function PersonasView({ personas, setPersonas, onSelectPersona, selectedId }: PersonasViewProps) {
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [activePersonaForGen, setActivePersonaForGen] = useState<Persona | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPersonas = personas.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.niche.toLowerCase().includes(q) || p.tone.toLowerCase().includes(q) || p.platform.toLowerCase().includes(q);
  });

  const handleSaveGeneratedImage = (img: GeneratedImage) => {
    if (!activePersonaForGen) return;
    const updated = personas.map(p => {
      if (p.id === activePersonaForGen.id) {
        return {
          ...p,
          visualLibrary: [...(p.visualLibrary || []), img]
        };
      }
      return p;
    });
    setPersonas(updated);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingPersona) {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 500;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              // Compress to JPEG to save space in localStorage
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              setEditingPersona({
                ...editingPersona,
                referenceImage: dataUrl
              });
            } else {
              // Fallback if canvas context fails
              setEditingPersona({
                ...editingPersona,
                referenceImage: reader.result as string
              });
            }
          };
          img.onerror = () => {
            // Fallback if image loading fails
            setEditingPersona({
              ...editingPersona,
              referenceImage: reader.result as string
            });
          };
          img.src = reader.result as string;
        } catch (err) {
          console.error('Image compression failed', err);
          // Fallback
          setEditingPersona({
            ...editingPersona,
            referenceImage: reader.result as string
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPersona = () => {
    // Check if the placeholder persona already exists (user clicked twice without editing)
    const existingNew = personas.find(p => p.name === 'New Persona' && p.status === 'Draft');
    if (existingNew) {
      onSelectPersona(existingNew.id);
      setEditingPersona(existingNew);
      return;
    }

    const newPersona: Persona = {
      id: `user-${Date.now()}`,
      name: 'New Persona',
      niche: 'Lifestyle',
      tone: 'Professional',
      platform: 'Instagram',
      status: 'Draft',
      avatar: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=150&h=150',
      personalityTraits: ['Creative'],
      visualStyle: 'Modern',
      audienceType: 'General',
      contentBoundaries: '',
      bio: '',
      brandVoiceRules: '',
      contentGoals: '',
      personaNotes: ''
    };
    
    // Add new persona to the list
    setPersonas([...personas, newPersona]);
    // Set it as active
    onSelectPersona(newPersona.id);
    // Open the edit sheet immediately
    setEditingPersona(newPersona);
  };

  const handleUpdatePersona = () => {
    if (!editingPersona) return;
    try {
      // Ensure arrays and required fields exist to prevent rendering crashes
      const safePersona = {
        ...editingPersona,
        personalityTraits: editingPersona.personalityTraits || [],
        brandVoiceRules: editingPersona.brandVoiceRules || '',
        visualLibrary: editingPersona.visualLibrary || [],
        name: editingPersona.name || 'Unnamed Persona',
        niche: editingPersona.niche || 'General',
        tone: editingPersona.tone || 'Neutral'
      };

      const updated = personas.map(p => p.id === safePersona.id ? safePersona : p);
      setPersonas(updated);
      setEditingPersona(null);
    } catch (error) {
      console.error('Crash during persona save:', error);
      // Fallback safely if mapping somehow crashes
      setEditingPersona(null);
    }
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    const updated = personas.filter(p => p.id !== deleteConfirmId);
    setPersonas(updated);
    if (selectedId === deleteConfirmId) {
      if (updated.length > 0) {
        onSelectPersona(updated[0].id);
      } else {
        onSelectPersona('');
      }
    }
    setDeleteConfirmId(null);
  };

  const handleDeletePersona = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const handleOpenEdit = (persona: Persona) => {
    setEditingPersona({ ...persona });
  };

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personas</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your AI identities</p>
        </div>
        <button 
          onClick={handleAddPersona}
          className="bg-indigo-600 hover:bg-indigo-500 p-2.5 rounded-full shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search personas..." 
          className="w-full bg-[#1A1A1A] border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
        />
      </div>

      <div className="grid gap-4">
        {filteredPersonas.map((persona) => {
          const isSelected = selectedId === persona.id;
          return (
            <div 
              key={persona.id} 
              onClick={() => onSelectPersona(persona.id)}
              className={cn(
                "group relative bg-[#1A1A1A] border rounded-3xl p-5 cursor-pointer transition-all duration-300 overflow-hidden",
                isSelected ? "border-indigo-500 ring-1 ring-indigo-500/50" : "border-white/5 hover:border-white/20"
              )}
            >
              <div className="absolute top-0 right-0 p-4 opacity-40 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                <button 
                  onClick={(e) => handleDeletePersona(e, persona.id)}
                  className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors text-gray-500"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePersonaForGen(persona);
                    setShowGenerator(true);
                  }}
                  className="p-1.5 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors"
                  title="Generate Visuals"
                >
                  <Sparkles size={18} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(persona);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-500"
                >
                  <Edit2 size={18} />
                </button>
              </div>
              
              <div 
                className="flex gap-4" 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPersona(persona.id);
                  handleOpenEdit(persona);
                }}
              >
                <div className="relative">
                  {persona.referenceImage ? (
                    <img 
                      src={persona.referenceImage} 
                      alt={persona.name} 
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500/20"
                    />
                  ) : (
                    <img 
                      src={persona.avatar} 
                      alt={persona.name} 
                      className="w-16 h-16 rounded-2xl object-cover"
                    />
                  )}
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1A1A1A]",
                    persona.status === 'Active' ? "bg-green-500" : "bg-gray-500"
                  )}></div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">{persona.name}</h3>
                    <span className={cn(
                      "text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border",
                      isSelected ? "text-indigo-400 border-indigo-400/20 bg-indigo-400/5" : "text-gray-500 border-gray-500/20 bg-gray-500/5"
                    )}>
                      {isSelected ? 'Active' : persona.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{persona.niche}</p>
                  
                  {persona.visualLibrary && persona.visualLibrary.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-hidden">
                      {persona.visualLibrary.slice(-4).map((img) => (
                        <div key={img.id} className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0">
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {persona.visualLibrary.length > 4 && (
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-gray-500 font-bold shrink-0">
                          +{persona.visualLibrary.length - 4}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-[11px] bg-white/5 text-gray-300 px-2 py-1 rounded-md border border-white/5">
                      {persona.tone}
                    </span>
                    <span className="text-[11px] bg-white/5 text-gray-300 px-2 py-1 rounded-md border border-white/5">
                      {persona.platform}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {deleteConfirmId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1A1A1A] w-full max-w-sm rounded-[32px] border border-white/10 p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2">Delete Persona?</h3>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                  This action is permanent and will remove all content plans and settings associated with this persona.
                </p>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button 
                    onClick={() => setDeleteConfirmId(null)}
                    className="py-3.5 px-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="py-3.5 px-4 bg-red-600 hover:bg-red-500 rounded-2xl font-bold shadow-lg shadow-red-600/20 transition-all active:scale-95"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingPersona && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#121212] w-full max-w-xl rounded-t-[40px] border-t border-x border-white/10 overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
              <header className="px-6 pt-8 pb-4 flex justify-between items-center bg-[#121212] border-b border-white/5">
                <div>
                  <h2 className="text-xl font-bold">Edit Persona</h2>
                  <p className="text-xs text-gray-500">Fine-tune your AI identity</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingPersona(null)}
                    className="p-2 hover:bg-white/5 rounded-full text-gray-400"
                  >
                    <X size={20} />
                  </button>
                  <button 
                    onClick={handleUpdatePersona}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white shadow-lg shadow-indigo-600/20"
                  >
                    <Check size={20} />
                  </button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Avatar Section */}
                <div className="flex justify-center">
                  <div className="relative group cursor-pointer">
                    <img 
                      src={editingPersona.avatar} 
                      alt="Avatar" 
                      className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white/5"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={24} />
                    </div>
                  </div>
                </div>

                {/* Reference Image Upload */}
                <section className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                      <ImageIcon size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Reference Image</h3>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Visual Style Reference (Optional)</p>
                    </div>
                  </div>
                  
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "relative border-2 border-dashed border-white/10 rounded-2xl p-4 transition-all cursor-pointer hover:border-indigo-500/50 hover:bg-white/[0.02]",
                      editingPersona.referenceImage ? "aspect-video" : "py-10 text-center"
                    )}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                    
                    {editingPersona.referenceImage ? (
                      <div className="relative w-full h-full group">
                        <img 
                          src={editingPersona.referenceImage} 
                          alt="Reference" 
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                          <div className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                            <Upload size={14} /> Replace Image
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPersona({...editingPersona, referenceImage: undefined});
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 rounded-full text-white transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-white/5 rounded-full text-gray-400 group-hover:text-indigo-400 transition-colors">
                          <Upload size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-300">Tap to upload reference</p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Form Fields */}
                <div className="space-y-8 pb-10">
                  {/* Core Identity Section */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400/80 mb-4 px-1">Core Identity</h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Name</label>
                        <input 
                          value={editingPersona.name}
                          onChange={e => setEditingPersona({...editingPersona, name: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                          placeholder="e.g. Aria Thorne"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Niche</label>
                          <input 
                            value={editingPersona.niche}
                            onChange={e => setEditingPersona({...editingPersona, niche: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                            placeholder="e.g. Luxury Travel"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Tone</label>
                          <input 
                            value={editingPersona.tone}
                            onChange={e => setEditingPersona({...editingPersona, tone: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                            placeholder="e.g. Elegant, Elite"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Platform Focus</label>
                          <input 
                            value={editingPersona.platform}
                            onChange={e => setEditingPersona({...editingPersona, platform: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                            placeholder="e.g. Instagram"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Status</label>
                          <select 
                            value={editingPersona.status}
                            onChange={e => setEditingPersona({...editingPersona, status: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all appearance-none"
                          >
                            <option value="Active">Active</option>
                            <option value="Draft">Draft</option>
                            <option value="Archived">Archived</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Short Bio / Context</label>
                        <textarea 
                          value={editingPersona.bio}
                          onChange={e => setEditingPersona({...editingPersona, bio: e.target.value})}
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none"
                          placeholder="What's the story behind this persona?"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Personality & Voice Section */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400/80 mb-4 px-1">Personality & Voice</h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Personality Traits</label>
                        <input 
                          value={editingPersona.personalityTraits?.join(', ') || ''}
                          onChange={e => setEditingPersona({...editingPersona, personalityTraits: e.target.value.split(',').map(s => s.trim())})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                          placeholder="e.g. Ambitious, Sophisticated, Witty (comma separated)"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Brand Voice Rules</label>
                        <textarea 
                          value={editingPersona.brandVoiceRules}
                          onChange={e => setEditingPersona({...editingPersona, brandVoiceRules: e.target.value})}
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none"
                          placeholder="e.g. Always use emojis ✨, use short sentences..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Audience Type</label>
                        <input 
                          value={editingPersona.audienceType}
                          onChange={e => setEditingPersona({...editingPersona, audienceType: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                          placeholder="e.g. Aspiring entrepreneurs, Gen Z fashionistas"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Content Rules Section */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400/80 mb-4 px-1">Content Rules</h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Visual Style</label>
                        <input 
                          value={editingPersona.visualStyle}
                          onChange={e => setEditingPersona({...editingPersona, visualStyle: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                          placeholder="e.g. High-contrast, minimalist, pastel colors"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Content Boundaries</label>
                        <textarea 
                          value={editingPersona.contentBoundaries}
                          onChange={e => setEditingPersona({...editingPersona, contentBoundaries: e.target.value})}
                          rows={2}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none"
                          placeholder="e.g. Never discuss politics, avoid profanity..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Content Goals</label>
                        <input 
                          value={editingPersona.contentGoals}
                          onChange={e => setEditingPersona({...editingPersona, contentGoals: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                          placeholder="e.g. Build mystery, establish authority"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Advanced Section */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400/80 mb-4 px-1">Advanced</h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Persona Notes</label>
                        <textarea 
                          value={editingPersona.personaNotes}
                          onChange={e => setEditingPersona({...editingPersona, personaNotes: e.target.value})}
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none"
                          placeholder="Internal notes, research, or reminders..."
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className="p-6 border-t border-white/5 bg-white/[0.02]">
                <button 
                  onClick={handleUpdatePersona}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {personas.length === 0 && (
          <div className="text-center py-12 px-4 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.02]">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus className="text-gray-500" size={32} />
            </div>
            <h3 className="text-lg font-semibold mb-2">No personas yet</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
              Create your first AI identity to start planning and generating content.
            </p>
          </div>
        )}

        <button 
          onClick={handleAddPersona}
          className="flex items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-white/5 rounded-3xl text-gray-500 hover:text-gray-400 hover:border-white/10 transition-all group"
        >
          <Plus size={20} className="group-hover:scale-110 transition-transform" />
          <span className="font-medium text-sm">Add New Persona</span>
        </button>
      </div>

      {showGenerator && activePersonaForGen && (
        <VisualGenerator 
          persona={activePersonaForGen} 
          onClose={() => setShowGenerator(false)} 
          onSaveImage={handleSaveGeneratedImage}
        />
      )}
    </div>
  );
}
