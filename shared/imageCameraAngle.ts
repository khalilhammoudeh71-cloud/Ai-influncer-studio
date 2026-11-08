export const IMAGE_CAMERA_ANGLES=[
 {id:'default',label:'Default',cue:''},
 {id:'eye-level',label:'Eye level',cue:'Camera at the subject’s eye level.'},
 {id:'front',label:'Straight on',cue:'Straight-on frontal view, camera facing the subject.'},
 {id:'three-quarter-left',label:'¾ view — left',cue:'Three-quarter view showing the left side of the subject’s face.'},
 {id:'three-quarter-right',label:'¾ view — right',cue:'Three-quarter view showing the right side of the subject’s face.'},
 {id:'profile-left',label:'Left profile',cue:'Left side profile view, looking across the subject rather than straight on.'},
 {id:'profile-right',label:'Right profile',cue:'Right side profile view, looking across the subject rather than straight on.'},
 {id:'high-angle',label:'High angle',cue:'Camera above the subject, looking down at a gentle angle.'},
 {id:'low-angle',label:'Low angle',cue:'Camera below the subject, looking up at a gentle angle.'},
 {id:'overhead',label:'Overhead / top down',cue:'Overhead camera, looking straight down from above the subject.'},
 {id:'birds-eye',label:'Bird’s-eye view',cue:'A high bird’s-eye view showing the subject and their surroundings from above.'},
 {id:'worms-eye',label:'Worm’s-eye view',cue:'Camera very close to ground level looking steeply upward at the subject.'},
 {id:'dutch-left',label:'Tilted left',cue:'A Dutch-angle camera tilted to the left, with a slanted horizon.'},
 {id:'dutch-right',label:'Tilted right',cue:'A Dutch-angle camera tilted to the right, with a slanted horizon.'},
 {id:'shoulder-left',label:'Over left shoulder',cue:'Camera behind and over the subject’s left shoulder.'},
 {id:'shoulder-right',label:'Over right shoulder',cue:'Camera behind and over the subject’s right shoulder.'},
 {id:'rear',label:'From behind',cue:'Rear view with the camera behind the subject.'},
 {id:'rear-three-quarter-left',label:'Rear ¾ — left',cue:'Rear three-quarter view from behind the subject’s left side.'},
 {id:'rear-three-quarter-right',label:'Rear ¾ — right',cue:'Rear three-quarter view from behind the subject’s right side.'},
 {id:'pov',label:'Point of view',cue:'First-person point of view, as if seen through the subject’s eyes.'},
 {id:'selfie',label:'Selfie angle',cue:'Arm’s-length selfie perspective, camera slightly above eye level facing the subject.'},
 {id:'mirror',label:'Mirror view',cue:'View of the subject’s reflection in a mirror, with the camera aimed toward the mirror.'},
 {id:'ground-level',label:'Ground level',cue:'Camera at ground level with the lens approximately parallel to the ground.'},
 {id:'hip-level',label:'Hip level',cue:'Camera at the subject’s hip height, looking horizontally across the scene.'},
 {id:'shoulder-level',label:'Shoulder level',cue:'Camera at the subject’s shoulder height, looking horizontally at the subject.'},
] as const;
export type ImageCameraAngle=typeof IMAGE_CAMERA_ANGLES[number]['id'];
export function withCameraAngle(prompt:string,angle:ImageCameraAngle):string{
 const cue=IMAGE_CAMERA_ANGLES.find(item=>item.id===angle)?.cue;
 return cue?`${prompt.trim()}\nCAMERA ANGLE: ${cue} Use this camera viewpoint while preserving the persona’s identity.`:prompt;
}
