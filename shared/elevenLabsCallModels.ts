export const ELEVENLABS_CALL_MODELS = [
  {id:'eleven_v3_conversational',name:'ElevenLabs v3 Conversational'},
  {id:'eleven_flash_v2_5',name:'ElevenLabs Flash 2.5'},
  {id:'eleven_turbo_v2_5',name:'ElevenLabs Turbo 2.5'},
] as const;
export type ElevenLabsCallModel = typeof ELEVENLABS_CALL_MODELS[number]['id'];
export function elevenLabsCallModel(value:unknown):ElevenLabsCallModel {
  if(value===undefined||value===null||value==='')return 'eleven_flash_v2_5';
  if(ELEVENLABS_CALL_MODELS.some(m=>m.id===value))return value as ElevenLabsCallModel;
  throw new Error('Choose an available ElevenLabs call model.');
}
