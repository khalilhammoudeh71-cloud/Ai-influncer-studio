# Dialect Listen playback fix

The open teaching panel showed the error: “The selected speech provider is not configured for this endpoint.” The preview passed the selected ElevenLabs model ID, while dispatch only recognized the generic provider ID. Direct v3, Flash 2.5, Turbo 2.5, and multilingual v2 IDs now dispatch to ElevenLabs with the saved voice identity. Delivery settings also recognize these model IDs, including v3 stability constraints.

The teaching panel previously swallowed autoplay failures and placed its audio player above the candidates. It now shows preparation status, errors, and a manual player directly beside the selected correction. A repeated Listen attempt resets the player, and a missing audio URL produces an actionable error.

Verification: 562 regression tests, 556 passed, six skipped, no failures. TypeScript passed. Production build and API bundle import passed. Commit 61f33ca was pushed and the production alias succeeded.

Live production check used only the neutral كيفك candidate from the existing reference. Listen displayed Preparing, returned an inline player, and playback reached the full 1.2-second duration with readyState 4 and no audio error. No pronunciation rules were approved or changed.
A second Listen click also showed preparation and completed a fresh 1.28-second sample with no audio error. The isolated verification tab was closed; the user's open settings were preserved.
