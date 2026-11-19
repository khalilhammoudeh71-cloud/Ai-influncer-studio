import { firstShotNeedsApproval, type RunStep } from '../shared/agentRun';

export function prepareFirstShotRevision(steps: RunStep[], input: { baseJobId?: unknown; feedback?: unknown }) {
    const first = steps[0];
    if (!firstShotNeedsApproval(steps) || !first.resultUrl || !first.jobId)
        throw new Error('Wait for the first shot before requesting a revision.');
    const feedback = typeof input.feedback === 'string' ? input.feedback.trim() : '';
    if (!feedback || feedback.length > 2000) throw new Error('Enter revision feedback of up to 2,000 characters.');
    const takes = first.firstShotTakes ?? [{ jobId: first.jobId, url: first.resultUrl }];
    const base = takes.find(take => take.jobId === input.baseJobId);
    if (!base) throw new Error('Choose a saved take to revise.');
    if (takes.length >= 10) throw new Error('This plan has reached its limit of 10 first-shot takes.');
    const video = first.type === 'generate_video';
    const originalModel = first.params.modelId;
    const modelId = video ? originalModel : !originalModel || originalModel === 'wavespeed:bytedance/seedream-v5.0-pro'
        ? 'wavespeed-edit:bytedance/seedream-v5.0-pro/edit' : originalModel;
    const prompt = video
        ? `${base.prompt ?? first.params.prompt}\n\nRevision: ${feedback}`
        : `Edit the supplied image. Preserve the subject's identity, composition, and details unless the requested change requires otherwise.\n\nRequested change: ${feedback}`;
    if (prompt.length > 20000) throw new Error('The revised prompt is too long. Choose an earlier take or shorten your feedback.');
    const revision = { sourceUrl: base.url, prompt, modelId };
    const quoteStep: RunStep = {
        ...first, type: video ? 'generate_video' : 'edit_image',
        params: { ...first.params, modelId, prompt },
    };
    return { takes, revision, quoteStep };
}
