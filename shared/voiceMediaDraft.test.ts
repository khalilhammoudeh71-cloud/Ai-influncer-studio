import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveVoiceMediaDraft } from './voiceMediaDraft';
import { buildVoiceConversationHistory } from './voiceConversationContext';

const user = (content: string) => ({ role: 'user', content });
const assistant = (content: string) => ({ role: 'model', content });
test('Arabic image requests ask for a scene instead of falling through to conversation', () => {
  assert.equal(resolveVoiceMediaDraft('لا بدي صورة أنا', []).status, 'waiting');
});
test('Arabic scene and explicit send instruction authorize image generation', () => {
  const result = resolveVoiceMediaDraft('بدي صورة إلك على الشاطئ ابعتيها هلأ', []);
  assert.equal(result.status, 'ready');
  assert.equal(result.type, 'image');
});
test('Arabic send follow-up uses only the user scene', () => {
  const result = resolveVoiceMediaDraft('ابعتي الصورة', [user('بدي صورة إلك على الشاطئ'), assistant('ممكن نضيف طيارة')]);
  assert.equal(result.status, 'ready');
  assert.doesNotMatch(result.prompt || '', /طيارة/);
});
test('Arabic cancellation prevents generation', () => {
  assert.equal(resolveVoiceMediaDraft('ما بدي صورة', [user('بدي صورة على الشاطئ')]).status, 'none');
});
test('a description waits for permission rather than generating during a pause', () => {
  assert.equal(resolveVoiceMediaDraft('Generate a photo of you and me at a cafe.', []).status, 'waiting');
});
test('send that resolves the complete scene and later details without assistant inventions', () => {
  const result = resolveVoiceMediaDraft('Send me that image.', [
    user('I want an image of you and me at a cafe.'),
    assistant('We could add a helicopter.'),
    user('With blue jackets and morning light.'),
  ]);
  assert.equal(result.status, 'ready');
  assert.match(result.prompt || '', /you and me at a cafe/);
  assert.match(result.prompt || '', /blue jackets and morning light/);
  assert.doesNotMatch(result.prompt || '', /helicopter/);
});
test('cancellation and completed media prevent stale confirmations', () => {
  for (const boundary of [user('Never mind.'), { role: 'persona', type: 'image', content: 'asset' }]) {
    assert.notEqual(resolveVoiceMediaDraft('Send that.', [user('A photo of you and me at a cafe.'), boundary]).status, 'ready');
  }
});
test('a bare acknowledgement does not authorize a generation', () => {
  assert.notEqual(resolveVoiceMediaDraft('Yeah.', [user('Generate a photo of a cafe.')]).status, 'ready');
});
test('standalone confirmation without scene asks for details', () => {
  assert.equal(resolveVoiceMediaDraft('Now generate the image.', []).status, 'waiting');
});
test('an explicit final instruction can finish a description in one turn', () => {
  assert.equal(resolveVoiceMediaDraft('A photo of you and me in blue jackets at a cafe. Go ahead and make it.', []).status, 'ready');
});
test('yes only confirms an immediate draft confirmation question', () => {
  assert.equal(resolveVoiceMediaDraft('Yes.', [user('An image of you and me at a cafe.'), assistant('Anything else in the picture, or shall I make it?')]).status, 'ready');
});
test('video completion keeps the selected media kind', () => {
  assert.equal(resolveVoiceMediaDraft('A video of you walking at the beach. Go ahead and make it.', []).type, 'video');
});
test('call history retains a pending scene only for its immediate confirmation', () => {
  const history = [user('A photo of you and me at a cafe.'), assistant('Anything else in the picture, or shall I make it?'), user('Yes.')];
  const transmitted = buildVoiceConversationHistory(history, 'Yes.');
  assert.equal(resolveVoiceMediaDraft('Yes.', transmitted).status, 'ready');
});

test('a continuation remains pending without claiming generation', () => {
  const result = resolveVoiceMediaDraft('With blue jackets and morning light.', [user('I want an image of you and me sitting at a cafe.'), assistant('Anything else you want in the picture, or shall I make it?')]);
  assert.equal(result.status, 'waiting');
  assert.match(result.prompt || '', /blue jackets/);
});

test('feedback on an existing image stays conversation instead of restarting the media questionnaire',()=>{const history=[user('بدي صورة على الشاطئ ابعتيها'),{role:'persona',type:'image',content:'asset'},assistant('Done — I made that image for you.')];for(const text of ['بس لأ مش هاي الصورة اللي طلبتها أنا','ليش بتبعتيلي صور غلط؟','الصورة لسه ما وصلتني','This image is wrong, it is not what I asked for.','Why do you keep sending the wrong image?'])assert.equal(resolveVoiceMediaDraft(text,history).status,'none',text);});
test('an explicit Arabic edit to a completed image bypasses the new scene questionnaire',()=>{assert.equal(resolveVoiceMediaDraft('غيري الخلفية للون الأحمر',[{role:'persona',type:'image',content:'asset'}]).status,'none');});

test('identity mismatch feedback does not become a new scene', () => {
 const history=[user('بدي صورة إلي بالقهوة ابعتيها'),{role:'persona',type:'image',content:'asset'}];
 for(const text of ['بس الصورة اللي انتي بعتيلي إياها بس هذا الواحد مش أنا','هذا مش أنا','الشخص بالصورة ما بيشبهني','The person in this image is not me.','That does not look like me.']) assert.equal(resolveVoiceMediaDraft(text,history).status,'none',text);
});

test('ordinary descriptive speech cannot start a media draft',()=>{
 for(const text of ['أنا قاعدة عند أختي وبحكي معها','كنت على البحر اليوم','I am sitting at a cafe wearing a jacket.','عندي صورة قديمة من أيام الجامعة']) assert.equal(resolveVoiceMediaDraft(text,[]).status,'none',text);
});
test('changing topic clears an unfinished media request',()=>{
 const history=[user('I want an image of you and me at a cafe.'),assistant('Anything else in the picture?'),user('My sister called today.'),assistant('How is she?')];
 for(const text of ['With blue jackets.','Send that.','I am sitting at a cafe.']) assert.equal(resolveVoiceMediaDraft(text,history).status,'none',text);
});
test('unrelated Arabic conversation clears a pending image scene',()=>{
 assert.equal(resolveVoiceMediaDraft('أنا قاعدة عند أختي هلأ',[user('بدي صورة إلك على الشاطئ'),assistant('شو بدك كمان بالصورة؟')]).status,'none');
});

test('an assistant image question alone cannot create a request',()=>{
 assert.equal(resolveVoiceMediaDraft('تمام',[assistant('المشهد جاهز. قولي اعملي الصورة لما يخلص الوصف.')]).status,'none');
});
