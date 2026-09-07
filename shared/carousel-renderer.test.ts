import test from 'node:test';
import assert from 'node:assert/strict';
import {renderCarouselSlide} from '../src/utils/carouselRenderer';
test('photos-only renders photos without text or gradient in every supported layout',async()=>{
 const oldDocument=globalThis.document,oldImage=globalThis.Image;
 const calls:string[]=[];
 const ctx=new Proxy({}, {get:(_,key)=>key==='measureText'?()=>({width:10}):(..._args:any[])=>{calls.push(String(key));return {addColorStop(){}};},set:()=>true});
 globalThis.document={createElement:()=>({getContext:()=>ctx})} as any;
 globalThis.Image=class {width=2000;height=1500;onload?:()=>void;set src(_:string){this.onload?.();}} as any;
 try{
  for(const layout of ['editorial','minimal','full-photo','scrapbook','split','panorama'] as const){
   calls.length=0;
   const canvas=await renderCarouselSlide({headline:'Should not appear',body:'Hidden',image:'/photo.jpg',layout},0,5,'instagram','photo','Hidden brand',true);
   assert.equal(canvas.width,1080);assert.equal(canvas.height,1350);assert.ok(calls.includes('drawImage'));assert.ok(!calls.includes('fillText'));assert.ok(!calls.includes('createLinearGradient'));
  }
  await assert.rejects(()=>renderCarouselSlide({headline:'',body:''},0,3,'tiktok','photo','',true),/Choose a photo/);
 }finally{globalThis.document=oldDocument;globalThis.Image=oldImage;}
});
