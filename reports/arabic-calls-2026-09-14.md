# Arabic persona calls — September 14, 2026

Deployed to https://ai-influencerstudio.com/ from commit 788004994be3f206df472e6ccb9ae9091f0a83a9; Vercel reports READY with the custom domain assigned.

## Changes
- Existing personas can select English or Arabic in Edit → Personality → Call language.
- Arabic dialect choices: Jordanian–Syrian, Jordanian, Syrian, Lebanese, Palestinian, Egyptian, Gulf Arabic, and Modern Standard Arabic.
- Default Arabic dialect is urban Jordanian with light Syrian influence, including instructions for colloquial qaf as a glottal stop.
- Preferences persist with the existing personality settings; no new persona or voice clone is required by this implementation.
- Persona call transcription and browser speech-recognition fallback use the chosen language. Super Agent browser speech recognition uses the selected persona's language.
- Arabic letters and vocalization are handled by echo detection; Arabic interruption words and unfinished clauses receive appropriate turn timing.
- Emergency greeting fallback respects Arabic.

## Verification
- 23 focused automated tests passed.
- TypeScript check passed after compatibility correction.
- Frontend build and API bundle build/import passed.
- Production UI shows English/Arabic and all eight Arabic dialect choices.
- Rawan's live personality preview returned Arabic in response to an Arabic message.

- Rawan’s Arabic / Jordanian–Syrian settings survived saving and a full production reload.
- Live provider test of the corrected preview handler returned Arabic audio with the catalogued Rawan speaker. A separate deliberate stale-reference test recovered the existing named voice and returned audio. The legacy preview failure was corrected by using the multilingual call engine.

- Final production voice preview succeeded and displayed an audio player. Left available in Rawan’s Personality tab without auto-playing.

## Limits
Automated checks do not establish subjective dialect quality, microphone recognition accuracy in a real call, interruption behavior under room echo, or actual live-call latency. Exact qaf pronunciation depends on the existing voice and speech provider; it is a direction, not a guarantee. No new voice was cloned. Start a new call after saving language changes.
