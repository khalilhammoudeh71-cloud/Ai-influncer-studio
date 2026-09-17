import type { MediaDraftMessage } from './voiceMediaDraft';
/** User turns own the dialogue language; English tool acknowledgements do not. */
export function voiceMediaReply(stage:'start'|'complete'|'details'|'confirm'|'loading',type:'image'|'video',current:string,history:MediaDraftMessage[]):string {
 const meaningful=(value:string)=>/[\u0600-\u06ff]/.test(value)||value.trim().split(/\s+/).length>2;
 const userText=meaningful(current)?current:[...history].reverse().find(m=>m.role==='user'&&meaningful(m.content||''))?.content||current;
 const arabic=/[\u0600-\u06ff]/.test(userText);
 const video=type==='video';
 if(arabic){switch(stage){case 'start':return video?'تمام، رح أعمل الفيديو هلأ.':'تمام، رح أعمل الصورة هلأ.';case 'complete':return video?'خلص، الفيديو جاهز وبتقدر تشوفه هلأ.':'خلص، الصورة جاهزة وبتقدر تشوفها هلأ.';case 'details':return video?'شو بدك يكون بالفيديو؟ وصفلي المشهد.':'شو بدك يكون بالصورة؟ وصفلي المشهد.';case 'confirm':return video?'المشهد جاهز. قولي اعملي الفيديو لما يخلص الوصف.':'المشهد جاهز. قولي اعملي الصورة لما يخلص الوصف.';case 'loading':return video?'عم بجهّز الفيديو…':'عم بجهّز الصورة…';}}
 switch(stage){case 'start':return video?"Give me a second — I'm recording that for you now.":"Give me a second — I'm taking that for you now.";case 'complete':return video?'Done — I made that video for you.':'Done — I made that image for you.';case 'details':return video?'What would you like in the video?':'What would you like in the picture?';case 'confirm':return `The scene is ready. Tell me to make the ${video?'video':'image'} when you finish describing it.`;case 'loading':return video?'Rendering your video...':'Generating your image...';}
}
