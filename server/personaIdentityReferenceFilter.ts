import {normalizePersonaMediaReference} from './personaMediaPersistence';
import type {MediaPersonaContext} from './persona-media';
const canonical=(image:string,userId:string)=>image.startsWith('data:image/')?image:normalizePersonaMediaReference(image,userId);
export function excludeVaultReferences(personas:MediaPersonaContext[],values:unknown[],userId:string):string[] {
 const vault=new Set(personas.flatMap(p=>[p.referenceImage,p.avatar,p.alternateReferenceImage,...(p.additionalReferenceImages || []),...(p.identityReferences || []).map(ref=>ref.image)]).filter((s):s is string=>!!s).map(image=>canonical(image,userId)));
 return values.filter((value):value is string=>typeof value==='string' && !!value).filter(value=>!vault.has(canonical(value,userId) as string));
}
