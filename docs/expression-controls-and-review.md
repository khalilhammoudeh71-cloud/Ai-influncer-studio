# Expression controls, verification and result previews

Image and video editors offer From prompt, Neutral, Smile, Laughter, Surprise, Concern and Eyes closed, with Subtle/Natural/Strong intensity. From prompt adds no expression directive. Explicit selections override conflicting expression or mood words. The same controls are available in the standalone persona visual generator.

The visual inspector reports expressionStatus separately from identityStatus, including not-requested and unavailable. Missing, malformed, weak or duplicate expression evidence cannot pass. A confidently missed expression fails without relabeling a matched face as a different identity. Face and temporal confidence thresholds remain unchanged. Starting animation frames and source clips receive identity review without being judged against future expression motion; final video review checks both. Talking avatar review also checks visible speaking mouth movement. User ratings and approved reference photos are unchanged.

Response checks use bounded low thinking and larger output budgets, a 60-second inspection timeout, and reject incomplete responses. Earlier experimental checks returned intermittent unreadable results; reinspection after hardening passed the genuine laughter/closed-eyes examples and rejected a neutral portrait requested as strong laughter while retaining its face match.

Generation center results now open in a native modal dialog with video controls or an image, a clear Close button, Escape and backdrop dismissal, focus restoration, and no new result tab. Escape in the preview does not dismiss the generation list underneath.

Validation: focused regression tests, TypeScript, frontend build, API bundle import and visible browser verification of real components. Two paid WaveSpeed clips used the existing single-reference persona: neutral-to-smile motion and a short speaking avatar. Avatar passed on the initial check. Motion was initially withheld for low face confidence; the same provider artifact passed one reinspection with the hardened reviewer (beginning/middle/end identity and expression). No extra video generation was submitted. Motion smile remains mild, so this small trial does not establish reliable strong expression intensity or guarantee every video frame. Inspection is sampled at two frames per second.

Private local evidence is in reports/expression-video-acceptance and reports/expression-check-acceptance. Keep private photos, prompts and generated artifacts out of public source commits.
