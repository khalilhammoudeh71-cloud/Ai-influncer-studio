import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, Square, Download, Trash2, Pencil, ArrowUpCircle, Sparkles, ChevronDown, RotateCcw, Loader2 } from 'lucide-react';
import { Persona } from '../types';
import { generateAngleImage, editImage, upscaleImage, enhancePrompt, fetchAllModelTypes, type ModelInfo } from '../services/imageService';

const SHOTS: {
  label: string;
  isHero: boolean;
  horizontal: string;
  vertical: string;
  distance: string;
}[] = [
  { label: 'Frontal · Close-up',    isHero: true,  horizontal: 'frontal',               vertical: 'eye-level',              distance: 'close-up portrait'       },
  { label: 'Front-Left 30°',        isHero: false, horizontal: 'front-left 30 degrees', vertical: 'eye-level',              distance: 'medium close-up'          },
  { label: 'Front-Right 30°',       isHero: false, horizontal: 'front-right 30 degrees',vertical: 'eye-level',              distance: 'medium close-up'          },
  { label: '3/4 Left',              isHero: false, horizontal: 'left 45 degrees',        vertical: 'eye-level',              distance: 'medium close-up'          },
  { label: '3/4 Right',             isHero: false, horizontal: 'right 45 degrees',       vertical: 'eye-level',              distance: 'medium close-up'          },
  { label: 'Low Angle',             isHero: false, horizontal: 'frontal',               vertical: 'low angle looking up',   distance: 'medium close-up'          },
  { label: 'High Angle',            isHero: false, horizontal: 'frontal',               vertical: 'high angle looking down',distance: 'medium close-up'          },
  { label: 'Profile Left',          isHero: false, horizontal: 'full left profile',      vertical: 'eye-level',              distance: 'medium close-up'          },
  { label: 'Profile Right',         isHero: false, horizontal: 'full right profile',     vertical: 'eye-level',              distance: 'medium close-up'          },
];

type CellStatus = 'idle' | 'generating' | 'done' | 'error';

interface CellState {
  status: CellStatus;
  imageUrl: string | null;
  error: string | null;
}

const ANGLE_MODEL = 'angle-qwen-multiple-2509';

function buildHeroPrompt(persona: Persona): string {
  const name = persona.name || 'the person';
  const descriptor = persona.faceDescriptor ? ` ${persona.faceDescriptor}.` : '';
  return (
    `Professional reference portrait of ${name}.${descriptor} ` +
    `Frontal view, eye-level camera, close-up framing showing face and upper shoulders. ` +
    `Pure white seamless background, soft studio lighting, photorealistic, ultra-detailed. ` +
    `Maintain exact facial features, hair color, and appearance.`
  );
}

interface Props {
  persona: Persona;
  onClose: () => void;
}

