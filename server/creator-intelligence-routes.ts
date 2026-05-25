// ═══════════════════════════════════════════════════════════════════
//  CREATOR INTELLIGENCE SUITE — 10 Gemini-powered features
//  Injected into server/index.ts
// ═══════════════════════════════════════════════════════════════════

// 1. Brand Deal Analyzer
app.post('/api/analyze-brand-deal', async (req, res) => {
  const { persona, dealText } = req.body;
  if (!persona || !dealText) return res.status(400).json({ error: 'persona and dealText required' });
  try {
    const ai = getGeminiClient();
    const prompt = `You are an elite talent manager and brand deal attorney specializing in influencer marketing.
Persona: ${persona.name} | Niche: ${persona.niche} | Platform: ${persona.platform || 'Instagram'} | Tone: ${persona.tone}
Bio: ${persona.bio || ''}

Analyze this brand deal/partnership offer:
---
${dealText}
---
Return ONLY a valid JSON object with these exact keys:
{
  "fitScore": <number 0-100>,
  "fitLabel": <"Excellent Fit" | "Good Fit" | "Neutral" | "Poor Fit" | "Brand Mismatch">,
  "fitReason": "<2-sentence explanation>",
  "suggestedRate": "<e.g. $2,500 - $4,000>",
  "rateReason": "<1 sentence>",
  "redFlags": ["<flag1>", "<flag2>"],
  "greenFlags": ["<flag1>", "<flag2>"],
  "negotiationTips": ["<tip1>", "<tip2>", "<tip3>"],
  "counterOfferEmail": "<150-word email in persona voice>",
  "verdict": <"Accept" | "Negotiate" | "Pass">
}`;
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt, config: { maxOutputTokens: 1200, temperature: 0.4 } });
    const raw = (response.text || '{}').trim().replace(/```json\n?|```/g, '');
    return res.json(JSON.parse(raw));
  } catch (err) {
    console.error('[analyze-brand-deal]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Analysis failed' });
  }
});

