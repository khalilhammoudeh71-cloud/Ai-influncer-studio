export type ReelIdea = {
  title: string;
  opening: string;
  payoff: string;
  shareReason: string;
};

type ReelIdeaBoard = { ideas: ReelIdea[]; pick: number; reason: string };
const fields = ['title', 'opening', 'payoff', 'shareReason'] as const;

export function readReelIdeas(text: string, maxIdeas = 5): ReelIdeaBoard | null {
  try {
    const json = text.trim().replace(/^```(?:json)?\s*([\s\S]*?)```$/i, '$1');
    const value = JSON.parse(json);
    if (!Array.isArray(value?.ideas) || value.ideas.length < 3 || value.ideas.length > maxIdeas
        || !Number.isInteger(value.pick) || value.pick < 0 || value.pick >= value.ideas.length
        || typeof value.reason !== 'string' || !value.reason.trim() || value.reason.length > 500) return null;
    const ideas: ReelIdea[] = [];
    const titles = new Set<string>();
    for (const idea of value.ideas) {
      if (!idea || fields.some(field => typeof idea[field] !== 'string' || !idea[field].trim() || idea[field].length > (field === 'title' ? 120 : 450))) return null;
      const title = idea.title.trim().toLowerCase();
      if (titles.has(title)) return null;
      titles.add(title);
      ideas.push({ title: idea.title.trim(), opening: idea.opening.trim(), payoff: idea.payoff.trim(), shareReason: idea.shareReason.trim() });
    }
    return { ideas, pick: value.pick, reason: value.reason.trim() };
  } catch { return null; }
}

export const reelBuildRequest = 'Draft a production plan for review for this selected reel idea.';

export function buildReelIdeaBrief(idea: ReelIdea, direction?: string): string {
  return [
    reelBuildRequest,
    `Title: ${idea.title}`,
    `First two seconds: ${idea.opening}`,
    `Payoff: ${idea.payoff}`,
    `Why viewers would share it: ${idea.shareReason}`,
    direction?.trim() && `Creator direction for this plan: ${direction.trim()}`,
    'Keep the hook and payoff recognizable. Aim for a 35–60 second vertical reel unless the creator directs otherwise. Write the actual dialogue, timed beats, shot instructions, and notes for captions, audio, and editing. Put the hook on-screen immediately, trim exposition, and make the joke understandable with sound off.',
    'Fit the production approach to the creator’s tools, budget and time. For shots the creator will film, provide filming directions and only propose studio steps for assets they need from the app. Break complex action into achievable shots. Where a later video depends on a still, reference that exact earlier step by index. Flag any parts that need manual editing. Present the plan for approval before generating or publishing anything.',
  ].filter(Boolean).join('\n');
}
