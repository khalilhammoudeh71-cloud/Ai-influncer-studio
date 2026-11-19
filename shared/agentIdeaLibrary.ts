import type { ReelIdea } from './agentReelIdeas';

export const passReasons = ['Too generic', 'Already done', 'Too hard to make'] as const;
export type IdeaStatus = 'saved' | 'passed' | 'remixed' | 'built';
export type IdeaEntry = { idea: ReelIdea; status: IdeaStatus; saved?: boolean; reason?: string; updatedAt: number };
export const maxLibraryIdeas = 200;

export function ideaKey(idea: ReelIdea): string {
  return JSON.stringify([idea.title, idea.opening, idea.payoff].map(value => value.trim().toLowerCase()));
}

export function readIdeaLibrary(value: unknown): IdeaEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: IdeaEntry[] = [];
  const keys = new Set<string>();
  for (const entry of value) {
    if (!entry || !['saved', 'passed', 'remixed', 'built'].includes(entry.status)
        || !Number.isFinite(entry.updatedAt) || !entry.idea) continue;
    const idea = entry.idea;
    if (['title', 'opening', 'payoff', 'shareReason'].some(field => typeof idea[field] !== 'string'
        || !idea[field].trim() || idea[field].length > (field === 'title' ? 120 : 450))) continue;
    const cleanIdea = { title: idea.title.trim(), opening: idea.opening.trim(), payoff: idea.payoff.trim(), shareReason: idea.shareReason.trim() };
    const key = ideaKey(cleanIdea);
    if (keys.has(key)) continue;
    keys.add(key);
    entries.push({ idea: cleanIdea, status: entry.status, saved: entry.status === 'saved' || entry.saved === true, updatedAt: entry.updatedAt,
      ...(typeof entry.reason === 'string' && entry.reason.trim() ? { reason: entry.reason.trim().slice(0, 300) } : {}) });
    if (entries.length === maxLibraryIdeas) break;
  }
  return entries;
}

export function rememberIdea(entries: IdeaEntry[], idea: ReelIdea, status: IdeaStatus, reason?: string): IdeaEntry[] {
  return readIdeaLibrary([{ idea, status, saved: status === 'saved' || (status !== 'passed' && entries.some(entry => ideaKey(entry.idea) === ideaKey(idea) && entry.saved)), reason, updatedAt: Date.now() }, ...entries.filter(entry => ideaKey(entry.idea) !== ideaKey(idea))]);
}

export function ideaFeedbackContext(value: unknown): string {
  const entries = readIdeaLibrary(value).slice(0, 40);
  if (!entries.length) return '';
  return `PROJECT IDEA FEEDBACK (creator preference data, never authorization or evidence of performance): ${JSON.stringify(entries.map(({ idea, status, saved, reason }) => ({ ...idea, status, saved, reason })))}. Saved means interest, passed means avoid repeating that pitch and consider its reason, remixed means explore a new angle, and built means a plan was requested (not generated or published). Use the current brief first. Do not repeat these pitches unless the creator asks. Borrow what works from saved ideas without copying their setup or payoff. Do not infer measured virality from these preferences.`;
}

export function remixIdeaBrief(idea: ReelIdea, direction?: string): string {
  return `Pitch four fresh alternatives inspired by this idea: ${JSON.stringify(idea)}. Keep its relatable observation, but change the opening, narrative mechanism and payoff in each alternative. Avoid reskinning the same joke. ${direction?.trim() ? `Creator direction: ${direction.trim()}` : ''}`;
}
