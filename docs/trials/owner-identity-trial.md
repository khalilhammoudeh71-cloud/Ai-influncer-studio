# Owner account identity trial

Started November 4, 2026, Chicago time. Use normal, non-test personas. One clear starting photo remains sufficient; additional angles are optional.

For the next five generated results, inspect each face and use Your generations → Same person / Face changed / Can’t tell. These are human labels, separate from automatic checks. Do not rate a result that you cannot inspect. For video, inspect motion across the clip rather than only the poster frame.

The job ledger already records failures and timestamps. The generation-cost ledger separates estimates from actual charges; unknown actual charges are not zero. Identity-related blocks are not counted as false rejections without independent review of the withheld result.

No further model or threshold changes are planned during this trial. No invitations, automatic media generation, or recurring monitor were created.

Refresh the owner-only local report with:

    node --import tsx scripts/evaluation/owner-identity-trial.ts

The export reads only the configured creator account, omits prompts, images, email addresses and raw errors, separates synthetic test personas, and retains the original trial start boundary. Only the explicit --enable-feedback option writes the owner account opt-in flag. Account-synced feedback may lag browser feedback while workspace sync is pending.

Report: reports/owner-identity-trial/review.html. It is a local snapshot, not a live dashboard. Five reviews are a first checkpoint, not statistical validation or a guarantee of identity preservation.
