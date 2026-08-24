import { authFetch, type PersonaMediaQualityReport, type PersonaMediaRequest, type PersonaMediaResult } from './imageService';
import { compressForUpload } from '../utils/imageProcessing';

export type MediaJobKind = 'image' | 'video' | 'edit' | 'upscale' | 'avatar';
export type MediaJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

export interface MediaJobResult {
  url: string;
  type?: 'image' | 'video';
  model?: string;
  imageUrl?: string;
  images?: Array<{ imageUrl: string; model?: string; promptUsed?: string }>;
  videoUrl?: string;
  promptUsed?: string;
  message?: string;
  participants?: string[];
  isRevision?: boolean;
  parentImageUrl?: string;
  quality?: PersonaMediaQualityReport | null;
  qualityRetried?: boolean;
}

export interface MediaJob {
  id: string;
  personaClientId: string | null;
  kind: MediaJobKind;
  status: MediaJobStatus;
  summary: string;
  result: MediaJobResult | null;
  error: string | null;
  modelId: string | null;
  fallbackModelId: string | null;
  attempt: number;
  usedFallback: boolean;
  progress: number;
  stage: string;
  cancelRequested: boolean;
  isStale: boolean;
  createdAt: string;
  startedAt: string | null;
  updatedAt: string;
  completedAt: string | null;
}

function notifyMediaJobsChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('media-job-updated'));
}

async function readJobResponse(response: Response): Promise<{ job?: MediaJob; error?: string }> {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return { error: `Media job request failed (${response.status})` };
  }
  return response.json();
}

export async function createMediaJob(kind: MediaJobKind, personaClientId: string | undefined, request: Record<string, unknown>): Promise<MediaJob> {
  const response = await authFetch('/api/media-jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, personaClientId, request }),
  });
  const data = await readJobResponse(response);
  if (!response.ok || !data.job) throw new Error(data.error || 'Could not save this media job');
  notifyMediaJobsChanged();
  return data.job;
}

export async function runMediaJob(jobId: string, useFallback = false): Promise<MediaJob> {
  const response = await authFetch(`/api/media-jobs/${encodeURIComponent(jobId)}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ useFallback }),
  });
  const data = await readJobResponse(response);
  notifyMediaJobsChanged();
  if (!response.ok || !data.job) {
    const error = new Error(data.error || 'Media generation failed') as Error & { job?: MediaJob };
    error.job = data.job;
    throw error;
  }
  if (data.job.status === 'succeeded') return data.job;
  return waitForMediaJob(jobId, data.job);
}

export async function getMediaJob(jobId: string): Promise<MediaJob> {
  const response = await authFetch(`/api/media-jobs/${encodeURIComponent(jobId)}`);
  const data = await readJobResponse(response);
  if (!response.ok || !data.job) throw new Error(data.error || 'Could not load this media job');
  return data.job;
}

export async function waitForMediaJob(jobId: string, initialJob?: MediaJob): Promise<MediaJob> {
  const deadline = Date.now() + 45 * 60 * 1000;
  let job = initialJob || await getMediaJob(jobId);
  while (job.status === 'queued' || job.status === 'running') {
    if (Date.now() >= deadline) {
      const error = new Error('This generation is still running in the background. You can close this page and check Jobs later.') as Error & { job?: MediaJob };
      error.job = job;
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 2500));
    job = await getMediaJob(jobId);
    notifyMediaJobsChanged();
  }
  if (job.status === 'failed' || job.status === 'canceled') {
    const error = new Error(job.status === 'canceled' ? 'Media generation canceled' : job.error || 'Media generation failed') as Error & { job?: MediaJob };
    error.job = job;
    throw error;
  }
  return job;
}

export async function cancelMediaJob(jobId: string): Promise<MediaJob> {
  const response = await authFetch(`/api/media-jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' });
  const data = await readJobResponse(response);
  if (!response.ok || !data.job) throw new Error(data.error || 'Could not cancel this media job');
  notifyMediaJobsChanged();
  return data.job;
}

export async function createAndRunMediaJob(kind: MediaJobKind, personaClientId: string | undefined, request: Record<string, unknown>): Promise<MediaJob> {
  const job = await createMediaJob(kind, personaClientId, request);
  try {
    return await runMediaJob(job.id);
  } catch (error: any) {
    if (!error?.job && /failed \(5\d\d\)|network|fetch/i.test(error?.message || '')) {
      const savedError = new Error('The provider connection was interrupted, but your job is saved. Open Jobs to check it or retry.') as Error & { job?: MediaJob };
      savedError.job = job;
      throw savedError;
    }
    throw error;
  }
}

export async function listMediaJobs(personaClientId?: string): Promise<MediaJob[]> {
  const suffix = personaClientId ? `?personaId=${encodeURIComponent(personaClientId)}` : '';
  const response = await authFetch(`/api/media-jobs${suffix}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not load media jobs');
  return Array.isArray(data.jobs) ? data.jobs : [];
}

export async function deleteMediaJob(jobId: string): Promise<void> {
  const response = await authFetch(`/api/media-jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 204) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Could not remove media job');
  }
  notifyMediaJobsChanged();
}

