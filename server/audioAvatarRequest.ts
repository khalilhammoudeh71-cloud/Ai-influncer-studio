// AI Talking Photos now accepts text and generates its own voice. Existing
// studio callers supply a selected voice/audio, so retain it with InfiniteTalk.
export function audioAvatarModel(model?:string):string {
  return !model || model==='wavespeed-ai/ai-talking-photos' ? 'wavespeed-ai/infinitetalk' : model;
}
export function buildAudioAvatarRequest(image:string,audio:string) {
  if(!image)throw new Error('A verified image is required');
  if(!audio)throw new Error('Speech audio is required');
  return {image,audio,resolution:'480p'};
}
