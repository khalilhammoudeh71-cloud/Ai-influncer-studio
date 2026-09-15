const WAN_RATIOS = new Set(['16:9', '9:16', '1:1', '4:3', '3:4']);

/** Wan's optional ratio adapts to the input image when omitted.
 * https://wavespeed.ai/docs/docs-api/alibaba/alibaba-wan-3.0-image-to-video
 */
export function resolveVideoAspectRatio(modelId: string, ratio: string | undefined, hasSourceImage: boolean): string | undefined {
  const isWanImageToVideo = /^wavespeed-i2v:alibaba\/wan-3\.0(?:-prime)?\/image-to-video$/.test(modelId);
  if (isWanImageToVideo && hasSourceImage && ratio && !WAN_RATIOS.has(ratio)) return undefined;
  return ratio;
}
