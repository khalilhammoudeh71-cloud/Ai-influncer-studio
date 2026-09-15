# Leen Hasan — Arabic call samples

September 15, 2026

## Verdict

Leen's saved cloned voice produced three intelligible Arabic replies in a live conversation. The call recognized all three synthesized spoken caller prompts and correctly changed the proposed time from five to seven in the evening while retaining tomorrow and mint tea.

The full saved persona configuration is currently blocked by ElevenLabs: a diagnostic connection returned `Agent … is unsafe`. The successful samples use a separate temporary configuration for ordinary, nonsexual conversation with the **same saved voice ID**. This establishes Arabic conversation capability for that voice, not successful operation of the original persona configuration. No saved persona, voice binding, or app source was changed.

Rawan's currently saved ElevenLabs voice returned HTTP 400 with `voice_not_found`, so Leen was selected.

## Listen

### 1. Reassurance after a long day — 6.73 seconds

![Leen: reassurance in Arabic](/Users/Shared/AI-Influencer-Studio/reports/arabic-call-samples-2026-09-15/leen-arabic-1.wav)

The reply contains Levantine wording and avoids a follow-up question as requested. **Issue:** it uses feminine address even though the caller said masculine `تعبان`. This needs improvement; the sample is preserved as generated.

### 2. Planning an outing with mint tea — 7.64 seconds

![Leen: planning an outing](/Users/Shared/AI-Influencer-Studio/reports/arabic-call-samples-2026-09-15/leen-arabic-2.wav)

The reply proposes a quiet place and mint tea, matching the caller's preference.

### 3. Correcting the time — 4.84 seconds

![Leen: correcting the time](/Users/Shared/AI-Influencer-Studio/reports/arabic-call-samples-2026-09-15/leen-arabic-3.wav)

Reply transcript: تمام، يعني بكرة الساعة سبعة المسا بنطلع على مكان هادي لنشرب شاي نعنع ونحكي.

## Method and limits

- Exact saved voice: `7jFje9BJoTWzqZzouT0j`, provider name **Leen Hasan**, category **cloned**.
- App's `buildElevenLabsCallConfig` with Arabic, Jordanian/Syrian preference, Gemini 2.5 Flash conversation model, ElevenLabs Flash v2.5 speech, and Scribe realtime recognition.
- Three synthesized Arabic caller recordings were streamed in real time through a live ElevenLabs WebSocket conversation. The files contain the actual conversation's response audio, not separately scripted TTS previews. Caller audio used stock George solely as the test input.
- The app's WebRTC component connected and produced the greeting with the temporary profile, but the browser capture harness stalled. The delivered recordings therefore come from WebSocket transport. This is not a completed browser or real-device microphone test.
- The files preserve the received mono 16 kHz PCM audio in WAV containers. All three passed non-silence, duration, and format checks; no full-scale clipped samples were detected.
- Estimated caller-audio end to first received response bytes: 2.659, 1.189, and 0.979 seconds. These three transport measurements exclude speaker playback and do not establish a production latency percentile.
- A separate automated Gemini audio review transcribed all three and found understandable Arabic with Levantine wording. This is not a human listening score or proof of exact Jordanian/Syrian pronunciation. Its transcripts rendered `هادي` as `هذه` twice; listen to those words before deciding whether that reflects pronunciation or transcription error.
- No live interruption, noisy microphone, Arabic/English switching, long-call reliability, or exact voice similarity assessment was completed in this run.
- Temporary agents were deleted and checked for absence. The test conversation closed normally.

## Evidence

- [Conversation scripts and transcripts](/Users/Shared/AI-Influencer-Studio/reports/arabic-call-samples-2026-09-15/results.json)
- [Audio format and signal checks](/Users/Shared/AI-Influencer-Studio/reports/arabic-call-samples-2026-09-15/audio-validation.json)
- [Automated audio review](/Users/Shared/AI-Influencer-Studio/reports/arabic-call-samples-2026-09-15/automated-audio-review.json)
- [Original configuration rejection](/Users/Shared/AI-Influencer-Studio/reports/arabic-call-samples-2026-09-15/original-configuration-failure.json)
- [Temporary-agent cleanup verification](/Users/Shared/AI-Influencer-Studio/reports/arabic-call-samples-2026-09-15/cleanup-verification.json)
