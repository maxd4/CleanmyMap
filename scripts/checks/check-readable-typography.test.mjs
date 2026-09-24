import assert from "node:assert/strict";
import test from "node:test";

import { analyzeDiff } from "./check-readable-typography.mjs";

test("rejects a new sub-12px text class on a user-facing surface", () => {
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

test("parses arbitrary decimal px and rem sizes at the 12px boundary", () => {
  const cases = [
    ["text-[11.5px]", true],
    ["text-[11.99px]", true],
    ["text-[12px]", false],
    ["text-[12.5px]", false],
    ["text-[0.745rem]", true],
    ["text-[0.749rem]", true],
    ["text-[0.75rem]", false],
    ["text-[0.8rem]", false],
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
    "@@ -1,0 +2 @@",
    "+<p className=\"text-[10px]\">Rang existant</p>",
  ].join("\n"));
  const otherSurface = analyzeDiff([
    "diff --git a/apps/web/src/components/gamification/other.tsx b/apps/web/src/components/gamification/other.tsx",
    "--- a/apps/web/src/components/gamification/other.tsx",
    "+++ b/apps/web/src/components/gamification/other.tsx",
    "@@ -1,0 +2 @@",
    "+<p className=\"text-[10px]\">Nouveau libellé</p>",
  ].join("\n"));

  assert.equal(badge.violations.length, 0);
  assert.equal(badge.allowlisted.length, 1);
  assert.equal(otherSurface.violations.length, 1);
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
