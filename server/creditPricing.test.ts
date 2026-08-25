import assert from 'node:assert/strict';
import test from 'node:test';
import { createGenerationQuote, creditsFromProviderCost } from './creditPricing';

test('credits are derived from provider cost, retail credit value, and multiplier', () => {
  const previousValue = process.env.CREDIT_RETAIL_VALUE_USD;
  const previousMultiplier = process.env.GENERATION_COST_MULTIPLIER;
  process.env.CREDIT_RETAIL_VALUE_USD = '0.04';
  process.env.GENERATION_COST_MULTIPLIER = '2';
  try {
    assert.equal(creditsFromProviderCost(0.04), 2);
    assert.equal(creditsFromProviderCost(0.04, 3), 6);
    assert.equal(creditsFromProviderCost(0), 1);
  } finally {
    previousValue === undefined ? delete process.env.CREDIT_RETAIL_VALUE_USD : process.env.CREDIT_RETAIL_VALUE_USD = previousValue;
    previousMultiplier === undefined ? delete process.env.GENERATION_COST_MULTIPLIER : process.env.GENERATION_COST_MULTIPLIER = previousMultiplier;
  }
});

test('generation quotes retain auditable provider cost metadata', () => {
  const quote = createGenerationQuote({
    kind: 'image', provider: 'OpenAI', modelId: 'openai:gpt-image-2',
    providerCostUsd: 0.04, count: 2, quoteSource: 'model-catalog',
  });
  assert.equal(quote.providerCostMicrousd, 80_000);
  assert.equal(quote.count, 2);
  assert.equal(quote.quoteSource, 'model-catalog');
});
