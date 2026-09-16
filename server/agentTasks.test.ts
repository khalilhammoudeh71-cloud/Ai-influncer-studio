import test from 'node:test';import assert from 'node:assert/strict';import {runAgentTasks} from './agentTasks';
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
test('independent workers overlap, dependent work waits, results remain ordered',async()=>{
 let active=0,max=0;const work=async()=>{max=Math.max(max,++active);await delay(35);active--;return 'evidence';};
 const tasks=[{id:'a',run:work},{id:'b',run:work},{id:'c',dependsOn:['a','b'],run:async()=>{assert.equal(active,0);return 'combined';}}];
 const before=performance.now();const serial=await runAgentTasks(tasks,{concurrency:1});const serialMs=performance.now()-before;
 const start=performance.now();const parallel=await runAgentTasks(tasks);const parallelMs=performance.now()-start;
 assert.equal(max,2);assert.deepEqual(parallel.map(r=>r.value),serial.map(r=>r.value));
 console.log(JSON.stringify({measurement:'synthetic-delay',serialMs,parallelMs,callsPerRun:3}));
});
test('failures block dependents, independent tasks survive; cancellation and timeout discard results',async()=>{
 const result=await runAgentTasks([{id:'a',run:async()=>{throw Error();}},{id:'b',run:async()=>1},{id:'c',dependsOn:['a'],run:async()=>{throw Error('must not run');}}]);
 assert.deepEqual(result.map(r=>r.status),['failed','succeeded','blocked']);
 const controller=new AbortController();const pending=runAgentTasks([{id:'a',run:async()=>{await delay(20);return 'late';}}],{signal:controller.signal});controller.abort();
 assert.equal((await pending)[0].status,'canceled');
 assert.equal((await runAgentTasks([{id:'timeout',run:async()=>new Promise(()=>{})}],{timeoutMs:5}))[0].status,'failed');
 await assert.rejects(runAgentTasks([{id:'a',dependsOn:['b'],run:async()=>0},{id:'b',dependsOn:['a'],run:async()=>0}]),/Cyclic/);
});
