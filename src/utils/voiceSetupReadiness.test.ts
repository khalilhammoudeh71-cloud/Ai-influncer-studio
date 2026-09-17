import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceCloningModel } from '../../shared/voiceCloningModels';
import { cloneRequirements, uniqueVoices, voiceActionRequirements } from './voiceSetupReadiness';

const ready = {model:voiceCloningModel('elevenlabs')!,sampleCount:1,authorized:true,transcript:'',saving:false,rendering:false,result:null};
test('render cannot begin without the requirements shown beside its button', () => {
  assert.deepEqual(cloneRequirements({...ready,sampleCount:0,authorized:false}).map(item=>item.target), ['recording','permission']);
  assert.deepEqual(cloneRequirements({...ready,model:voiceCloningModel('wiro-voice:fishaudio/s2-pro')!}).map(item=>item.target), ['transcript']);
  assert.equal(cloneRequirements(ready).length,0);
  assert.equal(cloneRequirements({...ready,model:voiceCloningModel('openai:tts')!,sampleCount:0,authorized:false}).length,0);
  assert.equal(cloneRequirements({...ready,model:voiceCloningModel('playht')!})[0].target,'model');
});
test('an ambiguous or pending enrollment cannot be retried as a fresh render', () => {
  for (const status of ['unknown','submitting','processing','verification_required','ready'] as const) {
    assert.ok(cloneRequirements({...ready,result:{id:'same-operation',name:'Voice',status},retryRejected:true}).length);
  }
  assert.equal(cloneRequirements({...ready,result:{id:'same-operation',name:'Voice',status:'failed'},retryRejected:true}).length,0);
});
test('a replacement recording keeps prior voice audition available but cannot save as default before rendering', () => {
  const requirements=voiceActionRequirements({saving:false,rendering:false,hasVoice:true,draftChanged:true,name:'Aria'});
  assert.equal(requirements.preview.length,0);
  assert.equal(requirements.save.length,1);
  assert.match(requirements.save[0].message,/Render your changed recording/);
  assert.equal(voiceActionRequirements({saving:false,rendering:false,hasVoice:true,draftChanged:false,name:''}).save[0].target,'identity');
});
test('voice catalogs deduplicate within a provider while preserving identical IDs from different providers', () => {
  const voice={id:'nova',name:'Nova account voice',provider:'OpenAI',engine:'openai:tts',gender:'Not specified',accent:'Not specified',tone:'Not specified'};
  const voices=uniqueVoices([voice,{...voice,name:'duplicate',provider:' openai ',engine:'openai'},{...voice,provider:'ElevenLabs'}]);
  assert.equal(voices.length,2);
  assert.equal(voices[0],voice);
});
