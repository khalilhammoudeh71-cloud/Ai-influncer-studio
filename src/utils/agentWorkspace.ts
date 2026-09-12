export function canAutoRun(autoApprove: boolean, prompt: string) {
  return autoApprove && !/\b(?:text[- ]only|do not (?:create|generate|execute|publish)|don't (?:create|generate|execute|publish)|wait|not yet)\b/i.test(prompt);
}

export function requireOutput(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} returned no usable output. Nothing has been marked successful.`);
  return value;
}

export function previousImage(messages: any[]): string | undefined {
  for (const message of [...messages].reverse()) {
    for (const step of [...(message.execSteps || [])].reverse()) {
      if (['generate_image','edit_image'].includes(step.type) && step.status === 'success' && typeof step.resultUrl === 'string') return step.resultUrl;
    }
  }
}

export function restoreConversation(raw: string | null): any[] {
  try {
    const value = JSON.parse(raw || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(m => m && typeof m.id === 'string' && typeof m.content === 'string' && ['user', 'model'].includes(m.role)).slice(-100).map(m => {
      const interrupted = m.isExecuting || m.status === 'executing';
      return {...m, isExecuting: false,
        status: interrupted ? 'clarifying' : m.status,
        execSteps: Array.isArray(m.execSteps) ? m.execSteps.map((s: any) => ({...s, isActionLoading:null, status: ['running','executing'].includes(s.status) ? 'error' : s.status})) : undefined,
        execLogs: interrupted ? [...(Array.isArray(m.execLogs) ? m.execLogs : []), 'Session interrupted. Check generation progress before retrying; an existing job may still finish.'] : m.execLogs,
      };
    });
  } catch { return []; }
}

export function imagePersona<T extends Record<string, any>>(persona: T, params: Record<string, any>): T {
  const noPeople = /\b(?:no people|no person|without people|object only|product only)\b/i.test(params.prompt || '');
  if (params.usePersona === false || noPeople) {
    return {...persona, name: '', niche: '', tone: '', avatar: '', referenceImage: undefined, alternateReferenceImage: undefined, faceDescriptor: undefined, identityLock: false};
  }
  return {...persona};
}

export function taskContext(steps: any[]) {
  const summarize = (s: any) => ({type:s.type,status:s.status,params:JSON.parse(JSON.stringify(s.params || {}, (_key, value) => typeof value === 'string' && value.startsWith('data:') ? 'attached_asset' : value)),resultUrl: s.resultUrl?.startsWith('data:') ? 'previous_result' : s.resultUrl});
  return {
    pending: steps.filter(s => !['success','done','error'].includes(s.status)).map(summarize),
    results: steps.filter(s => ['success','done','error'].includes(s.status)).map(summarize),
  };
}
