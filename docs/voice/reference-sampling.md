# Voice reference sampling

File counts reflect the current adapters: ElevenLabs accepts up to ten; other reference adapters use the selected primary file. Presets do not consume recordings.

- ElevenLabs: recommended 1–2 minutes total; app samples up to 120 seconds total, divided among uploaded files. https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning/instant-voice-cloning
- Qwen3: recommended 3–15 seconds; app caps at 15. https://wavespeed.ai/docs/docs-api/wavespeed-ai/qwen3-tts-voice-clone
- OmniVoice: recommended 6–30 seconds; app caps at 30. https://wavespeed.ai/models/wavespeed-ai/omnivoice/voice-clone
- Fish S2: typical 10–30 seconds; app caps at 30. https://speech.fish.audio/
- MiniMax: accepted 10–300 seconds. https://platform.minimax.io/docs/api-reference/voice-cloning-clone
- Other adapters: 15-second app sampling cap. This is not a verified provider maximum or ideal duration; the UI labels it as an app sample.

Long video/oversized sources are normalized to mono WAV with up to 300 seconds available. Model-specific trimming runs before provider submission, taking the beginning of the recording. Short recordings are not looped. The current editing session retains the longer normalized source for model changes; saved voices store the prepared reference. Cropping a reference with an existing transcript requires a corrected transcript before submission.
