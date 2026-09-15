import test from 'node:test';
import assert from 'node:assert/strict';
import {SpeechEngineTranscript} from './speechEngineTranscript';
test('repeated provider events update the same chat turn, and user/model IDs remain separate',()=>{
 const t=new SpeechEngineTranscript('call-a');
 const first=t.receive('model','Hi',4);
 assert.equal(t.receive('model','Hi there',4).id,first.id);
 assert.notEqual(t.receive('user','Hello',4).id,first.id);
 assert.notEqual(new SpeechEngineTranscript('call-b').receive('model','Hi',4).id,first.id);
});
test('interruption and corrected speech replace a reply without pretending its unsaid ending played',()=>{
 const t=new SpeechEngineTranscript('call');
 const full=t.receive('model','We can visit the museum tomorrow.',8);
 assert.match(t.interrupt(8)?.content||'',/interrupted/);
 const corrected=t.correct(8,full.content,'We can visit');
 assert.equal(corrected?.id,full.id);
 assert.match(corrected?.content||'',/^We can visit/);
 assert.doesNotMatch(corrected?.content||'',/tomorrow/);
 assert.equal(t.correct(99,'unknown','unrelated'),undefined);
});
