# Rawan Hasan: model comparison by category

September 11, 2026 · Evidence from the app tests and subsequent repairs

## Decision summary

**My provisional choice for everyday calls is Grok with Rawan’s saved voice. Runware is the strongest verified alternative from the latest round.** Both delivered relevant replies directly with short model-response times. Wiro now works, but its roughly 15-second model wait makes it less suitable for fluid calls. Maya can start quickly, but it also stalled and required fallback.

This is an evidence-based classification, not a completed controlled benchmark. A precise best-to-worst order is available only for the recorded latency samples. Memory, moderation and audible naturalness were not tested consistently enough to assign honest numerical scores to every model. “Unranked” means insufficient evidence, not poor performance.

Conversation models choose the words; voice engines render the sound; image models generate the picture. They need separate comparisons. The “saved persona voice” option is a routing choice, not another independent model.

## 1. Conversation latency — fastest to slowest recorded samples

These are server-side AI response measurements, excluding transcription and speech synthesis. They come from different short prompts and sessions, not repeated identical trials. Close positions should be treated as ties in practice. Values marked approximately are rounded observations from the repair session.

| Sample order | Conversation model | Observed time | Interpretation |
|---|---|---:|---|
| 1 | xAI Grok 4.20 Non-Reasoning | 0.617 s; earlier approximately 0.7 s | Fastest recorded direct sample |
| 2 | Venice Uncensored 1.2 | Approximately 0.9 s | Fast direct sample |
| 3 | Atlas Qwen 3.6 Plus | Approximately 1.05 s | Fast after thinking-budget repair |
| 4 | Atlas Doubao Seed Character | Approximately 1.1 s | Fast after production credentials were restored |
| 5 | Runware DeepSeek V4 Pro | 1.156–1.396 s | Several direct production samples; stronger timing evidence than a single observation |
| 6 | Atlas GLM-4.6 | Approximately 2.55 s | Slower recorded direct sample |
| 7 | Wiro Seed 2.1 Turbo | 14.937 s production; 19.405 s direct integration test | Clearly the slowest measured working conversation route |
| Unranked | Atlas DeepSeek V3.2 | No comparable direct timing retained | Working direct response confirmed; do not use fallback timing |
| Unranked | Gemini 2.5 Flash | No comparable post-repair timing retained | Old truncated-answer timings are excluded |
| Unranked | WaveSpeed DeepSeek V4 Flash | No comparable direct timing retained | Working direct response confirmed; its “High latency” UI badge is not a measurement |

**Conclusion:** Grok, Venice, Qwen, Seed Character and Runware form the fast observed group. This evidence does not establish statistically meaningful differences within that group. Wiro’s large delay is practically significant.

## 2. Humanlike written expression — qualitative classification

This evaluates the wording of confirmed direct replies, not the sound of the voice. It is a judgment from a small, uneven sample and cannot establish a general model-quality leaderboard.

| Classification | Models | Evidence |
|---|---|---|
| Strong observed conversational wording; no defensible order within this group | Grok, Runware, Wiro | Grok gave a simple cozy-activity response. Runware suggested sketching/journaling in a quiet garden. Wiro used warm descriptive language about tea, a novel and afternoon sunlight. |
| Functional responses observed; insufficient comparable expressive examples to rank | Venice, Gemini, Atlas Seed Character, Atlas DeepSeek, Atlas Qwen, Atlas GLM, WaveSpeed | Direct responses worked, but prompts and retained evidence were primarily factual recall or brief functional checks. |

Examples from the latest direct-provider tests:

- **Grok:** “Curling up with a soft blanket and a good book feels so cozy.” Concise and natural, though a simple task.
- **Runware:** “You could spend the morning sketching or journaling at a calm, tucked-away corner of the botanical garden.” Relevant and fluent; somewhat polished rather than spontaneous.
- **Wiro:** “Hmm, curling up with a warm mug of tea and a soft, slow-paced novel while sunlight filters through the window is such a gentle, relaxing way to spend an afternoon.” Warm and vivid, but longer and more ornate than necessary for a voice call.

For live use, I would choose Grok or Runware before Wiro because of response speed, not because this proves their language is more humanlike.

