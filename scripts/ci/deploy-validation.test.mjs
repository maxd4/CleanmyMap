import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { removePathWithRetry } from "./validation-evidence.mjs";
import { resolveDeployCandidate } from "./deploy-validation.mjs";

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function makeRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-deploy-validation-"));
  git(root, ["init", "--initial-branch=main", "--quiet"]);
  git(root, ["config", "user.email", "validation@cleanmymap.local"]);
  git(root, ["config", "user.name", "CleanMyMap validation"]);
  git(root, ["remote", "add", "origin", "https://github.com/maxd4/CleanmyMap.git"]);
  fs.mkdirSync(path.join(root, "apps", "web", "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "README.md"), "baseline\n");
  git(root, ["add", "--", "."]);
  git(root, ["commit", "--quiet", "-m", "baseline"]);
  return root;
}

function proof(sha, overrides = {}) {
  return {
    version: 1,
    commitSha: sha,
    provider: "vercel",
    projectName: "web",
    rootDirectory: "apps/web",
    target: "production",
    verified: true,
    verificationMethod: "vercel-inspection",
    ...overrides,
  };
}

function commitWebChange(root, file = "page.tsx", contents = "export default function Page() {}\n") {
  fs.writeFileSync(path.join(root, "apps", "web", "src", file), contents);
  git(root, ["add", "--", "."]);
  git(root, ["commit", "--quiet", "-m", "web change"]);
}

function commitManifest(root, manifest) {
  fs.writeFileSync(path.join(root, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  git(root, ["add", "--", "package.json"]);
  git(root, ["commit", "--quiet", "-m", "manifest change"]);
}

test("DEPLOY uses the verified Production SHA and includes the cumulative Web diff", () => {
  const root = makeRepository();
  try {
    const productionSha = git(root, ["rev-parse", "HEAD"]);
    commitWebChange(root, "first.tsx");
    commitWebChange(root, "second.tsx");
    const result = resolveDeployCandidate({
      repositoryRoot: root,
      deploymentReference: { sha: productionSha },
      deploymentProof: proof(productionSha),
    });
    assert.equal(result.valid, true);
    assert.equal(result.baseSha, productionSha);
    assert.deepEqual(result.webChangedFiles, ["apps/web/src/first.tsx", "apps/web/src/second.tsx"]);
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("DEPLOY refuses an arbitrary newer base that would omit an unpublished Web commit", () => {
  const root = makeRepository();
  try {
    const productionSha = git(root, ["rev-parse", "HEAD"]);
    commitWebChange(root, "first.tsx");
    const arbitraryBase = git(root, ["rev-parse", "HEAD"]);
    commitWebChange(root, "second.tsx");
    const result = resolveDeployCandidate({
      repositoryRoot: root,
      baseRef: arbitraryBase,
      deploymentReference: { sha: productionSha },
      deploymentProof: proof(productionSha),
    });
    assert.equal(result.valid, false);
    assert.equal(result.reason, "DEPLOY_BASE_REF_NOT_PUBLICATION_REFERENCE");
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("DEPLOY refuses an absent, non-ancestor, or unverifiable Production reference", () => {
  const root = makeRepository();
  try {
    const productionSha = git(root, ["rev-parse", "HEAD"]);
    commitWebChange(root);
    const absent = resolveDeployCandidate({ repositoryRoot: root });
    assert.equal(absent.reason, "DEPLOY_PUBLICATION_REFERENCE_UNVERIFIED");

    const foreignRoot = makeRepository();
    try {
      const foreignSha = git(foreignRoot, ["rev-parse", "HEAD"]);
      const nonAncestor = resolveDeployCandidate({
        repositoryRoot: root,
        deploymentReference: { sha: foreignSha },
        deploymentProof: proof(foreignSha),
      });
      assert.equal(nonAncestor.reason, "DEPLOY_PUBLICATION_SHA_UNVERIFIED");
    } finally {
      removePathWithRetry(foreignRoot, { recursive: true });
    }

    const unverifiable = resolveDeployCandidate({
      repositoryRoot: root,
      deploymentReference: { sha: productionSha },
      deploymentProof: proof(productionSha, { verified: false }),
    });
    assert.equal(unverifiable.reason, "DEPLOY_PUBLICATION_PROOF_INVALID");
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("independent Mobile changes do not block a Web DEPLOY scope", () => {
  const root = makeRepository();
  try {
    const productionSha = git(root, ["rev-parse", "HEAD"]);
    commitWebChange(root);
    fs.mkdirSync(path.join(root, "apps", "mobile"), { recursive: true });
    fs.writeFileSync(path.join(root, "apps", "mobile", "App.tsx"), "export default null;\n");
    git(root, ["add", "--", "apps/mobile/App.tsx"]);
    git(root, ["commit", "--quiet", "-m", "mobile change"]);
    const result = resolveDeployCandidate({
      repositoryRoot: root,
      deploymentReference: { sha: productionSha },
      deploymentProof: proof(productionSha),
    });
    assert.equal(result.valid, true);
    assert.deepEqual(result.mobileChangedFiles, ["apps/mobile/App.tsx"]);
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("shared contract changes are included in the Web scope", () => {
  const root = makeRepository();
  try {
    const productionSha = git(root, ["rev-parse", "HEAD"]);
    fs.mkdirSync(path.join(root, "packages", "contracts"), { recursive: true });
    fs.writeFileSync(path.join(root, "packages", "contracts", "index.ts"), "export const contract = true;\n");
    git(root, ["add", "--", "."]);
    git(root, ["commit", "--quiet", "-m", "shared contract"]);
    const result = resolveDeployCandidate({
      repositoryRoot: root,
      deploymentReference: { sha: productionSha },
      deploymentProof: proof(productionSha),
    });
    assert.equal(result.valid, true);
    assert.deepEqual(result.sharedChangedFiles, ["packages/contracts/index.ts"]);
    assert.deepEqual(result.webChangedFiles, ["packages/contracts/index.ts"]);
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("DEPLOY distinguishes npm scripts-only changes from an unpaired dependency change", () => {
  const root = makeRepository();
  try {
    const manifest = { scripts: { check: "node check.mjs" }, dependencies: { "example-package": "1.0.0" } };
    commitManifest(root, manifest);
    const productionSha = git(root, ["rev-parse", "HEAD"]);
    commitManifest(root, { ...manifest, scripts: { check: "node other-check.mjs" } });
    const scriptsOnly = resolveDeployCandidate({
      repositoryRoot: root,
      deploymentReference: { sha: productionSha },
      deploymentProof: proof(productionSha),
    });
    assert.equal(scriptsOnly.valid, true);
    assert.equal(scriptsOnly.dependencyGraphChanged, false);

    commitManifest(root, { ...manifest, dependencies: { "example-package": "2.0.0" } });
    const dependencyChanged = resolveDeployCandidate({
      repositoryRoot: root,
      deploymentReference: { sha: productionSha },
      deploymentProof: proof(productionSha),
    });
    assert.equal(dependencyChanged.valid, true);
    assert.equal(dependencyChanged.dependencyGraphChanged, true);
    assert.deepEqual(dependencyChanged.dependencyGraph.changedManifestFiles, ["package.json"]);
    assert.equal(dependencyChanged.dependencyGraph.lockfileChanged, false);
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("the lockfile control blocks a dependency graph change without a lockfile update", () => {
  const root = makeRepository();
  try {
    const manifest = { name: "fixture", version: "1.0.0", dependencies: { "example-package": "1.0.0" } };
    commitManifest(root, manifest);
    fs.writeFileSync(path.join(root, "package-lock.json"), `${JSON.stringify({ name: "fixture", lockfileVersion: 3, packages: {} }, null, 2)}\n`);
    git(root, ["add", "--", "package-lock.json"]);
    git(root, ["commit", "--quiet", "-m", "lockfile baseline"]);
    const baseSha = git(root, ["rev-parse", "HEAD"]);
    commitManifest(root, { ...manifest, dependencies: { "example-package": "2.0.0" } });
    const script = path.resolve("scripts/checks/check-lockfile-policy.mjs");
    assert.throws(
      () => execFileSync(process.execPath, [script, `--base-ref=${baseSha}`, `--candidate-ref=${git(root, ["rev-parse", "HEAD"])}`], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
      /dependency graph changed|Command failed/,
    );
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("DEPLOY refuses an empty diff and a dirty worktree after reference verification", () => {
  const root = makeRepository();
  try {
    const productionSha = git(root, ["rev-parse", "HEAD"]);
    const empty = resolveDeployCandidate({
      repositoryRoot: root,
      deploymentReference: { sha: productionSha },
      deploymentProof: proof(productionSha),
    });
    assert.equal(empty.reason, "DEPLOY_NO_EXPLOITABLE_DIFF");

    fs.writeFileSync(path.join(root, "dirty.txt"), "not committed\n");
    const dirty = resolveDeployCandidate({
      repositoryRoot: root,
      deploymentReference: { sha: productionSha },
      deploymentProof: proof(productionSha),
    });
    assert.equal(dirty.reason, "DEPLOY_WORKTREE_NOT_CLEAN");
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});
