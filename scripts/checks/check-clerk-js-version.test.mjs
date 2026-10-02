import assert from "node:assert/strict";
import test from "node:test";
import { auditClerkJsVersionContract } from "./check-clerk-js-version.mjs";

function fixture({ clerkJsVersion = "6.31.1", nextjsVersion = "7.8.2", templateVersion = clerkJsVersion, runtimeVersion } = {}) {
  return auditClerkJsVersionContract({
    webPackageSource: JSON.stringify({ dependencies: { "@clerk/nextjs": nextjsVersion } }),
    lockfileSource: JSON.stringify({
      packages: {
        "node_modules/@clerk/nextjs": { version: nextjsVersion },
        "node_modules/@clerk/clerk-js": { version: clerkJsVersion },
      },
    }),
    envTemplateSource: `NEXT_PUBLIC_CLERK_JS_VERSION=${templateVersion}\n`,
    runtimeVersion,
  });
}

test("le contrat ClerkJS accepte le pin exact du lockfile", async () => {
  assert.deepEqual(fixture({ runtimeVersion: "6.31.1" }), {
    ok: true,
    expectedClerkJsVersion: "6.31.1",
    nextjsVersion: "7.8.2",
    templateVersion: "6.31.1",
    runtimeVersion: "6.31.1",
    violations: [],
  });
});

test("le contrat ClerkJS refuse une valeur hot-loadée différente du lockfile", () => {
  const report = fixture({ runtimeVersion: "6.31.0" });
  assert.equal(report.ok, false);
  assert.match(report.violations.join("\n"), /runtime\/lock mismatch/);
});

test("le contrat ClerkJS refuse un template non épinglé", () => {
  const report = fixture({ templateVersion: "6" });
  assert.equal(report.ok, false);
  assert.match(report.violations.join("\n"), /exact semantic version/);
});