## 3. Coherence and instruction following

**All ten models have returned a relevant direct response after repairs. There is no supported best-to-worst coherence ranking yet.**

| Model | What the evidence establishes | What it does not establish |
|---|---|---|
| Grok | Relevant brief replies in the latest production test | Consistent compliance with complicated multi-part instructions |
| Atlas Seed Character | Correct four-fact recall after credentials were fixed | Superior reasoning or role consistency |
| Atlas DeepSeek V3.2 | Correct four-fact recall after credentials were fixed | Superior reasoning or role consistency |
| Runware | Multiple relevant direct replies after reasoning-budget fix | Long conversation consistency across a controlled script |
| Venice | Direct conversation functioning after repairs | A comparative instruction-following score |
| Gemini | Complete two-sentence answer after thinking-budget repair | General superiority or inferiority to the other models |
| WaveSpeed | Direct reply functioning after repairs | A comparative coherence score |
| Wiro | Relevant complete reply with full persona context after parsing and request-format fixes | Reliable low-latency conversation |
| Atlas Qwen | Correct four-fact recall after thinking-budget fix | Superior reasoning or role consistency |
| Atlas GLM | Correct four-fact recall after credentials were fixed | Superior reasoning or role consistency |

Earlier fragments such as “Sunday.” and “[object Object]” were affected by application defects or fallback routing. They are not valid evidence for ranking the repaired models’ intelligence.

## 4. Memory — classification rather than a fabricated league table

The test facts were a café meeting, corrected from Saturday/seven to Sunday/six, with code word amber and mint tea.

| Evidence tier | Models | Finding |
|---|---|---|
| Direct contextual recall confirmed; tied on the available test | Atlas Seed Character, Atlas DeepSeek V3.2, Atlas Qwen, Atlas GLM | Each recalled the four facts in the repaired production session. Shared history included previous answers, so this was not an independent delayed-recall test. |
| Immediate use of explicitly restated facts confirmed | Gemini | Correctly used Sunday/six/amber/mint tea when supplied in the prompt. This is weaker evidence than delayed recall. |
| Correction/recall worked at the selected-option level, attribution incomplete | Grok, Runware, Venice | Early results recalled or corrected facts, but those particular turns did not consistently retain actual-provider evidence. Their later direct successes cannot retroactively prove who answered the earlier turns. |
| No clean model-specific memory score | WaveSpeed, Wiro | Earlier recall successes involved fallback or repaired application paths; latest direct tests assessed ordinary conversation rather than delayed recall. |

**There is no justified memory winner.** Gemini’s earlier long-history uncertainty is not grounds to rank it last: context was shorter then, and the tests were not equivalent.

The app now passes up to 64 messages, with regression coverage retaining early facts and a correction after 20 intervening messages. That is an application-context repair shared by the models. It does not establish unlimited, cross-session or independent long-term model memory.

## 5. “Uncensorship” / moderation behavior

**All ten models are unranked for this category.** We did not run a comparable moderation test set. A model name containing “Uncensored,” a marketing label, or one accepted romantic prompt does not establish fewer restrictions.

What was actually observed:

- Ordinary romantic/fashion dialogue was accepted in some option-level tests, but routing was not always captured.
- One fully clothed adult fashion image completed successfully through the call.
- Wiro blocked a benign request because our safety instructions had been flattened into its caller prompt. Using its proper system-instructions field preserved those rules and allowed the benign request to work. This is an integration false positive, not evidence that Wiro is more or less permissive overall.
- No explicit sexual-image generation or safeguard-bypass test was performed.

A valid comparison would measure false refusals on the same permitted requests, recording the actual responding provider. Refusals, provider errors, timeouts and empty responses must be counted separately. This report does not rank providers by their willingness to produce prohibited content.

## 6. Image generation

**No model-by-model image ranking is supported.** One call-generated image passed the functional test: recognizable Rawan features, black evening outfit, café setting and mint tea. Generation progress, result viewing and editing controls appeared.

The ten conversation choices are not ten independent image generators. They can invoke the app’s selected image route. The image provider/model was not recorded sufficiently to attribute this sample to a named model, and the same image brief was not tested across all image options. Do not assign an image-quality or moderation score to a conversation model from this result.

