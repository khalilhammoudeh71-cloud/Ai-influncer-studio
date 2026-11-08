import type {IdentityReference,IdentityPersona} from './personaIdentitySet';
type ReferencePersona=IdentityPersona & {visualLibrary?:{url:string}[];faceDescriptor?:string|null};
export function primaryReferencePhotos(persona:ReferencePersona):string[]{
 return Array.from(new Set([persona.referenceImage,persona.avatar,persona.alternateReferenceImage,...(persona.additionalReferenceImages||[]),...(persona.visualLibrary||[]).map(photo=>photo.url)].filter((url):url is string=>Boolean(url))));
}
type PrimaryUpdate={referenceImage:string;avatar:string;additionalReferenceImages:string[];identityReferences:IdentityReference[];faceDescriptor:null};
export function changePrimaryReference<T extends ReferencePersona>(persona:T,image:string):Omit<T,keyof PrimaryUpdate>&PrimaryUpdate{
 if(!primaryReferencePhotos(persona).includes(image))throw new Error('Choose a photo from this persona’s library.');
 const additionalReferenceImages=Array.from(new Set([persona.referenceImage,persona.avatar,persona.alternateReferenceImage,...(persona.additionalReferenceImages||[])].filter((url):url is string=>Boolean(url)&&url!==image)));
 const identityReferences:IdentityReference[]=[{image,view:'front',approved:true},...(persona.identityReferences||[]).filter(ref=>ref.image!==image)];
 return {...persona,referenceImage:image,avatar:image,additionalReferenceImages,identityReferences,faceDescriptor:null};
}
