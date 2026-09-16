export class VoiceAudioBuffer {
  private frames: { samples: Float32Array; end: number }[] = [];
  constructor(readonly sampleRate: number) {}
  push(samples: Float32Array, end = Date.now()) {
    this.frames.push({ samples, end });
    this.frames = this.frames.filter(f => f.end >= end - 45000);
  }
  clear() { this.frames = []; }
  wavSince(start: number, end = Date.now()): Uint8Array | undefined {
    const frames = this.frames.filter(f => f.end > start && f.end <= end);
    if (!frames.length) return;
    const slices = frames.map(f => f.samples.subarray(Math.max(0, Math.ceil((start - (f.end - f.samples.length / this.sampleRate * 1000)) * this.sampleRate / 1000))));
    const pcm = new Float32Array(slices.reduce((sum,s)=>sum+s.length,0));
    let offset=0; for(const part of slices){pcm.set(part,offset);offset+=part.length;}
    const rate=16000, length=Math.floor(pcm.length*rate/this.sampleRate);
    if(length<1600)return;
    const bytes=new Uint8Array(44+length*2),view=new DataView(bytes.buffer);
    const str=(at:number,text:string)=>[...text].forEach((c,i)=>view.setUint8(at+i,c.charCodeAt(0)));
    str(0,'RIFF');view.setUint32(4,36+length*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,length*2,true);
    for(let i=0;i<length;i++){
      const from=Math.floor(i*this.sampleRate/rate),to=Math.max(from+1,Math.floor((i+1)*this.sampleRate/rate));
      let sum=0;for(let j=from;j<to&&j<pcm.length;j++)sum+=pcm[j];
      const value=Math.max(-1,Math.min(1,sum/(to-from)));view.setInt16(44+i*2,Math.round(value*(value<0?32768:32767)),true);
    }
    return bytes;
  }
}
export function wavDataUrl(bytes: Uint8Array) {
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return 'data:audio/wav;base64,'+btoa(binary);
}
