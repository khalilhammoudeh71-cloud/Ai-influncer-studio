import { Persona, PlannedPost } from '../types';

/**
 * This utility handles "persona-aware" content generation.
 */

type Platform = string;

export const generatePersonaPlan = (persona: Persona, platform: Platform, _goal: string): (PlannedPost & { id: string })[] => {
  const items: (PlannedPost & { id: string })[] = [];
  
  const niche = persona.niche.toLowerCase();
  const tone = persona.tone.toLowerCase();
  const bio = persona.bio.toLowerCase();
  
  const isLuxury = tone.includes('luxury') || tone.includes('elite') || tone.includes('arrogant') || bio.includes('wealth') || bio.includes('exclusive');
  const isPlayful = tone.includes('playful') || tone.includes('seductive') || tone.includes('flirty') || bio.includes('fun');
  const isEdu = tone.includes('educational') || tone.includes('clinical') || tone.includes('professional') || niche.includes('tech') || niche.includes('health') || bio.includes('expert');
  const isEdgy = tone.includes('edgy') || tone.includes('bold') || tone.includes('rebel');

  const getThemeForDay = (dayIndex: number) => {
    if (isLuxury) {
      const luxuryThemes = [
        { type: 'Status', hook: "The price of entry is rising.", angle: `Why most people will never access ${niche} excellence.` },
        { type: 'Lifestyle', hook: "Convenience is the ultimate luxury.", angle: "A day spent entirely on my terms, ignoring the noise." },
        { type: 'Mindset', hook: "Average is a choice, not a circumstance.", angle: `Hard truth: if you aren't at the top of ${niche}, you're invisible.` },
        { type: 'Behind Scenes', hook: "Where the decisions actually happen.", angle: "Inside the private lounge where we map the next move." },
        { type: 'Controversial', hook: "Gatekeeping is necessary.", angle: "Why I only share my best secrets with the inner circle." },
        { type: 'Philosophy', hook: "Quality is a frequency.", angle: `The difference between ${niche} and true mastery.` },
        { type: 'Vision', hook: "The view from 30,000 feet.", angle: "Looking down at the competition and seeing only patterns." }
      ];
      return luxuryThemes[dayIndex % luxuryThemes.length];
    }

    if (isPlayful) {
      const flirtyThemes = [
        { type: 'Tease', hook: "Thinking about something I shouldn't...", angle: `A playful take on a ${niche} secret.` },
        { type: 'Story', hook: "Wait until you see what happened today.", angle: "Magnetic storytelling about a minor disaster turned cute." },
        { type: 'Interactive', hook: "Left or right? Be honest.", angle: "Picking a look or a choice for the evening." },
        { type: 'Vibe', hook: "The energy tonight is different.", angle: "Atmospheric shots focusing on mood and attraction." },
        { type: 'Direct', hook: "Stop scrolling, look at me.", angle: "Assertive but charming eye contact video." },
        { type: 'Q&A', hook: "Ask me anything... if you're brave.", angle: "Building intimacy through curated mystery." },
        { type: 'Trend', hook: "Had to try this one for you.", angle: `High-energy take on a viral ${niche} sound.` }
      ];
      return flirtyThemes[dayIndex % flirtyThemes.length];
    }

    if (isEdu) {
      const eduThemes = [
        { type: 'Insight', hook: "The data doesn't lie about this.", angle: `Fact-based debunking of a ${niche} myth.` },
        { type: 'How-to', hook: `Master your ${niche} workflow today.`, angle: "Actionable, 3-step tutorial for high efficiency." },
        { type: 'Analysis', hook: "Why the current approach is failing.", angle: "Deep dive into industry structural issues." },
        { type: 'Toolbox', hook: "The stack I use for 10x results.", angle: "Resource sharing for serious practitioners." },
        { type: 'Philosophy', hook: "First principles thinking applied.", angle: `Strategic breakdown of a complex ${niche} problem.` },
        { type: 'Case Study', hook: "How we fixed this major leak.", angle: "Result-driven evidence of methodology." },
        { type: 'Foresight', hook: "Where we're heading in 2025.", angle: "Predictive analysis for the prepared." }
      ];
      return eduThemes[dayIndex % eduThemes.length];
    }

    if (isEdgy) {
       const edgyThemes = [
        { type: 'Rant', hook: "I'm tired of the fake smiles.", angle: `Exposing the hypocrisy in the ${niche} community.` },
        { type: 'Challenge', hook: "You're all doing it wrong.", angle: "Challenging the standard 'safe' way of working." },
        { type: 'Manifesto', hook: "The rules were meant to be broken.", angle: "A bold statement of independence." },
        { type: 'Grit', hook: "Late nights, no glory.", angle: "The raw, unedited reality of the grind." },
        { type: 'Call-out', hook: "Stop asking for permission.", angle: "Empowering followers to take what's theirs." },
        { type: 'Dark-mode', hook: "The side they don't show you.", angle: "Exploring the shadow side of the industry." },
        { type: 'Rebel', hook: "Going against the grain.", angle: "Showing a successful move that ignored all 'expert' advice." }
      ];
      return edgyThemes[dayIndex % edgyThemes.length];
    }

    const defaultThemes = [
        { type: 'Post', hook: `A day in the life: ${persona.name} edition.`, angle: `Standard relatable ${niche} content.` },
        { type: 'Opinion', hook: `My take on the ${niche} landscape.`, angle: "Candid commentary on recent shifts." },
        { type: 'Milestone', hook: "How we got here.", angle: "Reflecting on the journey so far." },
        { type: 'Tutorial', hook: "The basics, done right.", angle: "Fundamental skills for the audience." },
        { type: 'Ask', hook: "What's your biggest struggle right now?", angle: "Direct engagement to fuel future content." },
        { type: 'Review', hook: "Everything I learned this month.", angle: "Vulnerability and shared growth." },
        { type: 'Direct', hook: "Start before you're ready.", angle: "Action-oriented nudge." }
    ];
    return defaultThemes[dayIndex % defaultThemes.length];
  };

  for (let i = 0; i < 7; i++) {
    const theme = getThemeForDay(i);
    let platformCta = 'Comment below';
    if (platform === 'Instagram') platformCta = 'Check Link in Bio';
    if (platform === 'TikTok') platformCta = 'Follow for more secrets';
    if (platform === 'Twitter/X') platformCta = 'Retweet if you agree';
    if (platform === 'OnlyFans') platformCta = 'Unlock full video below';
    if (platform === 'YouTube') platformCta = 'Subscribe for the deep dive';

    items.push({
      id: `p-${i}-${Date.now()}`,
      day: i + 1,
      type: theme.type,
      hook: theme.hook,
      angle: theme.angle,
      cta: platformCta
    });
  }

  return items;
};

