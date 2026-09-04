import assert from "node:assert/strict";
import test from "node:test";
import {
  parseArgs,
  validateEnvironmentTargets,
} from "./vercel-sync-env.mjs";

test("defaults to development without including secrets", () => {
  assert.deepEqual(parseArgs([]), {
    file: ".env.local",
    environments: ["development"],
    previewBranch: "",
    dryRun: false,
    includeSecrets: false,
  });
  assert.doesNotThrow(() =>
    validateEnvironmentTargets({
      file: ".env.local",
      environments: ["development"],
      previewBranch: "",
    }),
  );
});

test("allows preview only with an explicit branch", () => {
  assert.doesNotThrow(() =>
    validateEnvironmentTargets({
      file: ".env.local",
      environments: ["preview"],
      previewBranch: "feature/env-preview",
    }),
  );
  assert.throws(
    () =>
      validateEnvironmentTargets({
        file: ".env.local",
        environments: ["preview"],
        previewBranch: "",
      }),
    /explicit --preview-branch/,
  );
});

test("refuses production when the source is .env.local", () => {
  assert.throws(
    () =>
      validateEnvironmentTargets({
        file: ".env.local",
        environments: ["development", "production"],
        previewBranch: "",
      }),
    /Refusing to sync \.env\.local to Vercel Production/,
  );
});
