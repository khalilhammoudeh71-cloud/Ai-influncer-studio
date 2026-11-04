# Persona identity and daily model updates

Prepared November 3, 2026. These changes are local until deployed.

## Identity behavior

Saved persona generation requests load the account-owned persona on the server. Images choose up to three approved shot-relevant reference views, retaining a clear-face identity anchor. Legacy personas retain their primary reference until extra views are approved. Requested collaborators use separately named saved references. Models that cannot accept a reference fail explicitly instead of silently dropping it on supported catalog-driven routes. The default remains Seedream 5.0 Pro, with natural skin prompts; no FLUX migration or face-training step was added.

Image Studio, persona-media chat, and the main video/avatar paths require a conclusive visual review before reporting success. Video/avatar review uses Gemini video input sampled at one frame per second against the saved identity references. An unavailable, uncertain, or failed check blocks success. Chat retains its existing single corrective image retry on a confident mismatch. Other failures need user review or retry, rather than unlimited provider spending.

The standalone avatar screen resets its portrait when the persona changes. Main studio video and avatar requests now carry the persona ID through durable jobs. Existing jobs with a stored persona ID also receive server-side identity binding.

This is an enforced reference-and-review workflow, not a mathematical guarantee or a biometric certification. It cannot prove identity in every frame. Video review is limited to 15 MB and trusted provider/storage hosts, with no redirected downloads; unsupported media is withheld rather than labeled verified. Hidden faces can result in an inconclusive review. User-created media without a selected persona remains available.

## Model updates

Internal text, visual analysis, pronunciation analysis, and planning use a central Gemini Flash selection, initially gemini-3.8-flash. Daily discovery selects a candidate from the latest stable numbered general Flash models returned by Google's API. A changed default must pass a bounded multimodal structured-JSON compatibility request before activation; failures retain the previous default. Preview, image, speech and lite variants cannot accidentally become the text/vision default. Gemini 3 thinking levels replace legacy thinking token budgets where used. An explicit STUDIO_GEMINI_FLASH_MODEL override remains available.

Speech uses a separately versioned gemini-3.8-flash-tts adapter (STUDIO_GEMINI_TTS_MODEL override). Its default WAV response is not given a second WAV header. The ElevenLabs hosted-call default uses its SDK-supported gemini-3.8-flash enum. Speech/image/live model families are not blindly replaced with general-purpose Flash.

The existing Vercel daily schedule (14:00 UTC) now also discovers Google, OpenAI, xAI, and ElevenLabs native inventories, alongside existing WaveSpeed, Venice, AtlasCloud, fal, Wiro, and Runware discovery. Metadata scans do not create media. Failed scans retain the previous native inventory and active Flash model. The scan records per-provider health, persists results, and returns a failure status for incomplete configured-provider scans or persistence failures.

Higgsfield, HeyGen, Hume, and Cartesia remain maintained integrations: their new engines/schema changes are not automatically integrated by this patch. Native inventory discovery alone does not make an arbitrary new image/audio model executable. Existing media adapters admit compatible models; others need adapter work. Settings > Models displays the last scan, current analysis model, stale-scan warning, and provider failures.

## Verification and rollout

Production Vercel project and the presence of a production CRON_SECRET were checked read-only. The deployed cron's execution history has not been verified, and the local changes have not been released.

Live local-key metadata checks succeeded for Google (60 models), OpenAI (140) and xAI (13). The local ElevenLabs key returned HTTP 401; production has a separately scoped key, so this does not establish that production ElevenLabs is failing. Gemini 3.8 Flash also completed a real structured-JSON compatibility request.

Do not claim paid image/video/avatar quality has been validated from these checks: those generations still require representative end-to-end acceptance tests before production rollout.

Google reference prompting was also corrected: multiple angles of one persona no longer imply multiple people, and reference photos no longer force identical clothing or a gray studio background over the requested scene.

## Final local verification

- 659 tests passed; six existing tests skipped; no failures.
- TypeScript check passed.
- Production frontend build passed (existing chunk-size warnings remain).
- Serverless API bundle built and imported with a valid handler; verification used a temporary bundle and left the existing generated api/index.mjs unchanged.
- Real Gemini 3.8 Flash multimodal structured-JSON compatibility check passed.
- Real Gemini 3.8 Flash TTS request returned 50,276 bytes of valid WAV-container audio.
- Representative paid persona image, video, avatar renders and production cron execution remain unverified.

