import test from 'node:test';import assert from 'node:assert/strict';
import {selectIdentityReferences,normalizeIdentitySet,referenceShot} from './personaIdentitySet';
const entries=[{image:'front',view:'front',approved:true},{image:'side',view:'profile',approved:true},{image:'body',view:'full-body',approved:true},{image:'bad',view:'profile',approved:false}];
test('a persona with just one approved photo supports all media and requested angles',()=>{
 const persona={referenceImage:'single',identityReferences:[{image:'single',view:'profile' as const,approved:true}]};
 for(const kind of ['image','video','avatar'] as const)
  for(const prompt of ['front portrait','side profile','full body','laughing'])
   assert.deepEqual(selectIdentityReferences(persona,prompt,kind).map(ref=>ref.image),['single']);
});
test('selects approved shot-matched references and a stable face anchor only',()=>{
 assert.equal(referenceShot('full body walking through a garden'),'full-body');
 assert.equal(referenceShot('بروفايل من الجانب'),'profile');
 const refs=selectIdentityReferences({referenceImage:'front',identityReferences:entries as any},'side profile portrait','image');
 assert.deepEqual(refs.map(r=>r.image),['side','front']);
 assert.ok(!refs.some(r=>r.image==='bad'));
});
test('video starts from a matching scene reference; avatars favor a front face',()=>{
 const p={referenceImage:'front',identityReferences:entries as any};
 assert.equal(selectIdentityReferences(p,'full body walking','video')[0].image,'body');
 assert.equal(selectIdentityReferences(p,'profile','avatar')[0].image,'front');
});
test('legacy personas retain their primary anchor without silently approving extra photos',()=>{
 assert.deepEqual(selectIdentityReferences({referenceImage:'front',additionalReferenceImages:['unknown']},'profile','image').map(r=>r.image),['front']);
 assert.deepEqual(selectIdentityReferences({referenceImage:'front',identityReferences:[]},'portrait','image'),[]);
});
test('an identity set cannot reference unrelated assets or silently turn malformed approval into true',()=>{
 assert.throws(()=>normalizeIdentitySet([{image:'foreign',view:'front',approved:true}],['front']),/reference vault/);
 assert.throws(()=>normalizeIdentitySet([{image:'front',view:'oops',approved:true}],['front']),/view/);
 assert.throws(()=>normalizeIdentitySet([{image:'front',view:'front',approved:'yes'}],['front']),/approval/);
 assert.equal(normalizeIdentitySet([{image:'front',view:'front',approved:false}],['front'])[0].approved,false);
});
test('selection remains bounded and cannot duplicate the same photo',()=>{
 const refs=selectIdentityReferences({referenceImage:'front',identityReferences:[...entries,...entries] as any},'portrait','image');
 assert.equal(new Set(refs.map(r=>r.image)).size,refs.length);assert.ok(refs.length<=3);
});

test('a full-body primary never displaces an approved clear-face anchor for profile shots',()=>{
 const refs=selectIdentityReferences({referenceImage:'body',identityReferences:entries as any},'side profile','image');
 assert.deepEqual(refs.map(r=>r.image),['side','front']);
});
