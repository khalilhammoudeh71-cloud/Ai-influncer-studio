export function requestedExactReply(prompt: string): string | null {
  const match = prompt.match(
    /^\s*(?:please\s+)?(?:reply|respond|answer)(?:\s+with)?\s+exactly(?:\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+words?)?\s*[:,-]\s*(.+?)\s*$/i,
  );
  if (!match) return null;

  const numberWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };
  const requestedWordCount = match[1]
    ? (numberWords[match[1].toLowerCase()] ?? Number.parseInt(match[1], 10))
    : null;
  let reply = match[2].trim();
  const wrappers: Array<[string, string]> = [['"', '"'], ["'", "'"], ['“', '”']];
  for (const [open, close] of wrappers) {
    if (reply.startsWith(open) && reply.endsWith(close)) {
      reply = reply.slice(open.length, -close.length).trim();
      break;
    }
  }

  if (!reply || reply.length > 500 || reply.includes('\n')) return null;
  if (requestedWordCount !== null) {
    const actualWordCount = reply.split(/\s+/).filter(Boolean).length;
    if (actualWordCount !== requestedWordCount) return null;
  }

  return reply;
}
