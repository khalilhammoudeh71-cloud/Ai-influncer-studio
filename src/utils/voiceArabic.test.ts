import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeVoiceWords,mergeVoiceTranscriptSegments,getVoiceTurnCommitDelay} from './voiceStability';
import {isVoiceProviderEcho} from '../../server/voiceRouting';
test('Arabic transcript words and consecutive distinct segments survive normalization',()=>{assert.equal(normalizeVoiceWords('مرحبا كيف حالك').length,3);assert.equal(mergeVoiceTranscriptSegments('بدي أحكي معك','عن شغلة جديدة'),'بدي أحكي معك عن شغلة جديدة');});
test('Arabic echoes are rejected while genuine replies are preserved',()=>{assert.equal(isVoiceProviderEcho('بدي أحكي معك عن شغلة جديدة','بدي أحكي معك عن شغلة جديدة'),true);assert.equal(isVoiceProviderEcho('بدي أحكي معك عن شغلة جديدة','أكيد خبرني شو صار معك اليوم'),false);});
test('Arabic interruptions and incomplete clauses get appropriate timing',()=>{assert.equal(getVoiceTurnCommitDelay('استني شوي',{source:'realtime'}),90);assert.ok(getVoiceTurnCommitDelay('كنت عم بحكي بس',{source:'realtime'})>=700);});

test('Arabic vocalization does not create false word boundaries',()=>{assert.deepEqual(normalizeVoiceWords('بِدّي أحكي مَعَك'),normalizeVoiceWords('بدي أحكي معك'));assert.equal(isVoiceProviderEcho('بدي أحكي معك عن شغلة جديدة','بِدّي أحكي مَعَك عن شغلة جديدة'),true);});
