import { Router, Response } from 'express';
import { db } from './db';
import { personas, generatedImages, revenueEntries, plannedPosts } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';
import { requireAuth, AuthenticatedRequest } from './auth';

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
    alternateReferenceImage: row.alternateReferenceImage || undefined,
    personalityTraits: JSON.parse(row.personalityTraits || '[]'),
    visualStyle: row.visualStyle,
    audienceType: row.audienceType,
    contentBoundaries: row.contentBoundaries,
    bio: row.bio,
    brandVoiceRules: row.brandVoiceRules,
    contentGoals: row.contentGoals,
    personaNotes: row.personaNotes,
    faceDescriptor: row.faceDescriptor || undefined,
    naturalLook: row.naturalLook ?? true,
    identityLock: row.identityLock ?? true,
    voiceId: row.voiceId || undefined,
    voiceEngine: row.voiceEngine || undefined,
    heygenAvatarId: row.heygenAvatarId || undefined,
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
    mediaType: (row.mediaType || 'image') as 'image' | 'video',
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

// All router endpoints are authenticated
router.use(requireAuth);

router.get('/personas', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let allPersonas = await db.select().from(personas).where(eq(personas.userId, req.user.id));
    if (allPersonas.length === 0) {
      // Seed default sandbox persona: Luna TechVibe
      const personaClientId = `user-luna-${req.user.id}`;
      const defaultLunaAvatar = 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80';
      
      await db.insert(personas).values({
        clientId: personaClientId,
        name: 'Luna TechVibe',
        niche: 'Tech & Future Lifestyle',
        tone: 'Energetic, Insightful, Tech-savvy, Visionary',
        platform: 'YouTube & Twitter',
        status: 'Active',
        avatar: defaultLunaAvatar,
        referenceImage: defaultLunaAvatar,
        personalityTraits: JSON.stringify(['Futurist', 'Authentic', 'Vibrant']),
        visualStyle: 'Cyberpunk neon accents, modern workspace, sharp portrait lighting',
        audienceType: 'Developers, tech enthusiasts, digital creators',
        contentBoundaries: 'No politics, focus on positive AI/tech developments',
        bio: 'Luna TechVibe is a futurist and digital creator sharing the cutting edge of tech, AI tools, and creative workspaces. Bringing a vibrant aesthetic and optimistic perspective to technology.',
        brandVoiceRules: 'Use tech terms naturally, be inspiring but grounded, engage with audience questions in comments.',
        contentGoals: 'Build an active community of creators, showcase new tools, review cool gadgets.',
        personaNotes: 'Loves neon lighting and cyberpunk aesthetics.',
        userId: req.user.id,
      });

      // Seed 2 mock library images for Luna
      const seedImage1 = {
        clientId: `img-luna-seed-1-${req.user.id}`,
        personaClientId: personaClientId,
        url: defaultLunaAvatar,
        prompt: 'A futuristic cyberpunk digital creator studio setup with neon purple lighting, multi-monitor desk, high-end gadgets',
        timestamp: Date.now() - 86400000,
        environment: 'Modern Apartment',
        outfit: 'Casual Chic',
        framing: 'Cinematic',
        isFavorite: true,
        model: 'venice:flux-lora-cyberpunk',
        mediaType: 'image',
        userId: req.user.id,
      };

      const seedImage2 = {
        clientId: `img-luna-seed-2-${req.user.id}`,
        personaClientId: personaClientId,
        url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80',
        prompt: 'Professional portrait photo of a tech influencer in a modern glass studio, warm sunset lighting, highly detailed',
        timestamp: Date.now() - 3600000 * 2,
        environment: 'Rooftop Lounge',
        outfit: 'Business Professional',
        framing: 'Portrait',
        isFavorite: false,
        model: 'google:nano-banana-pro',
        mediaType: 'image',
        userId: req.user.id,
      };

      await db.insert(generatedImages).values(seedImage1);
      await db.insert(generatedImages).values(seedImage2);

      // Re-fetch to ensure the seeded persona is returned
      allPersonas = await db.select().from(personas).where(eq(personas.userId, req.user.id));
    }

    const allImages = await db.select().from(generatedImages).where(eq(generatedImages.userId, req.user.id));
    const imagesByPersona: Record<string, typeof generatedImages.$inferSelect[]> = {};
    for (const img of allImages) {
      if (!imagesByPersona[img.personaClientId]) imagesByPersona[img.personaClientId] = [];
      imagesByPersona[img.personaClientId].push(img);
    }
    const result = allPersonas.map((p: any) => personaToClient(p, imagesByPersona[p.clientId] || []));
    res.json(result);
  } catch (err) {
    console.error('[API] GET /personas error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.post('/personas', async (req: AuthenticatedRequest, res: Response) => {
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
      alternateReferenceImage: body.alternateReferenceImage || null,
      personalityTraits: JSON.stringify(body.personalityTraits || []),
      visualStyle: body.visualStyle || '',
      audienceType: body.audienceType || '',
      contentBoundaries: body.contentBoundaries || '',
      bio: body.bio || '',
      brandVoiceRules: body.brandVoiceRules || '',
      contentGoals: body.contentGoals || '',
      personaNotes: body.personaNotes || '',
      faceDescriptor: body.faceDescriptor || null,
      naturalLook: body.naturalLook ?? true,
      identityLock: body.identityLock ?? true,
      userId: req.user.id,
      voiceId: body.voiceId || null,
      voiceEngine: body.voiceEngine || null,
      heygenAvatarId: body.heygenAvatarId || null,
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
        alternateReferenceImage: body.alternateReferenceImage || null,
        personalityTraits: JSON.stringify(body.personalityTraits || []),
        visualStyle: body.visualStyle || '',
        audienceType: body.audienceType || '',
        contentBoundaries: body.contentBoundaries || '',
        bio: body.bio || '',
        brandVoiceRules: body.brandVoiceRules || '',
        contentGoals: body.contentGoals || '',
        personaNotes: body.personaNotes || '',
        faceDescriptor: body.faceDescriptor || null,
        naturalLook: body.naturalLook ?? true,
        identityLock: body.identityLock ?? true,
        userId: req.user.id,
        voiceId: body.voiceId || null,
        voiceEngine: body.voiceEngine || null,
        heygenAvatarId: body.heygenAvatarId || null,
      },
    }).returning();
    res.json(personaToClient(row));
  } catch (err) {
    console.error('[API] POST /personas error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.put('/personas/:clientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientId = req.params.clientId as string;
    const body = req.body;
    const [row] = await db.update(personas).set({
      name: body.name || 'Unnamed',
      niche: body.niche || '',
      tone: body.tone || '',
      platform: body.platform || '',
      status: body.status || 'Draft',
      avatar: body.avatar || '',
      referenceImage: body.referenceImage || null,
      alternateReferenceImage: body.alternateReferenceImage || null,
      personalityTraits: JSON.stringify(body.personalityTraits || []),
      visualStyle: body.visualStyle || '',
      audienceType: body.audienceType || '',
      contentBoundaries: body.contentBoundaries || '',
      bio: body.bio || '',
      brandVoiceRules: body.brandVoiceRules || '',
      contentGoals: body.contentGoals || '',
      personaNotes: body.personaNotes || '',
      faceDescriptor: body.faceDescriptor || null,
      naturalLook: body.naturalLook ?? true,
      identityLock: body.identityLock ?? true,
      voiceId: body.voiceId || null,
      voiceEngine: body.voiceEngine || null,
      heygenAvatarId: body.heygenAvatarId || null,
    }).where(
      and(
        eq(personas.clientId, clientId),
        eq(personas.userId, req.user.id)
      )
    ).returning();
    
    if (!row) return res.status(404).json({ error: 'Persona not found' });
    const imgs = await db.select().from(generatedImages).where(
      and(
        eq(generatedImages.personaClientId, clientId),
        eq(generatedImages.userId, req.user.id)
      )
    );
    res.json(personaToClient(row, imgs));
  } catch (err) {
    console.error('[API] PUT /personas error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.delete('/personas/:clientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientId = req.params.clientId as string;
    await db.delete(generatedImages).where(and(eq(generatedImages.personaClientId, clientId), eq(generatedImages.userId, req.user.id)));
    await db.delete(revenueEntries).where(and(eq(revenueEntries.personaClientId, clientId), eq(revenueEntries.userId, req.user.id)));
    await db.delete(plannedPosts).where(and(eq(plannedPosts.personaClientId, clientId), eq(plannedPosts.userId, req.user.id)));
    await db.delete(personas).where(and(eq(personas.clientId, clientId), eq(personas.userId, req.user.id)));
    res.json({ success: true });
  } catch (err) {
    console.error('[API] DELETE /personas error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.get('/personas/:personaClientId/images', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const imgs = await db.select().from(generatedImages).where(
      and(
        eq(generatedImages.personaClientId, req.params.personaClientId as string),
        eq(generatedImages.userId, req.user.id)
      )
    );
    res.json(imgs.map(imageToClient));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.post('/personas/:personaClientId/images', async (req: AuthenticatedRequest, res: Response) => {
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
      mediaType: body.mediaType || 'image',
      userId: req.user.id,
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
        mediaType: body.mediaType || 'image',
        userId: req.user.id,
      },
    }).returning();
    res.json(imageToClient(row));
  } catch (err) {
    console.error('[API] POST image error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.delete('/personas/:personaClientId/images/:imageClientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await db.delete(generatedImages).where(
      and(
        eq(generatedImages.clientId, req.params.imageClientId as string),
        eq(generatedImages.personaClientId, req.params.personaClientId as string),
        eq(generatedImages.userId, req.user.id),
      )
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.get('/revenue/:personaClientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const entries = await db.select().from(revenueEntries).where(
      and(
        eq(revenueEntries.personaClientId, req.params.personaClientId as string),
        eq(revenueEntries.userId, req.user.id)
      )
    );
    res.json(entries.map(revenueToClient));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.post('/revenue', async (req: AuthenticatedRequest, res: Response) => {
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
      userId: req.user.id,
    }).onConflictDoUpdate({
      target: revenueEntries.clientId,
      set: {
        date: body.date,
        amount: body.amount,
        source: body.source || '',
        platform: body.platform || '',
        notes: body.notes || '',
        userId: req.user.id,
      },
    }).returning();
    res.json(revenueToClient(row));
  } catch (err) {
    console.error('[API] POST revenue error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.delete('/revenue/:clientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await db.delete(revenueEntries).where(
      and(
        eq(revenueEntries.clientId, req.params.clientId as string),
        eq(revenueEntries.userId, req.user.id)
      )
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.get('/planned-posts/:personaClientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const platform = (req.query.platform as string) || '';
    const posts = await db.select().from(plannedPosts).where(
      and(
        eq(plannedPosts.personaClientId, req.params.personaClientId as string),
        eq(plannedPosts.planPlatform, platform),
        eq(plannedPosts.userId, req.user.id)
      )
    );
    res.json(posts.map((p: any) => ({ day: p.day, type: p.type, hook: p.hook, angle: p.angle, cta: p.cta })));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.put('/planned-posts/:personaClientId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const personaClientId = req.params.personaClientId as string;
    const { platform, posts } = req.body;
    await db.delete(plannedPosts).where(
      and(
        eq(plannedPosts.personaClientId, personaClientId),
        eq(plannedPosts.planPlatform, platform || ''),
        eq(plannedPosts.userId, req.user.id)
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
          userId: req.user.id,
        }))
      );
    }
    res.json(posts || []);
  } catch (err) {
    console.error('[API] PUT planned-posts error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.post('/migrate', async (req: AuthenticatedRequest, res: Response) => {
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
          voiceId: p.voiceId || null,
          voiceEngine: p.voiceEngine || null,
          heygenAvatarId: p.heygenAvatarId || null,
          userId: req.user.id,
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
              mediaType: img.mediaType || 'image',
              userId: req.user.id,
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
              userId: req.user.id,
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
                  userId: req.user.id,
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

function getGeminiClientForRoutes(): GoogleGenAI {
  const directKey = process.env.Gemini_api_key || process.env.gemini_api_key || process.env.GEMINI_API_KEY;
  if (directKey) return new GoogleGenAI({ apiKey: directKey });
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  if (!apiKey) throw new Error('Gemini API key not configured');
  return new GoogleGenAI({ apiKey, ...(baseUrl ? { httpOptions: { baseUrl } } : {}) });
}

router.post('/analyze-face', async (req: AuthenticatedRequest, res: Response) => {
  const { personaId, imageBase64 } = req.body as { personaId?: string; imageBase64?: string };
  if (!personaId) return res.status(400).json({ error: 'personaId is required' });
  try {
    const imageBase64ToUse = imageBase64 || null;
    let imageData: string | null = imageBase64ToUse;
    if (!imageData) {
      const [persona] = await db.select().from(personas).where(and(eq(personas.clientId, personaId), eq(personas.userId, req.user.id)));
      if (!persona) return res.status(404).json({ error: 'Persona not found' });
      imageData = persona.referenceImage;
    }
    if (!imageData) return res.status(400).json({ error: 'No reference image provided.' });
    const genAI = getGeminiClientForRoutes();
    const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = (match ? match[1] : 'image/jpeg') as string;
    const data = match ? match[2] : imageData;
    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [
        { inlineData: { mimeType, data } },
        { text: `Analyze this person's face and physical appearance in detail. Provide a concise but comprehensive description that can be used to consistently re-create this person in AI image generation prompts. Include: face shape, eye color and shape, skin tone, hair color and style, lip shape, any distinctive features, approximate age range, and overall facial structure. Format as a single paragraph of 3-5 sentences. Start with the age and apparent gender.` }
      ]}]
    });
    const descriptor = result.text?.trim() || '';
    if (!descriptor) return res.status(500).json({ error: 'Gemini did not return a face description' });
    try { await db.update(personas).set({ faceDescriptor: descriptor }).where(and(eq(personas.clientId, personaId), eq(personas.userId, req.user.id))); } catch {}
    res.json({ faceDescriptor: descriptor });
  } catch (err) {
    console.error('[API] analyze-face error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Face analysis failed' });
  }
});

router.post('/personas/:personaClientId/analyze-face', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const personaClientId = req.params.personaClientId as string;
    const { referenceImage: bodyImage } = req.body as { referenceImage?: string };

    let imageBase64 = bodyImage || null;

    if (!imageBase64) {
      const [persona] = await db.select().from(personas).where(and(eq(personas.clientId, personaClientId), eq(personas.userId, req.user.id)));
      if (!persona) return res.status(404).json({ error: 'Persona not found' });
      imageBase64 = persona.referenceImage;
    }

    if (!imageBase64) return res.status(400).json({ error: 'No reference image provided. Upload a reference image first.' });

    const genAI = getGeminiClientForRoutes();

    const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = (match ? match[1] : 'image/jpeg') as string;
    const data = match ? match[2] : imageBase64;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data } },
            {
              text: `Analyze this person's face and physical appearance in detail. Provide a concise but comprehensive description that can be used to consistently re-create this person in AI image generation prompts. Include: face shape, eye color and shape, skin tone (use descriptive terms like "warm olive", "deep ebony", "fair porcelain"), hair color and style, lip shape, any distinctive features (dimples, freckles, moles), approximate age range, and overall facial structure. Format your response as a single paragraph of 3-5 sentences that reads naturally and could be included in an image generation prompt. Start with the age and apparent gender, then describe key features. Be specific and descriptive.`
            }
          ]
        }
      ]
    });

    const descriptor = result.text?.trim() || '';
    if (!descriptor) return res.status(500).json({ error: 'Gemini did not return a face description' });

    try {
      await db.update(personas).set({ faceDescriptor: descriptor }).where(and(eq(personas.clientId, personaClientId), eq(personas.userId, req.user.id)));
    } catch {
      // Persona may not be saved to DB yet; descriptor is still returned to the frontend
    }

    res.json({ faceDescriptor: descriptor });
  } catch (err) {
    console.error('[API] analyze-face error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Face analysis failed' });
  }
});

