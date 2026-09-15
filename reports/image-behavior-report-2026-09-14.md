# Image behavior test — September 14, 2026

## Verified

- Live Seedream V5.0 Pro generation through the local application's actual generation handler, using configured provider credentials: HTTP 200 in 51.5 seconds. Requested a blue ceramic teapot, two yellow lemons, pale wooden table, window light, no people or text. Direct image inspection confirmed those elements.
- Simulated provider rejection: outbound fetch was replaced only inside the test process with a synthetic HTTP 400 response. The app returned HTTP 500, `Wavespeed request failed`, and no image. This is failure-path testing, not an actual moderation refusal. The specific synthetic provider reason was not preserved, so the message is generic.
- Sixteen existing media-quality, persona participant, and image-intent regression tests passed.
- Source inspection: the persona media client throws on unsuccessful responses or missing URLs. Persona Chat's catch branch replaces the loading message with an error and does not add an image. Super Agent also checks exact equality with the persona reference/avatar URL. These are code observations, not a fresh browser test.

## Limitations

Browser access failed twice because browser policy configuration could not load. No live visible chat/error-screen check was possible during the initial attempt; see the successful browser retry below. This run does not prove that profile-photo substitution is impossible, especially if a provider returns copied content at a different URL. No real content-policy refusal was induced, no explicit content was requested, and only Seedream was tested for live generation.

The first harness attempt omitted the chat-context configuration and generated the handler's default portrait instead of the still-life request. This was not counted as a successful scene test. After matching the chat call contract (`isChatContext` and `chatPrompt`), the correct still life was produced. No application code was changed or deployed in this test.

[Generated sample](/Users/Shared/AI-Influencer-Studio/reports/image-behavior-sample.jpg)

[Timing and status evidence](/Users/Shared/AI-Influencer-Studio/reports/image-behavior-eval-2026-09-14.json)

## Browser retry

Browser access recovered after resetting the automation connection. On the custom domain, created project “Image error verification Sep 14” and prepared a Seedream portrait of Rawan in a blue jacket holding a yellow umbrella in a rainy garden. A one-credit allowance intentionally stopped execution before any provider call. The visible task reported: “I couldn't finish that image. Task allowance reached or not configured. Increase the limit before retrying. No new provider call was started.” No generated-image element appeared in the failed task (the ordinary header avatar remained). This verifies an allowance failure, not a moderation refusal. Raised the allowance to eleven credits and approved retry of the same step. It completed, passed the app visual check, and was saved in Library. Full-image browser inspection confirmed Rawan in a navy jacket holding a yellow umbrella in a rainy green garden, distinct from the header profile image. Four credits were reserved from the test allowance. No application changes were required. This verifies the Super Agent failure/recovery UI for an allowance error; it does not verify actual provider moderation refusal wording or every Persona Chat path.
