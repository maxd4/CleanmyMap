import assert from "node:assert/strict";
import test from "node:test";
import { classifyRestoreFailure, isRestoreClassification } from "./classify-supabase-restore-failure.mjs";

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
