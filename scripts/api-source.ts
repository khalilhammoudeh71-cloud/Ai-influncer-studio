// This file is the Vercel serverless entry point.
// During `vercel-build`, esbuild bundles this + all server code into api/_handler.mjs
// Vercel then deploys _handler.mjs as the serverless function.

import { app } from '../server/index.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
