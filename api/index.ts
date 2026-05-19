import { app } from '../server/index';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Let Express handle the request
  return app(req as any, res as any);
}
