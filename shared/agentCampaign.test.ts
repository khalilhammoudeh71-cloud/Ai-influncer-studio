import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCampaign } from './agentCampaign';
const steps=[{type:'generate_image'},{type:'generate_image'},{type:'generate_video'}];
const campaign={title:'Morning rituals',platform:'Instagram',posts:[{date:'2026-09-15',title:'Coffee',format:'carousel',caption:'Small rituals.',assets:[{stepIndex:0,alt:'Coffee portrait'},{stepIndex:1,alt:'Reading portrait'}]},{date:'2026-09-16',title:'Motion',format:'video',caption:'Slow morning.',assets:[{stepIndex:2,alt:'Coffee in motion'}]}]};
test('campaign preserves editorial copy and exact asset order',()=>{const c=validateCampaign(JSON.stringify(campaign),steps)!;assert.equal(c.posts[0].caption,'Small rituals.');assert.deepEqual(c.posts[0].assets.map(a=>a.stepIndex),[0,1]);assert.equal(validateCampaign(null,steps),undefined);});
test('incomplete or wrongly mapped campaigns cannot be marked ready',()=>{
 for(const change of [ {...campaign,posts:campaign.posts.slice(0,1)}, {...campaign,posts:[{...campaign.posts[0],assets:[{stepIndex:99,alt:'Missing'}]},campaign.posts[1]]}, {...campaign,posts:[{...campaign.posts[0],date:'2026-02-30'},campaign.posts[1]]}, {...campaign,posts:[{...campaign.posts[0],caption:''},campaign.posts[1]]}, {...campaign,posts:[{...campaign.posts[0],format:'video'},campaign.posts[1]]}])assert.throws(()=>validateCampaign(change,steps));
});
test('reusing a successful asset on another day does not require a new image',()=>{const c=validateCampaign({...campaign,posts:[...campaign.posts,{date:'2026-09-17',title:'Q&A',format:'text',caption:'Your morning ritual?',assets:[{stepIndex:0,alt:'Coffee portrait reused'}]}]},steps)!;assert.equal(c.posts[2].assets[0].stepIndex,0);});
test('campaign rejects browser-only edits instead of losing video source and duration',()=>{
 assert.throws(()=>validateCampaign(campaign,[{type:'edit_image',params:{editType:'face-swap'}},...steps.slice(1)]),/background/);
 assert.throws(()=>validateCampaign(campaign,[...steps.slice(0,2),{type:'generate_video',params:{sourceVideo:'https://example.com/clip.mp4'}}]),/background/);
});
