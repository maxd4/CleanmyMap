import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { removeFiles, stageMatchedArtifacts } from "./sentry-sourcemap-staging.mjs";
import { cleanupBuildSourceMaps } from "./sentry-sourcemap-cleanup.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "../..");
const uploader = resolve(here, "..", "upload-sentry-sourcemaps.mjs");

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "cmm-sentry-staging-test-"));
  mkdirSync(join(root, "chunks"), { recursive: true });
  return root;
}

function createBuildFixture() {
  const root = mkdtempSync(join(tmpdir(), "cmm-sentry-build-test-"));
  const staticDir = join(root, ".next", "static");
  const serverDir = join(root, ".next", "server");
  mkdirSync(staticDir, { recursive: true });
  mkdirSync(serverDir, { recursive: true });

  writeFileSync(join(staticDir, "client.js"), "client bundle");
  writeMap(join(staticDir, "client.js.map"));
  writeFileSync(join(serverDir, "server.js"), "server bundle");
  writeMap(join(serverDir, "server.js.map"));

  return { root, staticDir, serverDir };
}

function createFakeSentryCli(root) {
  if (process.platform === "win32") {
    const cli = join(root, "fake-sentry.cmd");
    writeFileSync(cli, "@echo off\r\nexit /b 0\r\n");
    return cli;
  }

  const cli = join(root, "fake-sentry.sh");
  writeFileSync(cli, "#!/bin/sh\nexit 0\n");
  chmodSync(cli, 0o755);
  return cli;
}

function createSourceMapRemovalBlocker(root) {
  const preload = join(root, "block-source-map-removal.mjs");
  writeFileSync(
    preload,
    [
      'import fs from "node:fs";',
      'import { syncBuiltinESMExports } from "node:module";',
      "const originalRmSync = fs.rmSync.bind(fs);",
      'fs.rmSync = (target, options) => { if (String(target).endsWith(".map")) throw new Error("simulated source map removal failure"); return originalRmSync(target, options); };',
      "syncBuiltinESMExports();",
      "",
    ].join("\n"),
  );
  return preload;
}

function runUploader(cwd, env) {
  return spawnSync(process.execPath, [uploader], {
    cwd,
    env,
    encoding: "utf8",
  });
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

test("removes generated source maps after upload", () => {
  const fixture = createFixture();
  const bundle = join(fixture, "chunks", "published.js");
  const sourceMap = join(fixture, "chunks", "published.js.map");
  writeFileSync(bundle, "published bundle");
  writeMap(sourceMap);

  try {
    assert.deepEqual(removeFiles([sourceMap]), []);
    assert.equal(exists(bundle), true);
    assert.equal(exists(sourceMap), false);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("removes client and server maps when Sentry upload is unavailable", () => {
  const fixture = createFixture();
  const staticDir = join(fixture, "static");
  const serverDir = join(fixture, "server");
  mkdirSync(staticDir, { recursive: true });
  mkdirSync(serverDir, { recursive: true });
  const clientMap = join(staticDir, "client.js.map");
  const serverMap = join(serverDir, "server.js.map");
  const clientBundle = join(staticDir, "client.js");
  writeMap(clientMap);
  writeMap(serverMap);
  writeFileSync(clientBundle, "client bundle");

  try {
    const result = cleanupBuildSourceMaps({ staticDir, serverDir });
    assert.equal(result.discovered, 2);
    assert.equal(result.removed, 2);
    assert.deepEqual(result.failed, []);
    assert.deepEqual(result.remaining, []);
    assert.equal(exists(clientBundle), true);
    assert.equal(exists(clientMap), false);
    assert.equal(exists(serverMap), false);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("reports failed and residual source map cleanup", () => {
  const fixture = createBuildFixture();
  const clientMap = join(fixture.staticDir, "client.js.map");

  try {
    const result = cleanupBuildSourceMaps({
      staticDir: fixture.staticDir,
      serverDir: fixture.serverDir,
      remove: () => [clientMap],
    });

    assert.deepEqual(result.failed, [clientMap]);
    assert.deepEqual(result.remaining, [clientMap, join(fixture.serverDir, "server.js.map")]);
    assert.equal(result.removed, 1);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("fails with a non-zero status when cleanup fails without Sentry configuration", () => {
  const fixture = createBuildFixture();
  const preload = createSourceMapRemovalBlocker(fixture.root);
  const secret = "source-map-test-secret";
  const env = {
    ...process.env,
    CI: "1",
    SENTRY_AUTH_TOKEN: secret,
    NODE_OPTIONS: `--import=${pathToFileURL(preload).href}`,
  };
  delete env.SENTRY_ORG;
  delete env.SENTRY_PROJECT;

  try {
    const result = runUploader(fixture.root, env);
    const output = `${result.stdout}\n${result.stderr}`;

    assert.notEqual(result.status, 0);
    assert.match(output, /Source map cleanup failed/);
    assert.match(output, /client\.js\.map/);
    assert.doesNotMatch(output, new RegExp(secret));
    assert.equal(exists(join(fixture.staticDir, "client.js.map")), true);
    assert.equal(exists(join(fixture.staticDir, "client.js")), true);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("removes all maps and preserves bundles with Sentry configuration", () => {
  const fixture = createBuildFixture();
  const cli = createFakeSentryCli(fixture.root);
  const env = {
    ...process.env,
    SENTRY_AUTH_TOKEN: "test-token",
    SENTRY_ORG: "test-org",
    SENTRY_PROJECT: "test-project",
    SENTRY_CLI_BIN: cli,
  };

  try {
    const result = runUploader(fixture.root, env);

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(exists(join(fixture.staticDir, "client.js.map")), false);
    assert.equal(exists(join(fixture.serverDir, "server.js.map")), false);
    assert.equal(exists(join(fixture.staticDir, "client.js")), true);
    assert.equal(exists(join(fixture.serverDir, "server.js")), true);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("fails with a non-zero status when configured Sentry cleanup fails", () => {
  const fixture = createBuildFixture();
  const cli = createFakeSentryCli(fixture.root);
  const preload = createSourceMapRemovalBlocker(fixture.root);
  const secret = "configured-source-map-test-secret";
  const env = {
    ...process.env,
    SENTRY_AUTH_TOKEN: secret,
    SENTRY_ORG: "test-org",
    SENTRY_PROJECT: "test-project",
    SENTRY_CLI_BIN: cli,
    NODE_OPTIONS: `--import=${pathToFileURL(preload).href}`,
  };

  try {
    const result = runUploader(fixture.root, env);
    const output = `${result.stdout}\n${result.stderr}`;

    assert.notEqual(result.status, 0);
    assert.match(output, /Source map cleanup failed/);
    assert.match(output, /client\.js\.map/);
    assert.doesNotMatch(output, new RegExp(secret));
    assert.equal(exists(join(fixture.staticDir, "client.js.map")), true);
    assert.equal(exists(join(fixture.staticDir, "client.js")), true);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
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
