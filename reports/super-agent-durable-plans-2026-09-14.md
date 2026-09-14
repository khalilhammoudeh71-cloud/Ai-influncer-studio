# Saved background plans

Implemented for plans made entirely of image generation, custom image editing, and image-to-video generation. Browser-only workflows such as video stitching remain in the existing runner and are labeled “Keep this page open.”

The server stores the approved plan before generation, creates each child job in the same transaction as its step assignment, and advances through the existing minute-by-minute worker. Duplicate approval requests reuse the same plan. Project reopening restores results and progress from the server. Pause stops subsequent steps, while the already submitted generation may finish. Resume retains successful steps. Failed steps require an explicit retry, labeled as potentially billable. Account ownership is enforced on all endpoints; the new table has RLS enabled with no public client policies.

Verification: 16 focused tests including an embedded PostgreSQL integration test covering duplicate submission, cross-account isolation, pause/resume, dependent edit source selection, failure stopping, explicit retry, and successful completion. Browser fixture checks covered approval, pause, resume, and reload restoration. Type checking, frontend build and API bundle passed.

Limits: no claim of provider-side exactly-once execution; existing stale media-job recovery can resubmit a provider request. The paused plan does not cancel a provider request already sent. Worker advancement can take approximately a minute between steps. Plans containing unsupported operations still need the browser. Live deployment verification is recorded in the task response.

Integration test uses @electric-sql/pglite 0.5.8 installed temporarily for this test, with PGLITE_MODULE pointing to its ESM entry. No production credentials or paid generation were used by automated tests.
