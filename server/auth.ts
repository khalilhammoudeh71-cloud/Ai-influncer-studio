import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from './db';
import { users } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const isDevelopmentAuthBypassEnabled = () =>
  process.env.NODE_ENV !== 'production' && process.env.ALLOW_MOCK_AUTH === 'true';

const createDevelopmentUser = () => ({
  id: 'local-development-user',
  email: 'mock@example.com',
  email_confirmed_at: new Date().toISOString(),
});

// Backend admin-level Supabase client to inspect JWTs
export const supabaseAdmin = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.includes('undefined') || authHeader.includes('null')) {
    if (isDevelopmentAuthBypassEnabled()) {
      req.user = createDevelopmentUser();
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: a valid session is required' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ error: 'Unauthorized: a valid session is required' });
  }

  if (!supabaseAdmin) {
    if (isDevelopmentAuthBypassEnabled()) {
      req.user = createDevelopmentUser();
      return next();
    }
    return res.status(503).json({ error: 'Authentication service is not configured' });
  }

  try {
    const userPromise = supabaseAdmin.auth.getUser(token);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Authentication service timed out')), 5000)
    );
    const { data: { user }, error } = await Promise.race([userPromise, timeoutPromise]);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: invalid or expired session' });
    }

    // Require email verification
    const isConfirmed = !!user.email_confirmed_at || !!user.confirmed_at;
    if (!isConfirmed) {
      return res.status(403).json({ error: 'Forbidden: Please verify your email address to enter the studio' });
    }

    req.user = user;

    // Lazily sync the user to our Postgres users table
    if (db) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 500));
        await Promise.race([
          (async () => {
            const [existingUser] = await db.select().from(users).where(eq(users.id, user.id));
            if (!existingUser) {
              await db.insert(users).values({
                id: user.id,
                email: user.email || '',
                credits: 50,
                subscriptionStatus: 'none',
              }).onConflictDoNothing();
            }
          })(),
          timeoutPromise
        ]);
      } catch (dbErr) {
        console.warn('[Auth] Lazy user sync bypassed / timed out:', dbErr instanceof Error ? dbErr.message : dbErr);
      }
    }

    next();
  } catch (err) {
    console.error('[Auth] Verification error:', err instanceof Error ? err.message : 'Unknown authentication error');
    return res.status(503).json({ error: 'Authentication service is temporarily unavailable' });
  }
}

export function isCreatorUser(email?: string): boolean {
  if (!email) return false;
  if (isDevelopmentAuthBypassEnabled() && email.toLowerCase() === 'mock@example.com') return true;
  const creatorEmail = process.env.CREATOR_EMAIL?.trim().toLowerCase();
  return Boolean(creatorEmail) && email.toLowerCase() === creatorEmail;
}

export async function deductCredits(userId: string, amount: number) {
  try {
    const [userRow] = await db.select().from(users).where(eq(users.id, userId));
    if (userRow && userRow.credits < amount) {
      throw new Error(`Insufficient credits. You need ${amount} credits but only have ${userRow.credits} left.`);
    }
    if (userRow) {
      await db.update(users).set({
        credits: sql`credits - ${amount}`,
      }).where(eq(users.id, userId));
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Insufficient credits')) {
      throw err;
    }
    console.warn('[Auth] Credit deduction skipped (local mode active):', err instanceof Error ? err.message : err);
  }
}
