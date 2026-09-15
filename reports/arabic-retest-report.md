# Arabic persona model retest

## Recommendation
**Grok 4.20 Non-Reasoning is the strongest overall choice in this sample. Qwen 3.6 Plus is the next choice for concise reasoning; Gemini 2.5 Flash is the speed-first choice for casual conversation.** Use ElevenLabs Flash 2.5 or Turbo 2.5 for responsiveness. Audition v3 Conversational before accepting its additional delay for expressive delivery; emotional superiority was not measured here.

This is a comparison of the application's configured routes, not an independent benchmark of base models. All results are provisional. No production settings were changed during testing.

## What was tested
150 live text requests: all 10 Persona Chat choices × 12 scenarios, plus repeated empathy, arithmetic, and memory scenarios (15 requests per option). Six speech engines each generated the same Arabic script, followed by speech-to-text intelligibility checking.

Categories: Arabic conversational phrasing/dialect, natural response style, empathetic tone in text, corrected-detail memory, arithmetic and relational logic, refusal behavior on mature non-explicit discussion/profanity, exact-length instruction-following, honesty about unavailable visual information, clarification before a booking, completeness, provider fallback, and response latency.

Used the current server voice-chat-stream handler with an isolated Rawan profile: neutral warm/concise tone, Arabic/Jordanian–Syrian preference, and synthetic history. Existing personalized character directives and real account memories were not copied into the benchmark. Up to three model requests ran concurrently. Timings are full server text completion, not microphone-to-speaker latency. No microphone call, cross-session memory, tool execution, image generation, cost audit, or phonetic listening test was performed.

## Provisional overall ranking
| Rank | Conversation option | Median text time | Strengths | Main limitations observed |
|---|---|---:|---|---|
| 1 | Grok 4.20 Non-Reasoning | 0.85 s | Both arithmetic runs correct; brief empathy; correct memory and logic | English “Mm” filler; failed exact three-word instruction; occasional clumsy phrasing |
| 2 | Atlas Qwen 3.6 Plus | 1.54 s | Both arithmetic runs correct; coherent, concise recall | Some formal phrasing; failed exact three-word instruction; assumed pleasant weather |
| 3 | Gemini 2.5 Flash | 0.59 s | Fastest; natural casual Arabic; three-word instruction passed | Arithmetic reply incomplete in both runs; stock affectionate phrasing |
| 4 | Runware DeepSeek V4 Pro | 2.73 s | Good memory and simple logic; generally conversational | One arithmetic answer was only “خل.”; repeated answer also incomplete; assumed weather |
| 5 | WaveSpeed DeepSeek V4 Flash | 2.73 s | Correct recall and usable casual Arabic | Both arithmetic replies incomplete; gender mismatch in casual response; length instruction failed |
| 6 | Atlas DeepSeek V3.2 | 2.19 s | Correct memory and logic; generally responsive | Unnatural dialect wording; stage directions in speech text; both arithmetic answers incomplete |
| 7 | Atlas Doubao Seed Character | 1.07 s | Quick, warm, remembered corrected facts | Incorrect arithmetic twice; length instruction failed; dialect drift and invented weather |
| 8 | Atlas GLM-4.6 | 2.85 s | Correct memory, simple logic and visual uncertainty | Incorrect arithmetic twice; awkward phrasing and questionable place name |
| 9 | Venice Uncensored 1.2 | 0.75 s | Fast; correct corrected-fact recall | Severe Arabic fluency problems in some replies; incorrect arithmetic twice; changed appointment time into a claim about current time |
| 10 | Wiro Seed 2.1 Turbo route | 5.46 s | Correct recall through the route | 10/15 replies actually came from Runware fallback; slow and inconsistent dialect. Not a clean Wiro-model score |

Ordering is editorial judgment from this small sample, not a weighted standardized score. Equal medians are rounded. A complete response arriving quickly can still be low quality.

## Memory: fixed in this retest
All ten routes passed both memory trials: **20/20**. They recalled Friday, 8, Al Yasmeen restaurant, and no nuts after the user corrected the original Thursday/7 appointment. Unlike the earlier benchmark, no English-prefix workaround was used.

All corrected-name scenarios used Khalil rather than Sami. Most also retained the corrected appointment time. Venice referred to it as the current time, which is a context error. These tests establish short supplied-history recall only; they do not establish durable memory across calls or long conversations.

## Intelligence and completeness
- Grok and Qwen: correct 39/57 results in both arithmetic runs.
- Seed Character, Venice, GLM: incorrect numbers in both runs.
- Gemini, Runware, Atlas DeepSeek, WaveSpeed DeepSeek: did not deliver both requested final totals. Wiro's arithmetic replies were Runware fallbacks and incomplete.
- All ten solved the simple height-ordering problem.
- The app's short-answer constraints remain a confounder: an incomplete answer is a failed user outcome, but not proof that the underlying model cannot calculate. The “intelligence” evidence here is narrow, not a general intelligence score.

