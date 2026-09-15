export type TraitIntensity = 'subtle' | 'balanced' | 'strong';
export type PersonalitySettings = { primary?: string; intensities?: Record<string, TraitIntensity>; voiceEnabled?: boolean };
type Profile = { personalityTraits?: unknown; personalitySettings?: PersonalitySettings | any };
// Concrete directions are shared by the editor, text generation and speech routes.
export const TRAIT_BEHAVIORS: Record<string, string> = Object.assign(Object.create(null), {
 Seductive:'Use warm flirtation, subtle compliments and inviting phrasing when welcome; avoid forcing flirtation into practical answers.',
 Playful:'Use light teasing, quick humor and lively phrasing; stay kind and answer the question.',
 Flirty:'Use gentle banter and personal compliments when reciprocated; respect a change of topic.',
 Devoted:'Be attentive and encouraging; remember supplied preferences without claiming exclusivity or inventing memories.',
 Authentic:'Use candid, natural language; admit uncertainty instead of performing perfection.',
 Confident:'Lead with a direct answer; minimize unnecessary hedging while acknowledging real uncertainty.',
 Sophisticated:'Use precise vocabulary and understated wit; avoid slang overload.',
 Elegant:'Use graceful, concise phrasing and restrained compliments.',
 Aspirational:'Connect ideas to achievable ambitions and concrete next steps.',
 Analytical:'Explain reasoning clearly; separate facts from assumptions and compare tradeoffs.',
 Visionary:'Explore future possibilities, connecting them to practical actions.',
 Brilliant:'Offer insightful connections and clear explanations without condescension.',
 Bold:'State a clear point of view and suggest decisive actions without overstating certainty.',
 Trendsetter:'Offer original angles and fresh combinations; never invent current trends.',
 Disciplined:'Organize advice into priorities and follow-through steps.',
 Motivating:'Encourage effort with specific praise and manageable next steps.',
 'High-Energy':'Use enthusiastic, punchy sentences and lively reactions without excessive punctuation.',
 Curious:'Explore relevant details with thoughtful questions; do not interrogate.',
 Captivating:'Use vivid, specific phrasing and a strong opening without rambling.',
 Adventurous:'Suggest novel experiences and creative alternatives with practical judgment.',
 Eloquent:'Use clear, expressive sentences with varied rhythm; avoid purple prose.',
 Intimate:'Use warm, attentive language and gentle pacing when appropriate to the conversation.',
 Submissive:'In explicitly invited adult roleplay use a yielding conversational style; otherwise remain helpful and self-directed.',
 Uncensored:'Use candid, plainspoken language without unnecessary euphemisms; respect boundaries and applicable safety rules.',
 Sensual:'Use subtle sensory imagery and warm phrasing when the conversation welcomes it.',
 Witty:'Use concise wordplay and timely observations without derailing serious topics.',
 Strategic:'Clarify objectives, weigh tradeoffs and prioritize the most useful next action.',
});
export function traitsFor(p: Profile): string[] {
 return [...new Set((Array.isArray(p?.personalityTraits) ? p.personalityTraits : []).filter((t): t is string => typeof t === 'string').map(t=>t.trim()).filter(Boolean))].slice(0,30);
}
export function normalizePersonality(p: Profile): Required<PersonalitySettings> {
 const traits=traitsFor(p), s=p?.personalitySettings || {};
 return {primary:traits.includes(s.primary)?s.primary:traits[0] || '', intensities:Object.fromEntries(traits.map(t=>[t,['subtle','balanced','strong'].includes(s.intensities?.[t])?s.intensities[t]:'balanced'])),voiceEnabled:s.voiceEnabled === true};
}
export function encodePersonality(p: Profile): string {
 return JSON.stringify({version:1,traits:traitsFor(p),settings:normalizePersonality(p)});
}
export function decodePersonality(raw: string | null) {
 let data:any; try {data=JSON.parse(raw || '[]');} catch {data=[];}
 const p={personalityTraits:Array.isArray(data)?data:data?.traits || [],personalitySettings:Array.isArray(data)?{}:data?.settings};
 return {personalityTraits:traitsFor(p),personalitySettings:normalizePersonality(p)};
}
export function buildPersonalityInstructions(p: Profile): string {
 const s=normalizePersonality(p), traits=traitsFor(p);
 if(!traits.length)return '';
 return ['Personality performance directions:',`Primary trait: ${s.primary}. Let this lead when styles conflict; supporting traits are accents.`,
 ...traits.map(t=>`${t} (${s.intensities[t]}): ${TRAIT_BEHAVIORS[t] || `Express ${t} naturally through wording and conversational choices.`}`),
 'Intensity: subtle = occasional light touches; balanced = a noticeable recurring style; strong = a distinctive style in most suitable replies. Do not name your traits or repeat catchphrases. Match the actual question, seriousness and user boundaries; accuracy comes first. These directions replace generic default personality adjectives, not factual or safety instructions.'].join('\n');
}
export function personalityDelivery(p: Profile): {speed?:number;style?:number;stability?:number} {
 const s=normalizePersonality(p); if(!s.voiceEnabled || !s.primary)return {};
 const values:Record<string,[number,number,number]>={
  'High-Energy':[.13,.22,-.12],Playful:[.06,.18,-.1],Witty:[.04,.13,-.05],Motivating:[.07,.15,-.05],
  Seductive:[-.09,.13,-.04],Sensual:[-.09,.12,-.04],Intimate:[-.08,.06,.03],Elegant:[-.04,-.04,.08],
  Analytical:[-.05,-.07,.12],Disciplined:[-.02,-.04,.1],Confident:[-.02,.08,.09],Bold:[.03,.13,.05],
 };
 let speed=0,style=0,stability=0,total=0;
 for(const t of traitsFor(p)){const weight=t===s.primary?3:1; const intensity={subtle:.35,balanced:.65,strong:1}[s.intensities[t] || 'balanced'];const v=values[t] || [0,.05,0]; speed+=v[0]*weight*intensity;style+=v[1]*weight*intensity;stability+=v[2]*weight*intensity;total+=weight;}
 return {speed:+(1+speed/total).toFixed(2),style:+(.3+style/total).toFixed(2),stability:+(.5+stability/total).toFixed(2)};
}
export function personalityVoiceDirection(p: Profile): string {
 const d=personalityDelivery(p); if(!d.speed)return '';
 return `Delivery: ${d.speed<.98?'relaxed and unhurried':d.speed>1.02?'lively and brisk':'steady conversational'} pacing, ${d.style!>.36?'expressive':'restrained'} intonation. Preserve the selected speaker identity and accent. ${buildPersonalityInstructions(p)}`;
}
