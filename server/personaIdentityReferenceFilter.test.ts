import test from 'node:test';import assert from 'node:assert/strict';
import {excludeVaultReferences} from './personaIdentityReferenceFilter';
test('unapproved vault photos cannot sneak back through browser-provided signed references',()=>{
 const raw={referenceImage:'supabase-media://owner/front.jpg',additionalReferenceImages:['supabase-media://owner/unapproved.jpg']};
 const values=['https://test.supabase.co/storage/v1/object/sign/workspace-media/owner/unapproved.jpg?token=changed','supabase-media://owner/scene.jpg'];
 assert.deepEqual(excludeVaultReferences([raw],values,'owner'),['supabase-media://owner/scene.jpg']);
});
test('a user-supplied scene image is retained without treating it as an approved identity photo',()=>{
 assert.deepEqual(excludeVaultReferences([{referenceImage:'supabase-media://owner/front.jpg'}],['data:image/png;base64,AQID'],'owner'),['data:image/png;base64,AQID']);
});
