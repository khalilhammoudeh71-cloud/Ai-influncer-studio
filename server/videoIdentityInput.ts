const MAX_VIDEO_BYTES = 15_000_000;
const trusted = ['wavespeed.ai','fal.media','replicate.delivery','runware.ai','storage.googleapis.com','heygen.ai','heygen.com','higgsfield.ai','cloudfront.net','amazonaws.com'];
export async function videoIdentityInput(input:string, request:typeof fetch=fetch) {
 const url=new URL(input);
 const allowed=trusted.some(host=>url.hostname===host || url.hostname.endsWith('.'+host)) || (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/'));
 if(url.protocol!=='https:' || url.username || url.password || url.port || !allowed)throw new Error('Video identity review cannot fetch this host.');
 const response=await request(input,{redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!response.ok || !response.body)throw new Error('Video could not be loaded for identity review.');
 const mimeType=response.headers.get('content-type')?.split(';')[0] || '';
 if(!['video/mp4','video/webm','video/quicktime'].includes(mimeType))throw new Error('Identity review requires a supported video format.');
 if(Number(response.headers.get('content-length'))>MAX_VIDEO_BYTES){await response.body.cancel();throw new Error('Video is too large for identity review.');}
 const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_VIDEO_BYTES)throw new Error('Video is too large for identity review.');chunks.push(value);}}
 finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
 if(!size)throw new Error('Video is empty.');
 return {inlineData:{mimeType,data:Buffer.concat(chunks).toString('base64')},videoMetadata:{fps:1}};
}
