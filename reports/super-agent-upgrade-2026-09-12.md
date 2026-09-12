# Super Agent upgrade: capabilities, provider audit and delivery boundaries

## Product target

A conversational creative workspace: retain the brief, propose an editable plan, execute approved work, carry results into subsequent steps, show evidence and failures, and revise without repeating successful paid work.

This follows the useful interaction patterns described by [Higgsfield Supercomputer](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-supercomputer) and [Venice Agentic Chat](https://venice.ai/blog/agentic-chat-is-now-live-on-venice). These are vendor descriptions, not independently tested comparisons. This release does not establish feature or quality parity with either product.

## Implemented in this upgrade

- Conversation restoration through the existing account-scoped workspace storage, retaining up to 100 messages. Interrupted work does not auto-restart on refresh.
- An editable saved Project brief under Agent setup, supplied as context in later turns.
- Plans wait for explicit approval in Review required mode. The alternative is accurately labeled Run automatically, not Auto-publish.
- Editable image/script instructions in the task plan; stop before the next step; retries skip already successful steps.
- Removed the keyword shortcut that launched image jobs from ordinary phrases such as “do not create assets.”
- Image generation carries the scene into the conversational prompt path. Object/no-people scenes omit persona references; persona scenes use the existing participant-aware media service and its fidelity checks.
- Selected-persona resolution replaces first-persona selection. Generating an asset no longer replaces the saved avatar or reference image.
- Research uses Gemini Search/URL context, and the UI displays links from returned grounding metadata. Missing evidence is reported instead of replaced with canned “live trends.”
- Relevant PDF, text and image attachments can be inspected by Gemini before the selected reasoning route receives the request, with an explicit unavailable/size-limit path.
- Actual returned model names appear in response metadata where provided, including Gemini fallback responses. Grok no longer requests the obsolete Grok 2 endpoint.
- Missing image, speech, 3D and voice-clone outputs no longer count as success; stitching failure stops the run. Audio and 3D outputs use appropriate controls.

## Existing provider inventory

Credentials were read only inside local scripts and sent only to their corresponding provider endpoints. Keys are not included in this report. The inventory below uses the configured local workspace environment, not a claim that every production variable is identical.

| Provider/service | Observed check | How it can help |
|---|---|---|
| Gemini | Model catalog HTTP 200; actual grounded IANA-page query passed with source URL | Grounded research, URL reading, file/image analysis, reasoning and speech |
| xAI | Model catalog HTTP 200; Grok 4.6 answered the arithmetic probe correctly | Current reasoning/chat; documented web/X search is a further integration opportunity |
| Venice | Model catalog HTTP 200, 119 returned entries | Alternative reasoning and conversational models; current app already has its routing adapter |
| Atlas | Model catalog HTTP 200, 118 returned entries | Alternative hosted reasoning/vision routes; availability and prices need per-model validation |
| WaveSpeed | LLM catalog endpoint HTTP 200; current generic probe did not parse the model list | Existing image/video/3D services and LLM routes; original audit exercised live routes |
| fal.ai | Discovery passed: 40 raw entries; 31 adapter-compatible entries; 9 pending adapters | Image generation/editing and video models, including product/fashion/graphics workflows |
| Runware | Discovery passed: 60 raw/compatible entries in the sampled searches | Fast drafts, reference-aware images and specialized editing |
| Wiro | Discovery passed: 30 raw entries; 44 normalized compatible variants; 8 pending adapters | Typography, image editing and specialized video/creative models |
| ElevenLabs | Voice listing HTTP 200 | Narration and existing voice services; this audit did not generate or clone audio |
| Cartesia | Voice listing HTTP 200 | Low-latency voice integration candidate; voice quality was not tested |
| HeyGen | Voice listing HTTP 200 | Talking avatars and voice/avatar workflows; generation not tested in this pass |
| Direct OpenAI | Local configured key returned HTTP 401 on model listing | Requires credential correction before treating direct access as available; partner-hosted models are separate |
| Supabase/database configuration | Present; not a model service | Existing account-scoped workspace storage and durable task/media records |

The inspected local file also contains configuration for authentication/session handling and deployment, which does not add creative capabilities. No additional search-provider credential was found there. Source references alone were not counted as configured services.

Catalog counts are sampled, can contain variants, and are not the full size of each provider. “Compatible” means the existing adapter recognizes the schema, not that every generation passed. Several catalog prices are defaults/placeholders and must not be used as evidence of cheapest pricing.

## Model findings

The Grok 4.20 non-reasoning probe returned $34 instead of $36. Grok 4.6 returned $36 correctly on the same small problem. This establishes availability and a narrow correctness observation, not a general model ranking. The new default for the explicit Grok option is configurable using `XAI_SUPER_AGENT_MODEL`, with Grok 4.6 as the fallback default.

Keep Adaptive Fast for routine writing/planning based on the earlier audit. Use a stronger route for complex work, but require observable task outcomes rather than trusting a model label. Do not equate a provider subscription, catalog entry, or Adult mode switch with verified output quality.

## Validation completed before release

- 24 targeted automated tests passed, including new approval, restoration, optional identity, missing-output and research-source cases.
- Type checking and production frontend build passed during development; final release checks are recorded in the delivery message.
- Browser fixture: new plan waited for approval; its edited prompt and conversation survived refresh; simulated provider failure displayed Needs attention and preserved the failed instructions.
- Live provider probe: Gemini retrieved the IANA example-domains explanation with a usable source URL.
- Live provider probe: Grok 4.6 answered the budget example correctly.
- Catalog checks above were read-only. Most media endpoints were not exhaustively generated against.

## What remains before comparable breadth

1. **Durable task orchestration:** run server-side jobs independently of a browser tab, with per-step idempotency, dependency graphs, cancellation and exact resume. The current browser runner can stop between steps, but closing a tab is not a robust background execution system.
2. **Named projects and searchable memory:** multiple task histories, editable extracted memories, reference collections and retrieval beyond the recent conversation. The saved brief is a practical foundation, not a semantic memory engine.
3. **Costed execution:** reliable provider-specific quotes before approval, budget caps and same-model failover backed by real pricing. No invented cost estimates.
4. **Connected apps:** account-authorized publishing, files and external integrations with per-action permissions. Existing provider keys do not automatically grant access to social accounts or email.
5. **Finished deliverables:** thoroughly verified image → video → narration → assembly flows, quality checks, variations and downloadable packages. Video/audio/3D availability alone is not end-to-end certification.
6. **Broader evaluations:** repeated, isolated tests for planning, research correctness, voice responsiveness, tool selection, identity fidelity and recovery under failures. Compare costs and latency with actual provider attribution.

Relevant provider documentation: [Gemini grounded search](https://ai.google.dev/gemini-api/docs/google-search), [Gemini URL context](https://ai.google.dev/gemini-api/docs/url-context), [xAI web search](https://docs.x.ai/developers/tools/web-search), [Cartesia voice API](https://docs.cartesia.ai/api-reference/voices/list).
