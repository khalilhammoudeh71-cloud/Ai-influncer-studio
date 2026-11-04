import assert from 'node:assert/strict';
import test from 'node:test';
import { agentCostLabel, agentEscalationLabel } from './agentMode';

test('agent escalation label stays quiet for one attempt and reports multi-tier runs', () => {
  assert.equal(agentEscalationLabel(undefined), '');
  assert.equal(agentEscalationLabel(1), '');
  assert.equal(agentEscalationLabel(2), ' · 2 tiers');
  assert.equal(agentEscalationLabel(4), ' · 4 tiers');
});

test('agent cost label clearly marks catalog-derived prices as estimates', () => {
  assert.equal(agentCostLabel(undefined), '');
  assert.equal(agentCostLabel(0.001234), ' · est. $0.00123');
});
