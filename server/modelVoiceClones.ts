import {createHash} from 'node:crypto';
import {voiceCloningModel} from '../shared/voiceCloningModels';
import {permanentVoiceReference} from '../shared/personaVoiceLibrary';
import {SelectedSpeechError} from './selectedSpeech';
import {validateReferenceAudio,waveReference,waveRequest} from './referenceSpeech';
type Store={get(owner:string,key:string):Promise<any>;claim(owner:string,key:string,value:any):Promise<boolean>;put(owner:string,key:string,value:any):Promise<void>;replace?(owner:string,key:string,previous:any,next:any):Promise<boolean>};
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const result=(op:any)=>({id:op.id,name:op.name,engine:op.engine,status:op.status,voiceId:op.status==='ready'?op.voiceId:undefined,audioUrl:op.audioUrl,assetKind:op.assetKind,message:op.message});
export class ModelVoiceClones {
 constructor(private store:Store,private env:Record<string,string|undefined>=process.env,private fetcher:typeof fetch=fetch){}
 async create(owner:string,input:any){
  if(input.speakerAuthorized!==true)throw new SelectedSpeechError('Confirm you have the speaker’s permission first.',400);
  const model=voiceCloningModel(input.engine);
  if(!model||!['minimax-clone','mureka-vocal'].includes(model.id))throw new SelectedSpeechError('Choose a supported hosted clone model.',422);
  if(!this.env.WAVESPEED_API_KEY)throw new SelectedSpeechError('Connect your WaveSpeed API key in Settings.',503);
  if(typeof input.reference!=='string'||!input.reference||input.reference.length>28*1024*1024)throw new SelectedSpeechError('Choose one recording under 20 MB.',400);
  validateReferenceAudio(input.reference);
  const account=hash(this.env.WAVESPEED_API_KEY),id=hash(JSON.stringify([owner,model.id,permanentVoiceReference(input.reference)]));
  const key=`model-clone:${id}`;
  const op:any={id,owner,account,engine:model.id,name:String(input.name||'My voice').slice(0,120),status:'submitting',assetKind:model.kind==='singing'?'singing':'speech',authorizedAt:new Date().toISOString(),voiceId:model.id==='minimax-clone'?`studioV${id.slice(0,28)}`:undefined};
  if(!await this.store.claim(owner,key,op)){
   const previous=await this.store.get(owner,key);
   if(input.retryRejected!==true||previous?.status!=='failed'||!previous.retryable||!this.store.replace||!await this.store.replace(owner,key,previous,op))return this.status(owner,id);
  }
  let submitted=false;
  try{
   const signal=AbortSignal.timeout(45000);
   const audio=await waveReference(input.reference,this.env,this.fetcher,signal);
   const payload=model.id==='minimax-clone'?{audio,custom_voice_id:op.voiceId,model:'speech-2.6-hd',text:String(input.text||'Hello. This is my voice preview.').slice(0,2000)}:{audio};
   submitted=true;const task=await waveRequest(model.model!,payload,this.env,this.fetcher,signal);
   if(!task.id)throw Error('The provider did not return a prediction ID.');
   op.taskId=task.id;op.status='processing';await this.store.put(owner,key,op);
   return result(op);
  }catch(error){op.retryable=!submitted||(error as any)?.rejected===true;op.status=op.retryable||(error as any)?.terminal?'failed':'unknown';op.message=op.status==='failed'?(error as Error).message:'The submission could not be confirmed. Check status or provider history before creating another clone.';await this.store.put(owner,key,op);return result(op);}
 }
 async status(owner:string,id:string){
  const key=`model-clone:${id}`,op=await this.store.get(owner,key);
  if(!op||op.owner!==owner)throw new SelectedSpeechError('This clone is not available in your account.',404);
  if(op.account!==hash(this.env.WAVESPEED_API_KEY||''))throw new SelectedSpeechError('Reconnect the WaveSpeed account used to create this clone.',409);
  if(!op.taskId||op.status==='ready'||op.status==='failed')return result(op);
  try{
   const task=await waveRequest(`predictions/${encodeURIComponent(op.taskId)}/result`,undefined,this.env,this.fetcher,AbortSignal.timeout(20000));
   if(task.status!=='completed')return result(op);
   const outputs=task.outputs||[];
   if(op.assetKind==='singing'){
    for(const output of outputs){let data=output;
     if(typeof output==='string'){
      try{data=JSON.parse(output);}catch{
       // Some providers return a JSON result file instead of the object itself.
       let url:URL;try{url=new URL(output);}catch{continue;}
       if(url.protocol==='https:'&&(url.hostname==='wavespeed.ai'||url.hostname.endsWith('.wavespeed.ai'))){const response=await this.fetcher(url,{signal:AbortSignal.timeout(10000)});if(response.ok)data=await response.json();}
      }
     }
     if(data&&typeof data==='object'&&data.vocal_id)op.voiceId=String(data.vocal_id);
    }
    if(!op.voiceId)throw new SelectedSpeechError('Mureka completed without a readable vocal ID. Check its provider history.',502);
   }else{
    op.audioUrl=outputs.map((item:any)=>typeof item==='string'?item:item.audio_url||item.url).find((url:any)=>typeof url==='string'&&url.startsWith('https://'));
    if(!op.audioUrl)throw new SelectedSpeechError('MiniMax completed without a speech preview. Check its provider history.',502);
   }
   op.status='ready';op.message=op.assetKind==='singing'?'Singing voice created. Use this vocal ID with Mureka music models.':'MiniMax voice created and preview generated.';
   await this.store.put(owner,`model-voice:${op.engine}:${op.voiceId}`,{owner,account:op.account,engine:op.engine,voiceId:op.voiceId,status:'ready'});
  }catch(error){if((error as any)?.terminal)op.status='failed';op.message=error instanceof Error?error.message:'Clone status check failed. Check again without resubmitting.';}
  await this.store.put(owner,key,op);return result(op);
 }
 async authorize(owner:string,voiceId:string){
  const voice=await this.store.get(owner,`model-voice:minimax-clone:${voiceId}`);
  if(!voice||voice.owner!==owner||voice.status!=='ready'||voice.account!==hash(this.env.WAVESPEED_API_KEY||''))throw new SelectedSpeechError('This MiniMax voice is not available in your account. Select a ready clone from this account.',403);
 }
}
