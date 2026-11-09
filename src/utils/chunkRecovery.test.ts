import test from 'node:test';
import assert from 'node:assert/strict';
import {isChunkLoadError, claimChunkReload, freshStudioUrl} from './chunkRecovery';
const storage=(initial:string|null=null)=>{let value=initial;return {getItem:()=>value,setItem:(_key:string,next:string)=>{value=next}}};
test('recognizes browser lazy-module errors without treating ordinary exceptions as updates',()=>{
 for(const message of ['Failed to fetch dynamically imported module: /assets/PersonasView-old.js','Importing a module script failed.','Loading chunk 42 failed.'])assert.equal(isChunkLoadError(new Error(message)),true);
 assert.equal(isChunkLoadError(new Error('Cannot read properties of undefined')),false);
});
test('recovers after later deployments in the same session while preventing reload loops',()=>{
 const s=storage();assert.equal(claimChunkReload(()=>s,100000),true);assert.equal(claimChunkReload(()=>s,100100),false);assert.equal(claimChunkReload(()=>s,160000),true);
});
test('the previous once-per-session marker does not permanently block recovery',()=>assert.equal(claimChunkReload(()=>storage('1'),100000),true));
test('blocked browser storage cannot throw from error recovery',()=>{
 assert.equal(claimChunkReload(()=>{throw Error('blocked')},100000),false);
 assert.equal(claimChunkReload(()=>({getItem:()=>null,setItem:()=>{throw Error('quota')}}),100000),false);
});
test('refresh keeps the current page and query while replacing the cache-busting value',()=>{
 const u=new URL(freshStudioUrl('https://example.com/?studio-reload=old&view=personas#library',123));assert.equal(u.searchParams.get('view'),'personas');assert.equal(u.searchParams.get('studio-reload'),'123');assert.equal(u.hash,'#library');
});
