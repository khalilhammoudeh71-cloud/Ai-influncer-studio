import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMediaQualityRetryPrompt, parseMediaQualityReport } from './media-quality';

const identityMatch = {
  observedParticipantCount: 1,
  countConfidence: 0.98,
  identities: [{ name: 'Leen Hasan', present: true, verdict: 'match', confidence: 0.95 }],
};

test('fails a render when a confidently requested pose is missing', () => {
  const report = parseMediaQualityReport(JSON.stringify({
    ...identityMatch,
    promptFidelity: [
      { criterion: 'pose', applicable: true, satisfied: false, confidence: 0.94 },
      { criterion: 'lighting', applicable: true, satisfied: true, confidence: 0.90 },
      { criterion: 'text', applicable: true, satisfied: true, confidence: 0.99 },
    ],
  }), ['Leen Hasan']);

  assert.equal(report.status, 'failed');
  assert.match(report.reasons.join(' '), /requested pose/i);
});

test('passes identity and every applicable prompt-fidelity check', () => {
  const report = parseMediaQualityReport(JSON.stringify({
    ...identityMatch,
    promptFidelity: [
      { criterion: 'pose', applicable: true, satisfied: true, confidence: 0.91 },
      { criterion: 'setting', applicable: true, satisfied: true, confidence: 0.88 },
      { criterion: 'gaze', applicable: false, satisfied: null, confidence: 0.95 },
      { criterion: 'wardrobe', applicable: true, satisfied: true, confidence: 0.93 },
      { criterion: 'lighting', applicable: true, satisfied: true, confidence: 0.89 },
      { criterion: 'framing', applicable: true, satisfied: true, confidence: 0.86 },
      { criterion: 'text', applicable: true, satisfied: true, confidence: 0.99 },
    ],
  }), ['Leen Hasan']);

  assert.equal(report.status, 'passed');
});

test('adds prompt-checklist correction language to the single retry', () => {
  const report = parseMediaQualityReport(JSON.stringify({
    ...identityMatch,
    promptFidelity: [{ criterion: 'framing', applicable: true, satisfied: false, confidence: 0.9 }],
  }), ['Leen Hasan']);
  const retry = buildMediaQualityRetryPrompt('Seated on the edge of a bed, full torso visible.', ['Leen Hasan'], report);
  assert.match(retry, /visual checklist/i);
  assert.match(retry, /requested framing was not followed/i);
  assert.match(retry, /Seated on the edge of a bed/i);
});
