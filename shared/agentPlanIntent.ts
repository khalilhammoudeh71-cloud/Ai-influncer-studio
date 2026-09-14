/** A plan can be requested for review without authorizing any tool execution. */
export function requestsPlanReview(request: string): boolean {
  return /\b(?:prepare|draft|propose|create|show|give|make)\b[^.!?\n]*\b(?:plan|steps)\b/i.test(request)
    || /\b(?:plan|steps)\b[^.!?\n]*\bfor (?:my |our )?(?:review|approval)\b/i.test(request);
}

export function blocksAgentPlan(request: string): boolean {
  const describing=request.replace(/\bwait for (?:my |our )?approval\b/gi,'');
  if (/\b(?:text[- ]only|wait|still (?:describing|explaining))\b/i.test(describing)) return true;
  const explicitlyHeld = /\b(?:do not|don't) (?:create|generate|execute|publish|run|start)\b|\bnot yet\b/i.test(request);
  return explicitlyHeld && !requestsPlanReview(request);
}

export function blocksAgentExecution(request: string): boolean {
  return requestsPlanReview(request) || blocksAgentPlan(request)
    || /\bbefore (?:executing|running|starting|generating|publishing)\b/i.test(request)
    || /\b(?:do not|don't) (?:create|generate|execute|publish|run|start)\b|\bnot yet\b|\bwait for (?:my |our )?approval\b/i.test(request);
}
