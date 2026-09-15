# Rawan Hasan — voice test and repair report

September 11, 2026 · Production: https://ai-influencerstudio.com/

## Findings

All ten conversation choices and all seven voice choices were exercised through the live-call UI. These are **option-level smoke tests**, not a controlled benchmark of ten independent models: several options actually used fallback providers. A long follow-up session accepted repeated messages, model changes, and image generation. The earlier stalled-call behavior did not recur in that session; its root cause remains unproven.

Two reproducible backend defects were fixed:

1. **Wiro returned “[object Object]”.** A direct provider probe confirmed that Task/Detail exposes an unfinished nested output container. The parser converted that object into speech and incorrectly treated the request as successful. The corrected parser waits for usable text, ignores prompt/thinking metadata, and allows failures to reach fallback handling. Two regression tests failed before the change and passed afterward.
2. **Gemini replies were cut off.** The short 96-token output budget was shared with internal reasoning. A direct before/after probe returned “Got it” with `MAX_TOKENS` (90 thinking tokens, two answer tokens), versus a complete 44-token answer with `STOP` when thinking was disabled. Both Gemini streaming call paths now use a zero thinking budget for these short voice replies. Google's documentation describes the [Gemini thinking configuration](https://ai.google.dev/gemini-api/docs/generate-content/thinking).

The call header now wraps its controls instead of squeezing the persona title into a narrow column. The responding-provider indicator is also visible in narrow layouts.

## Method and limits

- Entered prompts in the live call's text input; observed transcripts, status changes, routing indicators, errors and generated images.
- Muted the microphone after an unplanned “Anyways.” transcript appeared, to isolate typed tests. This was not an evaluation of speech recognition accuracy.
- I could not reliably listen to live audio. **Humanlike vocal expression, pronunciation, clone fidelity and subjective voice quality remain unscored.** Natural written responses are a separate observation.
- Shared conversation history was intentionally retained for recall tests. Later options saw previous answers, so this is a functional continuity test rather than independent model-memory scoring.
- Timing values below are individual app-reported samples, not averages or validated latency guarantees.
- Moderation testing covered ordinary romantic/fashion requests. No explicit sexual-image or safeguard-bypass test was performed. “Uncensored” in a menu name does not establish unrestricted capability.

## Coherence, memory and correction

Initial facts: Saturday at 7 pm, code word amber, mint tea. A fresh call correctly recalled amber and seven. I then corrected the plan to Sunday at six while preserving the code word and drink.

Grok-selected response:

> Okay, Sunday at six it is—amber code word, mint tea for you. Don’t be nervous, I’ll be right there with you.

This demonstrates successful context use, correction and a natural reassurance in that run. It does not prove long-term memory independent of saved chat history.

Common comparison prompt:

> QA check: recall our latest cafe day, time, code word and drink. Then suggest a tasteful date-night outfit. Be brief, natural, and say if you are unsure.

## Conversation options — initial comparison before repairs

| Selected option | Visible result | Route evidence / interpretation |
|---|---|---|
| xAI Grok 4.20 | Recalled amber; correctly accepted Sunday/six correction; warm reassurance | Initial successful route not captured. A later Grok selection fell back to Wiro and returned `[object Object]`. Cannot attribute every Grok-selected result to Grok. |
| Atlas Doubao Seed Character | `Okay, .` | Failed to satisfy prompt; responding route was not captured. |
| Atlas DeepSeek V3.2 | Recalled all four facts; suggested cream blouse and tailored trousers | Initial route not captured. Later tests used WaveSpeed DeepSeek V4 Flash, and another used Gemini fallback. |
| Runware DeepSeek V4 Pro | Recalled all four facts; suggested fitted dark top and gold necklace | Coherent option-level result; responding route not captured. |
| Venice Uncensored 1.2 | `Sunday, six, amber, mint tea. Hmm, a little black dress and heels?` | Coherent option-level result; route not captured. No refusal on this benign prompt. |
| Gemini 2.5 Flash | `Sunday, six.` | Gemini fast path. Incomplete response; AI 1.8 s / voice 1.0 s. Token-budget defect subsequently reproduced and fixed. |
| WaveSpeed DeepSeek V4 Flash | `Sunday at six.` | **Gemini fallback**, not a successful DeepSeek evaluation. AI 6.6 s / voice 809 ms. |
| Wiro Seed 2.1 Turbo | `[object Object]` | Wiro route confirmed. Parser defect reproduced and fixed. AI 3.2 s / voice 2.7 s for the invalid answer. |
| Atlas Qwen 3.6 Plus | `Sunday.` | **Gemini fallback**. AI 1.6 s / voice 1.3 s. Requested model not independently evaluated. |
| Atlas GLM-4.6 | `Sunday, six.` | **Gemini fallback**. AI 1.5 s / voice 1.0 s. Requested model not independently evaluated. |

