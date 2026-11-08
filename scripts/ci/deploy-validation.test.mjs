import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { removePathWithRetry } from "./validation-evidence.mjs";
import { inspectVercelProduction, resolveDeployCandidate as resolveDeployCandidateRaw } from "./deploy-validation.mjs";

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
    projectId: "prj_test",
    deploymentId: "dpl_test",
    productionAlias: "cleanmymap.fr",
    verified: true,
    verificationMethod: "vercel-inspection",
    ...overrides,
  };
}

const authenticatedVercelClient = async ({ proof: reference }) => ({
  valid: true,
  inspection: {
    verified: true,
    projectId: reference.projectId,
    projectName: "web",
    rootDirectory: "apps/web",
    repository: "maxd4/CleanmyMap",
    deploymentId: reference.deploymentId,
    target: "production",
    readyState: "READY",
    gitSha: reference.sha,
    productionAlias: reference.productionAlias,
    verificationMethod: "vercel-api-readonly",
  },
});

async function resolveDeployCandidate(options) {
  return resolveDeployCandidateRaw({ vercelClient: authenticatedVercelClient, ...options });
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

test("DEPLOY uses the verified Production SHA and includes the cumulative Web diff", async () => {
  const root = makeRepository();
  try {
    const productionSha = git(root, ["rev-parse", "HEAD"]);
    commitWebChange(root, "first.tsx");
    commitWebChange(root, "second.tsx");
    const result = await resolveDeployCandidate({
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

test("DEPLOY refuses an arbitrary newer base that would omit an unpublished Web commit", async () => {
  const root = makeRepository();
  try {
    const productionSha = git(root, ["rev-parse", "HEAD"]);
    commitWebChange(root, "first.tsx");
    const arbitraryBase = git(root, ["rev-parse", "HEAD"]);
    commitWebChange(root, "second.tsx");
    const result = await resolveDeployCandidate({
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

test("DEPLOY refuses an absent, non-ancestor, or unverifiable Production reference", async () => {
  const root = makeRepository();
  try {
    const productionSha = git(root, ["rev-parse", "HEAD"]);
    commitWebChange(root);
    const absent = await resolveDeployCandidate({ repositoryRoot: root });
    assert.equal(absent.reason, "DEPLOY_PUBLICATION_REFERENCE_UNVERIFIED");

    const foreignRoot = makeRepository();
    try {
      const foreignSha = git(foreignRoot, ["rev-parse", "HEAD"]);
      const nonAncestor = await resolveDeployCandidate({
        repositoryRoot: root,
        deploymentReference: { sha: foreignSha },
        deploymentProof: proof(foreignSha),
      });
      assert.equal(nonAncestor.reason, "DEPLOY_PUBLICATION_SHA_UNVERIFIED");
    } finally {
      removePathWithRetry(foreignRoot, { recursive: true });
    }

    const unverifiable = await resolveDeployCandidate({
      repositoryRoot: root,
      deploymentReference: { sha: productionSha },
      deploymentProof: proof(productionSha, { verified: false }),
    });
    assert.equal(unverifiable.reason, "DEPLOY_PUBLICATION_PROOF_INVALID");

    const localOnly = await resolveDeployCandidateRaw({
      repositoryRoot: root,
      deploymentReference: { sha: productionSha },
      deploymentProof: proof(productionSha),
    });
    assert.equal(localOnly.reason, "DEPLOY_VERCEL_AUTH_UNAVAILABLE");

    const preview = await resolveDeployCandidateRaw({
      repositoryRoot: root,
      deploymentReference: { sha: productionSha },
      deploymentProof: proof(productionSha),
      vercelClient: async () => ({ valid: false, reason: "DEPLOY_VERCEL_PROVENANCE_MISMATCH" }),
    });
    assert.equal(preview.reason, "DEPLOY_VERCEL_PROVENANCE_MISMATCH");
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("authenticated Vercel inspection requires the active READY Production deployment and alias", async () => {
  const root = makeRepository();
  try {
    const productionSha = git(root, ["rev-parse", "HEAD"]);
    const reference = proof(productionSha);
    const fetchImpl = async (url) => {
      if (url.includes("/v9/projects/")) return { ok: true, json: async () => ({ id: "prj_test", name: "web", settings: { rootDirectory: "apps/web" }, link: { org: "maxd4", repo: "CleanmyMap" } }) };
      if (url.includes("/v13/deployments/")) return { ok: true, json: async () => ({ id: "dpl_test", target: "production", readyState: "READY", gitSource: { sha: productionSha } }) };
      return { ok: true, json: async () => [{ alias: "cleanmymap.fr" }] };
    };
    const verified = await inspectVercelProduction({ repositoryRoot: root, proof: reference, token: "test-token", projectId: "prj_test", fetchImpl });
    assert.equal(verified.valid, true);
    assert.equal(verified.inspection.repository, "maxd4/CleanmyMap");

    const preview = await inspectVercelProduction({
      repositoryRoot: root,
      proof: reference,
      token: "test-token",
      projectId: "prj_test",
      fetchImpl: async (url, options) => fetchImpl(url, options).then((response) => url.includes("/v13/deployments/")
        ? { ok: true, json: async () => ({ id: "dpl_test", target: "preview", readyState: "READY", gitSource: { sha: productionSha } }) }
        : response),
    });
    assert.equal(preview.valid, false);
    assert.equal(preview.reason, "DEPLOY_VERCEL_PROVENANCE_MISMATCH");

    const stale = await inspectVercelProduction({
      repositoryRoot: root,
      proof: reference,
      token: "test-token",
      projectId: "prj_test",
      fetchImpl: async (url, options) => fetchImpl(url, options).then((response) => url.includes("/v13/deployments/")
        ? { ok: true, json: async () => ({ id: "dpl_old", target: "production", readyState: "READY", gitSource: { sha: productionSha } }) }
        : response),
    });
    assert.equal(stale.valid, false);
    assert.equal(stale.reason, "DEPLOY_VERCEL_PROVENANCE_MISMATCH");
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("independent Mobile changes do not block a Web DEPLOY scope", async () => {
  const root = makeRepository();
  try {
    const productionSha = git(root, ["rev-parse", "HEAD"]);
    commitWebChange(root);
    fs.mkdirSync(path.join(root, "apps", "mobile"), { recursive: true });
    fs.writeFileSync(path.join(root, "apps", "mobile", "App.tsx"), "export default null;\n");
    git(root, ["add", "--", "apps/mobile/App.tsx"]);
    git(root, ["commit", "--quiet", "-m", "mobile change"]);
    const result = await resolveDeployCandidate({
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

test("shared contract changes are included in the Web scope", async () => {
  const root = makeRepository();
  try {
    const productionSha = git(root, ["rev-parse", "HEAD"]);
    fs.mkdirSync(path.join(root, "packages", "contracts"), { recursive: true });
    fs.writeFileSync(path.join(root, "packages", "contracts", "index.ts"), "export const contract = true;\n");
    git(root, ["add", "--", "."]);
    git(root, ["commit", "--quiet", "-m", "shared contract"]);
    const result = await resolveDeployCandidate({
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

test("DEPLOY distinguishes npm scripts-only changes from an unpaired dependency change", async () => {
  const root = makeRepository();
  try {
    const manifest = { scripts: { check: "node check.mjs" }, dependencies: { "example-package": "1.0.0" } };
    commitManifest(root, manifest);
    const productionSha = git(root, ["rev-parse", "HEAD"]);
    commitManifest(root, { ...manifest, scripts: { check: "node other-check.mjs" } });
    const scriptsOnly = await resolveDeployCandidate({
      repositoryRoot: root,
      deploymentReference: { sha: productionSha },
      deploymentProof: proof(productionSha),
    });
    assert.equal(scriptsOnly.valid, true);
    assert.equal(scriptsOnly.dependencyGraphChanged, false);

    commitManifest(root, { ...manifest, dependencies: { "example-package": "2.0.0" } });
    const dependencyChanged = await resolveDeployCandidate({
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

test("DEPLOY refuses an empty diff and a dirty worktree after reference verification", async () => {
  const root = makeRepository();
  try {
    const productionSha = git(root, ["rev-parse", "HEAD"]);
    const empty = await resolveDeployCandidate({
      repositoryRoot: root,
      deploymentReference: { sha: productionSha },
      deploymentProof: proof(productionSha),
    });
    assert.equal(empty.reason, "DEPLOY_NO_EXPLOITABLE_DIFF");

    fs.writeFileSync(path.join(root, "dirty.txt"), "not committed\n");
    const dirty = await resolveDeployCandidate({
      repositoryRoot: root,
      deploymentReference: { sha: productionSha },
      deploymentProof: proof(productionSha),
    });
    assert.equal(dirty.reason, "DEPLOY_WORKTREE_NOT_CLEAN");
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});
