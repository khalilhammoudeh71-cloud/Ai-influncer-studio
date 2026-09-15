# Voice call improvements — September 15, 2026

## Outcome and scope

Applied the three requested skills to the shared ElevenLabs / OpenAI / Hume call dialog used by persona chat and Super Agent. Source changes are local. **No application deployment was performed.** The separate legacy Voice Call flow and Speech Engine pilot were not replaced.

- [Senior Voice AI Engineer](/Users/Family/.codex/skills/senior-voice-ai-engineer/SKILL.md): timing measurements, interruption handling, microphone lifecycle and a listening evaluation suite.
- [Unified Text–Voice Conversation](/Users/Family/.codex/skills/unified-text-voice-conversation/SKILL.md): one committed history, provisional transcripts, delivery uncertainty, typed turns and reconnects.
- [Imaginative Persona Dialogue](/Users/Family/.codex/skills/imaginative-persona-dialogue/SKILL.md): shared, compact persona and language instructions.

## User-visible changes

### Language and persona

Language, dialect and Arabic/English switching settings now apply to all three providers. Jordanian/Syrian Arabic remains the default; preferences remain scoped to the account and persona in browser storage. The shared prompt includes authored speaking rules, boundaries, personality traits and the persona's voice direction. It encourages natural vocabulary, context-sensitive humor, focused replies, correction handling, appropriate longer stories, and fewer repetitive acknowledgements. It does not add a model call to each turn.

OpenAI and Hume receive provider-neutral language directions. ElevenLabs alone receives its language-detection tool instruction. Hume EVI 3 is blocked for Arabic-capable settings; the UI explains how to use English-only or choose another provider. Arabic needs EVI 4-mini. No hosted Hume configuration was changed.

The selected voice binding remains authoritative. Prompt wording cannot establish an authentic acoustic accent or clone resemblance.

### Conversation continuity

- OpenAI transcript deltas appear as a live preview. Only finalized turns enter shared chat history; interrupted partial replies are committed with a delivery note.
- All three adapters mark interrupted replies so context does not imply that the caller heard the complete generated answer. No word-exact playback alignment is invented.
- Updated messages replace the same turn, with IDs scoped to the call and role. Repeated and delayed provider echoes of typed messages are reconciled without duplicating the user turn.
- Bounded reconnect context keeps the latest version of a turn and preserves interruption notes even when long text must be shortened.
- ElevenLabs reconnects into existing history without repeating its opening greeting. Latest call messages also reach studio planning requests without waiting for a React render.
- **Type in this call** sends through the active provider session. Sending is available while listening; typing during a reply preserves the draft until the caller can send it. Drafts survive reconnects, and clear on persona/account changes.

### Controls and recovery

OpenAI rejects cancelled response events and prevents an older playback-completion event from finalizing a newer reply. Hume clears queued audio and rejects known interrupted IDs; pending audio decoding remains part of the playback lifecycle. Hume setup timeout now covers authentication and microphone-stream setup as well as opening the connection.

ElevenLabs' **Mute reply** silences local playback and marks the transcript. Spoken interruption remains handled by its SDK/provider; local muting is not represented as upstream generation cancellation. The control's label preserves that distinction.

An active call hides configuration controls and shows a compact provider/language summary. Mute, typing and End call fit on the tested 390 × 844 mobile viewport. Escape, disconnect, sign-out and persona changes release the owned call resources and reject obsolete callbacks.

## Timing and evaluation

Call diagnostics now work across all three providers, with downloadable logs and separate median/p95 summaries for each event and measurement source. Missing, negative and non-finite durations are excluded. Text input and microphone-transcript timings are labeled separately. The first reply-start measurement is counted once per user turn, even if a language switch produces multiple playback starts.

OpenAI records browser audio detection after provider speech-end or local text-send. Hume records audio scheduling after a final transcript or text-send. ElevenLabs records SDK speaking events and browser output-volume detection. These measures cover different intervals and are not interchangeable end-to-end latency benchmarks.

