import test from 'node:test';import assert from 'node:assert/strict';
import {prepareVerifiedScene} from './verifiedScene';
const person={id:'p',name:'Persona',referenceImage:'anchor',additionalReferenceImages:['side']};
test('video references become a new verified scene before animation, not a direct portrait animation',async()=>{
 const calls:string[]=[];
 const scene=await prepareVerifiedScene({kind:'video',prompt:'walking in a garden',sourceImage:'anchor',participants:[person]}, {
  generate:async prompt=>{calls.push('generate');assert.match(prompt,/garden/);return{imageUrl:'scene',model:'Seedream'};},
  inspect:async(source,video)=>{calls.push('inspect');assert.equal(source,'scene');assert.equal(video,false);return{status:'passed',reasons:[]};},
 });
 assert.equal(scene.sourceImage,'scene');assert.equal(scene.generated,true);assert.deepEqual(calls,['generate','inspect']);
});
test('an uploaded scene is checked and reused without an extra image-generation charge',async()=>{
 const scene=await prepareVerifiedScene({kind:'video',prompt:'wave',sourceImage:'uploaded-scene',participants:[person]}, {generate:async()=>{throw Error('must not generate');},inspect:async()=>({status:'passed',reasons:[]})});
 assert.equal(scene.sourceImage,'uploaded-scene');assert.equal(scene.generated,false);
});
test('an uncertain or mismatched scene never reaches animation',async()=>{
 for(const status of ['failed','unavailable'])await assert.rejects(prepareVerifiedScene({kind:'avatar',sourceImage:'anchor',participants:[person]},{generate:async()=>{throw Error('must not generate');},inspect:async()=>({status,reasons:['Cannot confirm the face']})}),/verified/);
});
test('avatars use a verified portrait; video editing checks the source video without discarding it',async()=>{
 const avatar=await prepareVerifiedScene({kind:'avatar',participants:[person]},{generate:async()=>{throw Error('must not generate');},inspect:async(source,video)=>{assert.equal(source,'anchor');assert.equal(video,false);return{status:'passed',reasons:[]};}});
 assert.equal(avatar.sourceImage,'anchor');
 const edit=await prepareVerifiedScene({kind:'video',sourceVideo:'clip',participants:[person]},{generate:async()=>{throw Error('must not generate');},inspect:async(source,video)=>{assert.equal(source,'clip');assert.equal(video,true);return{status:'passed',reasons:[]};}});
 assert.equal(edit.sourceVideo,'clip');assert.equal(edit.sourceImage,undefined);
});
test('unbound creative generation is left unchanged and missing references fail explicitly',async()=>{
 const deps={generate:async()=>{throw Error('must not generate');},inspect:async()=>{throw Error('must not inspect');}};
 assert.equal((await prepareVerifiedScene({kind:'video',participants:[],sourceImage:'scene'},deps)).verified,false);
 await assert.rejects(prepareVerifiedScene({kind:'avatar',participants:[{id:'p'}]},deps),/reference/);
});

test('legacy image-to-video requests do not misclassify a duplicated image URL as a video',async()=>{
 const scene=await prepareVerifiedScene({kind:'video',prompt:'garden',sourceImage:'anchor',sourceVideo:'anchor',participants:[person]}, {generate:async()=>({imageUrl:'scene'}),inspect:async(_source,video)=>{assert.equal(video,false);return{status:'passed',reasons:[]};}});
 assert.equal(scene.sourceImage,'scene');assert.equal(scene.sourceVideo,undefined);
});