export default function ReferenceSheetModal({ persona, onClose }: Props) {
  const [cells, setCells] = useState<CellState[]>(
    SHOTS.map(() => ({ status: 'idle', imageUrl: null, error: null }))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const abortRef = useRef(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const [editModels, setEditModels] = useState<ModelInfo[]>([]);
  const [upscaleModels, setUpscaleModels] = useState<ModelInfo[]>([]);
  const [actionSheetMode, setActionSheetMode] = useState<'main' | 'edit' | 'upscale' | null>(null);
  const [selectedEditModel, setSelectedEditModel] = useState('');
  const [selectedUpscaleModel, setSelectedUpscaleModel] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllModelTypes().then(({ editModels: em, upscaleModels: um }) => {
      setEditModels(em);
      setUpscaleModels(um);
      if (em.length > 0) setSelectedEditModel(em[0].id);
      if (um.length > 0) setSelectedUpscaleModel(um[0].id);
    }).catch(() => {});
  }, []);

  const setCell = useCallback((index: number, update: Partial<CellState>) => {
    setCells(prev => prev.map((c, i) => i === index ? { ...c, ...update } : c));
  }, []);

  const generateHero = useCallback(async (): Promise<string | null> => {
    setCell(0, { status: 'generating', imageUrl: null, error: null });
    const prompt = buildHeroPrompt(persona);
    const referenceImage = persona.referenceImage || null;

    try {
      const payload: Record<string, unknown> = {
        modelId: 'openai:gpt-image-2',
        personaId: persona.id,
        personaName: persona.name,
        niche: persona.niche,
        tone: persona.tone,
        visualStyle: persona.visualStyle || 'Realistic, highly detailed',
        referenceImage,
        chatPrompt: prompt,
        isChatContext: true,
        aspectRatio: '1:1',
      };

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hero generation failed');
      const url: string = data.imageUrl;
      setCell(0, { status: 'done', imageUrl: url, error: null });
      return url;
    } catch (err) {
      setCell(0, { status: 'error', imageUrl: null, error: err instanceof Error ? err.message : 'Failed' });
      return null;
    }
  }, [persona, setCell]);

  const generateAngle = useCallback(async (index: number, base: string): Promise<void> => {
    const shot = SHOTS[index];
    setCell(index, { status: 'generating', imageUrl: null, error: null });
    try {
      const { imageUrl } = await generateAngleImage({
        imageBase64: base,
        modelId: ANGLE_MODEL,
        horizontalAngle: shot.horizontal,
        verticalAngle: shot.vertical,
        distance: shot.distance,
      });
      setCell(index, { status: 'done', imageUrl, error: null });
    } catch (err) {
      setCell(index, { status: 'error', imageUrl: null, error: err instanceof Error ? err.message : 'Failed' });
    }
  }, [setCell]);

  const runGeneration = useCallback(async () => {
    abortRef.current = false;
    setIsRunning(true);
    setCells(SHOTS.map(() => ({ status: 'idle', imageUrl: null, error: null })));
    setHeroUrl(null);

    const hero = await generateHero();
    if (abortRef.current || !hero) {
      setIsRunning(false);
      return;
    }
    setHeroUrl(hero);

    for (let i = 1; i < SHOTS.length; i++) {
      if (abortRef.current) break;
      await generateAngle(i, hero);
    }

    setIsRunning(false);
  }, [generateHero, generateAngle]);

  const stopGeneration = () => {
    abortRef.current = true;
    setIsRunning(false);
  };

  const regenerateCell = useCallback(async (index: number) => {
    if (index === 0) {
      const hero = await generateHero();
      if (hero) setHeroUrl(hero);
    } else {
      const base = heroUrl || cells[0].imageUrl;
      if (!base) return;
      await generateAngle(index, base);
    }
  }, [generateHero, generateAngle, heroUrl, cells]);

  const selectedImage = selectedIndex !== null ? cells[selectedIndex]?.imageUrl : null;

  const handleEdit = async () => {
    if (!selectedImage || !selectedEditModel || !editPrompt.trim()) return;
    setActionProcessing(true);
    setActionError(null);
    try {
      const { imageUrl } = await editImage(selectedImage, editPrompt, selectedEditModel);
      if (selectedIndex !== null) setCell(selectedIndex, { imageUrl, status: 'done', error: null });
      setActionSheetMode('main');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Edit failed');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleUpscale = async () => {
    if (!selectedImage || !selectedUpscaleModel) return;
    setActionProcessing(true);
    setActionError(null);
    try {
      const { imageUrl } = await upscaleImage(selectedImage, selectedUpscaleModel);
      if (selectedIndex !== null) setCell(selectedIndex, { imageUrl, status: 'done', error: null });
      setActionSheetMode(null);
      setSelectedIndex(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Upscale failed');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleEnhance = async () => {
    if (!editPrompt.trim()) return;
    setActionProcessing(true);
    setActionError(null);
    try {
      const enhanced = await enhancePrompt(editPrompt);
      setEditPrompt(enhanced);
    } catch {
    } finally {
      setActionProcessing(false);
    }
  };

  const handleDeleteCell = () => {
    if (selectedIndex === null) return;
    setCell(selectedIndex, { status: 'idle', imageUrl: null, error: null });
    setActionSheetMode(null);
    setSelectedIndex(null);
  };

  const handleDownload = () => {
    if (!selectedImage) return;
    const a = document.createElement('a');
    a.href = selectedImage;
    a.download = `${persona.name.replace(/\s+/g, '_')}_${SHOTS[selectedIndex!]?.label.replace(/[^\w]/g, '_')}.png`;
    a.click();
  };

  const anyDone = cells.some(c => c.status === 'done');
  const allIdle = cells.every(c => c.status === 'idle');

  return createPortal(
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm flex flex-col"
      style={{ zIndex: 10010 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-safe pt-6 pb-4 shrink-0">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-400 font-bold mb-0.5">Reference Sheet</p>
          <h2 className="text-lg font-bold">{persona.name}</h2>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all"
        >
          <X size={18} />
        </button>
      </div>

      {/* 3×3 Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          {SHOTS.map((shot, i) => {
            const cell = cells[i];
            return (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/8">
                {/* Label */}
                <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-4">
                  <p className="text-[9px] font-semibold text-white/80 leading-tight text-center">{shot.label}</p>
                </div>

                {/* Hero badge */}
                {shot.isHero && (
                  <div className="absolute top-1.5 left-1.5 z-10 bg-violet-600 rounded-md px-1.5 py-0.5">
                    <span className="text-[8px] font-bold text-white uppercase tracking-wide">GPT·2K</span>
                  </div>
                )}

                {/* Regenerate button */}
                {cell.status === 'done' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); regenerateCell(i); }}
                    className="absolute top-1.5 right-1.5 z-10 w-6 h-6 flex items-center justify-center rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white transition-all backdrop-blur-sm"
                  >
                    <RotateCcw size={11} />
                  </button>
                )}

                {/* Content */}
                {cell.status === 'done' && cell.imageUrl ? (
                  <button
                    className="w-full h-full"
                    onClick={() => { setSelectedIndex(i); setActionSheetMode('main'); setActionError(null); setEditPrompt(''); }}
                  >
                    <img src={cell.imageUrl} alt={shot.label} className="w-full h-full object-cover" />
                  </button>
                ) : cell.status === 'generating' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <Loader2 size={22} className="animate-spin text-violet-400" />
                    <p className="text-[9px] text-white/50">{shot.isHero ? 'GPT Image 2…' : 'Qwen Angles…'}</p>
                  </div>
                ) : cell.status === 'error' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2">
                    <p className="text-[9px] text-rose-400 text-center leading-tight">{cell.error}</p>
                    <button
                      onClick={() => regenerateCell(i)}
                      className="text-[9px] text-violet-400 underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border border-white/10" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-4 pb-safe pb-8 pt-3 border-t border-white/8 shrink-0 flex gap-3">
        {isRunning ? (
          <button
            onClick={stopGeneration}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-rose-600 hover:bg-rose-500 rounded-2xl font-bold text-white transition-all active:scale-95"
          >
            <Square size={16} />
            Stop Generation
          </button>
        ) : (
          <button
            onClick={runGeneration}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-violet-600 hover:bg-violet-500 rounded-2xl font-bold text-white transition-all active:scale-95 shadow-lg shadow-violet-600/30"
          >
            <Sparkles size={16} />
            {anyDone ? 'Regenerate All' : 'Generate 9 Angles'}
          </button>
        )}
      </div>

      {/* Image Action Sheet */}
      {selectedIndex !== null && actionSheetMode && selectedImage && (
        <div
          className="absolute inset-0 flex items-end justify-center"
          style={{ zIndex: 10020 }}
          onClick={() => { setActionSheetMode(null); setSelectedIndex(null); }}
        >
          <div
            className="w-full max-w-xl bg-[#111118] border-t border-x border-white/10 rounded-t-[32px] overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Preview */}
            <div className="relative h-52 bg-black">
              <img src={selectedImage} alt="" className="w-full h-full object-contain" />
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={handleDownload}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm text-white/80 hover:text-white"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => { setActionSheetMode(null); setSelectedIndex(null); }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm text-white/80 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="absolute bottom-3 left-3">
                <span className="text-[10px] font-bold text-white/70 bg-black/50 px-2 py-1 rounded-lg backdrop-blur-sm">
                  {SHOTS[selectedIndex]?.label}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4 pb-safe pb-8">
              {actionSheetMode === 'main' && (
                <>
                  {actionError && (
                    <p className="text-xs text-rose-400 text-center">{actionError}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setActionSheetMode('edit'); setActionError(null); }}
                      className="flex items-center justify-center gap-2 py-3.5 bg-white/8 hover:bg-white/12 rounded-2xl font-semibold text-sm transition-all active:scale-95"
                    >
                      <Pencil size={15} /> Edit
                    </button>
                    <button
                      onClick={() => { setActionSheetMode('upscale'); setActionError(null); }}
                      className="flex items-center justify-center gap-2 py-3.5 bg-white/8 hover:bg-white/12 rounded-2xl font-semibold text-sm transition-all active:scale-95"
                    >
                      <ArrowUpCircle size={15} /> Upscale
                    </button>
                    <button
                      onClick={() => { regenerateCell(selectedIndex); setActionSheetMode(null); setSelectedIndex(null); }}
                      className="flex items-center justify-center gap-2 py-3.5 bg-white/8 hover:bg-white/12 rounded-2xl font-semibold text-sm transition-all active:scale-95"
                    >
                      <RefreshCw size={15} /> Regenerate
                    </button>
                    <button
                      onClick={handleDeleteCell}
                      className="flex items-center justify-center gap-2 py-3.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 rounded-2xl font-semibold text-sm transition-all active:scale-95"
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </>
              )}

              {actionSheetMode === 'edit' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <button onClick={() => { setActionSheetMode('main'); setActionError(null); }} className="text-[var(--text-muted)] hover:text-white transition-colors">
                      <ChevronDown size={18} />
                    </button>
                    <h3 className="font-bold text-sm">Edit Image</h3>
                  </div>
                  {actionError && <p className="text-xs text-rose-400">{actionError}</p>}
                  <select
                    value={selectedEditModel}
                    onChange={e => setSelectedEditModel(e.target.value)}
                    className="w-full bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white appearance-none"
                  >
                    {editModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <textarea
                      value={editPrompt}
                      onChange={e => setEditPrompt(e.target.value)}
                      placeholder="Describe your edit…"
                      rows={2}
                      className="flex-1 bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 resize-none"
                    />
                    <button
                      onClick={handleEnhance}
                      disabled={actionProcessing}
                      className="self-start px-3 py-2.5 bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 rounded-xl text-xs font-bold transition-all"
                    >
                      <Sparkles size={13} />
                    </button>
                  </div>
                  <button
                    onClick={handleEdit}
                    disabled={actionProcessing || !editPrompt.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-2xl font-bold text-sm transition-all active:scale-95"
                  >
                    {actionProcessing ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={15} />}
                    {actionProcessing ? 'Editing…' : 'Apply Edit'}
                  </button>
                </div>
              )}

              {actionSheetMode === 'upscale' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <button onClick={() => { setActionSheetMode('main'); setActionError(null); }} className="text-[var(--text-muted)] hover:text-white transition-colors">
                      <ChevronDown size={18} />
                    </button>
                    <h3 className="font-bold text-sm">Upscale Image</h3>
                  </div>
                  {actionError && <p className="text-xs text-rose-400">{actionError}</p>}
                  <select
                    value={selectedUpscaleModel}
                    onChange={e => setSelectedUpscaleModel(e.target.value)}
                    className="w-full bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white appearance-none"
                  >
                    {upscaleModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <button
                    onClick={handleUpscale}
                    disabled={actionProcessing}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-2xl font-bold text-sm transition-all active:scale-95"
                  >
                    {actionProcessing ? <Loader2 size={15} className="animate-spin" /> : <ArrowUpCircle size={15} />}
                    {actionProcessing ? 'Upscaling…' : 'Upscale Now'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
