# Rawan Hasan — voice repair and verification report

Date: September 11, 2026. This follow-up supersedes the remaining-issues section of the earlier repair report.

## Outcome

Runware now responds directly in production. Wiro had an application parsing defect as well as slow provider processing; the parser and request settings have been repaired, and both a direct test and the final production call returned complete answers. Maya produces audio through the existing fal.ai connection, but its latency varies substantially; the call can use the saved voice when Maya stalls. These are sampled functional results, not guarantees of every future request.

## Repairs in this round

1. **Wiro completed answers were discarded.** A real Task/Detail response contained `status: task_postprocess_end`, `pexit: 0`, a complete answer, and `finishreason: null`. Our parser assumed null meant unfinished. It now accepts a successful terminal task, reads only answer segments, and rejects unsuccessful terminal output. Four new regression tests cover these cases.
2. **Wiro thinking and timing.** Its published input schema defaults thinking to enabled and allows a very large output budget. Voice requests now disable thinking and cap output at 180 tokens. Explicit Wiro selection allows up to 30 seconds; opportunistic fallback attempts retain the 6.5-second budget. The option says High latency and explains the longer wait.
3. **Runware non-streaming consistency.** Added the same supported `reasoning_effort: none` option already used by the streaming path. The deployed streaming path was verified directly this round.
4. **Visible Maya fallback.** A notice now says when Maya is unavailable for a reply and the app is trying the saved persona voice. The notice clears when Maya starts successfully, the engine changes, or a new call starts.

5. **Wiro system/caller separation.** The first production retest failed because Wiro’s guard found “minors” in the app’s own safety instruction, flattened into the caller prompt. The full instruction is now preserved in the provider’s dedicated `systemInstructions` field. A direct benign test with the safety instruction intact returned a complete answer in 20.292 seconds. No safety instruction was removed.

## New live evidence

| Test | Observed result | Evidence / limit |
|---|---|---|
| Runware, deployed call | Direct answer, no model substitution | UI identified Runware deepseek:v4@pro; provider logs measured 1.361 and 1.156 seconds on the first two requests |
| Runware coherence | Relevant complete response | Suggested sketching or journaling in a quiet botanical-garden corner |
| Maya, direct fal.ai API | Valid PCM audio | 176,128 bytes; first audio 33.096 seconds; total 33.796 seconds |
| Maya, deployed call | Direct audio success | Production log: first chunk 453 ms, total 1,612 ms, 167,936 bytes |
| Maya, second successful deployed call | Direct audio success | First chunk 618 ms, total 1,780 ms, 176,128 bytes; Grok direct response in 617 ms |
| Maya, repeated deployed call | Stalled and used saved-voice fallback | Maya timeout logged; ElevenLabs direct TTS completed in 2,405 ms; UI returned to listening |
| Wiro gateway, initial checks | Authentication/catalog worked; answer request failed | One 30-second timeout; one empty reply with finish=length after 24.266 seconds |
| Wiro task API, diagnosis | Complete answer present but finishreason null | Successful terminal task observed after 14.554 seconds; old parser would reject it |
| Wiro, corrected parser integration | Direct complete response | 19.405 seconds: warm herbal tea, a comforting book, soft instrumental music |

| Wiro, final deployed call | Direct success with full Rawan context | UI named Wiro; server provider time 14,937 ms; saved voice synthesis 2,909 ms; returned to listening |

The initial deployed Wiro retest correctly reported a task failure and used Runware, rather than claiming a Wiro answer. Inspection of that task identified the system/caller formatting issue described above.

## Model coverage

This round focused on the unresolved routes. Earlier results are separated from fresh verification.

