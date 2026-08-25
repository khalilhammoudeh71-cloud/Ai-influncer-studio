import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Persona, GeneratedImage, NavActions } from '../types';
import {
  Download, Film, Image as ImageIcon, Search, X, Filter,
  AlertCircle, FolderDown, Loader2, Trash2, Heart, ChevronLeft,
  ChevronRight, ArrowUpDown, Play, SortAsc, LayoutGrid, Columns, Share2,
  Check, Sparkles, Pencil, FolderHeart
} from 'lucide-react';
import { api } from '../services/apiService';
import toast from 'react-hot-toast';
import { upscaleImage } from '../services/imageService';
import { cn } from '../utils/cn';
import { accountLocalStorage } from '../utils/accountStorage';

interface GalleryViewProps {
  personas: Persona[];
  activePersona: Persona;
  nav: NavActions;
  onPersonasChange?: (personas: Persona[]) => void;
}

interface GalleryItem extends GeneratedImage {
  personaId: string;
  personaName: string;
}

type SortMode = 'newest' | 'oldest' | 'persona' | 'type';

export default function GalleryView({ personas, activePersona, nav, onPersonasChange }: GalleryViewProps) {
  const [filterPersonaId, setFilterPersonaId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(accountLocalStorage.getItem('gallery_favorites') || '[]')); } catch { return new Set(); }
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'masonry'>('grid');

  // Batch Upscale states
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uploadedFiles, setUploadedFiles] = useState<{ id: string; name: string; dataUrl: string }[]>([]);
  const [upscaleTarget, setUpscaleTarget] = useState<'2k' | '4k'>('4k');
  const [upscaleModelId, setUpscaleModelId] = useState<string>('wavespeed-upscale:wavespeed-ai/image-upscaler');
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaleProgress, setUpscaleProgress] = useState({ current: 0, total: 0, currentName: '' });
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Context menu state (#14)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; item: GalleryItem } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  const openCtxMenu = useCallback((e: React.MouseEvent, item: GalleryItem) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, item });
  }, []);

  // Flatten all visual libraries
  const allMedia = useMemo(() => {
    const media: GalleryItem[] = [];
    personas.forEach(p => {
      if (p.visualLibrary && p.visualLibrary.length > 0) {
        p.visualLibrary.forEach(item => {
          media.push({ ...item, personaId: p.id, personaName: p.name });
        });
      }
    });
    return media;
  }, [personas]);

  // Apply filters + sort
  const filteredMedia = useMemo(() => {
    let result = allMedia.filter(item => {
      const matchPersona = filterPersonaId === 'all' || item.personaId === filterPersonaId;
      const isVideo = item.mediaType === 'video';
      const matchType =
        filterType === 'all' ? true :
        filterType === 'favorites' ? favorites.has(item.id) :
        filterType === 'image' ? !isVideo :
        filterType === 'video' ? isVideo : true;
      const matchSearch = !searchQuery || item.prompt.toLowerCase().includes(searchQuery.toLowerCase());
      return matchPersona && matchType && matchSearch;
    });

    switch (sortMode) {
      case 'newest': result = result.sort((a, b) => b.timestamp - a.timestamp); break;
      case 'oldest': result = result.sort((a, b) => a.timestamp - b.timestamp); break;
      case 'persona': result = result.sort((a, b) => a.personaName.localeCompare(b.personaName)); break;
      case 'type': result = result.sort((a, b) => (a.mediaType || 'image').localeCompare(b.mediaType || 'image')); break;
    }
    return result;
  }, [allMedia, filterPersonaId, filterType, searchQuery, sortMode, favorites]);

  // Selected index for prev/next navigation
  const selectedIndex = selectedItem ? filteredMedia.findIndex(i => i.id === selectedItem.id) : -1;

  const navigateModal = useCallback((dir: 'prev' | 'next') => {
    if (selectedIndex < 0) return;
    const next = dir === 'prev' ? selectedIndex - 1 : selectedIndex + 1;
    if (next >= 0 && next < filteredMedia.length) setSelectedItem(filteredMedia[next]);
  }, [selectedIndex, filteredMedia]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      accountLocalStorage.setItem('gallery_favorites', JSON.stringify([...next]));
      return next;
    });
  };

  const handleDelete = async (item: GalleryItem) => {
    if (!window.confirm(`Delete this ${item.mediaType === 'video' ? 'video' : 'image'}? This cannot be undone.`)) return;
    setDeletingId(item.id);
    try {
      await api.images.delete(item.personaId, item.id);
      // Remove from the persona locally
      if (onPersonasChange) {
        const updated = personas.map(p => {
          if (p.id !== item.personaId) return p;
          return { ...p, visualLibrary: (p.visualLibrary || []).filter(i => i.id !== item.id) };
        });
        onPersonasChange(updated);
      }
      if (selectedItem?.id === item.id) setSelectedItem(null);
      toast.success('Deleted from vault');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const downloadFile = (url: string, type: 'image' | 'video', name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_')}_${Date.now()}.${type === 'video' ? 'mp4' : 'png'}`;
    if (type === 'video') a.target = '_blank';
    a.click();
  };

  const handleLocalFilesAdded = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedFiles(prev => [
          ...prev,
          {
            id: 'upload-' + Math.random().toString(36).substring(2, 9),
            name: file.name,
            dataUrl: reader.result as string
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
    // Reset file input
    e.target.value = '';
  };

  const runBatchUpscale = async () => {
    const selectedItems = allMedia.filter(item => selectedIds.has(item.id) && (!item.mediaType || item.mediaType === 'image'));
    const totalCount = selectedItems.length + uploadedFiles.length;
    if (totalCount === 0) {
      toast.error('No images selected or uploaded.');
      return;
    }

    setIsUpscaling(true);
    let successCount = 0;
    let failCount = 0;

    const toastId = toast.loading(`Starting batch upscale of ${totalCount} images...`);

    try {
      // Process Selected Images from Library
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        const currentIdx = i + 1;
        setUpscaleProgress({ current: currentIdx, total: totalCount, currentName: `Library Image ${currentIdx}` });
        toast.loading(`Processing image ${currentIdx}/${totalCount}...`, { id: toastId });

        try {
          const res = await upscaleImage(item.url, upscaleModelId, upscaleTarget);
          
          const payload = {
            id: 'img-' + Math.random().toString(36).substring(2, 9),
            url: res.imageUrl,
            prompt: `[${upscaleTarget.toUpperCase()} Upscaled] ${item.prompt || 'Library Image'}`,
            timestamp: Date.now(),
            isFavorite: false,
            model: res.model,
            mediaType: 'image' as const
          };

          await api.images.create(activePersona.id, payload);

          if (onPersonasChange) {
            const nextPersonas = personas.map(p => {
              if (p.id !== activePersona.id) return p;
              return { ...p, visualLibrary: [...(p.visualLibrary || []), payload] };
            });
            onPersonasChange(nextPersonas);
          }
          successCount++;
        } catch (err: any) {
          console.error('Upscale error for library item:', err);
          failCount++;
        }
      }

      // Process Uploaded files
      for (let i = 0; i < uploadedFiles.length; i++) {
        const fileItem = uploadedFiles[i];
        const currentIdx = selectedItems.length + i + 1;
        setUpscaleProgress({ current: currentIdx, total: totalCount, currentName: fileItem.name });
        toast.loading(`Processing file "${fileItem.name}" (${currentIdx}/${totalCount})...`, { id: toastId });

        try {
          const res = await upscaleImage(fileItem.dataUrl, upscaleModelId, upscaleTarget);

          const payload = {
            id: 'img-' + Math.random().toString(36).substring(2, 9),
            url: res.imageUrl,
            prompt: `[${upscaleTarget.toUpperCase()} Upscaled] Uploaded file: ${fileItem.name}`,
            timestamp: Date.now(),
            isFavorite: false,
            model: res.model,
            mediaType: 'image' as const
          };

          await api.images.create(activePersona.id, payload);

          if (onPersonasChange) {
            const nextPersonas = personas.map(p => {
              if (p.id !== activePersona.id) return p;
              return { ...p, visualLibrary: [...(p.visualLibrary || []), payload] };
            });
            onPersonasChange(nextPersonas);
          }
          successCount++;
        } catch (err: any) {
          console.error('Upscale error for uploaded file:', err);
          failCount++;
        }
      }

      toast.success(`Batch upscaling complete! Success: ${successCount}, Failed: ${failCount}`, { id: toastId });
    } catch (globalErr: any) {
      toast.error(globalErr.message || 'Upscaling failed', { id: toastId });
    } finally {
      setIsUpscaling(false);
      setSelectedIds(new Set());
      setUploadedFiles([]);
      setIsBatchMode(false);
      setUpscaleProgress({ current: 0, total: 0, currentName: '' });
    }
  };

  const SORT_OPTIONS: { value: SortMode; label: string }[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'persona', label: 'By Persona' },
    { value: 'type', label: 'By Type' },
  ];

  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar pb-20 p-6 max-w-[1400px] mx-auto w-full">
      <header className="premium-header mb-8 pt-4 pb-2 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Vault <span className="gradient-text">Gallery</span>
            </h1>
            <p className="text-[var(--text-tertiary)] text-sm mt-1.5 font-medium">
              {allMedia.length} assets across {personas.filter(p => p.visualLibrary?.length).length} personas
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-[var(--text-muted)] focus:ring-2 focus:ring-emerald-500 outline-none w-[180px]"
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
              <select
                value={sortMode}
                onChange={e => setSortMode(e.target.value as SortMode)}
                className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl pl-9 pr-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Persona filter */}
            <select
              value={filterPersonaId}
              onChange={e => setFilterPersonaId(e.target.value)}
              className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Personas</option>
              {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {/* Batch Upscale Toggle */}
            <button
              onClick={() => {
                setIsBatchMode(prev => {
                  if (prev) {
                    setSelectedIds(new Set());
                    setUploadedFiles([]);
                  }
                  return !prev;
                });
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg hover:scale-105 ${
                isBatchMode
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 border border-pink-500/20 text-white'
                  : 'bg-gradient-to-r from-[#E7C477] to-[#B99655] hover:brightness-110 text-[#161108]'
              }`}
            >
              <Sparkles size={14} className={isBatchMode ? 'animate-pulse' : ''} />
              {isBatchMode ? 'Cancel Upscale' : '🚀 Batch Upscale'}
            </button>

            {/* Download All */}
            {filteredMedia.length > 0 && (
              <button
                onClick={async () => {
                  setIsExporting(true);
                  const images = filteredMedia.filter(item => !item.mediaType || item.mediaType === 'image');
                  for (const item of images) {
                    try {
                      const a = document.createElement('a');
                      a.href = item.url;
                      a.download = `${item.personaName.replace(/\s+/g, '_')}_${item.id}.png`;
                      a.click();
                      await new Promise(r => setTimeout(r, 300));
                    } catch { /* skip failed */ }
                  }
                  setIsExporting(false);
                }}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-sm font-bold text-white transition-all shadow-lg hover:scale-105 disabled:opacity-50"
              >
                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FolderDown size={14} />}
                {isExporting ? 'Exporting...' : `Download All (${filteredMedia.filter(i => !i.mediaType || i.mediaType === 'image').length})`}
              </button>
            )}
            {/* #13 Layout toggle */}
            <div className="flex items-center gap-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-1">
              <button
                onClick={() => setLayoutMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${layoutMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-[var(--text-muted)] hover:text-white'}`}
                title="Grid layout"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setLayoutMode('masonry')}
                className={`p-1.5 rounded-lg transition-colors ${layoutMode === 'masonry' ? 'bg-emerald-600 text-white' : 'text-[var(--text-muted)] hover:text-white'}`}
                title="Masonry layout"
              >
                <Columns size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Persona Vault Tabs */}
        <div className="flex gap-2 mt-4 flex-wrap items-center pt-2 border-t border-white/5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1.5">
            <FolderHeart size={13} className="text-[#D9BA72]" />
            Persona Vaults:
          </span>
          <button
            onClick={() => setFilterPersonaId('all')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer",
              filterPersonaId === 'all'
                ? "bg-[#E7C477] border-[#E7C477] text-[#161618] shadow-md"
                : "bg-[#18181B] border-white/10 text-slate-300 hover:border-white/30"
            )}
          >
            <span>All Personas</span>
            <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full", filterPersonaId === 'all' ? "bg-black/20" : "bg-white/10")}>
              {allMedia.length}
            </span>
          </button>

          {personas.map(p => {
            const count = p.visualLibrary?.length || 0;
            const isSelected = filterPersonaId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setFilterPersonaId(p.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer",
                  isSelected
                    ? "bg-[#E7C477] border-[#E7C477] text-[#161618] shadow-md"
                    : "bg-[#18181B] border-white/10 text-slate-300 hover:border-white/30"
                )}
              >
                {p.avatar && (
                  <img src={p.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                )}
                <span>{p.name}'s Vault</span>
                <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full", isSelected ? "bg-black/20" : "bg-white/10")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Type filter tabs */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {[
            { id: 'all', label: 'All', count: allMedia.length },
            { id: 'image', label: 'Images', count: allMedia.filter(i => !i.mediaType || i.mediaType === 'image').length },
            { id: 'video', label: 'Videos', count: allMedia.filter(i => i.mediaType === 'video').length },
            { id: 'favorites', label: '❤️ Favorites', count: allMedia.filter(i => favorites.has(i.id)).length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                filterType === tab.id
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                  : 'bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-white hover:border-white/30'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filterType === tab.id ? 'bg-white/20' : 'bg-white/5'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* #5 Beautiful empty state */}
      {allMedia.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-state flex flex-col items-center justify-center py-24 rounded-3xl relative overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.06) 0%, transparent 70%)' }}
        >
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute rounded-full opacity-10 animate-pulse"
                style={{
                  width: `${40 + i * 30}px`, height: `${40 + i * 30}px`,
                  left: `${15 + i * 12}%`, top: `${10 + (i % 3) * 25}%`,
                  background: i % 2 === 0 ? '#00D4FF' : '#D9B667',
                  animationDelay: `${i * 0.4}s`,
                }}
              />
            ))}
          </div>
          <div className="relative z-10 text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.2) 0%, rgba(217,182,103,0.2) 100%)', border: '1px solid rgba(0,212,255,0.2)' }}>
              <ImageIcon size={36} className="text-[#00D4FF] opacity-60" />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-white mb-2">Your vault is empty</h3>
              <p className="text-[var(--text-tertiary)] text-sm max-w-sm mx-auto leading-relaxed">
                Images and videos you generate in the Create Studio appear here. Start creating to build your visual library.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => nav.replace({ view: 'create' })}
              className="premium-button btn-ripple px-8 py-3 text-sm font-black text-[#0B0F17] rounded-2xl"
            >
              ✦ Start Creating
            </motion.button>
          </div>
        </motion.div>
      ) : filteredMedia.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-state flex flex-col items-center justify-center py-20 bg-[var(--bg-elevated)]/30 border border-[var(--border-default)] rounded-3xl"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-[var(--accent-muted)] border border-[var(--border-strong)]">
            <Filter size={28} className="text-[var(--accent-primary)]" />
          </div>
          <h3 className="text-xl font-bold mb-2">No results</h3>
          <p className="text-[var(--text-tertiary)] text-sm max-w-md text-center mb-4">
            Nothing matches your current filters. Try a different search or clear filters.
          </p>
          <button
            onClick={() => { setFilterPersonaId('all'); setFilterType('all'); setSearchQuery(''); }}
            className="px-6 py-2.5 bg-gradient-to-r from-[#E7C477] to-[#B99655] hover:brightness-110 rounded-xl text-sm font-bold text-[#161108] transition-all btn-ripple"
          >
            Clear Filters
          </button>
        </motion.div>
      ) : (
        // #13 Masonry / grid toggle
        <div ref={containerRef} onClick={closeCtxMenu} className={layoutMode === 'masonry' ? 'masonry-grid' : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'}>
          <AnimatePresence>
            {filteredMedia.map(item => {
              const isVideo = item.mediaType === 'video';
              const isFav = favorites.has(item.id);
              const isSelected = selectedIds.has(item.id);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={`group relative ${layoutMode === 'masonry' ? 'masonry-item rounded-2xl overflow-hidden' : 'aspect-square rounded-2xl overflow-hidden'} bg-[var(--bg-elevated)] border cursor-pointer transition-all ${
                    isBatchMode && isSelected 
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-[0.98]' 
                      : 'border-[var(--border-subtle)] hover:border-emerald-500/50'
                  }`}
                  onClick={() => {
                    if (isBatchMode) {
                      if (isVideo) {
                        toast.error("Upscaling is only supported for images!");
                        return;
                      }
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                        return next;
                      });
                    } else {
                      setSelectedItem(item);
                    }
                  }}
                  onContextMenu={(e) => openCtxMenu(e, item)}
                >
                  {isBatchMode && !isVideo && (
                    <div className="absolute top-3 left-3 z-20">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border backdrop-blur-md shadow-lg transition-all ${
                        isSelected 
                          ? 'bg-emerald-500 border-emerald-400 text-white' 
                          : 'bg-black/40 border-white/20 text-transparent hover:border-white/40'
                      }`}>
                        <Check size={12} className="stroke-[3]" />
                      </div>
                    </div>
                  )}
                  {isVideo ? (
                    <video src={item.url} className="w-full h-full object-cover" />
                  ) : (
                    <img 
                      src={item.url} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      loading="lazy" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop';
                      }}
                    />
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-white capitalize">
                        {item.personaName}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                          className={`p-1.5 rounded-lg transition-colors ${isFav ? 'bg-rose-500 text-white' : 'bg-black/50 hover:bg-rose-500 text-white'}`}
                        >
                          <Heart size={12} fill={isFav ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadFile(item.url, isVideo ? 'video' : 'image', item.personaName); }}
                          className="p-1.5 bg-black/50 hover:bg-emerald-500 rounded-lg text-white transition-colors"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                          disabled={deletingId === item.id}
                          className="p-1.5 bg-black/50 hover:bg-rose-600 rounded-lg text-white transition-colors disabled:opacity-50"
                        >
                          {deletingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-white line-clamp-2 leading-snug">
                      {item.prompt}
                    </p>
                  </div>

                  {/* Video play indicator */}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        <Play size={16} className="text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Favorite badge */}
                  {isFav && (
                    <div className="absolute top-2 left-2 pointer-events-none group-hover:opacity-0 transition-opacity">
                      <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                        <Heart size={9} className="text-white fill-white" />
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Detail Modal with prev/next navigation ── */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          >
            {/* Prev/Next arrows */}
            {selectedIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); navigateModal('prev'); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md border border-white/10"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            {selectedIndex < filteredMedia.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); navigateModal('next'); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md border border-white/10"
              >
                <ChevronRight size={24} />
              </button>
            )}

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-3xl overflow-hidden w-full max-w-6xl max-h-full flex flex-col md:flex-row shadow-2xl shadow-emerald-900/20"
            >
              {/* Media */}
              <div className="w-full md:w-2/3 bg-black flex items-center justify-center p-4 relative min-h-[300px]">
                {selectedItem.mediaType === 'video' ? (
                  <video src={selectedItem.url} controls autoPlay loop className="max-w-full max-h-[80vh] object-contain rounded-xl" />
                ) : (
                  <img src={selectedItem.url} alt="" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
                )}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-rose-500 backdrop-blur-md rounded-full text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                {/* Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-bold text-white">
                  {selectedIndex + 1} / {filteredMedia.length}
                </div>
              </div>

              {/* Metadata panel */}
              <div className="w-full md:w-1/3 p-6 flex flex-col bg-[var(--bg-elevated)] overflow-y-auto max-h-[400px] md:max-h-[80vh]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1 block">Persona</span>
                    <h2 className="text-xl font-bold text-white">{selectedItem.personaName}</h2>
                  </div>
                  <button
                    onClick={() => toggleFavorite(selectedItem.id)}
                    className={`p-2.5 rounded-xl transition-colors border ${
                      favorites.has(selectedItem.id)
                        ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                        : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:text-rose-400'
                    }`}
                  >
                    <Heart size={16} fill={favorites.has(selectedItem.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <div className="mb-4">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2 block">Prompt</span>
                  <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl">
                    <p className="text-sm text-white/90 leading-relaxed">{selectedItem.prompt}</p>
                  </div>
                </div>

                {(selectedItem.environment || selectedItem.outfit || selectedItem.framing) && (
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    {selectedItem.environment && (
                      <div>
                        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Environment</span>
                        <p className="text-sm text-white">{selectedItem.environment}</p>
                      </div>
                    )}
                    {selectedItem.outfit && (
                      <div>
                        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Outfit</span>
                        <p className="text-sm text-white">{selectedItem.outfit}</p>
                      </div>
                    )}
                    {selectedItem.framing && (
                      <div>
                        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Framing</span>
                        <p className="text-sm text-white">{selectedItem.framing}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-4">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Model</span>
                  <span className="inline-block px-2 py-1 bg-[var(--bg-surface)] rounded text-xs text-white">
                    {selectedItem.model || 'Unknown model'}
                  </span>
                </div>

                <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] space-y-2">
                  <button
                    onClick={() => downloadFile(selectedItem.url, selectedItem.mediaType === 'video' ? 'video' : 'image', selectedItem.personaName)}
                    className="w-full py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                  {selectedItem.mediaType !== 'video' && (
                    <button
                      onClick={() => {
                        nav.push({ view: 'create', subView: 'image' });
                        toast.success('Loaded image into AI Studio Editor!');
                      }}
                      className="w-full py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <Pencil className="w-4 h-4" /> Edit Image in Studio
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(selectedItem)}
                    disabled={deletingId === selectedItem.id}
                    className="w-full py-2.5 rounded-xl font-bold text-sm bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {deletingId === selectedItem.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* #14 Right-click context menu */}
      <AnimatePresence>
        {ctxMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="context-menu fixed z-[200]"
            style={{ left: Math.min(ctxMenu.x, window.innerWidth - 200), top: Math.min(ctxMenu.y, window.innerHeight - 220) }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="context-menu-item"
              onClick={() => { downloadFile(ctxMenu.item.url, ctxMenu.item.mediaType === 'video' ? 'video' : 'image', ctxMenu.item.personaName); closeCtxMenu(); }}
            >
              <Download size={14} /> Download
            </div>
            <div
              className="context-menu-item"
              onClick={() => { toggleFavorite(ctxMenu.item.id); closeCtxMenu(); }}
            >
              <Heart size={14} className={favorites.has(ctxMenu.item.id) ? 'text-rose-400' : ''} />
              {favorites.has(ctxMenu.item.id) ? 'Remove Favorite' : 'Add to Favorites'}
            </div>
            <div
              className="context-menu-item"
              onClick={() => { navigator.clipboard.writeText(ctxMenu.item.url); toast.success('URL copied!'); closeCtxMenu(); }}
            >
              <Share2 size={14} /> Copy URL
            </div>
            <div className="context-menu-divider" />
            <div
              className="context-menu-item danger"
              onClick={() => { setSelectedItem(ctxMenu.item); closeCtxMenu(); }}
            >
              <ImageIcon size={14} /> View Details
            </div>
            <div
              className="context-menu-item danger"
              onClick={() => { handleDelete(ctxMenu.item); closeCtxMenu(); }}
            >
              <Trash2 size={14} /> Delete
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Batch Upscale Panel */}
      <AnimatePresence>
        {isBatchMode && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] w-[95%] max-w-4xl bg-black/90 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-5 shadow-2xl shadow-emerald-950/40 flex flex-col gap-4 text-white"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              {/* Left Side: Stats */}
              <div>
                <h3 className="text-lg font-black flex items-center gap-2 text-emerald-400">
                  <Sparkles size={18} /> AI Batch Upscaler
                </h3>
                <p className="text-xs text-[var(--text-tertiary)] mt-1 font-medium">
                  Select images from your vault above, or upload new files directly.
                </p>
              </div>

              {/* Action queue stats */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300">
                  Vault: {selectedIds.size} selected
                </span>
                <span className="text-xs font-bold px-3 py-1.5 bg-[var(--accent-muted)] border border-[var(--border-strong)] rounded-xl text-[var(--accent-secondary)]">
                  Uploads: {uploadedFiles.length} files
                </span>
              </div>
            </div>

            <div className="h-px bg-white/10" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Option 1: Upscaler Model */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Upscaler Engine</label>
                <select
                  value={upscaleModelId}
                  onChange={e => setUpscaleModelId(e.target.value)}
                  disabled={isUpscaling}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
                >
                  <option value="wavespeed-upscale:wavespeed-ai/image-upscaler">Wavespeed Super Resolution (Fast)</option>
                  <option value="wavespeed-upscale:wavespeed-ai/ultimate-image-upscaler">Ultimate Image Upscaler (High Detail)</option>
                  <option value="wavespeed-upscale:clarity-ai/crystal-upscaler">Clarity Crystal (Crisp)</option>
                  <option value="wavespeed-upscale:wavespeed-ai/seedvr2/image">SeedVR2 Realism Upscaler</option>
                </select>
              </div>

              {/* Option 2: Resolution (2K / 4K) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Target Resolution</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['2k', '4k'] as const).map(res => (
                    <button
                      key={res}
                      type="button"
                      disabled={isUpscaling}
                      onClick={() => setUpscaleTarget(res)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        upscaleTarget === res
                          ? 'bg-emerald-500 border-emerald-400 text-white font-extrabold'
                          : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:text-white hover:bg-white/10'
                      } disabled:opacity-50`}
                    >
                      {res.toUpperCase()} HD
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 3: Local Upload Button */}
              <div className="flex flex-col gap-1.5 justify-end">
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-tertiary)]">Local Uploads</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={uploadInputRef}
                  onChange={handleLocalFilesAdded}
                  className="hidden"
                  disabled={isUpscaling}
                />
                <button
                  type="button"
                  disabled={isUpscaling}
                  onClick={() => uploadInputRef.current?.click()}
                  className="w-full py-2 bg-white/5 border border-dashed border-white/20 hover:border-emerald-500/50 rounded-xl text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-white"
                >
                  <ImageIcon size={14} className="text-emerald-400" />
                  {uploadedFiles.length > 0 ? `Add More (${uploadedFiles.length} total)` : 'Upload Local Images'}
                </button>
              </div>
            </div>

            {/* List of uploaded files preview */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 max-h-16 overflow-y-auto p-1 bg-white/5 rounded-xl">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="relative group/thumb w-10 h-10 rounded-lg overflow-hidden border border-white/10">
                    <img src={file.dataUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      disabled={isUpscaling}
                      onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-rose-400 disabled:opacity-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Progress or Execution */}
            {isUpscaling ? (
              <div className="space-y-2 bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-400 animate-pulse">Upscaling: {upscaleProgress.currentName}</span>
                  <span>{upscaleProgress.current} / {upscaleProgress.total}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(upscaleProgress.current / upscaleProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBatchMode(false);
                    setSelectedIds(new Set());
                    setUploadedFiles([]);
                  }}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={runBatchUpscale}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-2xl text-xs font-extrabold text-white shadow-lg hover:scale-102 transition-all flex items-center gap-1.5"
                >
                  🚀 Run Batch Upscale ({selectedIds.size + uploadedFiles.length})
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
