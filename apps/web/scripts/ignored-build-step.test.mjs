import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyChangedPath,
  evaluateChangedPaths,
  evaluateIgnoreCommand,
} from "./ignored-build-step.mjs";

test("builds when a web runtime or build input changes", () => {
  const buildInputs = [
    "apps/web/src/app/page.tsx",
    "apps/web/public/brand/logo-cleanmymap.svg",
    "apps/web/next.config.ts",
    "apps/web/package.json",
    "package.json",
    "package-lock.json",
    "apps/web/vercel.json",
    "apps/web/scripts/upload-sentry-sourcemaps.mjs",
    "documentation/plans/journal_impact_DU.md",
    "documentation/architecture/methodologie-creation-itineraire.md",
  ];

  for (const pathname of buildInputs) {
    assert.equal(classifyChangedPath(pathname), "build", pathname);
  }
});

test("ignores only reviewed non-web documentation and maintenance paths", () => {
  const ignoredPaths = [
    "README.md",
    "SECURITY.md",
    ".agents/skills/example/SKILL.md",
    ".github/workflows/ci.yml",
    "apps/mobile/src/App.tsx",
    "maintenance/python/check.py",
    "scripts/audits/audit-vercel-ci.mjs",
    "apps/web/scripts/backfill-derived-geometry.mjs",
    "apps/web/src/components/learn/quiz/README.md",
    "apps/web/AGENTS.md",
    "apps/web/vitest.config.ts",
    "documentation/development/README.md",
    "documentation/security/README.md",
    "documentation/pages_site/routes/00-homepage/homepage-README.md",
  ];

  for (const pathname of ignoredPaths) {
    assert.equal(classifyChangedPath(pathname), "ignore", pathname);
  }
});

test("builds only documentation registered as a public runtime input", () => {
  assert.equal(classifyChangedPath("documentation/plans/journal_impact_DU.md"), "build");
  assert.equal(classifyChangedPath("documentation/development/README.md"), "ignore");
  assert.equal(classifyChangedPath("documentation/pages_site/routes/00-homepage/homepage-README.md"), "ignore");
});

test("builds on unknown, malformed, or unavailable diff input", () => {
  assert.equal(classifyChangedPath("new-root-file.custom"), "build");
  assert.equal(classifyChangedPath(""), "build");
  assert.equal(evaluateChangedPaths(undefined).action, "build");
  assert.equal(
    evaluateIgnoreCommand({ previousSha: "", currentSha: "current", changedPaths: [] }).action,
    "build",
  );
  assert.equal(
    evaluateIgnoreCommand({ previousSha: "previous", currentSha: "current", gitError: true }).action,
    "build",
  );
});

test("builds a mixed change set when one path is web-served documentation", () => {
  const decision = evaluateChangedPaths([
    "apps/mobile/package.json",
    "documentation/plans/journal_impact_DU.md",
    "scripts/ci/pre_push_guard.ps1",
  ]);

  assert.equal(decision.action, "build");
  assert.deepEqual(decision.buildPaths, ["documentation/plans/journal_impact_DU.md"]);
});

test("uses the same path decision regardless of Git signature state", () => {
  const webFallback = evaluateIgnoreCommand({
    previousSha: "previous",
    currentSha: "commit",
    changedPaths: ["apps/web/src/app/page.tsx"],
  });
  const nonWebFallback = evaluateIgnoreCommand({
    previousSha: "previous",
    currentSha: "commit",
    changedPaths: ["scripts/ci/pre_push_guard.ps1"],
  });

  assert.equal(webFallback.action, "build");
  assert.equal(nonWebFallback.action, "ignore");
  assert.equal(
    evaluateIgnoreCommand({ previousSha: "previous", currentSha: "commit", changedPaths: ["documentation/development/README.md"] }).action,
    "ignore",
  );
});