| Option | Status / test round |
|---|---|
| Grok 4.20 | Fresh direct production response in 617 ms |
| Atlas Seed Character | Direct production response and four-fact recall in earlier audit |
| Atlas DeepSeek V3.2 | Direct production response and four-fact recall in earlier audit |
| Runware DeepSeek V4 Pro | Fresh direct deployed call responses |
| Venice 1.2 | Direct production response in earlier audit |
| Gemini 2.5 Flash | Direct production verification in earlier audit |
| WaveSpeed DeepSeek V4 Flash | Direct production response in earlier audit |
| Wiro Seed 2.1 Turbo | Fresh direct production response in 14.937 seconds; high latency |
| Atlas Qwen 3.6 Plus | Direct production response and four-fact recall in earlier audit |
| Atlas GLM-4.6 | Direct production response and four-fact recall in earlier audit |
| Maya via fal.ai | Fresh direct API and live audio success, plus a live timeout/fallback |
| Cartesia Sonic 3.5 | Direct provider and production synthesis verified in earlier audit; stock voice, not Rawan clone |
| ElevenLabs saved voice | Fresh production synthesis and Maya fallback success |
| Other ElevenLabs voice options | Not individually rebenchmarked this round |

## Engineering verification

- 213 automated tests passed, 0 failed.
- TypeScript check passed.
- Frontend and API production builds passed.
- API bundle import verification passed. Local smoke import reports DATABASE_URL unset because it runs without production secrets; it is not a production database test.
- Source diff whitespace check passed. Existing generated/probe files were excluded from the commit.
- Commits: `f41986e` and `9e1c3e1`.

## Interpretation and limits

Wiro is a slow option, not a low-latency voice recommendation. Maya can be fast or stall; the fallback protects continuity but does not guarantee Maya availability. The timing pattern is consistent with variable provider startup/processing latency, but it does not establish the provider's internal cause.

Tests used typed prompts within a muted voice call, inspected returned speech data and call states, and checked production provider logs. This verifies model routing, synthesis and playback lifecycle, not microphone transcription accuracy or subjective humanlike sound. I did not listen to and score every voice. Naturalness, pronunciation and resemblance to Rawan still need a listening assessment.

The earlier 64-message context and recall/correction regression coverage remain intact. Unlimited or cross-session memory was not established. No explicit sexual-image or safety-bypass tests were performed; provider moderation is not treated as a malfunction.

Only existing credentials were used; no subscriptions or credit packages were purchased. Test calls can consume existing API credit. This was not a benchmark of every model in the entire fal.ai catalog.

## References

- [Wiro API contracts and task completion](https://wiro.ai/docs/)
- [Wiro Seed input controls](https://wiro.ai/models/bytedance/seed-v2-1-turbo-uncensored)
- [fal.ai Maya streaming API](https://fal.ai/models/fal-ai/maya/stream/api)
- [Runware OpenAI-compatible API](https://runware.ai/docs/platform/openai)

## Initial deployment in this round

Production is READY on [ai-influencerstudio.com](https://ai-influencerstudio.com/). Deployment `dpl_AURVD6uCv886VPCTtqJfdyghahPQ`, commit `f41986ecc81c4bcd8246fb1637d21ef459016c67`. Vercel confirmed the custom-domain alias and the refreshed UI showed the updated Wiro label.

## Final production verification

Final deployment `dpl_CoCx1dxz5tyin1qhB1whG7848UxB` is READY at commit `9e1c3e1ac46744d912e68499faf707132a39c51f`. Vercel confirmed `ai-influencerstudio.com` points to this deployment.

The final live Wiro request used the complete persona/call context. It returned a relevant answer about tea, a novel, and afternoon sunlight. The UI displayed `Wiro seed-v2.1-turbo-uncensored`; server logs independently confirmed that provider, 14,937 ms generation, and 2,909 ms ElevenLabs speech synthesis. It was not a Runware fallback. Wiro therefore passed the previously failing deployed flow after the request-format correction.

Runware, Maya and Wiro have each now produced direct results in the deployed app. Maya also demonstrated a timeout/fallback in this sample, so it remains variable rather than fully reliable. Wiro is functional but markedly slower than Grok or Runware.

The test call is closed (no End button, start-call button visible). Grok and the saved persona voice were restored before closing.
