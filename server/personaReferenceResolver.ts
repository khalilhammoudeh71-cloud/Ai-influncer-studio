import { createClient } from '@supabase/supabase-js';
import { getPersonaPrimaryReference, type MediaPersonaContext } from './persona-media';

type SignImage=(path:string)=>Promise<string>;
const signStoredImage:SignImage=async(path)=>{
  const url=process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !key)throw new Error('Private persona image access is not configured on the server.');
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}});
  const {data,error}=await client.storage.from('workspace-media').createSignedUrl(path,600);
  if(error || !data?.signedUrl)throw new Error('The saved persona image could not be opened. Check the reference photo and try again.');
  return data.signedUrl;
};
export async function resolveOwnedImageReference(input:string|undefined,userId:string,sign:SignImage=signStoredImage):Promise<string|undefined> {
  if(!input?.startsWith('supabase-media://'))return input;
  const path=input.slice('supabase-media://'.length);
  // Storage names are literal paths. Never sign another account's object or
  // accept encoded traversal that a URL parser might normalize differently.
  if(!userId || !path.startsWith(`${userId}/`) || /[%\\\x00-\x1f]/.test(path) || path.split('/').some(part=>!part || part==='.' || part==='..'))throw new Error('The saved image does not belong to this account or has an invalid path.');
  return sign(path);
}
export async function hydratePersonaReferences<T extends MediaPersonaContext>(persona:T,userId:string,sign:SignImage=signStoredImage):Promise<T> {
  // Only the selected identity reference is sent to the generator/checker.
  // Do not sign or depend on unrelated library photos.
  return {...persona,referenceImage:await resolveOwnedImageReference(getPersonaPrimaryReference(persona),userId,sign)};
}
