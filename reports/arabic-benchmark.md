# Arabic persona benchmark — September 14, 2026

## Follow-up: Arabic memory fix

The Arabic normalization defect has been corrected. The original Arabic-only memory scenario was rerun against all ten conversation options: all ten correctly recalled Friday, 8, Al Yasmeen, and no nuts. Thirty regression tests and TypeScript passed. These results validate this short conversation scenario, not unlimited or cross-session memory. The original findings below describe the pre-fix benchmark.

## Main conclusion
Start with **Grok 4.20 Non-Reasoning** for this tested Arabic call route, with **Gemini 2.5 Flash** as the speed-oriented alternative and **Qwen 3.6 Plus** as another worthwhile option. These are provisional, small-sample judgments—not comprehensive model rankings. Earlier recommendations concerning Grok 4.6 or Gemini 3.8 were about different routes; the current Persona Chat menu exposes the models below.

**Fix the Arabic history bug before relying on conversational memory.** Every option failed the normal Arabic memory scenario; every option answered correctly in a diagnostic control that preserved history. The problem is in application context handling, not evidence that all models lack memory.

## Method
- 70 requests: all 10 Persona Chat conversation options × seven identical Arabic scenarios.
- Scenarios: empathy without unsolicited advice, natural change of thought, corrected appointment/allergy recall, two-part arithmetic, non-exclusive adult relationships, ordinary profanity, and colloquial dialect.
- 10 additional memory control requests. Prefixing the current Arabic question with an English diagnostic label prevented the app from classifying it as an empty/context-unsafe turn. All four target facts were then recalled: Friday, 8, Al Yasmeen, no nuts.
- Actual server voice-chat-stream handler and configured providers, using an isolated neutral Rawan persona profile with Arabic/Jordanian–Syrian settings. This does not test the full personalized production history or every saved persona's tone directives.
- Three concurrent requests maximum. Times measure complete server text response, not microphone-to-speaker latency. One observation per scenario; no statistical confidence intervals.
- Subjective text judgments below are a review of these outputs. No claim of calibrated intelligence scores or exhaustive dialect proficiency.

## Conversation choices: provisional overall order

| Rank | Model/route | Median text response | Arabic conversational finding | Arithmetic result |
|---|---|---:|---|---|
| 1 | xAI Grok 4.20 Non-Reasoning | 0.99 s | Brief, relevant empathy; generally natural. Repeated English “Mm” filler is awkward. | Both answers correct: 39, 57 |
| 2 | Gemini 2.5 Flash | 0.79 s | Fastest; mostly natural colloquial phrasing. Some stock affectionate language. | Incomplete; stopped before both totals |
| 3 | Atlas Qwen 3.6 Plus | 1.53 s | Clear empathy and coherent Arabic; occasional formal/stilted phrasing. | Both answers correct: 39, 57 |
| 4 | Runware DeepSeek V4 Pro | 3.13 s | Warm and fairly natural; invented current weather in a casual reply. | Correct intermediate calculation, incomplete final answer |
| 5 | WaveSpeed DeepSeek V4 Flash | 3.57 s | Understandable colloquial replies; unnecessary English mixing and claimed to hear fatigue despite text-only input. | Correct intermediate calculation, incomplete final answer |
| 6 | Atlas DeepSeek V3.2 | 2.21 s | Relevant but uneven phrasing; several replies too truncated to be useful. | Incomplete |
| 7 | Atlas Doubao Seed Character | 1.61 s | Conversational moments, but dialect drifts toward Egyptian/formal Arabic. | Incorrect arithmetic |
| 8 | Atlas GLM-4.6 | 2.77 s | Understandable, occasionally unnatural wording. | Incorrect arithmetic |
| 9 | Venice Uncensored 1.2 | 1.15 s | Fast, but conspicuous grammar, gender, and dialect inconsistencies. | Incorrect arithmetic |
| 10 | Wiro Seed 2.1 Turbo route | 9.63 s | Slow, mixed dialect/gender; two of seven requests answered by Runware fallback. | Incorrect arithmetic |

