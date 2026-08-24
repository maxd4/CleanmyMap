import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { stageMatchedArtifacts } from "./sentry-sourcemap-staging.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "../..");
const uploader = resolve(here, "..", "upload-sentry-sourcemaps.mjs");

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "cmm-sentry-staging-test-"));
  mkdirSync(join(root, "chunks"), { recursive: true });
  return root;
}

function writeMap(path, file = "") {
  writeFileSync(
    path,
    `${JSON.stringify({ version: 3, file, sources: [], names: [], mappings: "" })}\n`,
  );
}

function stagedRelative(root, relativePath) {
  return join(root, relativePath);
}

test("stages the historical Webpack foo.js/foo.js.map pair", () => {
  const fixture = createFixture();
  const bundle = join(fixture, "chunks", "foo.js");
  const sourceMap = join(fixture, "chunks", "foo.js.map");
  writeFileSync(bundle, "webpack bundle");
  writeMap(sourceMap, "foo.js");

  const stage = stageMatchedArtifacts(fixture, [sourceMap]);
  try {
    assert.deepEqual(stage.stagedFiles, [bundle]);
    assert.equal(stage.skippedMaps.length, 0);
    assert.equal(readFileSync(stagedRelative(stage.stagingRoot, "chunks/foo.js"), "utf8"), "webpack bundle");
    assert.equal(exists(stagedRelative(stage.stagingRoot, "chunks/foo.js.map")), true);
  } finally {
    rmSync(stage.stagingRoot, { recursive: true, force: true });
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("stages a Turbopack pair through the explicit sourceMappingURL reference", () => {
  const fixture = createFixture();
  const bundle = join(fixture, "chunks", "bundle-physical.js");
  const sourceMap = join(fixture, "chunks", "0x7q_turbopack.js.map");
  writeFileSync(bundle, "turbopack bundle\n//# sourceMappingURL=0x7q_turbopack.js.map\n");
  writeMap(sourceMap);

  const stage = stageMatchedArtifacts(fixture, [sourceMap]);
  try {
    assert.deepEqual(stage.stagedFiles, [bundle]);
    assert.equal(stage.skippedMaps.length, 0);
  } finally {
    rmSync(stage.stagingRoot, { recursive: true, force: true });
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("leaves an actually orphaned source map skipped", () => {
  const fixture = createFixture();
  const sourceMap = join(fixture, "chunks", "orphan.js.map");
  writeMap(sourceMap);

  const stage = stageMatchedArtifacts(fixture, [sourceMap]);
  try {
    assert.deepEqual(stage.stagedFiles, []);
    assert.deepEqual(stage.skippedMaps, [sourceMap]);
  } finally {
    rmSync(stage.stagingRoot, { recursive: true, force: true });
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("skips upload cleanly when Sentry configuration is absent", () => {
  const env = { ...process.env, CI: "1" };
  delete env.SENTRY_AUTH_TOKEN;
  delete env.SENTRY_ORG;
  delete env.SENTRY_PROJECT;

  const result = spawnSync(process.execPath, [uploader], {
    cwd: appRoot,
    env,
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /upload skipped: missing SENTRY_AUTH_TOKEN/);
});

test("does not delete source artifacts while staging", () => {
  const fixture = createFixture();
  const bundle = join(fixture, "chunks", "preserved.js");
  const sourceMap = join(fixture, "chunks", "preserved.js.map");
  const bundleContent = "preserve me";
  writeFileSync(bundle, bundleContent);
  writeMap(sourceMap);

  const stage = stageMatchedArtifacts(fixture, [sourceMap]);
  try {
    assert.equal(readFileSync(bundle, "utf8"), bundleContent);
    assert.equal(exists(bundle), true);
    assert.equal(exists(sourceMap), true);
  } finally {
    rmSync(stage.stagingRoot, { recursive: true, force: true });
    rmSync(fixture, { recursive: true, force: true });
  }
});

function exists(path) {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}
