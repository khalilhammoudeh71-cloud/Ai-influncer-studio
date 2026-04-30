import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Square, Download, Trash2, Pencil, ArrowUpCircle, Sparkles, ChevronDown, RotateCcw, Loader2, RefreshCw } from 'lucide-react';
import { Persona } from '../types';
import { generateImage, generateAngleImage, editImage, upscaleImage, enhancePrompt, fetchAllModelTypes, type ModelInfo } from '../services/imageService';

const SHOTS = [
  { label: 'Frontal · Close-up', isHero: true,  horizontal: 'frontal',                vertical: 'eye-level',               distance: 'close-up portrait'        },
  { label: 'Front-Left 30°',     isHero: false, horizontal: 'front-left 30 degrees',  vertical: 'eye-level',               distance: 'medium close-up'          },
  { label: 'Front-Right 30°',    isHero: false, horizontal: 'front-right 30 degrees', vertical: 'eye-level',               distance: 'medium close-up'          },
  { label: '3/4 Left',           isHero: false, horizontal: 'left 45 degrees',         vertical: 'eye-level',               distance: 'medium close-up'          },
  { label: '3/4 Right',          isHero: false, horizontal: 'right 45 degrees',        vertical: 'eye-level',               distance: 'medium close-up'          },
  { label: 'Low Angle',          isHero: false, horizontal: 'frontal',                vertical: 'low angle looking up',    distance: 'medium close-up'          },
  { label: 'High Angle',         isHero: false, horizontal: 'frontal',                vertical: 'high angle looking down', distance: 'medium close-up'          },
  { label: 'Profile Left',       isHero: false, horizontal: 'full left profile',       vertical: 'eye-level',               distance: 'medium close-up'          },
  { label: 'Profile Right',      isHero: false, horizontal: 'full right profile',      vertical: 'eye-level',               distance: 'medium close-up'          },
];

type CellStatus = 'idle' | 'generating' | 'done' | 'error';
interface CellState { status: CellStatus; imageUrl: string | null; error: string | null; }

function buildHeroPrompt(persona: Persona): string {
  const name = persona.name || 'the person';
  const descriptor = persona.faceDescriptor ? ` Appearance: ${persona.faceDescriptor}.` : '';
  return (
    `Professional studio reference portrait of ${name}.${descriptor} ` +
    `Frontal view, eye-level camera angle, close-up framing showing face and upper shoulders. ` +
    `Pure white seamless background, soft even studio lighting, photorealistic, highly detailed.`
  );
}

interface Props { persona: Persona; onClose: () => void; }

