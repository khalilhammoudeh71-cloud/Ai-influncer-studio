import test from 'node:test';
import assert from 'node:assert/strict';
import { projectKeys, readProjects } from './agentProjects';
test('default project preserves existing conversation and brief keys',()=>{
 assert.deepEqual(projectKeys('default'),{history:'chat_history_super_agent',brief:'super_agent_brief'});
});
test('projects cannot share conversations or briefs',()=>{
 assert.notEqual(projectKeys('a').history,projectKeys('b').history);
 assert.notEqual(projectKeys('a').brief,projectKeys('b').brief);
});
test('project catalog always includes the original workspace and rejects malformed entries',()=>{
 assert.deepEqual(readProjects('{invalid'),[{id:'default',name:'Main workspace'}]);
 assert.deepEqual(readProjects('[{"id":"a","name":"Campaign"},{"id":"a","name":"Duplicate"},{"id":7,"name":"Bad"}]'),[{id:'default',name:'Main workspace'},{id:'a',name:'Campaign'}]);
});
