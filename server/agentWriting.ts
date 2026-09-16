export function writingInstructions(prompt:string) {
 if(!/\b(write|draft|script|hook|outline|article|newsletter|caption|brief|revise)\b/i.test(prompt))return '';
 return `WRITING WORKFLOW: Follow the requested format, length and stage (hook, outline, draft or revision). Use the selected persona's authored tone and examples; keep their distinctive phrasing. Respect the user's chosen version. Ground factual claims in supplied or retrieved evidence; label invented examples and never invent quotes, statistics, testimonials or current trends. For research-backed drafts, connect each important factual claim to a retrieved URL and state evidence gaps. Offer distinct hooks only when alternatives are requested. Revise the requested section without silently rewriting the whole work. Drafts and proposed scenes are not memories or executed actions.`;
}
export function verifyResearchLinks(text:string,sources:Array<{url:string}>) {
 const known=new Set(sources.map(s=>s.url));
 const urls=[...text.matchAll(/https?:\/\/[^\s<>\])]+/g)].map(m=>m[0].replace(/[.,;]+$/,''));
 const unverified=[...new Set(urls.filter(url=>!known.has(url)))];
 return {status:!sources.length?'no-retrieved-sources':unverified.length?'unverified-links':'links-match-retrieval',unverifiedLinkCount:unverified.length,claimSupport:'not-evaluated'};
}

export function campaignIdeaInstructions(prompt:string) {
 if(!/\b(campaign|marketing|promot(?:e|ion)|grow(?:th)?|audience|brand)\b/i.test(prompt) || !/\b(ideas?|brainstorm|concepts?|options?|strateg(?:y|ies))\b/i.test(prompt))return '';
 return `CAMPAIGN IDEATION: Use the saved project brief and selected creator persona. Tailor to audience, platform, objective, budget, production time and boundaries; ask only for material missing details. Unless the user specifies a count, offer three genuinely different mechanisms (for example a repeatable educational series, community participation, and a creator collaboration), not three renamed versions of one post. For each give the premise, sample hook, why it fits, first two steps, production effort, budget assumption, measurable success criterion and tradeoff. Separate hypotheses from evidence; never promise reach or fabricated current trends. Adapt to this creator studio rather than assuming SaaS growth. Ideas alone stay in text with campaign:null and no suggestedSteps. When the user selects a concept and requests a production plan, reuse the existing campaign/asset workflow and approval gate.`;
}
