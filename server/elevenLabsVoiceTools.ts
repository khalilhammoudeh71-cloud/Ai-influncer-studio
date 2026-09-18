import { Router } from 'express';
import { createHash } from 'node:crypto';
import { VoiceLifecycleError } from './personaVoiceLifecycle';
import type { AuthenticatedRequest } from './auth';

type Store = {get(owner:string,key:string):Promise<any>;put(owner:string,key:string,value:any):Promise<void>;claim(owner:string,key:string,value:any):Promise<boolean>};
const id = (value:unknown) => {
  if(typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new VoiceLifecycleError('Choose a valid resource.',400);
  return value;
};
const text = (value:unknown,max=1000) => {
  if(typeof value !== 'string' || !value.trim() || value.length>max) throw new VoiceLifecycleError('Enter valid text.',400);
  return value.trim();
};
export class ElevenLabsVoiceTools {
  constructor(private store:Store,private account:(key:string)=>Promise<string>,private transport:typeof fetch=fetch){}
  private async request(key:string,path:string,init:RequestInit={}) {
    if(!key) throw new VoiceLifecycleError('Connect ElevenLabs in Settings.',503);
    const response=await this.transport(`https://api.elevenlabs.io${path}`,{...init,headers:{'xi-api-key':key,...init.headers},redirect:'error',signal:AbortSignal.timeout(55_000)});
    if(!response.ok) throw new VoiceLifecycleError(response.status===401 || response.status===403 ? 'ElevenLabs denied access. Check the API key permissions and your plan.' : response.status===402 || response.status===429 ? 'ElevenLabs credits or capacity are unavailable. Check your account usage.' : 'ElevenLabs rejected the operation. Check the selected model, voice readiness and inputs.',response.status>=500 ? 502 : response.status);
    return response;
  }
  async read(owner:string,key:string,kind:string,input:any,authorize:(voiceId:string)=>Promise<void>,creator=false) {
    let path:string;
    switch(kind) {
      case 'models':path='/v1/models';break;
      case 'subscription':path='/v1/user/subscription';break;
      case 'library':path=`/v1/shared-voices?page_size=20&page=${Math.min(1000,Math.max(0,Math.floor(Number(input.page)||0)))}&search=${encodeURIComponent(String(input.search||'').slice(0,100))}${input.language ? `&language=${encodeURIComponent(String(input.language).slice(0,20))}`:''}`;break;
      case 'dictionaries':if(!creator) throw new VoiceLifecycleError('Account dictionary browsing is available to the account owner.',403);path='/v1/pronunciation-dictionaries?page_size=100';break;
      case 'voice':await authorize(id(input.voiceId));path=`/v1/voices/${id(input.voiceId)}`;break;
      case 'captcha':await authorize(id(input.voiceId));path=`/v1/voices/pvc/${id(input.voiceId)}/captcha`;break;
      default:throw new VoiceLifecycleError('Unknown voice tool.',400);
    }
    const response=await this.request(key,path);
    if(kind==='captcha') {
      const bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length>5*1024*1024 || !response.headers.get('content-type')?.startsWith('audio/'))throw new VoiceLifecycleError('Could not load the verification challenge. Check ElevenLabs verification status.',502);
      return {audioUrl:`data:${response.headers.get('content-type')!.split(';')[0]};base64,${bytes.toString('base64')}`};
    }
    const data=await response.json();
    if(kind==='dictionaries')return {...data,pronunciation_dictionaries:(data.pronunciation_dictionaries||[]).map((d:any)=>({id:d.id,name:d.name,version_id:d.latest_version_id})),next_cursor:data.next_cursor};
    if(kind==='subscription')return {tier:data.tier,character_count:data.character_count,character_limit:data.character_limit,can_use_instant_voice_cloning:data.can_use_instant_voice_cloning,can_use_professional_voice_cloning:data.can_use_professional_voice_cloning,next_character_count_reset_unix:data.next_character_count_reset_unix};
    if(kind==='voice')return {voice_id:data.voice_id,name:data.name,category:data.category,fine_tuning:data.fine_tuning,voice_verification:data.voice_verification,samples:data.samples,settings:data.settings};
    return data;
  }
  async status(owner:string,key:string,operationId:string) {
    const op=await this.store.get(owner,`eleven-tool:${id(operationId)}`);
    if(!op || op.account!==await this.account(key)) throw new VoiceLifecycleError('Operation not found in this account.',404);
    if(op.result?.status==='ready')await this.register(owner,op.account,op.result);
    return op.result || {status:'unknown',message:'The provider outcome is not confirmed. Check voice status or your ElevenLabs account before submitting again.'};
  }
  private async register(owner:string,account:string,result:any) {
    if(result.voiceId)await this.store.put(owner,`remix-voice:${createHash('sha256').update(result.voiceId).digest('hex')}`,{owner,account,voiceId:result.voiceId});
    if(result.dictionaryId)await this.store.put(owner,`eleven-dictionary:${result.dictionaryId}`,{owner,account,versionId:result.versionId});
  }
  async run(owner:string,key:string,input:any,authorize:(voiceId:string)=>Promise<void>,loadAudio:(refs:string[])=>Promise<string[]>) {
    const action=text(input.action,40), operationId=id(input.operationId);
    let path:string, body:any, form:FormData|undefined;
    const json=(data:any)=>{body=data;};
    if(['changer','pvc-samples','pvc-verify','pvc-train'].includes(action))await authorize(id(input.voiceId));
    if(['changer','isolate','pvc-samples','pvc-verify'].includes(action)) {
      if(!Array.isArray(input.audio) || input.audio.length<1 || input.audio.length>20)throw new VoiceLifecycleError('Upload audio first.',400);
      const audio=await loadAudio(input.audio);form=new FormData();
      audio.forEach((value,index)=>{
        const match=value.match(/^data:(audio\/[\w.+-]+)(?:;codecs=[\w.,-]+)?;base64,([A-Za-z0-9+/=\s]+)$/);
        if(!match)throw new VoiceLifecycleError('Use a readable audio recording.',400);
        const bytes=Buffer.from(match[2],'base64');if(bytes.length<100 || bytes.length>30*1024*1024)throw new VoiceLifecycleError('Audio must be between 100 bytes and 30 MB per file.',400);
        form!.append(action==='pvc-samples'?'files':action==='pvc-verify'?'recording':'audio',new Blob([bytes],{type:match[1]}),`recording-${index}.${match[1].includes('wav')?'wav':match[1].includes('mpeg')?'mp3':match[1].includes('mp4')?'m4a':'webm'}`);
      });
      if(action!=='pvc-samples' && audio.length!==1)throw new VoiceLifecycleError('Choose one recording for this tool.',400);
    }
    switch(action) {
      case 'changer':path=`/v1/speech-to-speech/${id(input.voiceId)}`;form!.append('model_id','eleven_multilingual_sts_v2');form!.append('remove_background_noise',String(input.removeNoise===true));break;
      case 'isolate':path='/v1/audio-isolation';break;
      case 'pvc-create':if(input.ownVoice!==true)throw new VoiceLifecycleError('Professional Cloning requires verification of your own voice. Use Instant Cloning or Voice Design for other character voices.',400);path='/v1/voices/pvc';json({name:text(input.name,100),language:text(input.language,10),description:String(input.description||'').slice(0,500),labels:{studio_operation:operationId}});break;
      case 'pvc-samples':path=`/v1/voices/pvc/${id(input.voiceId)}/samples`;form!.append('remove_background_noise',String(input.removeNoise===true));break;
      case 'pvc-verify':path=`/v1/voices/pvc/${id(input.voiceId)}/captcha`;break;
      case 'pvc-train':path=`/v1/voices/pvc/${id(input.voiceId)}/train`;json({});break;
      case 'library-add':path=`/v1/voices/add/${id(input.publicOwnerId)}/${id(input.voiceId)}`;json({new_name:text(input.name,100)});break;
      case 'dictionary-create':{
        if(!Array.isArray(input.rules) || input.rules.length<1 || input.rules.length>100)throw new VoiceLifecycleError('Add 1–100 pronunciation rules.',400);
        const rules=input.rules.map((r:any)=>{if(!r || !['alias','phoneme'].includes(r.type))throw new VoiceLifecycleError('Choose alias or IPA for each rule.',400);return r.type==='phoneme'?{type:'phoneme',string_to_replace:text(r.word,200),phoneme:text(r.replacement,300),alphabet:'ipa'}:{type:'alias',string_to_replace:text(r.word,200),alias:text(r.replacement,300)};});
        path='/v1/pronunciation-dictionaries/add-from-rules';json({name:text(input.name,100),rules});break;
      }
      default:throw new VoiceLifecycleError('Unknown voice action.',400);
    }
    const account=await this.account(key),hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const opKey=`eleven-tool:${operationId}`;
    if(!await this.store.claim(owner,opKey,{account,hash,status:'submitting'})) {
      const existing=await this.store.get(owner,opKey);if(existing.account!==account || existing.hash!==hash)throw new VoiceLifecycleError('This operation has different inputs. Check its status.',409);
      return this.status(owner,key,operationId);
    }
    let result:any;
    try {
      const response=await this.request(key,path,{method:'POST',...(form?{body:form}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
      if(action==='changer'||action==='isolate') {
        if(!response.headers.get('content-type')?.startsWith('audio/'))throw new Error('Invalid audio');
        const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<100||bytes.length>30*1024*1024)throw new Error('Invalid audio');
        result={status:'ready',audioUrl:`data:${response.headers.get('content-type')!.split(';')[0]};base64,${bytes.toString('base64')}`};
      } else {
        const data=await response.json();
        result={status:'ready',...(data.voice_id?{voiceId:id(data.voice_id)}:{}),...(action==='dictionary-create'?{dictionaryId:id(data.id),versionId:id(data.version_id)}:{}),message:action==='pvc-train'?'Training requested. Check voice status; this is not a ready clone yet.':action==='pvc-samples'?'Samples uploaded. Complete verification and start training.':action==='pvc-verify'?'Verification submitted. Check voice status before training.':'Saved in your ElevenLabs account.'};
      }
    } catch(error) {
      result={status:error instanceof VoiceLifecycleError && error.statusCode<500?'failed':'unknown',message:error instanceof VoiceLifecycleError?error.message:'The provider outcome is not confirmed. Check status before submitting again.'};
    }
    await this.store.put(owner,opKey,{account,hash,result});
    if(result.status==='ready')await this.register(owner,account,result);
    return result;
  }
}
export function createElevenLabsVoiceToolsRouter(deps:{service:ElevenLabsVoiceTools;apiKey():string;authorize(req:AuthenticatedRequest,id:string):Promise<void>;loadAudio(owner:string,refs:string[]):Promise<string[]>;creator(req:AuthenticatedRequest):boolean}) {
  const router=Router();router.use((req:AuthenticatedRequest,res,next)=>{res.setHeader('Cache-Control','no-store');if(!req.user?.id)return res.status(401).json({error:'Sign in to use voice tools.'});next();});
  const error=(res:any,e:any)=>res.status(e instanceof VoiceLifecycleError?e.statusCode:503).json({error:e instanceof VoiceLifecycleError?e.message:'Voice tools unavailable. Check the operation status before retrying.'});
  router.get('/operations/:id',async(req:AuthenticatedRequest,res)=>{try{res.json(await deps.service.status(req.user.id,deps.apiKey(),String(req.params.id)));}catch(e){error(res,e);}});
  router.get('/:kind',async(req:AuthenticatedRequest,res)=>{try{res.json(await deps.service.read(req.user.id,deps.apiKey(),String(req.params.kind),req.query,id=>deps.authorize(req,id),deps.creator(req)));}catch(e){error(res,e);}});
  router.post('/',async(req:AuthenticatedRequest,res)=>{try{res.json(await deps.service.run(req.user.id,deps.apiKey(),req.body,id=>deps.authorize(req,id),refs=>deps.loadAudio(req.user.id,refs)));}catch(e){error(res,e);}});
  return router;
}
