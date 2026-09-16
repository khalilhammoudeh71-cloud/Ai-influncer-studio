import { normalizeLanguage } from './personaLanguage';
import { personalityDelivery, type PersonalitySettings } from './personality';

/** Provider-specific delivery. The stored speaker binding is never changed here. */
export type VoiceEmotion = 'neutral' | 'comforting' | 'excited' | 'playful';
export const DEFAULT_SPEECH_MODEL = 'eleven_turbo_v2_5';
export type DeliveryPersona = {voiceStability?:number;voiceLikeness?:number;voiceStyleExaggeration?:number;voiceSpeakingSpeed?:number;personalityTraits?:unknown;personalitySettings?:PersonalitySettings};
const clamp=(n:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,n));
const finite=(n:unknown,fallback:number)=>typeof n==='number'&&Number.isFinite(n)?n:fallback;
export function inferVoiceEmotion(text:string):VoiceEmotion {
 if(/\b(?:i(?:’|'| a)?m here|one step at a time|take your time|sorry|overwhelmed|don.t have to)\b/i.test(text))return 'comforting';
 if(/\b(?:you did it|wonderful news|congratulations|so excited|can.t wait)\b/i.test(text))return 'excited';
 if(/\b(?:your secret|teasing|playful|caught you|look at you)\b/i.test(text))return 'playful';
 return 'neutral';
}
export function buildVoiceDelivery(provider:string,model:string,text:string,persona:DeliveryPersona={},overrides?:Record<string,number|undefined>,emotion?:VoiceEmotion) {
 const mood=emotion&&['neutral','comforting','excited','playful'].includes(emotion)?emotion:inferVoiceEmotion(text);
 const offsets={neutral:[0,0,0],comforting:[-.04,.02,0],excited:[.04,-.05,.04],playful:[.02,-.04,.03]}[mood];
 // The opt-in personality adjustments are relative to the caller's saved or
 // preview controls, so toggling them off restores that base exactly.
 const personality=personalityDelivery(persona);
 const speedOffset=(personality.speed ?? 1)-1;
 const stabilityOffset=(personality.stability ?? .5)-.5;
 const styleOffset=(personality.style ?? .3)-.3;
 const settings:Record<string,number|boolean>={
  stability:clamp(finite(overrides?.stability,finite(persona.voiceStability,50)/100)+stabilityOffset+offsets[1],0,1),
  similarity_boost:clamp(finite(overrides?.similarity_boost,finite(persona.voiceLikeness,88)/100),0,1),
  style:clamp(finite(overrides?.style,finite(persona.voiceStyleExaggeration,0)/100)+styleOffset+offsets[2],0,1),
  speed:clamp(finite(overrides?.speed,finite(persona.voiceSpeakingSpeed,1))+speedOffset+offsets[0],.7,1.2),use_speaker_boost:true,
 };
 const unsupported:string[]=[];
 if(provider==='elevenlabs'&&model.startsWith('eleven_v3')) {
  settings.stability=Math.round(Number(settings.stability)*2)/2;
  // v3 uses performance directions; never forward the numeric speed control.
  const pace=Number(settings.speed);delete settings.speed;unsupported.push('numeric speed (v3 uses delivery tags)');
  const tag={neutral:'',comforting:'[reassuring]',excited:'[excited]',playful:'[mischievously]'}[mood];
  const pacing=pace<.97?'[slowly]':pace>1.03?'[quickly]':'';
  const language = normalizeLanguage(persona);
  const accents = {'jordanian-syrian':'Jordanian Syrian',jordanian:'Jordanian',syrian:'Syrian',lebanese:'Lebanese',palestinian:'Palestinian',egyptian:'Egyptian',gulf:'Saudi',msa:''};
  const accent = /[\u0600-\u06ff]/.test(text) && accents[language.dialect]
    ? `[strong ${accents[language.dialect]} accent]` : '';
  text=[accent,tag,pacing,text].filter(Boolean).join(' ');
 }
 if(provider !== 'elevenlabs') {
  const supported = provider === 'chatterbox' ? ['style'] : ['openai','openai:tts','heygen','omnivoice','wavespeed:omnivoice'].includes(provider) ? ['speed'] : [];
  for(const key of Object.keys(settings)) if(!supported.includes(key)) { delete settings[key]; if(key !== 'use_speaker_boost') unsupported.push(key); }
 }
 // Other providers receive only fields supported by their adapter. No cross-provider emotion tags.
 return {text,settings:settings as {stability:number;similarity_boost:number;style:number;speed?:number;use_speaker_boost:boolean},emotion:mood,unsupported};
}
