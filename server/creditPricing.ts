export type GenerationKind = 'image' | 'video' | 'speech' | 'avatar';

export interface GenerationQuote {
  kind: GenerationKind;
  provider: string;
  modelId?: string;
  count: number;
  providerCostUsd: number;
  providerCostMicrousd: number;
  credits: number;
  quoteSource: string;
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function creditRetailValueUsd(): number {
  // $0.04 closely matches the studio's 500-credit pack ($19 / 500).
  return positiveNumber(process.env.CREDIT_RETAIL_VALUE_USD, 0.04);
}

export function generationCostMultiplier(): number {
  return positiveNumber(process.env.GENERATION_COST_MULTIPLIER, 2);
}

export function creditsFromProviderCost(providerCostUsd: number, count = 1): number {
  const safeCount = Math.max(1, Math.floor(count || 1));
  const safeCost = Math.max(0, Number(providerCostUsd) || 0);
  const retailCost = safeCost * generationCostMultiplier() * safeCount;
  return Math.max(1, Math.ceil(retailCost / creditRetailValueUsd()));
}

export function createGenerationQuote(input: {
  kind: GenerationKind;
  provider: string;
  modelId?: string;
  count?: number;
  providerCostUsd: number;
  quoteSource: string;
}): GenerationQuote {
  const count = Math.max(1, Math.floor(input.count || 1));
  const providerCostUsd = Math.max(0, Number(input.providerCostUsd) || 0);
  return {
    kind: input.kind,
    provider: input.provider,
    modelId: input.modelId,
    count,
    providerCostUsd,
    providerCostMicrousd: Math.round(providerCostUsd * count * 1_000_000),
    credits: creditsFromProviderCost(providerCostUsd, count),
    quoteSource: input.quoteSource,
  };
}
