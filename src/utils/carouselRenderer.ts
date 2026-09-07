import {CAROUSEL_FORMATS,CarouselFormat,CarouselSlide} from '../../shared/carousel';
export type CarouselTheme='midnight'|'paper'|'photo';
export async function renderCarouselSlide(slide:CarouselSlide,index:number,total:number,format:CarouselFormat,theme:CarouselTheme,brand:string):Promise<HTMLCanvasElement>{
 const {width:w,height:h}=CAROUSEL_FORMATS[format],canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const c=canvas.getContext('2d');if(!c)throw new Error('Your browser could not prepare the slide.');
 const light=theme==='paper',fg=light?'#171719':'#fff9ef',bg=light?'#f4ede0':'#171719',accent=light?'#8a5429':'#e7c477';
 c.fillStyle=bg;c.fillRect(0,0,w,h);
 let image:HTMLImageElement|undefined;
 if(slide.image){image=await new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.crossOrigin='anonymous';const timeout=setTimeout(()=>reject(new Error('A photo took too long to load. Upload a local copy and try again.')),15000);i.onload=()=>{clearTimeout(timeout);resolve(i)};i.onerror=()=>{clearTimeout(timeout);reject(new Error('A photo could not be loaded for export. Upload a local copy or choose another photo.'))};i.src=slide.image!;});}
 const tall=format==='tiktok',x=80,textWidth=tall?800:920,top=tall?180:85,bottom=tall?310:100;
 let y=top+120;
 if(image){const ih=theme==='photo'?h:Math.round(h*.39),scale=Math.max(w/image.width,ih/image.height);c.drawImage(image,(w-image.width*scale)/2,(ih-image.height*scale)/2,image.width*scale,image.height*scale);
 if(theme==='photo'){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(0,0,0,.3)');g.addColorStop(.35,'rgba(0,0,0,.48)');g.addColorStop(1,'rgba(0,0,0,.96)');c.fillStyle=g;c.fillRect(0,0,w,h);y=h*.44;}else y=h*.39+75;
 }
 c.fillStyle=image&&theme==='photo'?'#ffffff':fg;c.font='600 26px Arial';c.fillText(brand.slice(0,42),x,top);
 c.fillStyle=accent;c.fillRect(x,y,64,5);y+=55;
 const lines=(text:string,font:string)=>{c.font=font;const rows:string[]=[];let row='';for(const word of text.split(/\s+/)){if(c.measureText(word).width>textWidth){if(row){rows.push(row);row='';}let chunk='';for(const ch of word){if(c.measureText(chunk+ch).width>textWidth){rows.push(chunk);chunk='';}chunk+=ch;}row=chunk;}else if(c.measureText(row?row+' '+word:word).width>textWidth){rows.push(row);row=word;}else row=row?row+' '+word:word;}if(row)rows.push(row);return rows;};
 let size=index===0?80:68,bodySize=38,titleLines:string[]=[],bodyLines:string[]=[];
 for(;size>=40;size-=2){bodySize=Math.max(30,Math.round(size*.53));titleLines=lines(slide.headline,`700 ${size}px Georgia`);bodyLines=lines(slide.body,`400 ${bodySize}px Arial`);if(y+titleLines.length*size*1.12+35+bodyLines.length*bodySize*1.4<h-bottom-65)break;}
 if(size<40)throw new Error(`Slide ${index+1} has too much text. Shorten it before exporting.`);
 c.fillStyle=theme==='photo'&&image?'#fff9ef':fg;c.textBaseline='top';c.font=`700 ${size}px Georgia`;for(const line of titleLines){c.fillText(line,x,y);y+=size*1.12;}y+=30;c.font=`400 ${bodySize}px Arial`;for(const line of bodyLines){c.fillText(line,x,y);y+=bodySize*1.4;}
 c.fillStyle=accent;c.font='600 25px Arial';c.fillText(index===total-1?'Save this for later':'Swipe to continue',x,h-bottom);c.textAlign='right';c.fillText(`${index+1} / ${total}`,x+textWidth,h-bottom);c.textAlign='left';
 return canvas;
}
export function saveCarouselFile(data:Blob,name:string){const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
