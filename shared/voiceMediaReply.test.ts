import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceMediaReply } from './voiceMediaReply';
test('image start and completion retain Arabic from the user conversation',()=>{for(const stage of ['start','complete','details'] as const){assert.match(voiceMediaReply(stage,'image','ابعتي الصورة',[]),/[\u0600-\u06ff]/);assert.match(voiceMediaReply(stage,'image','OK',[{role:'user',content:'بدي صورة على الشاطئ'},{role:'model',content:'Done — I made that image for you.'}]),/[\u0600-\u06ff]/);}});
test('a real English request can switch to English without assistant templates deciding the language',()=>{assert.doesNotMatch(voiceMediaReply('start','image','Make that image now, please.',[{role:'user',content:'احكي بالعربي'}]),/[\u0600-\u06ff]/);});
