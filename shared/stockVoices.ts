export type StockVoice = {id:string;name:string;engine:string;provider:string;gender:string;accent:string;tone:string};
// Provider-published tone descriptions. Gender/accent are not supplied by Google.
const gemini = 'Zephyr:Bright|Puck:Upbeat|Charon:Informative|Kore:Firm|Fenrir:Excitable|Leda:Youthful|Orus:Firm|Aoede:Breezy|Callirrhoe:Easy-going|Autonoe:Bright|Enceladus:Breathy|Iapetus:Clear|Umbriel:Easy-going|Algieba:Smooth|Despina:Smooth|Erinome:Clear|Algenib:Gravelly|Rasalgethi:Informative|Laomedeia:Upbeat|Achernar:Soft|Alnilam:Firm|Schedar:Even|Gacrux:Mature|Pulcherrima:Forward|Achird:Friendly|Zubenelgenubi:Casual|Vindemiatrix:Gentle|Sadachbia:Lively|Sadaltager:Knowledgeable|Sulafat:Warm';
export const STOCK_VOICES:StockVoice[] = [
 ...gemini.split('|').map(item=>{const [name,tone]=item.split(':');return {id:name,name,engine:'gemini',provider:'Gemini',gender:'Not specified',accent:'Not specified',tone};}),
 ...['alloy','echo','fable','onyx','nova','shimmer'].map(id=>({id,name:id[0].toUpperCase()+id.slice(1),engine:'openai',provider:'OpenAI',gender:'Not specified',accent:'Not specified',tone:'Not specified'})),
];
export function voiceTuning(engine:string) {
 const eleven=engine==='elevenlabs';
 return {prompt:engine==='wavespeed:seed-speech',similarity:eleven,stability:eleven,style:eleven||['chatterbox','wiro-voice:resemble-ai/chatterbox-multilingual'].includes(engine),speed:eleven||['openai:tts','wavespeed:seed-speech','wavespeed:omnivoice','wiro-voice:k2-fsa/omnivoice','minimax-clone'].includes(engine)};
}

/** Provider labels vary in casing and spacing; filters should not. */
export function voiceFilterLabel(value: string): string {
  const label = value.trim().replace(/\s+/g, " ").toLowerCase();
  return label ? label[0].toUpperCase() + label.slice(1) : "Not specified";
}
