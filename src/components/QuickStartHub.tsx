import React from 'react';
import { Sparkles, Camera, Video, Mic, UserCheck, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export interface QuickTemplate {
  id: string;
  title: string;
  category: 'Fashion & Style' | 'Talking Avatar' | 'Voiceover' | 'Studio Swap';
  mode: 'image' | 'video' | 'talking-avatar' | 'voice';
  icon: any;
  gradient: string;
  prompt: string;
  modelId: string;
  aspectRatio: string;
  tag: string;
  previewBg: string;
}

const TEMPLATES: QuickTemplate[] = [
  {
    id: 'tpl-fashion-photo',
    title: 'Fashion Influencer Editorial',
    category: 'Fashion & Style',
    mode: 'image',
    icon: Camera,
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30',
    prompt: 'Hyper-realistic fashion editorial photoshoot, wearing minimalist luxury tailored blazer, golden hour studio lighting, 8k resolution, photorealistic depth of field',
    modelId: 'google:imagen-4-ultra',
    aspectRatio: '9:16',
    tag: 'Popular',
    previewBg: '/persona_showcase_1.png',
  },
  {
    id: 'tpl-tiktok-talking',
    title: 'Viral TikTok Talking Head',
    category: 'Talking Avatar',
    mode: 'talking-avatar',
    icon: Video,
    gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent border-cyan-500/30',
    prompt: 'Energetic lifestyle content creator speaking dynamically to the camera, high quality lip-sync, subtle head nods, vibrant ring light studio setup',
    modelId: 'wavespeed-ai/multitalk',
    aspectRatio: '9:16',
    tag: 'Trending',
    previewBg: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'tpl-brand-voiceover',
    title: 'SaaS Product Voice Cloning',
    category: 'Voiceover',
    mode: 'voice',
    icon: Mic,
    gradient: 'from-purple-500/20 via-fuchsia-500/10 to-transparent border-purple-500/30',
    prompt: 'Professional, warm, articulate commercial voice narration with soothing studio acoustic acoustics',
    modelId: 'omni-voice-v2',
    aspectRatio: '16:9',
    tag: 'Fast',
    previewBg: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'tpl-face-swap-pro',
    title: 'Studio Portrait Face Swap',
    category: 'Studio Swap',
    mode: 'image',
    icon: UserCheck,
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30',
    prompt: 'Seamless 8K portrait swap preserving natural skin texture, soft key lighting, neutral studio background',
    modelId: 'flux-1.1-pro',
    aspectRatio: '1:1',
    tag: 'Pro',
    previewBg: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop',
  },
];

interface QuickStartHubProps {
  onSelectTemplate: (template: QuickTemplate) => void;
}

export const QuickStartHub: React.FC<QuickStartHubProps> = ({ onSelectTemplate }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
            Quick-Start Starter Kits
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400">
            1-Click Workflows
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TEMPLATES.map((tpl, idx) => {
          const Icon = tpl.icon;
          return (
            <motion.button
              key={tpl.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
              onClick={() => onSelectTemplate(tpl)}
              className="group relative aspect-square text-left overflow-hidden rounded-2xl border border-white/10 hover:border-[#E7C477] p-4 bg-[#161618] transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl shadow-xl flex flex-col justify-between cursor-pointer"
            >
              {/* Bright, Crisp, Clear Background Preview */}
              <img 
                src={tpl.previewBg} 
                alt={tpl.title}
                className="absolute inset-0 w-full h-full object-cover brightness-110 contrast-105 opacity-100 transition-transform duration-700 group-hover:scale-105"
              />

              {/* Light Bottom-Only Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent group-hover:from-black/90 transition-colors" />

              {/* Top Row: Icon + Tag */}
              <div className="relative z-10 flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-[#F2D58D] shadow-md">
                  <Icon className="w-4 h-4 text-[#F2D58D]" />
                </div>
                <span className="text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#E7C477] text-[#161618] shadow-md font-sans">
                  {tpl.tag}
                </span>
              </div>

              {/* Bottom Row: Info Capsule */}
              <div className="relative z-10 space-y-1 bg-black/50 backdrop-blur-md p-3 rounded-xl border border-white/15">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#F2D58D] block font-sans">
                  {tpl.category}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#F2D58D] transition-colors flex items-center justify-between leading-tight drop-shadow-md">
                  {tpl.title}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-[#E7C477] shrink-0" />
                </h4>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickStartHub;
