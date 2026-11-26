import assert from "node:assert/strict";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  discoverScriptTestFiles,
  EXCLUSIVE_SCRIPT_TEST_FILES,
  partitionScriptTestFiles,
  SCRIPT_TEST_ROOTS,
} from "./run-script-tests.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function collectHistoricalGlobsIndependently(root) {
  const expectedPatterns = [
    /^scripts\/.+\.test\.(?:mjs|js)$/,
    /^apps\/web\/scripts\/.+\.test\.(?:mjs|js)$/,
  ];
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "coverage" || entry.name === ".git") {
          continue;
        }
        walk(path.join(dir, entry.name));
        continue;
      }
      const rel = path.relative(root, path.join(dir, entry.name)).replaceAll("\\", "/");
      if (expectedPatterns.some((pattern) => pattern.test(rel))) {
        results.push(rel);
      }
    }
  }
  walk(root);
  return results.sort((a, b) => a.localeCompare(b, "en"));
}

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

test("discoverScriptTestFiles matches an independent inventory of the four historical globs without duplicates", () => {
  const discovered = discoverScriptTestFiles(REPO_ROOT);
  const independent = collectHistoricalGlobsIndependently(REPO_ROOT);
  assert.equal(new Set(discovered).size, discovered.length);
  assert.deepEqual(discovered, independent);
  assert.ok(discovered.some((file) => file.endsWith(".test.mjs")));
  assert.ok(discovered.some((file) => file.startsWith("apps/web/scripts/")));
});

test("discoverScriptTestFiles covers all four historical globs and excludes node_modules and coverage in a fixture tree", () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-runner-fixture-"));
  try {
    const filesToCreate = [
      "scripts/alpha.test.mjs",
      "scripts/nested/beta.test.js",
      "apps/web/scripts/gamma.test.mjs",
      "apps/web/scripts/nested/delta.test.js",
      "scripts/node_modules/ignored.test.mjs",
      "scripts/coverage/ignored.test.js",
      "apps/web/scripts/node_modules/ignored.test.js",
      "apps/web/scripts/coverage/ignored.test.mjs",
      "scripts/helper.mjs",
      "apps/web/scripts/helper.ts",
    ];
    for (const relPath of filesToCreate) {
      const absPath = path.join(fixtureRoot, relPath);
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, "// fixture\n", "utf8");
    }

    const discovered = discoverScriptTestFiles(fixtureRoot);
    assert.deepEqual(discovered, [
      "apps/web/scripts/gamma.test.mjs",
      "apps/web/scripts/nested/delta.test.js",
      "scripts/alpha.test.mjs",
      "scripts/nested/beta.test.js",
    ]);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
