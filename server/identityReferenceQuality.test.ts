import test from 'node:test';
import assert from 'node:assert/strict';
import { assessReferenceQuality } from './identityReferenceQuality';
const clear={faceCount:1,detail:'clear',blur:'none',occlusion:'none',retouching:'light',view:'front'};
test('one usable photo is enough, including a profile anchor; front-facing is only recommended',()=>{
 assert.equal(assessReferenceQuality(clear).status,'passed');
 assert.equal(assessReferenceQuality({...clear,view:'profile'}).status,'passed');
 const profile=assessReferenceQuality({...clear,view:'profile'},true);
 assert.equal(profile.status,'passed');assert.match(profile.reasons.join(' '),/optional/i);
});
test('multiple faces, insufficient detail, severe blur, major occlusion and heavy filters block approval',()=>{
 for(const patch of [{faceCount:2},{faceCount:0},{detail:'insufficient'},{blur:'severe'},{occlusion:'major'},{retouching:'heavy'}])
  assert.equal(assessReferenceQuality({...clear,...patch}).status,'failed');
});
test('missing, malformed and uncertain inspection never approves a reference',()=>{
 for(const raw of [null,{}, {...clear,blur:'uncertain'},{...clear,faceCount:'1'},{...clear,retouching:undefined}])
  assert.equal(assessReferenceQuality(raw).status,'uncertain');
});