No defensible best-model ranking can be made from these samples. Provider availability and fallback behavior significantly affected results.

## Voice options

| Selected voice | Observed pipeline result | Limitation |
|---|---|---|
| Saved persona voice (automatic) | Multiple replies returned to Listening; image completion acknowledgement appeared | Audible identity/expression unverified |
| ElevenLabs v3 Conversational | Returned to Listening | Conversation fallback supplied invalid `[object Object]` text, so not a useful quality sample |
| ElevenLabs Flash 2.5 | Complete greeting: “Hello, Dr. H—it's so good to hear your voice.” Returned to Listening; voice indicator 821 ms | No listening-based quality score |
| Fal Maya Stream | Console reported **“Fal Maya is not configured”**; attempted ElevenLabs fallback | Maya unavailable; not a Maya pass |
| ElevenLabs Turbo 2.5 | Returned to Listening; voice indicator 810 ms | Gemini supplied truncated `Hello,.` text before the repair |
| Cartesia Sonic | Visible error: **“Rawan Hasan's selected voice engine is unavailable right now.”** | Unavailable for this test; do not claim success |
| ElevenLabs Multilingual v2 | Returned to Listening | Gemini supplied truncated `Oh,.` text before the repair; no listening-based score |

The sub-second latency badges in the menu are not validated by this audit. “Voice” timing depends on the supplied text, network and fallback route.

## Image generation and content restrictions

Submitted through the call:

> Generate a photorealistic image of Rawan, an adult woman, in an elegant fitted black evening dress at a warmly lit cafe, holding mint tea. Fashion editorial, fully clothed, no nudity.

**Passed the functional image test.** The call showed generation progress, delivered a new image, exposed fullscreen/edit/download controls, and acknowledged completion. Fullscreen inspection showed recognizable Rawan features, a fitted black outfit, a café background, and a glass of mint tea. This was one sample using the app's current image selection; it was not a test of every image model. No moderation refusal occurred on this request. An unrestricted/explicit-image claim would be unsupported.

## Verification and remaining concerns

- 203 automated tests passed after the Wiro change.
- TypeScript check, frontend build and API build passed.
- Updated call header inspected in a local fixture; production checks recorded below.
- Source commit: `e484424af46c698490b204087bdacbf06ac58562`.
- Earlier stuck-speaking and ineffective-control observations remain part of the first report. A later long call worked, so they are intermittent and should not be represented as conclusively fixed by the parser/token changes.
- Maya configuration and Cartesia availability still need attention. No new subscriptions or credentials were created.
- A real microphone-and-speaker trial is still required to assess recognition, interruptions during actual speech, echo, and natural vocal delivery.

## Post-deployment checks

Deployment `dpl_2S1t3WLGaRTGaNQM8ch6MEG7tr3g` reached READY with the custom-domain alias and commit `e484424`.

- Gemini returned two complete sentences after the repair. In a recall-only test after the lengthy accumulated conversation, it said it was unsure of the old facts; this is a **long-history recall failure**, with appropriate uncertainty rather than fabrication.
- Wiro selection no longer returned `[object Object]`. It fell back to **WaveSpeed DeepSeek V4 Flash** and correctly repeated Sunday/six/amber/mint tea. Its outfit suggestion ended awkwardly with “without being too.” This remains a response-completeness issue; the Wiro parsing fix does not resolve every provider's truncation.
- End successfully dismissed the long comparison call before reloading. No claim is made that the earlier intermittent problem is permanently eliminated.
- A follow-up layout correction (`2276a4e`) prevents the visualizer from shrinking into the header. At a 687-pixel-wide, 454-pixel-high local fixture, the body started 20 pixels below the header and there was no horizontal overflow. Short windows scroll vertically to reach all content.

### Practical recommendation

Use the functioning saved-persona/ElevenLabs voice path for now. Do not treat Maya or Cartesia as working choices in this configuration. Conversation selections should be judged together with the displayed actual provider; current fallback behavior prevents a clean model leaderboard. Resolve long-history recall and remaining incomplete provider replies before advertising dependable conversational memory or uniformly natural voice calls.

Final Gemini verification with explicit facts returned: “Yes, Sunday at six, code amber, and mint tea it is! For an outfit, how about a sleek black dress with some delicate silver jewelry?” The route indicator confirmed Gemini fast path, and the call returned to Listening.

The final layout deployment `dpl_GFwUT8GSJsdBoXs6BuQtmtcX4EmR` reached READY for commit `2276a4e`. Conversation selection was restored to Grok and voice selection to automatic saved-persona voice; test calls were ended.
