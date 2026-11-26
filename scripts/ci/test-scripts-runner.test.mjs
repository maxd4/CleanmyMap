import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  discoverScriptTestFiles,
  EXCLUSIVE_SCRIPT_TEST_FILES,
  partitionScriptTestFiles,
  SCRIPT_TEST_ROOTS,
} from "./run-script-tests.mjs";

const repositoryPackage = JSON.parse(
  await readFile(new URL("../../package.json", import.meta.url), "utf8"),
);
const testScriptsCommand = repositoryPackage.scripts["test:scripts"];

test("the canonical Node runner covers root and Web script tests", () => {
  assert.match(testScriptsCommand, /node (?:--experimental-strip-types )?scripts\/ci\/run-script-tests\.mjs/);
  assert.deepEqual([...SCRIPT_TEST_ROOTS], ["scripts", "apps/web/scripts"]);

  const discovered = discoverScriptTestFiles();
  const { parallelFiles, exclusiveFiles } = partitionScriptTestFiles(discovered);
  assert.ok(discovered.length > 0);
  assert.equal(parallelFiles.length + exclusiveFiles.length, discovered.length);
  assert.deepEqual(
    [...new Set([...parallelFiles, ...exclusiveFiles])].sort((a, b) => a.localeCompare(b, "en")),
    discovered,
  );
  for (const exclusive of EXCLUSIVE_SCRIPT_TEST_FILES) {
    assert.ok(discovered.includes(exclusive), `Missing exclusive test file: ${exclusive}`);
  }
});

test("the canonical runner explicitly includes the restore backup test path", () => {
  const discovered = discoverScriptTestFiles();
  assert.ok(discovered.some((file) => file.startsWith("apps/web/scripts/") && file.includes("restore")));
});
