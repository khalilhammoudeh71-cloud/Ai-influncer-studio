import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Image as ImageIcon, Check, FolderHeart, Sparkles } from 'lucide-react';
import { Persona } from '../types';
import { api } from '../services/apiService';

interface AssetEntry {
  id: string;
  url: string;
  title: string;
  source: string;
  mediaType: 'image' | 'video' | 'audio';
  timestamp?: number;
}

interface AssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (url: string, title?: string) => void;
  acceptMediaType?: 'image' | 'video' | 'audio' | 'all';
  title?: string;
  currentPersona?: Persona | null;
}

// Built-in high-quality preset assets for quick testing
const PRESET_ASSETS: AssetEntry[] = [
  { id: 'p1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800', title: 'Studio Model Portrait', source: 'Presets', mediaType: 'image' },
  { id: 'p2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', title: 'Male Model Portrait', source: 'Presets', mediaType: 'image' },
  { id: 'p3', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800', title: 'Casual Fashion Pose', source: 'Presets', mediaType: 'image' },
  { id: 'p4', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800', title: 'Garment Outfit Sample', source: 'Presets', mediaType: 'image' },
  { id: 'p5', url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800', title: 'Outdoor Lighting Portrait', source: 'Presets', mediaType: 'image' },
  { id: 'p6', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800', title: 'Smile Portrait', source: 'Presets', mediaType: 'image' },
];

export const AssetPickerModal: React.FC<AssetPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectAsset,
  acceptMediaType = 'all',
  title = 'Select from Asset Library',
  currentPersona,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'persona' | 'gallery' | 'presets'>('all');
  const [assets, setAssets] = useState<AssetEntry[]>([]);
  const [selectedAssetUrl, setSelectedAssetUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadedAssets: AssetEntry[] = [];
    const seenUrls = new Set<string>();

    // 1. Load active persona assets
    if (currentPersona) {
      if (currentPersona.referenceImage && !seenUrls.has(currentPersona.referenceImage)) {
        seenUrls.add(currentPersona.referenceImage);
        loadedAssets.push({
          id: `persona-ref-${currentPersona.id}`,
          url: currentPersona.referenceImage,
          title: `${currentPersona.name || 'Persona'} (Primary Photo)`,
          source: currentPersona.name || 'Current Persona',
          mediaType: 'image',
        });
      }

      (currentPersona.visualLibrary || []).forEach((item: any, idx: number) => {
        if (item.url && !seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          loadedAssets.push({
            id: item.id || `persona-lib-${idx}`,
            url: item.url,
            title: item.prompt || `${currentPersona.name} Asset ${idx + 1}`,
            source: currentPersona.name || 'Persona Vault',
            mediaType: item.mediaType || 'image',
            timestamp: item.timestamp,
          });
        }
      });
    }

    // 2. Load general localStorage gallery items
    try {
      const galleryRaw = localStorage.getItem('ai_influencer_gallery');
      if (galleryRaw) {
        const parsed = JSON.parse(galleryRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any, idx: number) => {
            if (item.url && !seenUrls.has(item.url)) {
              seenUrls.add(item.url);
              loadedAssets.push({
                id: item.id || `gallery-${idx}`,
                url: item.url,
                title: item.prompt || `Generated Asset ${idx + 1}`,
                source: 'Visual Library',
                mediaType: item.mediaType || 'image',
                timestamp: item.timestamp,
              });
            }
          });
        }
      }
    } catch (e) {}

    // 3. Load all personas from Vault
    api.personas.list().then(personas => {
      if (Array.isArray(personas)) {
        personas.forEach(p => {
          if (p.referenceImage && !seenUrls.has(p.referenceImage)) {
            seenUrls.add(p.referenceImage);
            loadedAssets.push({
              id: `p-ref-${p.id}`,
              url: p.referenceImage,
              title: `${p.name} Avatar`,
              source: `Vault: ${p.name}`,
              mediaType: 'image',
            });
          }
          (p.visualLibrary || []).forEach((item: any, idx: number) => {
            if (item.url && !seenUrls.has(item.url)) {
              seenUrls.add(item.url);
              loadedAssets.push({
                id: item.id || `vault-${p.id}-${idx}`,
                url: item.url,
                title: item.prompt || `${p.name} Image ${idx + 1}`,
                source: `Vault: ${p.name}`,
                mediaType: item.mediaType || 'image',
                timestamp: item.timestamp,
              });
            }
          });
        });
        setAssets([...loadedAssets, ...PRESET_ASSETS.filter(pa => !seenUrls.has(pa.url))]);
      }
    }).catch(() => {
      setAssets([...loadedAssets, ...PRESET_ASSETS.filter(pa => !seenUrls.has(pa.url))]);
    });
  }, [isOpen, currentPersona]);

  if (!isOpen) return null;

  const filteredAssets = assets.filter(asset => {
    if (acceptMediaType !== 'all' && asset.mediaType !== acceptMediaType) {
      return false;
    }

    if (activeTab === 'persona') {
      return asset.source.toLowerCase().includes(currentPersona?.name?.toLowerCase() || 'persona');
    }
    if (activeTab === 'gallery') {
      return asset.source === 'Visual Library' || asset.source.startsWith('Vault');
    }
    if (activeTab === 'presets') {
      return asset.source === 'Presets';
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return asset.title.toLowerCase().includes(q) || asset.source.toLowerCase().includes(q);
    }

    return true;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <FolderHeart size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
                <p className="text-xs text-[var(--text-tertiary)]">Select any saved persona photo or generated asset</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search & Tabs Toolbar */}
          <div className="p-4 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] text-xs font-bold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'all' ? 'bg-pink-500 text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:text-white'
                }`}
              >
                All Assets ({assets.length})
              </button>
              {currentPersona && (
                <button
                  onClick={() => setActiveTab('persona')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'persona' ? 'bg-pink-500 text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:text-white'
                  }`}
                >
                  {currentPersona.name || 'Current Persona'}
                </button>
              )}
              <button
                onClick={() => setActiveTab('gallery')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'gallery' ? 'bg-pink-500 text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:text-white'
                }`}
              >
                Library History
              </button>
              <button
                onClick={() => setActiveTab('presets')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'presets' ? 'bg-pink-500 text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:text-white'
                }`}
              >
                Presets
              </button>
            </div>

            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-xs text-white placeholder-[var(--text-tertiary)] focus:outline-none focus:border-pink-500/50"
              />
            </div>
          </div>

          {/* Grid Content */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            {filteredAssets.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-3 text-[var(--text-tertiary)]">
                <ImageIcon size={40} className="opacity-40" />
                <p className="text-sm font-bold">No assets found</p>
                <p className="text-xs">Try searching for a different keyword or tab.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredAssets.map(asset => {
                  const isSelected = selectedAssetUrl === asset.url;
                  return (
                    <motion.div
                      key={asset.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedAssetUrl(asset.url)}
                      className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all shadow-md ${
                        isSelected
                          ? 'border-pink-500 ring-4 ring-pink-500/20'
                          : 'border-[var(--border-default)] hover:border-pink-500/50'
                      }`}
                    >
                      <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                      {/* Top Selection Icon */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 p-1.5 rounded-full bg-pink-500 text-white shadow-lg">
                          <Check size={14} />
                        </div>
                      )}

                      {/* Bottom Info */}
                      <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-white truncate drop-shadow-md">{asset.title}</span>
                        <span className="text-[9px] text-pink-300 font-medium truncate">{asset.source}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="px-6 py-4 border-t border-[var(--border-default)] bg-[var(--bg-surface)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)] font-medium">
              {selectedAssetUrl ? '1 Asset Selected' : 'Click any asset above to select'}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!selectedAssetUrl}
                onClick={() => {
                  if (selectedAssetUrl) {
                    onSelectAsset(selectedAssetUrl);
                    onClose();
                  }
                }}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 ${
                  selectedAssetUrl
                    ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:brightness-110'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                <Sparkles size={14} /> Use Selected Asset
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
