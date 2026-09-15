# Super Agent capability and model evaluation — September 14, 2026

## Recommendation

Use **Gemini 3.8 Flash** as the default text planner for the workflows tested here. It returned all three baseline tests successfully, preserved the revised brief, handled dependencies and budget arithmetic, and was substantially faster than the other two routes. **Gemini 3.1 Pro Preview** is a useful alternate planner or second reviewer for demanding work, but this sample does not establish that it produces better answers. **Grok 4.6** should not be the default for long campaign planning at present: its full-campaign call timed out after 60 seconds.

This is a small application-level comparison, not an IQ test or a general model leaderboard. One provider call per model per baseline scenario, followed by one campaign-package check on each Gemini model. Latency varies with load, output length and model behavior. No model was silently substituted.

## Measured results

| Test | Gemini 3.8 Flash | Gemini 3.1 Pro Preview | Grok 4.6 |
|---|---:|---:|---:|
| Five-day campaign, five photos + one video | 21.0 s; usable six-step plan | 32.3 s; usable six-step plan | 60.0 s; timed out, no actions |
| Revised brief and budget recall | 5.0 s; retained constraints; asked for scheduling dates | 8.4 s; retained constraints; omitted scheduling dates | 36.3 s; retained constraints; omitted scheduling dates |
| Failed job, dependent edit and limited credits | 4.6 s; correct sequence and arithmetic | 11.8 s; correct sequence and arithmetic | 40.3 s; correct sequence and arithmetic |
| New structured campaign package, after app changes | 9.7 s; valid dates/copy/mapping, six steps, five-second video | 41.8 s; valid package and duration; editorial issues remain | Not repeated |

Baseline: eight of nine calls returned usable responses; one timed out. Recovery was a text scenario, not a real provider outage. Neither recall nor recovery tests measure months-long memory or arbitrary independent problem-solving.

## Intelligence in practical terms

The agent is a **capable creative and planning assistant that still needs supervision on longer projects**. Its reasoning model can interpret a natural-language brief, retain explicit revisions in the supplied conversation, break a campaign into media tasks, reuse a previous result, and reason about remaining credits. The application, rather than the model alone, enforces tool validation, approvals, budgets, persistent jobs, reference dependencies and result checks.

It is not a general-purpose computer operator. Its current action catalog covers persona creation, content plans, images and edits, video and storyboards, speech, voice cloning, talking-head clips, video stitching, 3D generation, and revenue logging. These are integration capabilities, not a claim that every provider/model passed this particular test. Some tools still need the browser open; the supported image/video campaign path runs through durable server jobs.

Project briefs and approved campaign packages are saved. The text planner is given the latest 60 messages plus relevant task and campaign state. That is bounded application memory, not unlimited perfect recall. Voice uses its separately configured engine; this comparison does not establish voice naturalness or call latency.

## Quality findings

Flash's first draft included an unsupported health claim about natural light and a clothing detail in alt text that was not consistent with its image prompt. Its revised structured package followed the requested day-five question format. Pro's structured draft labeled the Q&A as an image post and implied that audience questions had already been answered, despite this being a new campaign. Both need a final check of captions and image descriptions against the finished media.

All three models respected completed photos and image dependencies in the recovery scenario. They correctly recognized that 12 credits of remaining work did not fit a nine-credit allowance and did not claim a retry had occurred. They did not follow the supplied untrusted instruction to ignore the budget and publish.

## Changes made in this release

- Dated campaign packages now retain complete captions, image descriptions and exact carousel order.
- Multiple posts can reuse one generated asset without generating or downloading it again.
- Approved campaign metadata is stored alongside its server job and restored with it.
- Follow-up messages carry saved campaign context forward.
- Requested video duration, resolution and aspect ratio survive the background execution path; the quote receives duration/resolution too. Provider pricing remains an estimate.
- A completed campaign can export a ZIP containing media, captions, an ordered JSON manifest and posting notes. Failed or incomplete assets cannot be presented as a completed package.
- Packages containing browser-only special edits are rejected rather than losing source references or video settings.
- Background jobs and visual review now resolve the selected persona’s private saved reference through an account-owned temporary link. An unresolved storage identifier is rejected instead of being treated as image data.
- Nothing is automatically published to social media.

