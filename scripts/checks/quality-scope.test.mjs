import assert from "node:assert/strict";
import test from "node:test";

import {
  filterPathsByQualityScope,
  normalizeQualityScope,
  productScopeForPath,
  qualityScopeRoots,
  scopeMetadata,
} from "./quality-scope.mjs";

test("quality scopes are closed and expose distinct application roots", () => {
  assert.deepEqual(qualityScopeRoots("web"), ["apps/web/src"]);
  assert.deepEqual(qualityScopeRoots("mobile"), ["apps/mobile"]);
  assert.deepEqual(qualityScopeRoots("all"), ["apps/web/src", "apps/mobile"]);
  assert.throws(() => normalizeQualityScope("desktop"), /web\|mobile\|all/);
});

test("application scope filtering never absorbs shared or another application", () => {
  const files = [
    "apps/web/src/page.tsx",
    "apps/mobile/screens/map.tsx",
    "scripts/checks/quality-scope.mjs",
    "e2e/map.spec.ts",
    "documentation/development/testing-quality.md",
  ];
  assert.deepEqual(filterPathsByQualityScope(files, "web"), ["apps/web/src/page.tsx"]);
  assert.deepEqual(filterPathsByQualityScope(files, "mobile"), ["apps/mobile/screens/map.tsx"]);
  assert.deepEqual(filterPathsByQualityScope(files, "all"), files);
  assert.equal(productScopeForPath("scripts/checks/quality-scope.mjs"), "shared");
  assert.deepEqual(scopeMetadata("mobile").transverse, []);
  assert.ok(scopeMetadata("all").transverse.includes("e2e"));
});
