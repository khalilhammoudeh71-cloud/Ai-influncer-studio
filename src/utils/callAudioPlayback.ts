/** iPadOS can report a desktop Mac user agent. */
export function needsReusableCallAudio() {
  return typeof navigator!=='undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1));
}
function silentWav() {
  const bytes=new Uint8Array(204);const view=new DataView(bytes.buffer);
  const label=(offset:number,value:string)=>[...value].forEach((c,i)=>bytes[offset+i]=c.charCodeAt(0));
  label(0,'RIFF');view.setUint32(4,196,true);label(8,'WAVE');label(12,'fmt ');view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);label(36,'data');view.setUint32(40,160,true);
  return `data:audio/wav;base64,${btoa(String.fromCharCode(...bytes))}`;
}
/** Own one gesture-unlocked element for the call, independent of the current turn. */
export class CallAudioPlayback {
  private audio:HTMLAudioElement|undefined;
  private releasePrepared:(()=>void)|undefined;
  constructor(private create=()=>new Audio()){}
  unlock() {
    const audio=this.audio ||= this.create();
    if(!audio.src)audio.src=silentWav();
    audio.volume=1;audio.muted=false;
    return audio.play();
  }
  prepare(prepared:HTMLAudioElement) {
    this.releasePrepared?.();
    const audio=this.audio ||= this.create();
    audio.pause();audio.onended=null;audio.onerror=null;audio.onplay=null;
    // iPad replies are buffered, so transferring this blob does not transfer a MediaSource.
    const src=prepared.src;prepared.pause();prepared.removeAttribute('src');audio.src=src;
    const release=()=>{
      audio.removeEventListener('ended',release);audio.removeEventListener('error',release);
      if(this.releasePrepared===release)this.releasePrepared=undefined;
      prepared.dispatchEvent(new Event('ended'));
    };
    this.releasePrepared=release;
    audio.addEventListener('ended',release,{once:true});audio.addEventListener('error',release,{once:true});
    return audio;
  }
  stop(){this.audio?.pause();this.releasePrepared?.();if(this.audio){this.audio.src='';this.audio.onended=null;this.audio.onerror=null;this.audio.onplay=null;}}
}
