import {
  OPENAI_COST_LADDER,
  SUPER_AGENT_RESPONSE_SCHEMA,
  assessCostLadderReply,
  type SuperAgentCandidate,
} from './superAgent';

type LadderOutcome = 'accepted' | 'escalated' | 'error' | 'incomplete';

export interface OpenAIAgentAttempt {
  model: string;
  outcome: LadderOutcome;
  reason?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

interface LadderInput {
  apiKey: string;
  instructions: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  request: string;
  candidates?: SuperAgentCandidate[];
  fetcher?: typeof fetch;
  promptCacheKey?: string;
  deferCampaignReview?: boolean;
  signal?: AbortSignal;
  attemptTimeoutMs?: number;
  totalTimeoutMs?: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

const QUALITY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['shouldEscalate', 'confidence', 'accuracy', 'completeness', 'instructionFollowing', 'reason'],
  properties: {
    shouldEscalate: {
      type: 'boolean',
      description: 'True when this model cannot answer the request accurately and completely enough to show the user.',
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    accuracy: { type: 'string', enum: ['pass', 'uncertain', 'fail'] },
    completeness: { type: 'string', enum: ['pass', 'uncertain', 'fail'] },
    instructionFollowing: { type: 'string', enum: ['pass', 'uncertain', 'fail'] },
    reason: { type: 'string', maxLength: 500 },
  },
} as const;

export const OPENAI_COST_LADDER_RESPONSE_SCHEMA = {
  ...SUPER_AGENT_RESPONSE_SCHEMA,
  required: [...SUPER_AGENT_RESPONSE_SCHEMA.required, 'quality'],
  properties: {
    ...SUPER_AGENT_RESPONSE_SCHEMA.properties,
    quality: QUALITY_SCHEMA,
  },
} as const;

const PRICES_PER_MILLION: Record<string, { input: number; cachedInput: number; output: number }> = {
  'gpt-5.6-luna': { input: 0.20, cachedInput: 0.02, output: 1.20 },
  'gpt-5.6-terra': { input: 2, cachedInput: 0.20, output: 12 },
  'gpt-5.6-sol': { input: 4, cachedInput: 0.40, output: 20 },
  'gpt-6-astra': { input: 10, cachedInput: 1, output: 50 },
};

const reasoningEffort = (model: string): 'low' | 'medium' | 'high' => {
  if (/luna/i.test(model)) return 'low';
  if (/terra/i.test(model)) return 'medium';
  return 'high';
};

function responseText(value: any): string {
  if (typeof value?.output_text === 'string') return value.output_text.trim();
  if (!Array.isArray(value?.output)) return '';
  return value.output.flatMap((item: any) => Array.isArray(item?.content)
    ? item.content.filter((part: any) => part?.type === 'output_text' && typeof part.text === 'string').map((part: any) => part.text)
    : []).join('').trim();
}

function usageFor(value: any, model: string) {
  const inputTokens = Number(value?.usage?.input_tokens) || 0;
  const outputTokens = Number(value?.usage?.output_tokens) || 0;
  const usageReported = Number.isFinite(Number(value?.usage?.input_tokens))
    && Number.isFinite(Number(value?.usage?.output_tokens));
  const cachedTokens = Math.min(
    inputTokens,
    Math.max(0, Number(value?.usage?.input_tokens_details?.cached_tokens) || 0),
  );
  const price = PRICES_PER_MILLION[model];
  const costUsd = price && usageReported
    ? Number(((((inputTokens - cachedTokens) * price.input)
      + (cachedTokens * price.cachedInput)
      + (outputTokens * price.output)) / 1_000_000).toFixed(8))
    : undefined;
  return { inputTokens, outputTokens, costUsd };
}

const QUALITY_INSTRUCTIONS = `
COST-FIRST QUALITY CONTRACT:
- Before returning the response, check factual accuracy, completeness, and instruction-following separately.
- Set quality.shouldEscalate=true if any material claim is unverified, any requested item is missing, the response may be inaccurate, or the required plan cannot be produced completely.
- Mark a dimension "uncertain" instead of guessing. Do not inflate confidence to avoid escalation.
- Set quality.shouldEscalate=false only when all three dimensions pass and confidence is at least 0.82.
- Keep quality.reason short and specific. The server uses this signal to hand the same request to a stronger agent.
Return only the structured response object.`;

export async function runOpenAICostLadder(input: LadderInput) {
  const fetcher = input.fetcher || fetch;
  const candidates = (input.candidates || OPENAI_COST_LADDER).filter(candidate => candidate.provider === 'openai');
  const attempts: OpenAIAgentAttempt[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;
  let pricingComplete = true;
  const totalTimeout = AbortSignal.timeout(input.totalTimeoutMs ?? 120_000);
  const ladderSignal = input.signal
    ? AbortSignal.any([input.signal, totalTimeout])
    : totalTimeout;

  for (const candidate of candidates) {
    if (ladderSignal.aborted) break;
    let response: Response;
    try {
      const attemptSignal = AbortSignal.any([
        ladderSignal,
        AbortSignal.timeout(input.attemptTimeoutMs ?? 45_000),
      ]);
      response = await fetcher('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: attemptSignal,
        body: JSON.stringify({
          model: candidate.model,
          instructions: `${input.instructions}\n${QUALITY_INSTRUCTIONS}`,
          input: input.messages,
          reasoning: { effort: input.reasoningEffort || reasoningEffort(candidate.model) },
          text: {
            verbosity: 'low',
            format: {
              type: 'json_schema',
              name: 'super_agent_cost_ladder_reply',
              strict: true,
              schema: OPENAI_COST_LADDER_RESPONSE_SCHEMA,
            },
          },
          max_output_tokens: 4096,
          store: false,
          ...(input.promptCacheKey ? { prompt_cache_key: input.promptCacheKey } : {}),
        }),
      });
    } catch (error) {
      attempts.push({
        model: candidate.model,
        outcome: 'error',
        reason: error instanceof Error ? error.message : 'OpenAI request failed.',
      });
      if (ladderSignal.aborted) break;
      continue;
    }

    if (!response.ok) {
      attempts.push({ model: candidate.model, outcome: 'error', reason: `OpenAI returned HTTP ${response.status}.` });
      continue;
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      attempts.push({ model: candidate.model, outcome: 'error', reason: 'OpenAI returned unreadable JSON.' });
      continue;
    }

    const usage = usageFor(data, candidate.model);
    inputTokens += usage.inputTokens;
    outputTokens += usage.outputTokens;
    if (usage.costUsd !== undefined) costUsd += usage.costUsd;
    else pricingComplete = false;

    if (data.status !== 'completed' || data.incomplete_details) {
      attempts.push({
        model: candidate.model,
        outcome: 'incomplete',
        reason: data.incomplete_details?.reason || data.error?.message || `OpenAI response status was ${data.status || 'unknown'}.`,
        ...usage,
      });
      continue;
    }

    const assessed = assessCostLadderReply(
      responseText(data),
      input.request,
      input.deferCampaignReview,
    );
    if (!assessed.passed || !assessed.decoded) {
      attempts.push({
        model: candidate.model,
        outcome: 'escalated',
        reason: assessed.reason || 'The quality gate rejected the response.',
        ...usage,
      });
      continue;
    }

    attempts.push({ model: candidate.model, outcome: 'accepted', ...usage });
    return {
      ok: true as const,
      provider: 'openai' as const,
      model: candidate.model,
      decoded: assessed.decoded,
      attempts,
      inputTokens,
      outputTokens,
      costUsd: pricingComplete ? Number(costUsd.toFixed(8)) : undefined,
    };
  }

  return {
    ok: false as const,
    attempts,
    inputTokens,
    outputTokens,
    costUsd: pricingComplete ? Number(costUsd.toFixed(8)) : undefined,
  };
}
