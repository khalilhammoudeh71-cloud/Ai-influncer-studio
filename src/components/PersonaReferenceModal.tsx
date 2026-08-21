import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, Sparkles, Check, Trash2, Camera, Crown, 
  Image as ImageIcon, Plus, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { Persona } from '../types';
import { api } from '../services/apiService';
import toast from 'react-hot-toast';

interface PersonaReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona: Persona;
  onPersonaUpdated?: (updated: Persona) => void;
}

export default function PersonaReferenceModal({
  isOpen,
  onClose,
  persona,
  onPersonaUpdated
}: PersonaReferenceModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPrimary, setCurrentPrimary] = useState<string>(
    persona.referenceImage || persona.avatar || ''
  );
  const [allImages, setAllImages] = useState<string[]>([]);

  React.useEffect(() => {
    const primary = persona.referenceImage || persona.avatar || '';
    setCurrentPrimary(primary);
    const rawAdditionalRefs = Array.isArray(persona.additionalReferenceImages) ? persona.additionalReferenceImages : [];
    const collected = Array.from(
      new Set([
        primary,
        ...rawAdditionalRefs,
        persona.alternateReferenceImage,
        persona.avatar,
      ].filter(Boolean) as string[])
    );
    setAllImages(collected);
  }, [persona.id, persona.referenceImage, persona.avatar, persona.additionalReferenceImages]);

  if (!isOpen) return null;

  const handleSetPrimary = async (targetUrl: string) => {
    setCurrentPrimary(targetUrl);

    try {
      const newAdditional = allImages.filter(url => url !== targetUrl);

      const updated: Persona = {
        ...persona,
        referenceImage: targetUrl,
        avatar: targetUrl,
        additionalReferenceImages: newAdditional
      };

      try {
        await api.personas.update(updated);
        await api.updatePersonaInVault(updated);
      } catch (err) {
        console.warn('Backend update warning:', err);
      }

      onPersonaUpdated?.(updated);
      window.dispatchEvent(new CustomEvent('persona-updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('personas-refresh'));

      toast.success(`👑 Set as primary reference for ${persona.name}!`, { id: 'primary-ref-toast' });
    } catch (err: any) {
      toast.error('Failed to update primary reference: ' + (err?.message || 'Error'));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${files.length} reference image(s)...`);

    try {
      const newBase64s: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        newBase64s.push(base64);
      }

      const updatedAdditional = Array.from(new Set([...(persona.additionalReferenceImages || []), ...newBase64s]));
      const newPrimary = currentPrimary || newBase64s[0];

      const newAll = Array.from(new Set([newPrimary, ...allImages, ...newBase64s]));
      setAllImages(newAll);

      const updated: Persona = {
        ...persona,
        referenceImage: newPrimary,
        avatar: persona.avatar || newPrimary,
        additionalReferenceImages: updatedAdditional.filter(u => u !== newPrimary)
      };

      try {
        await api.personas.update(updated);
        await api.updatePersonaInVault(updated);
      } catch (err) {
        console.warn('Backend update warning:', err);
      }

      onPersonaUpdated?.(updated);
      window.dispatchEvent(new CustomEvent('persona-updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('personas-refresh'));

      toast.success(`✨ Added ${newBase64s.length} new reference image(s)!`, { id: toastId });
    } catch (err: any) {
      toast.error('Failed to upload image: ' + (err?.message || 'Error'), { id: toastId });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteReference = async (targetUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (allImages.length <= 1) {
      toast.error('You must keep at least one reference photo for this persona.');
      return;
    }

    try {
      const remaining = allImages.filter(url => url !== targetUrl);
      const newPrimary = currentPrimary === targetUrl ? remaining[0] : currentPrimary;
      setCurrentPrimary(newPrimary);
      setAllImages(remaining);

      const updated: Persona = {
        ...persona,
        referenceImage: newPrimary,
        avatar: (persona.avatar === targetUrl ? newPrimary : persona.avatar) || newPrimary,
        additionalReferenceImages: remaining.filter(u => u !== newPrimary)
      };

      try {
        await api.personas.update(updated);
        await api.updatePersonaInVault(updated);
      } catch (err) {
        console.warn('Backend update warning:', err);
      }

      onPersonaUpdated?.(updated);
      window.dispatchEvent(new CustomEvent('persona-updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('personas-refresh'));

      toast.success('Removed reference image');
    } catch (err: any) {
      toast.error('Failed to delete image');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl bg-[#0F141E] border border-[#E7C477]/30 shadow-2xl shadow-black overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-[#141B28] to-[#0D121B]">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl overflow-hidden ring-2 ring-[#E7C477]/40 shadow-md">
                <img 
                  src={currentPrimary} 
                  alt={persona.name} 
                  className="w-full h-full object-cover transition-all duration-300" 
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-wide">
                    {persona.name}’s Reference Photos
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E7C477]/15 text-[#F2D58D] border border-[#E7C477]/30 font-bold">
                    {allImages.length} {allImages.length === 1 ? 'Photo' : 'Photos'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Select any photo below to lock as the primary face reference for AI generation.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#B99655] to-[#F2D58D] hover:opacity-95 text-[#060A13] font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus size={14} />
                <span>Upload New</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body Gallery */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {allImages.map((imgUrl, index) => {
                const isPrimary = currentPrimary === imgUrl || (!currentPrimary && index === 0);

                return (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleSetPrimary(imgUrl)}
                    className={`group relative rounded-2xl overflow-hidden border cursor-pointer flex flex-col transition-all aspect-[3/4] ${
                      isPrimary 
                        ? 'border-[#F2D58D] shadow-xl shadow-amber-950/60 ring-2 ring-[#F2D58D]' 
                        : 'border-white/10 hover:border-[#E7C477]/50 bg-[#141822]'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`Reference ${index + 1}`}
                      className="w-full h-full object-cover object-top"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                    {/* Top Badges */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-10">
                      {isPrimary ? (
                        <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-[#B99655] to-[#F2D58D] text-[#060A13] text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-lg">
                          <Crown size={10} strokeWidth={3} /> Primary
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-zinc-300 text-[9px] font-semibold border border-white/10">
                          Source #{index + 1}
                        </span>
                      )}

                      {allImages.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteReference(imgUrl, e)}
                          className="p-1 rounded-md bg-black/60 hover:bg-rose-500/80 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Delete reference photo"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="absolute bottom-2 left-2 right-2 z-10">
                      <button
                        type="button"
                        className={`w-full py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                          isPrimary
                            ? 'bg-[#E7C477]/20 text-[#F2D58D] border border-[#E7C477]/50'
                            : 'bg-black/80 hover:bg-[#F2D58D] hover:text-[#060A13] text-white border border-white/20'
                        }`}
                      >
                        {isPrimary ? (
                          <>
                            <Check size={12} strokeWidth={3} />
                            <span>Active Primary</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={11} className="text-[#E7C477]" />
                            <span>Set as Primary</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              {/* Upload New Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-white/15 hover:border-[#E7C477]/60 bg-white/[0.02] hover:bg-[#E7C477]/5 transition-all flex flex-col items-center justify-center gap-2.5 p-4 cursor-pointer aspect-[3/4] text-center group"
              >
                <div className="w-11 h-11 rounded-2xl bg-white/[0.05] group-hover:bg-[#E7C477]/20 border border-white/10 group-hover:border-[#E7C477]/40 flex items-center justify-center text-zinc-400 group-hover:text-[#F2D58D] transition-colors">
                  <Camera size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-200 group-hover:text-[#F2D58D] transition-colors block">
                    Upload Photo
                  </span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                    From your device
                  </span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-white/10 bg-[#0B0F17] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Identity Lock Engine preserves facial features across all generations</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
