import { VoiceLifecycleError } from './personaVoiceLifecycle';
export async function activateAgentVoice(owner:string,input:any,deps:{verify:(id:string)=>Promise<void>;clone:(input:any)=>Promise<any>;save:(owner:string,value:any)=>Promise<void>}) {
 const engine=input.model==='elevenlabs-v3'?'elevenlabs':input.model;
 if(engine!=='elevenlabs')throw new VoiceLifecycleError('Activation for this exact provider is not configured. Your saved library is unchanged.',422);
 let voiceId=input.voiceId;
 if(voiceId)await deps.verify(voiceId);
 else {
  const operation=await deps.clone(input);
  if(operation.status!=='ready'||!operation.voiceId)throw new VoiceLifecycleError(`Voice is ${operation.status}. Finish verification or check enrollment again before activating.`,409);
  voiceId=operation.voiceId;
 }
 const binding={voiceId,voiceEngine:engine,voiceName:input.voiceName,voiceSettings:input.voiceSettings};
 await deps.save(owner,binding);
 return {success:true,activeVoice:'cloned',voiceId,model:engine};
}
