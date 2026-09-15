# Super Agent: reviewed AI repair suggestions

## What changed

When a background media plan fails, open **Inspect failed step** and choose **Suggest a repair**. The selected model receives the failed instruction, provider error, and descriptions of completed steps. It can propose a clearer instruction, explain why it might help, or ask for manual review. The original instruction remains available for comparison, and the suggestion can be edited.

**Approve & retry this step** starts a new attempt using the reviewed instruction. Successful steps and source references are retained; pending steps continue after the repair succeeds. Analysis alone neither changes the saved plan nor submits a generation. A plan changed in another session cannot accept an outdated repair.

Repair analysis supports Gemini 3.8 Flash, Gemini 3.1 Pro Preview, and Grok 4.6. It uses the selected frontier planning model when available; otherwise its visible default is Gemini 3.8 Flash. An unavailable selected model produces an error and leaves manual revision available; it does not silently switch providers.

Billing, credential, policy and missing-source problems receive specific guidance instead of a paid AI prompt rewrite. Temporary outages offer review of the original instruction without calling a text model. Provider refusals are not rewritten to evade policy.

## Verification

- 38 focused automated tests passed, including embedded PostgreSQL integration of plan creation, failure, proposal, stale-plan rejection, explicit repair approval, retained references, continuation, and account isolation.
- No generation job or plan mutation during proposal analysis; unauthorized and stale requests rejected before model use.
- Invalid model output, hidden extra fields, unchanged edits, empty instructions, oversized responses, and credential/reference URL redaction tested.
- Browser verification on the real recovery component with synthetic API responses: suggestion-only leaves generation count at zero; approval sends the user's edited instruction exactly once; stale approval disables further action until refresh; model failure retains manual revision.
- Narrow viewport: 390 px wide, no horizontal overflow; approval control remained inside the page.
- TypeScript check, production frontend build, and server bundle passed.

## Live model smoke test

Synthetic task: an image of a blue ceramic cup on a wooden table succeeded, then an edit to green returned the source unchanged. All three providers returned schema-valid revised edit instructions that preserved the setting. These are direct calls using configured local credentials; they are not an end-to-end production generation benchmark.

| Model | Response time | Result |
|---|---:|---|
| Gemini 3.8 Flash | 6.01 s | Color-only edit instruction; preserve table, lighting, background and composition |
| Gemini 3.1 Pro Preview | 8.41 s | Change blue cup to green and preserve the scene |
| Grok 4.6 | 17.54 s | Color-only change; preserve shape, position, table, lighting and other details |

## Practical limits

This is assistance for repairing one failed media step, not unrestricted autonomous replanning. It does not inspect image pixels or guarantee the next generation will meet the brief. It cannot repair account credentials, billing, or missing references by editing a prompt. Provider usage may be billed for analysis, and an approved generation retry can incur another charge. There is no new hard spending cap or complete actual-cost reconciliation in this release. The existing supported background actions remain image generation, image editing, and image-to-video plans.

## Production release verification

- URL: https://ai-influencerstudio.com/
- Target: production; status READY.
- Commit: `2fd0abd12f94d9c6a6355d73966728357111157e`.
- Deployment: `dpl_3n4EEp6g52pidJmmbjXUwBfP9LBm`; custom domain alias confirmed.
- Framework: Vite frontend and Express API; production build approximately 77 seconds.
- Live page returned HTTP 200 and includes the new repair interface/endpoint. An unauthenticated repair request returned HTTP 401.
- Signed-in browser reload succeeded. Existing verification project still showed two completed steps and both saved result images.
- Runtime scan scoped to this deployment: observed an existing Node `url.parse()` deprecation warning, including one entry labeled error; no request failure appeared in the returned entries. This was a short release check, not an ongoing monitor. Drains configuration was not audited.
- The new recovery UI was exercised locally with controlled API responses; repair inference was tested against live providers. No new production media failure or charged retry was deliberately created solely for this release.
