import React, { useState, useEffect } from 'react';

export function useProMode() {
  const [isPro, setIsPro] = useState(() => {
    return localStorage.getItem('ai_studio_pro_mode') === 'true';
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ai_studio_pro_mode') {
        setIsPro(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleProMode = (val: boolean) => {
    setIsPro(val);
    localStorage.setItem('ai_studio_pro_mode', String(val));
    window.dispatchEvent(new Event('pro-mode-change'));
  };

  useEffect(() => {
    const handleCustomEvent = () => {
      setIsPro(localStorage.getItem('ai_studio_pro_mode') === 'true');
    };
    window.addEventListener('pro-mode-change', handleCustomEvent);
    return () => window.removeEventListener('pro-mode-change', handleCustomEvent);
  }, []);

  return [isPro, toggleProMode] as const;
}

// Inline rendering component for premium toggle switch
interface ProModeToggleProps {
  isPro: boolean;
  onToggle: (val: boolean) => void;
}

export const ProModeToggle: React.FC<ProModeToggleProps> = ({ isPro, onToggle }) => {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300">
      <span className="hidden text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] sm:inline">Experience</span>
      <button
        type="button"
        onClick={() => onToggle(!isPro)}
        aria-pressed={isPro}
        aria-label={`Switch to ${isPro ? 'Simple' : 'Pro'} mode`}
        title={`Switch to ${isPro ? 'Simple' : 'Pro'} mode`}
        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${isPro ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-300' : 'border-[var(--border-strong)] bg-[var(--accent-muted)] text-[var(--accent-primary)]'}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isPro ? 'bg-cyan-300' : 'bg-[var(--accent-primary)]'}`} />
        {isPro ? 'Pro' : 'Simple'}
      </button>
    </div>
  );
};
