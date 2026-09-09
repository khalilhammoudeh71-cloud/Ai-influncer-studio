# Functional audit — September 9, 2026

## Confirmed bugs corrected

- Create Studio saved media optimistically, omitted authentication, and reported success even after an HTTP failure. It now uses the existing authenticated storage service, updates the local library after persistence succeeds, and displays failures. Saving without a persona gives an explicit explanation.
- Video extension omitted authentication when extracting the last frame and did not render its error state. Both are corrected.
- Older voice, avatar, group photoshoot, persona voice fallback, planner, assistant, and viral-analysis actions bypassed the authenticated request helper. Protected API calls now use it.
- 3D saving now checks the server response before displaying success.
- Voice script generation now treats an error response or missing script as a failure.

## Verification

- All 195 existing automated tests pass after changes.
- TypeScript check and production frontend build pass.
- Live navigation smoke checks: Personas, Create, Editing tools, Library, Planner, Assistant, Trends, and Settings opened without document overflow or crash.
- Local browser regression: a rejected save previously displayed Saved with no error; after the fix it displays the server error, sends Authorization, and only displays Saved after a successful response. Requests were intercepted; no user data was written.
- Carousel at mobile width: sample navigation, starting with persona, library photo selection, and download flow passed without a JavaScript exception or horizontal overflow.
- Five-slide photos-only Instagram ZIP: five 1080×1350 JPGs, editable project and supporting files; no caption file.
- TikTok ZIP: five 1080×1920 JPGs.

## Limits

This was a broad smoke and regression pass, not an exhaustive certification of every provider. No paid generation, social publishing, billing changes, voice calls, camera/microphone capture, or deletion of user data was performed. Local save and export tests used fixtures and intercepted API responses. Empty library state was observed in the live account; existing saved-media records were not modified. The unused legacy VisualGenerator also stores an unrendered error state; it has no current callers and was not changed.
