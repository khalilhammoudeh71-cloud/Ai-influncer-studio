import test from 'node:test';import assert from 'node:assert/strict';
import { validateSpeechStream } from './streamingSpeech';
test('stream refuses audio from a different voice or missing identity',()=>{
 assert.throws(()=>validateSpeechStream(new Response('audio',{headers:{'content-type':'audio/mpeg','x-voice-id':'other'}}),'selected'),/identity/);
 assert.throws(()=>validateSpeechStream(new Response('audio',{headers:{'content-type':'audio/mpeg'}}),'selected'),/identity/);
});
test('stream accepts only successful audio with the requested voice',()=>{
 assert.doesNotThrow(()=>validateSpeechStream(new Response('audio',{headers:{'content-type':'audio/mpeg','x-voice-id':'selected'}}),'selected'));
 assert.throws(()=>validateSpeechStream(new Response('{}',{headers:{'content-type':'application/json','x-voice-id':'selected'}}),'selected'),/audio/);
});
