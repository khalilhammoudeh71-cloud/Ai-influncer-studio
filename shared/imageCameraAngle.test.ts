import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IMAGE_CAMERA_ANGLES,withCameraAngle} from './imageCameraAngle';
test('default preserves the description and explicit angles reach the generation prompt',()=>{
 assert.equal(IMAGE_CAMERA_ANGLES[0].id,'default');
 assert.equal(withCameraAngle('A portrait','default'),'A portrait');
 assert.match(withCameraAngle('A portrait','low-angle'),/camera below.*up/i);
 assert.match(withCameraAngle('A portrait','profile-left'),/left.*profile/i);
 assert.ok(IMAGE_CAMERA_ANGLES.length>=20);
});
