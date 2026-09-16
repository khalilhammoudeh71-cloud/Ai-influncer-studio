import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPronunciations, explicitPronunciationPair, pronunciationPair, type PronunciationRule } from './pronunciation';
const rule=(word:string,spokenAs:string):PronunciationRule=>({id:word,word,spokenAs,source:'explicit-user-correction',updatedAt:''});
test('extracts an explicit correction and rejects reported examples',()=>{
 assert.deepEqual(explicitPronunciationPair('Don’t say one, say two'),{word:'one',spokenAs:'two'});
 assert.deepEqual(explicitPronunciationPair('do not say قهوة, قول أهوة'),{word:'قهوة',spokenAs:'أهوة'});
 assert.deepEqual(explicitPronunciationPair('please pronounce "read" as "red".'),{word:'read',spokenAs:'red'});
 assert.equal(explicitPronunciationPair('She told me do not say one, say two'),undefined);
 assert.equal(pronunciationPair({word:'hello',spokenAs:'[excited] hello'}),undefined);
 assert.equal(pronunciationPair({word:'سلام',spokenAs:'سلام'}),undefined);
});
test('Arabic and phrase replacements preserve boundaries, punctuation and displayed source',()=>{
 const source='قهوة، قهوتي. New York and York.';
 const rules=[rule('قهوة','أهوة'),rule('New York','New Yawk'),rule('York','Yawk'),rule('Yawk','wrong')];
 assert.equal(applyPronunciations(source,rules),'أهوة، قهوتي. New Yawk and Yawk.');
 assert.equal(source,'قهوة، قهوتي. New York and York.');
 assert.equal(applyPronunciations('HELLO! shelloworld',[rule('hello','hullo')]),'hullo! shelloworld');
});

test('shared pronunciation applies to existing and new personas, with explicit local overrides',async()=>{
 const {mergePronunciations}=await import('./pronunciation');
 const shared:PronunciationRule={id:'shared',word:'جاهزة',spokenAs:'jah-zeh',source:'explicit-user-correction',updatedAt:'2026-09-16'};
 const own={...shared,id:'local',spokenAs:'jah-zah'};
 assert.deepEqual(mergePronunciations([shared],[]),[{...shared,scope:'all'}]);
 assert.equal(applyPronunciations('أنا جاهزة',mergePronunciations([shared],[])),'أنا jah-zeh');
 assert.deepEqual(mergePronunciations([shared],[own]),[{...own,scope:'persona'}]);
 assert.equal(applyPronunciations('أنا جاهزة',mergePronunciations([shared],[own])),'أنا jah-zah');
 assert.deepEqual(mergePronunciations([],[]),[]);
 assert.deepEqual(mergePronunciations([],[own]),[{...own,scope:'persona'}]);
 assert.equal(shared.scope,undefined);
});
