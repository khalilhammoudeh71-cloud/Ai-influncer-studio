import {test} from 'node:test';import assert from 'node:assert/strict';import {isVideoUpload,VIDEO_UPLOAD_ACCEPT} from './videoUploadPolicy';
test('only video files are accepted, including extension-only camera clips',()=>{
 assert.equal(isVideoUpload({type:'video/mp4',name:'clip.mp4'}),true);assert.equal(isVideoUpload({type:'',name:'CLIP.MOV'}),true);assert.equal(isVideoUpload({type:'image/png',name:'portrait.png'}),false);assert.equal(isVideoUpload({type:'image/png',name:'fake.mp4'}),false);assert.equal(isVideoUpload({type:'audio/mpeg',name:'voice.mp3'}),false);assert.ok(!VIDEO_UPLOAD_ACCEPT.includes('image'));
});
