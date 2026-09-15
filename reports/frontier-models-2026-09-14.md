# Frontier model access — September 14, 2026

Deployed explicit text-planning routes: Grok 4.6, Gemini 3.1 Pro Preview, Gemini 3.8 Flash. Selection lives separately from voice settings in Agent setup. Explicit failures do not silently select another provider.

Direct API smoke test with configured local credentials: each returned the correct total ($84) and remaining budget ($36).

| Model | HTTP | Single-request latency |
| --- | --- | --- |
| Grok 4.6 | 200 | 4.849 seconds |
| Gemini 3.1 Pro Preview | 200 | 5.865 seconds |
| Gemini 3.8 Flash | 200 | 3.178 seconds |

These are single arithmetic smoke tests, not complex-task benchmarks. Deployment credentials may differ from local credentials. OpenAI models endpoint returned HTTP 401 with the configured local credential; GPT-6 Astra access is unverified. Gemini 3.5 Pro was absent from the authenticated Google model list.

Validation: three routing tests passed, TypeScript check passed, frontend and API builds passed. Vercel production deployment e2e708a is READY on ai-influencerstudio.com.

Remaining: production end-to-end task evaluations, GPT-6 credential repair, adaptive tool execution/replanning, broader tools, and finished campaign/video deliverables. No claim of full capability-package completion.