router.post('/agent/parse', async (req: AuthenticatedRequest, res: Response) => {
  const { prompt } = req.body as { prompt?: string };
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  try {
    const genAI = getGeminiClientForRoutes();
    const systemInstruction = `You are the orchestrator for an AI Influencer Studio.
Your job is to parse a user's natural language request (e.g. "Create a sporty persona Sofia, generate a 7-day plan, and make an image of her in a gym") into a list of structured task steps.

You must choose the best visual generator model depending on the nature of the request:
- For standard, professional, tech, fashion, food, normal lifestyle, or clean prompts, select one of these clean models:
  - "google:nano-banana-pro" (default clean, fast, free)
  - "google:imagen-4-ultra" (highest quality clean)
  - "openai:gpt-image-2" (OpenAI photorealistic clean)
- For NSFW, adult, flirty, swimsuit, lingerie, boudoir, or highly sensual requests, select one of these NSFW models (ordered by priority):
  - "wavespeed:wavespeed-ai/firered-v1.5-image" (first choice for NSFW/sensual, cheap & highly realistic)
  - "wavespeed:wavespeed-ai/z-image" (second choice for NSFW/sensual)
  - "wavespeed:wavespeed-ai/uso-full" (third choice for NSFW/sensual)
  - "venice:lustify-v8" (fourth choice / Venice premium NSFW)
  - "venice:seedream-v5" (fifth choice / Venice alternative NSFW)

The available task steps are:
1. "create_persona":
   Required parameters:
   - name: string (e.g., Isabella Laurent, Sofia)
   - niche: string (e.g., Luxury Lifestyle, Fitness Model, ASMR Creator)
   - tone: string (comma-separated list of adjectives, e.g., Energetic, Confident, Inspiring)
   - platform: string (e.g., Instagram, YouTube, TikTok, Twitter/X, OnlyFans)
   - bio: string (concise biography, 2-3 sentences)
   - visualStyle: string (visual guidelines, e.g., warm lighting, gym workspace, bedroom setting)
   - personalityTraits: string[] (3-4 adjectives)

2. "generate_content_plan":
   Required parameters:
   - platform: string (e.g., Instagram, TikTok, OnlyFans, etc.)
   - theme: string (main topic or focus of the content plan)

3. "generate_image":
   Required parameters:
   - prompt: string (detailed prompt combining the persona name, visual style, outfit, setting, e.g., "Professional portrait photo of Isabella Laurent in activewear, gym setup, workout pose, detailed skin, highly realistic")
   - environment: string (e.g., Studio, Outdoors, Office, Gym, Kitchen, Bedroom, Beach)
   - outfit: string (e.g., Activewear, Casual, Professional, Formal, Swimsuit, Lingerie)
   - framing: string (e.g., Portrait, Medium Shot, Wide Shot, Cinematic)
   - modelId: string (MUST be one of the clean or NSFW model IDs selected according to the rules above)

Return ONLY a valid JSON array of objects. Do not wrap it in markdown code fences or HTML tags. Each object must have a "type" field (either "create_persona", "generate_content_plan", or "generate_image") and a "params" object.`;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `System instruction:\n${systemInstruction}\n\nUser request: "${prompt}"` }] }]
    });

    let text = result.text?.trim() || '';
    // Clean up code block backticks if model generated any
    text = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    const steps = JSON.parse(text);
    res.json({ steps });
  } catch (err) {
    console.error('[API] /agent/parse error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to parse request with agent' });
  }
});

export default router;
