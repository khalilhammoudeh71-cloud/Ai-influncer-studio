import { and, eq, asc } from 'drizzle-orm';
import { randomUUID, createHash } from 'node:crypto';
import { agentRuns, mediaJobs } from '../shared/schema';
import { nextRunAction, validateRunSteps, type RunStep } from '../shared/agentRun';
function publicRun(row: any) { return { ...row, steps: JSON.parse(row.steps), sourceImage: undefined, userId: undefined }; }
function imageSource(steps: RunStep[], i: number, fallback?: string) {
    const p = steps[i].params;
    if (p.sourceImageFromStepIndex !== undefined) {
        const s = steps[p.sourceImageFromStepIndex];
        if (!s?.resultUrl)
            throw new Error('The preceding image is not ready.');
        return s.resultUrl;
    }
    if (p.sourceImage && p.sourceImage !== 'previous_result')
        return p.sourceImage;
    return steps.slice(0, i).reverse().find(s => s.type !== 'generate_video' && s.resultUrl)?.resultUrl || fallback;
}
export function registerAgentRuns(app: any, db: any, schedule: (id: string, userId: string, user: any) => void, readPersonasForUser: (id: string) => Promise<any[]>) {
    async function advance(id: string, user: any) {
        let jobId: string | undefined;
        const row = await db.transaction(async (tx: any) => {
            const [r] = await tx.select().from(agentRuns).where(and(eq(agentRuns.id, id), eq(agentRuns.userId, user.id))).for('update');
            if (!r || r.status !== 'running')
                return r;
            const steps: RunStep[] = JSON.parse(r.steps);
            const current = steps.find(s => s.status !== 'success');
            let child: any;
            if (current?.jobId) {
                [child] = await tx.select().from(mediaJobs).where(and(eq(mediaJobs.id, current.jobId), eq(mediaJobs.userId, user.id)));
                if (child)
                    child = { ...child, request: JSON.parse(child.request || '{}'), result: JSON.parse(child.result || 'null') };
            }
            let action = nextRunAction(steps, child);
            if (action.kind === 'success') {
                steps[action.index] = { ...steps[action.index], status: 'success', resultUrl: action.url };
                action = nextRunAction(steps);
            }
            let status = 'running', error: string | null = null;
            if (action.kind === 'complete')
                status = 'succeeded';
            else if (action.kind === 'fail') {
                status = 'failed';
                error = action.error;
                steps[action.index].status = 'error';
                steps[action.index].error = action.error;
            }
            else if (action.kind === 'wait') {
                jobId = steps[action.index].jobId;
            }
            else {
                try {
                    const i = action.index, p = steps[i].params;
                    const source = imageSource(steps, i, r.sourceImage);
                    let request: any, kind: string;
                    if (steps[i].type === 'edit_image') {
                        if (!source)
                            throw new Error('Choose a source image before editing.');
                        kind = 'edit';
                        request = { sourceImage: source, prompt: p.prompt, modelId: p.modelId || 'wavespeed:bytedance/seedream-v5.0-pro' };
                    }
                    else if (steps[i].type === 'generate_video') {
                        kind = 'video';
                        request = { requestMode: 'studio', personaClientId: r.personaId, prompt: p.prompt, modelId: p.modelId || 'wavespeed-i2v:alibaba/wan-3.0/image-to-video', sourceImage: source };
                        if (!source)
                            throw new Error('Video needs a source image. Add an image step first or choose a reference.');
                    }
                    else {
                        kind = 'image';
                        const noPeople = p.usePersona === false || /\b(no people|no person|without people|object only|product only)\b/i.test(p.prompt);
                        request = noPeople ? { requestMode: 'studio', modelId: p.modelId || 'wavespeed:bytedance/seedream-v5.0-pro', chatPrompt: p.prompt, isChatContext: true, additionalInstructions: p.prompt, aspectRatio: p.aspectRatio || '1:1', identityLock: false, count: 1 } : { type: 'image', persona: { id: r.personaId }, prompt: p.prompt, imageModelId: p.modelId || 'wavespeed:bytedance/seedream-v5.0-pro', aspectRatio: p.aspectRatio || '1:1', strictFidelity: true };
                    }
                    jobId = randomUUID();
                    await tx.insert(mediaJobs).values({ id: jobId, userId: user.id, personaClientId: r.personaId, kind, status: 'queued', request: JSON.stringify(request) });
                    steps[i] = { ...steps[i], status: 'running', jobId };
                }
                catch (e) {
                    status = 'failed';
                    error = e instanceof Error ? e.message : 'Could not start step';
                    steps[action.index].status = 'error';
                }
            }
            const [saved] = await tx.update(agentRuns).set({ steps: JSON.stringify(steps), status, error, updatedAt: new Date() }).where(eq(agentRuns.id, id)).returning();
            return saved;
        });
        if (jobId)
            schedule(jobId, user.id, user);
        return row;
    }
    app.post('/api/agent-runs', async (req: any, res: any) => {
        try {
            if (!process.env.CRON_SECRET) return res.status(503).json({error:'Background execution is not configured. No generation was started.'});
            const { projectId, messageId, personaId, sourceImage } = req.body || {};
            if (![projectId, messageId, personaId].every(x => typeof x === 'string' && x.length > 0 && x.length < 200))
                return res.status(400).json({ error: 'Project, message and persona are required.' });
            const steps = validateRunSteps(req.body.steps);
            if (sourceImage && (typeof sourceImage !== 'string' || !/^(https:\/\/|data:image\/)/.test(sourceImage)))
                return res.status(400).json({ error: 'Invalid source image.' });
            const personas = await readPersonasForUser(req.user.id);
            if (!personas.some((p: any) => p.id === personaId))
                return res.status(400).json({ error: 'Choose a saved persona first.' });
            const id = createHash('sha256').update(JSON.stringify([req.user.id, projectId, messageId])).digest('hex');
            await db.insert(agentRuns).values({ id, userId: req.user.id, projectId, messageId, personaId, steps: JSON.stringify(steps), sourceImage: sourceImage || null, status: 'running' }).onConflictDoNothing();
            const row = await advance(id, req.user);
            return res.json({ run: publicRun(row) });
        }
        catch (e) {
            return res.status(400).json({ error: e instanceof Error ? e.message : 'Could not save plan' });
        }
    });
    app.get('/api/agent-runs', async (req: any, res: any) => {
        try {
            const rows = await db.select().from(agentRuns).where(and(eq(agentRuns.userId, req.user.id), eq(agentRuns.projectId, String(req.query.projectId || 'default')))).orderBy(asc(agentRuns.createdAt));
            res.json({ runs: rows.map(publicRun) });
        }
        catch {
            res.status(503).json({ error: 'Could not load background plans' });
        }
    });
    app.post('/api/agent-runs/:id/:action', async (req: any, res: any) => {
        try {
            const action = req.params.action;
            if (!['stop', 'resume', 'retry'].includes(action))
                return res.status(400).json({ error: 'Unsupported action' });
            const row = await db.transaction(async (tx: any) => {
                const [r] = await tx.select().from(agentRuns).where(and(eq(agentRuns.id, req.params.id), eq(agentRuns.userId, req.user.id))).for('update');
                if (!r)
                    return null;
                if (r.status === 'succeeded')
                    return r;
                // Stop prevents the next step; an already submitted provider job may finish.
                if (action === 'resume' && r.status === 'failed')
                    throw new Error('A generation failed. Review it in generation history before retrying; automatic paid retry is disabled.');
                const changes: any = { status: action === 'stop' ? 'paused' : 'running', updatedAt: new Date() };
                if (action === 'retry') {
                    if (r.status !== 'failed')
                        throw new Error('Only a failed plan can be retried.');
                    const steps: RunStep[] = JSON.parse(r.steps);
                    const index = steps.findIndex(s => s.status !== 'success');
                    if (index < 0)
                        throw new Error('No failed step to retry.');
                    steps[index] = { type: steps[index].type, params: steps[index].params, status: 'pending' };
                    changes.steps = JSON.stringify(steps);
                    changes.error = null;
                }
                const [saved] = await tx.update(agentRuns).set(changes).where(eq(agentRuns.id, r.id)).returning();
                return saved;
            });
            if (!row)
                return res.status(404).json({ error: 'Plan not found' });
            res.json({ run: publicRun(action !== 'stop' ? await advance(row.id, req.user) : row) });
        }
        catch (e) {
            res.status(409).json({ error: e instanceof Error ? e.message : 'Could not update plan' });
        }
    });
    return async () => {
        const rows = await db.select().from(agentRuns).where(eq(agentRuns.status, 'running')).orderBy(asc(agentRuns.updatedAt)).limit(10);
        for (const row of rows)
            try {
                await advance(row.id, { id: row.userId });
            }
            catch (e) {
                console.warn('[agent-runs] Advance failed', row.id, e instanceof Error ? e.message : 'Unknown error');
            }
    };
}
