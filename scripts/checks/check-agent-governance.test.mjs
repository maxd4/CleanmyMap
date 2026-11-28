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
  const rules = Array.from({ length: 12 }, (_, index) => `### R${String(index + 1).padStart(2, "0")} — RULE`).join("\n");
  const content = {
    "AGENTS.md": ["apps/web scripts documentation fichiers scoped MAIN-ONLY / MULTI-WRITER COORDONNÉ origin/main STAGED PUSH_CANDIDATE DYNAMIC_CANDIDATE pre-commit pre-push `COMMIT_READY` INTEGRATION_VALIDATED Bypassed rule violations", rules.replace("R01 — RULE", "R01 — CONTINUITÉ").replace("R12 — RULE", "R12 — CLÔTURE CONTRÔLÉE"), "### LEGACY / COMPATIBILITY", "MAIN-ONLY / SINGLE-WRITER workspace:start codex/<run-id> CleanMyMap-worktrees publication-acquire"].join("\n"),
    "CHATGPT.md": "AGENTS.md est l'autorité unique. Contribution directe et réception indépendante après publication.",
    "apps/web/AGENTS.md": "Next.js Server/Client Leaflet",
    "apps/web/src/app/api/AGENTS.md": "AuthN AuthZ contrat de réponse propre",
    "apps/web/supabase/AGENTS.md": "apps/web/supabase/migrations/ unique RLS",
    "apps/web/scripts/AGENTS.md": "dry-run --apply provenance",
    "apps/mobile/AGENTS.md": "ClerkProvider Third-Party Auth `sub` Clerk distance_m",
    "scripts/AGENTS.md": "audit cleanup provenance MAIN-ONLY / MULTI-WRITER COORDONNÉ origin/main STAGED PUSH_CANDIDATE DYNAMIC_CANDIDATE pre-commit pre-push. AGENTS.md` (R01–R12) refuse les chemins hors allowlist.",
    ".github/AGENTS.md": "permissions CodeQL check:github-actions",
    "maintenance/python/AGENTS.md": "hors du requirements pytest",
    "documentation/AGENTS.md": "état actuel historique public",
    "e2e/AGENTS.md": "TESTING.md PUBLIC PROTECTED_SERVER_ONLY PROTECTED_CLERK_CLIENT Clerk Development Supabase storageState fixtures",
  };
  for (const relativePath of canonicalAgentFiles) {
    const absolutePath = path.join(root, ...relativePath.split("/"));
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, `${content[relativePath]}\n`);
  }

  fs.writeFileSync(path.join(root, "CHATGPT.md"), `${content["CHATGPT.md"]}\n`);

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
  it("accepts the canonical eleven-file hierarchy", () => {
    const fixture = createValidFixture();
    try {
      assert.deepEqual(validateAgentGovernance(fixture), []);
      const script = path.join(process.cwd(), "scripts", "checks", "check-agent-governance.mjs");
      const result = runCheck(script, fixture);
      assert.equal(result.status, 0);
      assert.match(result.output, /11 canonical files/);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("rejects a legacy policy that publishes foreign ahead commits", () => {
    const fixture = createValidFixture();
    const agentsPath = path.join(fixture, "AGENTS.md");
    fs.appendFileSync(agentsPath, "\n## Current policy\nTous les chemins tracked staged/unstaged et untracked du snapshot initial sont inclus.\n");
    try {
      const findings = validateAgentGovernance(fixture);
      assert.ok(findings.some((finding) => finding.includes("contradictory delivery rule remains")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("requires each numbered root rule exactly once", () => {
    const fixture = createValidFixture();
    const agentsPath = path.join(fixture, "AGENTS.md");
    fs.appendFileSync(agentsPath, "\n### R01 — DUPLICATE\n");
    try {
      const findings = validateAgentGovernance(fixture);
      assert.ok(findings.some((finding) => finding.includes("R01") && finding.includes("exactly once")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("requires the independent reception boundary in ChatGPT guidance", () => {
    const fixture = createValidFixture();
    const chatgptPath = path.join(fixture, "CHATGPT.md");
    const current = fs.readFileSync(chatgptPath, "utf8");
    fs.writeFileSync(
      chatgptPath,
      current.replace("réception indépendante", "livraison terminée"),
    );
    try {
      const findings = validateAgentGovernance(fixture);
      assert.ok(findings.some((finding) => finding.includes("independent result reception boundary is missing")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("rejects legacy coordinator terms in the current section", () => {
    const fixture = createValidFixture();
    const agentsPath = path.join(fixture, "AGENTS.md");
    const current = fs.readFileSync(agentsPath, "utf8");
    fs.writeFileSync(agentsPath, current.replace("PUSH_CANDIDATE", "PUBLICATION_PENDING PUSH_CANDIDATE"));
    try {
      const findings = validateAgentGovernance(fixture);
      assert.ok(findings.some((finding) => finding.includes("PUBLICATION_PENDING")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("rejects the retired single-writer doctrine in a current section", () => {
    const fixture = createValidFixture();
    const agentsPath = path.join(fixture, "AGENTS.md");
    const current = fs.readFileSync(agentsPath, "utf8");
    fs.writeFileSync(agentsPath, current.replace("PUSH_CANDIDATE", "MAIN-ONLY / SINGLE-WRITER PUSH_CANDIDATE"));
    try {
      const findings = validateAgentGovernance(fixture);
      assert.ok(findings.some((finding) => finding.includes("MAIN-ONLY / SINGLE-WRITER")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("allows legacy coordinator terms only in a marked compatibility section", () => {
    const fixture = createValidFixture();
    try {
      assert.deepEqual(validateAgentGovernance(fixture), []);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("rejects a remaining old all-paths publication contradiction", () => {
    const fixture = createValidFixture();
    const agentsPath = path.join(fixture, "AGENTS.md");
    const chatgptPath = path.join(fixture, "CHATGPT.md");
    fs.writeFileSync(
      agentsPath,
      `${fs.readFileSync(agentsPath, "utf8")}\n## Current policy\nTous les chemins tracked staged/unstaged et untracked du snapshot initial.\n`,
    );
    fs.writeFileSync(
      chatgptPath,
      `${fs.readFileSync(chatgptPath, "utf8")}\nSans push tant que le mode reste actif.\n`,
    );
    try {
      const findings = validateAgentGovernance(fixture);
      assert.ok(findings.some((finding) => finding.includes("contradictory delivery rule remains")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("requires scoped ChatGPT guidance to defer universal rules", () => {
    const fixture = createValidFixture();
    const chatgptPath = path.join(fixture, "CHATGPT.md");
    fs.writeFileSync(chatgptPath, "Contribution directe et réception indépendante.\n");
    try {
      const findings = validateAgentGovernance(fixture);
      assert.ok(findings.some((finding) => finding.includes("CHATGPT.md") && finding.includes("defer universal rules")));
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
