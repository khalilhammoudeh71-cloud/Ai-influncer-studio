const PUBLIC_API_PATHS = new Set([
  '/stripe/webhook',
  '/media-jobs/worker',
  '/model-catalog/refresh',
]);

export function isPublicApiPath(path: string): boolean {
  const normalized = path.startsWith('/api/') ? path.slice(4) : path;
  return PUBLIC_API_PATHS.has(normalized);
}
