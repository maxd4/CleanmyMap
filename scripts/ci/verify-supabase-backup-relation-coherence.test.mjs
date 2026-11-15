import assert from "node:assert/strict";
import test from "node:test";
import { compareRelationSets, extractDataRelations, formatRelationCoherence } from "./verify-supabase-backup-relation-coherence.mjs";

test("extracts COPY and sequence relations without exposing row data", () => {
  const sql = [
    "COPY public.actions (id) FROM stdin;",
    "private fixture row should never be emitted",
    "\\.",
    "SELECT pg_catalog.setval('public.actions_id_seq', 7, true);",
  ].join("\n");
  assert.deepEqual(extractDataRelations(sql), ["public.actions", "public.actions_id_seq"]);
  assert.doesNotMatch(formatRelationCoherence(compareRelationSets(sql, "public.actions\npublic.actions_id_seq\n")), /private|fixture|row/);
});

test("passes when every exported relation exists after schema restore", () => {
  const result = compareRelationSets("COPY public.actions FROM stdin;\n", "public.actions\n");
  assert.deepEqual(result.missing, []);
  assert.match(formatRelationCoherence(result), /^RELATION_COHERENCE: PASS /);
});

test("fails closed when data references a relation absent after schema restore", () => {
  const result = compareRelationSets("COPY public.actions FROM stdin;\nCOPY public.missing_relation FROM stdin;\n", "public.actions\n");
  assert.deepEqual(result.missing, ["public.missing_relation"]);
  assert.match(formatRelationCoherence(result), /FAIL exported=2 available=1 missing=1 first_missing_digest=[0-9a-f]{16}/);
  assert.doesNotMatch(formatRelationCoherence(result), /missing_relation/);
});
