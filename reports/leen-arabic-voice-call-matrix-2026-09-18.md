# Leen Hasan Arabic voice-call matrix — 2026-09-18

## Test setup

- Persona: **Leen Hasan**
- Call path: studio **Voice Call** with the selected persona voice
- Arabic prompt used for every language-model test: `اختبار عربي رقم N: احكي جملة قصيرة عن يومك بالعربي فقط، بدون تكرار.`
- Voice-engine prompt used for every engine test: `اختبار محرك الصوت رقم N: احكي بالعربي فقط جملة قصيرة وطبيعية.`
- Microphone was muted for the controlled comparison so ambient speech/audio could not contaminate the call.
- The browser reported client-side request-to-text and text-to-playback timings. These are not acoustic quality measurements.

## Conversation-model results (ElevenLabs Flash 2.5 voice engine)

| Model | Observed reply | Result |
|---|---|---|
| xAI Grok 4.20 Non-Reasoning | `يومي مر بهدوء.` | Arabic, relevant, no repetition |
| Atlas Doubao Seed Character | `شربت القهوة على الشرفة وسمعت صوت العصافير.` | Arabic, relevant, no repetition |
| Atlas DeepSeek V3.2 | `حضرت طبقًا بسيطًا للغداء.` | Arabic, relevant, no repetition |
| Runware DeepSeek V4 Pro | `قضيت الوقت بالعناية بنبتات البيت.` | Arabic, relevant, no repetition |
| Venice Uncensored 1.2 | `أكملت كتابًا كنت أقرؤه.` | Arabic, relevant, no repetition |
| Gemini 2.5 Flash | `تواصلت مع بعض الأصدقاء عبر الهاتف.` | Arabic, relevant, no repetition |
| WaveSpeed DeepSeek V4 Flash | no reply visible within the 3.5s capture window | slow/indeterminate in this run |
| Wiro Seed 2.1 Turbo | no reply visible within the 3.5s capture window | slow/indeterminate in this run |
| Atlas Qwen 3.6 Plus | `استمتعت بغروب الشمس من شرفتي.` | Arabic, relevant, no repetition |
| Atlas GLM-4.6 | no reply visible within the 3.5s capture window | slow/indeterminate in this run |

The three high-latency/experimental models may have been still processing when the next test was sent; they should not be scored as hard failures without a longer isolated wait.

## Voice-engine results (xAI Grok 4.20 fixed)

| Voice engine | Observed reply | Client timing / result |
|---|---|---|
| Persona saved voice | `الجو اليوم لطيف جدًا.` | request→text 1.7s; text→playback 1.0s; playback path reported |
| ElevenLabs v3 Conversational | `اليوم شعرت بالراحة أكثر من المعتاد.` | 1.0s + 0.76s; playback path reported |
| ElevenLabs Flash 2.5 | `القهوة الصباحية كانت لذيذة.` | 1.2s + 0.904s; playback path reported |
| ElevenLabs Turbo 2.5 | `النهار مر ببطء اليوم.` | 1.8s + 0.661s; playback path reported |
| Cartesia Sonic 3.5 | provider configuration error: `The selected speech provider is not configured for this endpoint.` | **failed** for this call endpoint |
| ElevenLabs Multilingual v2 | `اليوم نمت جيدًا.` | 1.0s + 1.4s; playback path reported |
| Maya | disabled in UI: unavailable for Arabic | not testable |

## Critical call-path finding

Before the microphone was muted, the call received unrelated English transcript fragments about Claude/artifacts. After muting the microphone, the controlled typed tests produced short, relevant Arabic replies. This strongly indicates ambient microphone/audio contamination or an input-stream issue rather than every language model independently generating the same English content. The app’s `ElevenLabsCall` requests microphone access and the SDK owns the live input stream; the controlled test therefore used the mute control to isolate model and TTS behavior.

## Interpretation

- Best observed Arabic text consistency: xAI Grok, Doubao, DeepSeek V3.2, DeepSeek V4 Pro, Venice, Gemini, and Qwen all returned relevant Arabic one-sentence answers in this run.
- Fastest measured voice playback among successful engines: Turbo 2.5 had the shortest text-to-playback measurement (661ms), followed by v3 (760ms), Flash (904ms), saved voice (1.0s), and Multilingual v2 (1.4s).
- Cartesia is currently not wired to this call endpoint, so it should be hidden or routed through its supported speech path instead of presented as available here.
- Audio/accent naturalness cannot be certified from transcript/timing data alone. A human listening pass is still required for Leen’s cloned Arabic voice and Jordanian/Syrian accent.
