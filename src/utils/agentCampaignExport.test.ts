import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { buildCampaignArchive, campaignReady } from './agentCampaignExport';
const campaign:any={title:'Morning / ../rituals',platform:'Instagram',posts:[{date:'2026-09-15',title:'Coffee',format:'image',caption:'A slow start.',assets:[{stepIndex:0,alt:'A woman holding coffee.'}]},{date:'2026-09-16',title:'Your morning?',format:'text',caption:'Coffee or tea?',assets:[{stepIndex:0,alt:'The same portrait.'}]}]};
const steps:any=[{type:'generate_image',status:'success',resultUrl:'https://example.com/photo.jpg',quality:{status:'passed'}}];
test('a text-only campaign exports copy without manufacturing image jobs',async()=>{
 const copy:any={title:'Questions',platform:'Instagram',posts:[{date:'2026-09-15',title:'Morning question',format:'text',caption:'Coffee or tea?',assets:[]}]};
 assert.equal(campaignReady(copy,[]),true);
 const files=unzipSync(await buildCampaignArchive(copy,[],async()=>{throw new Error('No downloads expected');}));
 assert.match(strFromU8(files['captions.txt']),/Coffee or tea/);
 assert.deepEqual(JSON.parse(strFromU8(files['campaign.json'])).posts[0].assets,[]);
});
test('campaign ZIP includes captions, ordered mapping and each completed asset once',async()=>{
 let calls=0;
 const zip=await buildCampaignArchive(campaign,steps,async()=>{calls++;return new Response(new Uint8Array([255,216,255]),{headers:{'content-type':'image/jpeg'}});});
 const files=unzipSync(zip);const manifest=JSON.parse(strFromU8(files['campaign.json']));
 assert.equal(calls,1);assert.ok(files['assets/01.jpg']);
 assert.equal(manifest.posts[1].assets[0].file,'assets/01.jpg');
 assert.match(strFromU8(files['captions.txt']),/Coffee or tea\?/);
 assert.equal(manifest.posts[0].assets[0].alt,'A woman holding coffee.');
});
test('unfinished, failed quality checks and failed downloads never produce a complete package',async()=>{
 for(const patch of [{status:'pending'},{quality:{status:'failed'}},{resultUrl:''}]){
  assert.equal(campaignReady(campaign,[{...steps[0],...patch}]),false);
  await assert.rejects(buildCampaignArchive(campaign,[{...steps[0],...patch}]),/Finish and review/);
 }
 await assert.rejects(buildCampaignArchive(campaign,steps,async()=>new Response('expired',{status:403})),/download/);
 await assert.rejects(buildCampaignArchive(campaign,steps,async()=>new Response('<html>login</html>',{headers:{'content-type':'text/html'}})),/media file/);
 await assert.rejects(buildCampaignArchive(campaign,steps,async()=>new Response('large',{headers:{'content-type':'image/jpeg','content-length':'999999999'}})),/too large/);
});
