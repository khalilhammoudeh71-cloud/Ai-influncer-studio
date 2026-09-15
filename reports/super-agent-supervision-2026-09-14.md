# Super Agent: supervised execution release

September 14, 2026. Production commit: `070a53236b74922bbe580a8c42b5145a22ff527b`.
Deployment: `dpl_9KT8RAWPhNFbJd8oR7E8RreN2SsN`, READY, serving https://ai-influencerstudio.com.

## What changed

- Image plans inspect the actual generated pixels against the approved request, edit source and applicable saved persona references. Identical reference/source pixels fail before a paid visual assessment. A mismatch, unreadable image, interrupted check or uncertain judgment pauses downstream work. Users can review and explicitly accept a saved result.
- A failed plan can propose revisions to all remaining instructions together. Suggestions remain editable and require approval. Completed outputs, step types, source dependencies and selected generation models are preserved. This is instruction repair, not unrestricted insertion/removal of tools.
- Approval now includes a firm task allowance in studio credits. Each generation, edit and paid analysis reserves against it atomically. Simultaneous reservations cannot exceed it. Creator accounts use the same nominal allowance even though their account credits are not charged. Existing failed plans can receive an allowance without automatically restarting.
- Image assessments reserve 1 credit; AI repair analysis reserves 3. Rule-based advice is free. Attempts remain counted against the task allowance after account-credit refunds. The allowance does not cap provider invoices or earlier chat/planning usage.
- Hidden image fallback attempts and the older automatic image quality retry are disabled for supervised plans. A separately billed equivalent-provider attempt still needs allowance headroom. Approved prompts skip the automatic prompt enhancer.
- Media-job writes and allowance records are server-owned. Authenticated database clients retain only their existing owner-scoped read access to media jobs.

## Verification

58 distinct automated cases passed across the full 55-case regression run and three added cases, with affected suites rerun after fixes. Coverage includes concurrent spending limits, owner isolation, remaining-step validation, successful output preservation, duplicate approval, paused/resumed plans, visual failure/uncertainty/acceptance, unchanged pixels, malformed judgments, large/duplicate image headers, fresh and existing schemas, and authenticated-role denial of job/allowance writes. TypeScript, frontend production build and API bundling passed. Independent code review found no remaining issues after corrections.

Browser tests at 390px width verified the low-allowance warning, editable multi-step suggestions, exact repair submission, manual result acceptance and saving an allowance without restarting work. The custom domain returned HTTP 200 and the released controls.

Live model probes:

| Check | Result | Latency |
|---|---|---:|
| Gemini 2.5 Flash: requested blue square, blue output | Passed correctly | 1.60 s |
| Gemini 2.5 Flash: requested green square, blue output | Failed correctly | 1.05 s |
| Identical source/output pixels | Failed locally, zero model calls | Local |
| Gemini 3.8 Flash: remaining-plan repair | Valid proposal | 4.41 s |
| Gemini 3.1 Pro Preview: remaining-plan repair | Valid proposal | 9.37 s |
| Grok 4.6: remaining-plan repair | Valid proposal | 27.71 s |

These are single smoke samples, not a comparative model benchmark. All used non-explicit content.

Production test project: **Supervision verification Sep 14**. The initial 1-credit allowance correctly prevented the first provider generation; server records showed 0 reserved credits and 0 generation-cost records. Increasing it to 17 saved the allowance while keeping the plan stopped until explicit retry. The retry generated a blue cup; its visual check passed before the edit started. The edit changed the cup to green while preserving the table, lighting and camera angle; that visual check also passed. The final plan is succeeded with both steps complete, both outputs saved, no error, and 7 of 17 credits reserved. The two successful provider jobs used one attempt each. The earlier cap-blocked attempt had no reservation. Result previews now show the full image/video frame.

## Practical limits

Automated visual review can be wrong; uncertain results require human review. This version assesses PNG/JPEG images up to the supported byte/pixel limits. Unsupported formats and inaccessible references pause for manual inspection. Videos require playback and explicit acceptance; they are not automatically visually certified.

The configured legacy planning engine failed its first test request. Explicit Gemini 3.8 Flash then produced the correct actionable two-step plan. This release does not certify every configured provider route.

Supabase's security advisor reports an informational “RLS enabled, no policies” notice for agent_runs. That is intentional: the browser has no grants and access goes through the owner-scoped server API. See https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.
