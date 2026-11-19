import { useState } from 'react';
import type { FirstShotTake } from '../../shared/agentRun';
import { authFetch } from '../services/imageService';

type RevisionQuote = {
  version: string;
  estimatedProviderCostUsd?: number;
  estimatedUsage: number;
  remainingAllowance: number;
  insufficientCredits: boolean;
};

export function FirstShotReview({ runId, takes, video, previousError, onUpdated }: {
  runId: string;
  takes: FirstShotTake[];
  video: boolean;
  previousError?: string;
  onUpdated: (run: any) => void;
}) {
  const [selection, setSelection] = useState(takes.at(-1)?.jobId);
  const selected = takes.find(take => take.jobId === selection) ?? takes.at(-1);
  const [feedback, setFeedback] = useState('');
  const [quote, setQuote] = useState<RevisionQuote>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(action: 'first-shot-revision-quote' | 'revise-first-shot' | 'approve-first-shot') {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      const body = action === 'approve-first-shot'
        ? { takeJobId: selected.jobId }
        : { baseJobId: selected.jobId, feedback: feedback.trim(), version: quote?.version };
      const response = await authFetch(`/api/agent-runs/${encodeURIComponent(runId)}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The request failed.');
      if (action === 'first-shot-revision-quote') setQuote(data);
      else { setQuote(undefined); onUpdated(data.run); }
    } catch (err) {
      if (action !== 'approve-first-shot') setQuote(undefined);
      setError(err instanceof Error ? err.message : 'The request failed.');
    } finally {
      setBusy(false);
    }
  }

  const canRevise = quote && !quote.insufficientCredits && quote.estimatedUsage <= quote.remainingAllowance;
  return <section aria-label="First-shot review" className="space-y-3 rounded-xl border border-[#E7C477]/35 p-3 text-sm text-zinc-200">
    <p className="font-semibold">Choose a first-shot take</p>
    {previousError && <p role="alert" className="text-amber-200">Revision stopped. Your earlier takes are still available. {previousError}</p>}
    <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Saved takes">
      {takes.map((take, index) => <figure key={take.jobId} className="space-y-2 rounded-lg border border-white/10 p-2">
        {video
          ? <video controls preload="metadata" src={take.url} className="w-full max-h-56 object-contain" />
          : <img src={take.url} alt={`First shot, take ${index + 1}`} className="w-full max-h-56 object-contain" />}
        <figcaption>
          <button type="button" disabled={busy} aria-pressed={selected?.jobId === take.jobId}
            onClick={() => { setSelection(take.jobId); setQuote(undefined); }}
            className="min-h-11 rounded-lg border border-white/15 px-3 aria-pressed:border-[#E7C477] aria-pressed:text-[#E7C477]">
            {selected?.jobId === take.jobId ? 'Selected' : 'Select'} take {index + 1}
          </button>
        </figcaption>
      </figure>)}
    </div>
    <label className="block">What should change in the selected take?
      <textarea value={feedback} maxLength={2000} rows={2} disabled={busy}
        onChange={event => { setFeedback(event.target.value); setQuote(undefined); }}
        className="mt-1 w-full rounded-lg border border-white/15 bg-black/25 p-2" />
    </label>
    {quote && <p role="status">
      Estimated revision: {quote.estimatedUsage} task credits
      {Number.isFinite(quote.estimatedProviderCostUsd) && ` · $${quote.estimatedProviderCostUsd!.toFixed(3)} provider cost`}.
      {quote.insufficientCredits ? ' Your account balance is too low.' : quote.estimatedUsage > quote.remainingAllowance ? ' Raise the task allowance to generate this revision.' : ''}
    </p>}
    {error && <p role="alert" className="text-amber-200">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy || !selected || !feedback.trim() || Boolean(quote && !canRevise)}
        onClick={() => void send(quote ? 'revise-first-shot' : 'first-shot-revision-quote')}
        className="min-h-11 rounded-lg border border-[#E7C477]/50 px-3 text-[#E7C477] disabled:opacity-50">
        {quote ? 'Generate revised take' : 'Estimate revision cost'}
      </button>
      {quote && !canRevise && <button type="button" disabled={busy} onClick={() => void send('first-shot-revision-quote')} className="min-h-11 px-3 underline">Refresh estimate</button>}
      <button type="button" disabled={busy || !selected} onClick={() => void send('approve-first-shot')}
        className="min-h-11 rounded-lg bg-[#E7C477] px-3 font-semibold text-black disabled:opacity-50">
        Approve selected take &amp; continue
      </button>
    </div>
  </section>;
}
