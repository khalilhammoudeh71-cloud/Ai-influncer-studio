import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Sparkles, PlusCircle, Wrench, MessageSquare, 
  Calendar, Cpu, Settings, ChevronDown, ChevronRight,
  Sparkle, Image, Mic, UserSquare2, ArrowUpCircle, Eraser,
  Camera, Zap, Video, ArrowLeftRight
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
    studio: true,
    toolbox: true
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-64 shrink-0 h-full border-r border-white/5 bg-[#0B0F17]/95 backdrop-blur-xl flex flex-col z-50">
      {/* Brand Header */}
      <div className="p-6 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-black tracking-widest text-white uppercase leading-none mb-0.5">Influencer</h1>
          <span className="text-[10px] font-black uppercase text-cyan-400 tracking-[0.2em] leading-none">Studio</span>
        </div>
      </div>



      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        
        {/* Dashboard at the very top (standalone) */}
        <div className="space-y-1">
          <button
            onClick={() => onNavigate('personas')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all relative border",
              activeTab === 'personas' 
                ? "text-cyan-400 bg-cyan-500/5 border-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.05)]" 
                : "text-zinc-350 hover:text-white hover:bg-white/[0.02] border-transparent"
            )}
          >
            <Users size={16} />
            <span>Dashboard</span>
            {activeTab === 'personas' && (
              <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-400" />
            )}
          </button>
        </div>

        {/* Group 1: Autonomous Agent */}
        <div className="pt-4 border-t border-white/5 space-y-1">
          <h4 className="px-3 text-[10px] font-black text-cyan-400/90 uppercase tracking-[0.15em] mb-2">Autonomous Agent</h4>
          
          <button
            onClick={() => onNavigate('agent')}
            className={cn(
              "w-full flex items-center justify-between px-3 py-3 rounded-2xl text-[13px] font-black uppercase tracking-wider transition-all relative border bg-gradient-to-r",
              activeTab === 'agent' 
                ? "from-cyan-500/10 to-violet-500/10 border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-950/20" 
                : "from-white/[0.01] to-white/[0.01] border-white/5 text-zinc-300 hover:text-white hover:bg-white/[0.03]"
            )}
          >
            <div className="flex items-center gap-3">
              <Cpu size={16} className={activeTab === 'agent' ? "text-cyan-400" : "text-zinc-400"} />
              <span>Super Agent</span>
            </div>
            {activeTab === 'agent' && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Group 2: AI Studios */}
        <div className="pt-4 border-t border-white/5 space-y-1">
          <h4 className="px-3 text-[10px] font-black text-violet-400/90 uppercase tracking-[0.15em] mb-2">AI Studios</h4>

          {/* AI Studio Accordion */}
          <div className="space-y-1">
            <div className="flex items-center justify-between group rounded-xl hover:bg-white/[0.02] transition-all">
              <button
                type="button"
                onClick={() => {
                  setOpenAccordions(prev => ({ ...prev, studio: true }));
                  onNavigate('create');
                }}
                className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-l-xl text-[13px] font-bold text-zinc-300 hover:text-white transition-all text-left"
              >
                <PlusCircle size={16} className="text-violet-400" />
                <span>AI Studio</span>
              </button>
              
              <button
                type="button"
                onClick={() => toggleAccordion('studio')}
                className="px-3 py-2.5 rounded-r-xl text-zinc-400 hover:text-white transition-all flex items-center justify-center border-l border-white/5"
              >
                {openAccordions.studio ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>

            <AnimatePresence initial={false}>
              {openAccordions.studio && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden pl-7 space-y-1 bg-white/[0.01] rounded-xl py-1"
                >
                  {[
                    { id: 'image', label: 'Image Generator', icon: Image },
                    { id: 'video', label: 'Video Generator', icon: Video },
                    { id: 'voice', label: 'Voice Clone', icon: Mic },
                    { id: 'talking-avatar', label: 'Avatar Studio', icon: UserSquare2 }
                  ].map((sub) => {
                    return (
                      <button
                        key={sub.id}
                        onClick={() => onNavigate('create', { subView: sub.id })}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-all text-left"
                      >
                        <sub.icon size={12} className="text-zinc-400" />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* AI Toolbox Accordion */}
          <div className="space-y-1">
            <div className="flex items-center justify-between group rounded-xl hover:bg-white/[0.02] transition-all">
              <button
                type="button"
                onClick={() => {
                  setOpenAccordions(prev => ({ ...prev, toolbox: true }));
                  onNavigate('intelligence');
                }}
                className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-l-xl text-[13px] font-bold text-zinc-300 hover:text-white transition-all text-left"
              >
                <Wrench size={16} className="text-cyan-400" />
                <span>AI Toolbox</span>
              </button>
              
              <button
                type="button"
                onClick={() => toggleAccordion('toolbox')}
                className="px-3 py-2.5 rounded-r-xl text-zinc-400 hover:text-white transition-all flex items-center justify-center border-l border-white/5"
              >
                {openAccordions.toolbox ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>

            <AnimatePresence initial={false}>
              {openAccordions.toolbox && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden pl-7 space-y-1 bg-white/[0.01] rounded-xl py-1"
                >
                  {[
                    { id: 'camera-angles', label: 'Camera Angles', icon: Camera },
                    { id: 'face-swap', label: 'Face Swap', icon: ArrowLeftRight },
                    { id: 'bg-remover', label: 'Remove BG', icon: Eraser },
                    { id: 'skin-enhancer', label: 'Skin Enhancer', icon: Sparkle },
                    { id: 'upscaler', label: 'Image Upscaler', icon: ArrowUpCircle }
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => onNavigate('intelligence', { initialTool: sub.id })}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-all text-left"
                    >
                      <sub.icon size={12} className="text-zinc-400" />
                      <span>{sub.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Group 3: Co-Pilot */}
        <div className="pt-4 border-t border-white/5 space-y-1">
          <h4 className="px-3 text-[10px] font-black text-violet-400/90 uppercase tracking-[0.15em] mb-2">Co-Pilot</h4>

          <button
            onClick={() => onNavigate('planner')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all relative border",
              activeTab === 'planner' ? "text-cyan-400 bg-cyan-500/5 border-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.05)]" : "text-zinc-350 hover:text-white hover:bg-white/[0.02] border-transparent"
            )}
          >
            <Calendar size={16} />
            <span>Content Planner</span>
            {activeTab === 'planner' && (
              <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-400" />
            )}
          </button>

          <button
            onClick={() => onNavigate('assistant')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all relative border",
              activeTab === 'assistant' ? "text-cyan-400 bg-cyan-500/5 border-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.05)]" : "text-zinc-350 hover:text-white hover:bg-white/[0.02] border-transparent"
            )}
          >
            <MessageSquare size={16} />
            <span>AI Assistant</span>
            {activeTab === 'assistant' && (
              <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-400" />
            )}
          </button>
        </div>

        {/* Group 4: Vault */}
        <div className="pt-4 border-t border-white/5 space-y-1">
          <h4 className="px-3 text-[10px] font-black text-violet-400/90 uppercase tracking-[0.15em] mb-2">Vault</h4>

          <button
            onClick={() => onNavigate('gallery')}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all relative border",
              activeTab === 'gallery' ? "text-cyan-400 bg-cyan-500/5 border-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.05)]" : "text-zinc-350 hover:text-white hover:bg-white/[0.02] border-transparent"
            )}
          >
            <div className="flex items-center gap-3">
              <Sparkles size={16} />
              <span>Gallery Vault</span>
            </div>
            <div className="flex items-center gap-2">
              {newAssetsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#00F5C2] text-[#0B0F17] text-[8px] font-black leading-none">
                  {newAssetsCount}
                </span>
              )}
              {activeTab === 'gallery' && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              )}
            </div>
          </button>
        </div>

        {/* Group 5: Account */}
        <div className="pt-4 border-t border-white/5 space-y-1">
          <h4 className="px-3 text-[10px] font-black text-violet-400/90 uppercase tracking-[0.15em] mb-2">Account</h4>

          <button
            onClick={() => onNavigate('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all relative border",
              activeTab === 'settings' ? "text-cyan-400 bg-cyan-500/5 border-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.05)]" : "text-zinc-350 hover:text-white hover:bg-white/[0.02] border-transparent"
            )}
          >
            <Settings size={16} />
            <span>Settings</span>
            {activeTab === 'settings' && (
              <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-400" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
