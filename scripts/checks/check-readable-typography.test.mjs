import assert from "node:assert/strict";
import test from "node:test";

import { analyzeDiff } from "./check-readable-typography.mjs";

test("rejects new functional text below the 14px floor on a user-facing surface", () => {
  const result = analyzeDiff(
    [
      "diff --git a/apps/web/src/app/(app)/dashboard/page.tsx b/apps/web/src/app/(app)/dashboard/page.tsx",
      "--- a/apps/web/src/app/(app)/dashboard/page.tsx",
      "+++ b/apps/web/src/app/(app)/dashboard/page.tsx",
      "@@ -1,0 +2 @@",
      "+<p className=\"text-[10px]\">Label</p>",
    ].join("\n"),
  );

  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].rule, "small-text");
});

test("enforces the 14px functional floor and keeps the 12px caption floor", () => {
  const cases = [
    ["text-[11.5px]", true],
    ["text-[11.99px]", true],
    ["text-[12px]", true],
    ["text-[13.5px]", true],
    ["text-[14px]", false],
    ["text-[14.5px]", false],
    ["text-[0.745rem]", true],
    ["text-[0.749rem]", true],
    ["text-[0.8rem]", true],
    ["text-[0.875rem]", false],
  ];

  for (const [className, shouldReject] of cases) {
    const result = analyzeDiff(
      [
        "diff --git a/apps/web/src/app/other/page.tsx b/apps/web/src/app/other/page.tsx",
        "--- a/apps/web/src/app/other/page.tsx",
        "+++ b/apps/web/src/app/other/page.tsx",
        "@@ -1,0 +2 @@",
        `+<p className=\"${className}\">Texte</p>`,
      ].join("\n"),
    );

    assert.equal(
      result.violations.some((violation) => violation.rule === "small-text"),
      shouldReject,
      className,
    );
  }
});

test("allows a documented caption or metadata role down to 12px only", () => {
  const caption = analyzeDiff([
    "diff --git a/apps/web/src/app/other/page.tsx b/apps/web/src/app/other/page.tsx",
    "--- a/apps/web/src/app/other/page.tsx",
    "+++ b/apps/web/src/app/other/page.tsx",
    "@@ -1,0 +2,2 @@",
    '+<span className="cmm-text-caption text-[12px]">Meta</span>',
    '+<time className="text-[12px]">2026</time>',
  ].join("\n"));

  const tooSmallCaption = analyzeDiff([
    "diff --git a/apps/web/src/app/other/page.tsx b/apps/web/src/app/other/page.tsx",
    "--- a/apps/web/src/app/other/page.tsx",
    "+++ b/apps/web/src/app/other/page.tsx",
    "@@ -1,0 +2 @@",
    '+<span className="cmm-text-caption text-[11px]">Meta</span>',
  ].join("\n"));

  assert.equal(caption.violations.length, 0);
  assert.equal(tooSmallCaption.violations.length, 1);
});

test("does not let a caption exception make an interactive control too small", () => {
  const result = analyzeDiff([
    "diff --git a/apps/web/src/components/ui/action.tsx b/apps/web/src/components/ui/action.tsx",
    "--- a/apps/web/src/components/ui/action.tsx",
    "+++ b/apps/web/src/components/ui/action.tsx",
    "@@ -1,0 +2 @@",
    '+<button className="cmm-text-caption text-[12px]" onClick={onClick}>Action</button>',
  ].join("\n"));

  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].rule, "small-text");
});

test("ignores explicitly decorative text that is hidden from assistive technology", () => {
  const result = analyzeDiff([
    "diff --git a/apps/web/src/components/ui/decorative.tsx b/apps/web/src/components/ui/decorative.tsx",
    "--- a/apps/web/src/components/ui/decorative.tsx",
    "+++ b/apps/web/src/components/ui/decorative.tsx",
    "@@ -1,0 +2 @@",
    '+<span aria-hidden="true" className="text-[10px]">•</span>',
  ].join("\n"));

  assert.equal(result.violations.length, 0);
});

test("does not flag arbitrary values from non-font-size classes", () => {
  const result = analyzeDiff(
    [
      "diff --git a/apps/web/src/app/other/page.tsx b/apps/web/src/app/other/page.tsx",
      "--- a/apps/web/src/app/other/page.tsx",
      "+++ b/apps/web/src/app/other/page.tsx",
      "@@ -1,0 +2 @@",
      "+<div className=\"bg-[11.5px] tracking-[11.5px] text-[color:var(--accent)]\">Texte</div>",
    ].join("\n"),
  );

  assert.equal(result.violations.length, 0);
});