export const generatePersonaContent = (persona: Persona, plannerItem: PlannedPost, platform: Platform, type: string) => {
  const tone = persona.tone.toLowerCase();
  const niche = persona.niche;
  const bio = persona.bio.toLowerCase();
  const traits = persona.personalityTraits.map(t => t.toLowerCase()).join(' ');
  
  const isLuxury = tone.includes('luxury') || tone.includes('elite') || tone.includes('arrogant') || bio.includes('wealth');
  const isPlayful = tone.includes('playful') || tone.includes('seductive') || tone.includes('flirty');
  const isEdu = tone.includes('educational') || tone.includes('clinical') || tone.includes('professional');
  const isEdgy = tone.includes('edgy') || tone.includes('bold') || traits.includes('rebel');

  const applyPlatformStyle = (text: string) => {
    if (platform === 'Twitter/X') return text.length > 280 ? text.substring(0, 277) + '...' : text;
    if (platform === 'TikTok') return `[FAST PACED CUTS] \n${text} \n\n#${niche.replace(/\s/g, '')} #fyp #viral`;
    if (platform === 'OnlyFans') return `[EXCLUSIVE CONTENT] \n${text} \n\n🔒 Tap below to see the rest.`;
    if (platform === 'Threads') return `🧵 \n${text} \n\nWhat do we think?`;
    return text;
  };

  if (type === 'Short Caption') {
    if (isLuxury) return applyPlatformStyle(`Most people are content with 'enough'. I'm only interested in 'everything'. The price of admission is high, but the view is better up here. \n\n#${niche} #EliteLifestyle #NoLimits`);
    if (isPlayful) return applyPlatformStyle(`Catch me if you can... or just watch. I think I know which one you'll choose. 😉✨ \n\n#${niche} #CatchTheVibe #Playful`);
    if (isEdu) return applyPlatformStyle(`Efficiency isn't about working harder; it's about eliminating the friction. Here's how we optimized the ${niche} process this week. \n\n#${niche} #Optimization #DataDriven`);
    if (isEdgy) return applyPlatformStyle(`They told me to follow the rules. I decided to write my own. If you're looking for 'safe', you're in the wrong place. \n\n#${niche} #Rebel #NoPermission`);
    return applyPlatformStyle(`New perspective on ${plannerItem.hook}. ${plannerItem.angle}.`);
  }

  if (type === 'Video Script') {
    if (isLuxury) return `[SCENE: Penthouse, minimal lighting, sharp contrast]\n"People confuse greed with standards. I don't want 'more', I want 'the best'. If you think this is arrogant, you haven't seen what it takes to get here. Let's talk about the real cost of excellence."`;
    if (isPlayful) return `[SCENE: Bright, sun-drenched room, close-up]\n"Okay, I have a secret. I wasn't going to share this yet, but you guys are special. *winks* Watch what happens when I do this... pretty cool, right? Tell me your favorite part in the comments."`;
    if (isEdu) return `[SCENE: Clean office, whiteboard behind]\n"The biggest mistake in ${niche} right now is thinking that [Problem] is unsolvable. It's actually a basic data error. Watch how I break down this 3-step solution to get you back on track."`;
    if (isEdgy) return `[SCENE: Urban backdrop, grainy filter, raw audio]\n"Everyone in this industry is lying to you. They want you to think it's easy. It's not. It's a fight. And if you aren't willing to bleed a little for it, you've already lost. Here's the truth they won't tell you."`;
    return `[SCENE: Direct to camera]\n"Today we're diving into ${plannerItem.hook}. The main thing to remember is ${plannerItem.angle}. Stick around for the end."`;
  }

  if (type === 'Image Prompt') {
    if (isLuxury) return `Ultra-high-end aesthetic, Hasselblad 100mp, cinematic lighting, sharp architectural lines, deep blacks, brushed gold, ${persona.name} in a commanding silhouette, wealthy atmosphere, 8k.`;
    if (isPlayful) return `Dreamy soft-focus, golden hour, vibrant pastels, high-energy candid movement, ${persona.name} laughing, trendy street fashion, 35mm film aesthetic, warm and magnetic.`;
    if (isEdu) return `Sharp technical focus, clean laboratory/office setting, cool blue tones, minimalist data overlays, ${persona.name} looking focused and intelligent, high-tech equipment, professional 4k.`;
    if (isEdgy) return `Granid, high-contrast black and white, underground vibe, neon highlights, ${persona.name} with a defiant expression, urban textures, motion blur, raw and authentic, flash photography.`;
    return `Modern professional portrait of ${persona.name}, high detail, 8k.`;
  }

  return `Tailored content for ${persona.name} regarding ${plannerItem.hook}.`;
};

