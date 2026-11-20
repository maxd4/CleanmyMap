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
  assert.equal(webPackageJson.dependencies["@clerk/nextjs"], "7.10.0");
  assert.equal(webPackageJson.dependencies["@sentry/nextjs"], "11.13.0");
  assert.equal(webPackageJson.dependencies.next, "16.4.6");
  assert.equal(webPackageJson.dependencies.resend, "^6.38.1");
  assert.equal(packageJson.devDependencies["@clerk/testing"], "2.3.0");
  assert.equal(packageJson.devDependencies.playwright, "^1.65.1");
  assert.equal(packageJson.devDependencies.knip, "6.45.1");
  assert.equal(mobilePackageJson.devDependencies["typescript-eslint"], "8.73.0");

  assert.equal(rootLockPackage.devDependencies["@clerk/testing"], packageJson.devDependencies["@clerk/testing"]);
  assert.equal(rootLockPackage.devDependencies.playwright, packageJson.devDependencies.playwright);
  assert.equal(rootLockPackage.devDependencies.knip, packageJson.devDependencies.knip);
  assert.equal(rootLockPackage.devDependencies["@playwright/test"], packageJson.devDependencies["@playwright/test"]);
  assert.equal(lockfile.packages["node_modules/@clerk/testing"].version, "2.3.0");
  assert.equal(lockfile.packages["node_modules/@clerk/nextjs"].version, "7.10.0");
  assert.equal(lockfile.packages["node_modules/@playwright/test"].version, "1.65.1");
  assert.equal(lockfile.packages["node_modules/playwright"].version, "1.65.1");
  assert.equal(lockfile.packages["node_modules/knip"].version, "6.45.1");
  assert.equal(lockfile.packages["node_modules/typescript-eslint"].version, "8.73.0");
  assert.equal(lockfile.packages["node_modules/@sentry/nextjs"].version, "11.13.0");
  assert.equal(lockfile.packages["node_modules/next"].version, "16.4.6");
  assert.equal(lockfile.packages["node_modules/resend"].version, "6.39.0");
});
