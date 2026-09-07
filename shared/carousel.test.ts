import assert from 'node:assert/strict';
import test from 'node:test';
import {writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {CAROUSEL_FORMATS,validateCarousel,carouselZip} from './carousel';
test('carousel content rejects missing or overflowing slides',()=>{
 assert.throws(()=>validateCarousel({slides:[]},5));
 assert.throws(()=>validateCarousel({slides:[{headline:'x'.repeat(91),body:''}]},1));
 assert.equal(validateCarousel({slides:[{headline:'Hook',body:'Details'}],caption:'Caption'},1).slides[0].headline,'Hook');
});
test('formats preserve export dimensions',()=>{assert.equal(CAROUSEL_FORMATS.instagram.height,1350);assert.equal(CAROUSEL_FORMATS.tiktok.height,1920);});
test('export archive opens with a standard ZIP reader and preserves files',()=>{
 const dir=mkdtempSync(tmpdir()+'/carousel-test-');try{
 const file=dir+'/slides.zip';writeFileSync(file,carouselZip([{name:'01-slide.jpg',data:new Uint8Array([255,216,255])},{name:'caption.txt',data:new TextEncoder().encode('Hello ✨')} ]));
 execFileSync('unzip',['-t',file]);assert.equal(execFileSync('unzip',['-p',file,'caption.txt']).toString(),'Hello ✨');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('unfinished editable projects reopen without weakening AI validation',()=>{
 const d={slides:[{headline:'',body:'Work in progress'}]};
 assert.equal(validateCarousel(d,1,true).slides[0].headline,'');
 assert.throws(()=>validateCarousel(d,1));
});

import {normalizeSlideDesign,panoramaPlacement} from './carousel';
test('project styling is preserved and untrusted values are bounded',()=>{
 const style=normalizeSlideDesign({layout:'scrapbook',image:'/photos/a.jpg',secondImage:'https://example.com/b.jpg',cropX:80,cropY:20,zoom:2,align:'center',font:'sans',textScale:1.2,textPosition:'bottom'});
 assert.equal(style.layout,'scrapbook');assert.equal(style.cropX,80);assert.equal(style.zoom,2);assert.equal(style.secondImage,'https://example.com/b.jpg');assert.equal(style.align,'center');assert.equal(style.textPosition,'bottom');
 const bad=normalizeSlideDesign({image:'javascript:bad',layout:'bad',zoom:900,cropX:-50,cropY:NaN});
 assert.equal(bad.image,undefined);assert.equal(bad.layout,'editorial');assert.equal(bad.zoom,3);assert.equal(bad.cropX,0);assert.equal(bad.cropY,50);
});
test('panorama slices share one continuous image coordinate system',()=>{
 const a=panoramaPlacement(0,5,1080,1350,6000,1500,1.2,70,30),b=panoramaPlacement(1,5,1080,1350,6000,1500,1.2,70,30);
 assert.equal(a.x-b.x,1080);assert.equal(a.y,b.y);assert.equal(a.width,b.width);assert.ok(a.width>=5400);assert.ok(a.height>=1350);
});

import {packCarouselImages,unpackCarouselImages} from './carousel';
test('saved projects store repeated photos once and restore both image slots',()=>{
 const image='data:image/jpeg;base64,AAAA';const slides=Array.from({length:10},()=>({headline:'Hi',body:'',image,secondImage:image,layout:'scrapbook' as const,zoom:2}));
 const packed=packCarouselImages(slides);assert.equal(packed.assets.length,1);assert.equal(packed.slides[0].image,'asset:0');
 const restored=unpackCarouselImages(packed.slides[9],packed.assets);assert.equal(restored.image,image);assert.equal(restored.secondImage,image);assert.equal(restored.zoom,2);
 assert.equal(unpackCarouselImages({image:'/old.jpg'},undefined).image,'/old.jpg');
});
