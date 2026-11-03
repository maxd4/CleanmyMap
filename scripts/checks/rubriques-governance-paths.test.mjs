import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { MIGRATED_CONSUMERS } from "./check-overlays-governance.mjs";
import { documentedSpecializedSurfaceOverrides } from "./check-surface-governance.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const movedRubriquesRoots = [
  "apps/web/src/components/sections/rubriques/rejoindre-une-action/",
  "apps/web/src/components/sections/rubriques/weather/",
];

function isMovedRubriquePath(relativePath) {
  return movedRubriquesRoots.some((root) => relativePath.startsWith(root));
}

function assertRegisteredPathsExist(label, paths) {
  const registered = [...new Set(paths)];
  assert.ok(registered.length > 0, `${label} has no registered paths`);
  const missing = registered.filter((relativePath) => {
    const absolutePath = path.join(repositoryRoot, relativePath);
    return !fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile();
  });
  assert.deepEqual(missing, [], `${label} contains missing paths: ${missing.join(", ")}`);
}

function readBaselinePaths(relativePath) {
  const baseline = JSON.parse(fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8"));
  const collections = baseline.entries
    ? [baseline.entries]
    : Object.values(baseline).filter(Array.isArray);
  return collections.flat().map((entry) => entry.path).filter(Boolean);
}

test("Rubriques governance controls and baselines contain existing paths", () => {
  assertRegisteredPathsExist(
    "overlay migrated Rubriques consumers",
    [...MIGRATED_CONSUMERS.keys()].filter(isMovedRubriquePath),
  );
  assertRegisteredPathsExist(
    "surface specialized Rubriques owners",
    [...documentedSpecializedSurfaceOverrides.keys()].filter(isMovedRubriquePath),
  );
  assertRegisteredPathsExist(
    "complexity baseline moved Rubriques entries",
    readBaselinePaths("scripts/checks/complexity-baseline.json").filter(isMovedRubriquePath),
  );
  assertRegisteredPathsExist(
    "heavy-files baseline moved Rubriques entries",
    readBaselinePaths("scripts/checks/heavy-files-baseline.json").filter(isMovedRubriquePath),
  );
});

test("Rubriques governance rejects a registered path that does not exist", () => {
  assert.throws(
    () => assertRegisteredPathsExist("synthetic governance entry", [
      "apps/web/src/components/sections/rubriques/rejoindre-une-action/__missing__.tsx",
    ]),
    /synthetic governance entry contains missing paths/,
  );
});
