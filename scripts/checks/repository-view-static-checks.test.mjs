import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const ref = execFileSync("git", ["rev-parse", "origin/main"], { encoding: "utf8" }).trim();
const checks = [
  "scripts/checks/check-env-contract.mjs",
  "scripts/checks/check-root-file-hygiene.mjs",
  "scripts/checks/check-gitnexus-hygiene.mjs",
  "scripts/checks/check-documentation-governance.mjs",
  "scripts/checks/check-agent-governance.mjs",
  "scripts/checks/check-agent-skill-mirrors.mjs",
  "scripts/checks/check-stack-doc-drift.mjs",
  "scripts/checks/check-github-actions-security.mjs",
  "scripts/checks/check-9c-public-facades.mjs",
  "scripts/checks/check-doc-visuals.mjs",
  "scripts/checks/check-lockfile-policy.mjs",
  "scripts/audits/audit-supabase-migration-trees.mjs",
  "scripts/audits/audit-vercel-ci.mjs",
  "scripts/checks/check-top-heavy-files.mjs",
];

const refContainsLegacyAiGuides = (() => {
  try {
    execFileSync("git", ["cat-file", "-e", `${ref}:documentation/ai-guides/README.md`], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
})();

// The migration deliberately removes the governance exception for this domain.
// Keep the compatibility sweep from treating the still-published pre-migration
// base ref as a current candidate; pre-push validates documentation governance
// separately against the actual PUSH_CANDIDATE.
const compatibleChecks = checks.filter(
  (script) =>
    !(
      refContainsLegacyAiGuides &&
      script.endsWith("check-documentation-governance.mjs")
    ),
);

test("all pre-push static checks accept and validate an exact Git ref", () => {
  for (const script of compatibleChecks) {
    const extraArgs = script.endsWith("check-top-heavy-files.mjs") ? ["--enforce"] : [];
    assert.doesNotThrow(
      () => execFileSync(process.execPath, [script, ...extraArgs, `--ref=${ref}`], { stdio: "ignore" }),
      `${script} rejected ref ${ref}`,
    );
  }
});
