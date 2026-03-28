import { Router } from 'express';
import { db } from './db';
import { personas, generatedImages, revenueEntries, plannedPosts } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

interface PlannedPostInput {
  day: number;
  type: string;
  hook: string;
  angle: string;
  cta: string;
}

interface RevenueEntryInput {
  id: string;
  personaId: string;
  date: string;
  amount: number;
  source: string;
  platform: string;
  notes: string;
}

const router = Router();

function personaToClient(row: typeof personas.$inferSelect, images: typeof generatedImages.$inferSelect[] = []) {
  return {
    id: row.clientId,
    name: row.name,
    niche: row.niche,
    tone: row.tone,
    platform: row.platform,
    status: row.status,
    avatar: row.avatar,
    referenceImage: row.referenceImage || undefined,
    personalityTraits: JSON.parse(row.personalityTraits || '[]'),
    visualStyle: row.visualStyle,
    audienceType: row.audienceType,
    contentBoundaries: row.contentBoundaries,
    bio: row.bio,
    brandVoiceRules: row.brandVoiceRules,
    contentGoals: row.contentGoals,
    personaNotes: row.personaNotes,
    visualLibrary: images.map(imageToClient),
  };
}

function imageToClient(row: typeof generatedImages.$inferSelect) {
  return {
    id: row.clientId,
    url: row.url,
    prompt: row.prompt,
    timestamp: row.timestamp,
    environment: row.environment || undefined,
    outfit: row.outfit || undefined,
    framing: row.framing || undefined,
    isFavorite: row.isFavorite || false,
    model: row.model || undefined,
  };
}

function revenueToClient(row: typeof revenueEntries.$inferSelect) {
  return {
    id: row.clientId,
    date: row.date,
    amount: row.amount,
    source: row.source,
    platform: row.platform,
    personaId: row.personaClientId,
    notes: row.notes,
  };
}