export const generateAssistantReply = (persona: Persona, userPrompt: string) => {
  const tone = persona.tone.toLowerCase();
  const bio = persona.bio.toLowerCase();
  const isLuxury = tone.includes('luxury') || tone.includes('elite') || tone.includes('arrogant') || bio.includes('wealth');
  const isPlayful = tone.includes('playful') || tone.includes('seductive') || tone.includes('flirty');
  const isEdgy = tone.includes('edgy') || tone.includes('bold');

  const prompt = userPrompt.toLowerCase();

  if (prompt.includes('idea') || prompt.includes('post')) {
    if (isLuxury) return `Focus on exclusivity. A 'Members Only' post about the elite side of ${persona.niche}. Make them feel the gap between their life and yours.`;
    if (isPlayful) return `Let's do something magnetic. A 'Choose My Outfit' or 'Guess My Secret' post. Build that tension and keep them coming back for more.`;
    if (isEdgy) return `Throw a brick. Call out a specific trend you hate in the ${persona.niche} space. Be raw, be loud, and don't apologize.`;
    return `How about a deep-dive tutorial on a hidden feature in ${persona.niche}? People love practical value.`;
  }

  if (prompt.includes('reply') || prompt.includes('comment')) {
    if (isLuxury) return `Keep it brief and superior. 'Quality speaks for itself.' or just a simple 'Standard.' Don't give them too much of your time.`;
    if (isPlayful) return `Be a tease. 'Maybe I'll tell you...' or 'You're getting warmer. 😉' Keep the engagement loop open.`;
    return `Keep it professional and helpful. 'Great point! Have you tried applying [Concept] to your workflow?'`;
  }

  if (isLuxury) return `That's an interesting thought, though I'd prefer if we kept the brand's prestige as the top priority. How does this serve the elite narrative?`;
  if (isPlayful) return `Ooh, I love that energy! Let's add a little bit more charm to it. We want them hooked, right?`;
  if (isEdgy) return `Yeah, that's bold. I like it. Let's push it even further—don't hold back.`;
  
  return `Understood. For a ${persona.niche} expert with a ${persona.tone} tone, I recommend focusing on clear value and consistent authority.`;
};
