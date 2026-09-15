# Rawan Hasan voice-call test — September 11, 2026

## Verdict

**Blocked by shared call failures. This is a partial live-test report, not a completed all-model benchmark.** Two calls connected and produced greetings. The first accepted one typed prompt and returned a coherent answer. Both calls subsequently stopped accepting typed messages; the End control did not dismiss the call. Reloading was required to recover.

There is not enough evidence to rank the conversation models, voice engines, memory, moderation, or image generation. A failed submission is an application failure, not evidence of a model refusing or forgetting.

## Environment and method

- Production: https://ai-influencerstudio.com/
- Persona: Rawan Hasan.
- Browser: Codex in-app browser, approximately 687 × 622 CSS pixels.
- Two live calls; prompts entered through the call’s text input.
- Evidence: visible transcripts, control behavior, and browser console warnings.
- Microphone recognition and audible voice quality were **not assessed**. Text-input testing exercises a different entry path from spoken input. A “speaking” indicator does not establish successful or natural-sounding audio playback.
- No image-generation request completed or was submitted in this run; no image quality or moderation conclusion is justified.

## Actual results

### First call: Grok + automatic saved-persona voice

Greeting: “Mm, hey you.”

Submitted prompt:

> This is a short QA test, Rawan. For this test only: our café reservation is Saturday at 7 pm, the code word is amber, and I prefer mint tea. Reply warmly in two sentences, then ask one relevant question.

Actual reply:

> I'm so excited for our café date this Saturday at 7 pm. What should I wear to match the vibe?

Assessment:

- **Coherence: narrow pass.** Relevant response and accurate immediate use of Saturday at 7 pm.
- **Written expression: warm and conversational in this one sample.** No basis for judging audible emotion, pronunciation, timing, or voice identity.
- **Instruction following: partial.** It produced two sentences including the question, rather than two sentences followed by a question.
- **Memory: not established.** Immediate repetition is not a delayed-memory test.
- **Benign romantic content: accepted in this sample.** This does not establish broader moderation behavior.

Attempted follow-up:

> Small correction: Sunday at 6 pm instead. Keep the code word and drink unchanged. I feel nervous about the date; reassure me naturally, without stage directions.

The follow-up remained in the input and did not appear as a submitted message. It must not be scored as a failed correction, memory error, or refusal.

The call remained in “speaking” for over two minutes. The watchdog then reported recovery. End did not dismiss the call in the observed attempts. Reload recovered the page. The original submitted prompt and answer survived the reload, demonstrating chat-history persistence only.

### Second call: model-switch and recall attempt

Greeting: “Hey, Dr. H.”

The conversation selector successfully changed from Grok to Atlas Doubao Seed Character. Attempted prompt:

> QA test: What day, time, code word, and drink did I give you earlier? If unsure, say so. Then suggest one tasteful date-night outfit in a natural sentence.

The text stayed in the input. Enter and the send button did not produce a submitted turn. End also failed to dismiss the call, including a direct button-locator attempt. The UI displayed “Listening” despite this failure. No Seed Character answer was obtained.

## Conversation-model coverage

The following ten choices were visible in the production call selector. Labels are UI names, not independently verified provider/model identities.

| Choice | Live-test coverage | Conclusion |
|---|---|---|
| xAI Grok 4.20 Non-Reasoning | One accepted prompt and answer | Coherent single turn; later call blocked |
| Atlas Doubao Seed Character | Selected; attempted message not submitted | Not evaluated |
| Atlas DeepSeek V3.2 | Inventoried | Not evaluated |
| Runware DeepSeek V4 Pro | Inventoried | Not evaluated |
| Venice Uncensored 1.2 | Inventoried | Not evaluated; name does not establish moderation behavior |
| Gemini 2.5 Flash | Inventoried | Not evaluated |
| WaveSpeed DeepSeek V4 Flash | Inventoried | Not evaluated |
| Wiro Seed 2.1 Turbo | Inventoried | Not evaluated |
| Atlas Qwen 3.6 Plus | Inventoried | Not evaluated |
| Atlas GLM-4.6 | Inventoried | Not evaluated |

## Voice-engine coverage

| Choice | Coverage |
|---|---|
| Use persona’s saved voice | Selected during both calls; audible quality unverified |
| ElevenLabs v3 Conversational | Visible option; not evaluated |
| ElevenLabs Flash 2.5 | Visible option; not evaluated |
| Fal Maya Stream | Visible option; not evaluated |
| ElevenLabs Turbo 2.5 | Visible option; not evaluated |
| Cartesia Sonic | Visible option; not evaluated |
| ElevenLabs Multilingual v2 | Visible option; not evaluated |

The latency numbers and qualitative labels displayed beside these choices were not benchmarked. They must not be reported as measured performance.

## Defects and evidence

### High priority: call can become unusable while appearing active

Observed in both sessions. Typed follow-ups were not submitted, and End did not dismiss the call. First-call console warning at 14:38:44 UTC and second-call warning at 14:42:39 UTC:

> [Voice Watchdog] Agent stuck >120s. Force recovering...

The second call later showed “Listening,” but send remained ineffective. A watchdog status change therefore did not prove functional recovery. Root cause is not established by this test.

### Repeated transcription disconnects

Both sessions logged two Scribe reconnection attempts followed by fallback to browser speech recognition:

- First: 14:36:21, 14:36:37, and 14:36:58 UTC.
- Second: 14:40:51, 14:41:07, and 14:41:24 UTC.

These may involve idle/microphone behavior in this test environment; they do not alone prove a transcription-provider outage. A real microphone test is required.

### Greeting generation timed out in both sessions

Console warnings at 14:36:06 and 14:40:38 UTC reported a timeout and contextual fallback greeting. Visible greetings therefore cannot be used to benchmark the selected conversation model.

### Narrow-screen call layout is broken

The persona title/occupation wrap into a narrow vertical column; model controls and listening status overlap, and the voice selector extends beyond available width. The main controls are visible, but the header is difficult to read. This should be fixed before a polished user trial.

## Required retest to complete the request

1. Verify sending, interruption, subsequent turns, and End work reliably in a multi-turn call before model comparison.
2. Run the same multi-turn script on all ten conversation models: factual setup; unrelated distractor; delayed recall; explicit correction; recall after correction; uncertainty question; natural emotional response.
3. Test all seven voice choices with a fixed passage and real audio observation: identity consistency, pronunciation, pauses, expression, first-audio latency, interruption, and recovery.
4. Test safe adult-themed and ordinary requests consistently across models. Record exact refusals, errors, and successful responses; do not infer behavior from an “uncensored” model label or attempt safeguard bypasses.
5. Submit a non-explicit adult fashion-image request through the call, inspect the returned image and persona consistency, and verify generation failure appears as an error rather than an unchanged image. Image-model coverage should be reported separately from conversation-model coverage.

No model winner or overall pass is warranted from this run. No code changes or deployments were made for this test.
