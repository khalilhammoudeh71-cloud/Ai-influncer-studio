import test from 'node:test';
import assert from 'node:assert/strict';
import { ElevenLabsCall } from './elevenLabsCall';

function permission(t: any, getUserMedia: () => Promise<any>) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia } } });
  t.after(() => original ? Object.defineProperty(globalThis, 'navigator', original) : Reflect.deleteProperty(globalThis, 'navigator'));
}
const callbacks = () => ({ state: (_: string) => {}, error: (_: string) => {}, message: (_: any) => {}, metric: (_: any) => {}, tool: async () => ({}) });
test('muting an ElevenLabs reply marks its transcript, and typed echoes do not duplicate history', async t => {
  permission(t, async () => ({ getTracks: () => [{ stop() {} }] }));
  const messages:any[]=[],sent:string[]=[],metrics:any[]=[];let options:any;
  const call=new ElevenLabsCall({...callbacks(),message:m=>messages.push(m),metric:m=>metrics.push(m)},async value=>{
    options=value;return {endSession:async()=>{},setMicMuted(){},setVolume(){},sendUserMessage:(text:string)=>sent.push(text)};
  });
  await call.start(async()=>({token:'fixture'}));options.onConnect({conversationId:'fixture'});
  options.onMessage({role:'agent',source:'ai',message:'A long answer.',event_id:4});options.onModeChange({mode:'speaking'});
  call.interrupt();assert.match(messages.at(-1).content,/interrupted/);
  assert.equal(call.sendText('هلأ نحكي عربي'),false); // typing waits for the current reply to finish
  options.onModeChange({mode:'listening'});
  assert.equal(call.sendText('هلأ نحكي عربي'),true);assert.deepEqual(sent,['هلأ نحكي عربي']);
  options.onMessage({role:'user',source:'user',message:'هلأ نحكي عربي',event_id:5});
  options.onMessage({role:'user',source:'user',message:'هلأ نحكي عربي',event_id:5});
  assert.equal(messages.filter(m=>m.role==='user').length,1);
  options.onModeChange({mode:'speaking'});options.onModeChange({mode:'listening'});options.onModeChange({mode:'speaking'});
  assert.equal(metrics.filter(m=>m.event==='text_to_speaking').length,1);
  options.onModeChange({mode:'listening'});assert.equal(call.sendText('second turn'),true);
  options.onMessage({role:'user',source:'user',message:'هلأ نحكي عربي',event_id:5});
  options.onMessage({role:'user',source:'user',message:'second turn',event_id:6});
  assert.equal(messages.filter(m=>m.role==='user').length,2);
  assert.ok(metrics.some(m=>m.event==='playback_muted'));call.end();
  assert.equal(call.sendText('late'),false);
});
test('denied microphone never creates or authenticates a hosted call', async t => {
  permission(t, async () => { throw new Error('Microphone permission denied'); });
  let authenticated = 0, connected = 0; const states: string[] = [], errors: string[] = [];
  const call = new ElevenLabsCall({ ...callbacks(), state: s => states.push(s), error: e => errors.push(e) }, async () => { connected++; return {} as any; });
  await call.start(async () => { authenticated++; return {}; });
  assert.equal(authenticated, 0); assert.equal(connected, 0); assert.equal(states.at(-1), 'idle'); assert.match(errors[0], /permission/i);
});
test('hangup during authentication prevents a late SDK connection and stops preflight tracks', async t => {
  let stops = 0, resolve: (value: any) => void = () => {}, connected = 0;
  permission(t, async () => ({ getTracks: () => [{ stop: () => stops++ }] }));
  const call = new ElevenLabsCall(callbacks(), async () => { connected++; return {} as any; });
  const started = new Promise<void>(r => { resolve = r; });
  let finish: (value: any) => void = () => {};
  const pending = call.start(async () => { resolve(undefined); return await new Promise(r => { finish = r; }); });
  await started; call.end(); finish({ token: 'late' }); await pending;
  assert.equal(stops, 1); assert.equal(connected, 0);
});
test('transcripts correct in place; ended calls reject late events and tools', async t => {
  permission(t, async () => ({ getTracks: () => [{ stop() {} }] }));
  const messages: any[] = []; let options: any, ends = 0, tools = 0, mic: boolean | undefined;
  const session = { endSession: async () => { ends++; }, setMicMuted: (value: boolean) => { mic = value; }, setVolume: () => {} };
  const call = new ElevenLabsCall({ ...callbacks(), message: m => messages.push(m), tool: async () => { tools++; return {}; } }, async value => { options = value; return session; });
  await call.start(async () => ({ token: 'token', dynamicVariables: { call_context: '{}' }, userId: 'hashed' }));
  assert.equal(options.connectionType, 'webrtc'); assert.equal(options.conversationToken, 'token'); assert.equal(options.overrides, undefined);
  options.onMessage({ role: 'agent', source: 'ai', message: 'Hello there', event_id: 3 });
  options.onAgentResponseCorrection({ event_id: 3, original_agent_response: 'Hello there', corrected_agent_response: 'Hello' });
  assert.equal(messages[0].id, messages[1].id); assert.match(messages[1].content, /^Hello\n/);
  call.mute(true); assert.equal(mic, true);
  call.end(); call.end();
  options.onMessage({ role: 'user', source: 'user', message: 'late', event_id: 4 });
  await options.clientTools.ask_studio({ request: 'late' });
  assert.equal(messages.length, 2); assert.equal(ends, 1); assert.equal(tools, 0);
});