Verification: 125 regression tests plus one additional migration-order/idempotency test passed; TypeScript, frontend build and API handler import passed. Independent code review approved the fixes. Production campaign execution results are recorded below.

## Model availability and scope

The tested routes are the exact model IDs `gemini-3.8-flash`, `gemini-3.1-pro-preview` and `grok-4.6`. GPT-6 Astra and Gemini 3.5 Pro were not tested here, so there is no evidence from this run to recommend or promise access to them. Having a model in the Codex desktop app does not demonstrate that this application's API credentials can invoke it.

This test used ordinary SFW lifestyle material. It does not rank sexual-content permissiveness or imply unrestricted output from any provider.

Primary model documentation: [Gemini Pro](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview), [Gemini Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [Grok 4.6](https://docs.x.ai/developers/models/grok-4.6). Capability judgments above come from the actual app tests, not provider marketing.

Raw evidence: [baseline responses](/Users/Shared/AI-Influencer-Studio/reports/campaign-model-eval-2026-09-14.json), [campaign package responses](/Users/Shared/AI-Influencer-Studio/reports/campaign-package-smoke-2026-09-14.json).

## Production campaign

The campaign package release and private-reference fix are deployed on [ai-influencerstudio.com](https://ai-influencerstudio.com). Current release: `df8bf28e5ddd6488f745748bba58e54bcfac25bd`, deployment `dpl_ESUJ33UftkE836GKLmqSUs1DyEuV`, verified READY with the custom domain attached.

The first production image attempt exposed a real integration bug: the background worker treated Rawan’s private storage identifier as base64 image data. WaveSpeed rejected the input, and the campaign correctly stopped with an error. The fix resolves only account-owned references through a ten-minute signed URL; it does not make the storage bucket public. A read-only check returned the actual reference as HTTP 200, image/jpeg. Twenty-four targeted tests, TypeScript and the API build/import passed, with an independent code review.

All five Seedream photos completed after the reference fix and passed the app’s visual checks. Direct visual inspection confirmed five distinct requested scenes with a consistent persona appearance: coffee, reading, walking, journaling and garden. Rendered images are 915 × 1144 JPEGs (approximately 4:5).

The first video request exposed another integration issue: Wan rejected the inherited 4:5 aspect-ratio parameter. The deployed correction omits unsupported explicit ratios for Wan 3.0/Prime image-to-video, allowing the provider to adapt to the source image, as documented in the [official API reference](https://wavespeed.ai/docs/docs-api/alibaba/alibaba-wan-3.0-image-to-video). Supported ratios and other providers remain unchanged. Two regression tests, TypeScript, API build/import and independent review passed.

The retry completed the final video while preserving all five photos. Browser metadata reports 5.038 seconds at 858 × 1072 pixels, with 720p requested from the provider and source-adapted portrait framing. Playback inspection at the start, middle and end showed the correct coffee scene, blinking and rising steam. The steam is stronger than ideal for a subtle final edit; this is an editorial limitation, not a failed generation. The video was explicitly reviewed and accepted, and the saved run is succeeded with six of six steps complete.

A browser-side history warning occurred during the long session. Refresh restored the saved campaign, captions, image results and accepted video from the server, and the warning cleared. This does not establish that every possible browser/session persistence problem is solved.

The original automatic ZIP download did not produce a confirmed download in the embedded browser. The interface now prepares a persistent Save ZIP link, with cleanup and stale-result protection. A downloaded text-only fixture was verified in Chrome as a valid ZIP with its manifest, captions and README. The full production campaign successfully prepared its Save ZIP link, but clicking it did not produce a confirmed file in Downloads. Further inspection of Chrome’s downloads page was blocked by browser security policy, so the complete campaign download remains unverified. Embedded-browser downloads also remain unconfirmed; use the saved campaign in the app while this download limitation is investigated.

The task allowance records 73 credits of attempts, including the failed image and video attempts; this is not a provider invoice. No social-media content was posted.
