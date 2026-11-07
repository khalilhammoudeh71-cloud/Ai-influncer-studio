import test from 'node:test';import assert from 'node:assert/strict';
import {withExpression,requestedExpression} from './personaExpression';
import {mediaQualityLabel} from './mediaQualityLabel';
test('explicit selection adds readable intensity and auto leaves the prompt unchanged',()=>{
 assert.equal(withExpression('A portrait','auto','strong'),'A portrait');
 assert.match(withExpression('A portrait','laughter','strong'),/EXPRESSION REQUEST:.*Laughing.*Strong and unmistakable/s);
 assert.match(requestedExpression(withExpression('A portrait','neutral','natural'))!,/neutral, unsmiling/);
 assert.equal(requestedExpression('A neutral background.\nEXPRESSION FREEDOM: do not copy a smile.'),null);
 assert.ok(requestedExpression('The woman gradually starts laughing.'));
});
test('quality labels separate matching faces from failed or unknown expressions',()=>{
 assert.equal(mediaQualityLabel({status:'failed',identityStatus:'passed',expressionStatus:'failed'}),'Face matched · Expression differs');
 assert.equal(mediaQualityLabel({status:'unavailable',identityStatus:'passed',expressionStatus:'unavailable'}),'Face matched · Expression uncertain');
});
test('an opening frame is not judged against a future expression transition',()=>{
 assert.equal(requestedExpression('EXPRESSION REQUEST: Gradually starts laughing.','source'),null);
 assert.ok(requestedExpression('EXPRESSION REQUEST: Gradually starts laughing.','result'));
});
