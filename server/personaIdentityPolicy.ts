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
export function identityReviewFailure(report:{status:string;reasons:string[];identityStatus?:string;sceneStatus?:string;temporalStatus?:string;expressionStatus?:string}) {
 const context=report.identityStatus==='passed'&&report.sceneStatus&&report.sceneStatus!=='passed'&&report.sceneStatus!=='not-requested'
  ? 'The face matched, but the requested scene could not be verified.'
  : report.temporalStatus==='failed'?'Identity drift was detected in the video.'
  : report.temporalStatus==='unavailable'?'Face consistency could not be confirmed throughout the video.'
  : report.identityStatus==='passed'&&report.expressionStatus==='failed'?'The face matched, but the requested expression was not followed.'
  : report.identityStatus==='passed'&&report.expressionStatus==='unavailable'?'The face matched, but the requested expression could not be verified.'
  : 'Persona identity could not be verified.';
 return `${context} ${report.reasons.join(' ') || 'Try a clearer reference or a different model.'}`;
}
export function requireIdentityPass(report:Parameters<typeof identityReviewFailure>[0]) {
 if(report.status!=='passed')throw new Error(identityReviewFailure(report));
}
