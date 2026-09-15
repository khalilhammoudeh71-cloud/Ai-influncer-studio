# Super Agent: live audit and capabilities briefing

Date: September 12, 2026. Tested production at https://ai-influencerstudio.com/ with Rawan Hasan selected. Source inspected at deployed revision `55eed4475c2bb7ee08b53115fb34ce791c5b87c7`.

## Verdict

Super Agent is useful for conversational writing, simple calculations and short-term planning. It is **not yet dependable for unattended creative work**. Live tests reproduced unwanted image generation, an image unrelated to the request, ineffective review controls, weak research citations and loss of conversation memory on refresh.

This is an audit, not a repair or deployment. Original model selection (Grok) and Adult mode were restored after testing. Deep Research was turned off. Benign test messages and image jobs were created; no content was published and no voice cloning or revenue records were created.

## What you can do with it

| Capability | Assessment | Practical use today |
|---|---|---|
| Write and revise copy, brainstorm, converse | Passed representative text tests; generally coherent, sometimes generic | Captions, outlines, ideas and revisions, with human review |
| Calculate budgets and plan tasks | Correct $84 cost/$36 remaining across all 14 menu choices | Small production budgets and checklists; verify important figures |
| Follow corrections and remember context | Passed in-session corrections and recall | Multi-message planning while the conversation remains open |
| Remember after refresh | Failed; conversation disappeared and agent admitted no recall | Keep your own saved brief; do not rely on durable memory |
| Natural, warm expression | Gemini and Venice produced appropriate playful, non-explicit first-date lines | Casual writing; evidence does not establish voice realism |
| Research webpages | Partial/poor: honest inability on one route; unusable citations and unsupported claim on another | Treat as a starting point and verify sources yourself |
| Generate images | Failed semantic test: “mint-green teacup…no people” returned a woman's portrait, marked completed | Inspect every output; not reliable for requested scene fidelity |
| Choose the right persona/reference | Source risk: execution can choose first saved persona, rather than active persona | Do not assume the selected identity or Dr.H references were included |
| Produce content plans | Handler exists; underlying seven-day plan is templated and ignores the goal parameter | Draft structure, not proven personalized strategy |
| Create personas, edit images, generate videos/3D/voice/talking heads, clone voices, stitch video, storyboards | Execution handlers exist; not end-to-end verified in this audit | Available integrations, not certified working capabilities |
| Log revenue | Handler records data inside the app | Record keeping, not payment collection or verified earnings |
| Publish/schedule autonomously | Not established by the supported action list | Do not interpret “Auto-publish” as verified social publishing |
| Voice call and dictation | UI available; not audio-tested in this audit | Voice latency, interruption handling and expressiveness remain unmeasured |

It is a studio assistant with a bounded collection of actions, not an unrestricted agent that can do anything. The model's primary action tool is `create_studio_plan`; the app executes supported steps. There is no general computer-control or arbitrary publishing tool in this examined pipeline.

## Highest-priority defects

### 1. A text-only request launched image generation

The test explicitly said “Text only; do not create assets or publish” and asked for budget arithmetic. The app instead launched an image job, even in Standard mode with Review required.

Source explains a concrete trigger: substring matching treats `assets` as containing `ass`. Combined with a visual word such as `photos`, it enters a direct image route. That route runs before normal model reasoning and does not check the Standard/Adult setting or respect the instruction not to generate. The interface also exposed internal bypass-oriented routing text to the user.

Impact: unintended jobs, potentially unintended spending, and failure to follow ordinary requests. Fix intent detection, negation handling and mode enforcement before further unattended testing.

### 2. Wrong image marked successful

An intentional request for one square image of a mint-green ceramic teacup on a sunlit cafe table, with no people or lettering, produced a woman's portrait. The pipeline displayed Completed. This reproduces the user's concern that an unrelated persona image can appear as the result.

Source shows the Super Agent image path selects the first available persona and attaches that persona's reference/avatar. This is a confirmed design flaw and plausible contributor. This audit did not establish whether the final portrait was an unchanged reference, a new provider result or a downstream fallback; that exact provenance needs tracing. The visible mismatch itself is confirmed.

This is a separate execution path from Persona Chat; prior Persona Chat tests do not certify Super Agent.

### 3. Review required does not gate execution

The UI state is not consulted before starting returned pipeline steps. Live generation began without approval. Do not rely on that button to prevent actions. Real approval must be enforced at the execution boundary.

### 4. Memory disappears on refresh

Budget and deadline corrections were recalled correctly during the session. After refresh the chat was empty. Asked for the prior values, the agent said it had no previous conversation history. Source uses component message state and a limited recent-message window, rather than persisted chat recovery.

### 5. Research is not reliably grounded

A route asked to open IANA's example-domain page said it could not retrieve it, but leaked an internal-looking tag. With Deep Research enabled, another answer got the reservation/registration facts right but supplied citation numbers without usable links and an unsupported commercial-use claim. The requested source URL was omitted.

