import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { test } from "node:test";
import os from "node:os";
import path from "node:path";
import { validateCandidateManifestFile } from "./candidate-artifacts.mjs";

function setup(artifactFile = "candidates/update.patch", targetPaths = ["AGENTS.md"], status = "CANDIDATE") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cmm-candidate-artifacts-"));
  const dir = path.join(root, "documentation/specs/example"); fs.mkdirSync(path.join(dir, "candidates"), { recursive: true });
  const artifactPath = path.join(dir, "candidates/update.patch"); const content = "diff --git a/AGENTS.md b/AGENTS.md\n"; fs.writeFileSync(artifactPath, content);
  const manifest = { schemaVersion: 1, status, artifacts: [{ file: artifactFile, targetPaths, kind: "patch", sha256: crypto.createHash("sha256").update(content).digest("hex") }] };
  const manifestPath = path.join(dir, "CANDIDATE.manifest.json"); fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  return { root, manifestPath, artifactPath, manifest };
}

test("accepts a present patch with exact target mapping and matching digest", () => { const x = setup(); try { assert.deepEqual(validateCandidateManifestFile(x.root, x.manifestPath), []); } finally { fs.rmSync(x.root, { recursive: true, force: true }); } });
test("rejects a manifest-only candidate or missing published artifact", () => { const x = setup("candidates/missing.patch", ["AGENTS.md"], "PUBLISHED"); try { assert.ok(validateCandidateManifestFile(x.root, x.manifestPath).some((error) => error.includes("artifact is absent"))); } finally { fs.rmSync(x.root, { recursive: true, force: true }); } });
test("rejects traversal in artifact path and target mapping", () => { const x = setup("../escape.patch", ["../AGENTS.md"]); try { const errors = validateCandidateManifestFile(x.root, x.manifestPath); assert.ok(errors.some((error) => error.includes("safe path"))); assert.ok(errors.some((error) => error.includes("safe repository-relative"))); } finally { fs.rmSync(x.root, { recursive: true, force: true }); } });
test("rejects stale candidate digests", () => { const x = setup(); x.manifest.artifacts[0].sha256 = "0".repeat(64); fs.writeFileSync(x.manifestPath, JSON.stringify(x.manifest)); try { assert.ok(validateCandidateManifestFile(x.root, x.manifestPath).some((error) => error.includes("SHA-256 mismatch"))); } finally { fs.rmSync(x.root, { recursive: true, force: true }); } });
