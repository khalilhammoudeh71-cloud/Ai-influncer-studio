import { VoiceLifecycleError } from './personaVoiceLifecycle';

/** Only download recordings from this workspace and authenticated owner's folder. */
export async function loadVoiceUploadReferences(samples: unknown, owner: string, storageUrl: string, fetcher: typeof fetch = fetch): Promise<string[]> {
  if (!Array.isArray(samples) || !samples.length || samples.length > 10) throw new VoiceLifecycleError('Choose 1–10 audio files.', 400);
  let total = 0;
  const output: string[] = [];
  for (const sample of samples) {
    if (typeof sample !== 'string') throw new VoiceLifecycleError('Invalid audio reference.', 400);
    if (sample.startsWith('data:audio/')) { total += Buffer.byteLength(sample.split(',')[1] || '', 'base64'); output.push(sample); }
    else {
      let url: URL;
      try { url = new URL(sample); } catch { throw new VoiceLifecycleError('Invalid audio reference.', 400); }
      const path = decodeURIComponent(url.pathname);
      if (!storageUrl || url.origin !== new URL(storageUrl).origin || url.protocol !== 'https:' || !path.startsWith(`/storage/v1/object/sign/workspace-media/${owner}/audio/`) || path.split('/').includes('..')) throw new VoiceLifecycleError('This recording is not in your workspace.', 403);
      const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
      if (!response.ok || !response.body) throw new VoiceLifecycleError('Could not open uploaded audio. Upload it again.', 400);
      const mime = (response.headers.get('content-type') || '').split(';')[0];
      if (!mime.startsWith('audio/')) throw new VoiceLifecycleError('The uploaded file is not audio.', 400);
      const chunks: Uint8Array[] = [];
      const reader = response.body.getReader();
      try {
        for (;;) { const {done,value} = await reader.read(); if (done) break; total += value.byteLength; if (total > 20 * 1024 * 1024) { await reader.cancel(); throw new VoiceLifecycleError('Audio exceeds the 20 MB total limit.', 400); } chunks.push(value); }
      } finally { reader.releaseLock(); }
      output.push(`data:${mime};base64,${Buffer.concat(chunks).toString('base64')}`);
    }
    if (total > 20 * 1024 * 1024) throw new VoiceLifecycleError('Audio exceeds the 20 MB total limit.', 400);
  }
  return output;
}
