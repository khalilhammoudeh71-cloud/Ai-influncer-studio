# GitHub Skill Recommendations for AI-Influencer-Studio and ChairIQ

The strongest next additions are Error Handling Patterns, Playwright Best Practices and Security Threat Model. These address external-service failures, repeatable user-flow testing and repository-level access boundaries. LLM Evaluation is a valuable second-stage addition because both products depend on generated content. More general design skills would add considerable overlap with the existing collection.

## Project fit and evidence

AI-Influencer-Studio declares React 19, Vite 7, Tailwind 4, Express 5, TypeScript, Drizzle, Supabase, a Neon driver, Stripe and multiple AI/media-provider SDKs. It contains media-job recovery logic, persona and voice tests, generation interfaces and Stripe webhook routing. Its root manifest includes build and API-bundle verification commands but does not expose a general test command. This does not mean tests are absent: multiple server, service and shared-logic test files are present. [Local manifest](/Users/Shared/AI-Influencer-Studio/package.json), [media jobs](/Users/Shared/AI-Influencer-Studio/server/mediaJobs.ts), [server entrypoint](/Users/Shared/AI-Influencer-Studio/server/index.ts).

ChairIQ declares React 18, Vite 5, Tailwind 3, Express, Supabase, OpenAI and Google AI SDKs. Its application structure includes patient-plan creation, sharing, treatment explanations, patient chat, email and SMS. Existing server tests cover ownership, patient access, share links, revocation, consent and migrations. Its inner package runs Node tests; the repository-root test script is only a placeholder. [Root manifest](/Users/Family/Documents/ChatGPT/ChairIQ/package.json), [application manifest](/Users/Family/Documents/ChatGPT/ChairIQ/chairiq/package.json), [patient-access tests](/Users/Family/Documents/ChatGPT/ChairIQ/chairiq/server/patient-access-service.test.js).

The selection is based on the local checkout, not a production audit. A dependency does not prove a service is active in production. In particular, AI-Influencer-Studio's database adapter uses a Neon driver on Vercel and describes a Supabase connection locally; this is insufficient evidence to recommend a Neon platform migration or new Neon integration. [Database adapter](/Users/Shared/AI-Influencer-Studio/server/db.ts).

## Prioritized shortlist

| Pick | Skill | Main value | App fit | Recommendation |
|---|---|---|---|---|
| 1 | Error Handling Patterns | Retry policy, error propagation, recovery and graceful degradation | Both | First group |
| 2 | Playwright Best Practices | Maintainable automated browser/API regression tests | Both | First group |
| 3 | Security Threat Model | Repository-grounded access boundaries and abuse paths | Both | First group |
| 4 | LLM Evaluation | Prompt/model comparisons and output-quality regression checks | Both | Second group |
| 5 | Property-Based Testing | Edge cases in parsers, normalizers, validation and deterministic rules | Both | Second group |
| 6 | API Design Principles | Consistent endpoint contracts, errors and pagination | Both | Useful for backend expansion |
| 7 | Stripe Best Practices | Provider-specific payment and subscription guidance | Studio now; ChairIQ only if billing is added | Optional specialist |
| 8 | GitHub Actions Templates | Build/test workflows and reusable CI patterns | Both | Conditional; packaging gaps |

All eight exact skill names were absent from the installed catalog and user-level skill folders at the time of inspection. Several overlap partly with installed skills; the distinctions below explain where they add value. No skills or application dependencies were installed for this report.

## 1. Error Handling Patterns

