# ElevenLabs Agents voice calls — September 15, 2026

Implemented using the installed ElevenLabs Agents skill: `/Users/Family/.codex/skills/agents/SKILL.md`.

## Use in the app

1. Open a persona chat, or select a persona in Super Agent.
2. Select **ElevenLabs call**.
3. Choose **Arabic**, **English · Arabic accent**, or **English · saved voice**.
4. Arabic defaults to **Jordanian / Syrian**. Lebanese, Egyptian, Saudi/Gulf, and Modern Standard Arabic are also available.
5. Leave **Allow Arabic / English switching** enabled to switch during the call, then press **Start call**.

The persona must have an available ElevenLabs voice saved in its Voice tab. The new option uses that exact voice. Call preferences are remembered per account and persona on this browser. They affect this ElevenLabs call path; the existing Voice Call path is separate.

The installed skill guides the implementation; it does not itself supply a voice or a calling service. The app uses ElevenLabs Agents over WebRTC with the existing server-side API key. Authenticated agent configurations are provisioned automatically on first use and reused for the same account, persona, voice, and call preferences. No new environment variable or voice clone is required. The key needs access to voices and conversational agents.

## Behavior

- Arabic/English speech recognition, short spoken replies, patient turn detection, native interruption handling, mute/unmute, and hangup.
- Transcripts and interrupted-reply corrections join the existing chat without duplicate event IDs.
- Conversation history and memories are passed as bounded per-session context, not stored in reusable agent configurations.
- Server-side persona ownership and voice checks precede provider use. The browser receives a conversation token, never an API key, and cannot override the saved voice in the hosted configuration.
- Studio tool requests continue through the existing authenticated planning endpoint and review UI.
- OpenAI and Hume options and their call diagnostics remain available in the provider selector.
- New hosted agents disable audio recording and use a 15-minute call limit. Provider transcript retention is configured for seven days.

## Verification

- 24 focused regression tests passed, including existing OpenAI/Hume lifecycle tests.
- TypeScript check, frontend production build, API build, and API-bundle import verification passed.

- Real provider configuration creation, voice access, and WebRTC token issuance succeeded.
- Browser tests used the actual component, SDK, and ElevenLabs service with a silent synthetic microphone and a stock voice. Both Arabic and accented-English modes received audio; microphone tracks ended and peer connections closed on hangup.
- Mute/unmute, preference persistence after reload, persona isolation, Escape, sign-out dialog cleanup, and a 390px mobile viewport passed with no page errors.
- A further actual WebRTC call received typed synthetic prompts and switched to Arabic and back to English. Arabic reply: “أكيد، صباح الخير. طريقة حلوة لتستمتع بقهوتك الصبح هي إنك تشربها على رواق، وتتأمل شوي بهدوء قبل ما تبلش يومك.”
- Browser results: `elevenlabs-call-browser-results.json` and `elevenlabs-call-switching-results.json`.
- Screenshots: `elevenlabs-call-desktop.png` and `elevenlabs-call-mobile.png`.

Live validation exposed an ElevenLabs requirement: English-primary agents must use Flash v2, while Arabic-primary agents use Flash v2.5. Language presets allow the provider to select the corresponding speech model on a language switch. The implementation and regression test include this distinction.

## Limits and release status

Changes are in the local app source and build, with no production deployment performed. This workspace already contains substantial unrelated uncommitted work; a release should include only the intended changes.

Stock-voice tests establish connection and conversation behavior, not a native Arabic accent. Dialect instructions guide wording; acoustic accent depends on the selected voice. Listen with the intended persona voice before judging accent fidelity, pronunciation, room-noise recognition, or real conversational latency. No live user microphone was recorded for these tests.
