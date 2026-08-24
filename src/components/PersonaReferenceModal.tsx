import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, Check, Trash2, Camera, Crown,
  ImageOff, Plus, ShieldCheck
} from 'lucide-react';
import { Persona } from '../types';
import { api } from '../services/apiService';
import { persistPersonaReferenceImages } from '../services/personaMediaService';
import { isTemporaryBrowserMedia, isWorkspaceMediaReference } from '../services/workspaceMediaService';
import toast from 'react-hot-toast';

interface PersonaReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona: Persona;
  onPersonaUpdated?: (updated: Persona) => void;
}

function collectPersonaReferences(persona: Persona): string[] {
  const primary = persona.referenceImage || persona.avatar || '';
  const additional = Array.isArray(persona.additionalReferenceImages) ? persona.additionalReferenceImages : [];
  return Array.from(new Set([
    primary,
    ...additional,
    persona.alternateReferenceImage,
    persona.avatar,
  ].filter(Boolean) as string[]));
}

function readFilesAsDataUrls(files: FileList | File[]): Promise<string[]> {
  return Promise.all(Array.from(files).map(file => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  })));
}

export default function PersonaReferenceModal({
  isOpen,
  onClose,
  persona,
  onPersonaUpdated
}: PersonaReferenceModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<string | null>(null);

  const [currentPrimary, setCurrentPrimary] = useState<string>(
    persona.referenceImage || persona.avatar || ''
  );
  const [allImages, setAllImages] = useState<string[]>([]);

  React.useEffect(() => {
    const primary = persona.referenceImage || persona.avatar || '';
    setCurrentPrimary(primary);
    setAllImages(collectPersonaReferences(persona));
    setFailedImages(new Set());
  }, [persona.id, persona.referenceImage, persona.avatar, persona.additionalReferenceImages, persona.alternateReferenceImage]);

  if (!isOpen) return null;

  const isUnavailable = (value: string) => (
    failedImages.has(value)
    || isTemporaryBrowserMedia(value)
    || isWorkspaceMediaReference(value)
  );

  const publishPersonaUpdate = async (updated: Persona): Promise<Persona> => {
    const saved = await api.personas.update(updated);
    const confirmed = { ...updated, ...saved } as Persona;
    onPersonaUpdated?.(confirmed);
    window.dispatchEvent(new CustomEvent('persona-updated', { detail: confirmed }));
    window.dispatchEvent(new CustomEvent('personas-refresh'));
    return confirmed;
  };

  const handleSetPrimary = async (targetUrl: string) => {
    if (isUnavailable(targetUrl) || targetUrl === currentPrimary) return;
    const previousPrimary = currentPrimary;
    setCurrentPrimary(targetUrl);

    try {
      const newAdditional = allImages.filter(url => url !== targetUrl);

      const updated: Persona = {
        ...persona,
        referenceImage: targetUrl,
        avatar: targetUrl,
        additionalReferenceImages: newAdditional
      };

      const confirmed = await publishPersonaUpdate(updated);
      setCurrentPrimary(confirmed.referenceImage || confirmed.avatar || targetUrl);
      setAllImages(collectPersonaReferences(confirmed));
      toast.success(`👑 Set as primary reference for ${persona.name}!`, { id: 'primary-ref-toast' });
    } catch (err: any) {
      setCurrentPrimary(previousPrimary);
      toast.error('Failed to update primary reference: ' + (err?.message || 'Error'));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${files.length} reference image(s)...`);

    try {
      const dataUrls = await readFilesAsDataUrls(files);
      const persistedUrls = await persistPersonaReferenceImages(dataUrls, persona.id);
      const newPrimary = currentPrimary && !isUnavailable(currentPrimary) ? currentPrimary : persistedUrls[0];
      const newAll = Array.from(new Set([newPrimary, ...allImages, ...persistedUrls].filter(Boolean) as string[]));

      const updated: Persona = {
        ...persona,
        referenceImage: newPrimary,
        avatar: persona.avatar && !isUnavailable(persona.avatar) ? persona.avatar : newPrimary,
        additionalReferenceImages: newAll.filter(url => url !== newPrimary)
      };

      const confirmed = await publishPersonaUpdate(updated);
      setCurrentPrimary(confirmed.referenceImage || confirmed.avatar || newPrimary);
      setAllImages(collectPersonaReferences(confirmed));
      toast.success(`✨ Added ${persistedUrls.length} new reference image(s)!`, { id: toastId });
    } catch (err: any) {
      toast.error('Failed to upload image: ' + (err?.message || 'Error'), { id: toastId });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleReplaceReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetUrl = replaceTargetRef.current;
    if (!file || !targetUrl) return;

    setIsUploading(true);
    const toastId = toast.loading('Replacing unavailable reference photo...');
    try {
      const [dataUrl] = await readFilesAsDataUrls([file]);
      const [replacementUrl] = await persistPersonaReferenceImages([dataUrl], persona.id);
      const replacementImages = allImages.map(url => url === targetUrl ? replacementUrl : url);
      const newPrimary = currentPrimary === targetUrl ? replacementUrl : currentPrimary;
      const updated: Persona = {
        ...persona,
        referenceImage: newPrimary,
        avatar: persona.avatar === targetUrl ? replacementUrl : (persona.avatar || newPrimary),
        additionalReferenceImages: replacementImages.filter(url => url !== newPrimary),
      };

      const confirmed = await publishPersonaUpdate(updated);
      setCurrentPrimary(confirmed.referenceImage || confirmed.avatar || newPrimary);
      setAllImages(collectPersonaReferences(confirmed));
      setFailedImages(previous => {
        const next = new Set(previous);
        next.delete(targetUrl);
        return next;
      });
      toast.success('Reference photo replaced and saved', { id: toastId });
    } catch (err: any) {
      toast.error('Failed to replace image: ' + (err?.message || 'Error'), { id: toastId });
    } finally {
      setIsUploading(false);
      replaceTargetRef.current = null;
      e.target.value = '';
    }
  };

  const openReplacementPicker = (targetUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    replaceTargetRef.current = targetUrl;
    replaceInputRef.current?.click();
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

      const confirmed = await publishPersonaUpdate(updated);
      setCurrentPrimary(confirmed.referenceImage || confirmed.avatar || newPrimary);
      setAllImages(collectPersonaReferences(confirmed));
      toast.success('Removed reference image');
    } catch (err: any) {
      toast.error('Failed to delete image: ' + (err?.message || 'Error'));
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
                {currentPrimary && !isUnavailable(currentPrimary) ? (
                  <img
                    src={currentPrimary}
                    alt={persona.name}
                    onError={() => setFailedImages(previous => new Set(previous).add(currentPrimary))}
                    className="w-full h-full object-cover transition-all duration-300"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#171D27] text-[#E7C477]">
                    <ImageOff size={16} />
                  </div>
                )}
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
              <input
                type="file"
                ref={replaceInputRef}
                onChange={handleReplaceReference}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                aria-busy={isUploading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#B99655] to-[#F2D58D] hover:opacity-95 text-[#060A13] font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:cursor-wait disabled:opacity-60"
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
                const unavailable = isUnavailable(imgUrl);

                return (
                  <motion.div
                    key={`${imgUrl}-${index}`}
                    whileHover={unavailable ? undefined : { scale: 1.02 }}
                    onClick={() => !unavailable && handleSetPrimary(imgUrl)}
                    className={`group relative rounded-2xl overflow-hidden border flex flex-col transition-all aspect-[3/4] ${
                      unavailable
                        ? 'border-amber-300/25 bg-[#111722] cursor-default'
                        : isPrimary
                        ? 'border-[#F2D58D] shadow-xl shadow-amber-950/60 ring-2 ring-[#F2D58D]' 
                        : 'border-white/10 hover:border-[#E7C477]/50 bg-[#141822] cursor-pointer'
                    }`}
                  >
                    {unavailable ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center bg-gradient-to-b from-[#151C28] to-[#0D121A]">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-200/10 text-[#F2D58D]">
                          <ImageOff size={20} />
                        </div>
                        <p className="text-xs font-bold text-zinc-200">Photo unavailable</p>
                        <p className="text-[10px] leading-relaxed text-zinc-500">
                          Re-upload the original to restore this reference.
                        </p>
                      </div>
                    ) : (
                      <img
                        src={imgUrl}
                        alt={`Reference ${index + 1}`}
                        onError={() => setFailedImages(previous => new Set(previous).add(imgUrl))}
                        className="w-full h-full object-cover object-top"
                      />
                    )}

                    {/* Gradient Overlay */}
                    {!unavailable && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                    )}

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
                          className={`p-1 rounded-md bg-black/60 hover:bg-rose-500/80 text-zinc-400 hover:text-white transition-all cursor-pointer ${unavailable ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                          title="Delete reference photo"
                          aria-label={`Delete reference photo ${index + 1}`}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="absolute bottom-2 left-2 right-2 z-10">
                      {unavailable ? (
                        <button
                          type="button"
                          onClick={(event) => openReplacementPicker(imgUrl, event)}
                          disabled={isUploading}
                          className="w-full py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 bg-[#E7C477]/15 hover:bg-[#F2D58D] hover:text-[#060A13] text-[#F2D58D] border border-[#E7C477]/40 transition-all cursor-pointer disabled:cursor-wait disabled:opacity-60"
                        >
                          <Camera size={11} />
                          <span>Replace Photo</span>
                        </button>
                      ) : (
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
                      )}
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
