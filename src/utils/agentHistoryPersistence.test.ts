import test from 'node:test';
import assert from 'node:assert/strict';
import { saveAgentHistory } from './agentHistoryPersistence';

test('large inline media is externalized before bounded browser storage receives history', async () => {
  const raw=JSON.stringify([{role:'model',content:'Done',resultUrl:'data:image/png;base64,'+'a'.repeat(6000000)}]);
  let saved='';
  const write=(value:string)=>{if(value.length>5000000) throw new Error('QuotaExceededError');saved=value;};
  assert.throws(()=>write(raw), /Quota/);
  await saveAgentHistory(raw, async()=>JSON.stringify([{role:'model',content:'Done',resultUrl:'https://storage.example/image'}]), write, ()=>true);
  assert.match(saved,/Done/); assert.ok(saved.length<5000000);
});
test('an older media save cannot overwrite a newer conversation', async () => {
  let current=true, saved='new'; let release!:(value:string)=>void;
  const pending=saveAgentHistory('data:image/png;base64,abc',()=>new Promise(resolve=>release=resolve),v=>saved=v,()=>current);
  current=false; release('old'); await pending;
  assert.equal(saved,'new');
});
test('failed media persistence keeps existing history and surfaces the error', async () => {
  let saved='previous';
  await assert.rejects(saveAgentHistory('data:image/png;base64,abc',async()=>{throw new Error('upload failed');},v=>saved=v,()=>true),/upload failed/);
  assert.equal(saved,'previous');
});
