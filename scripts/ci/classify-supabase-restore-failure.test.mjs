import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyRestoreFailure,
  classifyRestoreSqlState,
  diagnoseRestoreFailure,
  extractRestoreSqlState,
  formatRestoreDiagnostic,
  isRestoreClassification,
} from "./classify-supabase-restore-failure.mjs";

test("classifies restore failures without returning SQL text", () => {
  assert.equal(classifyRestoreFailure("psql: ERROR: permission denied for schema public"), "role_or_privilege");
  assert.equal(classifyRestoreFailure("psql: ERROR: extension postgis does not exist"), "extension_or_feature");
  assert.equal(classifyRestoreFailure("psql: ERROR: relation public.actions does not exist"), "dependency_or_ordering");
  assert.equal(classifyRestoreFailure("psql: ERROR: duplicate key value violates unique constraint"), "constraint_or_data");
  assert.equal(classifyRestoreFailure("psql: ERROR: syntax error at or near COPY"), "syntax_or_format");
  assert.equal(classifyRestoreFailure("psql: error: connection refused"), "connection_or_authentication");
  assert.equal(classifyRestoreFailure("private SQL and secret text"), "unknown");
  assert.equal(isRestoreClassification(classifyRestoreFailure("ERROR")), true);
});

test("extracts the first SQLSTATE and prioritizes its normalized category", () => {
  const log = [
    "ERROR: 23505",
    "DETAIL: private duplicate row contents",
    "ERROR: 42501",
  ].join("\n");
  assert.equal(extractRestoreSqlState(log), "23505");
  assert.equal(classifyRestoreSqlState("23505"), "constraint_or_data");
  assert.deepEqual(diagnoseRestoreFailure(log), { sqlstate: "23505", classification: "constraint_or_data" });
});

test("covers representative SQLSTATE classes without exposing messages", () => {
  const cases = [
    ["08006", "connection_or_authentication"],
    ["42501", "role_or_privilege"],
    ["0A000", "extension_or_feature"],
    ["42P01", "dependency_or_ordering"],
    ["23503", "constraint_or_data"],
    ["42601", "syntax_or_format"],
    ["ZZ999", "unknown"],
  ];
  for (const [sqlstate, classification] of cases) assert.equal(classifyRestoreSqlState(sqlstate), classification);
  const output = formatRestoreDiagnostic("ERROR: 42501\nDETAIL: super-secret SQL and row data");
  assert.equal(output, "sqlstate=42501 classification=role_or_privilege");
  assert.doesNotMatch(output, /super-secret|SQL|row data/);
});

test("uses a safe fallback when SQLSTATE is unavailable", () => {
  assert.deepEqual(diagnoseRestoreFailure("psql: ERROR: permission denied for schema public"), {
    sqlstate: "UNAVAILABLE",
    classification: "role_or_privilege",
  });
  assert.deepEqual(diagnoseRestoreFailure("opaque private failure"), {
    sqlstate: "UNAVAILABLE",
    classification: "unknown",
  });
  assert.equal(isRestoreClassification(diagnoseRestoreFailure("opaque").classification), true);
});
