import { Plus, Search, Edit2, Trash2, X, Check, Camera, Upload, Image as ImageIcon, AlertTriangle, Sparkles, ArrowRight, ArrowLeft, Download, Heart, Trash, Eye, Loader2, ChevronDown, Cpu, Wand2, Pencil, ArrowUpCircle, Film, LayoutGrid, MessageSquare, Mic, Users, ChevronRight, DollarSign, Wrench, PlusCircle, Calendar, TrendingUp, CheckCircle2, Clock, Share2, Play, ExternalLink, ArrowUpRight, ArrowDownRight, Layers, Sliders, MoreVertical } from 'lucide-react';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { Persona, GeneratedImage, NavActions, Tab } from '../types';
import { api } from '../services/apiService';
import toast from 'react-hot-toast';
import PersonaAvatar from '../components/PersonaAvatar';

interface PersonasViewProps {
  personas: Persona[];
  setPersonas: (p: Persona[]) => void;
  onSelectPersona: (id: string) => void;
  selectedId: string;
  navigateToTab?: (tab: Tab) => void;
  nav: NavActions;
  billingInfo?: any;
}

export default function PersonasView({ personas, setPersonas, onSelectPersona, selectedId, navigateToTab, nav, billingInfo }: PersonasViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleAddPersona = () => {
    nav.push({ view: 'create-persona' });
  };

  const handleEditPersona = (persona: Persona) => {
    nav.push({ view: 'create-persona', params: { personaId: persona.id } });
  };

  const handleDeletePersona = async (personaToDelete: Persona) => {
    if (window.confirm(`Are you sure you want to delete "${personaToDelete.name}"?`)) {
      try {
        await api.personas.delete(personaToDelete.id);
        const updated = personas.filter(p => p.id !== personaToDelete.id);
        setPersonas(updated);
        toast.success(`Deleted persona "${personaToDelete.name}"`);
      } catch (err) {
        toast.error('Failed to delete persona');
      }
    }
  };

  const activePersonas = useMemo(() => {
    return personas.filter(p => p.id !== 'empty');
  }, [personas]);

  const filteredPersonas = useMemo(() => {
    return activePersonas.filter(p => 
      (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.niche || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activePersonas, searchQuery]);

  return (
    <div className="personas-refined p-4 sm:p-6 lg:p-8 max-w-[1320px] mx-auto space-y-8" style={{paddingBottom:'calc(7rem + env(safe-area-inset-bottom))'}}>
      
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F1E8]">Personas <span className="text-sm text-[#A1A1AA] font-normal ml-2">{activePersonas.length}</span></h1>
        <button type="button" onClick={handleAddPersona} className="btn-gold-primary min-h-11 px-3 sm:px-4 text-sm font-semibold flex items-center gap-2 whitespace-nowrap"><Plus size={16}/>Create persona</button>
      </header>
      <div className="space-y-5">
        <div className="relative max-w-xl">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]"/>
          <input type="search" aria-label="Search personas" placeholder="Search by name or niche" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full h-11 bg-[#141416] border border-white/10 rounded-lg pl-10 pr-4 text-sm text-[#F5F1E8] placeholder-[#A1A1AA] focus:outline-none focus:border-[#E7C477]"/>
        </div>
        {/* Persona Cards Grid */}
        {activePersonas.length === 0 ? (
          <div className="luxury-card relative overflow-hidden px-6 py-14 sm:px-10 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(231,196,119,0.08),transparent_55%)] pointer-events-none" />
            <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-[#E7C477]/10 border border-[#E7C477]/25 text-[#E7C477] flex items-center justify-center mb-5 shadow-lg shadow-black/30">
                <Users size={28} />
              </div>
              <h3 className="text-2xl font-serif text-[#F5F1E8]">Your studio is ready</h3>
              <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed">
                Create a character you can use again in photos, videos, and conversations. Start with a name and a reference photo.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 w-full text-left">
                {[
                  ['1', 'Name your character'],
                  ['2', 'Choose their look'],
                  ['3', 'Choose a voice'],
                ].map(([step, label]) => (
                  <div key={step} className="rounded-xl border border-white/8 bg-[#161618] p-3">
                    <span className="text-[10px] font-bold text-[#E7C477]">STEP {step}</span>
                    <p className="mt-1 text-[11px] font-semibold text-[#D4D4D8]">{label}</p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddPersona}
                className="btn-gold-primary mt-7 px-7 py-3 text-sm flex items-center gap-2 cursor-pointer"
              >
                <Plus size={16} /> Create a persona
              </button>
            </div>
          </div>
        ) : filteredPersonas.length === 0 ? (
          <div className="luxury-card px-6 py-12 text-center">
            <Search size={24} className="mx-auto text-[#71717A]" />
            <h3 className="mt-3 text-base font-semibold text-[#F5F1E8]">No personas found</h3>
            <p className="mt-1 text-xs text-[#A1A1AA]">Try a different name or niche.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-5" style={{gridTemplateColumns:'repeat(auto-fill, minmax(min(100%, 220px), 1fr))'}}>
          {filteredPersonas.map(p => {
            const isSelected = p.id === selectedId;
            return (
              <div
                key={p.id}
                onClick={() => onSelectPersona(p.id)}
                className={cn(
                  "persona-card overflow-hidden rounded-xl border bg-[#1D1D20] cursor-pointer transition-colors group relative",
                  isSelected ? "border-[#E7C477]/60" : "border-white/10 hover:border-white/25"
                )}
              >
                <div className="w-full aspect-[1/1] overflow-hidden relative bg-[#141416] flex items-center justify-center">
                  <button type="button" aria-label={`Select ${p.name}`} aria-pressed={isSelected} onClick={e=>{e.stopPropagation();onSelectPersona(p.id);}} className="absolute inset-0 z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E7C477]"/>
                  {p.avatar || p.referenceImage ? (
                    <PersonaAvatar
                      src={p.avatar || p.referenceImage} 
                      alt={p.name} 
                      className="w-full h-full object-cover object-[center_25%]" 
                      fallbackSrc={p.additionalReferenceImages?.[0] || '/demo/ai_sample_influencer.png'}
                    />
                  ) : (
                    <Users size={32} className="text-zinc-600" />
                  )}
                  {isSelected && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#E7C477] text-[#161618] text-[10px] font-semibold">
                      Active
                    </span>
                  )}
                  <div className="absolute left-2 top-2 z-20">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuId(current => current === p.id ? null : p.id);
                      }}
                      aria-label={`More actions for ${p.name}`}
                      aria-expanded={openMenuId === p.id}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7C477]"
                    >
                      <MoreVertical size={15} />
                    </button>
                    {openMenuId === p.id && (
                      <div className="absolute left-0 top-10 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#18181B] p-1 shadow-2xl">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuId(null);
                            handleDeletePersona(p);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/10"
                        >
                          <Trash2 size={13} /> Delete persona
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3 p-3 sm:p-4">
                  <div>
                    <p className="text-sm sm:text-base font-semibold text-[#F5F1E8] truncate">{p.name || 'Unnamed Persona'}</p>
                    <p className="text-xs text-[#A1A1AA] truncate">{p.niche || 'Digital Creator'}</p>
                  </div>
                  
                  {/* Primary actions stay visible; destructive actions live in the overflow menu. */}
                  <div className="flex items-center gap-2 w-full">
                    {/* Chat Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPersona(p.id);
                        nav.push({ view: 'assistant' });
                      }}
                      className="flex-1 min-h-11 rounded-lg bg-white/[.035] hover:bg-white/[.07] border border-white/15 text-[#F5F1E8] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      title="Chat with AI Persona"
                    >
                      <MessageSquare size={14} />
                      <span>Chat</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPersona(p);
                      }}
                      className="flex-1 min-h-11 rounded-lg hover:bg-white/[.05] border border-white/15 text-[#F5F1E8] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      title="Edit Persona Settings"
                    >
                      <Pencil size={14} className="text-slate-300" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      <details className="border-t border-white/10 pt-4"><summary className="cursor-pointer text-sm text-[var(--text-secondary)]">Creation shortcuts & inspiration</summary>
      {/* ── FEATURE CARDS ROW (3 CARDS IN CHARCOAL & GOLD) ── */}
      <section aria-labelledby="generation-options-heading" className="border-t border-white/10 pt-8 sm:pt-10 space-y-5">
        <header>
          <h2 id="generation-options-heading" className="text-xl font-semibold text-[#F5F1E8]">Create with your personas</h2>
          <p className="text-sm text-[#A1A1AA] mt-2">Choose what to make next: photos, videos, or content.</p>
        </header>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          {
            icon: Camera,
            title: 'Photos',
            desc: 'Create stunning, identity-consistent photos in any setting, outfit, and style',
            image: '/examples/showcase_haute_couture.png',
            action: () => nav.replace({ view: 'create', subView: 'image' })
          },
          {
            icon: Film,
            title: 'Videos',
            desc: 'Turn any photo into a talking video or animated clip with custom voice',
            image: '/examples/showcase_red_carpet.png',
            action: () => nav.replace({ view: 'create', subView: 'video' })
          },
          {
            icon: Sparkles,
            title: 'Content',
            desc: 'Generate scripts, plan posts, clone voices — a full content creation suite',
            image: '/examples/showcase_parisian_chic.png',
            action: () => nav.replace({ view: 'planner' })
          },
        ].map((feature, i) => {
          const FIcon = feature.icon;
          return (
            <motion.button
              type="button"
              key={feature.title}
              className="group overflow-hidden rounded-xl border border-white/10 hover:border-white/25 text-left relative"
              onClick={feature.action}
            >
              <div className="h-32 sm:h-44 relative">
                <img src={feature.image} alt="" className="w-full h-full object-cover"/>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"/>
                <h3 className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 text-sm sm:text-lg font-semibold text-white">{feature.title}</h3>
              </div>
            </motion.button>
          );
        })}
      </div>

      </section>

      {/* ── EXAMPLE SHOWCASE STRIP ("WHAT YOU CAN CREATE") ── */}
      <motion.section
        aria-labelledby="creation-examples-heading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="border-t border-white/10 pt-8 sm:pt-10 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="creation-examples-heading" className="text-xl font-semibold text-[#F5F1E8]">Inspiration</h2>
            <p className="text-sm text-[#A1A1AA] mt-2">Explore AI-generated examples for your next creation.</p>
          </div>

        </div>
        
        <div className="flex gap-4 pb-3 overflow-x-auto custom-scrollbar snap-x snap-mandatory">
          {[
            { src: '/examples/showcase_haute_couture.png', label: 'Haute Couture Runway', category: 'High Fashion' },
            { src: '/examples/showcase_tokyo_cyberpunk.png', label: 'Tokyo Cyberpunk Night', category: 'Cyberpunk' },
            { src: '/examples/showcase_amalfi_villa.png', label: 'Amalfi Coast Villa', category: 'Luxury Travel' },
            { src: '/examples/showcase_aesthetic_fitness.png', label: 'Aesthetic Fitness', category: 'Fitness Luxe' },
            { src: '/examples/showcase_parisian_chic.png', label: 'Parisian Autumn Chic', category: 'Street Chic' },
            { src: '/examples/showcase_red_carpet.png', label: 'Gala Red Carpet', category: 'Celebrity Gala' },
            { src: '/examples/showcase_bali_oasis.png', label: 'Bali Jungle Oasis', category: 'Tropical Resort' },
            { src: '/examples/showcase_studio_beauty.png', label: 'Minimalist Studio', category: 'Beauty Editorial' },
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.04 }}
              className="relative group rounded-xl overflow-hidden w-[180px] md:w-[210px] shrink-0 aspect-[3/4] cursor-pointer border border-white/10 hover:border-[#E7C477]/40 transition-all snap-start shadow-md bg-[#161618]"
              onClick={() => nav.replace({ view: 'create', subView: 'image' })}
            >
              <img src={item.src} alt={item.label} className="w-full h-full object-cover object-[center_25%] duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121214]/90 via-[#121214]/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <span className="text-[8px] font-bold text-[#F2D58D] uppercase tracking-wider">{item.category}</span>
                <p className="text-xs font-serif text-[#F5F1E8] leading-tight mt-0.5">{item.label}</p>
              </div>
              {/* AI Badge */}
              <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#121214]/80 backdrop-blur-sm rounded border border-[#E7C477]/30">
                <span className="text-[8px] font-bold text-[#F2D58D]">AI</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>
      </details>
    </div>
  );
}
