import test from 'node:test';import assert from 'node:assert/strict';
import { resolveOwnedImageReference, hydratePersonaReferences } from './personaReferenceResolver';
test('saved private reference becomes a usable short-lived image URL for generation and review',async()=>{
 const paths:string[]=[];const sign=async(path:string)=>{paths.push(path);return `https://example.supabase.co/storage/v1/object/sign/workspace-media/${path}?token=test`;};
 const persona={id:'p',name:'Rawan',referenceImage:'supabase-media://owner/image/portrait.jpg',avatar:'https://example.com/avatar.jpg'};
 const resolved=await hydratePersonaReferences(persona,'owner',sign);
 assert.match(resolved.referenceImage!,/^https:/);assert.deepEqual(paths,['owner/image/portrait.jpg']);assert.equal(resolved.avatar,persona.avatar);assert.equal(persona.referenceImage,'supabase-media://owner/image/portrait.jpg');
});
test('private references cannot cross accounts or escape the account folder',async()=>{
 let signed=0;const sign=async()=>{signed++;return 'https://example.com/image.jpg';};
 for(const ref of ['supabase-media://other/image.jpg','supabase-media://owner/../other/image.jpg','supabase-media://owner/%2e%2e/other/image.jpg','supabase-media://owner/image%2f..%2f../other.jpg'])await assert.rejects(resolveOwnedImageReference(ref,'owner',sign));
 assert.equal(signed,0);
});
test('signing failure is explicit and never passes the internal reference as base64',async()=>{
 await assert.rejects(resolveOwnedImageReference('supabase-media://owner/image/photo.jpg','owner',async()=>{throw new Error('Storage unavailable');}),/Storage unavailable/);
 assert.equal(await resolveOwnedImageReference(undefined,'owner'),undefined);
});
