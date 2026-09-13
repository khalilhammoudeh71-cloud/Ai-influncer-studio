# Super Agent upgrade progress — September 13, 2026

The complete roadmap is not finished. This batch adds the foundations below; it does not establish parity with Higgsfield or Venice.

## Implemented in this batch

- Media-heavy conversation persistence: newly generated and edited images use the library's saved URL. Existing inline media is externalized before writing local history. Outdated asynchronous saves cannot replace newer messages. Upload errors propagate instead of silently falling back to the original base64. The storage-quota mechanism is reproduced in a bounded-storage test; production long-history verification remains pending.
- Named projects: independent conversations and briefs, preserving the original history under Main workspace. Project switching is disabled while a task is running or history is unsaved. New projects and briefs use account-scoped cloud-sync keys.
- Version preservation: in-place image revisions preserve earlier results, with a comparison view and an action to edit a chosen version. This is not yet a full cross-project asset version graph.

## Verification

- 41 targeted tests passed.
- TypeScript check passed.
- Production frontend build passed.
- Isolated browser test: create project, add brief, get a mocked reply, switch to Main workspace, reload, switch back. Both project-specific brief and reply survived; the original conversation remained separate.
- Mocked browser replies are not live model-quality tests.

## Still to implement or verify

1. Confirm long media-heavy production history survives refresh, including a new generated result.
2. Project asset collections, preferences, rename/archive, and cross-device conflict behavior.
3. Explicit creator/persona/scene reference controls and verified participant mapping.
4. End-to-end storyboard, images, video, narration, and assembled export.
5. Durable whole-plan execution outside the browser. Individual media jobs already have a worker; the whole plan currently remains client-orchestrated.
6. Verified price quotes, budget enforcement, model health and quality-based routing. Unknown prices must remain unknown.
7. Cross-step revision lineage, richer comparisons, and asset version management.
8. Connected research/files/calendar/publishing with explicit approval for external actions. Actual connected-account availability must be verified.

No new account permissions, provider credentials, or publishing actions were added in this batch.
