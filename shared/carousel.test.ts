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
