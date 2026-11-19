import type { GeneralTaskResult } from '../../shared/agentGeneralTask';
export function AgentTaskResult({ task, busy, onContinue }: { task: GeneralTaskResult; busy: boolean; onContinue: () => void }) {
  function download(file: GeneralTaskResult['artifacts'][number]) {
    const url = URL.createObjectURL(new Blob([file.content], { type: file.mimeType + ';charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = file.name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section aria-label="Task results" className="mt-3 space-y-3 rounded-xl border border-white/15 p-3 text-xs text-zinc-300">
    <p className="font-semibold text-[#E7C477]">{task.status === 'complete' ? 'Task complete' : task.status === 'needs_input' ? 'Needs your input' : 'Partially completed'}</p>
    {!!task.plan.length && <ol className="list-decimal space-y-1 pl-5">{task.plan.map((step, i) => <li key={i}>{step}</li>)}</ol>}
    <details><summary className="min-h-8 cursor-pointer">Tools &amp; checks ({task.trace.length})</summary>
      <ul className="space-y-2 py-2">{task.trace.map(entry => <li key={entry.id}><strong>{entry.tool} · {entry.status}</strong><p className="whitespace-pre-wrap break-words">{entry.summary}</p></li>)}</ul>
      {task.checks.map((check, i) => <p key={i} className="mt-1">{check}</p>)}
      <p className="mt-2">{task.modelCalls} task-model calls. Task processing, research and PDF extraction can add API charges beyond the initial planning cost.
        {task.inputTokens !== undefined ? ` Reported input tokens: ${task.inputTokens}.` : ''}
        {task.outputTokens !== undefined ? ` Reported output tokens: ${task.outputTokens}.` : ''}</p>
    </details>
    {!!task.artifacts.length && <div className="flex flex-wrap gap-2">{task.artifacts.map(file => <button type="button" key={file.id} onClick={() => download(file)} className="min-h-11 rounded-lg border border-[#E7C477]/35 px-3 font-semibold text-[#E7C477]">Download {file.name}</button>)}</div>}
    {task.status === 'partial' && <button type="button" disabled={busy} onClick={onContinue} className="min-h-11 rounded-lg border border-white/20 px-3 disabled:opacity-50">Continue task</button>}
  </section>;
}
