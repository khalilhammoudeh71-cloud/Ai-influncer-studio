# iOS web optimization

Local only; no deployment, merge or publish. Preserve the uncommitted Super Agent rollout (snapshot: work/ios-web/pre-existing.patch). Other repository task idle at inspection. No applicable AGENTS.md found.

## Baseline environment
React/Vite, existing mobile navigation and 100dvh workspace. No PWA manifest currently linked. Existing production bundle approximately 771KB gzip (historical build, not a device latency measurement). Local frontend on 127.0.0.1:5217, no backend started. Browser fixtures replace auth module/API responses; real account/provider access is never used by fixture tests.
Playwright WebKit 26.5 installed. iOS26.5 simulators available but none initially booted. No physical device connected/verified.
Fixed viewport matrix: 375x667,430x932,768x1024,1024x768,390x844,1440x900; personas, Super Agent, persona chat, library, settings, creation. Capture screenshots, overflow/controls and runtime errors. Browser timings are local fixture timings, not live provider or physical-device results.

## 1. Playwright baseline — Incomplete
Acceptance: reproducible isolated fixtures, source unchanged, screenshots and code/runtime findings recorded.
## 2. Impeccable adaptation — Incomplete
## 3. Safari viewport — Incomplete
## 4. Accessibility — Incomplete
## 5. Performance — Incomplete
## 6. React — Incomplete
## 7. PWA — Incomplete

## Phase 1 — Completed and verified (local baseline)
- WebKit 26.5 desktop engine with six fixed viewports: 36/36 screen render checks. Screenshots and JSON: `work/ios-web/baseline/`.
- Fixture chat response, mobile navigation to settings and persona creation: passed (`flows-baseline.log`). Auth/API intercepted only in the test browser; production authentication unchanged.
- 16 saved-voice identity, preferences, native lifecycle and account-storage tests passed (`preservation-baseline.log`).
- Production build baseline: 3,057.10 KB HTML / 769.30 KB gzip. Dev screenshot elapsed times are NOT loading-performance or voice latency measurements.
- Early screenshots captured loading skeletons; corrected the response/readiness waits and replaced the baseline. WebKit emits response-finished target-close warnings during cleanup; final render cases have no failures.
- Coverage limits: real microphone/audio, VoiceOver, keyboard and Home Screen are not established by these fixtures. Upload previews, populated libraries and dialogs require additional targeted coverage below.

## Phase 2 — In progress
Confirmed small-screen issue: collapsed Agent canvas consumes 48px; expanded canvas competes for full width alongside chat. Acceptance: full-width chat on phones, canvas still reachable/closable, composer and toolbar reflow without desktop regressions.

### Phase 2 — Completed and verified
- `src/views/AgentView.tsx`, `src/index.css`: full-width mobile chat, canvas overlay with named open/close toggle, smaller mobile console padding and explicit shrinking flex scroll region.
- 36/36 fixed WebKit render cases pass after changes; fixture chat/navigation flows and TypeScript pass. Before/after small-phone Agent screenshots show the reclaimed conversation width.
- Impeccable detector run once. Warnings concern incumbent gradients, colors and decorative motion; preserving brand per request, no redesign performed.

## Phase 3 — Audit complete; device interaction needs setup
- Read Safari skill and verified official WebKit Safari 26 release notes and safe-area guidance: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ and https://webkit.org/blog/7929/designing-websites-for-iphone-x/.
- Existing viewport uses device-width with automatic Safari insetting, workspace uses 100dvh, bottom navigation uses safe-area padding, and main scrolling flex item has min-height:0. Phase 2 adds min-height:0 to Agent's inner scroll region.
- No version-specific keyboard jiggle, forced scroll restore, UA gate or glass workaround applied without reproduction. Rotation/narrow widths covered by WebKit matrix; this is not proof of software-keyboard behavior.
- Booted iPhone 17 Pro Simulator / iOS 26.5; started loopback-only fixture proxy 5218. Computer-use control timed out while selecting Simulator, so interactive keyboard, toolbar transitions and VoiceOver remain unverified. Real microphone/backgrounding also need device testing.

## Phase 4 — Completed targeted fixes and verification
- `LeftSidebar.tsx`: native mobile dialog, hidden closed navigation, browser focus containment/restoration and Escape; desktop remains an aside. Width changes switch the appropriate element.
- `AgentView.tsx`: explicit message/attachment labels and disclosure state. CSS raises primary touch controls to 44px on coarse pointers. Existing focus-visible and reduced-motion rules retained.
- TypeScript passed; WebKit functional checks passed including keyboard Enter/Escape/focus restoration, canvas open/close and fixture chat/navigation.
- Safari pointer clicks do not necessarily focus buttons: focus-restoration test uses keyboard entry, rather than incorrectly assuming a touch click focuses its target.
- VoiceOver and broad contrast/media-caption audit remain unverified. Simulator screenshot showed boot progress, not the running app; no Simulator compatibility claim.

