import test from 'node:test';
import assert from 'node:assert/strict';
import {withGenerationContext,generationMetadata} from './generationContext';
test('concurrent generation billing keeps job and attempt identities isolated',async()=>{
 const values=await Promise.all(['one','two'].map((jobId,index)=>withGenerationContext({jobId,attempt:index+1},async()=>{await new Promise(r=>setTimeout(r,5));return generationMetadata({jobId:'untrusted',aspectRatio:'1:1'});})));
 assert.deepEqual(values,[{jobId:'one',attempt:1,aspectRatio:'1:1'},{jobId:'two',attempt:2,aspectRatio:'1:1'}]);
 assert.deepEqual(generationMetadata({aspectRatio:'4:5'}),{aspectRatio:'4:5'});
});
