import { useEffect, useRef, useState } from 'react';
import { Bell, Check, Sparkles } from 'lucide-react';
import { api, type ModelCatalogNotificationsResponse } from '../services/apiService';

const EMPTY: ModelCatalogNotificationsResponse = {
  checkedAt: null,
  notifications: [],
  unreadCount: 0,
};

function mediaTypeLabel(type: string) {
  return type.replace(/-/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
}

function inspectedLabel(value: string | null) {
  if (!value) return 'Waiting for the first daily inspection';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return 'Daily inspection active';
  return `Checked ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)}`;
}

export default function ModelNotifications() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ModelCatalogNotificationsResponse>(EMPTY);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => api.modelCatalog.notifications()
      .then(result => { if (!cancelled) setData(result); })
      .catch(error => console.warn('[Model notifications] Could not load:', error));
    void load();
    const interval = window.setInterval(load, 15 * 60 * 1000);
    const onFocus = () => { void load(); };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && data.unreadCount > 0) {
      setData(current => ({ ...current, unreadCount: 0 }));
      api.modelCatalog.markNotificationsRead().catch(error => {
        console.warn('[Model notifications] Could not mark as read:', error);
        api.modelCatalog.notifications().then(setData).catch(() => {});
      });
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={data.unreadCount ? `${data.unreadCount} new model notifications` : 'Model notifications'}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-all hover:border-[var(--border-strong)] hover:text-[var(--accent-primary)]"
        title="New model notifications"
      >
        <Bell size={16} />
        {data.unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[var(--bg-base)] bg-[var(--accent-primary)] px-1 text-[9px] font-extrabold text-[#15120b]">
            {data.unreadCount > 99 ? '99+' : data.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section className="absolute right-0 top-full z-[100000] mt-2 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-2xl shadow-black/60" aria-label="New model notifications">
          <div className="flex items-start justify-between border-b border-[var(--border-subtle)] px-4 py-3.5">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">New models</h2>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{inspectedLabel(data.checkedAt)}</p>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[9px] font-bold text-emerald-300">Daily scan</span>
          </div>

          <div className="custom-scrollbar max-h-[420px] overflow-y-auto p-2">
            {data.notifications.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl border border-[var(--border-subtle)] bg-white/[0.035] text-[var(--accent-primary)]"><Check size={18} /></span>
                <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">You’re caught up</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">New models from connected aggregators will appear here after the daily scan.</p>
              </div>
            ) : data.notifications.slice(0, 20).map(notification => (
              <article key={notification.id} className="flex gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.035]">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border-strong)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"><Sparkles size={15} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[var(--text-primary)]">{notification.name}</p>
                  <p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">{notification.provider} · {mediaTypeLabel(notification.type)}</p>
                  <p className="mt-1 text-[9px] text-[var(--text-tertiary)]">Discovered {new Date(notification.discoveredAt).toLocaleDateString()}</p>
                </div>
                <span className="h-fit rounded-full bg-[var(--accent-muted)] px-2 py-1 text-[8px] font-extrabold uppercase tracking-wide text-[var(--accent-primary)]">New</span>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
