# CleanMyMap - UI/UX Pro Max Notes

This document extracts the UI/UX Pro Max skill guidance that is most relevant to CleanMyMap.

## What matters for this project

CleanMyMap is not a marketing site. It is a civic product with:

- map-first exploration
- form-heavy flows
- admin validation
- operational dashboards
- analytics and trust signals

The UI should therefore feel:

- data-dense
- utilitarian
- highly legible
- fast to scan
- resistant to layout shifts

## Design profile to use

### Pattern

- Favor a marketplace / directory structure when the user is exploring places, actions, or partners.
- Favor a data-dense dashboard structure when the user is in pilotage, moderation, validation, or analytics.
- Keep the primary CTA visible, but do not let it dominate the page.

### Style

- Use restrained layouts with grids, tables, KPI blocks, filters, and compact cards.
- Avoid ornamental UI and decorative hero treatment on operational screens.
- Prefer trust-oriented surfaces: neutral background, clear boundaries, concise labels.

### Colors

- Base the interface on a high-contrast light surface.
- Use blue and green as trust and success anchors.
- Use orange only for CTA or attention states.
- Avoid monochrome or single-hue visual monotony.

### Typography

- For dashboard-like surfaces, the skill recommends a technical pairing such as `Fira Code` for headings and `Fira Sans` for body text.
- In CleanMyMap, keep this as a reference for new operational screens only.
- Do not override the existing project typography system unless the page is explicitly being redesigned.

## UX rules that matter most

### Accessibility

- Every interactive element must be reachable with keyboard.
- Focus states must remain visible.
- Form errors must be announced, not only colored.
- Icon-only controls need labels.

### Touch and interaction

- Keep touch targets at least 44x44px where possible.
- Use clear hover and active feedback.
- Avoid tiny adjacent controls on mobile.
- Disable controls during async actions to avoid double submissions.

### Performance

- Reserve space for async content to prevent layout shifts.
- Use skeletons or loading states for slow panels.
- Prefer transform and opacity for motion.
- Respect `prefers-reduced-motion`.

### Layout and responsive

- Design for 375px, 768px, 1024px, and 1440px.
- Prevent horizontal scroll.
- Use stable grid tracks and reserved dimensions for map, charts, and dashboards.
- Keep line lengths short enough for dense operational reading.

## Next.js implementation guidance

For this stack, the skill points to these practical rules:

- fetch data in Server Components when possible
- use Server Actions for mutations
- stream slow sections with Suspense
- reserve space for dynamic content
- use responsive images when images are required

## CleanMyMap-specific application

Use this profile on:

- pilotage screens
- validation workflows
- partner/admin inboxes
- analytics pages
- moderation tables
- form review flows

Do not use it for:

- broad marketing landing pages
- decorative hero sections
- low-information pages where the product should stay secondary

## Practical checklist

- [ ] Keyboard navigation works in the full flow
- [ ] Focus rings remain visible
- [ ] Error messages are readable and announced
- [ ] Loading states reserve space
- [ ] No horizontal scroll on mobile
- [ ] Buttons and row actions have clear hit areas
- [ ] Dense data is shown in tables or structured blocks, not only cards
- [ ] Motion is subtle and avoids layout shift

## Source

Derived from the `ui-ux-pro-max` skill and the project-specific searches for:

- accessibility / touch / forms / loading states
- Next.js data fetching and mutation patterns
- dashboard-style, map-first, admin-heavy product structure
