# Super Agent follow-up fixes — September 17, 2026

The live campaign test exposed stale dates, unsupported business claims, incomplete structured revisions, model-authored prices, cramped results, and unverified ZIP delivery.

## Changes

- Planner receives the trusted server date. A second structured review checks campaign dates and unsupported factual claims, preserves the full campaign and steps, and rejects invalid revisions while keeping the last package accessible.
- Unrequested historical dates fail validation. Explicit historical dates remain supported.
- Pricing comes from the server quote and is labeled an estimate. The UI separates generation estimates from chat/review/retry charges and credit allowance.
- Failed revisions preserve the earlier campaign in the visible exchange. Explicit copy-only revisions can retain completed, reviewed media when step types and counts match.
- Results receive more height in small windows. The compact composer has an Expand prompt control to access mode selection and longer briefs.
- ZIP preparation requests a normal browser download and provides Save ZIP and individual asset alternatives. Preparation is distinguished from confirmed file delivery.

## Verification

Full regression: 556 tests, 550 passed, six skipped, no failures. TypeScript passed. Production builds include successful API bundle import checks.

Live revision returned a complete three-post bilingual campaign with September 18/20/22, 2026 dates, fictional branding labels, and no invented dollar prices. No new media jobs were executed during this check. A 685 × 618 window provided a 199.5px results panel, increased from the earlier 138px panel, with a compact expandable prompt.

## Limits

Semantic claim review uses another model and cannot guarantee that every unsupported assertion will be caught. Dollar amounts are estimates rather than invoices. Actual saved ZIP delivery and final media-retention browser checks are recorded below after verification.
