import {CAROUSEL_FORMATS,CarouselFormat,CarouselSlide,panoramaPlacement} from '../../shared/carousel';
export type CarouselTheme='midnight'|'paper'|'photo';
export async function renderCarouselSlide(slide:CarouselSlide,index:number,total:number,format:CarouselFormat,theme:CarouselTheme,brand:string):Promise<HTMLCanvasElement>{
 const {width:w,height:h}=CAROUSEL_FORMATS[format],canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const c=canvas.getContext('2d');if(!c)throw new Error('Your browser could not prepare the slide.');
 const light=theme==='paper',fg=light?'#171719':'#fff9ef',bg=light?'#f4ede0':'#171719',accent=light?'#8a5429':'#e7c477';
 c.fillStyle=bg;c.fillRect(0,0,w,h);
 const layout=slide.layout||'editorial',photoMode=layout==='full-photo'||layout==='panorama'||(layout==='editorial'&&theme==='photo');
 const load=async(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.crossOrigin='anonymous';const timeout=setTimeout(()=>reject(new Error('A photo took too long to load. Upload a local copy.')),15000);i.onload=()=>{clearTimeout(timeout);resolve(i)};i.onerror=()=>{clearTimeout(timeout);reject(new Error('A photo could not be loaded. Upload a local copy.'))};i.src=src;});
 const image=slide.image&&layout!=='minimal'?await load(slide.image):undefined;
 const draw=(im:HTMLImageElement,x:number,y:number,width:number,height:number)=>{const scale=Math.max(width/im.width,height/im.height)*(slide.zoom||1);c.save();c.beginPath();c.rect(x,y,width,height);c.clip();c.drawImage(im,x+(width-im.width*scale)*(slide.cropX??50)/100,y+(height-im.height*scale)*(slide.cropY??50)/100,im.width*scale,im.height*scale);c.restore();};
 const tall=format==='tiktok',x=80,textWidth=tall?800:920,top=tall?180:85,bottom=tall?310:100;
 let y=top+120;
 if(image&&layout!=='minimal'){
  if(layout==='panorama'){const p=panoramaPlacement(index,total,w,h,image.width,image.height,slide.zoom||1,slide.cropX??50,slide.cropY??50);c.drawImage(image,p.x,p.y,p.width,p.height);}
  else if(layout==='scrapbook'){
   c.save();c.translate(w*.28,h*.23);c.rotate(-.08);c.fillStyle='#fff9ef';c.fillRect(-245,-210,490,440);draw(image,-225,-190,450,380);c.restore();
   const second=slide.secondImage?await load(slide.secondImage):image;
   c.save();c.translate(w*.72,h*.28);c.rotate(.09);c.fillStyle='#fff9ef';c.fillRect(-245,-210,490,440);draw(second,-225,-190,450,380);c.restore();y=h*.47;
  } else if(layout==='split'){
   draw(image,0,0,w/2-6,h*.40);const second=slide.secondImage?await load(slide.secondImage):image;draw(second,w/2+6,0,w/2-6,h*.40);y=h*.40+75;
  } else {draw(image,0,0,w,photoMode?h:h*.39);y=h*.39+75;}
  if(photoMode){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,.78)');c.fillStyle=g;c.fillRect(0,0,w,h);y=slide.textPosition==='top'?top+100:slide.textPosition==='bottom'?h*.56:h*.40;}
 }
 c.fillStyle=image&&photoMode?'#ffffff':fg;c.font='600 26px Arial';c.fillText(brand.slice(0,42),x,top);
 c.fillStyle=accent;c.fillRect(x,y,64,5);y+=55;
 const lines=(text:string,font:string)=>{c.font=font;const rows:string[]=[];let row='';for(const word of text.split(/\s+/)){if(c.measureText(word).width>textWidth){if(row){rows.push(row);row='';}let chunk='';for(const ch of word){if(c.measureText(chunk+ch).width>textWidth){rows.push(chunk);chunk='';}chunk+=ch;}row=chunk;}else if(c.measureText(row?row+' '+word:word).width>textWidth){rows.push(row);row=word;}else row=row?row+' '+word:word;}if(row)rows.push(row);return rows;};
 const face=slide.font==='sans'?'Arial':'Georgia';
 let size=Math.round((index===0?80:68)*(slide.textScale||1)),bodySize=38,titleLines:string[]=[],bodyLines:string[]=[];
 for(;size>=40;size-=2){bodySize=Math.max(30,Math.round(size*.53));titleLines=lines(slide.headline,`700 ${size}px ${face}`);bodyLines=lines(slide.body,`400 ${bodySize}px Arial`);if(y+titleLines.length*size*1.12+35+bodyLines.length*bodySize*1.4<h-bottom-65)break;}
 if(size<40)throw new Error(`Slide ${index+1} has too much text. Shorten it before exporting.`);
 c.textAlign=slide.align==='center'?'center':'left';const tx=slide.align==='center'?x+textWidth/2:x;
 c.fillStyle=photoMode&&image?'#fff9ef':fg;c.textBaseline='top';c.font=`700 ${size}px ${face}`;for(const line of titleLines){c.fillText(line,tx,y);y+=size*1.12;}y+=30;c.font=`400 ${bodySize}px Arial`;for(const line of bodyLines){c.fillText(line,tx,y);y+=bodySize*1.4;}
 c.textAlign='left';c.fillStyle=accent;c.font='600 25px Arial';c.fillText(index===total-1?'Save this for later':'Swipe to continue',x,h-bottom);c.textAlign='right';c.fillText(`${index+1} / ${total}`,x+textWidth,h-bottom);c.textAlign='left';
 return canvas;
}
export function saveCarouselFile(data:Blob,name:string){const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
