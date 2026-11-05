import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaJobLibraryEntry } from './mediaJobLibrary';
const job:any={id:'test-job',kind:'avatar',status:'succeeded',personaClientId:'original-persona',summary:'Hello',createdAt:'2026-11-05T04:00:00Z',result:{url:'https://example.com/result.mp4',model:'InfiniteTalk'}};
test('recovered media keeps its original persona and video type with a stable save ID',()=>{
 const entry=mediaJobLibraryEntry(job)!;
 assert.equal(entry.personaId,'original-persona');assert.equal(entry.media.mediaType,'video');
 assert.equal(entry.media.url,job.result.url);assert.equal(entry.media.model,'InfiniteTalk');
 assert.deepEqual(mediaJobLibraryEntry(job),entry);
 assert.equal(mediaJobLibraryEntry({...job,kind:'video'})?.media.mediaType,'video');
});
test('unfinished and unbound jobs cannot be saved to an unrelated active persona',()=>{
 assert.equal(mediaJobLibraryEntry({...job,status:'running'}),null);
 assert.equal(mediaJobLibraryEntry({...job,personaClientId:null}),null);
 assert.equal(mediaJobLibraryEntry({...job,result:null}),null);
});
