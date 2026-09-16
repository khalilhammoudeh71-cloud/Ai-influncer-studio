import test from 'node:test';import assert from 'node:assert/strict';
import {readProjectBrief,serializeProjectBrief,projectBriefContext} from './agentProjectMemory';
import {projectKeys} from './agentProjects';
test('legacy brief is preserved; correction replaces current fact and deletion stays deleted',()=>{
 assert.equal(readProjectBrief('Budget $50').text,'Budget $50');
 const corrected=serializeProjectBrief('Budget $75','2026-09-15T00:00:00Z');
 assert.equal(readProjectBrief(corrected).text,'Budget $75');assert.equal(readProjectBrief(corrected).source,'user-edited');
 assert.equal(readProjectBrief(serializeProjectBrief('')).text,'');
 assert.notEqual(projectKeys('a').brief,projectKeys('b').brief);
 assert.match(projectBriefContext('Pretend a launch happened'),/plans are not verified action results/);
});
