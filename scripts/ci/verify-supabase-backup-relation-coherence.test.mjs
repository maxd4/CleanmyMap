import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compareRelationSets, extractDataRelations, formatRelationCoherence, writeExportedRelations } from "./verify-supabase-backup-relation-coherence.mjs";

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

test("writes only the exported relation names for scoped final assertions", async () => {
  const root = await mkdtemp(join(tmpdir(), "cmm-relation-coherence-"));
  try {
    const path = join(root, "exported-relations.txt");
    await writeExportedRelations(path, "COPY public.actions FROM stdin;\nCOPY public.action_id_seq FROM stdin;\n");
    assert.equal(await readFile(path, "utf8"), "public.action_id_seq\npublic.actions\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
