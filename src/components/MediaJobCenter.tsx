import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Clock3,
  Film,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Mic2,
  RefreshCw,
  RotateCcw,
  Square,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';
import {
  cancelMediaJob,
  deleteMediaJob,
  listMediaJobs,
  runMediaJob,
  type MediaJob,
  type MediaJobKind,
} from '../services/mediaJobService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenResult?: (job: MediaJob) => void;
  onJobCompleted?: (job: MediaJob) => void;
}

const KIND_LABELS: Record<MediaJobKind, string> = {
  image: 'Image',
  video: 'Video',
  edit: 'Image edit',
  upscale: 'Upscale',
  avatar: 'Talking avatar',
};

function JobIcon({ kind, className }: { kind: MediaJobKind; className?: string }) {
  if (kind === 'video') return <Film className={className} />;
  if (kind === 'avatar') return <Mic2 className={className} />;
  if (kind === 'upscale') return <Sparkles className={className} />;
  if (kind === 'edit') return <Wand2 className={className} />;
  return <ImageIcon className={className} />;
}

function formatWhen(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function MediaJobCenter({ isOpen, onClose, onOpenResult, onJobCompleted }: Props) {
  const [jobs, setJobs] = useState<MediaJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setJobs(await listMediaJobs());
    } catch (error) {
      if (!quiet) toast.error(error instanceof Error ? error.message : 'Could not load media jobs');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void refresh();
    const handleChanged = () => void refresh(true);
    window.addEventListener('media-job-updated', handleChanged);
    return () => window.removeEventListener('media-job-updated', handleChanged);
  }, [isOpen, refresh]);

  useEffect(() => {
    if (!isOpen || !jobs.some(job => job.status === 'queued' || job.status === 'running')) return;
    const timer = window.setInterval(() => void refresh(true), 4000);
    return () => window.clearInterval(timer);
  }, [isOpen, jobs, refresh]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  const retry = async (job: MediaJob) => {
    setActiveJobId(job.id);
    try {
      const completed = await runMediaJob(job.id, Boolean(job.fallbackModelId));
      setJobs(current => current.map(item => item.id === completed.id ? completed : item));
      onJobCompleted?.(completed);
      toast.success(job.fallbackModelId ? 'Completed with the fallback model' : 'Media job completed');
    } catch (error: any) {
      if (error?.job) setJobs(current => current.map(item => item.id === error.job.id ? error.job : item));
      toast.error(error?.message || 'Retry failed');
    } finally {
      setActiveJobId(null);
      void refresh(true);
    }
  };

  const remove = async (job: MediaJob) => {
    try {
      await deleteMediaJob(job.id);
      setJobs(current => current.filter(item => item.id !== job.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove media job');
    }
  };

  const cancel = async (job: MediaJob) => {
    setActiveJobId(job.id);
    try {
      const updated = await cancelMediaJob(job.id);
      setJobs(current => current.map(item => item.id === updated.id ? updated : item));
      toast.success(updated.status === 'canceled' ? 'Media job canceled' : 'Cancel requested');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not cancel media job');
    } finally {
      setActiveJobId(null);
      void refresh(true);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[160] bg-black/75 backdrop-blur-sm flex justify-end"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: 520 }}
            animate={{ x: 0 }}
            exit={{ x: 520 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="w-full max-w-xl h-full bg-[#17181c] border-l border-white/10 shadow-2xl flex flex-col"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="media-job-center-title"
          >
            <header className="flex items-start justify-between gap-4 px-5 sm:px-6 py-5 border-b border-white/10 bg-[#1d1e23]">
              <div>
                <div className="flex items-center gap-2 text-[#F2D58D] text-xs font-bold uppercase tracking-[0.18em]">
                  <Sparkles size={14} /> Media Job Center
                </div>
                <h2 id="media-job-center-title" className="text-xl sm:text-2xl font-bold text-white mt-1">Your generations</h2>
                <p className="text-sm text-zinc-400 mt-1">Jobs survive refreshes. Retry interrupted work without rebuilding the prompt.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void refresh()}
                  className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 cursor-pointer"
                  title="Refresh jobs"
                  aria-label="Refresh media jobs"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
                <button onClick={onClose} className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-rose-500/15 text-zinc-300 hover:text-rose-300 cursor-pointer" title="Close" aria-label="Close media jobs">
                  <X size={17} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {loading && jobs.length === 0 ? (
                <div className="h-full min-h-64 flex flex-col items-center justify-center text-zinc-400 gap-3">
                  <Loader2 size={26} className="animate-spin text-[#E7C477]" />
                  Loading your jobs…
                </div>
              ) : jobs.length === 0 ? (
                <div className="h-full min-h-64 flex flex-col items-center justify-center text-center px-8">
                  <div className="w-14 h-14 rounded-2xl bg-[#E7C477]/10 border border-[#E7C477]/20 flex items-center justify-center text-[#E7C477]">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-white font-semibold mt-4">No media jobs yet</h3>
                  <p className="text-sm text-zinc-500 mt-1">Generate an image, video, upscale, or talking avatar and its progress will appear here.</p>
                </div>
              ) : jobs.map(job => {
                const working = job.status === 'queued' || job.status === 'running';
                const failed = job.status === 'failed';
                const complete = job.status === 'succeeded';
                const canceled = job.status === 'canceled';
                return (
                  <article key={job.id} className="rounded-2xl border border-white/10 bg-[#202126] p-4 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
                        complete && 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
                        working && 'bg-[#E7C477]/10 border-[#E7C477]/25 text-[#E7C477]',
                        failed && 'bg-rose-500/10 border-rose-500/25 text-rose-400',
                        canceled && 'bg-zinc-500/10 border-zinc-500/25 text-zinc-400',
                      )}>
                        {working ? <Loader2 size={18} className="animate-spin" /> : <JobIcon kind={job.kind} className="w-[18px] h-[18px]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-semibold text-white">{KIND_LABELS[job.kind]}</span>
                            <span className={cn(
                              'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                              complete && 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
                              working && 'text-[#F2D58D] bg-[#E7C477]/10 border-[#E7C477]/20',
                              failed && 'text-rose-300 bg-rose-500/10 border-rose-500/20',
                              canceled && 'text-zinc-300 bg-zinc-500/10 border-zinc-500/20',
                            )}>
                              {job.cancelRequested && working ? 'Canceling' : job.status === 'running' ? 'Generating' : job.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500 shrink-0">{formatWhen(job.createdAt)}</span>
                        </div>
                        <p className="text-sm text-zinc-300 mt-1.5 line-clamp-2">{job.summary || 'Saved media request'}</p>
                        {(job.modelId || job.usedFallback) && (
                          <p className="text-[11px] text-zinc-500 mt-1 truncate">
                            {job.usedFallback ? 'Fallback · ' : ''}{job.modelId || 'Provider default'} · Attempt {job.attempt || 1}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4" aria-label={`Job progress: ${job.progress}%`}>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className={cn('h-full rounded-full', failed ? 'bg-rose-400' : canceled ? 'bg-zinc-500' : complete ? 'bg-emerald-400' : 'bg-[#E7C477]')}
                          animate={{ width: `${Math.max(working ? 4 : 0, job.progress)}%` }}
                          transition={{ duration: 0.35 }}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px]">
                        <span className="text-zinc-400 truncate">{job.stage || (working ? 'Generating' : job.status)}</span>
                        <span className="text-zinc-500 tabular-nums">{job.progress}%</span>
                      </div>
                    </div>

                    {failed && job.error && (
                      <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.07] px-3 py-2 text-xs text-rose-200">
                        {job.error}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 mt-3">
                      {complete && job.result?.url && (
                        <button
                          onClick={() => onOpenResult?.(job)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E7C477] hover:bg-[#F2D58D] text-zinc-950 text-xs font-bold cursor-pointer"
                        >
                          <Maximize2 size={13} /> Open result
                        </button>
                      )}
                      {failed && (
                        <button
                          onClick={() => void retry(job)}
                          disabled={activeJobId === job.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E7C477]/30 bg-[#E7C477]/10 hover:bg-[#E7C477]/20 text-[#F2D58D] text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          {activeJobId === job.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                          {job.fallbackModelId ? 'Retry with fallback' : 'Retry'}
                        </button>
                      )}
                      {working && (
                        <button
                          onClick={() => void cancel(job)}
                          disabled={activeJobId === job.id || job.cancelRequested}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.07] hover:bg-rose-500/15 text-rose-300 text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          {activeJobId === job.id ? <Loader2 size={13} className="animate-spin" /> : <Square size={12} />}
                          {job.cancelRequested ? 'Canceling' : 'Cancel'}
                        </button>
                      )}
                      {!working && (
                        <button onClick={() => void remove(job)} className="p-2 rounded-xl border border-white/10 text-zinc-500 hover:text-rose-300 hover:border-rose-500/20 cursor-pointer" title="Remove job from this list" aria-label={`Remove ${KIND_LABELS[job.kind]} job`}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <footer className="px-5 py-4 border-t border-white/10 bg-[#15161a] text-xs text-zinc-500 flex items-center gap-2">
              <Clock3 size={13} /> Queued and running jobs are kept here even if you refresh the app.
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
