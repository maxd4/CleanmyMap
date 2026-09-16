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
