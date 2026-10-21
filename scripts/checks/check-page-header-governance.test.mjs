import assert from "node:assert/strict";
import test from "node:test";
import { auditPageHeaderLocalOverrides } from "./check-page-header-governance.mjs";

test("allows placement-only PageHeader wrapper classes", () => {
  assert.deepEqual(
    auditPageHeaderLocalOverrides("w-full flex items-start justify-between", "placement.tsx"),
    [],
  );
});

test("rejects local typography and geometry overrides on PageHeader", () => {
  assert.equal(
    auditPageHeaderLocalOverrides("max-w-none text-lg rounded-2xl shadow-lg", "parallel-header.tsx").length,
    1,
  );
});

test("preserves the documented compact messaging exception", () => {
  assert.deepEqual(
    auditPageHeaderLocalOverrides(
      "max-w-none text-xs",
      "apps/web/src/components/sections/rubriques/connect-section-view.tsx",
    ),
    [],
  );
});
