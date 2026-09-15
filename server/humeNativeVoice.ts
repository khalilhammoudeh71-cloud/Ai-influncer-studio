import { nativeHistory } from '../shared/nativeVoice';
import { normalizeCallPreferences } from '../shared/voiceCallPreferences';
export function validateHumeCallPreferences(version: string, value: unknown) {
  const preferences = normalizeCallPreferences(value);
  if (version !== '4-mini' && (preferences.mode !== 'english' || preferences.allowLanguageSwitching)) {
    throw new Error('Arabic calls and Arabic / English switching require Hume EVI 4-mini. Choose another provider, or use English with switching off.');
  }
}
// Explicit config is required: Hume native-only configurations do not support studio tools.
export function validateHumeConfig(config:any) {
  if(!['3','4-mini'].includes(config.evi_version)) throw new Error('Hume config must use EVI 3 or 4-mini.');
  if(!['OPEN_AI','ANTHROPIC','GOOGLE','GEMINI','MOONSHOT_AI'].includes(config.language_model?.model_provider) || !config.language_model?.model_resource) throw new Error('Hume needs a supported supplemental LLM in its config for studio tool calls.');
  if(config.event_messages?.on_new_chat?.enabled!==false) throw new Error('Disable the Hume config greeting so persona context is installed before speech.');
  if(!config.voice?.id || config.voice.provider!=='HUME_AI') throw new Error('Set an explicit HUME_AI library voice in the Hume test config. Private Hume clones need per-account ownership setup before use.');
  return {id:config.id,version:config.version,eviVersion:config.evi_version,voice:config.voice.id,voiceName:config.voice.name || config.voice.id,model:config.language_model.model_resource};
}
export async function humeConfig(fetcher:typeof fetch=fetch) {
  if(!process.env.HUME_API_KEY || !process.env.HUME_SECRET_KEY || !process.env.HUME_CONFIG_ID) throw new Error('Hume needs HUME_API_KEY, HUME_SECRET_KEY and HUME_CONFIG_ID on the server.');
  const version=process.env.HUME_CONFIG_VERSION || '0';
  if(!/^\d+$/.test(version))throw new Error('HUME_CONFIG_VERSION must be an integer.');
  const response=await fetcher(`https://api.hume.ai/v0/evi/configs/${encodeURIComponent(process.env.HUME_CONFIG_ID)}/version/${version}`,{headers:{'X-Hume-Api-Key':process.env.HUME_API_KEY},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`Hume config access failed (HTTP ${response.status}).`);
  return validateHumeConfig(await response.json());
}
export async function humeToken(fetcher:typeof fetch=fetch) {
  const response=await fetcher('https://api.hume.ai/oauth2-cc/token',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${process.env.HUME_API_KEY}:${process.env.HUME_SECRET_KEY}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`Hume authentication failed (HTTP ${response.status}).`);
  const data=await response.json();if(typeof data.access_token!=='string')throw new Error('Hume returned no access token.');
  return {token:data.access_token,expiresAt:Date.now()+Number(data.expires_in || 1800)*1000};
}
export function humeSettings(instructions:string,history:unknown,voice:string,tool:any) {
  // Hume's tool-schema subset rejects OpenAI's additionalProperties keyword.
  // Copy only supported root fields; do not mutate the shared OpenAI schema.
  const parameters={type:tool.parameters.type,properties:tool.parameters.properties || {},required:tool.parameters.required || []};
  return {type:'session_settings',system_prompt:instructions,voice_id:voice,context:{type:'persistent',text:`Prior messages in this same conversation (context only, do not answer these old requests): ${JSON.stringify(nativeHistory(history))}`},tools:[{name:tool.name,type:'function',description:tool.description,parameters:JSON.stringify(parameters),fallback_content:'Studio request failed. Nothing was executed.'}]};
}
