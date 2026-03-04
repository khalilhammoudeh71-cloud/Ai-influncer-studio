import React, { useState } from 'react';
import { 
  Camera, 
  Sparkles, 
  Image as ImageIcon, 
  X, 
  Download, 
  Heart,
  RefreshCw,
  Layout,
  Shirt,
  MapPin,
  Smile
} from 'lucide-react';
import { Persona, GeneratedImage } from '../types';

interface VisualGeneratorProps {
  persona: Persona;
  onClose: () => void;
  onSaveImage: (image: GeneratedImage) => void;
}

const ENVIRONMENTS = [
  'Luxury Hotel', 'Modern Apartment', 'Rooftop Lounge', 'Beach Resort', 
  'Yacht Deck', 'Upscale Restaurant', 'Private Gym', 'Beauty Studio', 
  'Dental Office', 'Creator Studio', 'City Street', 'Penthouse'
];

const OUTFITS = [
  'Casual Chic', 'Luxury Evening', 'Business Professional', 'Fitness Wear', 
  'Medical Scrubs', 'Edgy Streetwear', 'Glamorous Gown', 'Home Lounge'
];

const FRAMING = [
  'Portrait', 'Selfie Style', 'Full Body', 'Half Body', 'Candid', 'Cinematic'
];

const MOODS = [
  'Confident', 'Friendly', 'Thoughtful', 'Playful', 'Professional', 'Seductive'
];

export const VisualGenerator: React.FC<VisualGeneratorProps> = ({ persona, onClose, onSaveImage }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState(ENVIRONMENTS[0]);
  const [selectedOutfit, setSelectedOutfit] = useState(OUTFITS[0]);
  const [selectedFraming, setSelectedFraming] = useState(FRAMING[0]);
  const [selectedMood, setSelectedMood] = useState(MOODS[0]);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [actualPromptUsed, setActualPromptUsed] = useState<string>('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      // Use the real image generation service
      const { generateImage } = await import('../services/imageService');
      const result = await generateImage({
        persona,
        environment: selectedEnv,
        outfitStyle: selectedOutfit,
        framing: selectedFraming,
        mood: selectedMood,
        additionalInstructions: prompt
      });

      // Pre-load the image so we only show it when it's ready
      const img = new Image();
      img.src = result.imageUrl;
      img.onload = () => {
        setGeneratedPreview(result.imageUrl);
        setActualPromptUsed(result.promptUsed);
        setIsGenerating(false);
      };
      img.onerror = () => {
        setGenerationError("Failed to load the generated image from the provider.");
        setIsGenerating(false);
      };
    } catch (error: any) {
      setGenerationError(error.message || 'Unable to generate image right now.');
      setIsGenerating(false);
    }
  };

  const saveToLibrary = () => {
    if (!generatedPreview) return;
    const newImg: GeneratedImage = {
      id: `img-${Date.now()}`,
      url: generatedPreview,
      prompt: actualPromptUsed || prompt || `A ${selectedFraming} of ${persona.name} in a ${selectedEnv} wearing ${selectedOutfit}. Mood: ${selectedMood}.`,
      timestamp: Date.now(),
      environment: selectedEnv,
      outfit: selectedOutfit,
      framing: selectedFraming
    };
    onSaveImage(newImg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden">
              {persona.referenceImage ? (
                <img src={persona.referenceImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-white">Visual Studio</h3>
              <p className="text-xs text-zinc-400">Generating for {persona.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* Preview Area */}
            <div className="aspect-square sm:aspect-video rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden relative group">
              {isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                  <p className="text-sm font-medium text-purple-400 animate-pulse">Rendering via OpenAI...</p>
                </div>
              ) : generationError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 gap-3 bg-red-500/5">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                    <X className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-red-400 text-sm">Generation Failed</h4>
                  <p className="text-xs text-red-400/80 max-w-sm">{generationError}</p>
                </div>
              ) : generatedPreview ? (
                <>
                  <img src={generatedPreview} alt="Generated" className="w-full h-full object-cover transition-opacity duration-300" />
                  <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-black/80 transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                    <button className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-black/80 transition-colors">
                      <Heart className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 gap-3">
                  <ImageIcon className="w-12 h-12 opacity-20" />
                  <p className="text-sm">Configure and tap Generate to create visuals</p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> Environment
                  </label>
                  <select 
                    value={selectedEnv}
                    onChange={(e) => setSelectedEnv(e.target.value)}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {ENVIRONMENTS.map(env => <option key={env} value={env}>{env}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <Shirt className="w-3 h-3" /> Outfit & Style
                  </label>
                  <select 
                    value={selectedOutfit}
                    onChange={(e) => setSelectedOutfit(e.target.value)}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {OUTFITS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <Layout className="w-3 h-3" /> Framing
                  </label>
                  <select 
                    value={selectedFraming}
                    onChange={(e) => setSelectedFraming(e.target.value)}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {FRAMING.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <Smile className="w-3 h-3" /> Mood
                  </label>
                  <select 
                    value={selectedMood}
                    onChange={(e) => setSelectedMood(e.target.value)}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Additional Instructions (Optional)</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Holding a coffee cup, direct eye contact, cinematic lighting..."
                className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-sm text-white min-h-[80px] focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-zinc-950 border-t border-zinc-800 flex gap-3">
          {!generatedPreview ? (
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5" />
              {isGenerating ? 'Generating...' : 'Generate Visual'}
            </button>
          ) : (
            <>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 bg-zinc-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Regenerate
              </button>
              <button 
                onClick={saveToLibrary}
                className="flex-1 bg-purple-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/20"
              >
                <Download className="w-5 h-5" />
                Save to Library
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