**Source:** wshobson/agents, [Error Handling Patterns](https://github.com/wshobson/agents/tree/main/plugins/developer-essentials/skills/error-handling-patterns).

The skill covers error classification, contextual errors, asynchronous failures, retry patterns, circuit breakers, resource cleanup and graceful degradation. Its references include JavaScript/TypeScript examples as well as other languages. It is a general reliability guide rather than a provider-specific SDK manual. [Detailed reference](https://github.com/wshobson/agents/blob/main/plugins/developer-essentials/skills/error-handling-patterns/references/details.md).

For Studio, an appropriate first task is reviewing the lifecycle of a long-running media request: timeout, retry, partial provider completion, persistence failure and refresh recovery. For ChairIQ, the analogous task is distinguishing a generated treatment explanation from a failed delivery attempt, so retries can target the failed operation. These are proposed applications of the skill, not defects established by this review.

This complements Systematic Debugging: debugging identifies a particular cause; this skill helps structure failure behavior before the next incident. It cannot make a retry safe by itself. Operations with side effects require application-specific duplicate detection and state rules. **Installation:** copy the whole skill directory, including `references/`; no separate service is needed for the guidance.

## 2. Playwright Best Practices

**Source:** Currents.dev, [Playwright Best Practices](https://github.com/currents-dev/playwright-best-practices-skill/tree/main/playwright-best-practices).

This collection focuses on creating and maintaining TypeScript Playwright tests. Its references cover locators, assertions, fixtures, authentication, API mocking, uploads, multi-user behavior, browser errors, visual regression and CI. Its activity-based index helps load only the relevant topic. [Publisher overview](https://github.com/currents-dev/playwright-best-practices-skill).

For Studio, a first suite could cover persona creation, mocked generation completion, saved gallery retrieval and recovery after reload. For ChairIQ, it could cover creating a plan, rendering the patient view, and confirming that a revoked link loses access. External generation and delivery should be mocked for ordinary regression runs, with separate controlled integration checks when needed. The reference contains concrete third-party testing examples, but mock success must not be reported as proof that a live provider works. [Third-party mocking](https://github.com/currents-dev/playwright-best-practices-skill/blob/main/playwright-best-practices/advanced/third-party.md).

The installed Webapp Testing skill already supports Python browser scripts. This addition earns its place by focusing on a durable TypeScript test suite, fixtures and test maintenance. The Python Playwright installation does not automatically provide a repository-local TypeScript Playwright Test setup. **Installation:** the guidance folder is portable; adding and configuring a test runner in either app is separate implementation work.

## 3. Security Threat Model

**Source:** OpenAI, [Security Threat Model](https://github.com/openai/skills/tree/main/skills/.curated/security-threat-model).

This skill maps repository components, assets, trust boundaries, entry points, realistic attacker capabilities and mitigations. It explicitly requires claims to be grounded in the repository and distinguishes existing controls from recommended ones. It is designed for a deliberate threat-model request, not automatic activation on every code change.

For ChairIQ, the initial scope should include patient-plan links, dentist/admin boundaries, image access and delivery endpoints. For Studio, it should include account ownership of generated assets, uploads, expensive generation endpoints and payment-triggered changes. These scopes arise from local features and tests, not from a claim that vulnerabilities were found.

The existing Differential Review skill focuses on changes, while this skill addresses the broader application model. A practical output would be one concise threat model per app and a prioritized set of tests or fixes tied to code locations. The upstream workflow asks for confirmation of material assumptions before finalizing a report. It does not certify privacy compliance, clinical correctness or security. **Installation:** a standalone Markdown skill with supporting references; no commercial scanner is required.

## 4. LLM Evaluation

**Source:** wshobson/agents, [LLM Evaluation](https://github.com/wshobson/agents/tree/main/plugins/llm-application-dev/skills/llm-evaluation).

The skill discusses automated metrics, human review, model-as-judge scoring, comparisons and regression evaluation. Its detailed reference includes metric examples, annotation guidance, judge patterns and benchmarking concepts. This is useful guidance for building an evaluation process, but its examples need integration and validation; the main quick-start refers to functions and model objects that are not supplied as a ready-to-run application. [Detailed reference](https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/skills/llm-evaluation/references/details.md).

For Studio, start with a small fixture set checking structured output, persona consistency, adherence to the brief and failure behavior. For ChairIQ, use approved reference content and reviewer-defined criteria for treatment explanations and patient-chat responses. Tests should distinguish unsupported statements, omitted instructions and poor readability from mere wording differences. Specialist content review remains necessary; word-overlap scores and another model's opinion are not evidence of clinical accuracy.

This fills a gap left by ordinary unit tests: the request can succeed while the content gets worse after a model or prompt change. It does not directly evaluate image or video visual quality without additional rubrics and tooling. **Installation:** guidance and reference files only; evaluation datasets, runner, provider calls and dependencies are separate work. Keep it second-stage so evaluation criteria are established before generating extensive test infrastructure.

## 5. Property-Based Testing

**Source:** Trail of Bits, [Property-Based Testing](https://github.com/trailofbits/skills/tree/main/plugins/property-based-testing/skills/property-based-testing).

This skill helps define properties over generated inputs, identify useful invariants, interpret counterexamples and avoid tests that merely restate the implementation. Its scope includes parsers, normalizers, serializers, validators and state invariants. It names JavaScript's fast-check alongside libraries for other languages.

For Studio, good candidates include deterministic media-setting normalization, ordering rules and input validation. For ChairIQ, candidates include procedure-code canonicalization, plan serialization and narrowly modeled permission rules. A property might assert that normalizing an already normalized value has no further effect, provided that is the intended contract. Browser flows, subjective visual quality and AI-output correctness are poor direct targets for this technique.

It complements the existing Test-Driven Development skill by expanding input coverage where a meaningful invariant exists. The upstream skill itself says an example test is appropriate when no strong property can be expressed. **Installation:** copy references and assets with the skill. A fast-check dependency is only needed if that library is chosen for implementation; skill installation alone does not add it to either app.

## 6. API Design Principles

**Source:** wshobson/agents, [API Design Principles](https://github.com/wshobson/agents/tree/main/plugins/backend-development/skills/api-design-principles).

This skill covers resource naming, HTTP semantics, versioning, error contracts, pagination, documentation and rate limiting, plus GraphQL material. The REST guidance is the relevant portion for the inspected Express applications. Its directory includes references and assets.

For Studio, the first useful application is documenting a stable contract for submitting a generation, polling its state and retrieving its result. For ChairIQ, it is clarifying the contracts around creating, sharing, revoking and retrieving a patient plan. These contracts should preserve existing clients and established behavior; installing the skill is not a reason to rename every endpoint or introduce GraphQL.

It adds backend-interface structure beyond the existing UI design and React skills. It is generic guidance, so examples must be reconciled with actual Express middleware, authorization, schema validation and compatibility needs. **Installation:** standalone skill with its references/assets; no new runtime required to consult it.

## 7. Stripe Best Practices

**Source:** Stripe, [Stripe Best Practices](https://github.com/stripe/ai/tree/main/skills/stripe-best-practices).

Stripe's own skill routes integration questions to payment, billing, Connect, security and other references. It discusses payment API choices, webhook-based fulfillment and current SDK/API guidance. Its source includes vendor-specific defaults and version recommendations; those should be checked against the existing integration rather than applied as an unrequested upgrade.

Studio's code imports Stripe routes and registers a webhook endpoint, making this a directly relevant specialist. A first use would review checkout-to-entitlement behavior and webhook handling in a test environment. ChairIQ's inspected manifests did not establish a Stripe integration, so its benefit there is conditional on a billing roadmap.

The installed Vercel Payments skill already covers Stripe integration, which lowers the urgency of this addition. Its incremental value is direct provider-authored references. **Installation:** the skill and references can be installed without connecting a Stripe account. Live account inspection, API actions and integration tests require separate credentials or tooling; installation does not provision them.

## 8. GitHub Actions Templates — conditional

**Source:** wshobson/agents, [GitHub Actions Templates](https://github.com/wshobson/agents/tree/main/plugins/cicd-automation/skills/github-actions-templates).

The skill contains inline workflow examples for tests, builds, caching, permissions and reusable automation. Neither repository root nor ChairIQ's inner application had a `.github` directory at the checked locations. This suggests that repository-owned GitHub Actions may be a useful addition, but it does not rule out hosting-platform checks or external CI.

A suitable first workflow would run each app's actual build and appropriate existing tests on pull requests. Studio's missing general test script and ChairIQ's nested package structure need explicit handling. Do not copy template `npm test` or `npm run lint` steps unless they resolve to the intended checks. Runtime and action versions in examples also need revalidation.

The inspected skill directory contains only `SKILL.md`, although the text references `assets/test-workflow.yml`, `assets/deploy-workflow.yml` and `assets/matrix-build.yml`. Those referenced files were not present there. The inline examples remain usable as guidance, but this is not a complete template bundle. Existing Vercel deployment skills already cover part of the need. **Recommendation:** defer installation unless GitHub Actions work is planned, and account for the missing files.

## Existing skills to use more deliberately

Several high-value capabilities are already installed: Supabase guidance and Postgres best practices; Vercel workflow, queues, observability and AI generation persistence; Systematic Debugging; Webapp Testing; Chrome DevTools CLI; Differential Review; Supply Chain Risk Auditor; and the recent design collection. Installing another copy is unlikely to help.

AI generation persistence is especially relevant to Studio's saved media and ChairIQ's generated content, although the installed examples use Next.js and Vercel-specific services. Apply the underlying persistence and traceability ideas to the current Express/Vite architecture. Do not infer a need to migrate the framework or storage provider from the skill's examples. Deployment and database-specific guidance likewise needs the actual environment confirmed before making infrastructure decisions.

Neither app is a Next.js application in the inspected manifests. Additional Next.js-only skills and native iOS tooling are therefore low-priority for the current web applications. New design-style packs would also overlap heavily with what is already available.

## Installation choices and source directories

The recommended first group is **1, 2 and 3**. Add **4 and 5** when ready to build stronger content and logic evaluation. Add **6** for API expansion, **7** for Studio billing work, and **8** only for a planned CI task. Skills are instructions; installing them does not implement these improvements.

| Pick | Repository | Directory to install |
|---|---|---|
| 1 | `wshobson/agents` | `plugins/developer-essentials/skills/error-handling-patterns` |
| 2 | `currents-dev/playwright-best-practices-skill` | `playwright-best-practices` |
| 3 | `openai/skills` | `skills/.curated/security-threat-model` |
| 4 | `wshobson/agents` | `plugins/llm-application-dev/skills/llm-evaluation` |
| 5 | `trailofbits/skills` | `plugins/property-based-testing/skills/property-based-testing` |
| 6 | `wshobson/agents` | `plugins/backend-development/skills/api-design-principles` |
| 7 | `stripe/ai` | `skills/stripe-best-practices` |
| 8 | `wshobson/agents` | `plugins/cicd-automation/skills/github-actions-templates` |

Selective installation should preserve complete directories and use the existing user-level Codex skills location, making them available across projects. Installing an entire upstream plugin collection is unnecessary. Supporting files were checked at directory level; this was not an exhaustive audit of every reference, executable or linked dependency.

## Sources and methodology

The report prioritizes app fit, incremental value over installed skills, specificity of instructions and completeness of supporting files. GitHub popularity is secondary. No controlled comparison of generated implementations was performed, and no security assessment or production test was executed.

Source files and repository metadata were retrieved September 9, 2026. Repository-wide star snapshots were:

| Publisher/repository | Stars | Metadata source |
|---|---:|---|
| wshobson/agents | 39,523 | [GitHub API](https://api.github.com/repos/wshobson/agents) |
| Currents.dev/playwright-best-practices-skill | 373 | [GitHub API](https://api.github.com/repos/currents-dev/playwright-best-practices-skill) |
| OpenAI/skills | 26,740 | [GitHub API](https://api.github.com/repos/openai/skills) |
| Trail of Bits/skills | 7,024 | [GitHub API](https://api.github.com/repos/trailofbits/skills) |
| Stripe/ai | 1,795 | [GitHub API](https://api.github.com/repos/stripe/ai) |

These are not per-skill installation figures and should not be compared as direct measures of quality. Exact source directories and original publisher references are linked with each assessment. Local app evidence is linked in the project section. Candidate discovery also considered Neon agent skills, alternative Playwright skills, prompt-evaluation examples and generic skill collections. The shortlist favors distinct gaps over another large general-purpose bundle.
