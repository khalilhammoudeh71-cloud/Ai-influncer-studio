export interface AgentTask { id:string; dependsOn?:string[]; run:(signal:AbortSignal)=>Promise<unknown> }
export interface AgentTaskResult { id:string; status:'succeeded'|'failed'|'blocked'|'canceled'; value?:any; elapsedMs:number }
/** Bounded, request-scoped workers. Only their coordinator produces a user reply. */
export async function runAgentTasks(tasks:AgentTask[], options:{concurrency?:number;signal?:AbortSignal;timeoutMs?:number}={}) {
 if(tasks.length>20 || new Set(tasks.map(t=>t.id)).size!==tasks.length)throw new Error('Invalid task graph');
 const ids=new Set(tasks.map(t=>t.id));
 if(tasks.some(t=>t.dependsOn?.some(id=>!ids.has(id)||id===t.id)))throw new Error('Invalid dependency');
 const completed=new Map<string,AgentTaskResult>();const pending=[...tasks];
 const limit=Math.max(1,Math.min(2,options.concurrency||2));
 while(pending.length){
   if(options.signal?.aborted){for(const t of pending)completed.set(t.id,{id:t.id,status:'canceled',elapsedMs:0});break;}
   const ready=pending.filter(t=>(t.dependsOn||[]).every(id=>completed.has(id))).slice(0,limit);
   if(!ready.length)throw new Error('Cyclic task dependencies');
   await Promise.all(ready.map(async task=>{
     pending.splice(pending.indexOf(task),1);
     if(task.dependsOn?.some(id=>completed.get(id)?.status!=='succeeded')){completed.set(task.id,{id:task.id,status:'blocked',elapsedMs:0});return;}
     const start=performance.now();const controller=new AbortController();
     const abort=()=>controller.abort();options.signal?.addEventListener('abort',abort,{once:true});
     let timer:ReturnType<typeof setTimeout>|undefined;
     try{
       const stopped=new Promise<never>((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(new Error('Canceled')),{once:true});timer=setTimeout(()=>controller.abort(),options.timeoutMs||26000);});
       const value=await Promise.race([Promise.resolve().then(()=>task.run(controller.signal)),stopped]);
       if(controller.signal.aborted)throw new Error('Canceled');
       completed.set(task.id,{id:task.id,status:'succeeded',value,elapsedMs:performance.now()-start});
     }catch{completed.set(task.id,{id:task.id,status:options.signal?.aborted?'canceled':'failed',elapsedMs:performance.now()-start});}
     finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
   }));
 }
 return tasks.map(t=>completed.get(t.id)!);
}
