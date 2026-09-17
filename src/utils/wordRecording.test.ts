import test from 'node:test';import assert from 'node:assert/strict';
import { mergeWordRecording } from './wordRecording';
test('a word recording replaces only its own suggestion and preserves other drafts',()=>{
 const rows=[{id:'one',word:'كيفك'},{id:'two',word:'جاهزة'}];const corrected={id:'new',word:'جاهزة'};
 assert.deepEqual(mergeWordRecording(rows,'two',corrected),[rows[0],corrected]);
 assert.deepEqual(mergeWordRecording(rows,'approved',corrected),[corrected,...rows]);
});
