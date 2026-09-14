import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryAdvice} from './agentRecovery';
test('billing and policy failures require resolution, not blind retries',()=>{assert.equal(recoveryAdvice('Insufficient credits').retry,false);assert.equal(recoveryAdvice('Content flagged as potentially sensitive').retry,false);});
test('temporary failures and unchanged outputs have different recovery paths',()=>{assert.equal(recoveryAdvice('HTTP 504').kind,'temporary');assert.equal(recoveryAdvice('returned the source image unchanged').kind,'mismatch');assert.equal(recoveryAdvice('unknown').retry,false);});
