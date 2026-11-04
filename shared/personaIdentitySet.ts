export const IDENTITY_VIEWS = ['front','three-quarter','profile','full-body','expression','other'] as const;
export type IdentityView = typeof IDENTITY_VIEWS[number];
export type IdentityReference = {image:string;view:IdentityView;approved:boolean};
export type IdentityPersona = {referenceImage?:string;avatar?:string;alternateReferenceImage?:string;additionalReferenceImages?:string[];identityReferences?:IdentityReference[]};
export function normalizeIdentitySet(value:unknown,available:string[]):IdentityReference[] {
 if(!Array.isArray(value) || value.length>30)throw new Error('Identity references must be a list of up to 30 photos.');
 const vault=new Set(available.filter(Boolean));const seen=new Set<string>();
 return value.flatMap(raw=>{
  if(!raw || typeof raw.image!=='string' || !vault.has(raw.image))throw new Error('An identity photo must belong to this persona’s reference vault.');
  if(!IDENTITY_VIEWS.includes(raw.view))throw new Error('Choose a valid identity reference view.');
  if(typeof raw.approved!=='boolean')throw new Error('Identity reference approval must be explicit.');
  if(seen.has(raw.image))return [];seen.add(raw.image);
  return [{image:raw.image,view:raw.view,approved:raw.approved}];
 });
}
export function referenceShot(prompt:string):IdentityView {
 if(/full[ -]?body|head[ -]?to[ -]?toe|wide shot|whole body|كامل الجسم|جسم(?:ها|ه|ي|ك)? كامل|كل جسم/i.test(prompt))return 'full-body';
 if(/profile|side[ -]?(?:view|portrait)|from the side|بروفايل|من الجانب|جانبي/i.test(prompt))return 'profile';
 if(/three[ -]?quarter|3\/4|ثلاثة أرباع/i.test(prompt))return 'three-quarter';
 if(/smil|laugh|expression|grin|يضحك|تضحك|مبتسم|ابتسام/i.test(prompt))return 'expression';
 return 'front';
}
export function selectIdentityReferences(persona:IdentityPersona,prompt='',kind:'image'|'video'|'avatar'='image'):IdentityReference[] {
 if(persona.identityReferences===undefined){
  const image=persona.referenceImage || persona.avatar || persona.alternateReferenceImage || persona.additionalReferenceImages?.[0];
  return image?[{image,view:'front',approved:true}]:[];
 }
 const approved=[...new Map(persona.identityReferences.filter(ref=>ref.approved===true && ref.image).map(ref=>[ref.image,ref])).values()];
 if(!approved.length)return [];
 const anchor=approved.find(r=>r.image===persona.referenceImage && r.view==='front') || approved.find(r=>r.view==='front') || approved.find(r=>r.image===persona.referenceImage) || approved[0];
 const shot=kind==='avatar'?'front':referenceShot(prompt);
 const matching=approved.filter(r=>r.view===shot);
 const chosen=matching[0] || approved.find(r=>r.view==='front') || anchor;
 const relevant=[chosen,anchor,...matching, ...approved.filter(r=>r.view==='three-quarter')];
 return [...new Map(relevant.map(r=>[r.image,r])).values()].slice(0,3);
}
