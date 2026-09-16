import test from 'node:test';import assert from 'node:assert/strict';
test('actual chat route loads writing guidance and delivers a draft without actions',async()=>{
 process.env.XAI_API_KEY='fixture';const original=globalThis.fetch;
 globalThis.fetch=async(_url,init)=>{
 const body=JSON.parse(init?.body as string);
 assert.match(body.messages[0].content,/WRITING WORKFLOW/);
 return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({text:'A quiet morning starts with one small ritual.',suggestedSteps:[]})}}]}));
 };
 try{const {default:router}=await import('./routes');const handler=(router as any).stack.find((x:any)=>x.route?.path==='/agent/chat').route.stack[0].handle;
 let result:any;await handler({body:{messages:[{role:'user',content:'Text only: write a short calming hook.'}],voiceLlmModel:'grok'},user:{id:'fixture-owner'}},{json(value:any){result=value;return this;},status(){return this;}});
 assert.equal(result.text,'A quiet morning starts with one small ritual.');assert.deepEqual(result.suggestedSteps,[]);
 }finally{globalThis.fetch=original;delete process.env.XAI_API_KEY;}
});
