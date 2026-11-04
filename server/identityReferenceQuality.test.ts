import test from 'node:test';
import assert from 'node:assert/strict';
import { assessReferenceQuality, identityExampleFile } from './identityReferenceQuality';
const clear={faceCount:1,detail:'clear',blur:'none',occlusion:'none',retouching:'light',view:'front'};
test('built-in example photos are accepted without allowing arbitrary remote or local files',()=>{
 assert.equal(identityExampleFile('/examples/persona-ideas/tech-ai-nano-pro.jpg'),'tech-ai-nano-pro.jpg');
 assert.equal(identityExampleFile('https://ai-influencerstudio.com/examples/persona-ideas/tech-ai-nano-pro.jpg'),'tech-ai-nano-pro.jpg');
 for(const value of ['https://evil.example/examples/persona-ideas/tech-ai-nano-pro.jpg','file:///etc/passwd','/examples/persona-ideas/../../.env','/examples/persona-ideas/unknown.jpg'])assert.equal(identityExampleFile(value),null);
});
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
