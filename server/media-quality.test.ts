import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMediaQualityRetryPrompt, parseMediaQualityReport } from './media-quality';

const identityMatch = {
  observedParticipantCount: 1,
  countConfidence: 0.98,
  identities: [{ name: 'Leen Hasan', present: true, verdict: 'match', confidence: 0.95 }],
};
test('identity and scene uncertainty are reported independently without approving the overall result',()=>{
 const result=parseMediaQualityReport(JSON.stringify({...identityMatch,promptFidelity:[{criterion:'framing',applicable:true,satisfied:false,confidence:0.68}]}),['Leen Hasan']);
 assert.equal(result.identityStatus,'passed');assert.equal(result.sceneStatus,'unavailable');assert.equal(result.status,'unavailable');
 assert.match(result.reasons.join(' '),/framing/i);assert.doesNotMatch(result.reasons.join(' '),/preserved/i);
});
test('identity-only review does not depend on a scene checklist',()=>{
 const result=parseMediaQualityReport(JSON.stringify(identityMatch),['Leen Hasan'],1,{strictFidelity:false});
 assert.equal(result.identityStatus,'passed');assert.equal(result.sceneStatus,'not-requested');assert.equal(result.status,'passed');
});
test('video drift overrides a global match and missing segment evidence remains inconclusive',()=>{
 const temporalChecks=['beginning','middle','end'].map(segment=>({name:'Leen Hasan',segment,verdict:'match',confidence:0.95,faceVisible:true}));
 const inspect=(checks:any[])=>parseMediaQualityReport(JSON.stringify({...identityMatch,temporalChecks:checks}),['Leen Hasan'],1,{video:true,strictFidelity:false});
 assert.equal(inspect(temporalChecks).status,'passed');
 assert.equal(inspect(temporalChecks.slice(0,2)).status,'unavailable');
 assert.equal(inspect(temporalChecks.map(x=>x.segment==='middle'?{...x,verdict:'mismatch'}:x)).status,'failed');
 assert.equal(inspect(temporalChecks.map(x=>x.segment==='middle'?{...x,faceVisible:false}:x)).status,'unavailable');
 assert.equal(inspect([...temporalChecks,temporalChecks[0]]).status,'unavailable');
 assert.equal(inspect([...temporalChecks,{...temporalChecks[0],name:'Unexpected person'}]).status,'unavailable');
});
test('malformed confidence cannot become a high-confidence identity and Unicode names stay distinct',()=>{
 const bad={...identityMatch,countConfidence:true,identities:[{...identityMatch.identities[0],confidence:true}]};
 assert.equal(parseMediaQualityReport(JSON.stringify(bad),['Leen Hasan'],1,{strictFidelity:false}).status,'unavailable');
 assert.equal(parseMediaQualityReport(JSON.stringify({...identityMatch,countConfidence:12}),['Leen Hasan'],1,{strictFidelity:false}).status,'unavailable');
 const ar={observedParticipantCount:2,countConfidence:0.99,identities:[{name:'ليان',present:true,verdict:'match',confidence:0.99}]};
 assert.equal(parseMediaQualityReport(JSON.stringify(ar),['ليان','سارة'],1,{strictFidelity:false}).status,'unavailable');
});

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
