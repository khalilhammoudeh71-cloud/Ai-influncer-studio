export const MEDIA_JOB_STALE_AFTER_MS = 90 * 1000;

export type MediaJobKind = 'image' | 'video' | 'edit' | 'upscale' | 'avatar';
export type MediaJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

export interface MediaJobRecordLike {
  id: string;
  personaClientId?: string | null;
  kind: MediaJobKind | string;
  status: MediaJobStatus | string;
  request: string;
  result?: string | null;
  error?: string | null;
  modelId?: string | null;
  fallbackModelId?: string | null;
  attempt?: number | null;
  usedFallback?: boolean | null;
  progress?: number | null;
  stage?: string | null;
  cancelRequested?: boolean | null;
  createdAt: Date | string;
  startedAt?: Date | string | null;
  updatedAt: Date | string;
  completedAt?: Date | string | null;
}

export function parseMediaJobJson(value?: string | null): Record<string, any> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function summarizeMediaJobRequest(request: Record<string, any>): string {
  const prompt = request?.prompt || request?.script || request?.persona?.name || '';
  if (typeof prompt !== 'string') return '';
  return prompt.trim().slice(0, 240);
}

export function isMediaJobStale(updatedAt: Date | string, now = Date.now()): boolean {
  const value = new Date(updatedAt).getTime();
  return Number.isFinite(value) && now - value >= MEDIA_JOB_STALE_AFTER_MS;
}

export function isRetryableMediaJobFailure(status: number, message: string): boolean {
  const normalized = message.toLowerCase();
  if ([400, 401, 402, 403, 404, 409, 422].includes(status)) return false;
  if (/credit|billing|policy|content filter|moderation|unauthorized|forbidden|missing reference|unknown .*model|not configured/.test(normalized)) {
    return false;
  }
  return status === 408 || status === 429 || status >= 500 || /timeout|timed out|network|busy|overload|temporar|connection|fetch failed/.test(normalized);
}

export function fallbackModelForJob(kind: MediaJobKind, currentModelId?: string | null): string | null {
  if (kind === 'image') {
    return currentModelId?.includes('qwen-3.0-pro') ? 'wavespeed:bytedance/seedream-v5.0-pro' : 'wavespeed:wavespeed-ai/qwen-3.0-pro';
  }
  if (kind === 'edit') {
    return currentModelId?.includes('qwen-3.0-pro')
      ? 'wavespeed-edit:bytedance/seedream-v5.0-pro/edit'
      : 'wavespeed-edit:wavespeed-ai/qwen-3.0-pro/edit';
  }
  if (kind === 'video') {
    return currentModelId?.includes('wan-2.2-i2v')
      ? 'wavespeed-i2v:bytedance/seedance-2-mini'
      : 'wavespeed-i2v:wavespeed-ai/wan-2.2-i2v-720p';
  }
  if (kind === 'upscale') return currentModelId?.startsWith('runware') ? null : 'runware:upscale';
  return null;
}

export function publicMediaJob(record: MediaJobRecordLike, now = Date.now()) {
  const request = parseMediaJobJson(record.request) || {};
  const result = parseMediaJobJson(record.result);
  const stale = record.status === 'running' && isMediaJobStale(record.updatedAt, now);
  return {
    id: record.id,
    personaClientId: record.personaClientId || null,
    kind: record.kind,
    status: record.status,
    summary: summarizeMediaJobRequest(request),
    result,
    error: record.error || null,
    modelId: record.modelId || null,
    fallbackModelId: record.fallbackModelId || null,
    attempt: record.attempt || 0,
    usedFallback: Boolean(record.usedFallback),
    progress: Math.min(100, Math.max(0, Number(record.progress) || 0)),
    stage: stale ? 'Waiting for recovery' : record.stage || (record.status === 'queued' ? 'Queued' : ''),
    cancelRequested: Boolean(record.cancelRequested),
    isStale: stale,
    createdAt: record.createdAt,
    startedAt: record.startedAt || null,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt || null,
  };
}

export function mediaJobLibraryAssets(
  jobId: string,
  personaClientId: string | null | undefined,
  kind: MediaJobKind,
  request: Record<string, any>,
  output: Record<string, any>,
) {
  if (!personaClientId || request.requestMode === 'studio') return [];
  const prompt = String(output.promptUsed || request.prompt || request.script || '').trim();
  const mediaType = kind === 'video' || kind === 'avatar' || output.type === 'video' ? 'video' : 'image';
  const model = output.model || request.modelId || request.imageModelId || request.videoModelId || null;
  const timestamp = Date.now();
  const images = Array.isArray(output.images)
    ? output.images.filter((image: any) => image && typeof image.imageUrl === 'string' && image.imageUrl)
    : [];
  const results = images.length > 0
    ? images.map((image: any) => ({ url: image.imageUrl, model: image.model || model, prompt: image.promptUsed || prompt, mediaType: 'image' }))
    : typeof output.url === 'string' && output.url
      ? [{ url: output.url, model, prompt, mediaType }]
      : [];

  return results.map((result, index) => ({
    clientId: `media-job-${jobId}-${index}`,
    personaClientId,
    url: result.url,
    prompt: result.prompt,
    timestamp,
    isFavorite: false,
    model: result.model,
    mediaType: result.mediaType,
  }));
}
