import React from 'react';

const Card = ({ 
  children, 
  className = "", 
  onClick 
}: { 
  children: React.ReactNode, 
  className?: string,
  onClick?: () => void 
}) => (
  <div 
    onClick={onClick} 
    className={`bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden ${className}`}
  >
    {children}
  </div>
);

const Button = ({ 
  children, 
  variant = 'primary', 
  className = "", 
  onClick 
}: { 
  children: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger',
  className?: string,
  onClick?: () => void
}) => {
  const baseStyles = "px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-white text-black hover:bg-zinc-200",
    secondary: "bg-zinc-800 text-white hover:bg-zinc-700",
    ghost: "bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900",
    danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20"
  };

  return (
    <button onClick={onClick} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-medium text-zinc-500 ml-1 uppercase tracking-wider">{label}</label>}
    <input 
      className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all" 
      {...props} 
    />
  </div>
);

const Badge = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${className}`}>
    {children}
  </span>
);

export { Card, Button, Input, Badge };
