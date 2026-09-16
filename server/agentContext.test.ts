import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareAgentContext} from './agentContext';
test('long history keeps user corrections and task evidence without changing saved history',()=>{
 const history=Array.from({length:40},(_,i)=>({role:i%2?'assistant':'user',content:i%2?'Old verbose reply '.repeat(300):`Brief/correction ${i}: budget ${i}`}));
 const original=JSON.stringify(history);const out=prepareAgentContext(history);
 assert.equal(JSON.stringify(history),original);
 assert.deepEqual(out.messages.filter(m=>m.role==='user').map(m=>m.content),history.filter(m=>m.role==='user').map(m=>m.content));
 assert.equal(out.messages.at(-1)?.content,history.at(-1)?.content);
 assert.ok(out.metrics.sentCharacters < out.metrics.inputCharacters*.5);
 console.log('context fixture characters',JSON.stringify(out.metrics));
});
test('ordinary context is unchanged; overflow refuses without dropping user constraints',()=>{
 assert.deepEqual(prepareAgentContext([{role:'user',content:'Hi'}]).metrics,{inputCharacters:2,sentCharacters:2,maskedAssistantReplies:0});
 assert.throws(()=>prepareAgentContext([{role:'user',content:'x'.repeat(120001)}]),/saved history is unchanged/);
});
