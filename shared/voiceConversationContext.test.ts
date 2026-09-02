import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildVoiceConversationHistory,
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