## Phase 5 — In progress
- Repeated local production baseline: 5 cold browser contexts, Chromium, 390x844, 4x CPU throttle, loopback static server, external requests blocked, no artificial network throttle. Median ready 1,417ms, range 1,374–2,722ms; long-task totals 705–1,053ms. These are synthetic public-page measurements, not mobile field data.
- Measured build payload 3,057KB / 769KB gzip, all studio views eager and single-file build preventing chunking. Experiment: route-level lazy imports and ordinary Vite assets.

### Phase 5 — Completed and verified; keep experiment
- `App.tsx`: lazy-load studio views inside a view-local Suspense boundary; navigation shell remains available while loading. `vite.config.ts`: remove single-file bundling so Vite can emit separate hashed assets. Existing error boundary handles failed module loading without automatic reload.
- Same five-run public-page harness: before 1374–2722ms (median 1417), after 324–670ms (median 335). Median long-task total 775ms → 81ms.
- Same gzip calculation over initially requested HTML/JS/CSS: 762,347 → 256,981 bytes (66.3% less). Vite's gzip setting reports slightly different bytes; comparison uses one consistent Python gzip setting.
- TypeScript, production build and private fixture chat/navigation/canvas/dialog flow pass. Two heavy deferred chunks still exceed 500KB raw; no claim that call startup or authenticated route latency was measured.
- No field telemetry was added. Memory growth, live audio latency, large-library scrolling and slow-cellular results remain unmeasured.

### Verification correction
The final TypeScript run reports a pre-existing server/routes.ts:3642 TS18048 (`messages` possibly undefined). Earlier empty logs were inspected before the process finished; do not interpret those as completed type checks. Frontend builds pass. Another app task became active; coordination message sent describing owned files and asking it to preserve these local changes.

## Phase 6 — Already satisfied/reviewed; no duplicate optimization
- Applied Vercel React guidance to the Vite architecture: conditional view loading addressed in phase 5; no Next.js APIs introduced.
- Existing account hydration and persona load already run in parallel with cancellation checks. Gallery derives media/filter lists with useMemo and lazy-loads image thumbnails. No evidence justified new memoization or virtualized lists.
- 39 preservation tests pass covering account storage, project briefs, provider voice identity, delivery, conversation context and native call lifecycle (`preservation-after.log`). These are fixture/unit tests, not real saved-account or audible-call validation.
- Existing persona filtering excludes names/IDs containing `luna` plus two hardcoded IDs in App.tsx. This predates the rollout and was not changed; it is a separate preservation concern, so no universal claim that every possible stored persona restores is made.

## Phase 7 — Completed implementation and local browser verification
- Manifest, existing 1024px brand icon, Apple touch icon, standalone display, and Settings instructions. Orientation remains unrestricted. Existing Safari automatic safe-area insetting retained.
- Production-only service worker caches ONLY `/offline.html`. It never caches auth, API, media, persona or navigation responses; no background sync or action queue. Updates do not call skipWaiting/clients.claim or force reload.
- In-app connectivity status; offline startup gives an honest connection-needed page and explicit retry.
- Chromium 151.0.7922.34 production-build tests pass: offline navigation fallback, reconnect, exact cache contents, and a new worker waiting while an existing window remains open. No Home Screen installation claim is made.
- Official current references: https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios and https://webkit.org/blog/17333/webkit-features-in-safari-26-0/. WebKit storage can be evicted; offline cache is a convenience, not durable account storage.

## Final local verification
- WebKit 26.5: final fixed 36/36 render cases pass (six views × six sizes). Screenshot pairs in baseline/ and final/.
- Fixture browser flows pass: chat, navigation, creation entry, native dialog keyboard focus/Escape, canvas open/close.
- Edge tests pass: offline/reconnect retains unsent draft, synthetic silent WAV attachment selection; short-height viewport keeps composer visible; 150% root text size has document width 390px at a 390px viewport. Neither resizing nor CSS text scaling is an actual iOS keyboard/Dynamic Type test.
- 39 preservation tests pass. Isolated agent regression suite: 62 pass, 1 database-dependent skip, 0 failures.
- Full TypeScript exit 0 after a behavior-preserving callback array-reference fix in server/routes.ts. Production client build exit 0.
- Another task was briefly active. Coordination messages timed out, so delivery was not assumed; it is now idle. Unrelated initial edits are retained.

## Remaining device/setup validation
Needs a working Simulator UI or physical iPhone/iPad: software keyboard open/close and toolbar movement; VoiceOver; actual microphone, speaker routing, mute/interruption/background-return calls; Home Screen installation/launch/update on-device. No physical-device results or audible latency/quality claims.
Incomplete broader measurements: populated-library scroll/memory stress, real slow-cellular timings, full contrast/form-error audit, image/video upload round trips. No provider API or stored data migration was changed.
Ready for code/deployment review with these explicit limits, not a claim of full iOS certification.

## Deployment authorization
The user subsequently requested: “commit all changes, push and deploy.” This supersedes the initial local-only restriction. All current source changes, including the earlier Super Agent rollout, are included; generated test logs/cache files are excluded.
