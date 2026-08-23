import type { ModelInfo } from '../services/imageService';

export type MediaModelKind = 'image' | 'video';

export type MediaModelSelection =
  | { explicit: false; prompt: string }
  | { explicit: true; matched: false; prompt: string; requestedText: string }
  | {
      explicit: true;
      matched: true;
      prompt: string;
      requestedText: string;
      modelId: string;
      modelName: string;
    };

type AvailableModel = Pick<ModelInfo, 'id' | 'name' | 'provider'>;

const normalize = (value: string) => value
  .toLowerCase()
  .replace(/\b2\.0\b/g, '2')
  .replace(/\b3\.0\b/g, '3')
  .replace(/\b4\.0\b/g, '4')
  .replace(/\b5\.0\b/g, '5')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(?:the|model|image|video|ai)\b/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function modelAliases(model: AvailableModel): string[] {
  const searchable = normalize(`${model.name} ${model.id} ${model.provider || ''}`);
  const aliases = new Set([
    normalize(model.name),
    normalize(model.id),
    normalize(`${model.provider || ''} ${model.name}`),
  ]);

  if (/\bgpt image 2\b/.test(searchable) || /\bgpt 2\b/.test(searchable)) {
    ['gpt 2', 'gpt 2.0', 'gpt image 2', 'gpt image 2.0', 'openai gpt 2'].forEach(alias => aliases.add(normalize(alias)));
  }
  if (/\bseedream (?:v )?5\b/.test(searchable)) {
    ['seedream 5', 'seedream 5.0', 'seedream 5 pro', 'seedream 5.0 pro'].forEach(alias => aliases.add(normalize(alias)));
  }
  if (/\bqwen 3\b/.test(searchable)) {
    ['qwen 3', 'qwen 3.0', 'qwen 3 pro', 'qwen 3.0 pro'].forEach(alias => aliases.add(normalize(alias)));
  }
  if (/\bqwen 2\b/.test(searchable)) {
    ['qwen 2', 'qwen 2.0', 'qwen 2 pro', 'qwen 2.0 pro'].forEach(alias => aliases.add(normalize(alias)));
  }
  if (/\bseedance 2 5\b/.test(searchable)) {
    ['seedance 2.5', 'seedance 2.5 pro'].forEach(alias => aliases.add(normalize(alias)));
  }
  if (/\bseedance 2 mini\b/.test(searchable)) {
    ['seedance 2 mini', 'seedance 2.0 mini'].forEach(alias => aliases.add(normalize(alias)));
  }
  if (/\bveo 3 1\b/.test(searchable)) aliases.add(normalize('veo 3.1'));
  if (/\bkling 3\b/.test(searchable)) aliases.add(normalize('kling 3'));
  if (/\bnano banana pro\b/.test(searchable)) aliases.add(normalize('nano banana pro'));
  if (/\bimagen 4 ultra\b/.test(searchable)) aliases.add(normalize('imagen 4 ultra'));

  return [...aliases].filter(Boolean);
}

function findModel(requestedText: string, models: AvailableModel[]): AvailableModel | undefined {
  const requested = normalize(requestedText);
  if (!requested) return undefined;

  const ranked = models.map(model => {
    const aliases = modelAliases(model);
    let score = 0;
    for (const alias of aliases) {
      if (alias === requested) score = Math.max(score, 100);
      else if (alias.endsWith(` ${requested}`) || alias.startsWith(`${requested} `)) score = Math.max(score, 90);
      else if (alias.includes(requested) && requested.length >= 5) score = Math.max(score, 80);
    }
    return { model, score };
  }).filter(entry => entry.score > 0);

  ranked.sort((a, b) => b.score - a.score || a.model.name.length - b.model.name.length);
  return ranked[0]?.model;
}

interface DirectiveMatch {
  start: number;
  end: number;
  requestedText: string;
  reportUnknown: boolean;
}

function extractDirective(prompt: string, models: AvailableModel[]): DirectiveMatch | undefined {
  const patterns: Array<{ regex: RegExp; reportUnknown: boolean }> = [
    {
      regex: /(?:^|[,;\n]\s*|\s+)(?:please\s+)?(?:use|using|via)\s+(?:the\s+)?(?:(?:image|video)\s+)?(?:model\s+)?["']?([a-z0-9][a-z0-9 .+_\/-]{0,60}?)["']?(?:\s+please)?[.!?]?\s*$/i,
      reportUnknown: true,
    },
    {
      regex: /(?:^|[,;\n]\s*|\s+)(?:with\s+)?(?:the\s+)?(?:image|video)\s+model\s*[:=\-]?\s*["']?([a-z0-9][a-z0-9 .+_\/-]{0,60}?)["']?[.!?]?\s*$/i,
      reportUnknown: true,
    },
    {
      regex: /(?:^|[,;\n]\s*|\s+)with\s+(?:the\s+)?["']?([a-z0-9][a-z0-9 .+_\/-]{0,60}?)["']?\s+model[.!?]?\s*$/i,
      // Only treat "with … model" as a directive when it resolves to a real
      // catalog entry; otherwise phrases such as "with a fashion model" are
      // ordinary scene descriptions.
      reportUnknown: false,
    },
  ];

  for (const { regex, reportUnknown } of patterns) {
    const match = regex.exec(prompt);
    if (!match) continue;
    const requestedText = match[1].trim();
    if (reportUnknown || findModel(requestedText, models)) {
      return { start: match.index, end: match.index + match[0].length, requestedText, reportUnknown };
    }
  }

  return undefined;
}

/**
 * Reads an explicit, end-of-request model directive such as "use GPT 2.0".
 * The model must exist in the live catalog supplied by the app. Keeping the
 * directive at the end avoids mistaking ordinary scene descriptions for a
 * model selection.
 */
export function resolveMediaModelFromPrompt(
  rawPrompt: string,
  models: AvailableModel[],
  _kind: MediaModelKind,
): MediaModelSelection {
  const prompt = rawPrompt.trim();
  const directive = extractDirective(prompt, models);
  if (!directive) return { explicit: false, prompt };

  const cleanedPrompt = `${prompt.slice(0, directive.start)} ${prompt.slice(directive.end)}`
    .replace(/[\s,;:.-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim() || prompt;
  const model = findModel(directive.requestedText, models);

  if (!model) {
    return {
      explicit: true,
      matched: false,
      prompt: cleanedPrompt,
      requestedText: directive.requestedText,
    };
  }

  return {
    explicit: true,
    matched: true,
    prompt: cleanedPrompt,
    requestedText: directive.requestedText,
    modelId: model.id,
    modelName: model.name,
  };
}