router.get('/personas', async (_req, res) => {
  try {
    const allPersonas = await db.select().from(personas);
    const allImages = await db.select().from(generatedImages);
    const imagesByPersona: Record<string, typeof generatedImages.$inferSelect[]> = {};
    for (const img of allImages) {
      if (!imagesByPersona[img.personaClientId]) imagesByPersona[img.personaClientId] = [];
      imagesByPersona[img.personaClientId].push(img);
    }
    const result = allPersonas.map(p => personaToClient(p, imagesByPersona[p.clientId] || []));
    res.json(result);
  } catch (err) {
    console.error('[API] GET /personas error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.post('/personas', async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db.insert(personas).values({
      clientId: body.id,
      name: body.name || 'Unnamed',
      niche: body.niche || '',
      tone: body.tone || '',
      platform: body.platform || '',
      status: body.status || 'Draft',
      avatar: body.avatar || '',
      referenceImage: body.referenceImage || null,
      personalityTraits: JSON.stringify(body.personalityTraits || []),
      visualStyle: body.visualStyle || '',
      audienceType: body.audienceType || '',
      contentBoundaries: body.contentBoundaries || '',
      bio: body.bio || '',
      brandVoiceRules: body.brandVoiceRules || '',
      contentGoals: body.contentGoals || '',
      personaNotes: body.personaNotes || '',
    }).onConflictDoUpdate({
      target: personas.clientId,
      set: {
        name: body.name || 'Unnamed',
        niche: body.niche || '',
        tone: body.tone || '',
        platform: body.platform || '',
        status: body.status || 'Draft',
        avatar: body.avatar || '',
        referenceImage: body.referenceImage || null,
        personalityTraits: JSON.stringify(body.personalityTraits || []),
        visualStyle: body.visualStyle || '',
        audienceType: body.audienceType || '',
        contentBoundaries: body.contentBoundaries || '',
        bio: body.bio || '',
        brandVoiceRules: body.brandVoiceRules || '',
        contentGoals: body.contentGoals || '',
        personaNotes: body.personaNotes || '',
      },
    }).returning();
    res.json(personaToClient(row));
  } catch (err) {
    console.error('[API] POST /personas error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.put('/personas/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const body = req.body;
    const [row] = await db.update(personas).set({
      name: body.name || 'Unnamed',
      niche: body.niche || '',
      tone: body.tone || '',
      platform: body.platform || '',
      status: body.status || 'Draft',
      avatar: body.avatar || '',
      referenceImage: body.referenceImage || null,
      personalityTraits: JSON.stringify(body.personalityTraits || []),
      visualStyle: body.visualStyle || '',
      audienceType: body.audienceType || '',
      contentBoundaries: body.contentBoundaries || '',
      bio: body.bio || '',
      brandVoiceRules: body.brandVoiceRules || '',
      contentGoals: body.contentGoals || '',
      personaNotes: body.personaNotes || '',
    }).where(eq(personas.clientId, clientId)).returning();
    if (!row) return res.status(404).json({ error: 'Persona not found' });
    const imgs = await db.select().from(generatedImages).where(eq(generatedImages.personaClientId, clientId));
    res.json(personaToClient(row, imgs));
  } catch (err) {
    console.error('[API] PUT /personas error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.delete('/personas/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    await db.delete(generatedImages).where(eq(generatedImages.personaClientId, clientId));
    await db.delete(revenueEntries).where(eq(revenueEntries.personaClientId, clientId));
    await db.delete(plannedPosts).where(eq(plannedPosts.personaClientId, clientId));
    await db.delete(personas).where(eq(personas.clientId, clientId));
    res.json({ success: true });
  } catch (err) {
    console.error('[API] DELETE /personas error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.get('/personas/:personaClientId/images', async (req, res) => {
  try {
    const imgs = await db.select().from(generatedImages).where(eq(generatedImages.personaClientId, req.params.personaClientId));
    res.json(imgs.map(imageToClient));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.post('/personas/:personaClientId/images', async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db.insert(generatedImages).values({
      clientId: body.id,
      personaClientId: req.params.personaClientId,
      url: body.url,
      prompt: body.prompt || '',
      timestamp: body.timestamp || Date.now(),
      environment: body.environment || null,
      outfit: body.outfit || null,
      framing: body.framing || null,
      isFavorite: body.isFavorite || false,
      model: body.model || null,
    }).onConflictDoUpdate({
      target: generatedImages.clientId,
      set: {
        url: body.url,
        prompt: body.prompt || '',
        timestamp: body.timestamp || Date.now(),
        environment: body.environment || null,
        outfit: body.outfit || null,
        framing: body.framing || null,
        isFavorite: body.isFavorite || false,
        model: body.model || null,
      },
    }).returning();
    res.json(imageToClient(row));
  } catch (err) {
    console.error('[API] POST image error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.delete('/personas/:personaClientId/images/:imageClientId', async (req, res) => {
  try {
    await db.delete(generatedImages).where(
      and(
        eq(generatedImages.clientId, req.params.imageClientId),
        eq(generatedImages.personaClientId, req.params.personaClientId),
      )
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.get('/revenue/:personaClientId', async (req, res) => {
  try {
    const entries = await db.select().from(revenueEntries).where(eq(revenueEntries.personaClientId, req.params.personaClientId));
    res.json(entries.map(revenueToClient));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.post('/revenue', async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db.insert(revenueEntries).values({
      clientId: body.id,
      personaClientId: body.personaId,
      date: body.date,
      amount: body.amount,
      source: body.source || '',
      platform: body.platform || '',
      notes: body.notes || '',
    }).onConflictDoUpdate({
      target: revenueEntries.clientId,
      set: {
        date: body.date,
        amount: body.amount,
        source: body.source || '',
        platform: body.platform || '',
        notes: body.notes || '',
      },
    }).returning();
    res.json(revenueToClient(row));
  } catch (err) {
    console.error('[API] POST revenue error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.delete('/revenue/:clientId', async (req, res) => {
  try {
    await db.delete(revenueEntries).where(eq(revenueEntries.clientId, req.params.clientId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.get('/planned-posts/:personaClientId', async (req, res) => {
  try {
    const platform = (req.query.platform as string) || '';
    const posts = await db.select().from(plannedPosts).where(
      and(
        eq(plannedPosts.personaClientId, req.params.personaClientId),
        eq(plannedPosts.planPlatform, platform),
      )
    );
    res.json(posts.map(p => ({ day: p.day, type: p.type, hook: p.hook, angle: p.angle, cta: p.cta })));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.put('/planned-posts/:personaClientId', async (req, res) => {
  try {
    const { personaClientId } = req.params;
    const { platform, posts } = req.body;
    await db.delete(plannedPosts).where(
      and(
        eq(plannedPosts.personaClientId, personaClientId),
        eq(plannedPosts.planPlatform, platform || ''),
      )
    );
    if (posts && posts.length > 0) {
      await db.insert(plannedPosts).values(
        posts.map((p: PlannedPostInput) => ({
          personaClientId,
          planPlatform: platform || '',
          day: p.day,
          type: p.type || '',
          hook: p.hook || '',
          angle: p.angle || '',
          cta: p.cta || '',
        }))
      );
    }
    res.json(posts || []);
  } catch (err) {
    console.error('[API] PUT planned-posts error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.post('/migrate', async (req, res) => {
  try {
    const { personas: personaList, revenueEntries: revenueMap, plannedPosts: planMap } = req.body;

    if (personaList && Array.isArray(personaList)) {
      for (const p of personaList) {
        await db.insert(personas).values({
          clientId: p.id,
          name: p.name || 'Unnamed',
          niche: p.niche || '',
          tone: p.tone || '',
          platform: p.platform || '',
          status: p.status || 'Draft',
          avatar: p.avatar || '',
          referenceImage: p.referenceImage || null,
          personalityTraits: JSON.stringify(p.personalityTraits || []),
          visualStyle: p.visualStyle || '',
          audienceType: p.audienceType || '',
          contentBoundaries: p.contentBoundaries || '',
          bio: p.bio || '',
          brandVoiceRules: p.brandVoiceRules || '',
          contentGoals: p.contentGoals || '',
          personaNotes: p.personaNotes || '',
        }).onConflictDoNothing();

        if (p.visualLibrary && Array.isArray(p.visualLibrary)) {
          for (const img of p.visualLibrary) {
            await db.insert(generatedImages).values({
              clientId: img.id,
              personaClientId: p.id,
              url: img.url,
              prompt: img.prompt || '',
              timestamp: img.timestamp || Date.now(),
              environment: img.environment || null,
              outfit: img.outfit || null,
              framing: img.framing || null,
              isFavorite: img.isFavorite || false,
              model: img.model || null,
            }).onConflictDoNothing();
          }
        }
      }
    }

    if (revenueMap && typeof revenueMap === 'object') {
      for (const [_personaId, entries] of Object.entries(revenueMap)) {
        if (Array.isArray(entries)) {
          for (const e of entries as RevenueEntryInput[]) {
            await db.insert(revenueEntries).values({
              clientId: e.id,
              personaClientId: e.personaId,
              date: e.date,
              amount: e.amount,
              source: e.source || '',
              platform: e.platform || '',
              notes: e.notes || '',
            }).onConflictDoNothing();
          }
        }
      }
    }

    if (planMap && typeof planMap === 'object') {
      for (const [personaId, platformPlans] of Object.entries(planMap)) {
        if (platformPlans && typeof platformPlans === 'object') {
          for (const [platform, posts] of Object.entries(platformPlans as Record<string, PlannedPostInput[]>)) {
            if (Array.isArray(posts)) {
              for (const p of posts) {
                await db.insert(plannedPosts).values({
                  personaClientId: personaId,
                  planPlatform: platform,
                  day: p.day,
                  type: p.type || '',
                  hook: p.hook || '',
                  angle: p.angle || '',
                  cta: p.cta || '',
                }).onConflictDoNothing();
              }
            }
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[API] POST /migrate error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

export default router;
