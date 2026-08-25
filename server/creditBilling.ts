import nodeCrypto from 'node:crypto';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from './db';
import { generationCosts, users } from '../shared/schema';
import { bypassesInternalCredits } from './auth';
import type { GenerationQuote } from './creditPricing';

export interface GenerationReservation {
  id: string;
  reservedCredits: number;
  persisted: boolean;
}

export async function reserveGenerationCredits(input: {
  userId: string;
  email?: string;
  quote: GenerationQuote;
  metadata?: Record<string, unknown>;
}): Promise<GenerationReservation> {
  const id = nodeCrypto.randomUUID();
  const bypass = bypassesInternalCredits(input.email);
  const reservedCredits = bypass ? 0 : input.quote.credits;

  if (!db) {
    console.warn('[Credits] Database unavailable; reservation is running in local-only mode.');
    return { id, reservedCredits, persisted: false };
  }

  await db.transaction(async (tx: any) => {
    if (!bypass) {
      const updated = await tx.update(users)
        .set({ credits: sql`${users.credits} - ${reservedCredits}`, updatedAt: new Date() })
        .where(and(eq(users.id, input.userId), gte(users.credits, reservedCredits)))
        .returning({ credits: users.credits });

      if (updated.length === 0) {
        const [current] = await tx.select({ credits: users.credits }).from(users).where(eq(users.id, input.userId));
        throw new Error(`Insufficient credits. You need ${reservedCredits} credits but only have ${current?.credits ?? 0} left.`);
      }
    }

    await tx.insert(generationCosts).values({
      id,
      userId: input.userId,
      kind: input.quote.kind,
      provider: input.quote.provider,
      modelId: input.quote.modelId,
      quoteSource: input.quote.quoteSource,
      estimatedProviderCostMicrousd: input.quote.providerCostMicrousd,
      reservedCredits,
      count: input.quote.count,
      requestMetadata: JSON.stringify(input.metadata || {}),
    });
  });

  console.log(`[Credits] Reserved ${reservedCredits} credit(s) for ${input.quote.kind} generation ${id}`);
  return { id, reservedCredits, persisted: true };
}

export async function finalizeGenerationCredits(
  reservation: GenerationReservation | null | undefined,
  result: { ok: boolean; error?: string; actualProviderCostUsd?: number },
): Promise<void> {
  if (!reservation?.persisted || !db) return;

  await db.transaction(async (tx: any) => {
    const actualProviderCostMicrousd = result.actualProviderCostUsd === undefined
      ? null
      : Math.max(0, Math.round(result.actualProviderCostUsd * 1_000_000));

    if (!result.ok) {
      // Claim the reservation first. The status predicate makes settlement
      // idempotent even if two timeout/retry paths finish at the same time.
      const [failedRow] = await tx.update(generationCosts).set({
        status: 'failed',
        chargedCredits: 0,
        refundedCredits: reservation.reservedCredits,
        actualProviderCostMicrousd,
        error: (result.error || 'Generation failed').slice(0, 2000),
        completedAt: new Date(),
      }).where(and(eq(generationCosts.id, reservation.id), eq(generationCosts.status, 'reserved')))
        .returning({ userId: generationCosts.userId, reservedCredits: generationCosts.reservedCredits });
      if (!failedRow) return;

      if (failedRow.reservedCredits > 0) {
        await tx.update(users)
          .set({ credits: sql`${users.credits} + ${failedRow.reservedCredits}`, updatedAt: new Date() })
          .where(eq(users.id, failedRow.userId));
      }
      console.log(`[Credits] Refunded ${failedRow.reservedCredits} credit(s) for failed generation ${reservation.id}`);
      return;
    }

    await tx.update(generationCosts).set({
      status: 'succeeded',
      chargedCredits: reservation.reservedCredits,
      refundedCredits: 0,
      actualProviderCostMicrousd,
      completedAt: new Date(),
    }).where(and(eq(generationCosts.id, reservation.id), eq(generationCosts.status, 'reserved')));
  });
}
