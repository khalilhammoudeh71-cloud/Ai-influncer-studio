import { getPersonaPrimaryReference, type MediaPersonaContext } from './persona-media';
export function bindPersonaIdentity<T extends Record<string,any>>(body:T, persona:MediaPersonaContext|undefined, kind:'image'|'video'|'avatar'):T & Record<string,any> {
 if(!body.personaId || body.personaId==='empty')return body;
 if(!persona || persona.id!==body.personaId)throw new Error('This persona is not available in your account.');
 const reference=getPersonaPrimaryReference(persona);
 if(!reference)throw new Error('Add a reference photo to this persona before generating.');
 const bound:Record<string,any>={...body,identityLock:true,naturalLook:body.naturalLook ?? true};
 if(kind==='image'){
  bound.referenceImage=reference;
  bound.additionalImages=[...new Set([...(persona.additionalReferenceImages || []),...(body.additionalImages || [])].filter(image=>image && image!==reference))].slice(0,8);
 } else if(kind==='video')bound.sourceImage=body.sourceImage || reference;
 else if(!body.video && !body.heygenAvatarId)bound.portraitImage=body.portraitImage || reference;
 return bound as T & Record<string,any>;
}
export function assertReferenceModel(locked:boolean,model:{hasReferenceImage?:boolean;hasEditVariant?:boolean;editApiPath?:string;type?:string}) {
 if(locked && !model.hasReferenceImage && !model.hasEditVariant && !model.editApiPath && !['image-to-video','reference-to-video','video-to-video'].includes(model.type || ''))
  throw new Error('This model cannot preserve a persona reference. Choose a model with image reference support.');
}
export function requireIdentityPass(report:{status:string;reasons:string[]}) {
 if(report.status!=='passed')throw new Error(`Persona identity could not be verified. ${report.reasons.join(' ') || 'Try a clearer reference or a different model.'}`);
}
