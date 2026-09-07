export type CarouselSlide = {headline:string;body:string;image?:string;alt?:string};
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
