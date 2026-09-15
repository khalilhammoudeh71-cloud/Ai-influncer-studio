export function researchSources(response: any): Array<{title:string;url:string}> {
  const sources = new Map<string, {title:string;url:string}>();
  for (const candidate of response?.candidates || []) {
    for (const chunk of candidate?.groundingMetadata?.groundingChunks || []) {
      const uri = chunk?.web?.uri;
      if (typeof uri !== 'string') continue;
      try {
        const url = new URL(uri);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
        if (!sources.has(url.href)) sources.set(url.href, {title:chunk.web.title || url.hostname, url:url.href});
      } catch {}
    }
  }
  return [...sources.values()].slice(0, 12);
}
