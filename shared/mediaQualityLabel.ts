export function mediaQualityLabel(q:{status:string;identityStatus?:string;sceneStatus?:string;temporalStatus?:string;expressionStatus?:string},retried=false):string {
 if(q.temporalStatus==='failed')return 'Face changes detected';
 if(q.temporalStatus==='unavailable')return 'Video face check incomplete';
 if(q.identityStatus==='passed'&&q.sceneStatus==='unavailable')return 'Face matched · Scene uncertain';
 if(q.identityStatus==='passed'&&q.sceneStatus==='failed')return 'Face matched · Scene differs';
 if(q.identityStatus==='failed')return 'Face match failed';
 if(q.identityStatus==='passed'&&q.expressionStatus==='failed')return 'Face matched · Expression differs';
 if(q.identityStatus==='passed'&&q.expressionStatus==='unavailable')return 'Face matched · Expression uncertain';
 if(q.status==='passed'&&q.expressionStatus==='passed')return q.temporalStatus==='passed'?'Video face and expression checked':'Identity and expression checked';
 if(q.status==='passed')return retried?'Auto-corrected and checked':q.temporalStatus==='passed'?'Video face consistency checked':'Identity checked';
 return q.identityStatus==='failed'?'Face match failed':'Visual check unavailable';
}
