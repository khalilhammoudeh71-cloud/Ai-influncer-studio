import type { MediaJob } from '../services/mediaJobService';
import type { GeneratedImage } from '../types';

export function mediaJobLibraryEntry(job: MediaJob): {personaId:string;media:GeneratedImage}|null {
  if(job.status!=='succeeded'||!job.personaClientId||!job.result?.url)return null;
  const timestamp=Date.parse(job.createdAt);
  return {personaId:job.personaClientId,media:{
    id:`media-job-${job.id}-0`,url:job.result.url,
    prompt:job.result.promptUsed||job.summary||'',timestamp:Number.isFinite(timestamp)?timestamp:0,
    model:job.result.model||job.modelId||undefined,
    mediaType:job.kind==='video'||job.kind==='avatar'?'video':'image',
  }};
}
