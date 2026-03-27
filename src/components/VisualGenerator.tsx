import React, { useState } from 'react';
import {
  Camera,
  Sparkles,
  Image as ImageIcon,
  X,
  Download,
  RefreshCw,
  Layout,
  Shirt,
  MapPin,
  Smile,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  CreditCard
} from 'lucide-react';
import { Persona, GeneratedImage } from '../types';
import { generateDualImage, type DualImageResult, type SingleImageResult } from '../services/imageService';

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

interface ImagePanelProps {
  label: string;
  sublabel: string;
  accentClass: string;
  result: SingleImageResult | null;
  isGenerating: boolean;
  onSave: () => void;
  onDownload: () => void;
}

const ImagePanel: React.FC<ImagePanelProps> = ({
  label, sublabel, accentClass, result, isGenerating, onSave, onDownload
}) => (
  <div className="flex flex-col gap-2">
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${accentClass} w-fit`}>
      <span className="text-xs font-bold">{label}</span>
      <span className="text-[10px] opacity-60">{sublabel}</span>
    </div>

    <div className="aspect-square rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden relative group">
      {isGenerating ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          <p className="text-xs text-zinc-500 animate-pulse">Generating...</p>
        </div>
      ) : result?.error === 'BILLING_REQUIRED' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-5">
          <CreditCard className="w-8 h-8 text-amber-400/70" />
          <div>
            <p className="text-xs font-bold text-amber-300 mb-1">Paid Plan Required</p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">Gemini image generation requires a paid Google AI Studio account.</p>
          </div>
          <a
            href="https://ai.dev/projects"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            Upgrade at ai.dev <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ) : result?.error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-4">
          <AlertCircle className="w-8 h-8 text-red-400/60" />
          <p className="text-xs text-red-400/70">{result.error}</p>
        </div>
      ) : result?.imageUrl ? (
        <>
          <img src={result.imageUrl} alt={label} className="w-full h-full object-cover" />
          <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onDownload}
              className="p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-black/80 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="w-10 h-10 text-zinc-700 opacity-30" />
        </div>
      )}
    </div>

    {result?.imageUrl && (
      <button
        onClick={onSave}
        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border ${accentClass} hover:opacity-90 flex items-center justify-center gap-1.5`}
      >
        <CheckCircle className="w-3.5 h-3.5" />
        Save This One
      </button>
    )}
  </div>
);

export const VisualGenerator: React.FC<VisualGeneratorProps> = ({ persona, onClose, onSaveImage }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState(ENVIRONMENTS[0]);
  const [selectedOutfit, setSelectedOutfit] = useState(OUTFITS[0]);
  const [selectedFraming, setSelectedFraming] = useState(FRAMING[0]);
  const [selectedMood, setSelectedMood] = useState(MOODS[0]);
  const [results, setResults] = useState<DualImageResult | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGlobalError(null);
    setResults(null);

    try {
      const data = await generateDualImage({
        persona,
        environment: selectedEnv,
        outfitStyle: selectedOutfit,
        framing: selectedFraming,
        mood: selectedMood,
        additionalInstructions: prompt,
      });
      setResults(data);
    } catch (err: any) {
      setGlobalError(err.message || 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const makeGeneratedImage = (imageUrl: string, model: string): GeneratedImage => ({
    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    url: imageUrl,
    prompt: results?.promptUsed || prompt || '',
    timestamp: Date.now(),
    environment: selectedEnv,
    outfit: selectedOutfit,
    framing: selectedFraming,
    model,
  });

  const saveGemini = () => {
    if (!results?.gemini?.imageUrl) return;
    onSaveImage(makeGeneratedImage(results.gemini.imageUrl, results.gemini.model));
    onClose();
  };

  const saveOpenAI = () => {
    if (!results?.openai?.imageUrl) return;
    onSaveImage(makeGeneratedImage(results.openai.imageUrl, results.openai.model));
    onClose();
  };

  const saveBoth = () => {
    if (results?.gemini?.imageUrl) {
      onSaveImage(makeGeneratedImage(results.gemini.imageUrl, results.gemini.model));
    }
    if (results?.openai?.imageUrl) {
      onSaveImage(makeGeneratedImage(results.openai.imageUrl, results.openai.model));
    }
    onClose();
  };

  const downloadImage = (imageUrl: string, label: string) => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `${persona.name.replace(/\s+/g, '_')}_${label}_${Date.now()}.png`;
    a.click();
  };

  const hasBothResults = results?.gemini?.imageUrl && results?.openai?.imageUrl;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl animate-in slide-in-from-bottom duration-300">
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
              <p className="text-xs text-zinc-400">Gemini Flash 3.1 &amp; DALL-E side by side</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="max-h-[82vh] overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* Dual Preview */}
            <div className="grid grid-cols-2 gap-4">
              <ImagePanel
                label="Gemini"
                sublabel="Flash 3.1"
                accentClass="border-blue-500/30 bg-blue-500/10 text-blue-400"
                result={results?.gemini ?? null}
                isGenerating={isGenerating}
                onSave={saveGemini}
                onDownload={() => results?.gemini?.imageUrl && downloadImage(results.gemini.imageUrl, 'gemini')}
              />
              <ImagePanel
                label="DALL-E"
                sublabel="gpt-image-1"
                accentClass="border-green-500/30 bg-green-500/10 text-green-400"
                result={results?.openai ?? null}
                isGenerating={isGenerating}
                onSave={saveOpenAI}
                onDownload={() => results?.openai?.imageUrl && downloadImage(results.openai.imageUrl, 'dalle')}
              />
            </div>

            {globalError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {globalError}
              </div>
            )}

            {/* Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Environment
                  </label>
                  <select
                    value={selectedEnv}
                    onChange={(e) => setSelectedEnv(e.target.value)}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {ENVIRONMENTS.map(env => <option key={env} value={env}>{env}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                    <Shirt className="w-3 h-3" /> Outfit
                  </label>
                  <select
                    value={selectedOutfit}
                    onChange={(e) => setSelectedOutfit(e.target.value)}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {OUTFITS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                    <Layout className="w-3 h-3" /> Framing
                  </label>
                  <select
                    value={selectedFraming}
                    onChange={(e) => setSelectedFraming(e.target.value)}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {FRAMING.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                    <Smile className="w-3 h-3" /> Mood
                  </label>
                  <select
                    value={selectedMood}
                    onChange={(e) => setSelectedMood(e.target.value)}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Custom prompt */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase">Additional Instructions (Optional)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Holding a coffee cup, direct eye contact, cinematic lighting..."
                className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-sm text-white min-h-[70px] focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-zinc-950 border-t border-zinc-800 flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 bg-white text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50 text-sm"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating both...</>
            ) : results ? (
              <><RefreshCw className="w-4 h-4" /> Regenerate Both</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate Both</>
            )}
          </button>

          {hasBothResults && (
            <button
              onClick={saveBoth}
              className="px-5 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-colors shadow-lg shadow-purple-500/20 whitespace-nowrap"
            >
              Save Both
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
