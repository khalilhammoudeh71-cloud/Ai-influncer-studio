import React from 'react';

const Card = ({ 
  children, 
  className = "", 
  onClick,
  hover = false
}: { 
  children: React.ReactNode, 
  className?: string,
  onClick?: () => void,
  hover?: boolean
}) => (
  <div 
    onClick={onClick} 
    className={`bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden ${
      hover ? 'hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] transition-all duration-200 cursor-pointer' : ''
    } ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </div>
);

const Button = ({ 
  children, 
  variant = 'primary', 
  className = "", 
  onClick,
  disabled = false
}: { 
  children: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent',
  className?: string,
  onClick?: () => void,
  disabled?: boolean
}) => {
  const baseStyles = "px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-white text-[#09090b] hover:bg-[#e4e4e7] shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]",
    secondary: "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-overlay)] hover:border-[var(--border-strong)]",
    ghost: "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]",
    danger: "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20",
    accent: "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 shadow-[0_2px_12px_rgba(139,92,246,0.3)]"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-[var(--text-tertiary)] ml-1 uppercase tracking-wider">{label}</label>}
    <input 
      className="bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all duration-200" 
      {...props} 
    />
  </div>
);

const Badge = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${className}`}>
    {children}
  </span>
);

export { Card, Button, Input, Badge };
