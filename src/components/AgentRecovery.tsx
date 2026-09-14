import React, { useState } from 'react';
import { authFetch } from '../services/imageService';
import type { RecoveryDetail, RepairProposal } from '../../shared/agentRecovery';

const models = [
  ['frontier-gemini-flash', 'Gemini 3.8 Flash'],
  ['frontier-gemini-pro', 'Gemini 3.1 Pro Preview'],
  ['frontier-grok', 'Grok 4.6'],
];

export function AgentRecovery({ id, planningModel, onRecovered }: { id: string; planningModel?: string; onRecovered: (run: any) => void }) {
  const [detail, setDetail] = useState<RecoveryDetail | null>(null);
  const [proposal, setProposal] = useState<RepairProposal | null>(null);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(models.some(([id]) => id === planningModel) ? planningModel! : 'frontier-gemini-flash');
  const [busy, setBusy] = useState<'inspect' | 'suggest' | 'retry' | null>(null);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);

  async function request(path: string, body?: object) {
    const response = await authFetch(`/api/agent-runs/${encodeURIComponent(id)}/${path}`, body === undefined ? undefined : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 409) setStale(true);
      throw new Error(data.error || 'The request failed. Please try again.');
    }
    return data;
  }
  async function inspect() {
    setBusy('inspect'); setError('');
    try {
      const data = await request('recovery');
      setDetail(data); setPrompt(data.prompt); setProposal(null); setStale(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Inspection failed'); }
    finally { setBusy(null); }
  }
  async function suggest() {
    if (!detail) return;
    setBusy('suggest'); setError('');
    try {
      const data = await request('repair-proposal', { version: detail.version, model });
      setProposal(data.proposal);
      if (data.proposal.proposedPrompt !== null) setPrompt(data.proposal.proposedPrompt);
    } catch (e) { setError(e instanceof Error ? e.message : 'Analysis failed. You can still revise this step manually.'); }
    finally { setBusy(null); }
  }
  async function retry() {
    if (!detail) return;
    setBusy('retry'); setError('');
    try { onRecovered((await request('retry', { prompt, version: detail.version })).run); }
    catch (e) { setError(e instanceof Error ? e.message : 'Repair failed'); }
    finally { setBusy(null); }
  }
  const accountIssue = detail && ['billing', 'access', 'policy'].includes(detail.advice.kind);
  const temporary = detail?.advice.kind === 'temporary';
  return <section aria-label="Failed step recovery" className="min-w-0 space-y-3 rounded-xl border border-white/15 p-3 text-sm text-zinc-300 sm:p-4">
    <button disabled={!!busy} onClick={() => void inspect()} className="min-h-10 text-[#E7C477] underline underline-offset-4 disabled:opacity-50">
      {busy === 'inspect' ? 'Inspecting…' : detail ? 'Refresh failure details' : 'Inspect failed step'}
    </button>
    {detail && <>
      <p><span className="font-medium text-zinc-100">Step {detail.index + 1} stopped.</span> {detail.advice.message}</p>
      <details className="text-xs text-zinc-400"><summary className="cursor-pointer py-2">Provider error</summary><p className="whitespace-pre-wrap break-words">{detail.error || 'No additional details were returned.'}</p></details>
      {!accountIssue && <div className="space-y-2 border-t border-white/10 pt-3">
        {!temporary && <label className="block text-xs text-zinc-400">Repair model
          <select aria-label="Repair model" value={model} disabled={!!busy || stale} onChange={e => setModel(e.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-white/15 bg-zinc-900 px-3 text-sm text-zinc-100 sm:w-auto">
            {models.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>}
        <button disabled={!!busy || stale} onClick={() => void suggest()} className="min-h-11 rounded-lg border border-[#E7C477]/40 px-3 text-[#E7C477] disabled:opacity-50">
          {busy === 'suggest' ? 'Analyzing failed step…' : temporary ? 'Review retry' : 'Suggest a repair'}
        </button>
        <p className="text-xs text-zinc-400">{temporary ? 'Reviewing this retry does not call an AI model.' : 'Analysis uses the selected model and may incur provider usage. It checks the instructions and error, without inspecting the images.'} No generation starts until you approve.</p>
      </div>}
      {proposal && <div aria-label="Repair suggestion" className="space-y-2 rounded-lg border border-[#E7C477]/20 bg-[#E7C477]/5 p-3">
        <p className="font-medium text-zinc-100">{proposal.action === 'review' ? 'Your input is needed' : proposal.action === 'retry' ? 'Retry the original instruction' : 'Suggested change'}</p>
        <p className="whitespace-pre-wrap break-words">{proposal.reason}</p>
        {proposal.model && <p className="text-xs text-zinc-400">Suggested by {proposal.model}. Review it before retrying.</p>}
      </div>}
      <details className="text-xs text-zinc-400"><summary className="cursor-pointer py-2">Original instruction</summary><p className="whitespace-pre-wrap break-words">{detail.prompt}</p></details>
      <label className="block">Instruction for the retry
        <textarea aria-label="Repair instructions" value={prompt} disabled={!!busy || stale} maxLength={20000} onChange={e => setPrompt(e.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/20 p-3 text-zinc-100 disabled:opacity-50" rows={4} />
      </label>
      {proposal?.proposedPrompt && prompt !== proposal.proposedPrompt && <p className="text-xs text-zinc-400">You edited the suggestion. Your text above will be used.</p>}
      <p className="text-xs text-zinc-400">Completed results, source references and the generation model stay the same. The plan continues from this step after the repair succeeds.</p>
      <button disabled={!!busy || stale || !prompt.trim()} onClick={() => void retry()} className="min-h-11 w-full rounded-lg bg-[#E7C477] px-3 py-2 font-medium text-black disabled:opacity-50 sm:w-auto">
        {busy === 'retry' ? 'Starting approved retry…' : 'Approve & retry this step'}
      </button>
      <p className="text-xs text-zinc-400">Retrying may incur another generation charge. Resolve any account or reference issue first.</p>
    </>}
    {busy === 'suggest' && <p role="status" className="text-xs text-zinc-400">Reviewing the failed instruction and completed steps. This can take up to a minute.</p>}
    {error && <p role="alert" className="break-words text-amber-200">{error}</p>}
  </section>;
}
