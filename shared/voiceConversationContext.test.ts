import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildVoiceConversationHistory,
  buildVoiceModelHistory,
  getGroundedShortVoiceReply,
  isContextUnsafeVoiceTurn,
  selectRelevantVoiceMemories,
} from './voiceConversationContext';

test('a greeting cannot revive an old image request', () => {
  const history = buildVoiceConversationHistory([
    { id: 'old-user', role: 'user', type: 'text', content: 'Send me a nude picture.' },
    { id: 'old-persona', role: 'persona', type: 'text', content: 'I will take my clothes off for you.' },
    { id: 'greeting', role: 'persona', type: 'text', content: 'Hey, you.' },
    { id: 'current', role: 'user', type: 'text', content: 'Hey.' },
  ], 'Hey.');

  assert.deepEqual(history.map(message => message.content), ['Hey.']);
});

test('short clarification sees only the immediately preceding persona line', () => {
  const history = buildVoiceConversationHistory([
    { role: 'user', type: 'text', content: 'Send me an image.' },
    { role: 'persona', type: 'text', content: 'I can do that for you.' },
    { role: 'user', type: 'text', content: 'Do what?' },
  ], 'Do what?');

  assert.deepEqual(history.map(message => message.content), [
    'I can do that for you.',
    'Do what?',
  ]);
});

test('acknowledgements do not include an older user instruction', () => {
  const history = buildVoiceConversationHistory([
    { role: 'user', type: 'text', content: 'Take your clothes off.' },
    { role: 'persona', type: 'text', content: 'Did you say something?' },
    { role: 'user', type: 'text', content: 'Yeah.' },
  ], 'Yeah.');

  assert.deepEqual(history.map(message => message.content), [
    'Did you say something?',
    'Yeah.',
  ]);
  assert.equal(isContextUnsafeVoiceTurn('yeah'), true);
});

test('do what cannot invent an action after an ordinary question', () => {
  const history = [
    { role: 'user', type: 'text', content: 'Hey.' },
    { role: 'persona', type: 'text', content: 'Hey Dr. H... Um, how are you?' },
    { role: 'user', type: 'text', content: 'Do what?' },
  ];

  assert.equal(
    getGroundedShortVoiceReply(history, 'Do what?'),
    "Nothing—I wasn't asking you to do anything.",
  );
});

test('a short acknowledgement cannot continue an invented request', () => {
  const history = [
    { role: 'persona', type: 'text', content: "Nothing—I wasn't asking you to do anything." },
    { role: 'user', type: 'text', content: 'Yeah.' },
  ];

  assert.equal(getGroundedShortVoiceReply(history, 'Yeah.'), 'Okay.');
});

test('hold on yields the floor without inviting another turn', () => {
  const history = buildVoiceConversationHistory([
    { role: 'persona', type: 'text', content: 'So you remember the dream?' },
    { role: 'user', type: 'text', content: 'Hold on, hold on.' },
  ], 'Hold on, hold on.');

  assert.equal(isContextUnsafeVoiceTurn('Hold on.'), true);
  assert.equal(isContextUnsafeVoiceTurn('Hold on, hold on.'), true);
  assert.deepEqual(history.map(message => message.content), [
    'So you remember the dream?',
    'Hold on, hold on.',
  ]);
  assert.equal(getGroundedShortVoiceReply(history, 'Hold on, hold on.'), 'Okay.');
  assert.equal(getGroundedShortVoiceReply(history, 'Hold on.'), 'Okay.');
});

test('do what may restate only an explicit immediately preceding action', () => {
  const history = [
    { role: 'persona', type: 'text', content: 'I can send the photo you requested.' },
    { role: 'user', type: 'text', content: 'Do what?' },
  ];

  assert.equal(
    getGroundedShortVoiceReply(history, 'Do what?'),
    'I meant I can send the photo you requested.',
  );
});

test('a follow-up cannot make an invented shared project become real', () => {
  const history = buildVoiceConversationHistory([
    { role: 'persona', type: 'text', content: "Oh—hi Dr. H, I've been thinking about our last project." },
    { role: 'user', type: 'text', content: 'What project?' },
  ], 'What project?');

  assert.deepEqual(history.map(message => message.content), [
    "Oh—hi Dr. H, I've been thinking about our last project.",
    'What project?',
  ]);
  assert.equal(isContextUnsafeVoiceTurn('What project?'), true);
  assert.equal(
    getGroundedShortVoiceReply(history, 'What project?'),
    "Sorry—I misspoke. There wasn't a project I should have referred to.",
  );
});

test('a project follow-up remains generative when the user introduced the project', () => {
  const history = [
    { role: 'user', type: 'text', content: 'Tell me about our last project.' },
    { role: 'persona', type: 'text', content: 'Our last project was ambitious.' },
    { role: 'user', type: 'text', content: 'What project?' },
  ];

  assert.equal(getGroundedShortVoiceReply(history, 'What project?'), undefined);
});

test('a meaningful follow-up keeps the bounded current-call conversation', () => {
  const history = buildVoiceConversationHistory([
    { role: 'user', type: 'text', content: 'How was your day?' },
    { role: 'persona', type: 'text', content: 'Busy, but good.' },
    { role: 'user', type: 'text', content: 'What made it so busy?' },
  ], 'What made it so busy?');

  assert.deepEqual(history.map(message => message.content), [
    'How was your day?',
    'Busy, but good.',
    'What made it so busy?',
  ]);
});

