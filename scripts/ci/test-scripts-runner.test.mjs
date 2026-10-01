import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryPackage = JSON.parse(
  await readFile(new URL("../../package.json", import.meta.url), "utf8"),
);
const testScriptsCommand = repositoryPackage.scripts["test:scripts"];

test("the canonical Node runner covers root and Web script tests", () => {
  assert.match(testScriptsCommand, /scripts\/\*\*\/\*\.test\.mjs/);
  assert.match(testScriptsCommand, /scripts\/\*\*\/\*\.test\.js/);
  assert.match(testScriptsCommand, /apps\/web\/scripts\/\*\*\/\*\.test\.mjs/);
  assert.match(testScriptsCommand, /apps\/web\/scripts\/\*\*\/\*\.test\.js/);
});

test("the canonical runner explicitly includes the restore backup test path", () => {
  assert.match(testScriptsCommand, /apps\/web\/scripts\/\*\*\/\*\.test\.mjs/);
});
