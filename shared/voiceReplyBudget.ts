/** Keep social turns short, but leave room to answer calculations and multi-part requests. */
export function needsDetailedVoiceReply(turn: string): boolean {
  return /\b(?:explain|in detail|walk me through|tell me more|give me the steps|calculate|how much|how many)\b/i.test(turn)
    || /(?:اشرح|فسر|فصّل|فصل|بالتفصيل|احسب|حساب|قديش|كم|خطوة|خطوات)/u.test(turn)
    || (turn.match(/[?؟]/g)?.length || 0) > 1;
}
