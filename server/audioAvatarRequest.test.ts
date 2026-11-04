import test from 'node:test';
import assert from 'node:assert/strict';
import { audioAvatarModel, buildAudioAvatarRequest } from './audioAvatarRequest';

test('legacy photo-avatar callers retain their supplied voice through audio-driven animation',()=>{
  assert.equal(audioAvatarModel(), 'wavespeed-ai/infinitetalk');
  assert.equal(audioAvatarModel('wavespeed-ai/ai-talking-photos'),'wavespeed-ai/infinitetalk');
  assert.equal(audioAvatarModel('wavespeed-ai/multitalk'),'wavespeed-ai/multitalk');
});
test('the InfiniteTalk contract sends the verified image and exact audio using provider field names',()=>{
  assert.deepEqual(buildAudioAvatarRequest('data:image/jpeg;base64,verified','data:audio/wav;base64,voice'),{
    image:'data:image/jpeg;base64,verified',audio:'data:audio/wav;base64,voice',resolution:'480p'
  });
  assert.throws(()=>buildAudioAvatarRequest('', 'audio'),/image/);
  assert.throws(()=>buildAudioAvatarRequest('image', ''),/audio/);
});
