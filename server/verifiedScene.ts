import {getPersonaPrimaryReference,type MediaPersonaContext} from './persona-media';
import {requireIdentityPass} from './personaIdentityPolicy';
type Quality={status:string;reasons:string[]};
type Input={kind:'video'|'avatar';prompt?:string;sourceImage?:string;sourceVideo?:string;participants:MediaPersonaContext[]};
type Dependencies={generate:(prompt:string)=>Promise<{imageUrl:string;model?:string}>;inspect:(source:string,video:boolean)=>Promise<Quality>};
export type VerifiedScene={sourceImage?:string;sourceVideo?:string;verified:boolean;generated:boolean;model?:string;quality?:Quality};
export async function prepareVerifiedScene(input:Input,deps:Dependencies):Promise<VerifiedScene>{
 if(!input.participants.length)return{sourceImage:input.sourceImage,sourceVideo:input.sourceVideo,verified:false,generated:false};
 const references=input.participants.map(getPersonaPrimaryReference);
 if(references.some(ref=>!ref))throw new Error('Every persona needs an approved identity reference before animation.');
 const duplicatedImage=input.sourceVideo===input.sourceImage && !/\.(?:mp4|webm|mov)(?:\?|$)|^data:video\//i.test(input.sourceVideo || '');
 const sourceVideo=duplicatedImage?undefined:input.sourceVideo;
 if(sourceVideo){
  const quality=await deps.inspect(sourceVideo,true);requireIdentityPass(quality);
  return{sourceVideo,verified:true,generated:false,quality};
 }
 let sourceImage=input.sourceImage || references[0];let generated=false;let model:string|undefined;
 const isIdentityReference=input.participants.some(p=>[getPersonaPrimaryReference(p),...(p.additionalReferenceImages || [])].includes(sourceImage));
 if(input.kind==='video' && (!input.sourceImage || isIdentityReference)){
  if(!input.prompt?.trim())throw new Error('Describe the scene before preparing a video.');
  const frame=await deps.generate(`Create one photorealistic opening scene image for this animation. Show the requested people, wardrobe, setting, framing and starting pose. Preserve each supplied identity. Natural skin texture; no plastic or waxy retouching. Do not add captions, collage panels or extra people. Animation brief: ${input.prompt}`);
  if(!frame.imageUrl)throw new Error('The opening scene image could not be prepared.');
  sourceImage=frame.imageUrl;model=frame.model;generated=true;
 }
 if(!sourceImage)throw new Error('A scene image is required before animation.');
 const quality=await deps.inspect(sourceImage,false);requireIdentityPass(quality);
 return{sourceImage,verified:true,generated,model,quality};
}
