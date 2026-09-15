/** Creates a separate Hume test config. Never changes a persona or an existing provider config. */
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { validateHumeConfig } from '../server/humeNativeVoice';
const key=process.env.HUME_API_KEY;
if(!key || !process.env.HUME_SECRET_KEY)throw new Error('Set HUME_API_KEY and HUME_SECRET_KEY on the server first. Do not put them in VITE_ variables.');
if(process.env.HUME_CONFIG_ID)throw new Error('A Hume config is already selected. Verify it rather than creating a duplicate.');
const config={name:'Studio native voice listening review',evi_version:'3',voice:{provider:'HUME_AI',name:'Ava Song'},language_model:{model_provider:'OPEN_AI',model_resource:'gpt-5-mini'},ellm_model:{allow_short_responses:false},event_messages:{on_new_chat:{enabled:false,text:''}},turn_detection:{end_of_turn_silence_ms:1000,speech_detection_threshold:0.5,prefix_padding_ms:300},interruption:{min_interruption_ms:200},timeouts:{max_duration:{enabled:true,duration_secs:600},inactivity:{enabled:true,duration_secs:120}}};
const response=await fetch('https://api.hume.ai/v0/evi/configs',{method:'POST',headers:{'X-Hume-Api-Key':key,'Content-Type':'application/json'},body:JSON.stringify(config),signal:AbortSignal.timeout(20000)});
if(!response.ok)throw new Error(`Hume config creation failed (HTTP ${response.status}); no existing config was changed.`);
const result=validateHumeConfig(await response.json());mkdirSync('work/native-voice',{recursive:true});writeFileSync('work/native-voice/hume-config-result.json',JSON.stringify(result,null,2));
console.log(`Created separate test config. Set HUME_CONFIG_ID=${result.id} and HUME_CONFIG_VERSION=${result.version}, then restart the local API. No persona voices were modified.`);
