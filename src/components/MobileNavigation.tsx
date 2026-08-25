import { Home, Images, Menu, Sparkles, Wrench } from 'lucide-react';
import { Tab } from '../types';
import { cn } from '../utils/cn';

interface MobileNavigationProps {
  activeTab: Tab;
  onNavigate: (tab: Tab) => void;
  onOpenMenu: () => void;
  newAssetsCount: number;
}

const items: Array<{ label: string; tab: Tab; icon: typeof Home }> = [
  { label: 'Home', tab: 'personas', icon: Home },
  { label: 'Create', tab: 'create', icon: Sparkles },
  { label: 'Toolbox', tab: 'intelligence', icon: Wrench },
  { label: 'Library', tab: 'gallery', icon: Images },
];

export default function MobileNavigation({ activeTab, onNavigate, onOpenMenu, newAssetsCount }: MobileNavigationProps) {
  return (
    <nav aria-label="Mobile navigation" className="app-mobile-nav fixed inset-x-0 bottom-0 z-[9990] grid h-[68px] grid-cols-5 border-t border-[var(--border-default)] px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
      {items.map((item) => {
        const active = activeTab === item.tab;
        const ItemIcon = item.icon;
        const emphasized = item.tab === 'create';

        return (
          <button
            key={item.tab}
            type="button"
            onClick={() => onNavigate(item.tab)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-w-0 flex-col items-center justify-center gap-1 text-[9px] font-semibold transition-colors',
              active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]',
            )}
          >
            <span
              className={cn(
                'relative grid h-8 w-10 place-items-center rounded-xl transition-all',
                active && !emphasized && 'bg-[var(--accent-subtle)]',
                emphasized && '-mt-5 h-12 w-12 rounded-2xl border border-[var(--border-strong)] bg-[var(--accent-primary)] text-[#15120b] shadow-[0_10px_28px_rgba(231,196,119,0.28)]',
              )}
            >
              <ItemIcon size={emphasized ? 20 : 18} strokeWidth={emphasized ? 2.2 : 1.8} />
              {item.tab === 'gallery' && newAssetsCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent-primary)] px-1 text-[8px] font-bold text-[#15120b]">
                  {newAssetsCount}
                </span>
              )}
            </span>
            <span className={cn(emphasized && '-mt-0.5 text-[var(--accent-primary)]')}>{item.label}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center gap-1 text-[9px] font-semibold text-[var(--text-tertiary)]"
      >
        <span className="grid h-8 w-10 place-items-center rounded-xl">
          <Menu size={18} strokeWidth={1.8} />
        </span>
        <span>More</span>
      </button>
    </nav>
  );
}
