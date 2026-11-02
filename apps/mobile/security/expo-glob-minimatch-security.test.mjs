import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(mobileRoot, "../..");

test("pins the Expo runtime glob chain to patched versions", () => {
  const rootPackage = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));
  const lockfile = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package-lock.json"), "utf8"));

  assert.deepEqual(rootPackage.overrides.glob, {
    ".": "14.0.2",
    minimatch: "11.0.1",
  });
  assert.equal(rootPackage.overrides["@expo/fingerprint"].minimatch, "11.0.1");
  assert.equal(lockfile.packages["node_modules/glob"].version, "14.0.2");
  assert.equal(lockfile.packages["node_modules/glob/node_modules/minimatch"].version, "11.0.1");
  assert.equal(lockfile.packages["node_modules/@expo/fingerprint/node_modules/minimatch"].version, "11.0.1");
});
