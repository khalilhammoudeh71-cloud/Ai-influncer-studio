# Technical and functional audit — 17 September 2026

## Follow-up: GPT Image 2.5 root cause and successful retest

The initial failures below used the legacy `Openai_api_key` because it took precedence over the canonical variable. A separate non-generating OpenAI `/v1/models` request confirmed that legacy key returns 401, while `OPENAI_API_KEY` returns 200 and lists both GPT Image 2.5 variants. Production's variable inventory contains both names; its secret values were not retrieved.

The direct image client and opt-in test now prioritize `OPENAI_API_KEY`, retaining aliases as fallbacks. Both new direct API generation tests succeeded: Flare in 11.716 seconds and Sunburst in 12.388 seconds. Each used 26 text input tokens and 196 image output tokens, approximately $0.00601 each ($0.01202 total) at the documented rates. The PNGs and updated sanitized metadata are under `/tmp/studio-api-audit/`. TypeScript passes after the priority change. A production deployment of the priority fix was initiated; the deployment completion is reported in the task response. The historical audit below describes findings before this retest.

## Summary

The main authenticated workspace pages load, and one paid Seedream image generation returned the requested neutral product image. This does **not** establish that every workflow/provider works. Workspace sync and job-history loading showed unresolved problems. Direct GPT Image 2.5 requests failed authentication using the existing local OpenAI key.

The separate [page-by-page UI/UX audit](2026-09-17-ux-audit.md) covers the rendered navigation inventory, creation studios, tools, conversation settings, authentication and legacy surfaces. It distinguishes source review from live verification.

## Coverage and results

