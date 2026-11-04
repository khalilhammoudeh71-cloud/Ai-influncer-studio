// Bounded real-provider benchmark: single-photo personas, no automatic retries.
import 'dotenv/config';
import fs from 'node:fs/promises';
import {and,eq,like,sql} from 'drizzle-orm';
import {db} from '../../server/db';
import {users,personas,generationCosts} from '../../shared/schema';
import {writeIdentitySet,deleteIdentitySet} from '../../server/personaIdentityStore';
import {withGenerationContext} from '../../server/generationContext';
const fixtures=['fashion-beauty-nano-pro.jpg','fitness-health-nano-pro.jpg','tech-ai-nano-pro.jpg'];
const scenarios=[
 ['profile','A close side-profile portrait of the same person wearing a green jacket in a quiet garden. Natural daylight, visible facial structure and natural skin texture. No text.'],
 ['expression','A waist-up photo of the same person laughing naturally, wearing a navy blazer in a quiet cafe. Eyes and face clearly visible. Natural skin texture. No text.'],
 ['lighting','A close three-quarter portrait of the same person wearing a gray shirt at home, warm evening side lighting, detailed natural skin and a clearly visible face. No text.']
];
const skipped=new Set((process.argv.find(x=>x.startsWith('--skip='))?.slice(7)||'').split(',').filter(Boolean));
const validCases=new Set(fixtures.flatMap(f=>scenarios.map(([s])=>f+':'+s)));
if([...skipped].some(x=>!validCases.has(x)))throw Error('Unknown benchmark case in skip list');
if(process.env.STUDIO_PAID_TEST!=='confirmed'){
 console.log(JSON.stringify({fixtures,scenarios,requests:9,startingReferencePhotosPerPersona:1,paidRun:'Set STUDIO_PAID_TEST=confirmed to run. No media generated.'},null,2));process.exit(0);
}
process.env.VERCEL='1';process.env.NODE_ENV='test';
const {app,inspectIdentityReferenceQuality,inspectGeneratedImageQuality}=await import('../../server/index');
const [owner]=await db.select({id:users.id,email:users.email}).from(users).where(sql`lower(replace(${users.email},'.',''))=lower(replace(${process.env.CREATOR_EMAIL || 'khalilhammoudeh71@gmail.com'},'.',''))`).limit(1);
if(!owner)throw Error('Creator test account unavailable');
const runId='identity-benchmark-'+Date.now(),dir='reports/identity-benchmark/'+runId;
await fs.mkdir(dir,{recursive:true});
const report:any={runId,startedAt:new Date().toISOString(),model:'wavespeed:bytedance/seedream-v5.0-pro',referenceCountPerPersona:1,maxGenerationRequests:9-skipped.size,skippedCases:[...skipped],results:[],references:[],humanReview:'pending; model verdicts are not human ground truth'};
async function save(){await fs.writeFile(dir+'/results.json',JSON.stringify(report,null,2));}
async function generate(id:string,prompt:string){
 const layer=(app as any).router.stack.find((x:any)=>x.route?.path==='/api/generate-image'&&x.route.methods.post);
 let status=200,payload:any;const res:any={status(n:number){status=n;return res},json(x:any){payload=x;return x}};
 await withGenerationContext({jobId:runId,attempt:1},()=>layer.route.stack.at(-1).handle({user:owner,headers:{},setTimeout(){},body:{personaId:id,requestMode:'studio',modelId:report.model,prompt,preservePromptVerbatim:true,aspectRatio:'4:5',count:1}},res));
 return {status,payload};
}
for(const [i,fixture]of fixtures.entries()){
 if(scenarios.every(([s])=>skipped.has(fixture+':'+s)))continue;
 const id=runId+'-'+i,anchor='https://ai-influencerstudio.com/examples/persona-ideas/'+fixture;
 const persona:any={name:'Benchmark '+i,referenceImage:anchor,identityReferences:[{image:anchor,view:'front',approved:true}]};
 const quality=await inspectIdentityReferenceQuality(anchor,true);report.references.push({fixture,quality});await save();
 if(quality.status!=='passed'){console.log('BENCH_REFERENCE_BLOCKED',fixture,quality);continue;}
 try{
  await db.insert(personas).values({clientId:id,userId:owner.id,name:persona.name,niche:'Lifestyle',tone:'Natural',platform:'Instagram',status:'Draft',avatar:anchor,referenceImage:anchor,additionalReferenceImages:'[]',personalityTraits:'[]'});
  await writeIdentitySet(owner.id,id,persona.identityReferences);
  for(const [scenario,prompt]of scenarios){
   if(skipped.has(fixture+':'+scenario))continue;
   console.log('BENCH_START',i,scenario);const start=Date.now();
   try{
    const {status,payload}=await generate(id,prompt);
    if(status>=400){report.results.push({fixture,scenario,status:'blocked',reason:String(payload?.error || 'Generation failed').split('\nparams:')[0],humanVerdict:null});await save();console.log('BENCH_BLOCKED',i,scenario);continue;}
    const output=payload.imageUrl;let bytes:Buffer;
    if(output.startsWith('data:'))bytes=Buffer.from(output.slice(output.indexOf(',')+1),'base64');
    else{const response=await fetch(output,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Artifact download failed');bytes=Buffer.from(await response.arrayBuffer());}
    const path=dir+'/'+i+'-'+scenario+'.jpg';await fs.writeFile(path,bytes);
    const review=await inspectGeneratedImageQuality(output,[persona],prompt,1,true);
    report.results.push({fixture,scenario,status:review.status,reasons:review.reasons,review,path,elapsedMs:Date.now()-start,humanVerdict:null});
   }catch(error){report.results.push({fixture,scenario,status:'error',reason:'Benchmark request or inspection failed; no automatic retry.',errorType:error instanceof Error?error.name:'Unknown',humanVerdict:null});}
   await save();console.log('BENCH_RESULT',JSON.stringify(report.results.at(-1)));
  }
 }finally{
  try{await deleteIdentitySet(owner.id,id);await db.delete(personas).where(and(eq(personas.userId,owner.id),eq(personas.clientId,id)));}
  catch{report.cleanedUp=false;report.cleanupRequiredFor=id;await save();process.exitCode=1;throw Error('Test cleanup needs attention. Further paid requests stopped.');}
 }
}
report.completedAt=new Date().toISOString();report.cleanedUp=true;
report.negativeControls=[];
for(let i=0;i<fixtures.length;i++){
 const anchor='https://ai-influencerstudio.com/examples/persona-ideas/'+fixtures[i];
 const candidate='https://ai-influencerstudio.com/examples/persona-ideas/'+fixtures[(i+1)%fixtures.length];
 const review=await inspectGeneratedImageQuality(candidate,[{name:'Expected synthetic persona',referenceImage:anchor}], '',1,false);
 report.negativeControls.push({expected:fixtures[i],candidate:fixtures[(i+1)%fixtures.length],knownMatch:false,status:review.status});
 await save();
}
report.automatedSummary={total:report.results.length,passed:report.results.filter((x:any)=>x.status==='passed').length,blocked:report.results.filter((x:any)=>x.status==='blocked').length};
const costs=await db.select().from(generationCosts).where(and(eq(generationCosts.userId,owner.id),like(generationCosts.requestMetadata,'%'+runId+'%')));
report.costs=costs.map((x:any)=>({kind:x.kind,model:x.modelId,status:x.status,estimateMicrousd:x.estimatedProviderCostMicrousd,recordedMicrousd:x.actualProviderCostMicrousd}));
await save();console.log('BENCH_COMPLETE',dir,JSON.stringify(report.automatedSummary));
