export async function requestDialectPreview(generate:(text:string)=>Promise<string>,text:string):Promise<string>{
 const url=await generate(text);
 if(typeof url!=='string'||!url.trim())throw new Error('The voice provider returned no audio. Try Listen again or choose another voice engine.');
 return url;
}
export async function playDialectPreview(audio:{currentTime:number;play:()=>Promise<void>},onError:(message:string)=>void):Promise<void>{
 try{audio.currentTime=0;await audio.play();}catch{onError('Playback did not start automatically. Press play on the audio player below.');}
}