| Area | Evidence | Result |
| --- | --- | --- |
| Deterministic automated suite | All `.test.ts` files in shared, src and server, credentials isolated and external fetch blocked | 524 tests: 518 passed, 6 skipped, 0 failed in the completed isolated run |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit` | Passed after fixing incompatible database-driver query overloads |
| Frontend production build | Vite production build | Passed; warns about chunks over 500 kB |
| API production bundle | Exact package.json build:api command and isolated verify-api-bundle import | Passed; handler default export verified. Isolated import deliberately has no database credentials |
| Live page smoke | Super Agent, Personas, Create content, Editing tools, Library, Planner, Persona Chat, Trends, Settings, persona identity/creation surface | Loaded without a fatal screen after stale-chunk recovery |
| Creation subflow | Image Studio model catalog, persona choice, prompt, one generation, output | Seedream output visually verified |
| Paid provider API | Direct OpenAI Images API, Flare and Sunburst | Both returned 401 invalid_api_key; no output |
| Public protected endpoints | Unauthenticated /api/health and /api/config-status | Both reject unauthenticated access; this is not evidence of an unhealthy server |
| Responsive spot check | Trends at current 687×622 browser viewport | No horizontal overflow or broken images in that spot check only |
| Speech accuracy, dialect and pronunciation | Existing tests/source, earlier supplied user screenshots | No fresh recorded-call evaluation; audio fidelity remains unverified |
| Video/avatar/clone/edit providers | Source inventory and existing automated tests | Not paid-executed individually |

## Paid test ledger

User authorized approximately **$10 total** and explicitly chose the existing OpenAI key for the direct API test.

| Test | Request | Outcome | Spend evidence |
| --- | --- | --- | --- |
| Seedream V5.0 Pro in production UI | One 1K square image, no persona reference, neutral gold teacup prompt | Requested image displayed; second recent-creation thumbnail appeared | Catalog listed $0.045. Final provider/account ledger not verified |
| GPT Image 2.5 Flare direct API | One 1024×1024 image, quality low, no references, retries disabled | 401 invalid_api_key, about 1.5 sec | No image generation accepted; no billed usage returned |
| GPT Image 2.5 Sunburst direct API | Same fixture and limits | 401 invalid_api_key, about 0.24 sec | No image generation accepted; no billed usage returned |

Direct tests used the key from the local environment/.env and `api.openai.com`, matching the app's direct OpenAI client convention. This does not establish whether the production Vercel key is identical. Do not rotate or replace credentials blindly; verify the production secret and intended project separately. Safe request metadata is at `/tmp/studio-api-audit/results.json`. No secret values or provider error messages containing masked key fragments are stored in that artifact. The opt-in reproduction helper is `scripts/evaluation/paid-image-smoke.mjs`; it is excluded from the automated suite and requires `STUDIO_PAID_TEST=confirmed`.

OpenAI's [model documentation](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare) and [image guide](https://developers.openai.com/api/docs/guides/image-generation) confirm the model IDs and supported low-quality setting. Pricing is token-based; the app's configured per-image estimate is not a guaranteed direct-provider invoice.

Original image draft/persona selections were restored after the neutral test. The test output remains in recent creations. No user assets were deleted and no subscription/key/permission changes were made.

## Prioritized technical findings

### P1: Sync and job discovery remain unresolved in the live session

Observed: the app showed “Saved locally — sync pending,” later “Syncing workspace…,” then pending again. Opening Your generations showed “Loading your jobs…” without resolving during the check, including after the image itself completed.

This is a separate problem from the image provider: a successfully displayed image does not prove server persistence or refresh recovery. Root cause is not established. `listMediaJobs` awaits `authFetch` without a request deadline; `authFetch` also awaits session restoration/refresh without a deadline. Either an auth wait or API/database request can leave loading indefinitely. Investigate with correlated auth/API/database timing before adding retries. Add a bounded loading failure with Retry and preserve the locally saved draft. Verify same-account reload and a second session before declaring sync fixed.

### P1: Quiet speech-verification fallback can look like a stalled call

Source: `AssistantView.tsx` around 1384–1392 sets pendingVoiceConfirmation/callInput and returns when recognition needs confirmation or verification fails. It also sets transcriptionNotice. That notice has no rendered consumer in the current view, and the previous confirmation UI was removed.

Result: the call can remain listening while waiting for the user to notice and submit the typed draft. This is a source-confirmed path, not a fresh live-call reproduction. Preserve the user's preference to avoid repeated “Did you mean” gates while making genuine verification failure visible with a compact status and easy retry. Do not invent intended words solely from semantic plausibility; retain the captured audio as the ground truth.

### P1: Direct GPT Image 2.5 local credentials are invalid

Reproduced with both official model IDs. Both requests fail before image generation. Repair the credential/project access, then repeat one low-quality image and inspect returned usage. A generic model switch/fallback would hide the actual failure and would not test GPT Image 2.5.

### P2: Library “Edit Image in Studio” does not hand off the image

Source: `GalleryView.tsx` around 760 navigates to `{ view: 'create', subView: 'image' }` and immediately toasts “Loaded image into AI Studio Editor!” without supplying the selected asset or opening the editing subflow. Pass the asset through the navigation/draft contract and show success only after the editor receives it. This finding is source-based.

### P2: Readiness claims conflate configuration with connectivity

Source: `/api/config-status` returns databaseConnected based only on the presence of DATABASE_URL. Key presence similarly cannot prove provider permissions or valid credentials. Rename configuration-only signals and expose verified health separately, without leaking secrets. The failed direct API test illustrates why this distinction matters.

### P2: Fresh deployments can invalidate a long-lived tab's lazy chunk

Observed on first Super Agent navigation: a previous AgentView chunk URL failed. Existing ErrorBoundary recovery reloaded the application and the page then loaded. Recovery works for this observed case; the stale asset problem still exists across releases. Preserve drafts before recovery and test deployment-transition navigation explicitly. A clean fresh page load alone misses this case.

### P2: Output and call screens have competing scroll surfaces

Code and user screenshots show nested scroll ownership and fixed-height decoration. The paid image screenshot also showed a clipped preview above the controls at the small current viewport. Follow the UI/UX report's single viewport contract: fixed compact header/composer/call controls and one scrolling transcript/results area. Unlimited history must scroll inside that area; do not shrink all text to force it into one screen.

## Fixes made during this audit

1. `server/index.ts`: invoke the two PostgreSQL drivers through their common plain-SQL query signature. This removes the reproduced TypeScript overload error; schema SQL/behavior is unchanged. Actual schema execution was not performed against production.
2. `scripts/evaluation/isolate.mjs`: permit local loopback HTTP fixtures while continuing to block external requests; redirects are rejected to prevent a loopback fixture from contacting an external provider. This allows voiceRecognition's local HTTP test to run under credential isolation.
3. Added the opt-in, retry-disabled direct image API helper with sanitized metadata output.

These checkout changes are not deployed by this audit. No broad UX rewrite was performed: the user requested a review and suggestions, and the separate report supplies the prioritized implementation sequence.

## Verification cautions and next order

The first non-isolated automated run had environment-dependent integration failures. Re-running with credentials removed established that those were not confirmed application regressions. Future deterministic runs should always import the isolation helper; avoid the older test-apis/test-all-keys scripts that print key prefixes.

1. Resolve sync/job-list loading and verify refresh recovery.
2. Repair/verify the intended OpenAI credential, then repeat the two direct API smoke tests.
3. Fix the silent speech-failure path and test a recorded Arabic/English fixture set with human ground-truth transcripts, interruptions and noise. Measure word error rate and separately assess dialect/pronunciation by listening.
4. Fix asset handoff and visible disabled-action reasons.
5. Implement the UX report's viewport, voice-picker and navigation recommendations, then test desktop/mobile, keyboard, Arabic layout and zoom.

This audit does not certify accessibility, security, every paid provider, microphone behavior, pronunciation fidelity, billing correctness, publishing, or the six skipped tests. Those require their own fixtures/account readiness and measured runs rather than extrapolating from successful unit tests.
