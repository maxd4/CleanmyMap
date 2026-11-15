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

test("keeps private relations in the same coherence contract", () => {
  const sql = [
    "COPY private.action_chat_acl FROM stdin;",
    "SELECT pg_catalog.setval('private.action_chat_acl_id_seq', 7, true);",
  ].join("\n");
  const result = compareRelationSets(sql, "private.action_chat_acl\nprivate.action_chat_acl_id_seq\n");
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.exported, ["private.action_chat_acl", "private.action_chat_acl_id_seq"]);
});

test("normalizes quoted and unquoted setval identifiers without losing quoted case", () => {
  const sql = [
    "SELECT pg_catalog.setval('public.actions_id_seq', 7, true);",
    `SELECT pg_catalog.setval('"public"."CaseSensitiveSeq"', 8, true);`,
    "SELECT pg_catalog.setval('PUBLIC.MixedCaseSeq', 9, true);",
  ].join("\n");
  assert.deepEqual(extractDataRelations(sql), [
    "public.CaseSensitiveSeq",
    "public.actions_id_seq",
    "public.mixedcaseseq",
  ]);
});

test("parses escaped quoted identifiers in public and private schemas", () => {
  const sql = [
    `SELECT pg_catalog.setval('"public"."seq""with""quotes"', 7, true);`,
    `SELECT pg_catalog.setval('"private"."Seq''With''Apostrophes"', 8, true);`,
  ].join("\n");
  assert.deepEqual(extractDataRelations(sql), [
    'private.Seq\'With\'Apostrophes',
    'public.seq"with"quotes',
  ]);
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
