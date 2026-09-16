# Screenshot Patterns

Prefer deterministic checks:

- stable selectors over text-only guesses
- for any visual validation of a PAGE, or any page-level BEFORE/AFTER
  comparison, the required evidence is one PNG screenshot with `fullPage: true`
  covering the complete document height;
- a viewport-only screenshot is never sufficient evidence for global page
  validation;
- one happy path and one edge case
- no flaky waits unless the app genuinely needs them

## Full-page page validation contract

Before the final page capture:

1. Load the exact route.
2. Wait for the page data, fonts, and initial network activity to settle.
3. Auto-scroll to the bottom and back to the top so lazy content is triggered.
4. Wait again for the document height and visible layout to stabilize.
5. Capture from the top with `fullPage: true`.

Use a deterministic desktop context, typically `1440x1200` with
`deviceScaleFactor=1`. Record `document.documentElement.scrollHeight` for every
PNG and verify that the image height covers the complete document height and is
greater than the viewport height whenever the page is scrollable.

Viewport or element screenshots remain valid as complementary evidence for a
specific component, interactive state, or responsive breakpoint. They never
replace the required full-page PNG for page validation or a page-level
BEFORE/AFTER comparison.
