import test from 'node:test';import assert from 'node:assert/strict';
import {coverGenerationPrompt,normalizeCoverChoices,COVER_LIBRARY} from './carouselCover';
import {packCarouselImages,unpackCarouselImages} from './carousel';
import {existsSync} from 'node:fs';
test('cover prompt includes selected styling and user details',()=>{const p=coverGenerationPrompt('Keep my glasses',{outfit:'leather',hair:'bun',angle:'side'});assert.match(p,/leather motorcycle/);assert.match(p,/sleek bun/);assert.match(p,/side-profile/);assert.match(p,/Keep my glasses/);assert.deepEqual(normalizeCoverChoices({hair:'bad',outfit:'leather'}),{outfit:'leather'});});
test('reference and styling roundtrip separately from the final cover',()=>{const original={headline:'',body:'',image:'/output.jpg',coverReference:'/reference.jpg',coverChoices:{hair:'bun',background:'cafe'}};const packed=packCarouselImages([original]);assert.equal(packed.assets.length,2);const restored=unpackCarouselImages(packed.slides[0],packed.assets);assert.equal(restored.image,'/output.jpg');assert.equal(restored.coverReference,'/reference.jpg');assert.equal(restored.coverChoices?.hair,'bun');});
test('every visual library example exists locally',()=>{for(const presets of Object.values(COVER_LIBRARY))for(const preset of presets)if('image' in preset)assert.ok(existsSync('public'+preset.image),preset.image);});
