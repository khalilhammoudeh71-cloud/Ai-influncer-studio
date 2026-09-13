import test from 'node:test';
import assert from 'node:assert/strict';
import { withResultVersion } from './agentVersions';
test('revisions preserve previous images and never mutate the prior state',()=>{
 const old={resultUrl:'https://example.com/original.png',params:{prompt:'A cup'}};
 const revised=withResultVersion(old,'https://example.com/blue.png');
 assert.equal(old.resultUrl,'https://example.com/original.png');
 assert.deepEqual(revised.resultVersions.map(v=>v.url),['https://example.com/original.png','https://example.com/blue.png']);
 assert.equal(withResultVersion(revised,revised.resultUrl).resultVersions.length,2);
});
test('missing output cannot replace a successful result',()=>assert.throws(()=>withResultVersion({resultUrl:'old'},''),/usable/));
