import test from 'node:test';
import assert from 'node:assert/strict';
import { agentIdentityContext } from './agentIdentity';
test('creator and persona are distinguished without sending image data into text context',()=>{
 const text=agentIdentityContext({creatorName:'Dr.H',creatorProfile:{photos:['data:image/png;base64,private']},creatorPersona:{name:'Dr.H'}} as any,{name:'Rawan Hasan'});
 assert.match(text,/Dr.H/); assert.match(text,/Rawan Hasan/); assert.match(text,/1/); assert.ok(!text.includes('private'));
});
test('missing references are stated accurately',()=>{
 assert.match(agentIdentityContext({creatorName:'Dr.H',creatorProfile:{photos:[]}} as any,{name:'Rawan'}),/0/);
});
