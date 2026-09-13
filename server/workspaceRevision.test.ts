import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceWriteRevision } from './workspaceRevision';
test('agent history retains the originating write time instead of network arrival time',()=>{
 const now=Date.parse('2026-09-13T12:02:00Z');
 assert.equal(workspaceWriteRevision('chat_history_super_agent','2026-09-13T12:01:00Z',now).toISOString(),'2026-09-13T12:01:00.000Z');
});
test('old clients and future-clock writes cannot overwrite protected histories',()=>{
 assert.throws(()=>workspaceWriteRevision('chat_history_super_agent',undefined),/Reload/);
 assert.throws(()=>workspaceWriteRevision('chat_history_super_agent',new Date(Date.now()+86400000).toISOString()),/clock/);
});
