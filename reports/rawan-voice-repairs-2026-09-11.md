> Superseded by the [final verification report](/Users/Shared/AI-Influencer-Studio/reports/rawan-voice-final-verification-2026-09-11.md), which includes the later Wiro repair and successful production test.

# Rawan voice repairs — September 11, 2026

## Verified fixes

- Expanded the current-call context from 10 messages to 64. Regression test retains early facts and later corrections after 20 intervening messages. Greeting/acknowledgement protections still pass. This is bounded call context, not unlimited memory.
- Removed word-boundary clipping from spoken reply formatting. Replies now retain complete sentences instead of fabricating a period after a fragment.
- Restored missing production FAL_KEY, CARTESIA_API_KEY and ATLASCLOUD_API_KEY using the existing validated credentials, stored as production secrets.
- Replaced retired Cartesia sonic-english with sonic-3.5 and its current API version. Direct provider test returned 40,169 audio bytes. Live call completed successfully; production logs confirm Cartesia synthesis.
- Clarified that Cartesia uses a stock voice and Maya designs a voice rather than using the saved ElevenLabs clone.
- Disabled Qwen's internal reasoning for voice calls. Before: empty answer, finish=length. After: complete answer, finish=stop. Production call used Atlas Qwen directly and recalled all four test facts.
- All four Atlas models now respond directly in production: Seed Character, DeepSeek V3.2, Qwen 3.6 Plus and GLM-4.6. Previously, the missing production key forced fallback. Each recalled Sunday, six, amber, mint tea in the live call.
- Diagnosed Maya's additional 422 error: voice prompt exceeded 500 characters. Bounded voice description and added regression test. Direct test with long persona settings returned 143,360 PCM bytes.
- Maya errors now return an error before committing an audio-success response; diagnostics record validation field names without request content.

## Verification

209 automated tests pass. TypeScript check and frontend/API builds pass. Production verification confirmed direct Atlas, Grok, Venice and WaveSpeed replies, Cartesia synthesis, Maya audio output and bounded Maya timeout fallback.

## Limits

Audible humanlike quality and clone resemblance have not been assessed by listening. Returned audio bytes and call playback states are functional evidence only. No explicit imagery or safety-bypass tests were performed. Provider-specific moderation is not treated as a software defect.

## Additional findings

- The response-quality checker was rejecting repeated factual answers even when the caller requested recall, confirmation or a summary. Added an exception for those explicit requests, preserving other reply checks. Regression test passes.
- Live Venice and Grok each answered directly, with server generation times around 0.9 and 0.7 seconds on the sampled turns.
- Runware responded, but a repeated-answer quality check caused fallback; the recall fix addresses that false rejection.
- Wiro direct test still aborted after approximately 12 seconds, even with a longer overall wait requested. This remains an upstream availability/latency limitation, not a verified repair.
- Streaming Web Audio was only unlocked when Maya was selected at call start; interruptions also destroyed the unlocked context. Updated lifecycle to unlock at call start, preserve it during the call, and close it on End/unmount. The call starts and ends successfully. Maya returned audio in production; upstream first-chunk latency remained high, so it is now bounded by a 15-second per-chunk timeout.

Latest automated result: 209 tests pass.

## Final repair details

- Runware's empty answer was reproduced directly: HTTP 200 with finish=length and no answer. Its supported `reasoning_effort: none` setting returned a complete answer with finish=stop. Applied to the Runware voice route.
- Maya produced 233,472 and 110,592 PCM bytes in production, but first-chunk delays were 113 and 40 seconds. Added a tested 15-second no-chunk timeout and replaced the claimed 400ms latency with “Variable latency.” Live production verification then showed a timeout response followed by successful ElevenLabs speech, rather than a stuck call.
- Fixed the stale partial-transcript overlay remaining on screen after muting.
- Restored Grok and the saved persona voice after testing; test call closed.

## Remaining limits

Wiro still times out upstream. Its UI already marks it unreliable and the fallback path remains available. Maya is functional but has variable upstream queue latency; the timeout protects the call rather than making the provider faster. No software change can guarantee a model's coherence, durable recall outside the bounded context, voice resemblance, or availability on every request. Audible quality needs a listening assessment.

## Provider references

- [Cartesia current speech API](https://docs.cartesia.ai/api-reference/tts/bytes)
- [Cartesia Sonic 3.5](https://docs.cartesia.ai/build-with-cartesia/tts-models/latest)
- [Fal Maya streaming API](https://fal.ai/models/fal-ai/maya/stream/api)
- [Runware OpenAI compatibility](https://runware.ai/docs/platform/openai)


## Final deployment verification

Production deployment `dpl_61EwP73wsW8WrCzqcvsijquP2AFQ` is READY at commit `93408fd0d74d3a2141fc91e4feaa0fd88e05c61f`, with `ai-influencerstudio.com` assigned as an alias. The custom-domain Persona Chat page loaded successfully after refresh and the test call is closed. The final Runware reasoning override was validated directly against the provider; its post-deployment UI path was not retested.
