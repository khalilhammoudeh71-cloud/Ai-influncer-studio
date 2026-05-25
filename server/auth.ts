import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from './db';
import { users } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

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
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  if (!supabaseAdmin) {
    // If Supabase is not configured, we allow fallback for local testing
    // but assign a static mock user to prevent crashing.
    console.warn('[Auth] Supabase keys not set. Bypassing verification with mock user.');
    req.user = { id: 'mock-user-id', email: 'mock@example.com', email_confirmed_at: new Date().toISOString() };
    
    try {
      await db.insert(users).values({
        id: req.user.id,
        email: req.user.email,
        credits: 9999, // infinite credits for offline/mock testing
        subscriptionStatus: 'active',
      }).onConflictDoNothing();
    } catch (err) {
      console.error('[Auth] Failed to lazily sync mock user:', err);
    }
    
    return next();
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Require email verification
    // Supabase user confirmed check
    const isConfirmed = !!user.email_confirmed_at || !!user.confirmed_at;
    if (!isConfirmed) {
      return res.status(403).json({ error: 'Forbidden: Please verify your email address to enter the studio' });
    }

    req.user = user;

    // Lazily sync the user to our Postgres users table
    try {
      const [existingUser] = await db.select().from(users).where(eq(users.id, user.id));
      if (!existingUser) {
        await db.insert(users).values({
          id: user.id,
          email: user.email || '',
          credits: 50, // default free credits
          subscriptionStatus: 'none',
        }).onConflictDoNothing();
      }
    } catch (dbErr) {
      console.error('[Auth] Lazy user sync failed:', dbErr);
    }

    next();
  } catch (err) {
    console.error('[Auth] Verification error:', err);
    return res.status(401).json({ error: 'Unauthorized: Token verification failed' });
  }
}

export function isCreatorUser(email?: string): boolean {
  if (!email) return false;
  const creatorEmail = (process.env.CREATOR_EMAIL || 'khalilhammoudeh71@gmail.com').toLowerCase();
  return email.toLowerCase() === creatorEmail || email.toLowerCase() === 'mock@example.com';
}

export async function deductCredits(userId: string, amount: number) {
  const [userRow] = await db.select().from(users).where(eq(users.id, userId));
  if (!userRow) {
    throw new Error('User account not found.');
  }
  if (userRow.credits < amount) {
    throw new Error(`Insufficient credits. You need ${amount} credits but only have ${userRow.credits} left.`);
  }
  await db.update(users).set({
    credits: sql`credits - ${amount}`,
  }).where(eq(users.id, userId));
}
