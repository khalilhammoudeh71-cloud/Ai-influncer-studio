import {test} from 'node:test';
import assert from 'node:assert/strict';
import {uniqueModels, equivalentRoutes} from './modelRouting';
const model=(id:string,name:string,price:number,type='text-to-image')=>({id,name,price,type,provider:id.split(':')[0],hasReferenceImage:true});
test('duplicates use lowest known cost while versions stay separate',()=>{
 const list=[model('a:1','ByteDance Seedream 5.0 Pro',.04),model('b:1','Seedream 5 Pro (Provider)',.03),model('b:2','Seedream 5 Lite',.02)];
 assert.equal(uniqueModels(list).length,2);
 assert.equal(equivalentRoutes(list[0],list)[0].id,'b:1');
});
test('unknown zero prices are not free and different capabilities stay separate',()=>{
 const list=[model('a:1','GPT Image 2',0),model('b:1','GPT Image 2',.04),model('b:2','GPT Image 2',.02,'image-to-image')];
 assert.equal(uniqueModels(list).length,2);
 assert.equal(equivalentRoutes(list[0],list)[0].id,'b:1');
});
test('fast, pro, resolution and model versions are never merged',()=>{
 const list=['Wan 3','Wan 3 Prime','Wan 3 Fast','Wan 3 720p','Wan 3 1080p','GPT Image 2.5 Flare','GPT Image 2.5 Sunburst'].map((n,i)=>model('a:'+i,n,.1));
 assert.equal(uniqueModels(list).length,list.length);
});
