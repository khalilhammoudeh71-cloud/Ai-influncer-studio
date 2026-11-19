import { useState } from 'react';
import { passReasons, type IdeaEntry } from '../../shared/agentIdeaLibrary';
import type { ReelIdea } from '../../shared/agentReelIdeas';

const buttonClass = 'min-h-11 rounded-lg border border-white/20 px-3 text-xs font-semibold hover:border-[#E7C477]/50 disabled:opacity-50';
export function AgentIdeaCard({ idea, picked, entry, busy, onFeedback, onBuild, onRemix, onForget }: {
  idea: ReelIdea; picked?: boolean; entry?: IdeaEntry; busy: boolean;
  onFeedback: (status: 'saved' | 'passed', reason?: string) => void;
  onBuild: () => void; onRemix: () => void; onForget: () => void;
}) {
  const [passing, setPassing] = useState(false);
  return <article className="space-y-2 rounded-xl border border-white/15 bg-black/20 p-3">
    <h3 className="text-sm font-semibold text-zinc-100">{idea.title}{picked && <span className="ml-2 text-xs text-[#E7C477]">Agent’s pick</span>}</h3>
    <p><strong>First two seconds:</strong> {idea.opening}</p>
    <p><strong>Payoff:</strong> {idea.payoff}</p>
    <p><strong>Why people would share:</strong> {idea.shareReason}</p>
    {entry && <p role="status" className="text-xs text-[#E7C477]">{({ saved: 'Saved', passed: 'Passed', remixed: 'Remix requested', built: 'Build requested' })[entry.status]}{entry.reason ? ` · ${entry.reason}` : ''}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={buttonClass} disabled={busy} aria-pressed={entry?.saved === true} onClick={() => { onFeedback('saved'); setPassing(false); }}>{entry?.saved ? 'Saved' : 'Save'}</button>
      <button type="button" className={buttonClass} disabled={busy} aria-expanded={passing} onClick={() => setPassing(value => !value)}>Pass</button>
      <button type="button" className={buttonClass} disabled={busy} onClick={onRemix}>Remix</button>
      <button type="button" className={`${buttonClass} text-[#E7C477]`} disabled={busy} onClick={onBuild}>Build this idea</button>
      {entry && <button type="button" className={buttonClass} disabled={busy} onClick={onForget}>Forget feedback</button>}
    </div>
    {passing && <div className="flex flex-wrap gap-2" aria-label="Why pass on this idea?">
      <span className="w-full text-xs text-zinc-400">Why pass?</span>
      {[...passReasons, 'Just pass'].map(reason => <button key={reason} type="button" className={buttonClass} disabled={busy}
        onClick={() => { onFeedback('passed', reason === 'Just pass' ? undefined : reason); setPassing(false); }}>{reason}</button>)}
    </div>}
  </article>;
}
