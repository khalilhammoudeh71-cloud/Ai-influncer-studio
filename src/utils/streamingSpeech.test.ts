import test from 'node:test';import assert from 'node:assert/strict';
import { createStreamingSpeech, validateSpeechStream } from './streamingSpeech';
import {needsReusableCallAudio} from './callAudioPlayback';
test('stream refuses audio from a different voice or missing identity',()=>{
 assert.throws(()=>validateSpeechStream(new Response('audio',{headers:{'content-type':'audio/mpeg','x-voice-id':'other'}}),'selected'),/identity/);
 assert.throws(()=>validateSpeechStream(new Response('audio',{headers:{'content-type':'audio/mpeg'}}),'selected'),/identity/);
});
test('stream accepts only successful audio with the requested voice',()=>{
 assert.doesNotThrow(()=>validateSpeechStream(new Response('audio',{headers:{'content-type':'audio/mpeg','x-voice-id':'selected'}}),'selected'));
 assert.throws(()=>validateSpeechStream(new Response('{}',{headers:{'content-type':'application/json','x-voice-id':'selected'}}),'selected'),/audio/);
});
test('iPad desktop mode buffers speech for the gesture-unlocked player instead of attaching MediaSource',async()=>{
 const originals=Object.fromEntries(['navigator','Audio','MediaSource'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 let audio:any;
 try {
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:5}});
  Object.defineProperty(globalThis,'Audio',{configurable:true,value:class extends EventTarget {src='';pause(){}constructor(){super();audio=this;}}});
  Object.defineProperty(globalThis,'MediaSource',{configurable:true,value:class {static isTypeSupported(){throw new Error('iPad must use reusable buffered audio');}}});
  assert.equal(needsReusableCallAudio(),true);
  await createStreamingSpeech(new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'audio/mpeg','x-voice-id':'selected'}}),'selected',new AbortController().signal);
  assert.match(audio.src,/^blob:/);audio.dispatchEvent(new Event('ended'));
 } finally {for(const [key,descriptor] of Object.entries(originals)) {if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete (globalThis as any)[key];}}
});
