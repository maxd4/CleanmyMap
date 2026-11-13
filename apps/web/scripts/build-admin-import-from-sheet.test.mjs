import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin import keeps the local snapshot fallback and expected dates", async () => {
const artifactUrl = new URL(
  "../data/raw/google-sheet-admin-import.json",
  import.meta.url,
);
const artifact = JSON.parse(await readFile(artifactUrl, "utf8"));
const importerSource = await readFile(
  new URL("./build-admin-import-from-sheet.mjs", import.meta.url),
  "utf8",
);
const wasteByDate = new Map(
  artifact.items.map((item) => [item.actionDate, item.wasteKg]),
);

assert.deepEqual(
  [
    ["2026-02-14", null],
    ["2026-03-06", null],
    ["2026-03-21", 20],
    ["2026-04-11", null],
    ["2026-04-22", 20],
  ].map(([date]) => [date, wasteByDate.get(date)]),
  [
    ["2026-02-14", null],
    ["2026-03-06", null],
    ["2026-03-21", 20],
    ["2026-04-11", null],
    ["2026-04-22", 20],
  ],
);

const syntheticRoutes = artifact.items.filter(
  (item) => item.manualDrawing?.kind === "polyline",
);
assert.equal(syntheticRoutes.length, 5);
assert.ok(syntheticRoutes.every((item) => item.geometrySource === "estimated_route"));
assert.ok(syntheticRoutes.every((item) => item.geometryConfidence === 0.6));
assert.ok(syntheticRoutes.every((item) => item.notes?.includes("[cmm-meta]")));

assert.doesNotMatch(
  importerSource,
  /writeFile\(RAW_PATH,\s*csvText/,
  "remote CSV content must not overwrite the local fallback snapshot",
);
assert.match(
  importerSource,
  /readFileImpl\(paths\.rawPath/,
  "the existing local snapshot remains available as a fallback",
);
});
