import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const webPackageJson = JSON.parse(readFileSync("apps/web/package.json", "utf8"));
const mobilePackageJson = JSON.parse(readFileSync("apps/mobile/package.json", "utf8"));
const lockfile = JSON.parse(readFileSync("package-lock.json", "utf8"));
const rootLockPackage = lockfile.packages[""];

test("keeps the Linux Rolldown binding optional and platform-restricted", () => {
  const packageName = "@rolldown/binding-linux-x64-gnu";
  const packageEntry = lockfile.packages[`node_modules/${packageName}`];

  assert.equal(packageJson.optionalDependencies[packageName], "1.2.14");
  assert.equal(rootLockPackage.optionalDependencies[packageName], "1.2.14");
  assert.equal(rootLockPackage.dependencies?.[packageName], undefined);
  assert.equal(packageEntry.version, "1.2.14");
  assert.equal(packageEntry.optional, true);
  assert.deepEqual(packageEntry.os, ["linux"]);
  assert.deepEqual(packageEntry.cpu, ["x64"]);
});

test("keeps the three dependency surfaces on their selected compatible versions", () => {
  assert.equal(webPackageJson.dependencies["@clerk/nextjs"], "7.9.15");
  assert.equal(webPackageJson.dependencies["@sentry/nextjs"], "11.7.0");
  assert.equal(webPackageJson.dependencies.next, "16.4.1");
  assert.equal(webPackageJson.dependencies.resend, "^6.33.0");
  assert.equal(packageJson.devDependencies["@clerk/testing"], "2.2.45");
  assert.equal(packageJson.devDependencies.playwright, "^1.64.1");
  assert.equal(packageJson.devDependencies.knip, "6.41.0");
  assert.equal(mobilePackageJson.devDependencies["typescript-eslint"], "8.71.2");
});
