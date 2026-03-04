import { useState, useMemo } from 'react';
import { Copy, Sparkles, Wand2, FileText, Video, ImageIcon, Share2 } from 'lucide-react';
import { Persona, PlannedPost } from '../types';
import { generatePersonaContent } from '../utils/personaEngine';

interface CreateViewProps {
  persona: Persona;
}

export default function CreateView({ persona }: CreateViewProps) {
  const [activePlannerItem] = useState<PlannedPost>({
    day: 1,
    type: 'Hero Content',
    hook: 'The truth about the top 1%.',
    angle: 'Luxury / Exclusivity',
    cta: 'Join the circle'
  });

  const [refreshKey, setRefreshKey] = useState(0);

  const content = useMemo(() => {
    return {
      shortCaption: generatePersonaContent(persona, activePlannerItem, persona.platform, 'Short Caption'),
      videoScript: generatePersonaContent(persona, activePlannerItem, persona.platform, 'Video Script'),
      imagePrompt: generatePersonaContent(persona, activePlannerItem, persona.platform, 'Image Prompt'),
    };
  }, [persona, activePlannerItem, refreshKey]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6">
      <header className="mb-8 pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Studio</h1>
        <div className="flex items-center gap-4 mt-1">
          {persona.referenceImage && (
            <img 
              src={persona.referenceImage} 
              alt={persona.name} 
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/20"
            />
          )}
          <p className="text-gray-400 text-sm">Refining voice for {persona.name}</p>
        </div>
      </header>

      <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-5 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Sparkles className="text-white" size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm">Drafting from Planner</h4>
            <p className="text-xs text-indigo-400">{activePlannerItem.hook}</p>
          </div>
        </div>
        <button 
          onClick={() => setRefreshKey(prev => prev + 1)}
          className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
        >
          Regenerate
        </button>
      </div>

      <div className="space-y-6">
        {/* Caption Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
                <FileText size={16} className="text-gray-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Captions</h3>
             </div>
             <button className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
               <Wand2 size={12} />
               Variations
             </button>
          </div>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-4 relative group">
             <button 
                onClick={() => copyToClipboard(content.shortCaption)}
                className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"
             >
                <Copy size={16} />
             </button>
             <p className="text-sm text-gray-300 leading-relaxed pr-8 whitespace-pre-wrap">
               {content.shortCaption}
             </p>
          </div>
        </div>

        {/* Video Script Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
                <Video size={16} className="text-gray-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Video Script</h3>
             </div>
             <button className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
               <Share2 size={12} />
               Export
             </button>
          </div>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-4 space-y-3 relative">
             <button 
                onClick={() => copyToClipboard(content.videoScript)}
                className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"
             >
                <Copy size={16} />
             </button>
             <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
               {content.videoScript}
             </p>
          </div>
        </div>

        {/* Visual Prompt Section */}
        <div className="space-y-3">
           <div className="flex items-center gap-2">
              <ImageIcon size={16} className="text-gray-400" />
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Image Prompt</h3>
           </div>
           <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-4 flex gap-4 items-start">
             <p className="text-sm text-gray-300 leading-relaxed italic flex-1">
               {content.imagePrompt}
             </p>
             <button 
                onClick={() => copyToClipboard(content.imagePrompt)}
                className="bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-colors shrink-0"
             >
                <Copy size={16} />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