## Approved identity sets and automatic reference selection

Added an identity reference set to the Appearance step. Each photo has a view tag (front, three-quarter, profile, full body, expression, other) and an explicit approval. The user approves the primary anchor; approving an extra photo runs the existing visual identity comparison against that anchor. Mismatched and inconclusive photos remain unapproved. Generated photos are never approved automatically. Save requires an approved primary photo when reference photos are present.

Reference selection is deterministic from the requested shot (including common English and Arabic phrasing). Profiles favor approved side views, full-body shots favor approved body views, and avatars favor front faces. Selection keeps a clear-face anchor and is bounded to three photos. Only selected approved files are signed for generation. Browser-supplied copies of unapproved vault photos cannot be reintroduced as extra identity references; separately requested scene/revision inputs remain available.

Approval metadata is stored transactionally with persona saves in the existing account-isolated workspace store under a server-owned identity namespace. No schema migration is needed. Photos removed from the reference vault are excluded from the active set. Metadata is also handled during migration/import and cleaned up on persona deletion. Changing the primary photo clears an obsolete generated face descriptor.

Verification for this addition:
- 669 tests passed; six existing tests skipped; TypeScript and frontend production build passed.
- Browser UI fixture checked tagging, positive approval, mismatch rejection, inconclusive rejection, primary-approval save gating, and the resulting save payload. Fixture provider responses and saves are simulated and explicitly labeled.
- A real Gemini comparison using the app's synthetic example images accepted the identical reference and rejected a different persona. This is a small compatibility check, not a comprehensive accuracy benchmark.
- A real metadata transaction wrote and read a synthetic identity set, then rolled back; a subsequent read confirmed no test record remained.
- The live site is unchanged until deployment. No real account personas were edited by these checks.

## Verified scene images before animation

Persona-bound video requests now prepare a first scene image before animation. A selected identity-reference portrait triggers one scene-image generation using the approved identity references and animation brief. An uploaded scene is checked and reused instead. The scene must pass identity review before the animation provider is called; failed or inconclusive review stops the operation. Existing source-video editing checks the source video and retains that editing input.

The video credit reservation occurs before scene generation, so unavailable video credits do not cause an image to be generated first. Failed scene preparation releases the video reservation. Generated scene images have their own image-generation charge, disclosed in the video workspace. The scene is reused across provider fallbacks within the same request; a separate user-initiated retry is a new request and may prepare a new scene.

Talking avatars check their exact input portrait (or source video) before TTS and animation. For persona-bound hosted photo avatars, a new photo-avatar binding is made from the verified portrait instead of trusting an opaque saved provider avatar ID. Final generated video identity review remains in place. Successful studio results expose a collapsible preview of the verified starting image/portrait.

The existing multi-person-only preparation was consolidated into the same video preflight used for single personas. Scene generation remains separate from the approved identity reference set and does not automatically promote a new reference photo.

Verification: six scene-orchestration tests cover preparation order, uploaded-scene reuse, failed/inconclusive review, avatar and source-video behavior, missing references, and legacy duplicated-image inputs. Full suite: 675 passed, six existing skips. TypeScript, frontend production build and serverless API bundle/import passed. No paid end-to-end persona video/avatar renders were run for this addition. All changes remain local until deployment.

## Paid acceptance run and release hold

The subsequent paid acceptance run did not pass. Three image results passed identity comparison, but visual inspection found that they retained the reference outfit, pose and setting instead of following the requested scenes. The direct image prompt was being omitted outside chat mode. This is fixed locally with two regression tests; generated video opening scenes now also require prompt-fidelity review. The full suite after this fix has 677 passing tests and six existing skips; TypeScript passed.

The video provider rejected the run for insufficient credits after the opening image was generated. The local WaveSpeed key reports a remaining balance of $0.469068; its relationship to the production key is unverified. The avatar test was not reached. Four successful image calls had estimated provider charges of $0.045 each; these are quotes, not confirmed provider debits. The isolated test persona, identity metadata and uploaded references were removed. Artifacts and the failed acceptance report remain under reports/identity-acceptance.

No deployment is approved by this failed run. Repeat scene-fidelity, video and avatar acceptance after confirming the test provider account has sufficient funds, then deploy only if those checks pass. Production cron execution is still unverified.
