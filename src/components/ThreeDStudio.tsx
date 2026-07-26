import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Sparkles,
  Upload,
  Loader2,
  Download,
  Check,
  Cpu,
  Layers,
  FileText,
  RotateCw,
  RefreshCw,
  Zap,
  Image as ImageIcon,
  AlertCircle,
  Copy,
  ChevronDown
} from 'lucide-react';
import { Persona, GeneratedImage } from '../types';
import { generate3DModel, fetch3DModels, type ModelInfo } from '../services/imageService';
import { processImageFile } from '../utils/imageProcessing';
import toast from 'react-hot-toast';

interface ThreeDStudioProps {
  persona: Persona;
  personas?: Persona[];
  onSelectPersona?: (id: string) => void;
  onClose?: () => void;
}

export default function ThreeDStudio({ persona, personas, onSelectPersona, onClose }: ThreeDStudioProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [sourceImage, setSourceImage] = useState<string | null>(persona?.avatar || null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ modelUrl: string; model: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch3DModels().then(m => {
      setModels(m);
      if (m.length > 0) setSelectedModel(m[0].id);
    }).catch(err => {
      console.error('[3D Studio] Failed to load 3D models:', err);
    });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await processImageFile(file);
      setSourceImage(b64);
      setActiveTab('image');
    } catch {
      toast.error('Failed to process image');
    }
  };

  const handleGenerate = async () => {
    if (activeTab === 'text' && !prompt.trim()) {
      toast.error('Please enter a 3D prompt description');
      return;
    }
    if (activeTab === 'image' && !sourceImage) {
      toast.error('Please select or upload a reference image');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    const t = toast.loading('Generating 3D asset mesh (this may take 1-2 minutes)...');

    try {
      const res = await generate3DModel(
        activeTab === 'text' ? prompt : (prompt || '3D character model reconstruction'),
        selectedModel,
        activeTab === 'image' ? (sourceImage || undefined) : undefined
      );

      setResult(res);
      toast.success('3D Mesh generated successfully!', { id: t });
    } catch (err: any) {
      console.error('[3D Studio] Error:', err);
      const errMsg = err.message || '3D generation failed';
      setError(errMsg);
      toast.error(errMsg, { id: t });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!result?.modelUrl) return;
    const media: GeneratedImage = {
      id: `3d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: result.modelUrl,
      prompt: prompt || '3D Asset Mesh',
      timestamp: Date.now(),
      model: result.model,
      mediaType: '3d',
    };

    try {
      await fetch(`/api/personas/${persona.id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(media),
      });
      setSaved(true);
      toast.success('3D Asset saved to Visual Library!');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error('Failed to save to library');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#08080c] text-white p-4 md:p-6 overflow-y-auto">
      {/* ── HEADER BAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-500 to-violet-600 rounded-xl shadow-lg shadow-cyan-500/20">
              <Box className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                3D Asset <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-400">Generator Studio</span>
              </h1>
              <p className="text-xs text-[var(--text-tertiary)] font-medium">
                Create game-ready 3D GLB models & digital assets from text prompts or photos.
              </p>
            </div>
          </div>
        </div>

        {/* ── MODE TABS ── */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'text'
                ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Text to 3D
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'image'
                ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Image to 3D
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 flex-1">
        {/* ── CONTROLS SIDEBAR ── */}
        <div className="lg:col-span-5 space-y-5 bg-white/[0.02] border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col justify-between">
          <div className="space-y-5">
            {/* Model Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5" /> Select 3D AI Model
              </label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full bg-[#0e0e15] border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:border-cyan-500 outline-none transition-all"
              >
                {models.map(m => (
                  <option key={m.id} value={m.id} className="bg-[#0e0e15] text-white">
                    {m.name} ({m.provider}) — ${m.price.toFixed(3)}
                  </option>
                ))}
              </select>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center justify-between">
                <span>3D Asset Description</span>
                <span className="text-[10px] text-gray-500 font-normal">Detailed prompt</span>
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe your 3D asset (e.g. A futuristic cybernetic helmet with neon visor, PBR textures, game ready 3D mesh)..."
                rows={4}
                className="w-full bg-[#0e0e15] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:border-cyan-500 outline-none resize-none transition-all"
              />
            </div>

            {/* Image Reference Upload (Image-to-3D) */}
            {activeTab === 'image' && (
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Reference Photo
                </label>
                <div className="flex items-center gap-3">
                  {sourceImage ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-cyan-500/50 group">
                      <img src={sourceImage} alt="Ref" className="w-full h-full object-cover" />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold transition-opacity"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 border-2 border-dashed border-white/10 hover:border-cyan-500/50 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white transition-all bg-white/[0.01]"
                    >
                      <Upload className="w-5 h-5 text-cyan-400" />
                      <span>Upload image to convert to 3D</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* GENERATE BUTTON */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 rounded-xl font-black text-sm tracking-wider uppercase bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-violet-600 hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Generating 3D Mesh...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> Generate 3D Asset
              </>
            )}
          </button>
        </div>

        {/* ── PREVIEW & CANVAS DISPLAY ── */}
        <div className="lg:col-span-7 bg-[#0b0b10] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden">
          {/* Subtle grid background pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05),transparent_70%)] pointer-events-none" />

          {isGenerating ? (
            <div className="flex flex-col items-center justify-center gap-4 z-10 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center animate-bounce">
                  <Box className="w-8 h-8 text-cyan-400" />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-cyan-500/20 blur-xl -z-10" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Synthesizing 3D Mesh</h3>
                <p className="text-xs text-gray-400 max-w-xs mt-1">
                  Reconstructing geometry, UV mapping textures, and building GLB asset file...
                </p>
              </div>
            </div>
          ) : result ? (
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 z-10">
              <div className="w-full flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold">
                  <Check className="w-4 h-4" /> 3D Mesh Ready
                </div>
                <span className="text-[10px] bg-white/10 px-2.5 py-1 rounded-full text-gray-300 font-mono">
                  {result.model}
                </span>
              </div>

              {/* 3D Asset Display Canvas / Video Preview */}
              <div className="w-full flex-1 min-h-[300px] bg-black/40 rounded-xl border border-white/5 flex flex-col items-center justify-center p-4 relative">
                {result.modelUrl.endsWith('.glb') || result.modelUrl.endsWith('.gltf') ? (
                  <div className="flex flex-col items-center justify-center text-center gap-3">
                    <Box className="w-16 h-16 text-cyan-400 animate-pulse" />
                    <p className="text-xs text-gray-300 font-mono max-w-sm truncate">{result.modelUrl}</p>
                    <a
                      href={result.modelUrl}
                      download="3d_asset.glb"
                      className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                    >
                      <Download className="w-4 h-4" /> Download GLB File
                    </a>
                  </div>
                ) : (
                  <img
                    src={result.modelUrl}
                    alt="3D Mesh Result"
                    className="max-h-[320px] object-contain rounded-lg shadow-2xl"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={handleSaveToLibrary}
                  disabled={saved}
                  className="flex-1 py-3 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Check className="w-4 h-4" /> {saved ? 'Saved to Library!' : 'Save to Persona Library'}
                </button>
                <a
                  href={result.modelUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" /> Export Asset
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-center text-gray-500 z-10">
              <Box className="w-12 h-12 text-gray-600" />
              <p className="text-xs font-medium max-w-xs">
                Your 3D mesh asset will be generated and rendered here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
