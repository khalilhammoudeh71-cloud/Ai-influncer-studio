import type { CreationBrief, CreationKind, CreationOutcome } from '../types/creation';

const NAVIGATION_ONLY = new Set([
  'settings',
  'personas',
  'gallery',
  'planner',
  'dashboard',
  'ai toolbox',
  'toolbox',
  'voice studio',
]);

const MODEL_PATTERNS = [
  /\b(?:use|using|with|via)\s+([a-z0-9][a-z0-9 ._-]{1,32}?)(?=\s+(?:model|for|to|in|at|with)\b|[,;]|$)/i,
  /\b([a-z][a-z0-9 ._-]{1,28})\s+model\b/i,
];

function includesAny(value: string, terms: string[]) {
  return terms.some(term => value.includes(term));
}

function resolveKind(query: string): { kind: CreationKind; initialTool?: string } {
  if (includesAny(query, ['talking avatar', 'talking photo', 'speaking avatar', 'lip sync', 'lipsync'])) {
    return { kind: 'talking-avatar' };
  }
  if (includesAny(query, ['upscale', 'increase resolution', 'make it hd', 'make this hd', 'enhance resolution'])) {
    return { kind: 'enhance', initialTool: 'upscaler' };
  }
  if (includesAny(query, ['remove background', 'remove the background', 'remove this background', 'background removal', 'erase background'])) {
    return { kind: 'toolbox', initialTool: 'bg-remover' };
  }
  if (includesAny(query, ['swap face', 'face swap'])) {
    return { kind: 'toolbox', initialTool: 'face-swap' };
  }
  if (includesAny(query, ['try on', 'virtual outfit', 'virtual try-on', 'virtual tryon'])) {
    return { kind: 'toolbox', initialTool: 'virtual-tryon' };
  }
  if (includesAny(query, ['content plan', 'posting plan', 'content calendar', 'schedule posts', 'plan posts'])) {
    return { kind: 'planner' };
  }
  if (includesAny(query, ['create a persona', 'make a persona', 'build a persona', 'new persona', 'new character'])) {
    return { kind: 'persona' };
  }
  if (includesAny(query, ['video', 'reel', 'clip', 'animate', 'animation', 'movie'])) {
    return { kind: 'video' };
  }
  return { kind: 'image' };
}

function resolveOutcome(query: string, kind: CreationKind): CreationOutcome {
  if (includesAny(query, ['adult', 'explicit', 'nsfw', 'uncensored'])) return 'adult';
  if (includesAny(query, ['same face', 'same person', 'identity', 'consistent character', 'face accuracy'])) return 'identity';
  if (includesAny(query, ['anime', 'illustration', 'illustrated', 'cartoon', 'artistic', 'manga'])) return 'artistic';
  if (includesAny(query, ['hyper realistic', 'hyper-realistic', 'photorealistic', 'photo realistic', 'realistic'])) return 'realistic';
  if (includesAny(query, ['fast', 'quick', 'draft', 'preview'])) return 'fast';
  if (includesAny(query, ['instagram', 'tiktok', 'social', 'post-ready', 'social-ready'])) return 'social';
  if (kind === 'video' && includesAny(query, ['cinematic', 'film', 'movie'])) return 'cinematic';
  return 'quality';
}

function resolveAspectRatio(query: string) {
  const explicit = query.match(/\b(21:9|16:9|9:16|4:5|5:4|3:2|2:3|1:1|4:3|3:4)\b/);
  if (explicit) return explicit[1];
  if (includesAny(query, ['story', 'reel', 'tiktok', 'vertical', 'portrait'])) return '9:16';
  if (includesAny(query, ['widescreen', 'landscape', 'youtube'])) return '16:9';
  if (includesAny(query, ['instagram post'])) return '4:5';
  if (includesAny(query, ['square'])) return '1:1';
  return undefined;
}

function resolveRequestedModel(rawQuery: string) {
  for (const pattern of MODEL_PATTERNS) {
    const match = rawQuery.match(pattern);
    if (!match?.[1]) continue;
    const requested = match[1]
      .replace(/^(?:the|a|an)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (requested.length >= 2 && !['best', 'fast', 'quality', 'image', 'video'].includes(requested.toLowerCase())) {
      return requested;
    }
  }
  return undefined;
}

function describe(kind: CreationKind, initialTool?: string) {
  if (kind === 'video') return ['Create a video', 'Open Video Studio with this brief and recommended settings.'];
  if (kind === 'talking-avatar') return ['Create a talking avatar', 'Open Avatar Studio with this script ready to refine.'];
  if (kind === 'enhance') return ['Enhance media', 'Open the upscaler in AI Toolbox.'];
  if (kind === 'toolbox' && initialTool === 'bg-remover') return ['Remove a background', 'Open the background tool with your request in mind.'];
  if (kind === 'toolbox' && initialTool === 'face-swap') return ['Swap a face', 'Open the face-swap tool.'];
  if (kind === 'toolbox') return ['Open the right AI tool', 'Continue in AI Toolbox.'];
  if (kind === 'planner') return ['Build a content plan', 'Continue in Content Planner.'];
  if (kind === 'persona') return ['Create a persona', 'Start a new reusable identity.'];
  return ['Create an image', 'Open Image Studio with this brief and recommended settings.'];
}

export function interpretCreationCommand(rawQuery: string): CreationBrief | null {
  const prompt = rawQuery.trim();
  if (prompt.length < 3 || NAVIGATION_ONLY.has(prompt.toLowerCase())) return null;

  const query = prompt.toLowerCase();
  const hasCreationSignal = includesAny(query, [
    'create', 'generate', 'make', 'show me', 'give me', 'turn this', 'use ',
    'image', 'photo', 'picture', 'video', 'reel', 'clip', 'avatar', 'upscale',
    'enhance', 'background', 'face swap', 'content plan', 'persona', 'anime',
    'photorealistic', 'cinematic', 'illustration',
  ]);
  if (!hasCreationSignal) return null;

  const { kind, initialTool } = resolveKind(query);
  const [title, description] = describe(kind, initialTool);

  return {
    kind,
    prompt,
    outcome: resolveOutcome(query, kind),
    aspectRatio: resolveAspectRatio(query),
    requestedModel: resolveRequestedModel(prompt),
    initialTool,
    title,
    description,
  };
}
