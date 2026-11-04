// Rechecks existing video and two controlled synthetic clips. No media rendering API is called.
import 'dotenv/config';import fs from 'node:fs/promises';import {sql} from 'drizzle-orm';import {db} from '../../server/db';import {users} from '../../shared/schema';import {createClient} from '@supabase/supabase-js';
if(process.env.STUDIO_PAID_TEST!=='confirmed')throw Error('Explicit opt-in required for visual-analysis calls');
process.env.VERCEL='1';process.env.NODE_ENV='test';
const {inspectGeneratedImageQuality}=await import('../../server/index');
const [owner]=await db.select({id:users.id}).from(users).where(sql`lower(replace(${users.email},'.',''))=lower(replace(${process.env.CREATOR_EMAIL || 'khalilhammoudeh71@gmail.com'},'.',''))`).limit(1);if(!owner)throw Error('Test account unavailable');
const storage=createClient(process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const runId='video-review-'+Date.now(),uploaded:string[]=[],dir='reports/identity-video-controls';
const report:any={runId,startedAt:new Date().toISOString(),newProviderVideoGenerations:0,fps:2,cases:[]};
const cases=[{name:'existing-positive',path:'reports/identity-acceptance/identity-acceptance-1793805339073/video.mp4',expected:'passed'},{name:'identity-switch',path:dir+'/identity-switch.mp4',expected:'blocked'},{name:'face-hidden',path:dir+'/face-hidden.mp4',expected:'blocked'}];
try{
 for(const item of cases){
  const bytes=await fs.readFile(item.path),key=owner.id+'/video/'+runId+'-'+item.name+'.mp4';
  const saved=await storage.storage.from('workspace-media').upload(key,bytes,{contentType:'video/mp4',upsert:false});if(saved.error)throw Error('Control upload failed');uploaded.push(key);
  const signed=await storage.storage.from('workspace-media').createSignedUrl(key,600);if(!signed.data?.signedUrl)throw Error('Control signing failed');
  const review=await inspectGeneratedImageQuality(signed.data.signedUrl,[{name:'Synthetic reference',referenceImage:'https://ai-influencerstudio.com/examples/persona-ideas/fashion-beauty-nano-pro.jpg'}], '',1,false,true);
  const expectationMet=item.expected==='passed'?review.status==='passed':review.status!=='passed';
  report.cases.push({...item,review,expectationMet});await fs.writeFile(dir+'/results.json',JSON.stringify(report,null,2));console.log('VIDEO_CONTROL',JSON.stringify({name:item.name,status:review.status,identity:review.identityStatus,temporal:review.temporalStatus,expectationMet}));
 }
 report.passed=report.cases.every((x:any)=>x.expectationMet);if(!report.passed)process.exitCode=1;
}catch(error){report.passed=false;report.error=error instanceof Error?error.message:'Control check failed';process.exitCode=1;}
finally{
 const removed=uploaded.length?await storage.storage.from('workspace-media').remove(uploaded):{error:null};report.cleanedUp=!removed.error;report.completedAt=new Date().toISOString();if(!report.cleanedUp)process.exitCode=1;
 await fs.writeFile(dir+'/results.json',JSON.stringify(report,null,2));console.log('VIDEO_CONTROLS_COMPLETE',JSON.stringify({passed:report.passed,cleanedUp:report.cleanedUp}));
}
