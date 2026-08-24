import test from "node:test";
import assert from "node:assert/strict";

import {
  readManifest,
  resolveManifestEntries,
} from "./generate-gpt-context.mjs";

test("GPT context manifest resolves only existing repository files", () => {
  const manifest = readManifest();
  const entries = resolveManifestEntries();

  assert.equal(manifest.length, 24);
  assert.equal(entries.length, manifest.length);
  for (const entry of entries) {
    assert.equal(entry.target.includes(".."), false);
    assert.equal(entry.source.includes("gpt-context"), false);
  }
});
