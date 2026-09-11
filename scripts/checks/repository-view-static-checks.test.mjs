import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import test from "node:test";

const STATIC_CHECK_TIMEOUT_MS = 60_000;
const ref = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
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

const refContainsLegacyCoordinatorDoctrine = (() => {
  try {
    const content = execFileSync("git", ["show", `${ref}:AGENTS.md`], { encoding: "utf8" });
    const currentContent = [];
    let legacyLevel = null;
    for (const line of content.split(/\r?\n/)) {
      const heading = /^(#{2,6})\s+/.exec(line);
      const level = heading ? heading[1].length : null;
      if (level !== null) {
        if (legacyLevel !== null && level <= legacyLevel) legacyLevel = null;
        if (legacyLevel === null && /\b(?:legacy|compatibility|historique)\b/i.test(line)) {
          legacyLevel = level;
          continue;
        }
      }
      if (legacyLevel === null) currentContent.push(line);
    }
    return /le checkout de travail reste directement sur `main`|PUBLICATION_PENDING|UNPUBLISHED_PATH_CONFLICT|WORKTREE_BASE_DIVERGED|checkout partagé|RUN_OWNED_PATHS|OWNED_FILES/i.test(currentContent.join("\n"));
  } catch {
    return true;
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
    ) && !(script.endsWith("check-agent-governance.mjs") && refContainsLegacyCoordinatorDoctrine),
);

function runStaticChecker(script) {
  const extraArgs = script.endsWith("check-top-heavy-files.mjs") ? ["--enforce"] : [];
  const startedAt = performance.now();
  try {
    execFileSync(process.execPath, [script, ...extraArgs, `--ref=${ref}`], {
      stdio: "ignore",
      timeout: STATIC_CHECK_TIMEOUT_MS,
      windowsHide: true,
    });
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    const timedOut = error?.code === "ETIMEDOUT" || error?.signal === "SIGTERM";
    const reason = timedOut
      ? `timed out after ${durationMs}ms (limit ${STATIC_CHECK_TIMEOUT_MS}ms)`
      : `failed after ${durationMs}ms with ${error?.code ?? `exit ${error?.status ?? "unknown"}`}`;
    throw new Error(`${script} ${reason} for exact Git ref ${ref}`);
  }
}

test("all pre-push static checks accept and validate an exact Git ref", () => {
  for (const script of compatibleChecks) {
    assert.doesNotThrow(
      () => runStaticChecker(script),
      `${script} rejected ref ${ref}`,
    );
  }
});
