const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE']);

export function shouldRetryApiRequest(input: {
  method?: string;
  attempt: number;
  status?: number;
  networkError?: boolean;
}): boolean {
  const method = String(input.method || 'GET').toUpperCase();
  if (input.attempt > 0 || !IDEMPOTENT_METHODS.has(method)) return false;
  if (input.networkError) return true;
  const status = Number(input.status || 0);
  return status === 401 || status === 408 || status === 429 || status >= 500;
}

export function apiRetryDelayMs(attempt: number): number {
  return Math.min(1_500, 220 * (2 ** Math.max(0, attempt)));
}
