import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
test('campaign migration works before supervision on a clean database and is idempotent',{skip:!process.env.PGLITE_MODULE},async()=>{
 const{PGlite}=await import(process.env.PGLITE_MODULE!);const pg=new PGlite();
 try{
  await pg.exec('CREATE ROLE authenticated;CREATE ROLE anon;CREATE TABLE media_jobs(id text)');
  const migration=readFileSync(new URL('../supabase/migrations/20260914185809_agent_campaign_package.sql',import.meta.url),'utf8');
  await pg.exec(migration);await pg.exec(migration);
  await pg.exec(readFileSync(new URL('../supabase/migrations/20260914190000_agent_supervision.sql',import.meta.url),'utf8'));
  assert.equal((await pg.query("SELECT count(*) FROM information_schema.columns WHERE table_name='agent_runs' AND column_name IN ('campaign','budget_credits','visual_review')")).rows[0].count,3);
  await pg.exec('SET ROLE authenticated');await assert.rejects(pg.exec('SELECT campaign FROM agent_runs'),/permission denied/);
 }finally{await pg.close();}
});
test('authenticated clients cannot forge task linkage, results, or allowance records',{skip:!process.env.PGLITE_MODULE},async()=>{
 const{PGlite}=await import(process.env.PGLITE_MODULE!);const pg=new PGlite();
 try{
  await pg.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE TABLE agent_runs(id text, user_id text,status text,updated_at timestamptz,project_id text);CREATE TABLE media_jobs(id text,agent_run_id text);INSERT INTO media_jobs VALUES('job','run');GRANT ALL ON agent_runs,media_jobs TO authenticated;CREATE POLICY legacy_owner_write ON media_jobs FOR ALL TO authenticated USING(true) WITH CHECK(true);`);
  await pg.exec(readFileSync(new URL('../supabase/migrations/20260914190000_agent_supervision.sql',import.meta.url),'utf8'));
  await pg.exec('SET ROLE authenticated');
  assert.equal((await pg.query('SELECT agent_run_id FROM media_jobs')).rows[0].agent_run_id,'run');
  await assert.rejects(pg.exec("UPDATE media_jobs SET agent_run_id=NULL WHERE id='job'"),/permission denied/);
  await assert.rejects(pg.exec("INSERT INTO media_jobs VALUES('forged',NULL)"),/permission denied/);
  await assert.rejects(pg.exec("DELETE FROM media_jobs"),/permission denied/);
  await assert.rejects(pg.exec('TRUNCATE media_jobs'),/permission denied/);
  assert.deepEqual((await pg.query("SELECT privilege_type FROM information_schema.role_table_grants WHERE grantee='authenticated' AND table_name='media_jobs'")).rows,[{privilege_type:'SELECT'}]);
  await assert.rejects(pg.exec('SELECT * FROM agent_runs'),/permission denied/);
  await assert.rejects(pg.exec('UPDATE agent_runs SET used_credits=0'),/permission denied/);
 }finally{await pg.close();}
});

test('the migration creates agent runs when only the older media-jobs migrations exist',{skip:!process.env.PGLITE_MODULE},async()=>{const{PGlite}=await import(process.env.PGLITE_MODULE!);const pg=new PGlite();try{await pg.exec('CREATE ROLE authenticated; CREATE ROLE anon; CREATE TABLE media_jobs(id text)');await pg.exec(readFileSync(new URL('../supabase/migrations/20260914190000_agent_supervision.sql',import.meta.url),'utf8'));assert.equal((await pg.query("SELECT column_name FROM information_schema.columns WHERE table_name='agent_runs' AND column_name IN ('budget_credits','used_credits','visual_review')")).rows.length,3);}finally{await pg.close();}});
