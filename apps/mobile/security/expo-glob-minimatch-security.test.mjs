import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(mobileRoot, "../..");
const rootRequire = createRequire(path.join(repositoryRoot, "package.json"));

test("pins the Expo and Sentry glob/minimatch chains to patched versions", () => {
  const rootPackage = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));
  const lockfile = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package-lock.json"), "utf8"));

  assert.deepEqual(rootPackage.overrides.glob, {
    ".": "14.0.2",
    minimatch: "11.0.1",
  });
  assert.equal(rootPackage.overrides["@expo/fingerprint"].minimatch, "11.0.1");
  assert.equal(rootPackage.overrides.minimatch, "11.0.1");
  assert.equal(lockfile.packages["node_modules/glob"].version, "14.0.2");
  assert.equal(lockfile.packages["node_modules/minimatch"].version, "11.0.1");

  for (const [packagePath, packageInfo] of Object.entries(lockfile.packages)) {
    if (packagePath === "node_modules/glob" || packagePath.endsWith("/node_modules/glob")) {
      assert.equal(packageInfo.version, "14.0.2", packagePath);
    }
    if (packagePath === "node_modules/minimatch" || packagePath.endsWith("/node_modules/minimatch")) {
      const isLegacyEslintPlugin = /^node_modules\/eslint-plugin-(import|jsx-a11y|react)\/node_modules\/minimatch$/.test(packagePath);
      assert.equal(packageInfo.version, isLegacyEslintPlugin ? "3.1.5" : "11.0.1", packagePath);
    }
  }

  const consumers = [
    "@expo/cli",
    "@expo/config",
    "@expo/config-plugins",
    "@expo/fingerprint",
    "@expo/metro-config",
    "@sentry/bundler-plugins",
  ];
  for (const consumer of consumers) {
    const consumerPkg = rootRequire.resolve(`${consumer}/package.json`);
    const consumerRequire = createRequire(consumerPkg);
    const globPkgPath = consumerRequire.resolve("glob/package.json");
    const globPkg = JSON.parse(fs.readFileSync(globPkgPath, "utf8"));
    assert.equal(globPkg.version, "14.0.2", `${consumer} -> glob`);

    const globRequire = createRequire(globPkgPath);
    const minimatchPkg = JSON.parse(fs.readFileSync(globRequire.resolve("minimatch/package.json"), "utf8"));
    assert.equal(minimatchPkg.version, "11.0.1", `${consumer} -> glob -> minimatch`);
  }
});
