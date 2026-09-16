# Example Local Smoke Check

When a page changes:

1. Open the local route in the browser.
2. Check that the page renders without console errors.
3. Interact with the main control once.
4. If validating the page visually or comparing BEFORE/AFTER, wait for data
   and fonts, auto-scroll to the bottom to trigger lazy content, return to the
   top, wait for stabilization, then capture one PNG with `fullPage: true`.
5. Use a deterministic desktop context, typically 1440x1200 with
   `deviceScaleFactor=1`, and record `document.documentElement.scrollHeight`.
6. Verify that the PNG covers the full document height and exceeds the
   viewport when the page is scrollable. Viewport or element captures are
   complementary only for a component, interactive state, or breakpoint.
7. Re-run the check after fixing any issue.
