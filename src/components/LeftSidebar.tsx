import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Bot,
  CalendarDays,
  ChevronDown,
  Images,
  MessageCircle,
  MoreHorizontal,
  Settings,
  Sparkles,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { Tab } from '../types';
import { cn } from '../utils/cn';

interface LeftSidebarProps {
  activeTab: Tab;
  onNavigate: (tab: Tab, params?: Record<string, unknown>) => void;
  newAssetsCount: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavigationItem {
  id: string;
  label: string;
  description: string;
  icon: typeof Users;
  tabTarget: Tab;
  badge?: number;
}

const primaryItems: NavigationItem[] = [
  { id: 'personas', label: 'Personas', description: 'Create and manage identities', icon: Users, tabTarget: 'personas' },
  { id: 'create', label: 'Create', description: 'Images, video, voice, and more', icon: Sparkles, tabTarget: 'create' },
  { id: 'tools', label: 'AI Toolbox', description: 'Edit, enhance, and build content', icon: Wrench, tabTarget: 'intelligence' },
  { id: 'library', label: 'Library', description: 'Review every generated asset', icon: Images, tabTarget: 'gallery' },
  { id: 'planner', label: 'Planner', description: 'Plan and schedule content', icon: CalendarDays, tabTarget: 'planner' },
];

const secondaryItems: NavigationItem[] = [
  { id: 'chat', label: 'Persona Chat', description: 'Text and live voice conversations', icon: MessageCircle, tabTarget: 'assistant' },
  { id: 'agent', label: 'Super Agent', description: 'Coordinate complex creator tasks', icon: Bot, tabTarget: 'agent' },
  { id: 'analytics', label: 'Analytics', description: 'Performance and audience insights', icon: BarChart3, tabTarget: 'trends' },
];

function isItemActive(item: NavigationItem, activeTab: Tab) {
  return item.tabTarget === activeTab;
}

export default function LeftSidebar({
  activeTab,
  onNavigate,
  newAssetsCount,
  mobileOpen = false,
  onMobileClose,
}: LeftSidebarProps) {
  const hasActiveSecondaryItem = secondaryItems.some((item) => isItemActive(item, activeTab));
  const [moreOpen, setMoreOpen] = useState(hasActiveSecondaryItem);

  useEffect(() => {
    if (hasActiveSecondaryItem) setMoreOpen(true);
  }, [hasActiveSecondaryItem]);

  const handleNavigate = (tab: Tab, params?: Record<string, unknown>) => {
    onNavigate(tab, params);
    onMobileClose?.();
  };

  const renderNavigationItem = (item: NavigationItem) => {
    const active = isItemActive(item, activeTab);
    const ItemIcon = item.icon;
    const badge = item.id === 'library' ? newAssetsCount : item.badge;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleNavigate(item.tabTarget)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group relative flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200',
          active
            ? 'border-[var(--border-strong)] bg-[var(--accent-subtle)] text-[var(--text-primary)] shadow-[0_12px_30px_rgba(0,0,0,0.16)]'
            : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:bg-white/[0.035] hover:text-[var(--text-primary)]',
        )}
      >
        <span
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border transition-colors',
            active
              ? 'border-[var(--border-strong)] bg-[var(--accent-muted)] text-[var(--accent-primary)]'
              : 'border-white/[0.055] bg-white/[0.025] text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]',
          )}
        >
          <ItemIcon size={17} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold tracking-[-0.01em]">{item.label}</span>
          <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">{item.description}</span>
        </span>
        {Boolean(badge) && (
          <span className="rounded-full border border-[var(--border-strong)] bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-primary)]">
            {badge}
          </span>
        )}
        {active && <span className="absolute right-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent-primary)]" />}
      </button>
    );
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onMobileClose}
          className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={cn(
          'app-sidebar fixed inset-y-0 left-0 z-[10001] flex h-full w-[292px] max-w-[88vw] shrink-0 select-none flex-col border-r border-[var(--border-subtle)] transition-transform duration-200 ease-out lg:static lg:z-50 lg:w-[272px] lg:max-w-none lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-20 items-center gap-3 border-b border-[var(--border-subtle)] px-4">
          <button
            type="button"
            onClick={() => handleNavigate('personas')}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left transition-colors hover:bg-white/[0.035]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[var(--border-strong)] bg-[#090a0c] p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
              <img src="/logo.png" alt="" className="h-full w-full object-contain" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-['Cinzel',serif] text-[13px] font-bold tracking-[0.02em] text-[var(--text-primary)]">
                AI INFLUENCER
              </span>
              <span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.42em] text-[var(--accent-primary)]">
                Studio
              </span>
            </span>
          </button>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onMobileClose}
            className="rounded-xl p-2 text-[var(--text-tertiary)] transition-colors hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Main navigation" className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">Workspace</p>
          <div className="space-y-1">{primaryItems.map(renderNavigationItem)}</div>

          <div className="my-4 h-px bg-[var(--border-subtle)]" />

          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
              hasActiveSecondaryItem
                ? 'border-[var(--border-strong)] bg-[var(--accent-subtle)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:bg-white/[0.035] hover:text-[var(--text-primary)]',
            )}
          >
            <span className="grid h-9 w-9 place-items-center rounded-[11px] border border-white/[0.055] bg-white/[0.025]">
              <MoreHorizontal size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold">More</span>
              <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">Chat, agent, and analytics</span>
            </span>
            <ChevronDown size={15} className={cn('transition-transform', moreOpen && 'rotate-180')} />
          </button>

          <AnimatePresence initial={false}>
            {moreOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-1 space-y-1 border-l border-[var(--border-subtle)] pl-2">
                  {secondaryItems.map(renderNavigationItem)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        <div className="border-t border-[var(--border-subtle)] p-3">
          <button
            type="button"
            onClick={() => handleNavigate('settings')}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
              activeTab === 'settings'
                ? 'border-[var(--border-strong)] bg-[var(--accent-subtle)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:bg-white/[0.035] hover:text-[var(--text-primary)]',
            )}
          >
            <span className="grid h-9 w-9 place-items-center rounded-[11px] border border-white/[0.055] bg-white/[0.025]">
              <Settings size={17} />
            </span>
            <span>
              <span className="block text-[13px] font-semibold">Settings</span>
              <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">Providers and preferences</span>
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
