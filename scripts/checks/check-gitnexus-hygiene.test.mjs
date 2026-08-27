import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { findGitNexusHygieneViolations } from "./check-gitnexus-hygiene.mjs";

function createFixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-gitnexus-hygiene-"));
}

test("current repository passes GitNexus hygiene", () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  assert.deepEqual(findGitNexusHygieneViolations(repoRoot), []);
});

test("rejects generated governance artifacts", (t) => {
  const repoRoot = createFixture();
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  fs.writeFileSync(
    path.join(repoRoot, "AGENTS.md"),
    "before\n<!-- gitnexus:start -->\ngenerated\n<!-- gitnexus:end -->\n",
  );
  fs.writeFileSync(path.join(repoRoot, "CLAUDE.md"), "generated");
  fs.mkdirSync(path.join(repoRoot, ".claude", "skills", "gitnexus"), { recursive: true });

  assert.deepEqual(
    findGitNexusHygieneViolations(repoRoot, { gitNexusIgnored: () => true }),
    [
      "AGENTS.md contains forbidden GitNexus generated markers: <!-- gitnexus:start -->, <!-- gitnexus:end -->",
      "CLAUDE.md at the repository root is forbidden; GitNexus must not generate it.",
      ".claude/skills/gitnexus/ is forbidden; keep GitNexus skills outside the repository.",
    ],
  );
});

test("rejects a repository where .gitnexus is not ignored", (t) => {
  const repoRoot = createFixture();
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));

  assert.deepEqual(
    findGitNexusHygieneViolations(repoRoot, { gitNexusIgnored: () => false }),
    [".gitnexus/ must remain local and ignored by Git."],
  );
});
