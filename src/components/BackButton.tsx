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
        "bg-[#111827]/50 backdrop-blur-md border border-[#334155] hover:border-[#00D4FF]/40",
        "text-[#CBD5E1] hover:text-white group",
        className
      )}
    >
      <div className="w-6 h-6 rounded-lg bg-[#00D4FF]/10 flex items-center justify-center group-hover:bg-[#00D4FF]/20 transition-colors">
        <ChevronLeft size={16} className="text-[#00D4FF] group-hover:text-[#00F5C2] transition-colors" />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
    </motion.button>
  );
}
