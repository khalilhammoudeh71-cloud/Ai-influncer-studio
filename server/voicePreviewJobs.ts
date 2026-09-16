import { createHash } from 'node:crypto';
import { buildReferenceSpeechInput, waveReference, waveRequest } from './referenceSpeech';
import { voiceCloningModel } from '../shared/voiceCloningModels';
import { SelectedSpeechError } from './selectedSpeech';
type Store = { get(owner:string,key:string):Promise<any>; put(owner:string,key:string,value:any):Promise<any>; claim(owner:string,key:string,value:any):Promise<boolean> };
export class VoicePreviewJobs {
 constructor(private store:Store, private env=process.env, private fetcher:typeof fetch=fetch) {}
 async start(owner:string, body:any) {
  const model=voiceCloningModel(body.engine);
  if(model?.provider!=='WaveSpeed'||!['reference','preset'].includes(model.kind))throw new SelectedSpeechError('This model does not support queued previews.',422);
  if(typeof body.text!=='string'||!body.text.trim()||body.text.length>5000)throw new SelectedSpeechError('Enter preview text up to 5000 characters.',422);
  const request=buildReferenceSpeechInput(model.id,body.text,{reference:body.voiceReference||body.activePersona?.voiceSampleUrl,referenceText:body.voiceReferenceText,voiceId:body.voiceId,voicePrompt:body.voicePrompt,speed:body.voiceSettings?.speed,exaggeration:body.voiceSettings?.style});
  const identity=JSON.stringify(request,(_key,value)=>typeof value==='string'&&value.startsWith('https://')?value.split('?')[0]:value);
  const id=createHash('sha256').update(identity).digest('hex');const key=`preview-job:${id}`;
  const existing=await this.store.get(owner,key);if(existing)return this.status(owner,id);
  const job={id,engine:model.id,status:'submitting',createdAt:Date.now()};
  if(!await this.store.claim(owner,key,job))return this.status(owner,id);
  try {
   const signal=AbortSignal.timeout(45000);
   const field='reference_audio' in request.input?'reference_audio':'audio';
   if(request.input[field])request.input[field]=await waveReference(String(request.input[field]),this.env,this.fetcher,signal);
   const task=await waveRequest(request.model,request.input,this.env,this.fetcher,signal);
   if(!task.id)throw new Error('The provider returned no job ID.');
   const saved={...job,status:task.status,predictionId:task.id};
   await this.store.put(owner,key,saved);
   return this.result(saved,task);
  } catch(error) {
   await this.store.put(owner,key,{...job,status:'unknown',error:'The submission could not be confirmed. Do not submit it again; check provider history.'});
   throw error;
  }
 }
 private result(job:any,task:any) {
  const output=Array.isArray(task.outputs)?task.outputs[0]:undefined;
  const audioUrl=typeof output==='string'?output:output?.url;
  if(task.status==='completed'&&!audioUrl)throw new SelectedSpeechError('Provider completed without audio.',502);
  return {id:job.id,engine:job.engine,status:task.status,audioUrl:task.status==='completed'?audioUrl:undefined};
 }
 async status(owner:string,id:string) {
  const job=await this.store.get(owner,`preview-job:${id}`);
  if(!job)throw new SelectedSpeechError('Preview job not found.',404);
  if(!job.predictionId){if(job.status==='unknown'||Date.now()-job.createdAt>60000)throw new SelectedSpeechError(job.error||'Submission status is uncertain. Check provider history before trying again.',409);return {id,status:'submitting',engine:job.engine};}
  const task=await waveRequest(`predictions/${encodeURIComponent(job.predictionId)}/result`,undefined,this.env,this.fetcher,AbortSignal.timeout(20000));
  return this.result(job,task);
 }
}
