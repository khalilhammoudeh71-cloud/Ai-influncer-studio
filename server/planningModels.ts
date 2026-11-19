import type { PlanningModel } from '../shared/planningModels';

export interface PlanningModelRoute {
  provider: string;
  model: string;
}

const publisherPrefix = /^(deepseek-ai|deepseek|meta-llama|meta|qwen|alibaba|openai|google|x-ai|xai|anthropic|mistralai|minimax|z-ai|zai-org|moonshotai|bytedance)\//;

export function planningModelId(model: string): string {
  const id = model.toLowerCase().replace(publisherPrefix, '');
  // These gateways spell the same named DeepSeek variants differently.
  return 'catalog:' + id.replace(/^deepseek:v(\d+)@(flash|pro)$/, 'deepseek-v$1-$2');
}

export function listPlanningModels(routes: PlanningModelRoute[]): PlanningModel[] {
  const models = new Map<string, PlanningModel>();
  for (const { provider, model } of routes) {
    const id = planningModelId(model);
    const entry = models.get(id) ?? { id, name: id.slice('catalog:'.length), providers: [] };
    if (!entry.providers.includes(provider)) entry.providers.push(provider);
    models.set(id, entry);
  }
  return [...models.values()];
}

export function isTextPlanningModel(model: string): boolean {
  return !/(?:embed|moderation|rerank|whisper|transcri|speech|[-/](?:tts|audio|image|video|realtime)(?:[-/.]|$)|dall-e|imagen|^veo|^sora|^computer-use)/i.test(model);
}