test("allows documented print metadata while keeping the rule strict elsewhere", () => {
  const result = analyzeDiff(
    [
      "diff --git a/apps/web/src/app/(app)/prints/report/page.tsx b/apps/web/src/app/(app)/prints/report/page.tsx",
      "--- a/apps/web/src/app/(app)/prints/report/page.tsx",
      "+++ b/apps/web/src/app/(app)/prints/report/page.tsx",
      "@@ -1,0 +2 @@",
      "+<span className=\"text-[10px]\">ID export</span>",
    ].join("\n"),
  );

  assert.equal(result.violations.length, 0);
  assert.equal(result.allowlisted.length, 1);
});

test("keeps the existing compact badge metadata in the extracted InfiniteBadge view", () => {
  const badge = analyzeDiff([
    "diff --git a/apps/web/src/components/gamification/infinite-badges/InfiniteBadgeView.tsx b/apps/web/src/components/gamification/infinite-badges/InfiniteBadgeView.tsx",
    "--- a/apps/web/src/components/gamification/infinite-badges/InfiniteBadgeView.tsx",
    "+++ b/apps/web/src/components/gamification/infinite-badges/InfiniteBadgeView.tsx",
    "@@ -1,0 +2,2 @@",
    "+<p className={`text-[10px] font-black ${model.styles.text}`}>{model.displayRank}</p>",
    "+<div className=\"flex items-center justify-between text-[11px] font-bold\">Progression</div>",
  ].join("\n"));
  const otherSurface = analyzeDiff([
    "diff --git a/apps/web/src/components/gamification/other.tsx b/apps/web/src/components/gamification/other.tsx",
    "--- a/apps/web/src/components/gamification/other.tsx",
    "+++ b/apps/web/src/components/gamification/other.tsx",
    "@@ -1,0 +2 @@",
    "+<p className=\"text-[10px]\">Nouveau libellé</p>",
  ].join("\n"));

  assert.equal(badge.violations.length, 0);
  assert.equal(badge.allowlisted.length, 2);
  assert.equal(otherSurface.violations.length, 1);
});

test("rejects arbitrary new small text elsewhere in InfiniteBadgeView", () => {
  const result = analyzeDiff([
    "diff --git a/apps/web/src/components/gamification/infinite-badges/InfiniteBadgeView.tsx b/apps/web/src/components/gamification/infinite-badges/InfiniteBadgeView.tsx",
    "--- a/apps/web/src/components/gamification/infinite-badges/InfiniteBadgeView.tsx",
    "+++ b/apps/web/src/components/gamification/infinite-badges/InfiniteBadgeView.tsx",
    "@@ -1,0 +2,2 @@",
    "+<p className=\"text-[10px]\">Nouveau texte</p>",
    "+<p className=\"text-[11px]\">Autre nouveau texte</p>",
  ].join("\n"));

  assert.equal(result.violations.length, 2);
  assert.equal(result.allowlisted.length, 0);
});

test("rejects new navigation truncation", () => {
  const result = analyzeDiff(
    [
      "diff --git a/apps/web/src/components/navigation/app-breadcrumb.tsx b/apps/web/src/components/navigation/app-breadcrumb.tsx",
      "--- a/apps/web/src/components/navigation/app-breadcrumb.tsx",
      "+++ b/apps/web/src/components/navigation/app-breadcrumb.tsx",
      "@@ -1,0 +2 @@",
      "+<span className=\"truncate\">Section</span>",
    ].join("\n"),
  );

  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].rule, "truncation");
});

test("rejects weak colors on new reading copy", () => {
  const result = analyzeDiff(
    [
      "diff --git a/apps/web/src/app/learn/comprendre/page.tsx b/apps/web/src/app/learn/comprendre/page.tsx",
      "--- a/apps/web/src/app/learn/comprendre/page.tsx",
      "+++ b/apps/web/src/app/learn/comprendre/page.tsx",
      "@@ -1,0 +2 @@",
      "+<p className=\"text-sm leading-relaxed text-slate-600\">Explication</p>",
    ].join("\n"),
  );

  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].rule, "body-color");
});

test("keeps semantic inverse body copy and secondary captions valid", () => {
  const result = analyzeDiff(
    [
      "diff --git a/apps/web/src/components/account/account-setup-form.tsx b/apps/web/src/components/account/account-setup-form.tsx",
      "--- a/apps/web/src/components/account/account-setup-form.tsx",
      "+++ b/apps/web/src/components/account/account-setup-form.tsx",
      "@@ -1,0 +2,2 @@",
      "+<p className=\"cmm-text-body cmm-text-inverse\">Texte sombre</p>",
      "+<p className=\"cmm-text-caption cmm-text-muted\">Meta</p>",
    ].join("\n"),
  );

  assert.equal(result.violations.length, 0);
});
