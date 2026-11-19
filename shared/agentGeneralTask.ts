export type TaskArtifact = { id: string; name: string; mimeType: string; content: string };
export type TaskTrace = { id: string; tool: string; status: 'succeeded' | 'failed'; summary: string };
export type GeneralTaskResult = {
  status: 'complete' | 'partial' | 'needs_input';
  plan: string[];
  trace: TaskTrace[];
  artifacts: TaskArtifact[];
  checks: string[];
  modelCalls: number;
  inputTokens?: number;
  outputTokens?: number;
};
export const taskDocumentExtensions = ['txt', 'md', 'csv', 'json', 'pdf'];
export function isTaskDocument(name: string): boolean {
  return taskDocumentExtensions.includes(name.split('.').pop()?.toLowerCase() || '');
}
