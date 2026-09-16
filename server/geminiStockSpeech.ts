import { STOCK_VOICES } from '../shared/stockVoices';
import { SelectedSpeechError } from './selectedSpeech';
export function pcmWave(pcm:Buffer,rate=24000) {
 const header=Buffer.alloc(44);header.write('RIFF',0);header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);return Buffer.concat([header,pcm]);
}
export async function geminiStockSpeech(text:string,voice:string,signal?:AbortSignal) {
 if(!STOCK_VOICES.some(v=>v.engine==='gemini'&&v.id===voice))throw new SelectedSpeechError('Choose an available Gemini voice.',422);
 const key=process.env.Gemini_api_key||process.env.gemini_api_key||process.env.GEMINI_API_KEY||process.env.AI_INTEGRATIONS_GEMINI_API_KEY||process.env.GOOGLE_API_KEY;
 if(!key)throw new SelectedSpeechError('Connect a Gemini API key in Settings.',503);
 const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:AbortSignal.any([AbortSignal.timeout(90000),...(signal?[signal]:[])]),body:JSON.stringify({contents:[{parts:[{text}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}}})});
 const data=await response.json();const audio=data.candidates?.[0]?.content?.parts?.find((part:any)=>part.inlineData?.data)?.inlineData;
 if(!response.ok||!audio)throw new SelectedSpeechError(`Gemini voice generation failed (${response.status}).`,502);
 const pcm=Buffer.from(audio.data,'base64');
 return `data:audio/wav;base64,${pcmWave(pcm,Number(audio.mimeType?.match(/rate=(\d+)/)?.[1]||24000)).toString('base64')}`;
}
