import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, PlusCircle, Sparkles, MessageSquare, Settings,
  Calendar, Wand2, Image as ImageIcon, Video, Mic, Scissors,
  Palette, UserRound, ArrowRight, Command, CornerDownLeft, Wrench, WandSparkles
} from 'lucide-react';
import { Persona, Tab } from '../types';
import type { CreationBrief } from '../types/creation';
import { interpretCreationCommand } from '../utils/creationCommand';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
  onNavigate: (tab: Tab) => void;
  onSelectPersona: (id: string) => void;
  onOpenSubView?: (tab: Tab, subView: string) => void;
  onCreate: (brief: CreationBrief) => void;
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
  onCreate,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allItems: CommandItem[] = useMemo(() => {
    const nav: CommandItem[] = [
      { id: 'nav-personas', label: 'Personas', description: 'Manage your AI personas', icon: <Users size={16} />, category: 'Navigation', action: () => onNavigate('personas'), keywords: ['home', 'dashboard'] },
      { id: 'nav-create', label: 'AI Studio', description: 'Generate images, videos & content', icon: <PlusCircle size={16} />, category: 'Navigation', action: () => onNavigate('create'), keywords: ['generate', 'make', 'studio'] },
      { id: 'nav-toolbox', label: 'AI Toolbox', description: 'Visual editors & marketing strategy', icon: <Wrench size={16} />, category: 'Navigation', action: () => onNavigate('intelligence'), keywords: ['tools', 'edit', 'beautify', 'swap', 'brand', 'analytics'] },
      { id: 'nav-planner', label: 'Planner', description: 'Schedule posts & calendar campaigns', icon: <Calendar size={16} />, category: 'Navigation', action: () => onNavigate('planner'), keywords: ['schedule', 'plan', 'calendar', 'week'] },
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
      { id: 'tool-image', label: 'Generate Image', description: 'Describe a result and let the studio set it up', icon: <ImageIcon size={16} />, category: 'Tools', action: () => { if (onOpenSubView) onOpenSubView('create', 'image'); else onNavigate('create'); }, keywords: ['photo', 'picture'] },
      { id: 'tool-video', label: 'Generate Video', description: 'Create motion from a prompt or reference', icon: <Video size={16} />, category: 'Tools', action: () => { if (onOpenSubView) onOpenSubView('create', 'video'); else onNavigate('create'); }, keywords: ['reel', 'clip', 'animate'] },
      { id: 'tool-avatar', label: 'Create Talking Avatar', description: 'Animate a photo with a voice or script', icon: <UserRound size={16} />, category: 'Tools', action: () => { if (onOpenSubView) onOpenSubView('create', 'talking-avatar'); else onNavigate('create'); }, keywords: ['talking photo', 'lip sync', 'speaking avatar'] },
      { id: 'tool-aitools', label: 'AI Editing Tools', description: 'Beautify, morph, teleport & more', icon: <Wand2 size={16} />, category: 'Tools', action: () => onNavigate('intelligence'), keywords: ['edit', 'beautify', 'enhance', 'retouch', 'toolbox'] },
      { id: 'tool-voice', label: 'Voice Studio', description: 'Text-to-speech & voice cloning', icon: <Mic size={16} />, category: 'Tools', action: () => { if (onOpenSubView) onOpenSubView('create', 'voice'); else onNavigate('create'); }, keywords: ['audio', 'speech', 'tts'] },
      { id: 'tool-planner', label: 'Content Planner', description: '7-day content strategy generator', icon: <Calendar size={16} />, category: 'Tools', action: () => onNavigate('planner'), keywords: ['schedule', 'plan', 'calendar', 'week'] },
    ];

    return [...nav, ...personaItems, ...tools];
  }, [personas, onNavigate, onSelectPersona, onOpenSubView]);

  const creationBrief = useMemo(() => interpretCreationCommand(query), [query]);

  const creationItem = useMemo<CommandItem | null>(() => {
    if (!creationBrief) return null;
    return {
      id: 'create-from-request',
      label: creationBrief.title,
      description: creationBrief.description,
      icon: <WandSparkles size={16} />,
      category: 'Quick Actions',
      action: () => onCreate(creationBrief),
      keywords: [],
    };
  }, [creationBrief, onCreate]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(item => {
      const searchable = [item.label, item.description || '', ...(item.keywords || [])].join(' ').toLowerCase();
      return searchable.includes(q);
    });
  }, [allItems, query]);

  const displayItems = useMemo(
    () => creationItem ? [creationItem, ...filtered] : filtered,
    [creationItem, filtered],
  );

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    displayItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [displayItems]);

  const flatFiltered = displayItems;

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
          className="relative mx-4 w-full max-w-[620px] overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
            <WandSparkles size={18} className="shrink-0 text-[var(--accent-primary)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="What do you want to make?"
              className="flex-1 bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden items-center gap-0.5 rounded border border-[var(--border-default)] bg-[var(--bg-input)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)] sm:flex">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2">
            {flatFiltered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-[var(--text-muted)]">No results for "{query}"</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Try describing an image, video, avatar, tool, or destination</p>
              </div>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="mb-1">
                  <div className="px-3 py-1.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)]">{category === 'Quick Actions' ? 'Create from your request' : category}</span>
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
                            ? 'border border-[var(--border-strong)] bg-[var(--accent-muted)]'
                            : 'border border-transparent hover:bg-white/5'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)]' : 'bg-white/5 text-[var(--text-tertiary)]'
                        }`}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`truncate text-sm font-semibold ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                            {item.label}
                          </p>
                          {item.description && (
                            <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">{item.description}</p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex shrink-0 items-center gap-1 text-[var(--accent-primary)]">
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
          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-black/20 px-4 py-2.5">
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
