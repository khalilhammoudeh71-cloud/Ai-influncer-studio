import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAgentRuns } from './agentRuns';
import { agentRuns, mediaJobs } from '../shared/schema';
import { eq } from 'drizzle-orm';
// Opt-in embedded PostgreSQL integration test, with no account/API credentials.
// PGLITE_MODULE points to an installed @electric-sql/pglite ESM entry point.
test('approved plan survives reconnect, advances once, pauses/resumes and isolates owners', { skip: !process.env.PGLITE_MODULE }, async () => {
    const previousSecret=process.env.CRON_SECRET;process.env.CRON_SECRET='synthetic-test';
    const { drizzle } = await import('drizzle-orm/pglite');
    const { PGlite } = await import(process.env.PGLITE_MODULE!);
    const pg = new PGlite();
    const db = drizzle(pg);
    await pg.exec(`CREATE TABLE agent_runs(id text primary key,user_id text not null,project_id text not null,message_id text not null,persona_id text not null,status text not null,steps text not null,source_image text,error text,created_at timestamptz default now(),updated_at timestamptz default now());
 CREATE TABLE media_jobs(id text primary key,user_id text,persona_client_id text,kind text,status text,request text,result text,error text,model_id text,fallback_model_id text,attempt int default 0,used_fallback boolean default false,progress int default 0,stage text default 'Queued',cancel_requested boolean default false,created_at timestamptz default now(),started_at timestamptz,updated_at timestamptz default now(),completed_at timestamptz);`);
    const routes = new Map<string, Function>();
    const app = { post: (p: string, f: Function) => routes.set('POST ' + p, f), get: (p: string, f: Function) => routes.set('GET ' + p, f) };
    const advance = registerAgentRuns(app, db, () => { }, async () => [{ id: 'persona' }]);
    const call = async (path: string, body: any = {}, user = 'owner', params: any = {}) => { let code = 200, result: any; await routes.get(path)!({ body, user: { id: user }, params, query: { projectId: 'default' } }, { status(n: number) { code = n; return this; }, json(v: any) { result = v; return this; } }); return { code, ...result }; };
    const body = { projectId: 'default', messageId: 'message', personaId: 'persona', steps: [{ type: 'generate_image', params: { prompt: 'A blue teacup, no people' } }, { type: 'edit_image', params: { prompt: 'Make the cup green', sourceImage: 'previous_result' } }] };
    try {
        const first = await call('POST /api/agent-runs', body);
        assert.equal(first.code, 200);
        const precision=await pg.query('SELECT (extract(microseconds from updated_at)::bigint % 1000) AS remainder FROM media_jobs');
        assert.equal(Number(precision.rows[0].remainder),0,'worker claim timestamps must round-trip through JavaScript');
        await pg.exec("UPDATE media_jobs SET updated_at = '2026-09-14 14:30:09.684752+00'");
        const second = await call('POST /api/agent-runs', body);
        const recoveredPrecision=await pg.query('SELECT (extract(microseconds from updated_at)::bigint % 1000) AS remainder FROM media_jobs');
        assert.equal(Number(recoveredPrecision.rows[0].remainder),0,'legacy queued timestamp must become claimable');
        assert.equal(second.run.id, first.run.id);
        assert.equal((await db.select().from(mediaJobs)).length, 1);
        assert.equal((await call('GET /api/agent-runs', {}, 'other')).runs.length, 0);
        assert.equal((await call('POST /api/agent-runs/:id/:action', {}, 'other', { id: first.run.id, action: 'stop' })).code, 404);
        await call('POST /api/agent-runs/:id/:action', {}, 'owner', { id: first.run.id, action: 'stop' });
        const jobs = await db.select().from(mediaJobs);
        await db.update(mediaJobs).set({ status: 'succeeded', result: JSON.stringify({ url: 'https://example.com/cup.jpg' }) }).where(eq(mediaJobs.id, jobs[0].id));
        await advance();
        assert.equal((await db.select().from(mediaJobs)).length, 1);
        await call('POST /api/agent-runs/:id/:action', {}, 'owner', { id: first.run.id, action: 'resume' });
        await advance();
        await advance();
        const next = await db.select().from(mediaJobs);
        assert.equal(next.length, 2);
        const edit = next.find(j => j.kind === 'edit')!;
        assert.equal(JSON.parse(edit.request!).sourceImage, 'https://example.com/cup.jpg');
        await db.update(mediaJobs).set({ status: 'failed', error: 'Provider unavailable' }).where(eq(mediaJobs.id, edit.id));
        await advance();
        await advance();
        assert.equal((await db.select().from(mediaJobs)).length, 2);
        assert.equal((await call('GET /api/agent-runs')).runs[0].status, 'failed');
        await call('POST /api/agent-runs/:id/:action', {}, 'owner', { id: first.run.id, action: 'retry' });
        const retried = (await db.select().from(mediaJobs)).find(j => j.id !== edit.id && j.id !== jobs[0].id)!;
        assert.ok(retried);
        assert.equal(JSON.parse(retried.request!).sourceImage, 'https://example.com/cup.jpg');
        await db.update(mediaJobs).set({ status: 'succeeded', result: JSON.stringify({ url: 'https://example.com/green.jpg' }) }).where(eq(mediaJobs.id, retried.id));
        await advance();
        await advance();
        const saved = await call('GET /api/agent-runs');
        assert.equal(saved.runs[0].status, 'succeeded');
        assert.equal(saved.runs[0].steps[1].resultUrl, 'https://example.com/green.jpg');
        assert.equal((await db.select().from(mediaJobs)).length, 3);
    }
    finally {
        if(previousSecret===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previousSecret;
        await pg.close();
    }
});
