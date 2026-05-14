import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, PlusCircle, Sparkles, MessageSquare, Settings,
  Calendar, Wand2, Image as ImageIcon, Video, Mic, Scissors,
  Palette, UserRound, ArrowRight, Command, CornerDownLeft
} from 'lucide-react';
import { Persona, Tab } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
  onNavigate: (tab: Tab) => void;
  onSelectPersona: (id: string) => void;
  onOpenSubView?: (tab: Tab, subView: string) => void;
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: 'Navigation' | 'Personas' | 'Tools' | 'Quick Actions';
  action: () => void;
  keywords?: string[];
}

export default function CommandPalette({
  isOpen,
  onClose,
  personas,
  onNavigate,
  onSelectPersona,
  onOpenSubView,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allItems: CommandItem[] = useMemo(() => {
    const nav: CommandItem[] = [
      { id: 'nav-personas', label: 'Personas', description: 'Manage your AI personas', icon: <Users size={16} />, category: 'Navigation', action: () => onNavigate('personas'), keywords: ['home', 'dashboard'] },
      { id: 'nav-create', label: 'Create Studio', description: 'Generate images, videos & content', icon: <PlusCircle size={16} />, category: 'Navigation', action: () => onNavigate('create'), keywords: ['generate', 'make', 'studio'] },
      { id: 'nav-gallery', label: 'Gallery', description: 'Browse all generated assets', icon: <Sparkles size={16} />, category: 'Navigation', action: () => onNavigate('gallery'), keywords: ['vault', 'library', 'images', 'media'] },
      { id: 'nav-assistant', label: 'AI Assistant', description: 'Chat with your persona', icon: <MessageSquare size={16} />, category: 'Navigation', action: () => onNavigate('assistant'), keywords: ['chat', 'talk', 'ask'] },
      { id: 'nav-settings', label: 'Settings', description: 'Theme, account & preferences', icon: <Settings size={16} />, category: 'Navigation', action: () => onNavigate('settings'), keywords: ['preferences', 'config', 'theme', 'dark', 'light'] },
    ];

    const personaItems: CommandItem[] = personas.map(p => ({
      id: `persona-${p.id}`,
      label: p.name,
      description: `${p.niche || 'Digital Creator'} · ${p.platform || 'Instagram'}`,
      icon: p.avatar
        ? <img src={p.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
        : <UserRound size={16} />,
      category: 'Personas' as const,
      action: () => { onSelectPersona(p.id); onNavigate('personas'); },
      keywords: [p.niche || '', p.platform || '', p.tone || ''].filter(Boolean),
    }));

    const tools: CommandItem[] = [
      { id: 'tool-image', label: 'Generate Image', description: 'Text-to-image with 30+ models', icon: <ImageIcon size={16} />, category: 'Tools', action: () => onNavigate('create'), keywords: ['photo', 'picture'] },
      { id: 'tool-video', label: 'Generate Video', description: 'Text/Image-to-video generation', icon: <Video size={16} />, category: 'Tools', action: () => onNavigate('create'), keywords: ['reel', 'clip', 'animate'] },
      { id: 'tool-aitools', label: 'AI Editing Tools', description: 'Beautify, morph, teleport & more', icon: <Wand2 size={16} />, category: 'Tools', action: () => { if (onOpenSubView) onOpenSubView('create', 'ai-tools'); else onNavigate('create'); }, keywords: ['edit', 'beautify', 'enhance', 'retouch'] },
      { id: 'tool-voice', label: 'Voice Studio', description: 'Text-to-speech & voice cloning', icon: <Mic size={16} />, category: 'Tools', action: () => { if (onOpenSubView) onOpenSubView('create', 'voice'); else onNavigate('create'); }, keywords: ['audio', 'speech', 'tts'] },
      { id: 'tool-planner', label: 'Content Planner', description: '7-day content strategy generator', icon: <Calendar size={16} />, category: 'Tools', action: () => { if (onOpenSubView) onOpenSubView('create', 'planner'); else onNavigate('create'); }, keywords: ['schedule', 'plan', 'calendar', 'week'] },
    ];

    return [...nav, ...personaItems, ...tools];
  }, [personas, onNavigate, onSelectPersona, onOpenSubView]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(item => {
      const searchable = [item.label, item.description || '', ...(item.keywords || [])].join(' ').toLowerCase();
      return searchable.includes(q);
    });
  }, [allItems, query]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filtered.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filtered]);

  const flatFiltered = useMemo(() => filtered, [filtered]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const executeItem = useCallback((item: CommandItem) => {
    item.action();
    onClose();
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, flatFiltered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && flatFiltered[selectedIndex]) { e.preventDefault(); executeItem(flatFiltered[selectedIndex]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, flatFiltered, selectedIndex, executeItem, onClose]);

  if (!isOpen) return null;

  let flatIdx = 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh]"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Palette */}
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-[560px] mx-4 bg-[#111827]/95 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden backdrop-blur-xl"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
            <Search size={18} className="text-[#94A3B8] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search personas, tools, or actions..."
              className="flex-1 bg-transparent text-sm text-white placeholder-[#64748B] outline-none font-medium"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-bold text-[#64748B]">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2">
            {flatFiltered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-[#64748B] font-medium">No results for "{query}"</p>
                <p className="text-xs text-[#475569] mt-1">Try searching for a persona, tool, or action</p>
              </div>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="mb-1">
                  <div className="px-3 py-1.5">
                    <span className="text-[9px] font-black text-[#475569] uppercase tracking-[0.15em]">{category}</span>
                  </div>
                  {items.map(item => {
                    const idx = flatIdx++;
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        data-index={idx}
                        onClick={() => executeItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-100 ${
                          isSelected
                            ? 'bg-[#00D4FF]/10 border border-[#00D4FF]/20'
                            : 'border border-transparent hover:bg-white/5'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#00D4FF]/15 text-[#00D4FF]' : 'bg-white/5 text-[#94A3B8]'
                        }`}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-[#CBD5E1]'}`}>
                            {item.label}
                          </p>
                          {item.description && (
                            <p className="text-[10px] text-[#64748B] truncate mt-0.5">{item.description}</p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-1 text-[#00D4FF] shrink-0">
                            <CornerDownLeft size={12} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer Hints */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 bg-black/20">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[10px] text-[#475569] font-medium">
                <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[9px]">↑↓</kbd>
                Navigate
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#475569] font-medium">
                <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[9px]">↵</kbd>
                Select
              </div>
            </div>
            <span className="text-[9px] text-[#334155] font-bold uppercase tracking-wider">
              {flatFiltered.length} result{flatFiltered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
