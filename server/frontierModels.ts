const models:Record<string,{provider:string;model:string}>={
 'frontier-grok':{provider:'xai',model:'grok-4.6'},
 'frontier-gemini-pro':{provider:'google',model:'gemini-3.1-pro-preview'},
 'frontier-gemini-flash':{provider:'google',model:'gemini-3.8-flash'},
};
export const frontierModel=(choice:string)=>Object.prototype.hasOwnProperty.call(models,choice)?models[choice]:undefined;
export async function runFrontierChat(choice:string,key:string,messages:any[],system:string,request:typeof fetch=fetch,limits?:{maxOutputTokens:number}){
 const selected=frontierModel(choice);if(!selected)throw new Error('Unknown frontier model');
 if(!key)throw new Error(`${selected.model}: API credential is not configured`);
 const conversation=messages.map(m=>({role:m.role==='model'||m.role==='assistant'?'assistant':'user',content:typeof m.content==='string'?m.content:JSON.stringify(m.content||'')}));
 const google=selected.provider==='google';
 const response=await request(google?`https://generativelanguage.googleapis.com/v1beta/models/${selected.model}:generateContent`:'https://api.x.ai/v1/chat/completions',{
  method:'POST',headers:google?{'Content-Type':'application/json','x-goog-api-key':key}:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(60000),
  body:JSON.stringify(google?{systemInstruction:{parts:[{text:system}]},contents:conversation.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),...(limits?{generationConfig:{maxOutputTokens:limits.maxOutputTokens}}:{})}:{model:selected.model,messages:[{role:'system',content:system},...conversation],...(limits?{max_tokens:limits.maxOutputTokens}:{})}),
 });
 if(!response.ok)throw new Error(`${selected.model} returned HTTP ${response.status}. No alternate model was used.`);
 const data=await response.json();
 const text=google?data.candidates?.[0]?.content?.parts?.filter((p:any)=>!p.thought).map((p:any)=>p.text||'').join(''):data.choices?.[0]?.message?.content;
 if(!text?.trim())throw new Error(`${selected.model} returned no answer. No alternate model was used.`);
 return {...selected,text:text.trim()};
}
