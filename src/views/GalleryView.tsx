import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Persona, GeneratedImage } from '../types';
import { Download, Film, Image as ImageIcon, Search, X, Filter, AlertCircle } from 'lucide-react';

interface GalleryViewProps {
  personas: Persona[];
  activePersona: Persona;
}

interface GalleryItem extends GeneratedImage {
  personaId: string;
  personaName: string;
}

export default function GalleryView({ personas, activePersona }: GalleryViewProps) {
  const [filterPersonaId, setFilterPersonaId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

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
    return media.sort((a, b) => b.timestamp - a.timestamp);
  }, [personas]);

  // Apply filters
  const filteredMedia = useMemo(() => {
    return allMedia.filter(item => {
      const matchPersona = filterPersonaId === 'all' || item.personaId === filterPersonaId;
      const matchType = filterType === 'all' || 
                        (filterType === 'image' && (!item.mediaType || item.mediaType === 'image')) ||
                        (filterType === 'video' && item.mediaType === 'video');
      const matchSearch = !searchQuery || item.prompt.toLowerCase().includes(searchQuery.toLowerCase());
      return matchPersona && matchType && matchSearch;
    });
  }, [allMedia, filterPersonaId, filterType, searchQuery]);

  const downloadFile = (url: string, type: 'image' | 'video', name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_')}_${Date.now()}.${type === 'video' ? 'mp4' : 'png'}`;
    if (type === 'video') a.target = '_blank';
    a.click();
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto w-full">
      <header className="premium-header mb-8 pt-4 pb-2 flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Vault <span className="gradient-text">Gallery</span>
          </h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-1.5 font-medium">
            Manage all your generated assets across personas.
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input 
              type="text" 
              placeholder="Search prompts..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-[var(--text-muted)] focus:ring-2 focus:ring-emerald-500 outline-none w-[200px]"
            />
          </div>
          
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value as any)}
            className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>
          
          <select 
            value={filterPersonaId} 
            onChange={e => setFilterPersonaId(e.target.value)}
            className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Personas</option>
            {personas.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </header>

      {allMedia.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-elevated)]/30 border border-[var(--border-default)] rounded-3xl">
          <ImageIcon className="w-16 h-16 text-[var(--text-muted)] opacity-20 mb-4" />
          <h3 className="text-xl font-bold mb-2">Your gallery is empty</h3>
          <p className="text-[var(--text-tertiary)] text-sm max-w-md text-center">
            Images and videos you generate and save in the Create studio will appear here.
          </p>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-elevated)]/30 border border-[var(--border-default)] rounded-3xl">
          <Filter className="w-16 h-16 text-[var(--text-muted)] opacity-20 mb-4" />
          <h3 className="text-xl font-bold mb-2">No results found</h3>
          <p className="text-[var(--text-tertiary)] text-sm max-w-md text-center">
            No assets match your current filters. Try clearing them to see all your content.
          </p>
          <button 
            onClick={() => { setFilterPersonaId('all'); setFilterType('all'); setSearchQuery(''); }}
            className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold text-white transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <AnimatePresence>
            {filteredMedia.map(item => {
              const isVideo = item.mediaType === 'video';
              return (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-subtle)] cursor-pointer hover:border-emerald-500/50 transition-colors"
                  onClick={() => setSelectedItem(item)}
                >
                  {isVideo ? (
                    <video src={item.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-white capitalize">
                        {item.personaName}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); downloadFile(item.url, isVideo ? 'video' : 'image', item.personaName); }}
                        className="p-1.5 bg-black/50 hover:bg-emerald-500 rounded-lg text-white transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div>
                      <p className="text-xs text-white line-clamp-2 leading-snug">
                        {item.prompt}
                      </p>
                    </div>
                  </div>
                  
                  {/* Type Icon Badge */}
                  {isVideo && (
                    <div className="absolute top-2 left-2 p-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white">
                      <Film className="w-3.5 h-3.5" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-3xl overflow-hidden w-full max-w-6xl max-h-full flex flex-col md:flex-row shadow-2xl shadow-emerald-900/20"
            >
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
              </div>
              
              <div className="w-full md:w-1/3 p-6 flex flex-col bg-[var(--bg-elevated)] overflow-y-auto max-h-[400px] md:max-h-[80vh]">
                <div className="mb-6">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2 block">Persona</span>
                  <h2 className="text-xl font-bold text-white">{selectedItem.personaName}</h2>
                </div>
                
                <div className="mb-6">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2 block">Prompt</span>
                  <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl">
                    <p className="text-sm text-white/90 leading-relaxed">{selectedItem.prompt}</p>
                  </div>
                </div>
                
                {(selectedItem.environment || selectedItem.outfit || selectedItem.framing) && (
                  <div className="mb-6 grid grid-cols-2 gap-3">
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
                
                <div className="mb-6">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">Model</span>
                  <span className="inline-block px-2 py-1 bg-[var(--bg-surface)] rounded text-xs text-white">
                    {selectedItem.model || 'Unknown model'}
                  </span>
                </div>
                
                <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] flex gap-3">
                  <button 
                    onClick={() => downloadFile(selectedItem.url, selectedItem.mediaType === 'video' ? 'video' : 'image', selectedItem.personaName)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