export default function ReferenceSheetModal({ persona, onClose }: Props) {
  const [cells, setCells] = useState<CellState[]>(SHOTS.map(() => ({ status: 'idle', imageUrl: null, error: null })));
  const [isRunning, setIsRunning] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const heroUrlRef = useRef<string | null>(null);
  const abortRef = useRef(false);

  const [editModels, setEditModels] = useState<ModelInfo[]>([]);
  const [upscaleModels, setUpscaleModels] = useState<ModelInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
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

  function setCell(index: number, update: Partial<CellState>) {
    setCells(prev => prev.map((c, i) => i === index ? { ...c, ...update } : c));
  }

  async function generateHero(): Promise<string | null> {
    setCell(0, { status: 'generating', imageUrl: null, error: null });
    setStatusText('Generating hero shot with GPT Image 2…');
    try {
      const result = await generateImage({
        persona,
        modelId: 'openai:gpt-image-2',
        chatPrompt: buildHeroPrompt(persona),
        isChatContext: true,
        aspectRatio: '1:1',
      });
      const url = Array.isArray(result) ? result[0].imageUrl : (result as { imageUrl: string }).imageUrl;
      setCell(0, { status: 'done', imageUrl: url, error: null });
      return url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Hero generation failed';
      setCell(0, { status: 'error', imageUrl: null, error: msg });
      return null;
    }
  }

  async function generateAngle(index: number, base: string): Promise<void> {
    const shot = SHOTS[index];
    setCell(index, { status: 'generating', imageUrl: null, error: null });
    setStatusText(`Generating ${shot.label} (${index + 1}/9)…`);
    try {
      const { imageUrl } = await generateAngleImage({
        imageBase64: base,
        modelId: 'angle-qwen-multiple-2509',
        horizontalAngle: shot.horizontal,
        verticalAngle: shot.vertical,
        distance: shot.distance,
      });
      setCell(index, { status: 'done', imageUrl, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Angle generation failed';
      setCell(index, { status: 'error', imageUrl: null, error: msg });
    }
  }

  async function runGeneration() {
    abortRef.current = false;
    heroUrlRef.current = null;
    setIsRunning(true);
    setGlobalError(null);
    setCells(SHOTS.map(() => ({ status: 'idle', imageUrl: null, error: null })));

    const hero = await generateHero();

    if (abortRef.current) {
      setIsRunning(false);
      setStatusText('Stopped.');
      return;
    }

    if (!hero) {
      setIsRunning(false);
      setGlobalError('Hero image failed to generate. Check your OpenAI key or try again.');
      setStatusText('');
      return;
    }

    heroUrlRef.current = hero;

    for (let i = 1; i < SHOTS.length; i++) {
      if (abortRef.current) break;
      await generateAngle(i, hero);
    }

    setIsRunning(false);
    setStatusText(abortRef.current ? 'Stopped.' : 'Done!');
    setTimeout(() => setStatusText(''), 3000);
  }

  async function regenerateCell(index: number) {
    if (index === 0) {
      const hero = await generateHero();
      if (hero) heroUrlRef.current = hero;
    } else {
      const base = heroUrlRef.current ?? cells[0].imageUrl;
      if (!base) {
        setCell(index, { status: 'error', imageUrl: null, error: 'Generate the hero shot first' });
        return;
      }
      await generateAngle(index, base);
    }
  }

  const selectedImage = selectedIndex !== null ? cells[selectedIndex]?.imageUrl : null;

  async function handleEdit() {
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
  }

  async function handleUpscale() {
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
  }

  async function handleEnhancePrompt() {
    if (!editPrompt.trim()) return;
    setActionProcessing(true);
    try {
      const enhanced = await enhancePrompt(editPrompt);
      setEditPrompt(enhanced);
    } catch { /* silent */ } finally {
      setActionProcessing(false);
    }
  }

  function handleDownload() {
    if (!selectedImage) return;
    const a = document.createElement('a');
    a.href = selectedImage;
    a.download = `${persona.name.replace(/\s+/g, '_')}_${SHOTS[selectedIndex!]?.label.replace(/[^\w]/g, '_')}.png`;
    a.click();
  }

  function closeActionSheet() {
    setActionSheetMode(null);
    setSelectedIndex(null);
    setActionError(null);
    setEditPrompt('');
  }

  const anyDone = cells.some(c => c.status === 'done');

  return createPortal(
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex flex-col" style={{ zIndex: 10010 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3 shrink-0">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-400 font-bold mb-0.5">Reference Sheet</p>
          <h2 className="text-lg font-bold leading-tight">{persona.name}</h2>
        </div>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all">
          <X size={18} />
        </button>
      </div>

      {/* Status / error bar */}
      {globalError && (
        <div className="mx-4 mb-2 px-4 py-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl">
          <p className="text-rose-300 text-xs font-medium">{globalError}</p>
        </div>
      )}
      {statusText && !globalError && (
        <div className="mx-4 mb-2 px-4 py-2 bg-violet-500/15 border border-violet-500/25 rounded-xl flex items-center gap-2">
          <Loader2 size={12} className="animate-spin text-violet-400 shrink-0" />
          <p className="text-violet-300 text-xs font-medium">{statusText}</p>
        </div>
      )}

      {/* 3×3 Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          {SHOTS.map((shot, i) => {
            const cell = cells[i];
            return (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/8">
                {/* Bottom label */}
                <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-4 pointer-events-none">
                  <p className="text-[8px] font-semibold text-white/80 leading-tight text-center">{shot.label}</p>
                </div>

                {shot.isHero && (
                  <div className="absolute top-1.5 left-1.5 z-10 bg-fuchsia-600 rounded-md px-1.5 py-0.5">
                    <span className="text-[8px] font-bold text-white uppercase tracking-wide">GPT·2K</span>
                  </div>
                )}

                {cell.status === 'done' && (
                  <button
                    onClick={() => { setCell(i, cell); regenerateCell(i); }}
                    className="absolute top-1.5 right-1.5 z-10 w-6 h-6 flex items-center justify-center rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white transition-all backdrop-blur-sm"
                  >
                    <RotateCcw size={10} />
                  </button>
                )}

                {cell.status === 'done' && cell.imageUrl ? (
                  <button className="w-full h-full" onClick={() => { setSelectedIndex(i); setActionSheetMode('main'); setActionError(null); setEditPrompt(''); }}>
                    <img src={cell.imageUrl} alt={shot.label} className="w-full h-full object-cover" />
                  </button>
                ) : cell.status === 'generating' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <Loader2 size={24} className="animate-spin text-fuchsia-400" />
                    <p className="text-[9px] text-white/50 text-center px-2">{shot.isHero ? 'GPT Image 2…' : 'Qwen Angles…'}</p>
                  </div>
                ) : cell.status === 'error' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                    <p className="text-[9px] text-rose-400 text-center leading-tight line-clamp-3">{cell.error}</p>
                    <button onClick={() => regenerateCell(i)} className="text-[9px] font-bold text-fuchsia-400 bg-fuchsia-500/20 px-2 py-1 rounded-lg">
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border border-white/15" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-8 pt-3 border-t border-white/8 shrink-0 flex gap-3">
        {isRunning ? (
          <button
            onClick={() => { abortRef.current = true; setIsRunning(false); setStatusText('Stopping…'); }}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-rose-600 hover:bg-rose-500 rounded-2xl font-bold text-white transition-all active:scale-95"
          >
            <Square size={16} />
            Stop Generation
          </button>
        ) : (
          <button
            onClick={runGeneration}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-2xl font-bold text-white transition-all active:scale-95 shadow-lg shadow-fuchsia-600/25"
          >
            <Sparkles size={16} />
            {anyDone ? 'Regenerate All' : 'Generate 9 Angles'}
          </button>
        )}
      </div>

      {/* Image Action Sheet */}
      {selectedIndex !== null && actionSheetMode && selectedImage && (
        <div className="absolute inset-0 flex items-end justify-center" style={{ zIndex: 10020 }} onClick={closeActionSheet}>
          <div
            className="w-full max-w-xl bg-[#111118] border-t border-x border-white/10 rounded-t-[32px] overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative h-52 bg-black">
              <img src={selectedImage} alt="" className="w-full h-full object-contain" />
              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={handleDownload} className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm text-white/80 hover:text-white">
                  <Download size={14} />
                </button>
                <button onClick={closeActionSheet} className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm text-white/80 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <div className="absolute bottom-3 left-3">
                <span className="text-[10px] font-bold text-white/70 bg-black/50 px-2 py-1 rounded-lg backdrop-blur-sm">
                  {SHOTS[selectedIndex]?.label}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-3 pb-8">
              {actionSheetMode === 'main' && (
                <>
                  {actionError && <p className="text-xs text-rose-400 text-center">{actionError}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setActionSheetMode('edit'); setActionError(null); }} className="flex items-center justify-center gap-2 py-3.5 bg-white/8 hover:bg-white/12 rounded-2xl font-semibold text-sm transition-all active:scale-95">
                      <Pencil size={15} /> Edit
                    </button>
                    <button onClick={() => { setActionSheetMode('upscale'); setActionError(null); }} className="flex items-center justify-center gap-2 py-3.5 bg-white/8 hover:bg-white/12 rounded-2xl font-semibold text-sm transition-all active:scale-95">
                      <ArrowUpCircle size={15} /> Upscale
                    </button>
                    <button
                      onClick={() => { regenerateCell(selectedIndex); closeActionSheet(); }}
                      className="flex items-center justify-center gap-2 py-3.5 bg-white/8 hover:bg-white/12 rounded-2xl font-semibold text-sm transition-all active:scale-95"
                    >
                      <RefreshCw size={15} /> Regenerate
                    </button>
                    <button
                      onClick={() => { setCell(selectedIndex, { status: 'idle', imageUrl: null, error: null }); closeActionSheet(); }}
                      className="flex items-center justify-center gap-2 py-3.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 rounded-2xl font-semibold text-sm transition-all active:scale-95"
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </>
              )}

              {actionSheetMode === 'edit' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setActionSheetMode('main'); setActionError(null); }} className="text-[var(--text-muted)] hover:text-white transition-colors">
                      <ChevronDown size={18} />
                    </button>
                    <h3 className="font-bold text-sm">Edit Image</h3>
                  </div>
                  {actionError && <p className="text-xs text-rose-400">{actionError}</p>}
                  <select value={selectedEditModel} onChange={e => setSelectedEditModel(e.target.value)} className="w-full bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white appearance-none">
                    {editModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="Describe your edit…" rows={2} className="flex-1 bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 resize-none" />
                    <button onClick={handleEnhancePrompt} disabled={actionProcessing} className="self-start px-3 py-2.5 bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 rounded-xl text-xs font-bold transition-all">
                      <Sparkles size={13} />
                    </button>
                  </div>
                  <button onClick={handleEdit} disabled={actionProcessing || !editPrompt.trim()} className="w-full flex items-center justify-center gap-2 py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-2xl font-bold text-sm transition-all active:scale-95">
                    {actionProcessing ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={15} />}
                    {actionProcessing ? 'Editing…' : 'Apply Edit'}
                  </button>
                </div>
              )}

              {actionSheetMode === 'upscale' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setActionSheetMode('main'); setActionError(null); }} className="text-[var(--text-muted)] hover:text-white transition-colors">
                      <ChevronDown size={18} />
                    </button>
                    <h3 className="font-bold text-sm">Upscale Image</h3>
                  </div>
                  {actionError && <p className="text-xs text-rose-400">{actionError}</p>}
                  <select value={selectedUpscaleModel} onChange={e => setSelectedUpscaleModel(e.target.value)} className="w-full bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white appearance-none">
                    {upscaleModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <button onClick={handleUpscale} disabled={actionProcessing} className="w-full flex items-center justify-center gap-2 py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-2xl font-bold text-sm transition-all active:scale-95">
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
