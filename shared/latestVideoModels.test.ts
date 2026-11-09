import {test} from 'node:test';import assert from 'node:assert/strict';
import {latestVideoModels} from './latestVideoModels';
test('showcases the newest available video model per creator instead of hardcoded old models',()=>{
 const models=[{id:'k1',name:'Kling 1.5',type:'text-to-video'},{id:'k3',name:'Kling 3.0',type:'image-to-video'},{id:'s1',name:'Seedance 1.5',type:'text-to-video'},{id:'s2',name:'Seedance 2.0',type:'text-to-video'},{id:'veo',name:'Veo 4',type:'text-to-video'},{id:'sora',name:'Sora 2',type:'text-to-video'},{id:'image',name:'GPT Image 2.6',type:'text-to-image'}];
 const latest=latestVideoModels(models);assert.ok(latest.some(m=>m.id==='k3'));assert.ok(latest.some(m=>m.id==='s2'));assert.ok(!latest.some(m=>['k1','s1','image'].includes(m.id)));assert.ok(latest.some(m=>m.id==='sora'));assert.equal(models[0].id,'k1');
});
test('an empty catalog does not fabricate a model or claim unavailable versions',()=>assert.deepEqual(latestVideoModels([]),[]));
