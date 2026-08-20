import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Users, Sparkles, PlusCircle, Wrench, MessageSquare, 
  Calendar, Cpu, Settings, ChevronDown, ChevronRight,
  Sparkle, Image, Mic, UserSquare2, ArrowUpCircle, Eraser,
  Camera, Zap, Video, ArrowLeftRight, TrendingUp, Film, Wand2,
  Shirt, Droplets, Weight, Dumbbell, PenTool, Plane, Expand, Box, Layers, BarChart3,
  Crown
} from 'lucide-react';
import { Persona, Tab } from '../types';
import { cn } from '../utils/cn';

interface LeftSidebarProps {
  activeTab: Tab;
  onNavigate: (tab: Tab, params?: any) => void;
  activePersona: Persona;
  newAssetsCount: number;
}

export default function LeftSidebar({ activeTab, onNavigate, activePersona, newAssetsCount }: LeftSidebarProps) {
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    toolbox: false
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const navItems = [
    { id: 'personas', label: 'Dashboard', icon: LayoutDashboard, tabTarget: 'personas' },
    { id: 'persona-studio', label: 'Persona Studio', icon: Users, tabTarget: 'create-persona' },
    { id: 'chat', label: 'Persona Chat', icon: MessageSquare, tabTarget: 'assistant' },
    { id: 'image-studio', label: 'Image Studio', icon: Image, tabTarget: 'create', subView: 'image' },
    { id: 'voice-studio', label: 'Voice Studio', icon: Mic, tabTarget: 'create', subView: 'voice' },
    { id: 'ai-tools', label: 'AI Tools', icon: Wrench, tabTarget: 'intelligence' },
    { id: 'planner', label: 'Content Planner', icon: Calendar, tabTarget: 'planner' },
    { id: 'agent', label: 'Super Agent', icon: Cpu, tabTarget: 'agent' },
    { id: 'trends', label: 'Analytics', icon: BarChart3, tabTarget: 'trends' },
    { id: 'settings', label: 'Settings', icon: Settings, tabTarget: 'settings' },
  ];

  const toolboxItems = [
    { id: 'virtual-tryon', label: 'Virtual Try-On', icon: Shirt },
    { id: 'beautify', label: 'Beautify Core', icon: Droplets },
    { id: 'face-swap', label: 'Face Swap', icon: ArrowLeftRight },
    { id: 'camera-angles', label: 'Camera Angles', icon: Camera },
    { id: 'inpaint', label: 'Inpaint Brush', icon: Wand2 },
    { id: 'bg-remover', label: 'Remove BG', icon: Eraser },
    { id: 'skin-enhancer', label: 'Skin Enhancer', icon: Sparkle },
    { id: 'upscaler', label: 'Image Upscaler', icon: ArrowUpCircle },
  ];

  return (
    <div className="w-56 md:w-60 lg:w-64 shrink-0 h-full border-r border-[#E7C477]/10 bg-[#141416] flex flex-col z-50 select-none">
      {/* Brand Header */}
      <div 
        onClick={() => onNavigate('personas')}
        className="p-4 border-b border-[#E7C477]/10 flex items-center gap-3.5 cursor-pointer hover:bg-white/[0.03] transition-all group"
      >
        <div className="w-11 h-11 rounded-2xl overflow-hidden border border-[#E7C477]/35 shadow-xl shadow-amber-950/20 flex-shrink-0 bg-[#080C14] p-1 flex items-center justify-center group-hover:border-[#E7C477]/60 group-hover:scale-[1.03] transition-all">
          <img 
            src="/logo.png" 
            alt="AI Influencer Studio" 
            className="w-full h-full object-contain drop-shadow-md"
          />
        </div>
        <div className="flex flex-col min-w-0">
          <h1 className="text-[13px] font-bold text-[#F8F5EE] tracking-[0.02em] truncate leading-tight font-['Cinzel',serif]">
            AI INFLUENCER
          </h1>
          <span className="text-[9px] font-['Montserrat',sans-serif] text-[#D9BA72] tracking-[0.38em] uppercase font-bold mt-0.5">
            STUDIO
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5 custom-scrollbar">
        {navItems.map((item) => {
          const isActive = (item.tabTarget === activeTab) || (item.id === 'persona-studio' && activeTab === 'create-persona') || (item.id === 'personas' && activeTab === 'personas') || (item.id === 'ai-tools' && activeTab === 'intelligence');
          const ItemIcon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.tabTarget as Tab, item.subView ? { subView: item.subView } : undefined)}
              className={cn(
                "w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs font-medium transition-all text-left group cursor-pointer",
                isActive
                  ? "bg-[#E7C477]/10 border border-[#E7C477]/30 text-[#F2D58D] shadow-sm shadow-amber-950/30 font-semibold"
                  : "text-[#C3BFB8] hover:text-[#F5F1E8] hover:bg-white/[0.03] border border-transparent"
              )}
            >
              <ItemIcon size={16} className={isActive ? "text-[#F2D58D]" : "text-[#8C909A] group-hover:text-[#F5F1E8] transition-colors"} />
              <span className="flex-1 truncate">{item.label}</span>
            </button>
          );
        })}

        {/* AI Toolbox Collapsible */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              onNavigate('intelligence');
              toggleAccordion('toolbox');
            }}
            className={cn(
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer",
              activeTab === 'intelligence'
                ? "bg-[#E7C477]/10 border border-[#E7C477]/30 text-[#F2D58D] font-semibold"
                : "text-[#8C909A] hover:text-[#F5F1E8] hover:bg-white/[0.02] border border-transparent"
            )}
          >
            <div className="flex items-center gap-3.5">
              <Wrench size={16} className={activeTab === 'intelligence' ? "text-[#F2D58D]" : "text-[#8C909A]"} />
              <span>AI Toolbox</span>
            </div>
            {openAccordions.toolbox ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          <AnimatePresence initial={false}>
            {openAccordions.toolbox && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden pl-7 space-y-1 py-1"
              >
                {toolboxItems.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => onNavigate('intelligence', { initialTool: sub.id })}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-normal text-[#8C909A] hover:text-[#F5F1E8] hover:bg-white/[0.04] transition-all text-left cursor-pointer"
                  >
                    <sub.icon size={13} className="text-[#8C909A]" />
                    <span className="truncate">{sub.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
