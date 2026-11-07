export const EXPRESSIONS = [
 {id:'auto',label:'From prompt',cue:''},
 {id:'neutral',label:'Neutral',cue:'A neutral, unsmiling face, relaxed brows and lips resting together without upturned corners.'},
 {id:'smile',label:'Smile',cue:'A happy smile with raised cheeks and visible upper teeth.'},
 {id:'laughter',label:'Laughter',cue:'Laughing with an open mouth, visible teeth, raised cheeks and naturally narrowed eyes.'},
 {id:'surprise',label:'Surprise',cue:'Surprised, with raised eyebrows, wide eyes and a slightly open mouth.'},
 {id:'concern',label:'Concern',cue:'Concerned, with inner brows drawn together and a serious unsmiling mouth.'},
 {id:'eyes-closed',label:'Eyes closed',cue:'Both eyes fully closed, relaxed brows and a gently closed, unsmiling mouth.'},
] as const;
export type ExpressionId=typeof EXPRESSIONS[number]['id'];
export type ExpressionIntensity='subtle'|'natural'|'strong';
export function expressionInstruction(id:ExpressionId,intensity:ExpressionIntensity='natural'):string {
 const item=EXPRESSIONS.find(x=>x.id===id);if(!item?.cue)return '';
 const strength={subtle:'Subtle but visibly readable',natural:'Natural and clearly readable',strong:'Strong and unmistakable, without caricature'}[intensity]||'Natural and clearly readable';
 return `EXPRESSION REQUEST: ${item.cue} Intensity: ${strength}. This selection takes priority over conflicting mood or expression words elsewhere in the prompt. Preserve stable facial anatomy and identity.`;
}
export function withExpression(prompt:string,id:ExpressionId,intensity:ExpressionIntensity):string {
 return [prompt.trim(),expressionInstruction(id,intensity)].filter(Boolean).join('\n');
}
export function requestedExpression(prompt:string,stage:'result'|'source'='result'):string|null {
 if(stage==='source')return null;
 const explicit=prompt.match(/EXPRESSION REQUEST:\s*([^\n]+)/i)?.[1];if(explicit)return explicit;
 const user=prompt.split('\n').filter(line=>! /^(EXPRESSION FREEDOM:|IDENTITY LOCK:|CRITICAL:|IDENTITY:|Persona appearance:|Appearance:|Niche:)/i.test(line.trim())).join('\n');
 return /\b(?:smil\w*|laugh\w*|surpris\w*|frown\w*|concerned|crying|unsmiling|neutral (?:facial )?(?:expression|face)|(?:eyes|eyelids) (?:fully )?closed|closed eyes)\b|ابتسام|يضحك|تضحك|متفاج|مغمض/i.test(user)?user:null;
}
