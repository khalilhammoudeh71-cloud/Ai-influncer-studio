import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftRight, 
  Upload, 
  X, 
  Loader2, 
  Sparkles, 
  Check, 
  Download, 
  FolderPlus, 
  UserCheck, 
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Persona } from '../types';
import { faceSwap } from '../services/imageService';
import { api } from '../services/apiService';
import toast from 'react-hot-toast';

interface BatchFaceSwapStudioProps {
  personas: Persona[];
  activePersona: Persona;
  onClose: () => void;
}

interface TargetItem {
  id: string;
  originalDataUrl: string;
  swappedDataUrl?: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

export default function BatchFaceSwapStudio({ personas, activePersona, onClose }: BatchFaceSwapStudioProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(activePersona.id || personas[0]?.id || 'empty');
  const [customFaceImage, setCustomFaceImage] = useState<string | null>(null);
  const [targetItems, setTargetItems] = useState<TargetItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [faceEnhance, setFaceEnhance] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);

  const currentPersona = personas.find(p => p.id === selectedPersonaId) || activePersona;
  const faceSource = customFaceImage || currentPersona.avatar || currentPersona.referenceImage;

  // Upload target photosets
  const handleTargetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setTargetItems(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            originalDataUrl: reader.result as string,
            status: 'pending'
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload custom reference face
  const handleCustomFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCustomFaceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (faceInputRef.current) faceInputRef.current.value = '';
  };

  const removeItem = (id: string) => {
    setTargetItems(prev => prev.filter(item => item.id !== id));
  };

