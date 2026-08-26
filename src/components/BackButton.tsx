import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

interface BackButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

export default function BackButton({ onClick, className, label = "Back" }: BackButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300",
        "bg-[var(--bg-elevated)] backdrop-blur-md border border-[var(--border-default)] hover:border-[var(--gold-border-active)]",
        "text-[var(--text-secondary)] hover:text-[var(--gold-bright)] group",
        className
      )}
    >
      <div className="w-6 h-6 rounded-lg border border-[var(--gold-border-active)] bg-[var(--gold-bg-subtle)] flex items-center justify-center group-hover:bg-[var(--gold-bg-hover)] transition-colors">
        <ChevronLeft size={16} className="text-[var(--gold-primary)] group-hover:text-[var(--gold-bright)] transition-colors" />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
    </motion.button>
  );
}
