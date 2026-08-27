import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { describe, it } from "node:test";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { canonicalAgentFiles, validateAgentGovernance } from "./check-agent-governance.mjs";

function createValidFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-agent-governance-"));
  const content = {
    "AGENTS.md": "apps/web scripts documentation fichiers scoped",
    "apps/web/AGENTS.md": "Next.js Server/Client Leaflet",
    "apps/web/src/app/api/AGENTS.md": "AuthN AuthZ contrat de réponse propre",
    "apps/web/supabase/AGENTS.md": "apps/web/supabase/migrations/ unique RLS",
    "apps/web/scripts/AGENTS.md": "dry-run --apply provenance",
    "apps/mobile/AGENTS.md": "ClerkProvider Third-Party Auth `sub` Clerk distance_m",
    "scripts/AGENTS.md": "audit cleanup provenance",
    ".github/AGENTS.md": "permissions CodeQL check:github-actions",
    "maintenance/python/AGENTS.md": "hors du requirements pytest",
    "documentation/AGENTS.md": "état actuel historique public",
  };

  for (const relativePath of canonicalAgentFiles) {
    const absolutePath = path.join(root, ...relativePath.split("/"));
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, `${content[relativePath]}\n`);
  }

  fs.mkdirSync(path.join(root, "apps", "web", "supabase", "migrations"), { recursive: true });
  return root;
}

function runCheck(script, cwd) {
  try {
    return { status: 0, output: execFileSync(process.execPath, [script], { cwd, encoding: "utf8" }) };
  } catch (error) {
    return { status: error.status ?? 1, output: `${error.stdout ?? ""}${error.stderr ?? ""}` };
  }
}

describe("AGENTS hierarchy governance", () => {
  it("accepts the canonical ten-file hierarchy", () => {
    const fixture = createValidFixture();
    try {
      assert.deepEqual(validateAgentGovernance(fixture), []);
      const script = path.join(process.cwd(), "scripts", "checks", "check-agent-governance.mjs");
      const result = runCheck(script, fixture);
      assert.equal(result.status, 0);
      assert.match(result.output, /10 canonical files/);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("reports missing canonical boundaries with a corrective diagnostic", () => {
    const fixture = createValidFixture();
    fs.rmSync(path.join(fixture, "documentation", "AGENTS.md"));
    try {
      const findings = validateAgentGovernance(fixture);
      assert.ok(findings.some((finding) => finding.includes("Missing canonical AGENTS.md: documentation/AGENTS.md")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("rejects a second migration tree and a pages-site concurrent boundary", () => {
    const fixture = createValidFixture();
    fs.mkdirSync(path.join(fixture, "supabase", "migrations"), { recursive: true });
    fs.mkdirSync(path.join(fixture, "documentation", "pages_site"), { recursive: true });
    fs.writeFileSync(path.join(fixture, "documentation", "pages_site", "AGENTS.md"), "concurrent\n");
    try {
      const findings = validateAgentGovernance(fixture);
      assert.ok(findings.some((finding) => finding.includes("Second Supabase migration tree detected: supabase/migrations")));
      assert.ok(findings.some((finding) => finding.includes("Forbidden concurrent AGENTS.md location: documentation/pages_site/AGENTS.md")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("rejects a manually copied skill AGENTS.md", () => {
    const fixture = createValidFixture();
    const copiedSkill = path.join(fixture, ".codex", "skills", "copy", "AGENTS.md");
    fs.mkdirSync(path.dirname(copiedSkill), { recursive: true });
    fs.writeFileSync(copiedSkill, "manual copy\n");
    try {
      const findings = validateAgentGovernance(fixture);
      assert.ok(findings.some((finding) => finding.includes("Manual AGENTS.md copy under .codex/skills")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });
});
