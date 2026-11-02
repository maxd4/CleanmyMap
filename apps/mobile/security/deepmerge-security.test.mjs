import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(mobileRoot, "../..");
const vendorRoot = path.join(mobileRoot, "vendor/deepmerge");

test("resolves the exact local deepmerge backport", () => {
  const rootPackage = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));
  assert.equal(rootPackage.overrides.deepmerge, "file:apps/mobile/vendor/deepmerge");
  assert.equal(require.resolve("deepmerge", { paths: [mobileRoot] }), path.join(vendorRoot, "index.js"));
  assert.equal(JSON.parse(fs.readFileSync(path.join(vendorRoot, "package.json"), "utf8")).version, "4.3.2");
});

test("rejects prototype keys even when the merge target has no prototype", () => {
  const deepmerge = require("deepmerge");
  const source = JSON.parse('{"__proto__":{"polluted":"yes"},"constructor":{"polluted":"yes"},"prototype":{"polluted":"yes"},"safe":true}');
  const merged = deepmerge(Object.create(null), source);

  assert.equal(merged.safe, true);
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(Object.hasOwn(merged, "__proto__"), false);
  assert.equal(Object.hasOwn(merged, "constructor"), false);
  assert.equal(Object.hasOwn(merged, "prototype"), false);
  assert.equal(Object.getPrototypeOf(merged), Object.prototype);
});

test("preserves ordinary Expo-style nested configuration merges", () => {
  const deepmerge = require("deepmerge");
  assert.deepEqual(
    deepmerge({ expo: { name: "CleanMyMap", plugins: ["base"] } }, { expo: { version: "1.0.0", plugins: ["extra"] } }),
    { expo: { name: "CleanMyMap", version: "1.0.0", plugins: ["base", "extra"] } },
  );
});
