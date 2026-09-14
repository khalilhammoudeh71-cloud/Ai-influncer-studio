export type RunStep = {
    type: string;
    params: Record<string, any>;
    jobId?: string;
    status: string;
    resultUrl?: string;
    error?: string;
};
export function supportsBackground(steps: any[]): boolean {
    return Boolean(steps?.length) && steps.every(s => ['generate_image', 'generate_video', 'edit_image'].includes(s.type) && !(s.type === 'edit_image' && s.params?.editType && !['custom edit', 'upscale'].includes(s.params.editType)) && !s.params?.sourceVideo && (s.params?.sourceImageFromStepIndex === undefined || steps[s.params.sourceImageFromStepIndex]?.type !== 'generate_video'));
}
export function validateRunSteps(steps: any): RunStep[] {
    if (!Array.isArray(steps) || !supportsBackground(steps) || steps.length > 20)
        throw new Error('This plan requires the browser or has too many steps.');
    return steps.map((s, i) => {
        const p = s.params;
        if (!p || typeof p.prompt !== 'string' || !p.prompt.trim() || p.prompt.length > 20000)
            throw new Error(`Step ${i + 1} needs a complete prompt.`);
        const n = p.sourceImageFromStepIndex;
        if (n !== undefined && (!Number.isInteger(n) || n < 0 || n >= i || steps[n].type === 'generate_video'))
            throw new Error('Image dependencies must refer to an earlier image step.');
        // Only known generation inputs are accepted; execution state is server-owned.
        const params: Record<string, any> = {};
        for (const k of ['prompt', 'modelId', 'aspectRatio', 'usePersona', 'sourceImage', 'sourceImageFromStepIndex', 'editType'])
            if (p[k] !== undefined)
                params[k] = p[k];
        if (params.sourceImage && (typeof params.sourceImage !== 'string' || !/^(https:\/\/|data:image\/|previous_result$)/.test(params.sourceImage)))
            throw new Error('Use a saved image or an uploaded image as the source.');
        return { type: s.type, params, status: 'pending' };
    });
}
export function nextRunAction(steps: RunStep[], job?: any): any {
    const index = steps.findIndex(s => s.status !== 'success');
    if (index < 0)
        return { kind: 'complete' };
    if (!steps[index].jobId)
        return { kind: 'create', index };
    if (!job)
        return { kind: 'fail', index, error: 'The saved generation job is missing. No automatic retry was started.' };
    if (job.status === 'succeeded' && steps[index].type === 'edit_image' && job.result?.url === job.request?.sourceImage)
        return { kind: 'fail', index, error: 'The edit returned the original image unchanged.' };
    if (job.status === 'succeeded')
        return job.result?.url ? { kind: 'success', index, url: job.result.url } : { kind: 'fail', index, error: 'Generation returned no usable output.' };
    if (['failed', 'canceled'].includes(job.status))
        return { kind: 'fail', index, error: job.error || 'Generation was canceled.' };
    return { kind: 'wait', index };
}
