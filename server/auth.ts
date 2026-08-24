import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from './db';
import { users } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

// Vite-prefixed values are public by design and are the names already used by
// the browser build. Reuse them on the server when dedicated aliases are not
// configured so bearer-token verification works in Vercel previews as well.
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

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
    return res.status(401).json({ error: 'Unauthorized: Please sign in to continue' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ error: 'Unauthorized: Please sign in to continue' });
  }
  if (!supabaseAdmin) {
    console.error('[Auth] Supabase authentication is not configured on the server');
    return res.status(503).json({ error: 'Authentication service is temporarily unavailable' });
  }

  try {
    const userPromise = supabaseAdmin.auth.getUser(token);
    const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve({ data: { user: null }, error: new Error('Auth Timeout') }), 8000));
    const { data: { user }, error } = await Promise.race([userPromise, timeoutPromise]);

    if (error?.message === 'Auth Timeout') {
      return res.status(503).json({ error: 'Authentication service is temporarily unavailable' });
    }
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Your session is invalid or has expired' });
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
    console.error('[Auth] Verification error:', err);
    return res.status(503).json({ error: 'Authentication service is temporarily unavailable' });
  }
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const [localPart, domain] = normalized.split('@');
  if (!localPart || !domain) return normalized;

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `${localPart.replace(/\./g, '')}@gmail.com`;
  }

  return normalized;
}

export function isCreatorUser(email?: string): boolean {
  if (!email) return false;
  const creatorEmail = process.env.CREATOR_EMAIL || 'khalilhammoudeh71@gmail.com';
  return normalizeEmail(email) === normalizeEmail(creatorEmail);
}

export function bypassesInternalCredits(email?: string): boolean {
  return isCreatorUser(email);
}

export async function deductCredits(userId: string, amount: number, email?: string) {
  // The studio owner pays providers directly through the configured API keys.
  // Internal credits are reserved for customer accounts and must never block
  // the creator from using an otherwise funded provider account.
  if (bypassesInternalCredits(email)) {
    console.log(`[Credits] Creator account bypassed internal deduction for ${amount} credit(s)`);
    return;
  }

  try {
    const [userRow] = await db.select().from(users).where(eq(users.id, userId));
    if (bypassesInternalCredits(userRow?.email)) {
      console.log(`[Credits] Creator account bypassed internal deduction for ${amount} credit(s)`);
      return;
    }
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