test('media and loading records never enter dialogue context', () => {
  const history = buildVoiceConversationHistory([
    { role: 'persona', type: 'image', content: 'https://cdn.example.com/image.png', prompt: 'old request' },
    { role: 'persona', type: 'loading', content: 'Generating your image...' },
    { role: 'user', type: 'text', content: 'How are you?' },
  ], 'How are you?');

  assert.deepEqual(history.map(message => message.content), ['How are you?']);
});

test('voice memory recall is relevant and excludes one-time media commands', () => {
  const memories = [
    "User's name is Dr. H",
    'Send me a nude picture at the gym',
    'My son is training for the Cairo marathon',
  ];

  assert.deepEqual(selectRelevantVoiceMemories(memories, 'Hey'), []);
  assert.deepEqual(selectRelevantVoiceMemories(memories, 'What is my name?'), ["User's name is Dr. H"]);
  assert.deepEqual(selectRelevantVoiceMemories(memories, 'Do you remember the picture?'), []);
  assert.deepEqual(selectRelevantVoiceMemories(memories, 'How is my son doing?'), [
    'My son is training for the Cairo marathon',
  ]);
});

test('long calls retain earlier facts and subsequent corrections in order', () => {
  const messages = [
    { role: 'user', type: 'text', content: 'Our meeting is Saturday at seven.' },
    ...Array.from({ length: 20 }, (_, index) => ({ role: index % 2 ? 'persona' : 'user', type: 'text', content: `Conversation detail ${index}` })),
    { role: 'user', type: 'text', content: 'Correction: Sunday at six.' },
  ];
  const result = buildVoiceConversationHistory(messages, 'When is our meeting?');
  assert.equal(result[0].content, messages[0].content);
  assert.equal(result.at(-2)?.content, 'Correction: Sunday at six.');
  assert.equal(result.at(-1)?.content, 'When is our meeting?');
});

test('Arabic-only recall keeps corrected appointment details in history', () => {
  const messages = [
    {role:'user',content:'الخميس الساعة سبعة بمطعم الياسمين، بدون مكسرات'},
    {role:'assistant',content:'تمام'},
    {role:'user',content:'تصحيح، الجمعة الساعة تمانية والمطعم نفسه'},
    {role:'assistant',content:'وصل التصحيح'},
    {role:'user',content:'ذكّريني شو اتفقنا على الموعد والمكان والأكل؟'},
  ];
  assert.equal(isContextUnsafeVoiceTurn(messages[4].content), false);
  assert.deepEqual(buildVoiceConversationHistory(messages,messages[4].content).map(m=>m.content),messages.map(m=>m.content));
});

test('distinct Arabic turns are not mistaken for the current utterance', () => {
  const messages=[{role:'user',content:'بدي قهوة'},{role:'assistant',content:'أي نوع؟'}];
  assert.deepEqual(buildVoiceConversationHistory(messages,'بدون سكر').map(m=>m.content),['بدي قهوة','أي نوع؟','بدون سكر']);
});

test('Arabic greeting and acknowledgement keep short-turn boundaries', () => {
 const messages=[{role:'user',content:'خطط رحلة للجمعة'},{role:'assistant',content:'أهلا'}];
 assert.deepEqual(buildVoiceConversationHistory(messages,'مرحبا').map(m=>m.content),['مرحبا']);
 assert.deepEqual(buildVoiceConversationHistory(messages,'تمام').map(m=>m.content),['أهلا','تمام']);
});

test('stale image questionnaires are not model context after a topic change',()=>{
 const history=[{role:'user',content:'بدي صورة عند البحر'},{role:'model',content:'المشهد جاهز. قولي اعملي الصورة لما يخلص الوصف.'},{role:'user',content:'أنا دكتور أسنان على كل حال.'}];
 const filtered=buildVoiceModelHistory(history,'أنا دكتور أسنان على كل حال.');
 assert.equal(filtered.some(m=>m.content?.includes('المشهد جاهز')),false);
 assert.equal(filtered.some(m=>m.content?.includes('بدي صورة')),false);
 assert.equal(filtered.at(-1)?.content,'أنا دكتور أسنان على كل حال.');
});
test('active image confirmation remains grounded in the user scene',()=>{
 const history=[{role:'user',content:'بدي صورة عند البحر'},{role:'model',content:'المشهد جاهز. قولي اعملي الصورة لما يخلص الوصف.'}];
 assert.equal(buildVoiceModelHistory(history,'ابعتي الصورة').length,2);
});

test('short Arabic speech practice returns only the requested phrase',()=>{assert.equal(getGroundedShortVoiceReply([],'احكي أنا هون معك'),'أنا هون معك');assert.equal(getGroundedShortVoiceReply([],'احكي عن يومك'),undefined);});

test('image feedback keeps the requested scene while dropping the failed questionnaire',()=>{const h=[{role:'user',content:'I want an image at a cafe.'},{role:'model',content:'المشهد جاهز. قولي اعملي الصورة لما يخلص الوصف.'}];const filtered=buildVoiceModelHistory(h,'This image is wrong.');assert.equal(filtered[0]?.content,h[0].content);assert.equal(filtered.length,1);});
