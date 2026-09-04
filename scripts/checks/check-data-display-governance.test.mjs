import test from "node:test";
import assert from "node:assert/strict";
import {
  auditRuntimeTables,
  LEGACY_RUNTIME_TABLE_ALLOWLIST,
} from "./check-data-display-governance.mjs";

test("accepts a native table using the canonical class", () => {
  assert.deepEqual(
    auditRuntimeTables([
      {
        path: "apps/web/src/components/example.tsx",
        source: '<div className="cmm-data-table-wrap"><table className="cmm-data-table"><thead><tr><th scope="col">Nom</th></tr></thead></table></div>',
      },
    ], { legacyAllowlist: new Set(), printExportExclusions: new Set() }),
    [],
  );
});

test("rejects a new raw native table outside the allowlist", () => {
  const violations = auditRuntimeTables([
    {
      path: "apps/web/src/components/new-runtime-table.tsx",
      source: "<table><tbody><tr><td>Valeur</td></tr></tbody></table>",
    },
  ], { legacyAllowlist: new Set(), printExportExclusions: new Set() });

  assert.equal(violations.length, 1);
  assert.match(violations[0], /new-runtime-table\.tsx/);
});

test("ignores React table components such as Table2", () => {
  assert.deepEqual(
    auditRuntimeTables([
      {
        path: "apps/web/src/components/table2.tsx",
        source: "<Table2><TableRow /></Table2>",
      },
    ], { legacyAllowlist: new Set(), printExportExclusions: new Set() }),
    [],
  );
});

test("detects a stale legacy exception after its raw table is migrated", () => {
  const legacyPath = "apps/web/src/components/example-legacy-table.tsx";
  const violations = auditRuntimeTables([
    {
      path: legacyPath,
      source: '<div className="cmm-data-table-wrap">Table migrée</div>',
    },
  ], { legacyAllowlist: new Set([legacyPath]), printExportExclusions: new Set() });

  assert.equal(violations.length, 1);
  assert.match(violations[0], /stale legacy table exception/);
});

test("keeps the runtime legacy table allowlist empty", () => {
  assert.equal(LEGACY_RUNTIME_TABLE_ALLOWLIST.size, 0);
});

test("keeps the specialized Print/Export exclusion separate from runtime legacy", () => {
  assert.deepEqual(
    auditRuntimeTables([
      {
        path: "apps/web/src/components/reports/web-document/ui.tsx",
        source: "<table><tbody /></table>",
      },
    ], { legacyAllowlist: new Set(), printExportExclusions: new Set([
      "apps/web/src/components/reports/web-document/ui.tsx",
    ]) }),
    [],
  );
});
