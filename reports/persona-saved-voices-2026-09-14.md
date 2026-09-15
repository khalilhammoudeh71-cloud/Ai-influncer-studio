# Saved persona voices

## Delivered

- Installed [NoizAI characteristic-voice](https://github.com/NoizAI/skills/tree/main/skills/characteristic-voice) at `/Users/Family/.codex/skills/characteristic-voice`.
- Installed [Fish Audio SDK](https://github.com/fishaudio/docs/tree/main/.mintlify/skills/fish-audio-sdk) at `/Users/Family/.codex/skills/fish-audio-sdk`.
- Added a saved-voice library for each persona. Saving a default retains the previous and current voices, their provider/engine, available enrollment recordings, names, and delivery settings. Entries have no expiry or automatic deletion.
- Added **Saved voices** in the persona editor's **Voice** tab and in **Voice Studio → Voice & Tone**. In the editor, select a voice and save changes. In Voice Studio, **Use as default** saves it directly. A voice-name field makes entries easier to identify.
- Existing current defaults appear in the library; their snapshots are archived with the next persona save. Voices replaced before this feature existed cannot be reconstructed without their old identifiers or recordings.

## Persistence

History lives in the database under each account's server-owned voice namespace, keyed by persona ID. The persona update, active binding, and voice history are saved in one transaction. Browser payloads cannot clear the history. Voice identity distinguishes hosted provider IDs and separate reference-based clones, including the current Wiro Fish route. Storage recordings use permanent object references; playback receives fresh signed URLs through the existing media service.

Switching a default does not delete the old remote voice. A provider can still remove or restrict its own voice; saving an identifier cannot guarantee that provider's future availability. Available source recordings remain in the persona library for recovery.

## Verification

- 23 voice library/lifecycle tests passed, including repeated restores, preserved settings/recordings, reference-based clones, signed URL normalization, and failed replacement protection.
- Database integration passed using the production persona CRUD handlers and temporary fixture records: create, replace, reload, restore, attempted client history deletion, account isolation, stale-save rejection, and transaction rollback. Fixtures were removed.
- Playwright passed with the real editor and Voice Studio components against an isolated fixture API: selection, settings/recordings, reload, failed-save preservation, and mobile layout. No browser runtime errors.
- TypeScript check, production frontend build, API build, API bundle import, and diff whitespace checks passed.

Manual checks: `reports/verify-persona-voice-library.ts` and `reports/verify-voice-library-browser.py` (browser fixture requires Vite on port 5175).

The implementation is local and has not been deployed. Installing the skills does not change the app's speech provider or automatically apply emotion tags. The installed skills are available on the next Codex turn.
