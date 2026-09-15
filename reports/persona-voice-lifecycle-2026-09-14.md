# Persona voice lifecycle — implementation and verification

## Outcome

Improved the persona editor and Voice Studio's ElevenLabs selection and instant cloning flow. Existing persona `voiceId`, `voiceEngine`, source sample associations and provider choice remain authoritative. No provider voices were created, replaced or deleted during this task. Source changes are local and have not been deployed.

### Selection and previews

- Account voice discovery uses authenticated, paginated provider listing, with search by name, description and labels.
- Saved voices get a metadata-only availability check. An unavailable voice keeps its binding and shows a recoverable status.
- Studio auditions use representative, editable persona text and applicable settings with Eleven Turbo v2.5. The UI identifies this preview model; calls retain the existing conversation model routing.
- One preview controller stops playback on replacement, navigation, unmount and setting changes. Late responses cannot start an older preview.
- HeyGen previews retain their provider preview URLs; missing previews use the existing HeyGen speech handler.
- Unsupported native-provider audition buttons in Voice Studio were removed: its generic synthesis route could otherwise present another provider's voice. Existing native-provider selections and bindings are retained.

### Cloning

- Upload and creation are separate actions. Original audio is retained without the former short crop/loop conversion.
- The UI recommends 1–2 minutes of clear speech from one speaker. Product upload limits are 10 audio files and 20 MB total. Backend validates audio data URLs, format, nonempty content and size.
- Speaker authorization is required before enrollment. Provider verification remains separate and must be completed in ElevenLabs when required.
- Durable operation records are written before submission. Recording content, owner and stable provider account scope identify an enrollment; sample order and duplicate recordings cannot bypass deduplication.
- States: `submitting`, `unknown`, `processing`, `verification_required`, `ready`, `failed`.
- Accepted upload alone is not readiness. Successful synthesis supplies readiness evidence.
- Unknown submissions reconcile using an operation marker in the provider voice description. They are never blindly submitted again.
- Definite provider rejections support an explicit retry, atomically claimed against the previous failed state, up to three attempts. Unknown outcomes cannot use this retry path.
- Late completion cannot overwrite a newer draft choice or changed attachment intent.

### Preservation, assignment and access

- Persona saves preserve omitted voice fields. Merely browsing tabs does not change the binding's provider.
- Replacement validation runs before committing. Persona writes and voice metadata are committed in one database transaction; revision checks reject stale replacements.
- Returned saved personas, including their new revision, propagate through the existing `persona-updated` event.
- Voice metadata records owner, provider account, studio model/settings, revision and readiness evidence. Existing records without evidence remain unverified.
- Provider account identity uses ElevenLabs `user_id`, plus optional `ELEVENLABS_WORKSPACE_ID`. API-key fingerprints are used only for credential-specific caching. Rotating a key in the same account preserves operation ownership.
- A one-time, immutable registry preserves ownership of legacy saved ElevenLabs voices. It completes before persona API mutations can race it. Private server records reuse `workspace_states` under `voice-lifecycle:<owner>`; existing exact `auth.uid()` RLS prevents browser access or forgery.
- Private auditions require owned operations, a registered legacy binding, or the existing creator-account access rule. Public premade voices remain available.
- Automatic remote deletion by name, age or slot count was removed. Persona or source-reference removal never deletes a shared provider voice.
- Exact saved ElevenLabs IDs are not remapped on provider errors. Speech failures remain recoverable; existing per-turn voice snapshots and conversation history are retained.

## Checks performed

- **74 focused tests passed**, including 15 new lifecycle tests. Coverage includes duplicate clicks/submissions, reordered samples, lost submission responses, verification, failed readiness, definite rejection retry, key rotation, stale replacement revisions, legacy form defaults, owner isolation and stale preview rejection.
- TypeScript `tsc --noEmit`: passed.
- Vite production build: passed.
- API bundle build and import verification: passed.
- Browser fixture checks: saved ID/provider/settings preserved after visiting another tab; no clone triggered by browsing; two immediate clone clicks produce one request; selecting B while clone A finishes keeps B. No page errors. The browser used isolated fixture personas and provider responses.
- Live database integration: registered **6 existing direct ElevenLabs persona bindings** for legacy access; every persona row remained byte-for-byte unchanged. Server-state write/read, cross-account isolation and browser RLS denial passed. Test fixture writes rolled back.
- Read-only inventory: **11 personas, 10 stored voice IDs**. Five distinct ElevenLabs IDs were checked with provider metadata requests: **one returned 200 with the exact requested ID; four returned HTTP 400**. Those four bindings were preserved, not replaced.
- Scoped diff whitespace check: passed. Pre-existing unrelated workspace edits were retained.

## Limits and follow-up context

- No real clone enrollment or synthesis/listening evaluation was performed. Metadata access, unit fixtures and successful builds do not establish voice identity, pronunciation or acoustic quality.
- The four provider metadata failures need diagnosis in the original connected account. The implementation surfaces the errors while retaining the IDs.
- Existing realtime model/personality delivery behavior is retained. Studio audition settings are persisted, but perceived delivery can differ under the conversation model.
- This work covers persona selection and cloning in the persona editor and Voice Studio. The separate Super Agent voice library/enrollment UI was not redesigned; its shared automatic remote cleanup was disabled.
- Database schema and RLS policies were not changed. Only the server-owned legacy access registry was added to existing workspace storage; no persona records or provider assets were changed.

## Changed files for handoff

- `server/personaVoiceLifecycle.ts` and `.test.ts`: provider adapter, enrollment operations, readiness, reconciliation and retries.
- `server/personaVoiceStore.ts`: durable server state, legacy registry and private access IDs.
- `server/personaVoiceSave.ts`: binding merge and replacement/revision policy.
- `shared/personaVoiceLifecycle.ts` and `.test.ts`: shared operation types, draft and preview guards.
- `server/routes.ts`: authenticated endpoints, atomic persona saves, binding metadata, scoped access, migration preservation and exact-ID failure handling.
- `server/index.ts`: removed duplicate legacy clone/list handlers and automatic slot deletion.
- `src/views/CreatePersonaPage.tsx`: selection, upload/clone separation, authorization, status, discovery, auditions and preservation.
- `src/views/VoiceView.tsx`: clone readiness/retry states, guarded completion, previews and error recovery.
- `src/services/apiService.ts`: typed lifecycle endpoints and saved persona propagation.
- `src/types/index.ts`: binding metadata and revision types.
- `src/utils/audioUtils.ts`: original-audio sample reader for IVC.

## Provider references checked

Installed `@elevenlabs/client` version: **1.21.0**. Existing backend cloning uses REST; the provider and SDK were not replaced.

- [Instant voice cloning API and verification flag](https://elevenlabs.io/docs/api-reference/voices/ivc/create)
- [Paginated voice discovery](https://elevenlabs.io/docs/api-reference/voices/search)
- [Voice metadata and verification](https://elevenlabs.io/docs/api-reference/voices/get)
- [Stable user identity](https://elevenlabs.io/docs/api-reference/user/get)
- [Models](https://elevenlabs.io/docs/overview/models), [streaming speech](https://elevenlabs.io/docs/api-reference/text-to-speech/stream), [remote voice deletion](https://elevenlabs.io/docs/api-reference/voices/delete)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
