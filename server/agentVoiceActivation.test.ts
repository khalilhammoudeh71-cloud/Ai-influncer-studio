import test from 'node:test';import assert from 'node:assert/strict';
import { activateAgentVoice } from './agentVoiceActivation';
test('failed enrollment never saves an active voice',async()=>{
 const saves:any[]=[];await assert.rejects(()=>activateAgentVoice('alice',{model:'elevenlabs',voiceReferences:['sample'],speakerAuthorized:true},{verify:async()=>{},clone:async()=>({status:'verification_required',voiceId:'pending'}),save:async(...args:any[])=>{saves.push(args);}}),/verification_required/);assert.equal(saves.length,0);
});
test('restoring a provider ID verifies it without enrolling and stores by account',async()=>{
 const saves:any[]=[];let enrolled=false;
 const result=await activateAgentVoice('alice',{model:'elevenlabs',voiceId:'provider-id',voiceName:'Saved'},{verify:async(id)=>assert.equal(id,'provider-id'),clone:async()=>{enrolled=true;throw Error('unexpected');},save:async(...args:any[])=>{saves.push(args);}});
 assert.equal(enrolled,false);assert.equal(result.voiceId,'provider-id');assert.equal(saves[0][0],'alice');
});
test('Fish label never enrolls in ElevenLabs',async()=>{
 await assert.rejects(()=>activateAgentVoice('alice',{model:'wiro-voice:fishaudio/s2-pro',voiceReferences:['sample']},{verify:async()=>{throw Error('wrong provider');},clone:async()=>{throw Error('wrong provider');},save:async()=>{throw Error('wrong provider');}}),/not configured/);
});
