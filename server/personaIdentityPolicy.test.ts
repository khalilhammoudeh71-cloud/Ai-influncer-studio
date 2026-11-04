import test from 'node:test';
import assert from 'node:assert/strict';
import { bindPersonaIdentity, assertReferenceModel, requireIdentityPass } from './personaIdentityPolicy';
test('a confirmed face with an inconclusive scene reports scene uncertainty and stays blocked',()=>{
 assert.throws(()=>requireIdentityPass({status:'unavailable',identityStatus:'passed',sceneStatus:'unavailable',reasons:['Framing uncertain.']}),/face matched.*scene/i);
 assert.throws(()=>requireIdentityPass({status:'failed',temporalStatus:'failed',reasons:['Middle segment differs.']}),/drift/i);
});
const saved={id:'p1',name:'Persona',referenceImage:'primary',additionalReferenceImages:['side','profile']};
test('saved identity anchors every image request and retains multiple angles',()=>{
 const body=bindPersonaIdentity({personaId:'p1',referenceImage:'browser-override',additionalImages:['scene']},saved,'image');
 assert.equal(body.referenceImage,'primary');assert.equal(body.identityLock,true);
 assert.deepEqual(body.additionalImages,['side','profile','scene']);
});
test('video and avatar requests get the saved source when none was supplied',()=>{
 assert.equal(bindPersonaIdentity({personaId:'p1'},saved,'video').sourceImage,'primary');
 assert.equal(bindPersonaIdentity({personaId:'p1'},saved,'avatar').portraitImage,'primary');
 assert.throws(()=>bindPersonaIdentity({personaId:'p1'},undefined,'image'),/not available/);
 assert.throws(()=>bindPersonaIdentity({personaId:'p1'},{...saved,referenceImage:'',additionalReferenceImages:[]},'image'),/reference photo/);
});
test('identity locked models cannot silently discard a reference; unbound creative requests still work',()=>{
 assert.throws(()=>assertReferenceModel(true,{hasReferenceImage:false,hasEditVariant:false}),/reference/);
 assert.doesNotThrow(()=>assertReferenceModel(true,{hasEditVariant:true}));
 assert.doesNotThrow(()=>assertReferenceModel(false,{}));
});
test('uncertain or unavailable identity review is never marked successful',()=>{
 assert.throws(()=>requireIdentityPass({status:'unavailable',reasons:[]}),/could not be verified/);
 assert.throws(()=>requireIdentityPass({status:'failed',reasons:['Wrong face']}),/Wrong face/);
 assert.doesNotThrow(()=>requireIdentityPass({status:'passed',reasons:[]}));
});
