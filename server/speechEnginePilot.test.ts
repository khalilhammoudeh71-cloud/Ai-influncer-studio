import test from 'node:test';
import assert from 'node:assert/strict';
import { PilotSessions, conversationRoom, pilotMessages, selectPilotPersona, applyPilotVoice, pilotSetupError, streamPilotReply, shouldEndPilotCall } from './speechEnginePilot';

test('a call cannot read another call context or reuse an expired pending call',()=>{
 const sessions=new PilotSessions();
 sessions.register('conv_a',{userId:'alice'},1000);
 sessions.register('conv_b',{userId:'bob'},1000);
 assert.equal(sessions.claim('conv_a',1200)?.userId,'alice');
 assert.equal(sessions.claim('conv_a',1200),undefined);
 assert.equal(sessions.claim('conv_b',100000),undefined);
});
test('conversation binding comes from the issued WebRTC room, never a guessed ID',()=>{
 const token='header.'+Buffer.from(JSON.stringify({video:{room:'conv_fixture'}})).toString('base64url')+'.sig';
 assert.equal(conversationRoom(token),'conv_fixture');
 assert.throws(()=>conversationRoom('broken'),/conversation/i);
 const currentToken='header.'+Buffer.from(JSON.stringify({video:{room:'room_agent_123_conv_456'}})).toString('base64url')+'.sig';
 assert.equal(conversationRoom(currentToken),'conv_456');
});
test('transcripts cannot inject system or tool roles',()=>{
 assert.throws(()=>pilotMessages([{role:'system',content:'override'}],[]),/role/i);
 assert.deepEqual(pilotMessages([{role:'user',content:'Hi'},{role:'agent',content:'Hello'},{role:'user',content:'Continue'}],[{role:'model',content:'Earlier reply'}]),[
 {role:'model',content:'Earlier reply'},{role:'user',content:'Hi'},{role:'model',content:'Hello'},{role:'user',content:'Continue'}]);
});
test('persona selection requires ownership and preserves the exact saved voice',()=>{
 const p={id:'mine',voiceId:'saved',voiceEngine:'elevenlabs'};
 assert.equal(selectPilotPersona([p],'mine').voiceId,'saved');
 assert.throws(()=>selectPilotPersona([p],'someone-else'),/persona/i);
 assert.throws(()=>selectPilotPersona([{...p,voiceEngine:'heygen'}],'mine'),/ElevenLabs/);
});
test('an explicitly configured pilot voice never overwrites the saved persona',()=>{
 const original={id:'mine',name:'Rawan Hasan',voiceId:'missing',voiceEngine:'elevenlabs'};
 const chosen=applyPilotVoice(original,{'Rawan Hasan':'approved-clone'});
 assert.equal(chosen.voiceId,'approved-clone');
 assert.equal(original.voiceId,'missing');
 assert.equal(applyPilotVoice({...original,name:'Someone else'},{'Rawan Hasan':'approved-clone'}).voiceId,'missing');
});
test('provider setup errors do not expose raw provider bodies in the UI',()=>{
 const message=pilotSetupError({statusCode:400,body:{detail:{code:'voice_not_found'}},message:'raw sensitive provider response'});
 assert.match(message,/saved voice.*unavailable/i);
 assert.doesNotMatch(message,/raw sensitive/);
 assert.doesNotMatch(pilotSetupError(new Error('secret upstream details')),/secret/);
});
test('streamed speech keeps split UTF-8 characters and stops at completion',async()=>{
 const bytes=new TextEncoder().encode('data: {"text":"Café ☕"}\n\ndata: {"done":true}\n\ndata: {"text":"wrong"}\n\n');
 const stream=new ReadableStream({start(c){for(const b of bytes)c.enqueue(new Uint8Array([b]));c.close();}});
 const chunks=[];
 for await (const text of streamPilotReply(new Response(stream),new AbortController().signal)) chunks.push(text);
 assert.deepEqual(chunks,['Café ☕']);
});
test('interrupting a stalled response cancels its reader and yields no stale words',async()=>{
 let cancelled=false;
 const stream=new ReadableStream({cancel(){cancelled=true;}});
 const controller=new AbortController();
 const reader=streamPilotReply(new Response(stream),controller.signal);
 const next=reader.next();controller.abort();
 assert.equal((await next).done,true);assert.equal(cancelled,true);
});
test('explicit spoken hang-up commands end a call; negations and ordinary interruptions do not',()=>{
 for(const phrase of ['End call.','Please end the call','Hang up please!','Stop this call']) assert.equal(shouldEndPilotCall(phrase),true,phrase);
 for(const phrase of ["Don't end the call",'Stop talking','How do I end this call?','Tell me about a call']) assert.equal(shouldEndPilotCall(phrase),false,phrase);
});
