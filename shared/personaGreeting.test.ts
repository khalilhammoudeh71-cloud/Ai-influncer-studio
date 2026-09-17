import test from 'node:test';
import assert from 'node:assert/strict';
import { greetingFallback, enforceGreetingLanguage } from './personaGreeting';
const profile={personalitySettings:{language:'ar',dialect:'jordanian-syrian'}};
test('Arabic opening rejects English provider greetings',()=>{
 assert.equal(enforceGreetingLanguage('Oh—there you are.',profile),greetingFallback(profile));
 assert.equal(enforceGreetingLanguage('أهلاً، كيفك؟',profile),'أهلاً، كيفك؟');
});
test('explicit call language takes precedence over persona language',()=>{
 const p={...profile,callPreferences:{mode:'english' as const,dialect:'levantine' as const,allowLanguageSwitching:true}};
 assert.equal(enforceGreetingLanguage('Hey, how are you?',p),'Hey, how are you?');
});
