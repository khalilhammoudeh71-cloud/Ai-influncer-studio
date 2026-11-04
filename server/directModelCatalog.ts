/** Provider-native inventory. Metadata discovery never runs a paid generation. */
export interface DirectModel { id: string; name?: string; methods?: string[]; }
export interface DirectProviderStatus {
 configured: boolean; ok: boolean; models: DirectModel[]; error?: string;
}
export interface DirectModelSnapshot {
 checkedAt: string; selectedFlash: string; providers: Record<string, DirectProviderStatus>;
}
export const DEFAULT_STUDIO_FLASH = 'gemini-3.8-flash';
// Speech adapters are versioned separately: 3.8 changed the audio container and style schema.
export const getStudioTtsModel = () => process.env.STUDIO_GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
let studioFlash = DEFAULT_STUDIO_FLASH;
export const getStudioFlashModel = () => process.env.STUDIO_GEMINI_FLASH_MODEL || studioFlash;
export const flashThinkingConfig = () => ({ thinkingLevel: 'low' as any });
export function selectStableFlash(models: DirectModel[], fallback = DEFAULT_STUDIO_FLASH): string {
 return models.filter(m => /^gemini-\d+(?:\.\d+)*-flash$/.test(m.id) && m.methods?.includes('generateContent'))
  .sort((a,b) => b.id.localeCompare(a.id, undefined, { numeric: true }))[0]?.id || fallback;
}
export function mergeDirectModelSnapshot(current: DirectModelSnapshot, previous: DirectModelSnapshot | null): DirectModelSnapshot {
 const providers = Object.fromEntries(Object.entries(current.providers).map(([name,status])=>[name,
  !status.ok && previous?.providers[name] ? {...status,models:previous.providers[name].models} : status]));
 return {...current,providers,selectedFlash: current.providers.Google?.ok ? current.selectedFlash : previous?.selectedFlash || DEFAULT_STUDIO_FLASH};
}
export function applyDirectModelSnapshot(snapshot: DirectModelSnapshot) {
 if (/^gemini-\d+(?:\.\d+)*-flash$/.test(snapshot.selectedFlash)) studioFlash = snapshot.selectedFlash;
}
export async function discoverDirectModels(env: Record<string,string|undefined> = process.env, request: typeof fetch = fetch): Promise<DirectModelSnapshot> {
 const jobs = [
  {name:'Google', key:env.Gemini_api_key || env.gemini_api_key || env.GEMINI_API_KEY || env.AI_INTEGRATIONS_GEMINI_API_KEY, url:'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', header:'x-goog-api-key', kind:'google'},
  {name:'OpenAI', key:env.OPENAI_API_KEY || env.Openai_api_key || env.openai_api_key, url:'https://api.openai.com/v1/models', header:'Authorization', kind:'openai'},
  {name:'xAI', key:env.XAI_API_KEY || env.xai_api_key || env.X_AI_API_KEY, url:'https://api.x.ai/v1/models', header:'Authorization', kind:'openai'},
  {name:'ElevenLabs', key:env.ELEVENLABS_API_KEY || env.Elevenlabs_api_key, url:'https://api.elevenlabs.io/v1/models', header:'xi-api-key', kind:'eleven'},
 ];
 const providers: DirectModelSnapshot['providers'] = {};
 await Promise.all(jobs.map(async job => {
  if(!job.key){ providers[job.name]={configured:false,ok:false,models:[]};return; }
  try {
   let url=job.url; const models:DirectModel[]=[]; const seen=new Set<string>();
   for(let page=0;url;page++) {
    if(page>=30 || seen.has(url))throw new Error('Invalid catalog pagination'); seen.add(url);
    const response=await request(url,{headers:{[job.header]:job.header==='Authorization'?`Bearer ${job.key}`:job.key},signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error(`Catalog returned HTTP ${response.status}`);
    const data=await response.json();
    const rows=job.kind==='google'?data.models:job.kind==='eleven'?data:data.data;
    if(!Array.isArray(rows) || rows.length===0)throw new Error('Empty or unsupported catalog response');
    for(const row of rows) {
     const id=job.kind==='google'?row.name?.replace(/^models\//,''):row.model_id || row.id;
     if(typeof id==='string' && id)models.push({id,name:row.displayName || row.name || id,...(job.kind==='google'?{methods:row.supportedGenerationMethods || []}:{})});
    }
    url=job.kind==='google' && data.nextPageToken?`${job.url}&pageToken=${encodeURIComponent(data.nextPageToken)}`:'';
    if(job.kind==='openai' && data.has_more) {
     const last=rows[rows.length-1]?.id;if(!last)throw new Error('Missing catalog pagination cursor');
     url=`${job.url}?after=${encodeURIComponent(last)}`;
    }
   }
   if(!models.length)throw new Error('Catalog contains no model IDs');
   providers[job.name]={configured:true,ok:true,models:[...new Map(models.map(m=>[m.id,m])).values()]};
  } catch(error) {
   // Never include a response body, request URL or credential in persisted errors.
   providers[job.name]={configured:true,ok:false,models:[],error:error instanceof Error && /^(Catalog returned HTTP \d+|Empty or unsupported catalog response|Invalid catalog pagination|Missing catalog pagination cursor|Catalog contains no model IDs)$/.test(error.message)?error.message:'Catalog could not be reached'};
  }
 }));
 return {checkedAt:new Date().toISOString(),selectedFlash:selectStableFlash(providers.Google?.models || []),providers};
}

/** A catalog entry alone is insufficient to promote a new internal model. */
export async function validateFlashCandidate(model:string,key:string,request:typeof fetch=fetch):Promise<boolean> {
 if(!key || !/^gemini-\d+(?:\.\d+)*-flash$/.test(model))return false;
 try {
  const response=await request(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:AbortSignal.timeout(30000),
   body:JSON.stringify({contents:[{role:'user',parts:[{text:'Compatibility check: inspect the attached image and return exactly JSON {"ok":true}.'},{inlineData:{mimeType:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY9sAAAAASUVORK5CYII='}}]}],generationConfig:{responseMimeType:'application/json',thinkingConfig:flashThinkingConfig(),maxOutputTokens:1024}}),
  });
  if(!response.ok)return false;const data=await response.json();const candidate=data.candidates?.[0];
  if(candidate?.finishReason!=='STOP')return false;
  const text=candidate.content?.parts?.filter((p:any)=>!p.thought).map((p:any)=>p.text || '').join('');
  return JSON.parse(text || '{}').ok===true;
 } catch { return false; }
}
