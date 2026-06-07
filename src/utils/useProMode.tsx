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
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111827]/80 border border-[#334155]/60 shadow-[0_2px_10px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all duration-300">
      <span className="text-[10px] font-black tracking-widest text-[#94A3B8] uppercase">Pro Mode</span>
      <button
        type="button"
        onClick={() => onToggle(!isPro)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isPro ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]' : 'bg-white/10'}`}
      >
        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPro ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  );
};
