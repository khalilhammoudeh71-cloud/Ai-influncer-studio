import test from 'node:test';
import assert from 'node:assert/strict';
import { VoicePreviewJobs } from './voicePreviewJobs';
function setup() {
 const rows=new Map<string,any>();let submissions=0;let complete=false;
 const jobs=new VoicePreviewJobs({get:async(o,k)=>rows.get(o+k),put:async(o,k,v)=>{rows.set(o+k,v);},claim:async(o,k,v)=>{if(rows.has(o+k))return false;rows.set(o+k,v);return true;}},{WAVESPEED_API_KEY:'test'},async(_url,init)=>{
 if(init?.method==='POST'){submissions++;return Response.json({data:{id:'provider-job',status:'processing'}});}
 return Response.json({data:{id:'provider-job',status:complete?'completed':'processing',outputs:complete?['https://example.com/voice.wav']:[]}});
 });
 return {jobs,submitted:()=>submissions,finish:()=>{complete=true;}};
}
const body={engine:'wavespeed:zonos2',text:'Hello',voiceReference:'https://example.com/audio.wav?token=one'};
test('queued render returns immediately, resumes across requests and submits once',async()=>{
 const fixture=setup();const first=await fixture.jobs.start('owner',body);
 assert.equal(first.status,'processing');assert.equal(first.audioUrl,undefined);
 const resumed=await fixture.jobs.start('owner',{...body,voiceReference:'https://example.com/audio.wav?token=two'});
 assert.equal(resumed.id,first.id);assert.equal(fixture.submitted(),1);
 fixture.finish();assert.equal((await fixture.jobs.status('owner',first.id)).audioUrl,'https://example.com/voice.wav');
 assert.equal(fixture.submitted(),1);
});
test('job status is owner scoped and changed text starts a distinct render',async()=>{
 const fixture=setup();const first=await fixture.jobs.start('owner',body);
 await assert.rejects(fixture.jobs.status('other',first.id),/not found/);
 const next=await fixture.jobs.start('owner',{...body,text:'Different'});
 assert.notEqual(next.id,first.id);assert.equal(fixture.submitted(),2);
});