The final live check produced these **small-sample observations**, using typed input, a silent fake microphone and stock George voice:

| Event | Source | Samples | Median ms | p95 ms |
|---|---|---:|---:|---:|
| session_preparation | client-control | 1 | 2383 | 2383 |
| text_to_speaking | provider-event | 4 | 1622 | 2641 |
| text_to_output_audio_detected | browser-render | 4 | 1705 | 2662 |

The [16-case listening suite](/Users/Shared/AI-Influencer-Studio/reports/voice-skills-listening-suite.json) covers Levantine phrasing, switching, corrections, names, numbers, pauses, interruptions, backchannels, tone changes, story length, tool status, typed turns, reconnects and room noise. Its real-microphone cases are pending. Working targets of 1,500 ms p95 from speech end to audible response and 200 ms p95 from accepted interruption to local silence are evaluation targets, not measured guarantees.

## Verification

- **49 focused tests passed**, including regression cases first reproduced as failures: language propagation, EVI-version gating, provisional versus final transcripts, delayed playback completion, repeated typed echoes, context bounds, interruption markers, setup cancellation and timing grouping.
- TypeScript `tsc --noEmit`: **passed**.
- Production frontend build, API bundle build and API bundle import: **passed**.
- Browser fixture: shared language controls, EVI 3 Arabic gate, typed echo deduplication, interrupted context on reconnect, preserved draft, obsolete-session rejection, timing export, persona/sign-out cleanup, mobile layout and visible hang-up. No page errors. This fixture uses real React and adapters with a mocked provider connection.
- Live ElevenLabs SDK/WebRTC: four typed conversational turns switched Arabic → English → Arabic, retained a corrected time of day, and committed each typed message once. Reconnection skipped the greeting and retained the corrected fact. Inbound audio was received; microphone tracks ended and peer connections closed. No page errors.
- The timing log asserted exactly one first-speaking measurement for each of the four typed turns.
- Temporary synthetic agent configurations: **removed; both temporary configurations from the final run were deleted**. No persona voices or clones were created or changed.

### Representative live exchange

The synthetic caller corrected morning to evening, then switched to English. The reply was: “You corrected it to the evening.” On switching back: “اتفقنا على وقت المسا.” After reconnecting: “حكينا عن وقت المسا.”

These are content and transport checks. They do not prove accent fidelity, natural prosody, real microphone transcription accuracy, echo cancellation or performance under load. The first reply in the final sample also exceeded the requested two-sentence length; instructions guide conversational behavior and do not enforce exact verbal length.

## Files and evidence

- [Shared dialogue instructions](/Users/Shared/AI-Influencer-Studio/shared/voiceCallDialogue.ts)
- [Call dialog](/Users/Shared/AI-Influencer-Studio/src/components/NativeVoiceCall.tsx)
- [Transcript reconciliation](/Users/Shared/AI-Influencer-Studio/src/utils/callTranscript.ts)
- [Timing summaries](/Users/Shared/AI-Influencer-Studio/src/utils/voiceCallMetrics.ts)
- [Browser results](/Users/Shared/AI-Influencer-Studio/reports/voice-skills-browser-results.json)
- [Live results](/Users/Shared/AI-Influencer-Studio/reports/voice-skills-live-results.json)
- [Live timing log](/Users/Shared/AI-Influencer-Studio/reports/voice-skills-live-timings.json)
- [Mobile screenshot](/Users/Shared/AI-Influencer-Studio/reports/voice-skills-mobile.png)

## Provider references checked

- [OpenAI Realtime conversations and WebRTC interruption behavior](https://developers.openai.com/api/docs/guides/realtime-conversations)
- [Hume EVI language support](https://dev.hume.ai/docs/speech-to-speech-evi/faq)
- [Hume chat input, pause/resume and transcript events](https://dev.hume.ai/reference/speech-to-speech-evi/chat)
- [ElevenLabs JavaScript SDK: typed input, mode callbacks and output volume](https://elevenlabs.io/docs/eleven-agents/libraries/java-script)
