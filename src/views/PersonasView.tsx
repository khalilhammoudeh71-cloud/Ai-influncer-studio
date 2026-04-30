import { Plus, Search, Edit2, Trash2, X, Check, Camera, Upload, Image as ImageIcon, AlertTriangle, Sparkles, ArrowLeft, Download, Heart, Trash, Eye, Loader2, ChevronDown, Cpu, Wand2, Pencil, ArrowUpCircle, Film, LayoutGrid } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { Persona, GeneratedImage } from '../types';
import { VisualGenerator } from '../components/VisualGenerator';
import ReferenceSheetModal from '../components/ReferenceSheetModal';
import { api } from '../services/apiService';
import { fetchAvailableModels, fetchAllModelTypes, generateReferenceImage, editImage, upscaleImage, generateVideo, enhancePrompt, type ModelInfo } from '../services/imageService';

interface PersonasViewProps {
  personas: Persona[];
  setPersonas: (p: Persona[]) => void;
  onSelectPersona: (id: string) => void;
  selectedId: string;
}

export default function PersonasView({ personas, setPersonas, onSelectPersona, selectedId }: PersonasViewProps) {
  const [mounted, setMounted] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [activePersonaForGen, setActivePersonaForGen] = useState<Persona | null>(null);
  const [refSheetPersona, setRefSheetPersona] = useState<Persona | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingPersona, setViewingPersona] = useState<Persona | null>(null);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [refMode, setRefMode] = useState<'upload' | 'generate'>('upload');
  const [refPrompt, setRefPrompt] = useState('');
  const [refModels, setRefModels] = useState<ModelInfo[]>([]);
  const [refSelectedModel, setRefSelectedModel] = useState('');

  const [previewAction, setPreviewAction] = useState<null | 'edit' | 'upscale' | 'video'>(null);
  const [previewEditModels, setPreviewEditModels] = useState<ModelInfo[]>([]);
  const [previewUpscaleModels, setPreviewUpscaleModels] = useState<ModelInfo[]>([]);
  const [previewVideoModels, setPreviewVideoModels] = useState<ModelInfo[]>([]);
  const [previewSelectedEditModel, setPreviewSelectedEditModel] = useState('');
  const [previewSelectedUpscaleModel, setPreviewSelectedUpscaleModel] = useState('');
  const [previewSelectedVideoModel, setPreviewSelectedVideoModel] = useState('');
  const [previewEditPrompt, setPreviewEditPrompt] = useState('');
  const [previewVideoPrompt, setPreviewVideoPrompt] = useState('');
  const [previewAdditionalImage, setPreviewAdditionalImage] = useState<string | null>(null);
  const [previewAdditionalImageName, setPreviewAdditionalImageName] = useState<string | null>(null);
  const [previewProcessing, setPreviewProcessing] = useState(false);
  const [previewActionError, setPreviewActionError] = useState<string | null>(null);
  const [refModelsLoading, setRefModelsLoading] = useState(false);
  const [refGenerating, setRefGenerating] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);
  const [analyzingFace, setAnalyzingFace] = useState(false);
  const [faceAnalysisError, setFaceAnalysisError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (editingPersona) {
      setRefMode('upload');
      setRefPrompt('');
      setRefError(null);
      if (refModels.length === 0 && !refModelsLoading) {
        setRefModelsLoading(true);
        fetchAvailableModels()
          .then((m) => {
            setRefModels(m);
            if (m.length > 0) setRefSelectedModel(m[0].id);
          })
          .catch(() => setRefError('Failed to load AI models'))
          .finally(() => setRefModelsLoading(false));
      }
    }
  }, [editingPersona]);

  const refGroupedModels = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    refModels.forEach((m) => {
      if (!groups[m.provider]) groups[m.provider] = [];
      groups[m.provider].push(m);
    });
    return groups;
  }, [refModels]);

  const handleGenerateRef = async () => {
    if (!refPrompt.trim() || !refSelectedModel || !editingPersona) return;
    setRefGenerating(true);
    setRefError(null);
    try {
      const result = await generateReferenceImage(refPrompt, refSelectedModel);
      setEditingPersona({ ...editingPersona, referenceImage: result.imageUrl });
    } catch (err: any) {
      setRefError(err.message || 'Generation failed');
    } finally {
      setRefGenerating(false);
    }
  };

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
    if (viewingPersona && viewingPersona.id === activePersonaForGen.id) {
      const fresh = updated.find(p => p.id === viewingPersona.id);
      if (fresh) setViewingPersona(fresh);
    }
    api.images.create(activePersonaForGen.id, img).catch(err => console.error('[API] Image save error:', err));
  };

  const openPreviewImage = (img: GeneratedImage) => {
    setPreviewImage(img);
    setPreviewAction(null);
    setPreviewEditPrompt('');
    setPreviewVideoPrompt('');
    setPreviewAdditionalImage(null);
    setPreviewAdditionalImageName(null);
    setPreviewActionError(null);
    setPreviewProcessing(false);
    if (previewEditModels.length === 0) {
      fetchAllModelTypes().then(({ editModels: em, upscaleModels: um, videoModels: vm }) => {
        setPreviewEditModels(em);
        setPreviewUpscaleModels(um);
        const i2vModels = vm.filter(m => m.id.startsWith('wavespeed-i2v:'));
        setPreviewVideoModels(i2vModels);
        if (em.length > 0) setPreviewSelectedEditModel(em[0].id);
        if (um.length > 0) setPreviewSelectedUpscaleModel(um[0].id);
        if (i2vModels.length > 0) setPreviewSelectedVideoModel(i2vModels[0].id);
      }).catch(() => {});
    }
  };

  const groupedPreviewEditModels = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    previewEditModels.forEach(m => { if (!groups[m.provider]) groups[m.provider] = []; groups[m.provider].push(m); });
    return groups;
  }, [previewEditModels]);

  const groupedPreviewUpscaleModels = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    previewUpscaleModels.forEach(m => { if (!groups[m.provider]) groups[m.provider] = []; groups[m.provider].push(m); });
    return groups;
  }, [previewUpscaleModels]);

  const groupedPreviewVideoModels = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    previewVideoModels.forEach(m => { if (!groups[m.provider]) groups[m.provider] = []; groups[m.provider].push(m); });
    return groups;
  }, [previewVideoModels]);

  const handlePreviewEdit = async () => {
    if (!previewImage || !previewEditPrompt.trim() || !previewSelectedEditModel || !viewingPersona) return;
    setPreviewProcessing(true);
    setPreviewActionError(null);
    try {
      const data = await editImage(previewImage.url, previewEditPrompt, previewSelectedEditModel, previewAdditionalImage || undefined);
      const newImg: GeneratedImage = {
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: data.imageUrl,
        prompt: previewEditPrompt,
        timestamp: Date.now(),
        model: data.model,
        environment: previewImage.environment,
        outfit: previewImage.outfit,
        framing: previewImage.framing,
      };
      const updated = personas.map(p => {
        if (p.id === viewingPersona.id) {
          return { ...p, visualLibrary: [...(p.visualLibrary || []), newImg] };
        }
        return p;
      });
      setPersonas(updated);
      const fresh = updated.find(p => p.id === viewingPersona.id);
      if (fresh) setViewingPersona(fresh);
      api.images.create(viewingPersona.id, newImg).catch(err => console.error('[API] Image save error:', err));
      setPreviewImage(newImg);
      setPreviewAction(null);
      setPreviewEditPrompt('');
      setPreviewAdditionalImage(null);
      setPreviewAdditionalImageName(null);
    } catch (err: any) {
      setPreviewActionError(err.message || 'Editing failed.');
    } finally {
      setPreviewProcessing(false);
    }
  };

  const handlePreviewUpscale = async () => {
    if (!previewImage || !previewSelectedUpscaleModel || !viewingPersona) return;
    setPreviewProcessing(true);
    setPreviewActionError(null);
    try {
      const data = await upscaleImage(previewImage.url, previewSelectedUpscaleModel);
      const newImg: GeneratedImage = {
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: data.imageUrl,
        prompt: previewImage.prompt,
        timestamp: Date.now(),
        model: data.model,
        environment: previewImage.environment,
        outfit: previewImage.outfit,
        framing: previewImage.framing,
      };
      const updated = personas.map(p => {
        if (p.id === viewingPersona.id) {
          return { ...p, visualLibrary: [...(p.visualLibrary || []), newImg] };
        }
        return p;
      });
      setPersonas(updated);
      const fresh = updated.find(p => p.id === viewingPersona.id);
      if (fresh) setViewingPersona(fresh);
      api.images.create(viewingPersona.id, newImg).catch(err => console.error('[API] Image save error:', err));
      setPreviewImage(newImg);
      setPreviewAction(null);
    } catch (err: any) {
      setPreviewActionError(err.message || 'Upscaling failed.');
    } finally {
      setPreviewProcessing(false);
    }
  };

  const handlePreviewVideo = async () => {
    if (!previewImage || !previewVideoPrompt.trim() || !previewSelectedVideoModel || !viewingPersona) return;
    setPreviewProcessing(true);
    setPreviewActionError(null);
    try {
      const data = await generateVideo(previewVideoPrompt, previewSelectedVideoModel, previewImage.url);
      const newEntry: GeneratedImage = {
        id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: data.videoUrl,
        prompt: previewVideoPrompt,
        timestamp: Date.now(),
        model: data.model,
        mediaType: 'video',
        environment: previewImage.environment,
        outfit: previewImage.outfit,
        framing: previewImage.framing,
      };
      const updated = personas.map(p => {
        if (p.id === viewingPersona.id) {
          return { ...p, visualLibrary: [...(p.visualLibrary || []), newEntry] };
        }
        return p;
      });
      setPersonas(updated);
      const fresh = updated.find(p => p.id === viewingPersona.id);
      if (fresh) setViewingPersona(fresh);
      api.images.create(viewingPersona.id, newEntry).catch(err => console.error('[API] Video save error:', err));
      setPreviewImage(newEntry);
      setPreviewAction(null);
      setPreviewVideoPrompt('');
    } catch (err: any) {
      setPreviewActionError(err.message || 'Video generation failed.');
    } finally {
      setPreviewProcessing(false);
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
            const MAX_SIZE = 500;
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
    if (!files.length || !editingPersona) return;
    const compressed = await Promise.all(files.map(compressImage));
    const [primary, ...extras] = compressed;
    const existingExtras = editingPersona.additionalReferenceImages || [];
    setEditingPersona({
      ...editingPersona,
      referenceImage: primary,
      faceDescriptor: undefined,
      additionalReferenceImages: [...existingExtras, ...extras],
    });
    e.target.value = '';
  };


  const handleAnalyzeFace = async () => {
    if (!editingPersona) return;
    setAnalyzingFace(true);
    setFaceAnalysisError(null);
    try {
      const result = await api.personas.analyzeFace(editingPersona.id, editingPersona.referenceImage);
      setEditingPersona({ ...editingPersona, faceDescriptor: result.faceDescriptor });
    } catch (err) {
      setFaceAnalysisError(err instanceof Error ? err.message : 'Face analysis failed');
    } finally {
      setAnalyzingFace(false);
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
      if (viewingPersona && viewingPersona.id === safePersona.id) {
        setViewingPersona(safePersona);
      }
    } catch (error) {
      console.error('Crash during persona save:', error);
      setEditingPersona(null);
    }
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    const updated = personas.filter(p => p.id !== deleteConfirmId);
    setPersonas(updated);
    if (viewingPersona?.id === deleteConfirmId) {
      setViewingPersona(null);
      setPreviewImage(null);
    }
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
    <div className="p-5">
      {!viewingPersona && <>
      <header className="premium-header mb-6 pt-6 pb-2">
        <div className="flex justify-between items-start relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="gradient-text">Personas</span>
            </h1>
            <p className="text-[var(--text-tertiary)] text-sm mt-1.5 font-medium">
              Your AI identity studio
            </p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleAddPersona}
            className="premium-button p-3 rounded-xl"
          >
            <Plus size={22} />
          </motion.button>
        </div>

        {personas.length > 0 && (
          <div className="flex gap-3 mt-4 relative z-10">
            <div className="stat-chip flex-1 text-center">
              <div className="text-lg font-black text-[var(--text-primary)] tabular-nums">{personas.length}</div>
              <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.12em] mt-0.5">Total</div>
            </div>
            <div className="stat-chip flex-1 text-center">
              <div className="text-lg font-black text-emerald-400 tabular-nums">{personas.filter(p => p.status === 'Active').length}</div>
              <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.12em] mt-0.5">Active</div>
            </div>
            <div className="stat-chip flex-1 text-center">
              <div className="text-lg font-black text-violet-400 tabular-nums">{new Set(personas.map(p => p.platform)).size}</div>
              <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.12em] mt-0.5">Platforms</div>
            </div>
          </div>
        )}
      </header>

      <div className="divider-gradient mb-5" />

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search personas..." 
          className="w-full premium-input py-3.5 pl-11 pr-4 text-sm outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
      </div>

      <div className="grid gap-4">
        {filteredPersonas.map((persona, idx) => {
          const isSelected = selectedId === persona.id;
          return (
            <motion.div 
              key={persona.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => {
                onSelectPersona(persona.id);
                const fresh = personas.find(p => p.id === persona.id) || persona;
                setViewingPersona(fresh);
              }}
              className={cn(
                "group relative rounded-2xl p-5 cursor-pointer overflow-hidden",
                isSelected ? "premium-card-selected" : "premium-card"
              )}
            >
              {isSelected && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 opacity-80" />
              )}
              
              <div className="flex gap-4 items-center">
                <div className="relative shrink-0">
                  {persona.referenceImage ? (
                    <div className="w-[110px] h-[110px] rounded-2xl overflow-hidden ring-2 ring-violet-500/25 shadow-lg shadow-violet-500/10">
                      <img 
                        src={persona.referenceImage} 
                        alt={persona.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-[110px] h-[110px] rounded-2xl overflow-hidden ring-1 ring-[var(--border-default)]">
                      <img 
                        src={persona.avatar} 
                        alt={persona.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 status-dot border-2 border-[var(--bg-surface)]",
                    persona.status === 'Active' ? "bg-emerald-400 text-emerald-400" : "bg-[var(--text-muted)] text-[var(--text-muted)]"
                  )}></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="font-bold text-[17px] truncate">{persona.name}</h3>
                    {isSelected && (
                      <span className="text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-lg bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 text-violet-300 border border-violet-500/20 shrink-0">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--text-secondary)] text-[13px]">{persona.niche}</p>
                  
                  {persona.visualLibrary && persona.visualLibrary.length > 0 && (
                    <div className="flex gap-1.5 mt-3 overflow-hidden">
                      {persona.visualLibrary.slice(-4).map((img) => (
                        <div key={img.id} className="w-9 h-9 rounded-lg overflow-hidden border border-[var(--border-subtle)] shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {persona.visualLibrary.length > 4 && (
                        <div className="w-9 h-9 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[10px] text-[var(--text-muted)] font-bold shrink-0">
                          +{persona.visualLibrary.length - 4}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <span className="tag-pill">
                      {persona.tone.split(',')[0].trim()}
                    </span>
                    <span className="tag-pill">
                      {persona.platform}
                    </span>
                  </div>
                </div>

                {/* Always-visible CTA column */}
                <div className="flex flex-col items-center gap-2 shrink-0 pl-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenEdit(persona); }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--bg-elevated)] hover:bg-violet-500/20 text-[var(--text-secondary)] hover:text-violet-400 transition-all active:scale-90 border border-[var(--border-subtle)]"
                    title="Edit persona"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActivePersonaForGen(persona); setShowGenerator(true); }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-violet-500/15 hover:bg-violet-500/30 text-violet-400 hover:text-violet-300 transition-all active:scale-90 border border-violet-500/20"
                    title="Generate image / video"
                  >
                    <Sparkles size={15} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setRefSheetPersona(persona); }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--bg-elevated)] hover:bg-fuchsia-500/20 text-[var(--text-muted)] hover:text-fuchsia-400 transition-all active:scale-90 border border-[var(--border-subtle)]"
                    title="Generate reference sheet (9 angles)"
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    onClick={(e) => handleDeletePersona(e, persona.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--bg-elevated)] hover:bg-rose-500/20 text-[var(--text-muted)] hover:text-rose-400 transition-all active:scale-90 border border-[var(--border-subtle)]"
                    title="Delete persona"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {mounted && deleteConfirmId && createPortal(<div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" style={{ zIndex: 10001 }}>
            <div className="bg-[var(--bg-surface)] w-full max-w-sm rounded-2xl border border-[var(--border-default)] p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 text-red-500">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2">Delete Persona?</h3>
                <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed">
                  This action is permanent and will remove all content plans and settings associated with this persona.
                </p>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button 
                    onClick={() => setDeleteConfirmId(null)}
                    className="py-3.5 px-4 bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] rounded-2xl font-bold transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="py-3.5 px-4 bg-red-600 hover:bg-rose-500 rounded-2xl font-bold shadow-lg shadow-red-600/20 transition-all active:scale-95"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        , document.body)}

        {mounted && editingPersona && createPortal(<div className="fixed inset-0 flex items-end justify-center bg-black/80 backdrop-blur-sm p-4" style={{ zIndex: 10001 }}>
            <div className="bg-[var(--bg-surface)] w-full max-w-xl rounded-t-[40px] border-t border-x border-[var(--border-default)] overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
              <header className="px-6 pt-8 pb-4 flex justify-between items-center bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
                <div>
                  <h2 className="text-xl font-bold">Edit Persona</h2>
                  <p className="text-xs text-[var(--text-tertiary)]">Fine-tune your AI identity</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingPersona(null)}
                    className="p-2 hover:bg-[var(--bg-elevated)] rounded-full text-[var(--text-secondary)]"
                  >
                    <X size={20} />
                  </button>
                  <button 
                    onClick={handleUpdatePersona}
                    className="p-2 bg-violet-600 hover:bg-violet-500 rounded-full text-white shadow-lg shadow-violet-600/20"
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
                      className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white/5"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={24} />
                    </div>
                  </div>
                </div>

                {/* Reference Image Section */}
                <section className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-violet-500/20 rounded-xl text-violet-400">
                      <ImageIcon size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Reference Image</h3>
                      <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">Face / Style Reference</p>
                    </div>
                  </div>

                  {editingPersona.referenceImage && (
                    <div className="space-y-2 mb-3">
                      <div className="relative aspect-video rounded-2xl overflow-hidden border border-[var(--border-default)] group">
                        <img 
                          src={editingPersona.referenceImage} 
                          alt="Reference" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                          <button
                            onClick={() => setEditingPersona({...editingPersona, referenceImage: undefined, faceDescriptor: undefined, additionalReferenceImages: undefined})}
                            className="bg-rose-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
                          >
                            <X size={12} /> Remove All
                          </button>
                        </div>
                      </div>

                      {/* Additional reference images */}
                      {(editingPersona.additionalReferenceImages?.length ?? 0) > 0 && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Additional Reference Images</label>
                          <div className="flex flex-wrap gap-2">
                            {editingPersona.additionalReferenceImages!.map((img, idx) => (
                              <div key={idx} className="relative group w-14 h-14 rounded-xl overflow-hidden border border-[var(--border-default)]">
                                <img src={img} alt={`Ref ${idx + 2}`} className="w-full h-full object-cover" />
                                <button
                                  onClick={() => {
                                    const updated = editingPersona.additionalReferenceImages!.filter((_, i) => i !== idx);
                                    setEditingPersona({ ...editingPersona, additionalReferenceImages: updated.length ? updated : undefined });
                                  }}
                                  className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={14} className="text-white" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="w-14 h-14 rounded-xl border-2 border-dashed border-[var(--border-default)] hover:border-violet-500/50 flex items-center justify-center text-[var(--text-muted)] hover:text-violet-400 transition-colors"
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleAnalyzeFace}
                        disabled={analyzingFace}
                        className="w-full py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        {analyzingFace ? (
                          <><Loader2 size={13} className="animate-spin" /> Analyzing face...</>
                        ) : (
                          <><Sparkles size={13} /> {editingPersona.faceDescriptor ? 'Re-analyze Face' : 'Analyze Face with AI'}</>
                        )}
                      </button>

                      {faceAnalysisError && (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                          <AlertTriangle size={12} className="shrink-0" />
                          {faceAnalysisError}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1 flex items-center gap-1">
                          <Sparkles size={10} /> Face Description (editable)
                        </label>
                        <textarea
                          value={editingPersona.faceDescriptor || ''}
                          onChange={e => setEditingPersona({ ...editingPersona, faceDescriptor: e.target.value || undefined })}
                          rows={4}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-violet-500/50 outline-none resize-none leading-relaxed"
                          placeholder="Click 'Analyze Face with AI' to auto-generate, or manually type an appearance description..."
                        />
                        <p className="text-[10px] text-[var(--text-muted)] ml-1">Injected into every generation prompt to anchor the persona's identity.</p>
                      </div>
                    </div>
                  )}

                  <div className="flex rounded-xl bg-[var(--bg-elevated)] p-0.5 gap-0.5">
                    <button
                      onClick={() => setRefMode('upload')}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                        refMode === 'upload' ? "bg-violet-600 text-white shadow" : "text-[var(--text-secondary)] hover:text-white"
                      )}
                    >
                      <Upload size={13} /> {editingPersona.referenceImage ? 'Replace' : 'Upload'}
                    </button>
                    <button
                      onClick={() => setRefMode('generate')}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                        refMode === 'generate' ? "bg-violet-600 text-white shadow" : "text-[var(--text-secondary)] hover:text-white"
                      )}
                    >
                      <Wand2 size={13} /> Generate with AI
                    </button>
                  </div>

                  {refMode === 'upload' ? (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="relative border-2 border-dashed border-[var(--border-default)] rounded-2xl py-10 text-center cursor-pointer hover:border-violet-500/50 hover:bg-white/[0.02] transition-all"
                        >
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-3 bg-[var(--bg-elevated)] rounded-full text-[var(--text-secondary)]">
                              <Upload size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">Tap to upload reference(s)</p>
                              <p className="text-xs text-[var(--text-tertiary)] mt-1">Select one or multiple images at once</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1 flex items-center gap-1">
                              <Cpu size={10} /> Model
                            </label>
                            {refModelsLoading ? (
                              <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-elevated)] rounded-xl text-xs text-[var(--text-secondary)]">
                                <Loader2 className="w-3 h-3 animate-spin" /> Loading models...
                              </div>
                            ) : (
                              <div className="relative">
                                <select
                                  value={refSelectedModel}
                                  onChange={(e) => setRefSelectedModel(e.target.value)}
                                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-violet-500/50 outline-none appearance-none pr-8"
                                >
                                  {Object.entries(refGroupedModels).map(([provider, providerModels]) => (
                                    <optgroup key={provider} label={provider}>
                                      {providerModels.map((m) => (
                                        <option key={m.id} value={m.id}>
                                          {m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}{m.nsfw ? ' 🔞' : ''}
                                        </option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Describe your persona's look</label>
                            <textarea
                              value={refPrompt}
                              onChange={(e) => setRefPrompt(e.target.value)}
                              placeholder="e.g. A beautiful 25-year-old woman with long dark hair, green eyes, warm smile, professional headshot style..."
                              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white min-h-[80px] focus:ring-2 focus:ring-violet-500/50 outline-none resize-none"
                            />
                          </div>

                          {refError && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              {refError}
                            </div>
                          )}

                          <button
                            onClick={handleGenerateRef}
                            disabled={refGenerating || !refPrompt.trim() || !refSelectedModel}
                            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-violet-600/20"
                          >
                            {refGenerating ? (
                              <><Loader2 size={14} className="animate-spin" /> Generating...</>
                            ) : (
                              <><Sparkles size={14} /> Generate Reference Image</>
                            )}
                          </button>
                        </div>
                      )}
                </section>

                {/* Form Fields */}
                <div className="space-y-8 pb-10">
                  {/* Core Identity Section */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400/80 mb-4 px-1">Core Identity</h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Name</label>
                        <input 
                          value={editingPersona.name}
                          onChange={e => setEditingPersona({...editingPersona, name: e.target.value})}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all"
                          placeholder="e.g. Aria Thorne"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Niche</label>
                          <input 
                            value={editingPersona.niche}
                            onChange={e => setEditingPersona({...editingPersona, niche: e.target.value})}
                            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all"
                            placeholder="e.g. Luxury Travel"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Tone</label>
                          <input 
                            value={editingPersona.tone}
                            onChange={e => setEditingPersona({...editingPersona, tone: e.target.value})}
                            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all"
                            placeholder="e.g. Elegant, Elite"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Platform Focus</label>
                          <input 
                            value={editingPersona.platform}
                            onChange={e => setEditingPersona({...editingPersona, platform: e.target.value})}
                            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all"
                            placeholder="e.g. Instagram"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Status</label>
                          <select 
                            value={editingPersona.status}
                            onChange={e => setEditingPersona({...editingPersona, status: e.target.value})}
                            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all appearance-none"
                          >
                            <option value="Active">Active</option>
                            <option value="Draft">Draft</option>
                            <option value="Archived">Archived</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Short Bio / Context</label>
                        <textarea 
                          value={editingPersona.bio}
                          onChange={e => setEditingPersona({...editingPersona, bio: e.target.value})}
                          rows={3}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all resize-none"
                          placeholder="What's the story behind this persona?"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Personality & Voice Section */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400/80 mb-4 px-1">Personality & Voice</h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Personality Traits</label>
                        <input 
                          value={editingPersona.personalityTraits?.join(', ') || ''}
                          onChange={e => setEditingPersona({...editingPersona, personalityTraits: e.target.value.split(',').map(s => s.trim())})}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all"
                          placeholder="e.g. Ambitious, Sophisticated, Witty (comma separated)"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Brand Voice Rules</label>
                        <textarea 
                          value={editingPersona.brandVoiceRules}
                          onChange={e => setEditingPersona({...editingPersona, brandVoiceRules: e.target.value})}
                          rows={3}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all resize-none"
                          placeholder="e.g. Always use emojis ✨, use short sentences..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Audience Type</label>
                        <input 
                          value={editingPersona.audienceType}
                          onChange={e => setEditingPersona({...editingPersona, audienceType: e.target.value})}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all"
                          placeholder="e.g. Aspiring entrepreneurs, Gen Z fashionistas"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Content Rules Section */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400/80 mb-4 px-1">Content Rules</h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Visual Style</label>
                        <input 
                          value={editingPersona.visualStyle}
                          onChange={e => setEditingPersona({...editingPersona, visualStyle: e.target.value})}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all"
                          placeholder="e.g. High-contrast, minimalist, pastel colors"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Content Boundaries</label>
                        <textarea 
                          value={editingPersona.contentBoundaries}
                          onChange={e => setEditingPersona({...editingPersona, contentBoundaries: e.target.value})}
                          rows={2}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all resize-none"
                          placeholder="e.g. Never discuss politics, avoid profanity..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Content Goals</label>
                        <input 
                          value={editingPersona.contentGoals}
                          onChange={e => setEditingPersona({...editingPersona, contentGoals: e.target.value})}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all"
                          placeholder="e.g. Build mystery, establish authority"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Advanced Section */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400/80 mb-4 px-1">Advanced</h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] ml-1">Persona Notes</label>
                        <textarea 
                          value={editingPersona.personaNotes}
                          onChange={e => setEditingPersona({...editingPersona, personaNotes: e.target.value})}
                          rows={3}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl py-3 px-4 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all resize-none"
                          placeholder="Internal notes, research, or reminders..."
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className="p-6 border-t border-[var(--border-subtle)] bg-white/[0.02]">
                <button 
                  onClick={handleUpdatePersona}
                  className="w-full bg-violet-600 hover:bg-violet-500 py-4 rounded-2xl font-bold shadow-lg shadow-violet-600/20 transition-all active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        , document.body)}

        {personas.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-center py-14 px-6 relative overflow-hidden rounded-3xl"
            style={{ background: 'linear-gradient(145deg, rgba(139,92,246,0.04) 0%, rgba(14,14,18,0.8) 60%, rgba(217,70,239,0.03) 100%)', border: '1px solid rgba(139,92,246,0.12)' }}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <div className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[300px] h-[160px] rounded-full"
                style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />
            </div>
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto mb-5 relative">
                <div className="absolute inset-0 rounded-2xl animate-pulse"
                  style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(217,70,239,0.15))' }} />
                <div className="relative w-full h-full rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(217,70,239,0.1))', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <Sparkles className="text-violet-400" size={32} />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">Build your first AI identity</h3>
              <p className="text-[var(--text-tertiary)] text-sm max-w-[240px] mx-auto mb-8 leading-relaxed">
                Create a persona and start generating viral content, voices, and images.
              </p>
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleAddPersona}
                className="premium-button px-8 py-3.5 mx-auto flex items-center gap-2 text-white"
              >
                <Plus size={18} />
                Create First Persona
              </motion.button>
            </div>
          </motion.div>
        )}

        {personas.length > 0 && (
          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddPersona}
            className="flex items-center justify-center gap-2 w-full py-5 rounded-2xl text-[var(--text-tertiary)] hover:text-violet-400 transition-all group"
            style={{ border: '2px dashed rgba(139,92,246,0.15)', background: 'rgba(139,92,246,0.02)' }}
          >
            <Plus size={18} className="group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-sm">Add New Persona</span>
          </motion.button>
        )}
      </div>

      </>}

      {viewingPersona && <div className="animate-in fade-in duration-200">
          <header className="flex items-center justify-between px-0 pt-2 pb-4 border-b border-[var(--border-subtle)] mb-4">
            <button 
              onClick={() => { setViewingPersona(null); setPreviewImage(null); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 active:scale-95 rounded-xl text-white font-bold text-sm transition-all shadow-lg shadow-violet-600/30"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <h2 className="text-lg font-bold truncate mx-4">{viewingPersona.name}</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setActivePersonaForGen(viewingPersona);
                  setShowGenerator(true);
                }}
                className="p-2 bg-violet-600 hover:bg-violet-500 rounded-full text-white transition-colors"
              >
                <Sparkles size={18} />
              </button>
              <button 
                onClick={() => {
                  const vp = viewingPersona;
                  setViewingPersona(null);
                  setPreviewImage(null);
                  handleOpenEdit(vp);
                }}
                className="p-2 hover:bg-[var(--bg-elevated)] rounded-full text-[var(--text-secondary)] transition-colors"
              >
                <Edit2 size={18} />
              </button>
            </div>
          </header>

          <div className="p-5">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative shrink-0">
                {viewingPersona.referenceImage ? (
                  <img 
                    src={viewingPersona.referenceImage} 
                    alt={viewingPersona.name} 
                    className="w-20 h-20 rounded-2xl object-cover ring-2 ring-violet-500/20"
                  />
                ) : (
                  <img 
                    src={viewingPersona.avatar} 
                    alt={viewingPersona.name} 
                    className="w-20 h-20 rounded-2xl object-cover"
                  />
                )}
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--border-subtle)]",
                  viewingPersona.status === 'Active' ? "bg-emerald-500" : "bg-[var(--text-muted)]"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-secondary)] text-sm">{viewingPersona.niche}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[11px] bg-[var(--bg-elevated)] text-[var(--text-primary)] px-2 py-1 rounded-md border border-[var(--border-subtle)]">
                    {viewingPersona.tone}
                  </span>
                  <span className="text-[11px] bg-[var(--bg-elevated)] text-[var(--text-primary)] px-2 py-1 rounded-md border border-[var(--border-subtle)]">
                    {viewingPersona.platform}
                  </span>
                </div>
                {viewingPersona.bio && (
                  <p className="text-[var(--text-tertiary)] text-xs mt-2 line-clamp-2">{viewingPersona.bio}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Creations</h3>
              <span className="text-xs text-[var(--text-tertiary)] font-medium">
                {viewingPersona.visualLibrary?.length || 0} images
              </span>
            </div>

            {viewingPersona.visualLibrary && viewingPersona.visualLibrary.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {viewingPersona.visualLibrary.map((img) => (
                  <div 
                    key={img.id} 
                    className="relative group rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] cursor-pointer"
                    onClick={() => openPreviewImage(img)}
                  >
                    <div className="aspect-square">
                      {img.mediaType === 'video' ? (
                        <video src={img.url} muted className="w-full h-full object-cover" />
                      ) : (
                        <img src={img.url} alt={img.prompt || ''} className="w-full h-full object-cover" />
                      )}
                    </div>
                    {img.mediaType === 'video' && (
                      <div className="absolute top-2 left-2 p-1 bg-black/70 rounded-md z-10">
                        <Film size={12} className="text-pink-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = personas.map(p => {
                          if (p.id === viewingPersona.id) {
                            return { ...p, visualLibrary: (p.visualLibrary || []).filter(i => i.id !== img.id) };
                          }
                          return p;
                        });
                        setPersonas(updated);
                        const fresh = updated.find(p => p.id === viewingPersona.id);
                        if (fresh) setViewingPersona(fresh);
                        api.images.delete(viewingPersona.id, img.id).catch(err => console.error('[API] Image delete error:', err));
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 text-white/70 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                      title="Delete image"
                    >
                      <Trash size={14} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white/70 truncate">{img.prompt || 'Generated image'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {img.model && (
                          <span className="text-[9px] bg-[var(--bg-overlay)] text-white/60 px-1.5 py-0.5 rounded">{img.model}</span>
                        )}
                        {img.environment && (
                          <span className="text-[9px] text-white/40">{img.environment}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)]">
                <div className="w-16 h-16 bg-[var(--bg-elevated)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="text-[var(--text-muted)]" size={32} />
                </div>
                <h3 className="text-base font-semibold mb-2 text-[var(--text-primary)]">No creations yet</h3>
                <p className="text-[var(--text-tertiary)] text-sm max-w-[220px] mx-auto mb-6 leading-relaxed">
                  Generate visuals for this persona to see them here.
                </p>
                <button 
                  onClick={() => {
                    setActivePersonaForGen(viewingPersona);
                    setShowGenerator(true);
                  }}
                  className="bg-violet-600 hover:bg-violet-500 px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 inline-flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  Generate Visuals
                </button>
              </div>
            )}
          </div>

          {mounted && previewImage && createPortal(
            <div className="fixed inset-0 flex items-start justify-center bg-black/90 backdrop-blur-sm p-4 pb-24 overflow-y-auto" style={{ zIndex: 10002 }} onClick={() => { if (!previewProcessing) setPreviewImage(null); }}>
              <div className="relative max-w-lg w-full mt-8" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => { if (!previewProcessing) setPreviewImage(null); }}
                  className="absolute -top-12 right-0 p-2 text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
                <div className="relative">
                  {previewImage.mediaType === 'video' ? (
                    <video 
                      src={previewImage.url} 
                      controls 
                      autoPlay 
                      loop 
                      className="w-full rounded-2xl border border-[var(--border-default)]"
                    />
                  ) : (
                    <img 
                      src={previewImage.url} 
                      alt={previewImage.prompt || ''} 
                      className="w-full rounded-2xl border border-[var(--border-default)]"
                    />
                  )}
                  {previewProcessing && (
                    <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                        <span className="text-xs text-white/70">{previewAction === 'upscale' ? 'Upscaling...' : previewAction === 'video' ? 'Generating video...' : 'Editing...'}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-4">
                  {previewImage.prompt && (
                    <p className="text-sm text-[var(--text-primary)] mb-3">{previewImage.prompt}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {previewImage.model && (
                      <span className="text-[10px] bg-violet-500/10 text-violet-400 px-2 py-1 rounded-md border border-violet-500/20">
                        {previewImage.model}
                      </span>
                    )}
                    {previewImage.environment && (
                      <span className="text-[10px] bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-2 py-1 rounded-md border border-[var(--border-subtle)]">
                        {previewImage.environment}
                      </span>
                    )}
                    {previewImage.outfit && (
                      <span className="text-[10px] bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-2 py-1 rounded-md border border-[var(--border-subtle)]">
                        {previewImage.outfit}
                      </span>
                    )}
                    {previewImage.framing && (
                      <span className="text-[10px] bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-2 py-1 rounded-md border border-[var(--border-subtle)]">
                        {previewImage.framing}
                      </span>
                    )}
                  </div>
                  {previewImage.mediaType !== 'video' && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <button
                      onClick={() => { setPreviewAction(previewAction === 'edit' ? null : 'edit'); setPreviewActionError(null); }}
                      disabled={previewProcessing}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        previewAction === 'edit'
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-overlay)]'
                      }`}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      onClick={() => { setPreviewAction(previewAction === 'upscale' ? null : 'upscale'); setPreviewActionError(null); }}
                      disabled={previewProcessing}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        previewAction === 'upscale'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-overlay)]'
                      }`}
                    >
                      <ArrowUpCircle size={14} /> Upscale
                    </button>
                    <button
                      onClick={() => { setPreviewAction(previewAction === 'video' ? null : 'video'); setPreviewActionError(null); }}
                      disabled={previewProcessing}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        previewAction === 'video'
                          ? 'bg-pink-600 text-white border-pink-500'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-overlay)]'
                      }`}
                    >
                      <Film size={14} /> Video
                    </button>
                  </div>
                  )}

                  {previewAction === 'edit' && (
                    <div className="mt-3 p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 space-y-2">
                      <div className="relative">
                        <select
                          value={previewSelectedEditModel}
                          onChange={(e) => setPreviewSelectedEditModel(e.target.value)}
                          className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none pr-8"
                        >
                          {Object.entries(groupedPreviewEditModels).map(([provider, providerModels]) => (
                            <optgroup key={provider} label={provider}>
                              {providerModels.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}{m.nsfw ? ' 🔞' : ''}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                      </div>
                      <textarea
                        value={previewEditPrompt}
                        onChange={(e) => setPreviewEditPrompt(e.target.value)}
                        placeholder="Describe what to change or how to combine with uploaded image..."
                        className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white min-h-[50px] focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      />
                      {previewAdditionalImage ? (
                        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-lg p-2">
                          <img src={previewAdditionalImage} alt="Additional" className="w-8 h-8 rounded-md object-cover" />
                          <span className="text-[10px] text-[var(--text-primary)] truncate flex-1">{previewAdditionalImageName}</span>
                          <button
                            onClick={() => { setPreviewAdditionalImage(null); setPreviewAdditionalImageName(null); }}
                            className="p-1 hover:bg-[var(--bg-overlay)] rounded text-[var(--text-secondary)] hover:text-white transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] rounded-lg cursor-pointer transition-colors border border-dashed border-[var(--border-strong)]">
                          <Upload className="w-3 h-3 text-[var(--text-secondary)]" />
                          <span className="text-[10px] text-[var(--text-secondary)]">Upload background, product, or person to combine</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                setPreviewAdditionalImage(reader.result as string);
                                setPreviewAdditionalImageName(file.name);
                              };
                              reader.readAsDataURL(file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                      {previewActionError && (
                        <p className="text-[10px] text-rose-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{previewActionError}</p>
                      )}
                      <button
                        onClick={handlePreviewEdit}
                        disabled={previewProcessing || !previewEditPrompt.trim()}
                        className="w-full py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {previewProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                        {previewProcessing ? 'Editing...' : 'Apply Edit & Save'}
                      </button>
                    </div>
                  )}

                  {previewAction === 'upscale' && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 space-y-2">
                      <div className="relative">
                        <select
                          value={previewSelectedUpscaleModel}
                          onChange={(e) => setPreviewSelectedUpscaleModel(e.target.value)}
                          className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8"
                        >
                          {Object.entries(groupedPreviewUpscaleModels).map(([provider, providerModels]) => (
                            <optgroup key={provider} label={provider}>
                              {providerModels.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}{m.nsfw ? ' 🔞' : ''}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                      </div>
                      {previewActionError && (
                        <p className="text-[10px] text-rose-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{previewActionError}</p>
                      )}
                      <button
                        onClick={handlePreviewUpscale}
                        disabled={previewProcessing}
                        className="w-full py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {previewProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                        {previewProcessing ? 'Upscaling...' : 'Upscale & Save'}
                      </button>
                    </div>
                  )}

                  {previewAction === 'video' && (
                    <div className="mt-3 p-3 rounded-xl bg-pink-950/30 border border-pink-500/20 space-y-2">
                      <div className="relative">
                        <select
                          value={previewSelectedVideoModel}
                          onChange={(e) => setPreviewSelectedVideoModel(e.target.value)}
                          className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-pink-500 outline-none appearance-none pr-8"
                        >
                          {Object.entries(groupedPreviewVideoModels).map(([provider, providerModels]) => (
                            <optgroup key={provider} label={provider}>
                              {providerModels.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}{m.price > 0 ? ` ($${m.price.toFixed(3)})` : ' (Free)'}{m.nsfw ? ' 🔞' : ''}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                      </div>
                      <textarea
                        value={previewVideoPrompt}
                        onChange={(e) => setPreviewVideoPrompt(e.target.value)}
                        placeholder="Describe the motion — e.g. 'She turns to the camera and smiles, hair blowing in the wind'"
                        className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white min-h-[50px] focus:ring-2 focus:ring-pink-500 outline-none resize-none"
                      />
                      <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> This image will be used as the source frame
                      </p>
                      {previewActionError && (
                        <p className="text-[10px] text-rose-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{previewActionError}</p>
                      )}
                      <button
                        onClick={handlePreviewVideo}
                        disabled={previewProcessing || !previewVideoPrompt.trim()}
                        className="w-full py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {previewProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5" />}
                        {previewProcessing ? 'Generating Video...' : 'Generate Video & Save'}
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <a
                      href={previewImage.url}
                      download={`${viewingPersona.name.replace(/\s+/g, '_')}_${previewImage.id}.png`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] rounded-xl text-xs font-bold transition-colors"
                    >
                      <Download size={14} /> Download
                    </a>
                    <button
                      onClick={() => {
                        const updated = personas.map(p => {
                          if (p.id === viewingPersona.id) {
                            return {
                              ...p,
                              visualLibrary: (p.visualLibrary || []).filter(i => i.id !== previewImage.id)
                            };
                          }
                          return p;
                        });
                        setPersonas(updated);
                        const updatedPersona = updated.find(p => p.id === viewingPersona.id);
                        if (updatedPersona) setViewingPersona(updatedPersona);
                        api.images.delete(viewingPersona.id, previewImage.id).catch(err => console.error('[API] Image delete error:', err));
                        setPreviewImage(null);
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Trash size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          , document.body)}
        </div>
      }

      {showGenerator && activePersonaForGen && (
        <VisualGenerator 
          persona={activePersonaForGen} 
          onClose={() => {
            setShowGenerator(false);
          }} 
          onSaveImage={handleSaveGeneratedImage}
        />
      )}

      {refSheetPersona && (
        <ReferenceSheetModal
          persona={refSheetPersona}
          onClose={() => setRefSheetPersona(null)}
        />
      )}
    </div>
  );
}
