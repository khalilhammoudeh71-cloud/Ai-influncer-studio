import { Plus, Search, Edit2, Trash2, X, Check, Camera, Upload, Image as ImageIcon, AlertTriangle, Sparkles, ArrowLeft, Download, Heart, Trash, Eye, Loader2, ChevronDown, Cpu, Wand2, Pencil, ArrowUpCircle, Film, LayoutGrid, MessageSquare, Mic, Users, ChevronRight, DollarSign, Wrench, PlusCircle, Calendar, TrendingUp, CheckCircle2, Clock, Share2, Play, ExternalLink, ArrowUpRight, ArrowDownRight, Layers, Sliders } from 'lucide-react';
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
    <div className="p-6 md:p-10 max-w-[1500px] mx-auto space-y-10 select-none pb-24">
      
      {/* ── HERO SECTION (RESTORED LANDING PAGE IN CHARCOAL & GOLD) ── */}
      <div className="relative rounded-[28px] overflow-hidden border border-[#E7C477]/15 shadow-2xl bg-[#1E1E22]">
        {/* Background Ambient Layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E1E22] via-[#161618] to-[#121214]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(231,196,119,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(138,88,168,0.06),transparent_50%)]" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 p-8 lg:p-12">
          {/* Left: Text Content */}
          <div className="flex-1 text-center lg:text-left space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E7C477]/10 border border-[#E7C477]/25 mb-4">
                <Sparkles size={13} className="text-[#D9BA72]" />
                <span className="text-[10px] font-bold text-[#F2D58D] uppercase tracking-wider">AI-Powered Studio</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-[#F5F1E8] mb-3 leading-tight tracking-tight">
                Create Your <span className="bg-gradient-to-r from-[#F2D58D] via-[#E7C477] to-[#B99655] bg-clip-text text-transparent">AI Persona</span>
              </h1>
              
              <p className="text-xs sm:text-sm lg:text-base text-[#D4D4D8] mb-6 max-w-lg leading-relaxed font-sans">
                Design unique AI influencers with consistent identity. Generate photos, videos, voice & content — all from one persona.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <motion.button 
                  onClick={handleAddPersona}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-gold-primary px-8 py-3.5 text-xs font-semibold flex items-center justify-center gap-2.5 cursor-pointer shadow-xl shadow-amber-950/40"
                >
                  <Plus size={18} />
                  <span>Create Your First Persona</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
          
          {/* Right: Floating Staggered Showcase Cards (Always display sample sample personas) */}
          <div className="relative w-full lg:w-[440px] h-[290px] shrink-0">
            {(() => {
              const displayPersonas = [
                { 
                  id: 'sample-1', 
                  name: 'Haute Couture Muse', 
                  niche: 'Style • High Luxury', 
                  avatar: '/examples/showcase_haute_couture.png',
                  fallback: '/examples/influencer1.png'
                },
                { 
                  id: 'sample-2', 
                  name: 'Cyberpunk Icon', 
                  niche: 'Futuristic & Edgy', 
                  avatar: '/examples/showcase_tokyo_cyberpunk.png',
                  fallback: '/examples/influencer2.png'
                },
                { 
                  id: 'sample-3', 
                  name: 'Amalfi Ambassador', 
                  niche: 'Luxury Travel & Vlogs', 
                  avatar: '/examples/showcase_amalfi_villa.png',
                  fallback: '/examples/influencer3.png'
                }
              ];

              const cardStyles = [
                "absolute top-2 right-0 w-[165px] h-[205px] rounded-2xl overflow-hidden border border-[#E7C477]/30 shadow-2xl z-30 group bg-[#161618] cursor-pointer",
                "absolute top-8 left-4 w-[155px] h-[195px] rounded-2xl overflow-hidden border border-[#E7C477]/30 shadow-2xl z-20 group bg-[#161618] cursor-pointer",
                "absolute bottom-0 left-1/2 -translate-x-1/2 w-[145px] h-[175px] rounded-2xl overflow-hidden border border-[#E7C477]/30 shadow-2xl z-10 group bg-[#161618] cursor-pointer"
              ];

              const anims = [
                { initial: { opacity: 0, x: 30, rotate: 5 }, animate: { opacity: 1, x: 0, rotate: 3 }, delay: 0.2 },
                { initial: { opacity: 0, x: -30, rotate: -5 }, animate: { opacity: 1, x: 0, rotate: -4 }, delay: 0.4 },
                { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, delay: 0.6 }
              ];

              return displayPersonas.map((p: any, i: number) => (
                <motion.div
                  key={p.id || i}
                  initial={anims[i % 3].initial}
                  animate={anims[i % 3].animate}
                  transition={{ duration: 0.7, delay: anims[i % 3].delay }}
                  className={cardStyles[i % 3]}
                  onClick={handleAddPersona}
                >
                  <img 
                    src={p.avatar} 
                    alt={p.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    onError={(e) => { 
                      const target = e.target as HTMLImageElement;
                      if (target.src !== p.fallback) target.src = p.fallback;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121214]/90 via-[#121214]/20 to-transparent" />
                  <div className="absolute bottom-2.5 left-2.5 right-2.5">
                    <p className="text-[10px] font-serif text-[#F5F1E8] truncate">{p.name}</p>
                    <p className="text-[8px] text-[#A1A1AA] truncate">{p.niche}</p>
                  </div>
                </motion.div>
              ));
            })()}

            {/* Ambient Gold Glow Orbs */}
            <motion.div 
              animate={{ y: [0, -10, 0], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-0 left-1/2 w-24 h-24 bg-[#E7C477]/15 rounded-full blur-2xl pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* ── AI PERSONA ROSTER GRID (PLACED PROMINENTLY ABOVE OTHER SECTIONS) ── */}
      <div className="space-y-5 pt-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif text-[#F5F1E8] flex items-center gap-3">
              Your AI Personas
              <span className="text-xs px-3 py-1 rounded-full bg-[#E7C477]/10 text-[#F2D58D] border border-[#E7C477]/25 font-bold font-sans">
                {activePersonas.length} Saved
              </span>
            </h2>
            <p className="text-xs text-[#A1A1AA] mt-1 font-sans">
              Select, chat, edit or manage your created AI personas
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
              <input 
                type="text" 
                placeholder="Search personas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141416] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-[#F5F1E8] placeholder-[#A1A1AA] outline-none focus:border-[#E7C477] transition-colors"
              />
            </div>
            <button 
              onClick={handleAddPersona}
              className="btn-gold-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-lg"
            >
              <Plus size={14} /> Create Persona
            </button>
          </div>
        </div>

        {/* Persona Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPersonas.map(p => {
            const isSelected = p.id === selectedId;
            return (
              <div
                key={p.id}
                onClick={() => onSelectPersona(p.id)}
                className={cn(
                  "luxury-card p-4 space-y-3 cursor-pointer transition-all hover:-translate-y-1 group relative",
                  isSelected ? "border-[#E7C477] bg-[#242428] shadow-lg shadow-amber-950/40" : "hover:border-[#E7C477]/40"
                )}
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden border border-white/10 relative bg-[#141416] flex items-center justify-center">
                  {p.avatar || p.referenceImage ? (
                    <PersonaAvatar
                      src={p.avatar || p.referenceImage} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      fallbackSrc={p.additionalReferenceImages?.[0] || '/demo/ai_sample_influencer.png'}
                    />
                  ) : (
                    <Users size={32} className="text-zinc-600" />
                  )}
                  {isSelected && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#E7C477] text-[#161618] text-[9px] font-bold shadow-md">
                      Active
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-bold text-[#F5F1E8] truncate font-serif">{p.name || 'Unnamed Persona'}</p>
                    <p className="text-[10px] text-[#A1A1AA] truncate">{p.niche || 'Digital Creator'}</p>
                  </div>
                  
                  {/* 3 CTA Buttons: Chat, Edit, Delete */}
                  <div className="pt-2 border-t border-white/10 flex items-center gap-1.5 w-full">
                    {/* Chat Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPersona(p.id);
                        nav.push({ view: 'assistant' });
                      }}
                      className="flex-1 py-1.5 px-1.5 rounded-lg bg-[#E7C477]/10 hover:bg-[#E7C477]/20 border border-[#E7C477]/30 text-[#F2D58D] text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                      title="Chat with AI Persona"
                    >
                      <MessageSquare size={11} className="text-[#E7C477]" />
                      <span>Chat</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPersona(p);
                      }}
                      className="flex-1 py-1.5 px-1.5 rounded-lg bg-[#141416] hover:bg-[#1E1E22] border border-white/10 hover:border-white/20 text-[#F5F1E8] text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="Edit Persona Settings"
                    >
                      <Pencil size={11} className="text-slate-300" />
                      <span>Edit</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePersona(p);
                      }}
                      className="flex-1 py-1.5 px-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="Delete Persona"
                    >
                      <Trash2 size={11} className="text-rose-400" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FEATURE CARDS ROW (3 CARDS IN CHARCOAL & GOLD) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { 
            icon: Camera, 
            title: 'Photo Generation', 
            desc: 'Create stunning, identity-consistent photos in any setting, outfit, and style',
            image: '/examples/showcase_haute_couture.png',
            action: () => nav.replace({ view: 'create', subView: 'image' })
          },
          { 
            icon: Film, 
            title: 'Video & Avatar', 
            desc: 'Turn any photo into a talking video or animated clip with custom voice',
            image: '/examples/showcase_red_carpet.png',
            action: () => nav.replace({ view: 'create', subView: 'video' })
          },
          { 
            icon: Sparkles, 
            title: 'Content Studio', 
            desc: 'Generate scripts, plan posts, clone voices — a full content creation suite',
            image: '/examples/showcase_parisian_chic.png',
            action: () => nav.replace({ view: 'planner' })
          },
        ].map((feature, i) => {
          const FIcon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
              className="luxury-card group overflow-hidden hover:border-[#E7C477]/35 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              onClick={feature.action}
            >
              {/* Preview Image Header */}
              <div className="h-32 overflow-hidden relative">
                <img src={feature.image} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-85 group-hover:scale-105 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1E1E22] via-[#1E1E22]/50 to-transparent" />
              </div>
              
              <div className="p-5 relative -mt-6 z-10">
                <div className="w-9 h-9 rounded-xl bg-[#242428] border border-[#E7C477]/30 flex items-center justify-center mb-3 shadow-lg text-[#F2D58D]">
                  <FIcon size={16} />
                </div>
                <h4 className="text-base font-serif text-[#F5F1E8] mb-1">{feature.title}</h4>
                <p className="text-xs text-[#A1A1AA] leading-relaxed font-sans">{feature.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── EXAMPLE SHOWCASE STRIP ("WHAT YOU CAN CREATE") ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="luxury-card p-6 space-y-5 mt-6 border-t border-white/10"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-serif text-[#F5F1E8]">What You Can Create</h3>
            <p className="text-xs text-[#A1A1AA] mt-0.5">AI-generated influencer content examples</p>
          </div>
          <button 
            onClick={handleAddPersona}
            className="btn-gold-secondary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Get Started
          </button>
        </div>
        
        <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-3 pt-1 snap-x snap-mandatory">
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
              <img src={item.src} alt={item.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
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
      </motion.div>

    </div>
  );
}
