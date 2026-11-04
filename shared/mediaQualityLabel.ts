export function mediaQualityLabel(q:{status:string;identityStatus?:string;sceneStatus?:string;temporalStatus?:string},retried=false):string {
 if(q.temporalStatus==='failed')return 'Face changes detected';
 if(q.temporalStatus==='unavailable')return 'Video face check incomplete';
 if(q.identityStatus==='passed'&&q.sceneStatus==='unavailable')return 'Face matched · Scene uncertain';
 if(q.identityStatus==='passed'&&q.sceneStatus==='failed')return 'Face matched · Scene differs';
 if(q.status==='passed')return retried?'Auto-corrected and checked':q.temporalStatus==='passed'?'Video face consistency checked':'Identity checked';
 return q.identityStatus==='failed'?'Face match failed':'Visual check unavailable';
}
