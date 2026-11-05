// GPT Image 2.5 uses token billing. price is the app's configured per-image
// estimate, not a fixed OpenAI price. Keep legacy GPT Image 2 defaults intact.
const models = [
  { id: 'openai:gpt-image-2', apiModel: 'gpt-image-2', name: 'GPT Image 2', description: 'Photorealistic image generation and editing.' },
  { id: 'openai:gpt-image-2.5-flare', apiModel: 'gpt-image-2.5-flare', name: 'GPT Image 2.5 Flare', description: 'Fast everyday image generation and editing. API cost varies with token usage.' },
  { id: 'openai:gpt-image-2.5-sunburst', apiModel: 'gpt-image-2.5-sunburst', name: 'GPT Image 2.5 Sunburst', description: 'Detailed image generation and precise editing. API cost varies with token usage.' },
];
export function getDirectImageModel(id?: string) {
  return models.find(model => model.id === id);
}
export function shouldUseAdultImageFallback(modelId: string, adultRequested: boolean): boolean {
  // Explicit direct OpenAI choices must reach OpenAI and retain its own policy errors.
  return adultRequested && !getDirectImageModel(modelId);
}
export function directImageOptions(id: string, aspectRatio?: string): {quality?: 'high';size: '1024x1024'|'1024x1536'|'1536x1024'|'1024x1792'|'1792x1024'} {
  const landscape=['16:9','3:2','5:4','21:9'].includes(aspectRatio||'');
  const portrait=['9:16','2:3','4:5'].includes(aspectRatio||'');
  if(id.includes('gpt-image-2.5-'))return {quality:'high',size:landscape?'1536x1024':portrait?'1024x1536':'1024x1024'};
  return {size:landscape?'1792x1024':portrait?'1024x1792':'1024x1024'};
}
export function directImageModels() {
  return models.slice(1).map(model => ({
    ...model, provider: 'OpenAI', type: 'text-to-image' as const,
    price: 0.04, apiPath: '', hasEditVariant: true, hasReferenceImage: true,
  }));
}
