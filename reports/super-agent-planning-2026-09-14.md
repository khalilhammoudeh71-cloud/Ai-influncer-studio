# Super Agent planning reliability — September 14, 2026

Release: `715d3d5eceb76071e2274c3af66b8245e9c6d316`. Deployed and verified at [AI Influencer Studio](https://ai-influencerstudio.com/). Vercel deployment `dpl_FQ1TWXJpmSc6ZqVqiMEdCG9v3Zss` is READY, with the custom domain attached.

## What changed

- The saved Grok choice uses the same structured planning path as the explicit Grok choice. It has a 60-second response window instead of the old 12-second cutoff, and does not silently switch models on failure.
- Grok and Gemini return a consistent answer with optional proposed task steps. Gemini-compatible structured output is decoded and validated on the server.
- A valid native tool plan is returned immediately, without an unnecessary second model call to summarize it.
- Truncated replies, malformed inputs, and partial plans fail clearly rather than dropping requested steps. Provider failures no longer invent image tasks from words in the request.
- Requests such as “Create a plan. Do not execute yet” preserve the review cards and hold automatic execution. Unfinished descriptions remain held.
- Ordinary JSON examples and data remain readable answers. Custom image edits require actual edit instructions.
- Chat displays actionable provider errors instead of replacing them with a generic failure.

## Verification

115 automated checks passed with zero skipped. Coverage includes the deployed chat handler, provider adapters, multi-step job execution, ownership, credit pricing, media dependencies, approval holds, persistence, and client error handling. TypeScript, frontend production build, API bundle build and API import verification passed. Independent review approved the final change.

Live provider checks used the actual chat route handler with synthetic prompts and no user records. They did not execute media tools. Each of three text-model routes handled a two-step image plan and a text-only budget calculation successfully (six HTTP 200 responses). Budget responses correctly gave $84 spent and $36 remaining, with no actions.

| Text-model route | Two-step planning | Budget answer |
| --- | ---: | ---: |
| Saved Grok / grok-4.6 | 37.5 s | 9.7 s |
| Gemini / gemini-3.8-flash | 10.3 s | 2.9 s |
| Gemini / gemini-3.1-pro-preview | 18.8 s | 7.0 s |

After clarifying generic edit instructions, Gemini Pro was rechecked: 11.2 seconds, two pending steps, Seedream 5.0 Pro selected for both, square framing, no persona references, and the edit correctly linked to the first image.

These are individual smoke-test timings, not a model benchmark or a claim that every model is working. This release improves planning and failure handling; it does not add new models or expand the set of executable tools. Full media execution was verified in the preceding supervision release, not repeated in this planning-only batch.

## Production browser check

In the separate “Planning verification Sep 14” project, selected “Use configured engine” with the existing xAI Grok configuration. Submitted a fresh blue-cup image plus green-cup edit request ending in “Do not execute yet.” The app displayed `XAI · GROK-4.6 · SMART`, a review plan containing both editable instruction cards, and the “Review cost & allowance” button. No media task started. The new plan remains visible for inspection.

## Evidence

- [Six live route results](/Users/Shared/AI-Influencer-Studio/reports/agent-planner-live-smoke-2026-09-14.json)
- [Gemini Pro follow-up](/Users/Shared/AI-Influencer-Studio/reports/agent-planner-pro-recheck-2026-09-14.json)
- Provider schema references: [xAI structured outputs](https://docs.x.ai/developers/model-capabilities/text/structured-outputs) and [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).
