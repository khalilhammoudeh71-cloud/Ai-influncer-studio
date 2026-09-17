export function mergeWordRecording<T extends {id:string}>(rows:T[],targetId:string,correction:T):T[]{
 return rows.some(row=>row.id===targetId)?rows.map(row=>row.id===targetId?correction:row):[correction,...rows];
}
