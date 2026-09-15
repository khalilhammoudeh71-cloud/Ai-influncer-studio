import {CoverChoices,normalizeCoverChoices} from './carouselCover';
export const CAROUSEL_LAYOUTS = ['editorial','full-photo','scrapbook','split','panorama','minimal'] as const;
export type CarouselLayout = typeof CAROUSEL_LAYOUTS[number];
export type CarouselSlide = {headline:string;body:string;image?:string;alt?:string;coverReference?:string;coverChoices?:CoverChoices;imagePrompt?:string;imageModel?:string;layout?:CarouselLayout;secondImage?:string;cropX?:number;cropY?:number;zoom?:number;align?:'left'|'center';textPosition?:'top'|'middle'|'bottom';font?:'serif'|'sans';textScale?:number};
export function normalizeSlideDesign(s:any):Partial<CarouselSlide>{
 const photo=(v:any)=>typeof v==='string'&&/^(https?:\/\/|data:image\/(png|jpeg|webp);base64,|\/(?!\/))/.test(v)?v:undefined;
 const number=(v:any,min:number,max:number,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
 return {coverReference:photo(s.coverReference),coverChoices:normalizeCoverChoices(s.coverChoices),imagePrompt:typeof s.imagePrompt==='string'?s.imagePrompt.slice(0,1800):undefined,imageModel:typeof s.imageModel==='string'?s.imageModel.slice(0,250):undefined,image:photo(s.image),secondImage:photo(s.secondImage),layout:CAROUSEL_LAYOUTS.includes(s.layout)?s.layout:'editorial',cropX:number(s.cropX,0,100,50),cropY:number(s.cropY,0,100,50),zoom:number(s.zoom,1,3,1),align:s.align==='center'?'center':'left',textPosition:['top','middle','bottom'].includes(s.textPosition)?s.textPosition:'middle',font:s.font==='sans'?'sans':'serif',textScale:number(s.textScale,.7,1.3,1)};
}
export function panoramaPlacement(i:number,total:number,w:number,h:number,iw:number,ih:number,zoom=1,x=50,y=50){
 const scale=Math.max(w*total/iw,h/ih)*zoom;
 return {x:(w*total-iw*scale)*x/100-i*w,y:(h-ih*scale)*y/100,width:iw*scale,height:ih*scale};
}
export type CarouselFormat = 'instagram'|'tiktok';
export const CAROUSEL_FORMATS = {instagram:{width:1080,height:1350,label:'Instagram · 4:5'},tiktok:{width:1080,height:1920,label:'TikTok · 9:16'}};
export function validateCarousel(data:any,count:number,allowUnfinished=false): {slides:CarouselSlide[];caption:string} {
 if(!Array.isArray(data?.slides)||data.slides.length!==count)throw new Error('The generator returned the wrong number of slides. Please try again.');
 return {slides:data.slides.map((s:any)=>{
  if(typeof s?.headline!=='string'||(!allowUnfinished&&!s.headline.trim())||s.headline.length>90||typeof s.body!=='string'||s.body.length>240)throw new Error('Slide copy was too long or incomplete. Please try again.');
  return {headline:s.headline.trim(),body:s.body.trim(),alt:typeof s.alt==='string'?s.alt.slice(0,400):''};
 }),caption:String(data.caption || '').slice(0,2200)};
}
// Uncompressed ZIP: JPEG entries are already compressed. No extra runtime dependency.
export function carouselZip(files:{name:string;data:Uint8Array}[]): Uint8Array {
 const enc=new TextEncoder(),parts:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0,centralSize=0;
 const crc=(bytes:Uint8Array)=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
 for(const file of files){const name=enc.encode(file.name),checksum=crc(file.data),local=new Uint8Array(30+name.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,checksum,true);v.setUint32(18,file.data.length,true);v.setUint32(22,file.data.length,true);v.setUint16(26,name.length,true);local.set(name,30);parts.push(local,file.data);
 const record=new Uint8Array(46+name.length),r=new DataView(record.buffer);r.setUint32(0,0x02014b50,true);r.setUint16(4,20,true);r.setUint16(6,20,true);r.setUint16(8,0x800,true);r.setUint32(16,checksum,true);r.setUint32(20,file.data.length,true);r.setUint32(24,file.data.length,true);r.setUint16(28,name.length,true);r.setUint32(42,offset,true);record.set(name,46);central.push(record);centralSize+=record.length;offset+=local.length+file.data.length;
 }
 const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
 const all=new Uint8Array(offset+centralSize+22);let at=0;for(const p of [...parts,...central,end]){all.set(p,at);at+=p.length;}return all;
}

export function packCarouselImages(slides:CarouselSlide[]){
 const assets:string[]=[];
 const ref=(image:string|undefined)=>{if(!image)return undefined;let i=assets.indexOf(image);if(i<0){i=assets.length;assets.push(image);}return `asset:${i}`;};
 return {assets,slides:slides.map(s=>({...s,image:ref(s.image),secondImage:ref(s.secondImage),coverReference:ref(s.coverReference)}))};
}
export function unpackCarouselImages(slide:any,assets:unknown){
 const resolve=(v:any)=>typeof v==='string'&&/^asset:\d+$/.test(v)&&Array.isArray(assets)?assets[Number(v.slice(6))]:v;
 return normalizeSlideDesign({...slide,image:resolve(slide.image),secondImage:resolve(slide.secondImage),coverReference:resolve(slide.coverReference)});
}
