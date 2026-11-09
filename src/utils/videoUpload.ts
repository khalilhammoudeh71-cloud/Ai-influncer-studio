import {isVideoUpload} from '../../shared/videoUploadPolicy';
export async function readVideoUpload(file:File):Promise<string>{
 if(!isVideoUpload(file))throw new Error('Please choose a video file. Images and audio are not accepted here.');
 const extension=file.name.split('.').pop()?.toLowerCase()||'mp4';
 const mime:Record<string,string>={mov:'video/quicktime',webm:'video/webm',mkv:'video/x-matroska',avi:'video/x-msvideo',m4v:'video/mp4','3gp':'video/3gpp'};
 const blob=file.type.startsWith('video/')?file:new Blob([file],{type:mime[extension]||'video/mp4'});
 return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read this video. Try another file.'));reader.readAsDataURL(blob)});
}
export function captureLastVideoFrame(source:string):Promise<string>{
 return new Promise((resolve,reject)=>{
  const video=document.createElement('video');video.preload='auto';video.muted=true;video.playsInline=true;video.crossOrigin='anonymous';let done=false;
  const cleanup=()=>{window.clearTimeout(timer);video.onloadedmetadata=null;video.onloadeddata=null;video.onseeked=null;video.onerror=null;video.pause();video.removeAttribute('src');video.load()};
  const fail=(message:string)=>{if(done)return;done=true;cleanup();reject(new Error(message))};
  const capture=()=>{if(done||!video.videoWidth)return;try{const scale=Math.min(1,1024/Math.max(video.videoWidth,video.videoHeight));const canvas=document.createElement('canvas');canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Video frame capture is unavailable.');ctx.drawImage(video,0,0,canvas.width,canvas.height);const frame=canvas.toDataURL('image/jpeg',.92);done=true;cleanup();resolve(frame)}catch{fail('Could not read the final frame from this video. Try uploading it from your device.')}};
  const timer=window.setTimeout(()=>fail('The video took too long to load. Try a shorter clip.'),20000);
  video.onloadedmetadata=()=>{if(!Number.isFinite(video.duration)||video.duration<=0){fail('Could not read the video duration.');return}video.currentTime=Math.max(0,video.duration-.1)};
  video.onseeked=capture;video.onloadeddata=()=>{if(video.duration<=.1)capture()};video.onerror=()=>fail('This video could not be opened. Try an MP4 or WebM clip.');video.src=source;
 });
}