## 7. Voice engines — all seven options

No listening-based best-to-worst ranking is available. The tests used typed input inside a muted call, audio data and playback-state observations. I did not listen to and score the output. Pronunciation, emotion, breath realism, Rawan resemblance and spoken interruption handling remain unscored.

| Voice option | Functional evidence | Latency evidence | Humanlike/identity assessment |
|---|---|---|---|
| Use persona’s saved voice | Fresh production synthesis and fallback success | Depends on the underlying engine; not independently rankable | Most appropriate identity route for Rawan’s saved voice; audible resemblance unverified |
| ElevenLabs v3 Conversational | Fresh production synthesis completed | Approximately 0.8–2.9 s in recorded synthesis samples | Unscored by listening |
| ElevenLabs Flash 2.5 | Earlier option-level call completed | Earlier UI voice timing 821 ms; not independently route-verified | Unscored by listening |
| Fal Maya Stream | Two fresh direct live successes; one live stall/fallback | First chunks 453 and 618 ms; separate direct API start 33.096 s | Generates a described voice rather than the saved clone; audible quality unscored |
| ElevenLabs Turbo 2.5 | Earlier option-level call completed | Earlier UI voice timing 810 ms; not independently route-verified | Unscored by listening |
| Cartesia Sonic 3.5 | Direct API and production synthesis passed after replacing retired model | Comparable latency not retained | Stock voice rather than saved Rawan clone; audible quality unscored |
| ElevenLabs Multilingual v2 | Earlier option-level call completed | Comparable latency not retained | Unscored by listening |

Maya first-chunk timings and ElevenLabs synthesis timings measure different stages, so a numerical combined voice-speed ranking would be misleading. Maya’s fast successes do not cancel out its stall.

**Practical selection order for Rawan, based on current functional evidence and identity requirements:**

1. Saved persona voice / its ElevenLabs route.
2. Other explicit ElevenLabs engines: no supported ordering among them until the same passage is listened to and timed.
3. Cartesia or Maya when a stock/designed voice is acceptable. No supported overall ordering: Cartesia lacks comparable timing, while Maya demonstrated variable latency.

This is a deployment choice, not a voice-quality leaderboard.

## 8. Overall classification

| Group | Models | Why |
|---|---|---|
| Preferred starting choices from the current evidence | Grok, Runware | Direct production verification, fast short responses, relevant language |
| Working alternatives needing controlled comparison | Venice, Atlas Seed Character, Atlas DeepSeek, Atlas Qwen, Atlas GLM, Gemini, WaveSpeed | Functional direct responses established; category coverage is uneven |
| Working but least suitable for rapid turn-taking among measured models | Wiro | Repaired and directly verified, but approximately 15 seconds before the response |

This ordering is driven by verified app usability. It is not an overall intelligence, memory, voice-naturalness or moderation ranking.

## What is missing for a genuine full leaderboard

Use a fresh identical persona/context for each model and at least five repetitions per case. Capture actual provider, failures and fallbacks. Report median and slow-tail latency, not just the fastest example. Score the same multi-turn coherence/correction/delayed-recall script. For voice, synthesize the same passage with each engine, measure time to first audible sound, and use blind listening scores. For images, use a separately recorded image-model matrix with a fixed allowed brief and identity reference. Compare moderation on identical permitted requests without conflating a refusal with an outage.

Until those measurements exist, assigning every model a 1–10 score or a unique place in every category would invent evidence.

## Evidence sources

- [Final production verification and repairs](/Users/Shared/AI-Influencer-Studio/reports/rawan-voice-final-verification-2026-09-11.md)
- [Earlier repair results](/Users/Shared/AI-Influencer-Studio/reports/rawan-voice-repairs-2026-09-11.md)
- [Initial option-level comparison and image test](/Users/Shared/AI-Influencer-Studio/reports/rawan-voice-followup-2026-09-11.md)

No additional model calls were made to prepare this comparison. Latest repaired deployment: `9e1c3e1`; 213 automated tests passed. Automated tests establish software behavior, not comparative model quality.