[IANA's actual explanation](https://www.iana.org/help/example-domains) says these domains are maintained for documentation and cannot be registered or transferred; it does not substantiate that answer's blanket commercial-use prohibition.

Source also supplies fixed example trends for certain trend requests, rather than verified live social trends. Only the Venice path examined explicitly receives native web-search options. A research badge is not proof that a page was retrieved.

### 6. Model names and actual execution can differ

Provider failure can fall back to Gemini, sometimes without an actual-provider badge. Qwen and DeepSeek labels do not accurately describe every model selected by their routing rules. All menu choices responding is not proof all named models were invoked successfully.

### 7. Other error-reporting risks found in source

Some chat failures become a generic friendly greeting. A stitching failure can be caught inside a step while outer completion reporting continues. Voice output handling checks HTTP success without adequately establishing playable output. These need dedicated reproduction tests; they are code findings, not confirmed live failures in this audit.

## Model comparison

Common test: a $120 budget, three $8 items and two $30 items, a three-step Friday plan, and a warm first-date sentence under 100 words. Every choice answered the arithmetic correctly and complied with the revised text-only test.

Times are observed send-to-response-ready duration, not time to first token or media-generation duration. One sample per choice, shared growing conversation, changing provider routes and network conditions mean this is a snapshot—not a statistically reliable league table. Previous answers were visible in the conversation. The cost column is the app's displayed estimate, not reconciled billing.

| Menu choice | Seconds | Observed provider badge | Displayed cost |
|---|---:|---|---:|
| Runware | 2.35 | Not shown; exact route unverified | — |
| Venice 1.2 | 2.40 | Venice | — |
| Grok 2 | 3.34 | Not shown; fallback possible | — |
| Gemini 2.5 Flash | 3.37 | Not shown | — |
| Llama 3.3 70B | 3.39 | Venice | — |
| Atlas Cloud | 4.38 | Atlas | $0.00106 |
| Adaptive Fast | 5.44 | WaveSpeed fast | $0.00039 |
| WaveSpeed LLM | 7.48 | WaveSpeed deep | $0.00054 |
| Adaptive Deep | 9.47 | Wiro deep | $0.01648 |
| Adaptive Smart | 10.45 | Wiro smart | $0.00189 |
| Wiro | 11.49 | Wiro deep | $0.01853 |
| DeepSeek R1 menu label | 16.56 | Wiro deep | $0.02184 |
| Qwen 2.5 menu label | 20.55 | Atlas deep | $0.00329 |
| Adaptive Auto | Not precisely timed; complete by first observation around 25.5s | Wiro deep | $0.01540 |

### Recommendations by use

1. **Everyday SFW work: Adaptive Fast.** Good practical default for short writing, budgets and routine plans. It passed a correction test and simple scheduling test. Its observed route and low displayed cost were visible. It is not the absolute fastest response in this sample.
2. **More involved planning: Adaptive Deep, provisionally.** Correctly handled corrected budget/deadline and a parallel-task timing question. Evidence is too small to establish superiority on difficult work; it cost substantially more in the displayed samples.
3. **Quick conversational copy: Gemini 2.5 Flash.** Fast observed responses and suitable warm, playful wording. Exact provider attribution remains limited by the app's fallback transparency.
4. **Mature but non-explicit conversation: Venice or Gemini.** Both handled the tested adult first-date writing without unnecessary refusal. Venice was faster in those samples; Gemini was somewhat more playful. This is a narrow text observation, not a voice or explicit-content ranking.

There is **no defensible best-to-worst quality ranking** among the remaining options from a small easy benchmark: their answers were all broadly correct. The latency table can be compared cautiously; memory quality was primarily an app/session issue, and naturalness was only lightly sampled.

Explicit sexual generation and safeguard-bypass prompts were not tested. No recommendation is made for bypassing safeguards or a “least censored” explicit-content model. The Adult mode label itself does not demonstrate output quality, availability or reliability. Image-model quality cannot be ranked from the failed scene test and hidden fallbacks.

## Additional checks and limits

- In-session correction: budget $150/Monday produced $84 cost, $66 remaining; three sequential two-hour tasks from 9 a.m. ended at 3 p.m.
- Later correction: budget $200/Tuesday produced $116 remaining; a two-hour prerequisite followed by parallel three-hour/one-hour tasks ended at 2 p.m.
- Gemini and Venice recalled the latest values without them being repeated in the recall prompt.
- Fresh automated run: **17/17 tests passed** across Super Agent routing, reply constraints and step validation. The live failures show those tests do not cover important user journeys.
- Video, 3D, voice calls, cloning, talking heads, stitching, upload formats, long-duration memory and social publishing were not live-certified. Claims about those remain limited to code/UI availability.
- No app source was changed or deployed during this audit.

## Recommended repair order

1. Stop accidental jobs: proper intent parsing and a real approval gate.
2. Fix image participant/reference selection and reject unrelated/unchanged reference outputs as successful results.
3. Persist conversation and image briefs across reloads.
4. Show the actual model/provider and fallback reason for every response.
5. Make research citations clickable and require evidence for live-trend claims.
6. Make partial failures visibly partial; then test every remaining media tool end to end.

Until those are repaired, use Super Agent as a supervised writing and planning assistant, and inspect any generated asset before relying on it.
