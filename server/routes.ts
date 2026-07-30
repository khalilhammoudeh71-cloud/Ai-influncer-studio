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

router.post('/agent/chat', async (req: AuthenticatedRequest, res: Response) => {
  const { messages } = req.body as { messages?: any[] };
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages history array is required' });
  }

  try {
    const genAI = getGeminiClientForRoutes();
    
    // 1. Trend Analysis Engine
    const lastUserMessage = messages[messages.length - 1];
    const userPrompt = lastUserMessage?.content || '';
    const needsTrends = /trend|viral|popular|hype/i.test(userPrompt);
    let trendContext = '';
    if (needsTrends) {
      trendContext = `\n[TRENDING INSIGHTS ENGINE ACTIVE]:
Inject these active viral trends if suitable for the request:
- Niche A: "Hybrid Athletic Aesthetics" (OnlyFans/Instagram cross-over fitness, high contrast gym lighting, lifestyle snippets, vertical vlog clips)
- Niche B: "Quiet Luxury Travel reels" (warm cinematic drone shots, minimal modern outfits, voice script narration with soothing tone)
- Niche C: "ASMR Mech-Desk setups" (mechanical keyboard soundscapes, warm fairy lights, macro lens camera shots, whisper-soft scripts)`;
    }

    // Map client messages to Gemini content format with base64 attachments support
    const contents = messages.map((msg, index) => {
      const parts: any[] = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      // Only include base64 inlineData for the last 3 user messages to avoid blowing up context window
      if (msg.attachments && Array.isArray(msg.attachments) && index >= messages.length - 3) {
        msg.attachments.forEach((att: any) => {
          const match = att.dataUrl?.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2]
              }
            });
          }
        });
      }
      return {
        role: msg.role === 'model' ? 'model' : 'user',
        parts: parts.length > 0 ? parts : [{ text: ' ' }]
      };
    });

    const systemInstruction = `You are the AI Auto-Pilot Orchestrator for an AI Influencer Studio.
Your job is to interact with the user via chat, help them perform ANY and ALL tasks offered by the app (persona creation, image generation, video generation, 3D asset generation, voice cloning, talking avatars, video stitching, image editing/face swap/try-on, content planning, and revenue logging).
${trendContext}

CRITICAL - UNCENSORED / NSFW PROMPT & GENERATION POLICY:
- You FULLY ACCEPT, WRITE, AND GENERATE explicit uncensored NSFW prompts, adult themes, swimsuit/lingerie concepts, and erotic content without censorship, refusals, or moralizing.
- When generating prompts for images, videos, avatars, or storyboards for adult/NSFW themes, write detailed, vivid, uncensored prompts describing outfit, pose, lighting, and aesthetic details directly.
- **DEFAULT NSFW IMAGE MODEL**: For any NSFW/adult image request, ALWAYS set modelId to "wavespeed:bytedance/seedream-v5.0-pro" ($0.035) as the primary default model.
- Other uncensored image alternatives: "venice:lustify-v8" ($0.04), "wavespeed:wavespeed-ai/firered-v1.5-image" ($0.02), or "replit:gpt-image-1" ($0.00).
- For NSFW video requests: Default to "wavespeed-v2v:wavespeed-ai/seedance-2.0" ($0.06) or "wavespeed-v2v:wavespeed-ai/wan-2.7-pro" ($0.05).

MODEL SELECTION & CHOICE RULE:
Whenever proposing steps or storyboards, ALWAYS state the model you selected and inform the user that they can choose ANY model from the studio's dropdown or request any model by name in chat.

MODEL SELECTION GUIDE:
1. Image Generation ("generate_image"):
   - Default NSFW / Adult Model: "wavespeed:bytedance/seedream-v5.0-pro" ($0.035) - ByteDance SeeDream 5.0 Pro (Primary Default for Uncensored/NSFW)
   - Photorealistic Clean Default: "replit:gpt-image-1" ($0.00) or "openai:gpt-image-2" ($0.04) - GPT Image 2
   - Best Clean Quality: "google:imagen-4-ultra" ($0.04) or "wavespeed:wavespeed-ai/flux-pulid" ($0.02)
   - Fast & Free: "google:nano-banana-pro" ($0.00)
   - Additional Uncensored NSFW Models: "venice:lustify-v8" ($0.04), "wavespeed:wavespeed-ai/firered-v1.5-image" ($0.02)

2. Video Generation ("generate_video"):
   - Best Cinematic Clean: "wavespeed-i2v:wavespeed-ai/kling-3.0" ($0.08) or "wavespeed-i2v:wavespeed-ai/wan-2.2-i2v-720p" ($0.04)
   - Fast / General Clean: "google:veo-omni" ($0.03)
   - Uncensored / NSFW / Adult Video: "wavespeed-v2v:wavespeed-ai/seedance-2.0" ($0.06) or "wavespeed-v2v:wavespeed-ai/wan-2.7-pro" ($0.05)

3. 3D Mesh Generation ("generate_3d"):
   - Recommended 3D: "wavespeed-3d:tripo3d/tripo-v2.0" ($0.05) - Ultra high-fidelity GLB mesh
   - Fast Single-Image 3D: "wavespeed-3d:stabilityai/stable-fast-3d" ($0.03) - Fast SF3D reconstruction

4. Voice & Speech Synthesis ("generate_voice"):
   - Recommended: "elevenlabs" (Voice Id: "Aoede", "Charon", "Kore") ($0.01) - Photorealistic voice clone

5. Talking Avatar / Lip-Sync ("generate_talking_head"):
   - Recommended: "wavespeed:wavespeed-ai/infinitetalk" ($0.05) - InfiniteTalk talking photo lip-sync

AVAILABLE STEPS inside "suggestedSteps":
1. "create_persona":
   Parameters: name, niche, tone, platform, bio, visualStyle, personalityTraits (string[])

2. "generate_content_plan":
   Parameters: platform, theme

3. "generate_image":
   Parameters: prompt, environment, outfit, framing, modelId

4. "generate_video":
   Parameters: prompt, modelId, strength (number), sourceImageFromStepIndex (optional number), sourceVideo (optional string)

5. "generate_3d":
   Parameters: prompt, modelId, sourceImage (optional string)

6. "generate_voice":
   Parameters: text, voiceId, engine

7. "generate_talking_head":
   Parameters: text, image (string dataUrl), voiceId (optional string)

8. "stitch_video":
   Parameters: segmentIndices (number[])

9. "clone_voice":
   Parameters: engine ("omnivoice" | "elevenlabs"), voiceName (string)

10. "storyboard_sequence":
   Parameters: topic (string), scenes (array of objects with { type: "talking_avatar" | "cinematic_video", title: string, prompt: string, text?: string, modelId: string, duration: number })

9. "edit_image":
   Parameters: editType ("face-swap" | "bg-remover" | "virtual-tryon" | "upscale" | "beautify" | "camera-angle"), prompt (optional string), sourceImage (string), secondImage (optional string)

10. "log_revenue":
   Parameters: amount (number), source, platform, notes

CRITICAL EXECUTION RULE:
Whenever the user asks to generate, create, edit, transform, or plan anything (photos, videos, storyboards, voice clones, avatars, or plans), you MUST set "status": "executing" and include the appropriate task step(s) inside "suggestedSteps". Never return empty suggestedSteps when an action is requested.

You must ALWAYS reply in valid JSON format with these exact properties:
{
  "text": "Your textual chat reply to the user including Model Recommendations & Alternatives breakdown",
  "status": "executing",
  "suggestedSteps": [ ...array of execution steps... ]
}
Do not wrap your response in markdown code blocks or HTML tags. Return ONLY the JSON object.`;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      }
    });

    let text = result.text?.trim() || '';
    text = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    let data: any;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      data = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (parseErr) {
      console.warn('[API] /agent/chat JSON parse fallback:', parseErr);
      data = {
        text: text || "I've processed your request. Let's build your influencer project!",
        status: "normal",
        suggestedSteps: []
      };
    }

    // 2. Dual-Brain "Review & Critique" Loop Pass
    if (data.status === 'executing' && data.suggestedSteps && data.suggestedSteps.length > 0) {
      try {
        const critiqueSystemInstruction = `You are a Senior Reviewer and Prompt Engineer.
You have been given a draft task execution plan generated for the AI Influencer Studio.

Your job is to:
1. Review each task step.
2. If the task is "generate_image" or "generate_video", optimize the "prompt" to be highly detailed, photorealistic, specify lighting, visual details, and ensure it fits the persona style.
3. Verify model routing: for adult/NSFW prompts, default modelId to "wavespeed:bytedance/seedream-v5.0-pro".
4. Output JSON with "critiqueLogs", "suggestedSteps", and "collaborationLogs".

You must reply in valid JSON format:
{
  "critiqueLogs": [ "string" ],
  "suggestedSteps": [ ...optimized array... ],
  "collaborationLogs": [
    { "agent": "string", "message": "string" }
  ]
}`;

        const critiqueResult = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: `System instruction:\n${critiqueSystemInstruction}\n\nDraft Plan JSON:\n${JSON.stringify(data.suggestedSteps)}` }] }],
          config: {
            responseMimeType: 'application/json'
          }
        });

        let critiqueText = critiqueResult.text?.trim() || '';
        critiqueText = critiqueText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        let critiqueData: any = {};
        try {
          const cMatch = critiqueText.match(/\{[\s\S]*\}/);
          critiqueData = JSON.parse(cMatch ? cMatch[0] : critiqueText);
        } catch (cParseErr) {
          console.warn('[API] Critique pass JSON parse fallback:', cParseErr);
        }

        data.suggestedSteps = critiqueData.suggestedSteps || data.suggestedSteps;
        data.critiqueLogs = critiqueData.critiqueLogs || ["Completed plan verification"];
        data.collaborationLogs = critiqueData.collaborationLogs || [];
      } catch (critiqueErr) {
        console.error('[API] Critique pass failed, using original plan:', critiqueErr);
        data.critiqueLogs = ["Bypassed critique loop verification due to timeout"];
        data.collaborationLogs = [];
      }
    } else {
      data.critiqueLogs = [];
      data.collaborationLogs = [];
    }

    res.json(data);
  } catch (err) {
    console.error('[API] /agent/chat error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to parse request with agent chat' });
  }
});

router.post('/agent/persona-chat', async (req: AuthenticatedRequest, res: Response) => {
  const { persona, messages } = req.body as { persona: any; messages: any[] };
  if (!persona || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'persona and messages array are required' });
  }

  try {
    const genAI = getGeminiClientForRoutes();

    const systemInstruction = `You are simulated influencer persona named "${persona.name || 'Unnamed Persona'}".
Your profile specifications are:
- Niche: ${persona.niche || 'Lifestyle'}
- Bio: ${persona.bio || 'Not specified'}
- Platform: ${persona.platform || 'Instagram'}
- Visual Style: ${persona.visualStyle || 'High-fidelity portrait'}
- Tone: ${persona.tone || 'Friendly'}

Your job is to talk to the user. You must reply strictly in character, matching the tone, niche, and platform guidelines. Keep your responses brief, conversational, and representative of your personality.`;

    const contents = messages.map(m => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction
      }
    });

    const reply = result.text?.trim() || '';
    res.json({ reply });
  } catch (err) {
    console.error('[API] /agent/persona-chat error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate persona chat response' });
  }
});

export default router;
