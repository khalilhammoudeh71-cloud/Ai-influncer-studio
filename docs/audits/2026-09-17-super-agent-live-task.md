# Super Agent live task evaluation — September 17, 2026

## Result

**Partial pass.** Super Agent ultimately generated and saved two square campaign images, produced a three-post bilingual campaign package, and passed its automated visual checks. It required two corrective messages before execution. Initial date and factual constraints were missed, and the first revision claimed a saved draft without returning the structured package.

## Task

Create a fictional Amman artisan coffee brand campaign, Bayt Roast: three dated posts, English and Jordanian Arabic captions, two original square images (product still life and café lifestyle), charcoal/cream/gold palette with no blue, and a cultural/visual quality checklist. Drafts only; no social publishing, messages or changes to existing personas. Paid generation allowance requested: $3 within the user's existing $10 test budget.

## Live evidence

Tested through the production Super Agent interface in Build mode using the existing authenticated account.

| Check | Observed result |
| --- | --- |
| Initial structured planning | Campaign package, three posts and two executable image steps appeared. |
| Date handling | Failed initially: selected May 2025 dates. Corrected to September 18, 20 and 22, 2026 after explicit feedback. |
| No invented claims | Failed initially: invented location, roasting and tasting claims. Removed after feedback; revised copy labeled fictional. |
| Revision preserves actionable output | Failed first revision: prose claimed draft saved but no campaign/task plan appeared. Recovered after a second explicit request for structured output. |
| Paid approval | Generation waited for explicit cost review and approval. No image generation before approval. |
| Task allowance | Set to eight internal credits. Completed with eight of eight credits reserved. Provider charges apply on the creator account; this is not a dollar invoice cap. |
| Image execution | Two of two image steps completed. Result images loaded at 1024 × 1024. |
| Automated quality review | Both steps displayed “Visual check passed.” This is automated evidence, not independent verification of every visual constraint. |
| Campaign package | Three-post package displayed the corrected dates, captions and asset references. |
| Export gating | Download disabled with zero/one asset ready; enabled when both completed. |
| ZIP preparation | Preparation produced “Your ZIP is ready” and a Save ZIP link. Actual download event was not captured after clicking Save ZIP; file delivery remains unverified. |
| Persistence | Reload retained the campaign, both successful steps, visual checks and allowance usage. |
| Library save | UI reported “Completed and saved in Library.” Separate Library listing was not inspected in this run. |
| External publishing | None requested or executed. |

## Cost limits

The agent described an estimated $0.07 for two SeeDream images. That figure came from generated prose and was not reconciled against provider billing. The actual UI allowance was eight internal credits, including generation and review. No video or voice generation was used, and no paid retries were requested in this test. Earlier planning chat calls are separate from that allowance. Final invoice cost is not verified.

## Recommendations

1. Supply trusted current date/time to campaign planning and reject past dates unless explicitly requested.
2. Validate factual claims against the brief; fictional branding must not silently acquire real location or product assertions.
3. Preserve structured campaign/step state through revisions and prevent a “saved” claim when that structure is missing.
4. Show provider dollar estimates alongside internal credits rather than relying on model-written prices.
5. Verify ZIP delivery in Chrome and provide a clear fallback when the in-app browser cannot confirm the download.
6. At the tested 687 × 622 window size, the large composer left only a narrow output strip visible. Add a compact composer/result view for reviewing finished work.

This evaluation did not assess native-speaker dialect quality, individual persona identity preservation in the generated café scene, or all pages of the app. The new conversation/delete icons were separately verified in the deployed persona chat header.
