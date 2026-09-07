import assert from 'node:assert/strict';
import test from 'node:test';
import { encodePersonality, decodePersonality, buildPersonalityInstructions, personalityDelivery, normalizePersonality } from './personality';
test('legacy traits and configured traits survive storage round trips', () => {
 assert.deepEqual(decodePersonality('["Playful"]').personalityTraits, ['Playful']);
 const p = {personalityTraits:['Playful','Analytical'], personalitySettings:{primary:'Playful', intensities:{Playful:'strong'}, voiceEnabled:true}};
 assert.deepEqual(decodePersonality(encodePersonality(p)), {...p, personalitySettings:normalizePersonality(p)});
});
test('removed primary and invalid intensities cannot leak into behavior', () => {
 const p = {personalityTraits:['Analytical'],personalitySettings:{primary:'Playful',intensities:{Analytical:'invalid',Playful:'strong'}}};
 assert.equal(normalizePersonality(p).primary,'Analytical');
 assert.deepEqual(normalizePersonality(p).intensities,{Analytical:'balanced'});
 assert.match(buildPersonalityInstructions(p), /separate facts from assumptions/);
});
test('primary trait leads conflicts and intensity changes delivery', () => {
 const p = (level:string) => ({personalityTraits:['High-Energy','Intimate'],personalitySettings:{primary:'High-Energy',intensities:{'High-Energy':level,Intimate:'subtle'},voiceEnabled:true}});
 assert.match(buildPersonalityInstructions(p('strong')), /Primary.*High-Energy/);
 assert.ok(personalityDelivery(p('strong')).speed! > personalityDelivery(p('subtle')).speed!);
 assert.deepEqual(personalityDelivery({...p('strong'),personalitySettings:{voiceEnabled:false}}),{});
});
