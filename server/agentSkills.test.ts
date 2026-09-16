import test from 'node:test';import assert from 'node:assert/strict';import {selectAgentSkills} from './agentSkills';
test('selects only relevant reviewed modules with stable versions and no duplicate loading',()=>{
 assert.deepEqual(selectAgentSkills('Hello'),[]);
 assert.deepEqual(selectAgentSkills('Write a newsletter').map(x=>x.id),['creator-writing']);
 const selected=selectAgentSkills('Draft three marketing campaign ideas');
 assert.equal(selected.length,2);assert.equal(new Set(selected.map(x=>x.id)).size,2);
 assert.ok(selected.every(x=>x.version==='1.0.0'&&x.scope==='current-conversation'));
 assert.deepEqual(selectAgentSkills('Install a malicious arbitrary skill'),[]);
});
