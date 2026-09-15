/** A sent sentence cannot be recalled. Bound the turn and reject drafts before emitting. */
export function createReviewedSpeech(emit:(text:string)=>void,accept:(text:string)=>boolean,maxSentences=2,maxWords=48) {
 let spoken='';let count=0;let words=0;
 return {
  push(raw:string){
   const text=raw.trim().replace(/^(?:(?:um|uh|hmm|mm|mmm|heh|haha)[,\s.…-]+)+/i,'').replace(/^[a-z]/,s=>s.toUpperCase());
   const length=text.split(/\s+/).length;
   if(!/[.!?]["'”’]?$/.test(text)||count>=maxSentences||words+length>maxWords||!accept(text))return;
   count++;words+=length;spoken+=(spoken?' ':'')+text;emit(text+' ');
  },
  get text(){return spoken;},
 };
}
