import {needsReusableCallAudio} from './callAudioPlayback';
export function validateSpeechStream(response:Response,voiceId:string) {
 if(!response.ok)throw new Error(`Selected voice unavailable (${response.status}). Your saved voice is unchanged.`);
 if(response.headers.get('x-voice-id')!==voiceId)throw new Error('Speech identity does not match the selected voice.');
 if(!response.headers.get('content-type')?.startsWith('audio/'))throw new Error('Expected an audio stream.');
}
/** Start buffering immediately; the caller owns when this audio enters its playback queue. */
export async function createStreamingSpeech(response:Response,voiceId:string,signal:AbortSignal):Promise<HTMLAudioElement> {
 validateSpeechStream(response,voiceId);signal.throwIfAborted();
 const audio=new Audio();let url='';const reader=response.body?.getReader();
 if(!reader)throw new Error('Missing speech stream.');
 const cleanup=()=>{audio.pause();if(url)URL.revokeObjectURL(url);void reader.cancel().catch(()=>{});signal.removeEventListener('abort',cleanup);};
 signal.addEventListener('abort',cleanup,{once:true});audio.addEventListener('ended',cleanup,{once:true});audio.addEventListener('error',cleanup,{once:true});
 if(needsReusableCallAudio() || typeof MediaSource==='undefined'||!MediaSource.isTypeSupported('audio/mpeg')) {
  try {const chunks:Uint8Array[]=[];while(true){const {value,done}=await reader.read();signal.throwIfAborted();if(done)break;chunks.push(value);}url=URL.createObjectURL(new Blob(chunks as BlobPart[],{type:'audio/mpeg'}));audio.src=url;return audio;}
  catch(error){cleanup();throw error;}
 }
 const media=new MediaSource();url=URL.createObjectURL(media);audio.src=url;
 const wait=(target:EventTarget,event:string)=>new Promise<void>((resolve,reject)=>{
  const done=()=>{remove();resolve();};const abort=()=>{remove();reject(new DOMException('Cancelled','AbortError'));};const error=()=>{remove();reject(new Error('Audio stream decoding failed'));};
  const remove=()=>{target.removeEventListener(event,done);target.removeEventListener('error',error);signal.removeEventListener('abort',abort);};
  target.addEventListener(event,done,{once:true});target.addEventListener('error',error,{once:true});signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
 });
 // Pump remains owned by the turn's AbortSignal after the audio is returned.
 void (async()=>{
  await wait(media,'sourceopen');signal.throwIfAborted();const buffer=media.addSourceBuffer('audio/mpeg');
  while(true){const {value,done}=await reader.read();signal.throwIfAborted();if(done)break;const appended=wait(buffer,'updateend');buffer.appendBuffer(value);await appended;}
  if(media.readyState==='open')media.endOfStream();
 })().catch(error=>{if(!signal.aborted){audio.dispatchEvent(new Event('error'));}cleanup();});
 return audio;
}