export async function requestPersonaMediaJob(params: PersonaMediaRequest): Promise<PersonaMediaResult> {
  // Keep the saved request small while retaining enough context for unsaved/local personas.
  // The server reloads the canonical persona and creator profile for the signed-in account.
  const persona = params.persona;
  const compactRequest = {
    ...params,
    persona: {
      id: persona.id,
      name: persona.name,
      niche: persona.niche,
      tone: persona.tone,
      bio: persona.bio,
      visualStyle: persona.visualStyle,
      faceDescriptor: persona.faceDescriptor,
      avatar: persona.avatar,
      referenceImage: persona.referenceImage,
      alternateReferenceImage: persona.alternateReferenceImage,
      additionalReferenceImages: persona.additionalReferenceImages,
    },
  };
  const job = await createAndRunMediaJob(params.type, persona.id, compactRequest as unknown as Record<string, unknown>);
  const result = job.result;
  if (!result?.url) throw new Error(job.error || `${params.type === 'image' ? 'Image' : 'Video'} generation failed`);
  return {
    success: true,
    type: params.type,
    url: result.url,
    model: result.model,
    promptUsed: result.promptUsed,
    message: result.message || `Done — your ${params.type} is ready.`,
    participants: result.participants,
    isRevision: result.isRevision,
    parentImageUrl: result.parentImageUrl,
    quality: result.quality,
    qualityRetried: result.qualityRetried,
  };
}

async function compressRequestImages(request: Record<string, unknown>) {
  const compressed = { ...request };
  for (const key of ['referenceImage', 'sourceImage', 'additionalImage', 'maskImage'] as const) {
    if (typeof compressed[key] === 'string' && compressed[key]) {
      compressed[key] = await compressForUpload(compressed[key] as string);
    }
  }
  if (Array.isArray(compressed.additionalImages)) {
    compressed.additionalImages = await Promise.all(compressed.additionalImages.map(image => (
      typeof image === 'string' && image ? compressForUpload(image) : image
    )));
  }
  return compressed;
}

export async function studioImageJob(personaClientId: string | undefined, request: Record<string, unknown>) {
  const compactRequest = await compressRequestImages({ ...request, requestMode: 'studio' });
  const job = await createAndRunMediaJob('image', personaClientId, compactRequest);
  if (!job.result?.url) throw new Error(job.error || 'Image generation failed');
  if (job.result.images?.length) {
    return job.result.images.map(image => ({
      imageUrl: image.imageUrl,
      model: image.model || job.result?.model || String(request.modelId || ''),
      promptUsed: image.promptUsed || job.result?.promptUsed || '',
    }));
  }
  return {
    imageUrl: job.result.url,
    model: job.result.model || String(request.modelId || ''),
    promptUsed: job.result.promptUsed || '',
  };
}

export async function studioVideoJob(personaClientId: string | undefined, request: Record<string, unknown>) {
  const compactRequest = await compressRequestImages({ ...request, requestMode: 'studio' });
  const job = await createAndRunMediaJob('video', personaClientId, compactRequest);
  if (!job.result?.url) throw new Error(job.error || 'Video generation failed');
  return { videoUrl: job.result.url, model: job.result.model || String(request.modelId || '') };
}

export async function editImageJob(
  personaClientId: string | undefined,
  sourceImage: string,
  prompt: string,
  modelId: string,
  additionalImage?: string,
  maskImage?: string,
) {
  const compressedSource = await compressForUpload(sourceImage);
  const compressedAdditional = additionalImage ? await compressForUpload(additionalImage) : undefined;
  const compressedMask = maskImage ? await compressForUpload(maskImage) : undefined;
  const job = await createAndRunMediaJob('edit', personaClientId, {
    sourceImage: compressedSource,
    prompt,
    modelId,
    additionalImage: compressedAdditional,
    maskImage: compressedMask,
  });
  if (!job.result?.url) throw new Error(job.error || 'Image editing failed');
  return { imageUrl: job.result.url, model: job.result.model || modelId };
}

export async function upscaleImageJob(personaClientId: string | undefined, sourceImage: string, modelId: string, targetResolution?: string) {
  const compressedSource = await compressForUpload(sourceImage);
  const job = await createAndRunMediaJob('upscale', personaClientId, { sourceImage: compressedSource, modelId, targetResolution });
  if (!job.result?.url) throw new Error(job.error || 'Image upscaling failed');
  return { imageUrl: job.result.url, model: job.result.model || modelId };
}

export async function talkingAvatarJob(personaClientId: string | undefined, request: Record<string, unknown>) {
  const portraitImage = typeof request.portraitImage === 'string'
    ? await compressForUpload(request.portraitImage)
    : request.portraitImage;
  const job = await createAndRunMediaJob('avatar', personaClientId, { ...request, portraitImage });
  if (!job.result?.url) throw new Error(job.error || 'Talking avatar generation failed');
  return { videoUrl: job.result.url, model: job.result.model || String(request.model || 'Talking Avatar') };
}