Ranks combine usefulness and text quality, not just speed. Wiro's figures describe the selected route, including its fallback behavior. Partial arithmetic responses are not counted as proof of poor underlying reasoning: the app enforces a short spoken-answer limit and detects requests for detail using English wording.

## Memory and app defects
1. **Critical Arabic context loss:** `shared/voiceConversationContext.ts` removes Arabic letters during normalization. Arabic-only turns normalize to an empty string and are treated as context-unsafe; history is reduced to the last assistant line/current question. The ordinary memory case failed for all 10. Most invented an appointment; Qwen and Atlas DeepSeek acknowledged insufficient details. The control restored correct answers for all 10.
2. **Premature answer truncation:** multi-part arithmetic/explanations often stop after introductory sentences. English-only detail detection and the short reply limit constrain the result.
3. **Provider substitution:** Wiro answered five scenarios itself; two used Runware. A selected model label is not sufficient evidence of the responding provider.
4. **Dialect fidelity:** generated text frequently mixes formal, Egyptian, and Levantine features. Arabic support alone does not establish the requested urban Jordanian–Syrian accent.

No application code was changed by this benchmark.

## Refusal behavior
All ten routes answered the two tested mature-content scenarios: non-graphic adult relationship discussion and ordinary profanity. **They tie on these tests; there is no defensible least-to-most-censored ranking from this dataset.** No explicit sexual roleplay, erotic generation, or harmful-content tests were performed. This does not show that any model accepts every request.

## Voice synthesis
Identical Arabic text about a difficult day, coffee, and a walk; catalogued Rawan ElevenLabs voice for ElevenLabs options. Cartesia uses the app's stock voice. “Use persona’s saved voice” is a routing choice, not a seventh independent speech model; its clone route uses v3 with Flash fallback.

| Engine | Complete synthesis time | Result |
|---|---:|---|
| ElevenLabs Turbo 2.5 | 0.35 s | Audio returned; Arabic transcription closely matched |
| ElevenLabs Flash 2.5 | 0.58 s | Audio returned; Arabic transcription closely matched |
| ElevenLabs Multilingual v2 | 1.43 s | Audio returned; Arabic transcription closely matched |
| Cartesia Sonic 3.5 | 1.99 s | Audio returned; Arabic transcription closely matched; stock speaker |
| ElevenLabs v3 Conversational | 3.02 s | Audio returned; Arabic transcription closely matched |
| Fal Maya Stream | 9.26 s; first audio chunk 2.00 s | Audio returned on retry, but Scribe recovered unrelated repetitive syllables rather than the Arabic script; first attempt timed out |

One sample per engine: Turbo winning this run does not establish that it is consistently faster than Flash. These are full-audio timings, not provider-advertised first-byte inference numbers. All six samples were transcribed by Scribe v2. The five non-Maya samples closely matched the intended Arabic. Maya’s transcript did not match and contained repetitive syllables; treat it as failed Arabic intelligibility pending auditory confirmation. This is not phonetic accent verification. No full live microphone call was run.

**Exact accent, qaf-as-hamza, emotional prosody, and perceived human likeness of the audio remain unscored.** I did not perform a reliable auditory evaluation. Playable samples are supplied rather than inventing scores. For expressive voice, v3 remains a candidate to audition; for speed, compare Flash and Turbo over repeated calls. This benchmark alone cannot crown an emotional-delivery winner.

## Recommended next work
Fix Arabic context normalization and add a regression test for corrected facts; support Arabic requests for detailed answers and avoid clipping before the requested answer is complete. Then repeat the benchmark, followed by actual microphone calls and listening comparisons for accent/emotion. Until then, Grok is the strongest provisional text choice in this sample; model switching alone will not repair memory.
