import {test} from 'node:test';
import assert from 'node:assert/strict';
import {imageModelMenu,resolveImageModelChoice} from './imageModelMenu';
test('promotes the newest model from each requested image family, ignoring misleading latest badges and text models',()=>{
 const models=[{id:'old',name:'Gemini 2.5 Flash Image Latest'},{id:'text',name:'Gemini 4 Argon Developer'},{id:'sd4',name:'Seedream V4.5'},{id:'sd55',name:'Seedream V5.5'},{id:'g25',name:'GPT Image 2.5 Sunburst'},{id:'g26',name:'GPT Image 2.6 Sunburst'},{id:'banana',name:'Nano Banana 2.1'},{id:'other',name:'Flux'}];
 const menu=imageModelMenu(models);
 assert.deepEqual(menu.latest.map(m=>m.id),['g26','banana','sd55']);
 assert.equal(new Set([...menu.latest,...menu.other].map(m=>m.id)).size,models.length);
 assert.equal(models[0].id,'old');
});
test('Default resolves to the existing app default; explicit choices remain explicit',()=>{
 const models=[{id:'openai:gpt-image-2.5-sunburst',name:'GPT Image 2.5 Sunburst'},{id:'wavespeed:gpt-image-2.6',name:'GPT Image 2.6'}];
 assert.equal(resolveImageModelChoice(models,'default'),'openai:gpt-image-2.5-sunburst');
 assert.equal(resolveImageModelChoice(models,'wavespeed:gpt-image-2.6'),'wavespeed:gpt-image-2.6');
});
