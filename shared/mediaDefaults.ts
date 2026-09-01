export const DEFAULT_IMAGE_MODEL_ID = 'wavespeed:bytedance/seedream-v5.0-pro';
export const DEFAULT_IMAGE_MODEL_NAME = 'Seedream 5.0 Pro';

// WaveSpeed's current Wan 3.0 image-to-video endpoint. Persona media always
// has a reference image, so I2V is the correct default rather than T2V.
export const DEFAULT_VIDEO_MODEL_ID = 'wavespeed-i2v:alibaba/wan-3.0/image-to-video';
export const DEFAULT_VIDEO_MODEL_NAME = 'Wan 3.0 Image to Video';

type MediaModelLike = {
  id: string;
  name?: string;
  provider?: string;
  type?: string;
};

export type VideoModelType = 'text-to-video' | 'image-to-video' | 'video-to-video';

const normalized = (value?: string) => (value || '').toLowerCase();

export function isWaveSpeedModel(model: MediaModelLike): boolean {
  return normalized(model.id).startsWith('wavespeed') || normalized(model.provider).includes('wavespeed');
}

export function isSeedream5ProModel(model: MediaModelLike): boolean {
  const searchable = `${normalized(model.id)} ${normalized(model.name)}`;
  return !searchable.includes('lite') && (
    searchable.includes('seedream-v5.0-pro') ||
    searchable.includes('seedream-5.0-pro') ||
    searchable.includes('seedream-v5-pro') ||
    searchable.includes('seedream 5.0 pro') ||
    searchable.includes('seedream 5 pro')
  );
}

export function isWan3VideoModel(model: MediaModelLike): boolean {
  const searchable = `${normalized(model.id)} ${normalized(model.name)}`;
  return isWaveSpeedModel(model) && (
    searchable.includes('wan-3.0') ||
    searchable.includes('wan 3.0') ||
    searchable.includes('wan 3 ')
  );
}

export function getVideoModelType(model: MediaModelLike): VideoModelType {
  if (model.type === 'text-to-video' || model.type === 'image-to-video' || model.type === 'video-to-video') {
    return model.type;
  }
  const id = normalized(model.id);
  if (id.startsWith('wavespeed-v2v:') || id.includes('video-to-video') || id.includes('/edit') || id.includes('-v2v')) {
    return 'video-to-video';
  }
  if (id.startsWith('wavespeed-i2v:') || id.includes('image-to-video') || id.includes('-i2v')) {
    return 'image-to-video';
  }
  return 'text-to-video';
}

export function pickDefaultImageModel<T extends MediaModelLike>(models: T[]): T | undefined {
  return models.find(model => model.id === DEFAULT_IMAGE_MODEL_ID)
    || models.find(model => isWaveSpeedModel(model) && isSeedream5ProModel(model))
    || models.find(isSeedream5ProModel)
    || models.find(isWaveSpeedModel)
    || models[0];
}

export function pickDefaultVideoModel<T extends MediaModelLike>(models: T[]): T | undefined {
  return models.find(model => model.id === DEFAULT_VIDEO_MODEL_ID)
    || models.find(model => isWan3VideoModel(model) && (model.type === 'image-to-video' || normalized(model.id).includes('i2v') || normalized(model.id).includes('image-to-video')))
    || models.find(isWan3VideoModel)
    || models.find(model => isWaveSpeedModel(model) && (model.type === 'image-to-video' || normalized(model.id).includes('i2v')))
    || models.find(isWaveSpeedModel)
    || models[0];
}

export function pickDefaultVideoModelForType<T extends MediaModelLike>(
  models: T[],
  type: VideoModelType,
): T | undefined {
  const typedModels = models.filter(model => getVideoModelType(model) === type);

  return typedModels.find(isWan3VideoModel)
    || typedModels.find(isWaveSpeedModel)
    || typedModels[0]
    || pickDefaultVideoModel(models);
}
