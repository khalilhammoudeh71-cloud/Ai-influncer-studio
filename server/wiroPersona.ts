import { createHmac } from 'crypto';

export const DEFAULT_WIRO_PERSONA_MODEL = 'seed-v2.1-turbo-uncensored';
export const DEFAULT_RUNWARE_PERSONA_MODEL = 'deepseek:v4@pro';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

interface WiroPersonaRequest {
  apiKey: string;
  apiSecret: string;
  systemPrompt: string;
  messages: ChatMessage[];
  userId: string;
  sessionId: string;
  model?: string;
  maxWaitMs?: number;
  fetchImpl?: typeof fetch;
}

function createWiroHeaders(apiKey: string, apiSecret: string): Record<string, string> {
  const nonce = Date.now().toString();
  const signature = createHmac('sha256', apiKey).update(apiSecret + nonce).digest('hex');
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'x-nonce': nonce,
    'x-signature': signature,
  };
}

export function buildWiroPersonaPrompt(systemPrompt: string, messages: ChatMessage[]): string {
  const transcript = messages
    .filter(message => message.role !== 'system' && message.content.trim())
    .map(message => `${message.role === 'assistant' ? 'PERSONA' : 'CALLER'}: ${message.content.trim()}`)
    .join('\n');
  return `${systemPrompt.trim()}\n\nLIVE CALL TRANSCRIPT:\n${transcript}\nPERSONA:`;
}

function extractWiroText(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
      const parsed = JSON.parse(trimmed) as Record<string, any>;
      return String(parsed.text || parsed.output || parsed.response || parsed.content || trimmed).trim();
    } catch {
      return trimmed;
    }
  }
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, any>;
  return String(record.text || record.output || record.response || record.content || '').trim();
}

/**
 * Wiro's refusal-reduced partner models use its signed Run/Task API rather
 * than the OpenAI-compatible gateway. Poll tightly because this sits on the
 * live-call path, then let the caller fall back if the task misses its budget.
 */
export async function requestWiroPersonaDialogue(request: WiroPersonaRequest): Promise<string> {
  if (!request.apiKey || !request.apiSecret) return '';
  const fetcher = request.fetchImpl || fetch;
  const model = request.model || DEFAULT_WIRO_PERSONA_MODEL;
  const controller = new AbortController();
  const maxWaitMs = Math.max(1000, Math.min(12000, request.maxWaitMs || 6500));
  const timeout = setTimeout(() => controller.abort(), maxWaitMs);

  try {
    const runResponse = await fetcher(`https://api.wiro.ai/v1/Run/ByteDance/${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: createWiroHeaders(request.apiKey, request.apiSecret),
      body: JSON.stringify({
        prompt: buildWiroPersonaPrompt(request.systemPrompt, request.messages),
        userId: request.userId,
        session_id: request.sessionId,
      }),
      signal: controller.signal,
    });
    if (!runResponse.ok) {
      const error = new Error(`Wiro persona run failed with ${runResponse.status}`) as Error & { status?: number };
      error.status = runResponse.status;
      throw error;
    }

    const runJson = await runResponse.json() as { taskid?: string; errors?: Array<{ message?: string }> };
    if (runJson.errors?.length) throw new Error(runJson.errors[0]?.message || 'Wiro persona run failed');
    if (!runJson.taskid) throw new Error('Wiro persona run returned no task id');

    while (!controller.signal.aborted) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const detailResponse = await fetcher('https://api.wiro.ai/v1/Task/Detail', {
        method: 'POST',
        headers: createWiroHeaders(request.apiKey, request.apiSecret),
        body: JSON.stringify({ taskid: runJson.taskid }),
        signal: controller.signal,
      });
      if (!detailResponse.ok) continue;
      const detailJson = await detailResponse.json() as { tasklist?: Array<Record<string, any>> };
      const task = detailJson.tasklist?.[0];
      if (!task) continue;
      const output = Array.isArray(task.outputs) ? task.outputs.map(extractWiroText).find(Boolean) : '';
      if (output) return output;
      if (task.status === 'task_error' || task.status === 'task_cancel') {
        throw new Error(String(task.debugoutput || 'Wiro persona task failed'));
      }
    }
    return '';
  } finally {
    clearTimeout(timeout);
  }
}