  // Process all targets in batch
  const processBatch = async () => {
    if (!faceSource) {
      toast.error('Please select a persona or upload a reference face image.');
      return;
    }
    if (!targetItems.length) {
      toast.error('Please upload at least one target photo to swap.');
      return;
    }

    setIsProcessing(true);
    let successCount = 0;

    for (let i = 0; i < targetItems.length; i++) {
      setCurrentIndex(i);
      const target = targetItems[i];

      // Mark status as processing
      setTargetItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'processing' } : item));

      try {
        const result = await faceSwap(target.originalDataUrl, faceSource, faceEnhance);
        
        // Update item with result
        setTargetItems(prev => prev.map((item, idx) => 
          idx === i ? { ...item, swappedDataUrl: result.imageUrl, status: 'done' } : item
        ));

        // Auto-save to visual library
        if (currentPersona && currentPersona.id !== 'empty') {
          await api.images.create(currentPersona.id, {
            id: 'batch-swap-' + Math.random().toString(36).substring(2, 9),
            url: result.imageUrl,
            prompt: `Batch Face Swap (${currentPersona.name})`,
            timestamp: Date.now(),
            model: 'Batch Adult Face Swap',
            mediaType: 'image'
          });
        }

        successCount++;
      } catch (err: any) {
        console.error(`[Batch Face Swap] Error processing item ${i + 1}:`, err);
        setTargetItems(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'error', error: err.message || 'Face swap failed' } : item
        ));
      }
    }

    setIsProcessing(false);
    toast.success(`Batch Face Swap finished! (${successCount}/${targetItems.length} photos completed)`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col justify-between overflow-hidden text-white font-sans">
      
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
              Batch Adult Face-Swap Studio <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Swap Persona Face onto Photosets & Adult Poses in Bulk</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        
        {/* Step 1 & Step 2 Control Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Reference Face Card */}
          <div className="bg-[#0b0c10] border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl">
            <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest block border-b border-white/5 pb-2">
              1. Select Persona Reference Face
            </span>

            {/* Persona Switcher Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Persona Profile</label>
              <select
                value={selectedPersonaId}
                onChange={(e) => {
                  setSelectedPersonaId(e.target.value);
                  setCustomFaceImage(null);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500/30 font-bold cursor-pointer"
              >
                {personas.map(p => (
                  <option key={p.id} value={p.id} className="bg-zinc-900 text-white">
                    {p.name || 'Unnamed Persona'} ({p.niche || 'General'})
                  </option>
                ))}
              </select>
            </div>

            {/* Face Preview & Upload Custom */}
            <div className="flex items-center gap-3 pt-1">
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-white/5 relative">
                {faceSource ? (
                  <img src={faceSource} alt="Reference Face" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <UserCheck className="w-6 h-6" />
                  </div>
                )}
              </div>
              
              <div className="space-y-1 min-w-0 flex-1">
                <input
                  type="file"
                  ref={faceInputRef}
                  accept="image/*"
                  onChange={handleCustomFaceUpload}
                  className="hidden"
                />
                <button
                  onClick={() => faceInputRef.current?.click()}
                  className="w-full py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-wider text-zinc-300 transition-all flex items-center justify-center gap-1"
                >
                  <Upload className="w-3 h-3 text-pink-400" />
                  {customFaceImage ? 'Change Face' : 'Upload Custom Face'}
                </button>
                <span className="text-[8px] text-zinc-500 block font-bold">100% Facial Identity Lock applied</span>
              </div>
            </div>
          </div>

          {/* Options & Processing Settings */}
          <div className="bg-[#0b0c10] border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl">
            <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest block border-b border-white/5 pb-2">
              2. Face Swap Options
            </span>

            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={faceEnhance}
                  onChange={(e) => setFaceEnhance(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 text-pink-500 focus:ring-0 bg-white/5 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Face Detail Restoration & Enhancement</span>
                  <span className="text-[9px] text-zinc-500 font-bold block">Sharpens face details & aligns skin tones natively.</span>
                </div>
              </label>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">Auto-Save Vault</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-relaxed block">
                  All swapped images will automatically be saved into {currentPersona?.name || 'Persona'}'s private visual library.
                </span>
              </div>
            </div>
          </div>

          {/* Action Trigger Card */}
          <div className="bg-[#0b0c10] border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
            <div>
              <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest block border-b border-white/5 pb-2">
                3. Execute Batch
              </span>
              <p className="text-[10px] text-zinc-400 font-medium leading-relaxed mt-2">
                Loaded <span className="text-white font-bold">{targetItems.length} photosets</span> to face-swap with <span className="text-pink-400 font-bold">{currentPersona?.name || 'Persona'}</span>.
              </p>
            </div>

            <div className="space-y-2 pt-4">
              <button
                onClick={processBatch}
                disabled={isProcessing || !targetItems.length || !faceSource}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 font-black text-xs uppercase tracking-wider text-white shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Swapping {currentIndex + 1} / {targetItems.length}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>Run Batch Face-Swap ({targetItems.length} Photos)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Upload Target Photosets Box */}
        <div className="bg-[#0b0c10] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-pink-400" /> Target Photosets & Adult Poses ({targetItems.length})
              </h3>
              <p className="text-[10px] text-zinc-400 font-medium">Upload up to 20 target photos, lingerie sets, or poses to swap simultaneously.</p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              onChange={handleTargetUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 text-pink-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Upload className="w-4 h-4" />
              Add Target Photos
            </button>
          </div>

          {/* Target Grid */}
          {!targetItems.length ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="h-44 border-2 border-dashed border-white/10 hover:border-pink-500/30 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer transition-all"
            >
              <ImageIcon className="w-8 h-8 text-zinc-600 mb-2 animate-pulse" />
              <span className="text-xs font-black text-zinc-300 uppercase tracking-widest">No Target Photos Uploaded</span>
              <p className="text-[10px] text-zinc-500 mt-1">Click or drag & drop target adult photosets / poses here to begin batch face-swapping.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {targetItems.map((item, idx) => (
                <div key={item.id} className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden group shadow-lg">
                  <div className="aspect-[3/4] relative">
                    <img 
                      src={item.swappedDataUrl || item.originalDataUrl} 
                      alt={`Target ${idx + 1}`} 
                      className="w-full h-full object-cover"
                    />

                    {/* Status Badge */}
                    <div className="absolute top-2 left-2 z-10">
                      {item.status === 'pending' && (
                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-md">
                          Pending
                        </span>
                      )}
                      {item.status === 'processing' && (
                        <span className="text-[8px] font-black uppercase tracking-wider text-pink-400 bg-pink-500/20 backdrop-blur-md border border-pink-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Swapping
                        </span>
                      )}
                      {item.status === 'done' && (
                        <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Swapped
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-[8px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/20 backdrop-blur-md border border-rose-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" /> Error
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={isProcessing}
                      className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/60 hover:bg-rose-500 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Item Footer */}
                  <div className="p-2.5 bg-black/40 flex items-center justify-between text-[9px]">
                    <span className="font-mono text-zinc-400 font-bold">Photo #{idx + 1}</span>
                    {item.swappedDataUrl && (
                      <a
                        href={item.swappedDataUrl}
                        download={`swapped_persona_photo_${idx + 1}.png`}
                        className="text-pink-400 hover:text-white font-extrabold uppercase flex items-center gap-0.5"
                      >
                        <Download className="w-3 h-3" /> Save
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
