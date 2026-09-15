import assert from 'node:assert/strict';
import test from 'node:test';
import { researchSources } from './agentResearch';
test('uses actual grounded web sources, deduplicates URLs and rejects unsafe links', () => {
  const sources = researchSources({candidates:[{groundingMetadata:{groundingChunks:[{web:{uri:'https://www.iana.org/help/example-domains',title:'IANA'}},{web:{uri:'https://www.iana.org/help/example-domains'}},{web:{uri:'javascript:alert(1)'}}]}}]});
  assert.deepEqual(sources,[{title:'IANA',url:'https://www.iana.org/help/example-domains'}]);
});
