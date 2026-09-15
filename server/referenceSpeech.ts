import { createHmac } from 'node:crypto';
import { voiceCloningModel } from '../shared/voiceCloningModels';
import { SelectedSpeechError } from './selectedSpeech';

export type ReferenceSpeechOptions = {reference?:string;referenceText?:string;voiceId?:string;speed?:number;exaggeration?:number;voicePrompt?:string;language?:string;signal?:AbortSignal};
type Dependencies = {env?:Record<string,string|undefined>;fetchImpl?:typeof fetch;pollMs?:number;timeoutMs?:number};
export function buildReferenceSpeechInput(engine:string,text:string,options:ReferenceSpeechOptions) {
 const selected=voiceCloningModel(engine);
 if(!selected || selected.kind==='unavailable')throw new SelectedSpeechError(`${selected?.name || engine} has no configured speech integration.`,422);
 const {reference,referenceText='',voiceId,speed=1,exaggeration=.3,voicePrompt=''}=options;
 if(selected.kind==='reference'&&!reference)throw new SelectedSpeechError('Choose a primary voice recording first.',422);
 if(selected.transcriptRequired&&!referenceText.trim())throw new SelectedSpeechError('Fish Audio needs the exact transcript of the reference recording.',422);
 const arabic=/[\u0600-\u06ff]/.test(text);
 const input:Record<string,unknown>={};
 if(selected.provider==='Wiro') {
  Object.assign(input,{prompt:text,inputAudio:reference});
  if(selected.model==='fishaudio/s2-pro')Object.assign(input,{prompt:`<|speaker:0|>${text}`,referenceText});
  if(selected.model==='k2-fsa/omnivoice')Object.assign(input,{referenceText,speed,language:arabic?'arb':'None'});
  if(selected.model==='openmoss/moss-tts-v1-5')input.language=arabic?'Arabic':'None';
  if(selected.model==='resemble-ai/chatterbox-multilingual')Object.assign(input,{language:arabic?'ar':'en',exaggeration,cfg_weight:.5,temperature:.8,topP:1});
  if(selected.model==='openbmb/voxcpm2')input.cfgValue=2;
 } else if(selected.provider==='Fal')Object.assign(input,{gen_text:text,ref_audio_url:reference,ref_text:referenceText,model_type:'F5-TTS',remove_silence:false});
 else if(selected.id==='wavespeed:zonos2')Object.assign(input,{audio:reference,text,clean_speaker_background:false});
 else if(selected.id==='wavespeed:qwen3-clone')Object.assign(input,{audio:reference,text,reference_text:referenceText,language:'auto'});
 else if(selected.id==='wavespeed:omnivoice')Object.assign(input,{audio:reference,text,reference_text:referenceText,speed});
 else if(selected.id==='chatterbox')Object.assign(input,{reference_audio:reference,text,exaggeration});
 else if(selected.id==='wavespeed:seed-speech')Object.assign(input,{text,voice:voiceId||'stokie_en',voice_instruction:voicePrompt,speed,output_format:'mp3'});
 else if(selected.id==='qwen-tts')Object.assign(input,{text,voice:voiceId||'Vivian',language:'auto'});
 else if(selected.id==='minimax-clone'&&voiceId)Object.assign(input,{text,voice_id:voiceId,speed});
 else throw new SelectedSpeechError(`${selected.name} requires its voice creation flow before speech.`,422);
 return {provider:selected.provider,model:selected.id==='minimax-clone'?'minimax/speech-2.6-hd':selected.model!,input};
}
function audioUrl(value:any):string|undefined {
 if(typeof value==='string'&&/^https:\/\//.test(value))return value;
 if(Array.isArray(value))return value.map(audioUrl).find(Boolean);
 if(value&&typeof value==='object')return audioUrl(value.url)||audioUrl(value.audio_url)||audioUrl(value.audio)||audioUrl(value.outputs);
}
export function waveTaskData(value:any) {return value?.data || value;}
export function assertWaveTask(task:any) {
 if(['failed','cancelled','timeout','deleted'].includes(task?.status))throw Object.assign(new SelectedSpeechError(`WaveSpeed: ${String(task.error || task.status).slice(0,400)}`,502),{terminal:true});
}
export async function waveRequest(path:string,body:unknown|undefined,env:Record<string,string|undefined>,fetcher:typeof fetch=fetch,signal?:AbortSignal) {
 if(!env.WAVESPEED_API_KEY)throw new SelectedSpeechError('Connect your WaveSpeed API key in Settings.',503);
 const response=await fetcher(`https://api.wavespeed.ai/api/v3/${path}`,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${env.WAVESPEED_API_KEY}`,...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal});
 const data=await response.json();
 if(!response.ok || (data.code&&data.code!==200)){
  const status=Number(data.code)||response.status;
  throw Object.assign(new SelectedSpeechError(`WaveSpeed returned HTTP ${status}: ${String(data.message || 'Request failed').slice(0,300)}`,status===429?429:502),{rejected:status>=400&&status<500&&status!==408});
 }
 const task=waveTaskData(data);assertWaveTask(task);return task;
}
export async function waveReference(reference:string,env:Record<string,string|undefined>,fetcher:typeof fetch=fetch,signal?:AbortSignal) {
 validateReferenceAudio(reference);
 if(/^https:\/\//.test(reference))return reference;
 const match=reference.match(/^data:(audio\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/);
 if(!match)throw new SelectedSpeechError('Upload an audio file or use a current HTTPS recording URL.',422);
 const bytes=Buffer.from(match[2],'base64');if(!bytes.length||bytes.length>20*1024*1024)throw new SelectedSpeechError('Audio must be under 20 MB.',422);
 const form=new FormData();form.append('file',new Blob([bytes],{type:match[1]}),'reference.'+(match[1].includes('wav')?'wav':'mp3'));
 const response=await fetcher('https://api.wavespeed.ai/api/v3/files/upload',{method:'POST',headers:{Authorization:`Bearer ${env.WAVESPEED_API_KEY}`},body:form,signal});
 const data=await response.json();const url=data.data?.download_url||data.data?.url||data.download_url||data.url||data.data?.fileUrl;
 if(!response.ok||typeof url!=='string'||!url.startsWith('https://'))throw new SelectedSpeechError('WaveSpeed could not upload the reference recording.',502);
 return url;
}
export function validateReferenceAudio(reference:unknown) {
 if(typeof reference!=='string')throw new SelectedSpeechError('Choose an audio recording.',422);
 if(reference.startsWith('https://')){try{new URL(reference);return;}catch{throw new SelectedSpeechError('Choose a valid recording URL.',422);}}
 const match=reference.match(/^data:(audio\/[\w.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/);
 const size=match?Buffer.from(match[2],'base64').length:0;
 if(!match||size<100||size>20*1024*1024)throw new SelectedSpeechError('Use a valid audio recording under 20 MB.',422);
}
export async function renderReferenceSpeech(engine:string,text:string,options:ReferenceSpeechOptions,dependencies:Dependencies={}) {
 const request=buildReferenceSpeechInput(engine,text,options);
 if(options.reference)validateReferenceAudio(options.reference);
 const env=dependencies.env||process.env,fetcher=dependencies.fetchImpl||fetch;
 const signal=AbortSignal.any([AbortSignal.timeout(dependencies.timeoutMs??180000),...(options.signal?[options.signal]:[])]);
 const pause=async()=>{signal.throwIfAborted();await new Promise(resolve=>setTimeout(resolve,dependencies.pollMs??1200));signal.throwIfAborted();};
 if(request.provider==='WaveSpeed') {
  if(!env.WAVESPEED_API_KEY)throw new SelectedSpeechError('Connect your WaveSpeed API key in Settings.',503);
  const field='reference_audio' in request.input?'reference_audio':'audio';
  if(request.input[field])request.input[field]=await waveReference(String(request.input[field]),env,fetcher,signal);
  let task=await waveRequest(request.model,request.input,env,fetcher,signal);
  while(task.status!=='completed'){
   if(!task.id)throw new SelectedSpeechError('WaveSpeed returned no prediction ID.',502);
   await pause();task=await waveRequest(`predictions/${encodeURIComponent(task.id)}/result`,undefined,env,fetcher,signal);
  }
  const output=audioUrl(task.outputs);if(!output)throw new SelectedSpeechError('WaveSpeed completed without audio.',502);return output;
 }
 if(request.provider==='Fal'){
  const key=env.FAL_KEY||env.FAL_API_KEY;if(!key)throw new SelectedSpeechError('Connect your Fal API key in Settings.',503);
  const response=await fetcher(`https://fal.run/${request.model}`,{method:'POST',headers:{Authorization:`Key ${key}`,'Content-Type':'application/json'},body:JSON.stringify(request.input),signal});
  const data=await response.json();const output=audioUrl(data.audio_url);
  if(!response.ok||!output)throw new SelectedSpeechError(`Fal F5-TTS failed (HTTP ${response.status}).`,502);return output;
 }
 if(!env.WIRO_API_KEY)throw new SelectedSpeechError('Connect your Wiro API key in Settings.',503);
 const headers=()=>{const nonce=Date.now().toString();return {'x-api-key':env.WIRO_API_KEY!,'x-nonce':nonce,...(env.WIRO_API_SECRET?{'x-signature':createHmac('sha256',env.WIRO_API_KEY!).update(env.WIRO_API_SECRET+nonce).digest('hex')}:{})};};
 const form=new FormData();
 for(const [key,value] of Object.entries(request.input)){
  if(key==='inputAudio'&&typeof value==='string'&&value.startsWith('data:')){
   const match=value.match(/^data:(audio\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/);if(!match)throw new SelectedSpeechError('Choose a supported audio recording.',422);
   const bytes=Buffer.from(match[2],'base64');if(bytes.length>20*1024*1024)throw new SelectedSpeechError('Audio must be under 20 MB.',422);
   form.append(key,new Blob([bytes],{type:match[1]}),'reference.'+(match[1].includes('wav')?'wav':'mp3'));
  }else if(value!==undefined)form.append(key,String(value));
 }
 const response=await fetcher(`https://api.wiro.ai/v1/Run/${request.model}`,{method:'POST',headers:headers(),body:form,signal});
 const run=await response.json();
 if(!response.ok||run.result===false||!run.taskid)throw new SelectedSpeechError(`Wiro: ${String(run.errors?.[0]?.message||'Could not start speech generation.').slice(0,400)}`,502);
 while(true){
  await pause();
  const result=await fetcher('https://api.wiro.ai/v1/Task/Detail',{method:'POST',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify({taskid:run.taskid}),signal});
  const data=await result.json();if(!result.ok||data.result===false)throw new SelectedSpeechError('Wiro could not check the speech task.',502);
  const task=data.tasklist?.[0];
  if(['task_error','task_cancel'].includes(task?.status))throw new SelectedSpeechError('Wiro speech generation failed.',502);
  if(task?.status==='task_postprocess_end'){
   if(String(task.pexit)!=='0')throw new SelectedSpeechError('Wiro speech generation failed.',502);
   const output=audioUrl(task.outputs);if(!output)throw new SelectedSpeechError('Wiro completed without audio.',502);return output;
  }
 }
}
