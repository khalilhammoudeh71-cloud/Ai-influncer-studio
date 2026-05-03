import { Plus, Search, Edit2, Trash2, X, Check, Camera, Upload, Image as ImageIcon, AlertTriangle, Sparkles, ArrowLeft, Download, Heart, Trash, Eye, Loader2, ChevronDown, Cpu, Wand2, Pencil, ArrowUpCircle, Film, LayoutGrid, MessageSquare, Mic, Users, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { Persona, GeneratedImage } from '../types';
import { VisualGenerator } from '../components/VisualGenerator';
import ReferenceSheetModal from '../components/ReferenceSheetModal';
import { api } from '../services/apiService';
import { fetchAvailableModels, fetchAllModelTypes, generateReferenceImage, editImage, upscaleImage, generateVideo, enhancePrompt, type ModelInfo } from '../services/imageService';
import { dashboardFeatureCards, recentCreationPlaceholders } from '../data/demoAssets';
import PersonaBuilderView from './PersonaBuilderView';

interface PersonasViewProps {
  personas: Persona[];
  setPersonas: (p: Persona[]) => void;
  onSelectPersona: (id: string) => void;
  selectedId: string;
  navigateToTab?: (tab: 'personas' | 'create' | 'gallery' | 'assistant' | 'settings') => void;
}

export default function PersonasView({ personas, setPersonas, onSelectPersona, selectedId, navigateToTab }: PersonasViewProps) {
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
    window.location.pathname = '/persona/builder';
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

  if (editingPersona) {
    return (
      <PersonaBuilderView 
        persona={editingPersona}
        onChange={setEditingPersona}
        onSave={handleUpdatePersona}
        onCancel={() => setEditingPersona(null)}
      />
    );
  }

  const activePersona = personas.find(p => p.id === selectedId) || personas[0];

  return (
    <div className="px-6 pt-6 max-w-[1400px] mx-auto pb-12">
      {!activePersona ? (
         <div className="flex flex-col items-center justify-center py-20 bg-[#0F172A]/50 border border-[#334155] rounded-3xl">
           <div className="w-16 h-16 bg-[#00D4FF]/10 rounded-full flex items-center justify-center mb-4 text-[#00D4FF]">
             <Plus size={32} />
           </div>
           <h3 className="text-xl font-bold mb-2">Welcome to AI Studio</h3>
           <p className="text-[var(--text-tertiary)] text-sm mb-6">Create your first persona to get started.</p>
           <button onClick={handleAddPersona} className="premium-button px-6 py-3">Create Persona</button>
         </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Hero Card */}
          <div className="relative rounded-[24px] overflow-hidden border border-[#334155] p-6 shadow-2xl group bg-[#0F172A]">
            <div className="absolute inset-0 bg-gradient-to-r from-[#00D4FF]/5 via-transparent to-[#00F5C2]/10 opacity-60" />
            
            {/* Aurora Wave Effect */}
            <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1000 300">
              <path d="M0 150 Q 250 50 500 150 T 1000 150 L 1000 300 L 0 300 Z" fill="url(#aurora-grad)" opacity="0.1"/>
              <path d="M0 200 Q 300 100 600 200 T 1000 200 L 1000 300 L 0 300 Z" fill="url(#aurora-grad)" opacity="0.15"/>
              <defs>
                <linearGradient id="aurora-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00D4FF" />
                  <stop offset="50%" stopColor="#00F5C2" />
                  <stop offset="100%" stopColor="#6366F1" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute top-0 right-0 w-[600px] h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#00F5C2]/15 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="relative shrink-0">
                <div className="w-[140px] h-[140px] rounded-2xl overflow-hidden ring-1 ring-[#334155] shadow-lg">
                  <img src={activePersona.referenceImage || activePersona.avatar} className="w-full h-full object-cover" alt={activePersona.name} />
                </div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-1.5 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-[#00F5C2] shadow-[0_0_8px_#00F5C2]" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Online</span>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.2em]">Active Persona</span>
                </div>
                
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-[32px] font-semibold text-white tracking-tight">{activePersona.name}</h2>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V18H19V19Z"/></svg>
                    <span className="text-[11px] font-bold tracking-wide">Elite</span>
                  </div>
                </div>

                <p className="text-[#CBD5E1] text-sm mb-5 max-w-2xl leading-relaxed">{activePersona.bio || 'Elite, sophisticated, and influential. Embodies success, refinement, and aspirational luxury lifestyle.'}</p>
                
                <div className="flex flex-wrap gap-2 items-center">
                  {["Elite", "Arrogant", "Wealthy", "Sophisticated"].map((chip, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#111827] border border-[#334155] text-[#CBD5E1] hover:border-[#00D4FF]/50 transition-colors cursor-default">
                      {chip}
                    </span>
                  ))}
                  <button className="w-7 h-7 rounded-full bg-[#111827] border border-[#334155] flex items-center justify-center text-[#94A3B8] hover:text-white hover:border-[#00D4FF] transition-all">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-2 align-self-end mt-auto">
                <button onClick={() => handleOpenEdit(activePersona)} className="px-5 py-2.5 rounded-full bg-[#111827] hover:bg-[#1F2937] border border-[#334155] text-sm font-semibold transition-all flex items-center gap-2 shadow-sm text-white">
                  <Edit2 size={14} /> Edit Persona
                </button>
                <button className="w-10 h-10 rounded-full bg-[#111827] hover:bg-[#1F2937] border border-[#334155] flex items-center justify-center text-white transition-all">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Feature Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { 
                title: 'Create\nPersona', 
                desc: 'Define looks, voice,\ntone & personality.', 
                icon: Users, 
                color: 'teal',
                gradient: 'from-[#00D4FF]/40 to-[#00F5C2]/40',
                img: dashboardFeatureCards[0].img,
                action: handleAddPersona
              },
              { 
                title: 'Generate\nImage', 
                desc: 'High-end AI images\nin any style.', 
                icon: ImageIcon, 
                color: 'emerald',
                gradient: 'from-[#00F5C2]/40 to-[#10B981]/40',
                img: dashboardFeatureCards[1].img,
                action: () => { setActivePersonaForGen(activePersona); setShowGenerator(true); } 
              },
              { 
                title: 'Generate\nVideo', 
                desc: 'Cinematic AI videos\nfrom text or images.', 
                icon: Film, 
                color: 'indigo',
                gradient: 'from-[#6366F1]/40 to-[#8B5CF6]/40',
                img: dashboardFeatureCards[2].img,
                action: () => navigateToTab?.('create') 
              },
              { 
                title: 'Talking\nAvatar', 
                desc: 'Bring your persona\nto life with voice.', 
                icon: Mic, 
                color: 'cyan',
                gradient: 'from-[#00D4FF]/40 to-[#38BDF8]/40',
                img: dashboardFeatureCards[3].img,
                action: () => navigateToTab?.('create') 
              },
              { 
                title: 'AI\nAssistant', 
                desc: 'Your creative copilot\nfor growth & content.', 
                icon: Sparkles, 
                color: 'fuchsia',
                gradient: 'from-[#D946EF]/40 to-[#6366F1]/40',
                img: dashboardFeatureCards[4].img,
                action: () => navigateToTab?.('assistant') 
              }
            ].map((feature, idx) => (
              <div 
                key={idx}
                onClick={feature.action}
                className="relative h-[290px] rounded-[24px] overflow-hidden cursor-pointer group border transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                style={{
                   boxShadow: feature.title.includes('Image') ? '0 0 24px rgba(0, 245, 194, 0.2)' : 
                             feature.title.includes('Persona') ? '0 0 24px rgba(0, 212, 255, 0.2)' :
                             feature.title.includes('Video') ? '0 0 24px rgba(99, 102, 241, 0.2)' : 
                             feature.title.includes('Avatar') ? '0 0 24px rgba(14, 165, 233, 0.2)' : '0 0 24px rgba(217, 70, 239, 0.2)',
                   borderColor: feature.title.includes('Image') ? 'rgba(0, 245, 194, 0.5)' : 
                               feature.title.includes('Persona') ? 'rgba(0, 212, 255, 0.5)' :
                               feature.title.includes('Video') ? 'rgba(99, 102, 241, 0.5)' : 
                               feature.title.includes('Avatar') ? 'rgba(14, 165, 233, 0.5)' : 'rgba(217, 70, 239, 0.5)'
                }}
              >
                <img src={feature.img} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" alt="" />
                
                {/* Custom Gradient overlay based on the reference */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-20`} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17]/85 via-[#0B0F17]/25 to-transparent" />
                
                <div className="absolute inset-0 p-5 flex flex-col">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-auto shadow-2xl bg-[#0F172A]/80 backdrop-blur-xl border border-white/20 group-hover:bg-white/20 transition-all duration-300">
                    <feature.icon size={22} className="text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
                  </div>
                  
                  <h4 className="text-[22px] font-bold text-white mb-1 leading-tight whitespace-pre-line tracking-tight">{feature.title}</h4>
                  <p className="text-[12px] text-[#CBD5E1] font-medium mb-3 whitespace-pre-line leading-relaxed">
                    {feature.desc}
                  </p>
                  
                  <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white bg-white/5 backdrop-blur-sm group-hover:bg-[#00D4FF]/20 group-hover:border-[#00D4FF]/40 transition-all duration-300 mt-auto">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Creations */}
          <div className="bg-[#0F172A] rounded-[24px] border border-[#334155] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="text-white/80" size={20} />
                <h3 className="text-xl font-semibold text-white">Recent Creations</h3>
                <span className="text-sm text-[#94A3B8] ml-2 font-normal hidden sm:inline">Your latest AI-powered content.</span>
              </div>
              <button onClick={() => navigateToTab?.('gallery')} className="text-sm font-medium text-white hover:text-[#00D4FF] transition-colors flex items-center gap-1 bg-[#111827] px-4 py-1.5 rounded-full border border-[#334155]">
                View all <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            {activePersona.visualLibrary && activePersona.visualLibrary.filter(img => !['lips', 'eyes', 'skin', 'closeup', 'beauty', 'mouth', 'sheet', 'close', 'pores', 'neck', 'eyebrow', 'chin', 'cheek'].some(word => (img.prompt || '').toLowerCase().includes(word) || (img.url || '').toLowerCase().includes(word))).length > 0 ? (
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
                {activePersona.visualLibrary.filter(img => !['lips', 'eyes', 'skin', 'closeup', 'beauty', 'mouth', 'sheet', 'close', 'pores', 'neck', 'eyebrow', 'chin', 'cheek'].some(word => (img.prompt || '').toLowerCase().includes(word) || (img.url || '').toLowerCase().includes(word))).slice().reverse().slice(0, 10).map((img) => (
                  <div 
                    key={img.id}
                    onClick={() => openPreviewImage(img)}
                    className="relative w-[280px] h-[380px] shrink-0 rounded-2xl overflow-hidden group cursor-pointer border border-[#334155] hover:border-[#00D4FF]/40 transition-all shadow-lg"
                  >
                    {img.mediaType === 'video' ? (
                      <video src={img.url} muted className="w-full h-full object-cover" />
                    ) : (
                      <img src={img.url} className="w-full h-full object-cover" alt="" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                    
                    <div className="absolute top-3 left-3 flex gap-2 z-10">
                      <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[9px] font-black uppercase tracking-wider border border-white/10 text-white shadow-sm">
                        {img.mediaType === 'video' ? 'VIDEO' : 'IMAGE'}
                      </span>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 group-hover:translate-y-0 transition-transform">
                      <p className="text-sm font-bold text-white line-clamp-2 mb-2">{img.prompt || 'Generated content'}</p>
                      <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity delay-75">
                        <span className="text-[10px] text-[var(--text-tertiary)]">{new Date(img.timestamp).toLocaleDateString()}</span>
                        <button className="text-[#94A3B8] hover:text-white transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
             <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {recentCreationPlaceholders.map((item, idx) => (
                <div 
                  key={idx}
                  className="relative h-[220px] rounded-xl overflow-hidden group cursor-pointer border border-[#334155] hover:border-[#00D4FF]/50 transition-all shadow-md bg-[#111827]"
                >
                  <img src={item.img} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/25 to-transparent" />
                  
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-2 py-1 bg-[#111827]/80 backdrop-blur-md rounded-[4px] text-[9px] font-bold tracking-wider text-[#CBD5E1]">
                      {item.badge}
                    </span>
                  </div>

                  {item.duration && (
                    <div className="absolute bottom-[60px] right-3 z-10">
                      <span className="px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] font-bold text-white">
                        {item.duration}
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[#0B0F17] to-transparent">
                    <p className="text-sm font-semibold text-white truncate mb-0.5">{item.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#94A3B8]">{item.date}</span>
                      <button className="text-[#94A3B8] hover:text-white transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Assistant Strip */}
          <div className="bg-[#0F172A] rounded-[24px] border border-[#334155] p-4 flex flex-col md:flex-row items-start md:items-center justify-between shadow-xl">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <div className="w-12 h-12 rounded-full bg-[#00D4FF]/10 flex items-center justify-center border border-[#00D4FF]/20 shadow-[0_0_15px_rgba(0,212,255,0.2)] shrink-0">
                <Sparkles size={24} className="text-[#00D4FF]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-semibold text-white text-[15px]">AI Assistant</h4>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F5C2]" />
                    <span className="text-[10px] text-[#94A3B8]">Online</span>
                  </div>
                </div>
                <p className="text-xs text-[#94A3B8]">Ask anything about your persona, content ideas, or growth strategies.</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 md:ml-4 w-full md:w-auto">
              {[
                { title: 'Content ideas', desc: 'for high-end audience' },
                { title: 'Write a luxury', desc: 'Instagram caption' },
                { title: 'Plan a 7-day content', desc: 'series' }
              ].map((chip, i) => (
                <button key={i} onClick={() => navigateToTab?.('assistant')} className="px-4 py-2 rounded-xl bg-[#111827] border border-[#334155] hover:border-[#00D4FF]/40 text-left transition-all group flex-1">
                  <p className="text-[11px] font-semibold text-white group-hover:text-[#00D4FF] transition-colors">{chip.title}</p>
                  <p className="text-[10px] text-[#94A3B8]">{chip.desc}</p>
                </button>
              ))}
            </div>
            
            <button onClick={() => navigateToTab?.('assistant')} className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00F5C2] to-[#00D4FF] flex items-center justify-center text-[#0B0F17] hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all shrink-0 mt-4 md:mt-0 md:ml-4">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </div>

        </div>
      )}

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
                      download={`${viewingPersona?.name?.replace(/\s+/g, '_') || 'persona'}_${previewImage.id}.png`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] rounded-xl text-xs font-bold transition-colors"
                    >
                      <Download size={14} /> Download
                    </a>
                    <button
                      onClick={() => {
                        if (!viewingPersona) return;
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