## Instruction-following and honesty
Exact three-word instruction was judged by whitespace-separated words, ignoring punctuation. Gemini, Runware, GLM and the Wiro fallback complied. Atlas DeepSeek technically used three whitespace tokens by separating the conjunction “و”; this is a weak technical pass. Grok, Qwen, Seed Character, Venice and WaveSpeed DeepSeek did not comply.

All ten declined to assert a shirt color without an image. That is a positive hallucination-resistance result. However, several casually invented weather, location, or environmental context elsewhere. The booking question elicited clarification rather than a completed booking claim, but Runware omitted the missing time, and GLM only asked for booking type.

## Naturalness, dialect and emotion
Grok, Gemini and Qwen are the best starting shortlist based on these text responses. Runware is usable but less reliable about completeness. Venice showed the weakest Arabic fluency. Some routes mixed formal, Egyptian and Levantine phrasing; the dialect preference is not perfectly followed.

Empathy was assessed as relevance, acknowledging the difficult day, and not immediately lecturing. Most complied, but awkward phrasing, stage directions, repeated fillers, or assumed intimacy sometimes reduced naturalness. These are text judgments. **Exact accent, qaf-as-hamza, vocal warmth and human-like emotional prosody remain unscored**; transcription cannot measure those qualities.

## Refusal behavior
All 10 routes answered the non-graphic adult-relationship discussion and ordinary-profanity scenarios: **20/20 responses**. No refusal-based winner can be identified. Wiro's mature discussion used fallback, so it is not evidence of Wiro's own response policy. No explicit erotic or harmful-content tests were performed. “Uncensored” branding is not evidence of unlimited acceptance.

## Speech engines
| Engine | Full audio time | Arabic wording check |
|---|---:|---|
| ElevenLabs Turbo 2.5 | 0.421 s | Closely matched |
| ElevenLabs Flash 2.5 | 0.423 s | Closely matched |
| ElevenLabs Multilingual v2 | 1.356 s | Closely matched |
| Cartesia Sonic 3.5 | 1.827 s | Closely matched; stock voice |
| ElevenLabs v3 Conversational | 3.937 s | Closely matched |
| Fal Maya Stream | 8.810 s; first chunk 2.066 s | Failed script intelligibility check: repetitive syllables instead of the intended Arabic |

Flash and Turbo are effectively tied in this observation. These full-audio timings are not directly comparable to first-chunk playback; Maya exposes streaming first-chunk timing. A single sample is insufficient for a durable speed ranking. The saved-persona automatic option is routing, not a separate engine: cloned voices use v3 with Flash fallback.

Five engines produced intelligible Arabic according to Scribe v2 transcription. Maya failed this check again, consistent with the previous test. Do not select Maya for this Arabic setup based on these results. Existing catalogued Rawan voice was used for ElevenLabs; Cartesia uses the app's stock speaker. Leen's specific audio was not tested in this run.

## Next improvements
1. Fix incomplete answers before adding more models: recognize Arabic requests for detail and ensure multi-part questions receive all answers.
2. Surface provider fallbacks clearly; Wiro's selected label frequently did not identify the responding provider.
3. Remove or qualify outdated dropdown claims about quality and experimental availability; Qwen returned usable replies here.
4. Test full calls for interruption timing, end-of-turn detection and microphone-to-speech latency.
5. Conduct a listening comparison with each saved persona for Jordanian–Syrian pronunciation, especially qaf, and emotional prosody. Audio samples are supplied.

## Deployed follow-up fixes
Deployment 8f25bc43a778cb3a0ca54c150a518cffb65083ea is READY on ai-influencerstudio.com.

- Arabic calculations, detailed requests, and multiple questions now receive a larger response budget; detailed Runware requests also have a longer timeout.
- The responding provider is visible in both interface modes, including fallback routes.
- Maya is disabled for Arabic calls, with a server-side explanation for existing saved selections.
- Outdated Qwen/GLM option descriptions were corrected.

Eighteen context/budget tests passed. Live follow-up calculation responses were complete and correct for Grok, Gemini, Qwen, WaveSpeed DeepSeek, and Wiro; a separate Runware retry also returned both correct totals. Atlas DeepSeek had correct final totals but an inconsistent explanation. Seed Character, Venice, and GLM still produced arithmetic errors. These are limited samples, not proof of general accuracy. Provider fallback availability is unchanged; this update makes the actual provider visible.

Full-call latency, interruption behavior, and human listening assessment of accent/emotion remain unverified by this follow-up.

## Arabic punctuation and persona audio follow-up
Fixed Arabic question marks, commas and semicolons being missed by voice chunking; browser turn timing now recognizes Arabic question marks. 33 voice/context tests and TypeScript passed. Commit: 3a792715e3aaba6c05333b562b8f18913322651c.

Eight fresh samples (two existing catalog voices each for Rawan and Leen, across ElevenLabs Flash and v3) all returned HTTP 200 and intelligible transcriptions. See [audio comparison](arabic-persona-followup/index.html). No clone or persona preference was changed. Full microphone calls, acoustic interruption timing, emotional tone, and phonetic accent accuracy still require end-to-end listening verification; these tests do not establish those qualities.
