import {test} from 'node:test';
import assert from 'node:assert/strict';
import {changePrimaryReference} from './personaPrimaryReference';
import {selectIdentityReferences} from './personaIdentitySet';
test('the selected library photo becomes the approved identity anchor without approving other library photos',()=>{
 const p={referenceImage:'old',avatar:'old',additionalReferenceImages:['side'],identityReferences:[{image:'old',view:'front' as const,approved:true},{image:'side',view:'profile' as const,approved:true}],visualLibrary:[{url:'chosen'},{url:'unrelated'}],faceDescriptor:'old descriptor',name:'Persona'};
 const updated=changePrimaryReference(p,'chosen');
 assert.equal(updated.referenceImage,'chosen');assert.equal(updated.avatar,'chosen');assert.equal(updated.faceDescriptor,null);
 assert.deepEqual(updated.additionalReferenceImages,['old','side']);
 assert.equal(selectIdentityReferences(updated,'portrait')[0].image,'chosen');
 assert.ok(!updated.identityReferences.some(r=>r.image==='unrelated'));
 assert.equal(p.referenceImage,'old');
});
test('rejects a photo outside the persona library',()=>{
 assert.throws(()=>changePrimaryReference({referenceImage:'old'},'other'),/library/);
});