// 2. Media Kit Generator
app.post('/api/generate-media-kit', async (req, res) => {
  const { persona } = req.body;
  if (!persona) return res.status(400).json({ error: 'persona required' });
  try {
    const ai = getGeminiClient();
    const prompt = `Generate a professional influencer media kit.
Creator: ${persona.name} | Niche: ${persona.niche} | Platform: ${persona.platform || 'Instagram'} | Tone: ${persona.tone}
Bio: ${persona.bio || ''} | Visual Style: ${persona.visualStyle || ''} | Audience: ${persona.audienceType || 'General'}

Return ONLY valid JSON:
{
  "tagline": "<catchy one-liner>",
  "bio": "<polished 60-word bio>",
  "audienceStats": { "ageRange": "<e.g. 18-34>", "topGenders": "<e.g. 72% Female>", "topLocations": ["<country1>", "<country2>", "<country3>"], "avgEngagementRate": "<e.g. 4.2%>" },
  "contentTypes": ["<type with emoji>", "<type>", "<type>", "<type>"],
  "packages": [
    { "name": "Story Package", "deliverables": "<what's included>", "price": "<price range>", "ideal": "<ideal brand type>" },
    { "name": "Reel Package", "deliverables": "<what's included>", "price": "<price range>", "ideal": "<ideal brand type>" },
    { "name": "Full Campaign", "deliverables": "<what's included>", "price": "<price range>", "ideal": "<ideal brand type>" }
  ],
  "pastCollabs": ["<brand1>", "<brand2>", "<brand3>"],
  "brandValues": ["<value1>", "<value2>", "<value3>", "<value4>", "<value5>"],
  "contactNote": "<professional one-sentence closing>"
}`;
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt, config: { maxOutputTokens: 1000, temperature: 0.5 } });
    const raw = (response.text || '{}').trim().replace(/```json\n?|```/g, '');
    return res.json(JSON.parse(raw));
  } catch (err) {
    console.error('[generate-media-kit]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// 3. Viral Hook Generator
app.post('/api/viral-hooks', async (req, res) => {
  const { persona, topic, count = 10 } = req.body;
  if (!persona || !topic) return res.status(400).json({ error: 'persona and topic required' });
  try {
    const ai = getGeminiClient();
    const prompt = `You are a viral content strategist who has studied every viral post 2018-2025.
Persona: ${persona.name} | Niche: ${persona.niche} | Tone: ${persona.tone} | Platform: ${persona.platform || 'Instagram'}

Generate ${count} viral hooks for topic: "${topic}"
Return ONLY a valid JSON array:
[
  {
    "hook": "<hook text 1-2 sentences>",
    "type": "<Curiosity Gap | Controversy | Relatability | Pattern Interrupt | Transformation | Authority | Fear/FOMO | Humor>",
    "platform": "<Instagram | TikTok | YouTube | Universal>",
    "viralityScore": <1-10>,
    "why": "<one sentence why this works>"
  }
]
Write each hook in ${persona.name}'s natural voice.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt, config: { maxOutputTokens: 1500, temperature: 0.85 } });
    const raw = (response.text || '[]').trim().replace(/```json\n?|```/g, '');
    return res.json(JSON.parse(raw));
  } catch (err) {
    console.error('[viral-hooks]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// 4. A/B Caption Tester
app.post('/api/ab-test-captions', async (req, res) => {
  const { persona, captionA, captionB } = req.body;
  if (!persona || !captionA || !captionB) return res.status(400).json({ error: 'persona, captionA, captionB required' });
  try {
    const ai = getGeminiClient();
    const prompt = `Social media strategist for ${persona.name} (${persona.niche}, ${persona.platform || 'Instagram'}).
Compare these two captions:
Caption A: "${captionA}"
Caption B: "${captionB}"

Return ONLY valid JSON:
{
  "winner": "<A | B | Tie>",
  "confidence": <0-100>,
  "winnerReason": "<2 sentence explanation>",
  "scoreA": { "hookStrength": <1-10>, "ctaClarity": <1-10>, "emotionalPull": <1-10>, "platformFit": <1-10>, "overall": <1-10>, "feedback": "<one critique>" },
  "scoreB": { "hookStrength": <1-10>, "ctaClarity": <1-10>, "emotionalPull": <1-10>, "platformFit": <1-10>, "overall": <1-10>, "feedback": "<one critique>" },
  "hybridCaption": "<best hybrid combining both strengths in persona voice>",
  "hybridReason": "<one sentence on what was taken from each>"
}`;
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt, config: { maxOutputTokens: 900, temperature: 0.4 } });
    const raw = (response.text || '{}').trim().replace(/```json\n?|```/g, '');
    return res.json(JSON.parse(raw));
  } catch (err) {
    console.error('[ab-test-captions]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// 5. Cross-Platform Content Adapter
app.post('/api/adapt-content', async (req, res) => {
  const { persona, content } = req.body;
  if (!persona || !content) return res.status(400).json({ error: 'persona and content required' });
  try {
    const ai = getGeminiClient();
    const truncated = typeof content === 'string' ? content.slice(0, 2000) : String(content).slice(0, 2000);
    const prompt = `Cross-platform content strategist. Persona: ${persona.name} | Niche: ${persona.niche} | Tone: ${persona.tone}
Original content: "${truncated}"

Adapt for all platforms in ${persona.name}'s authentic voice. Return ONLY valid JSON:
{
  "instagram": { "caption": "<full caption with emojis 150-300 chars>", "hashtags": ["<tag1>","<tag2>","<tag3>","<tag4>","<tag5>","<tag6>","<tag7>","<tag8>","<tag9>","<tag10>"], "format": "<Carousel | Reel | Single Post | Story>", "tip": "<one platform tip>" },
  "tiktok": { "hook": "<opening 3-second line>", "script": "<30-60 second TikTok script>", "soundSuggestion": "<audio vibe suggestion>", "tip": "<one TikTok tip>" },
  "youtube": { "title": "<SEO title>", "description": "<first 200 chars>", "outline": ["<section1>","<section2>","<section3>","<section4>"], "thumbnail": "<thumbnail concept>" },
  "twitter": { "thread": ["<tweet1>","<tweet2>","<tweet3>","<tweet4>"], "standalone": "<single tweet under 280 chars>" },
  "linkedin": { "post": "<professional reframe 200-300 chars>", "angle": "<professional angle used>" }
}`;
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt, config: { maxOutputTokens: 2000, temperature: 0.7 } });
    const raw = (response.text || '{}').trim().replace(/```json\n?|```/g, '');
    return res.json(JSON.parse(raw));
  } catch (err) {
    console.error('[adapt-content]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// 6. Persona Collab Engine
app.post('/api/persona-collab', async (req, res) => {
  const { personaA, personaB } = req.body;
  if (!personaA || !personaB) return res.status(400).json({ error: 'personaA and personaB required' });
  try {
    const ai = getGeminiClient();
    const prompt = `Creative director for influencer collaborations.
Persona A: ${personaA.name} | Niche: ${personaA.niche} | Tone: ${personaA.tone} | Platform: ${personaA.platform || 'Instagram'}
Persona B: ${personaB.name} | Niche: ${personaB.niche} | Tone: ${personaB.tone} | Platform: ${personaB.platform || 'Instagram'}

Generate a creative collab concept. Return ONLY valid JSON:
{
  "chemistryScore": <0-100>,
  "chemistryLabel": "<Iconic Duo | Natural Fit | Unexpected Hit | Risky But Interesting>",
  "chemistryExplain": "<2 sentences>",
  "collabConcept": "<creative concept title>",
  "conceptDescription": "<3 sentence description>",
  "contentFormats": ["<format1>", "<format2>", "<format3>"],
  "jointCaption": "<120-word caption blending both voices>",
  "visualPrompt": "<detailed image generation prompt blending both aesthetics>",
  "hashtags": ["<tag1>","<tag2>","<tag3>","<tag4>","<tag5>","<tag6>","<tag7>","<tag8>"],
  "estimatedReach": "<e.g. +40% combined reach>"
}`;
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt, config: { maxOutputTokens: 1200, temperature: 0.75 } });
    const raw = (response.text || '{}').trim().replace(/```json\n?|```/g, '');
    return res.json(JSON.parse(raw));
  } catch (err) {
    console.error('[persona-collab]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// 7. Audience Avatar Profiler
app.post('/api/audience-profile', async (req, res) => {
  const { persona } = req.body;
  if (!persona) return res.status(400).json({ error: 'persona required' });
  try {
    const ai = getGeminiClient();
    const prompt = `Consumer psychologist and audience researcher.
Influencer: ${persona.name} | Niche: ${persona.niche} | Platform: ${persona.platform || 'Instagram'} | Tone: ${persona.tone}
Bio: ${persona.bio || ''} | Visual Style: ${persona.visualStyle || ''} | Audience: ${persona.audienceType || 'General'}

Create a deep audience profile. Return ONLY valid JSON:
{
  "overview": { "ageRange": "<primary age range>", "topGender": "<gender breakdown>", "psychographic": "<2 sentence description>", "primaryDesire": "<what they want most>" },
  "avatars": [
    { "name": "<fictional name>", "age": <number>, "occupation": "<job>", "location": "<city, country>", "personality": "<3 trait words>", "desires": "<life desires>", "painPoints": "<biggest frustration>", "whyTheyFollow": "<specific reason>", "scrollStoppers": "<what content stops them>", "dreamContent": "<dream piece of content>" }
  ],
  "contentInsights": { "bestPostingTimes": ["<time1>","<time2>","<time3>"], "topContentAngles": ["<angle1>","<angle2>","<angle3>","<angle4>","<angle5>"], "avoidAngles": ["<avoid1>","<avoid2>","<avoid3>"], "emotionalTriggers": ["<trigger1>","<trigger2>","<trigger3>","<trigger4>"] }
}
Create 3 distinct avatar objects covering different follower segments.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt, config: { maxOutputTokens: 1500, temperature: 0.65 } });
    const raw = (response.text || '{}').trim().replace(/```json\n?|```/g, '');
    return res.json(JSON.parse(raw));
  } catch (err) {
    console.error('[audience-profile]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// 8. Content Repurpose Studio
app.post('/api/repurpose-content', async (req, res) => {
  const { persona, content } = req.body;
  if (!persona || !content) return res.status(400).json({ error: 'persona and content required' });
  try {
    const ai = getGeminiClient();
    const truncated = typeof content === 'string' ? content.slice(0, 3000) : String(content).slice(0, 3000);
    const prompt = `Content repurposing expert. Persona: ${persona.name} | Niche: ${persona.niche} | Tone: ${persona.tone}
Transform this content into short-form formats in ${persona.name}'s voice:
"${truncated}"

Return ONLY valid JSON:
{
  "carouselSlides": [
    { "slideNumber": 1, "headline": "<bold short header>", "body": "<2-3 sentences>" },
    { "slideNumber": 2, "headline": "<bold short header>", "body": "<2-3 sentences>" },
    { "slideNumber": 3, "headline": "<bold short header>", "body": "<2-3 sentences>" },
    { "slideNumber": 4, "headline": "<bold short header>", "body": "<2-3 sentences>" },
    { "slideNumber": 5, "headline": "<bold short header>", "body": "<2-3 sentences>" }
  ],
  "tiktokHooks": ["<hook1>", "<hook2>", "<hook3>"],
  "tweetIdeas": ["<tweet1>","<tweet2>","<tweet3>","<tweet4>","<tweet5>","<tweet6>","<tweet7>","<tweet8>"],
  "youtubeshort": { "title": "<title>", "script": "<45-second script>" },
  "emailSnippet": { "subject": "<subject>", "preview": "<90-char preview>", "body": "<150-word body>" },
  "instagramReel": { "hook": "<first 3-second line>", "script": "<30-second script>" },
  "keyTakeaways": ["<takeaway1>","<takeaway2>","<takeaway3>","<takeaway4>","<takeaway5>"]
}`;
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt, config: { maxOutputTokens: 2000, temperature: 0.7 } });
    const raw = (response.text || '{}').trim().replace(/```json\n?|```/g, '');
    return res.json(JSON.parse(raw));
  } catch (err) {
    console.error('[repurpose-content]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// 9. Dream Collab Picker
app.post('/api/dream-collab', async (req, res) => {
  const { persona } = req.body;
  if (!persona) return res.status(400).json({ error: 'persona required' });
  try {
    const ai = getGeminiClient();
    const prompt = `Talent manager at a top influencer agency.
Client: ${persona.name} | Niche: ${persona.niche} | Platform: ${persona.platform || 'Instagram'} | Tone: ${persona.tone}
Bio: ${persona.bio || ''}

Suggest 5 ideal real celebrity/creator collabs. Return ONLY valid JSON array:
[
  {
    "name": "<real celebrity/creator name>",
    "category": "<Mega Celebrity | Top Creator | Brand Founder | Artist | Athlete>",
    "synergy": "<2 sentence brand synergy>",
    "collabConcept": "<specific creative collab idea>",
    "contentFormat": "<Joint Reel | Podcast Guest | Challenge | Product Collab | Live Stream | Tutorial>",
    "dmPitch": "<80-word authentic DM pitch in ${persona.name}'s voice>",
    "estimatedImpact": "<predicted reach impact e.g. 2-5x reach boost>"
  }
]`;
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt, config: { maxOutputTokens: 1200, temperature: 0.75 } });
    const raw = (response.text || '[]').trim().replace(/```json\n?|```/g, '');
    return res.json(JSON.parse(raw));
  } catch (err) {
    console.error('[dream-collab]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

// 10. Comment Intelligence Dashboard
app.post('/api/analyze-comments', async (req, res) => {
  const { persona, comments } = req.body;
  if (!persona || !comments) return res.status(400).json({ error: 'persona and comments required' });
  try {
    const ai = getGeminiClient();
    const commentsText = Array.isArray(comments) ? comments.join('\n') : String(comments);
    const truncated = commentsText.slice(0, 4000);
    const prompt = `Social media analyst specializing in comment intelligence.
Influencer: ${persona.name} | Niche: ${persona.niche} | Platform: ${persona.platform || 'Instagram'}

Analyze these comments:
${truncated}

Return ONLY valid JSON:
{
  "totalAnalyzed": <number of comments detected>,
  "sentiment": { "love": <percent>, "hype": <percent>, "question": <percent>, "criticism": <percent>, "troll": <percent>, "spam": <percent> },
  "overallSentimentScore": <0-100>,
  "topComments": [
    { "comment": "<exact comment>", "category": "<category>", "why": "<why priority>", "reply": "<AI reply in persona voice>" },
    { "comment": "<exact comment>", "category": "<category>", "why": "<why priority>", "reply": "<AI reply in persona voice>" },
    { "comment": "<exact comment>", "category": "<category>", "why": "<why priority>", "reply": "<AI reply in persona voice>" }
  ],
  "categoryReplies": { "love": "<template reply>", "hype": "<template reply>", "question": "<template reply>", "criticism": "<template reply>" },
  "contentIdeas": ["<idea1>","<idea2>","<idea3>","<idea4>"],
  "insights": ["<insight1>","<insight2>","<insight3>"],
  "warning": null
}
sentiment percentages must add to 100.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt, config: { maxOutputTokens: 1500, temperature: 0.4 } });
    const raw = (response.text || '{}').trim().replace(/```json\n?|```/g, '');
    return res.json(JSON.parse(raw));
  } catch (err) {
    console.error('[analyze-comments]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});
