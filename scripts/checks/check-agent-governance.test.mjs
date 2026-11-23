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
    "AGENTS.md": [
      "apps/web scripts documentation fichiers scoped MAIN-ONLY / MULTI-WRITER COORDONNÉ origin/main STAGED PUSH_CANDIDATE DYNAMIC_CANDIDATE pre-commit pre-push",
      "Plusieurs writers Codex peuvent travailler dans le checkout canonique ; ils ne doivent jamais écraser silencieusement les changements d’un autre writer.",
      "Les modifications sur des fichiers distincts peuvent progresser en parallèle ; un même fichier, l’index, HEAD et les opérations Git mutantes doivent être relus et réconciliés explicitement.",
      "main publié = référence versionnée ;",
      "une candidate locale explicitement fournie ou produite pour le lot courant est autoritative pour ce lot jusqu’à intégration ;",
      "tout changement local préexistant doit être préservé et ne doit jamais être écrasé par une synchronisation avec Git.",
      "L'allowlist initiale sert à l'attribution et au cadrage ; elle ne fige pas le candidat final.",
      "Plusieurs chantiers ou writers peuvent être regroupés dans un commit lorsque chaque changement est identifié, attribué, relu et validé sur le candidat final exact.",
      "Cette règle contrôle la création des nouveaux commits, pas la publication des commits déjà créés. Lorsqu'un push est explicitement demandé, tous les commits locaux en avance sur la branche distante cible sont publiés dans leur ordre d'historique, même s'ils contiennent des chemins étrangers au lot courant ou proviennent d'autres writers.",
      "Workflow de chaque exécution de lot : validation → commit validé → push main → vérification de convergence",
      "Le mode de développement rapide ne supprime pas l'exigence de commit et push ; une interdiction explicite de l'utilisateur autorise un commit local sans push",
      "",
      "### LEGACY / COMPATIBILITY",
      "MAIN-ONLY / SINGLE-WRITER workspace:start codex/<run-id> CleanMyMap-worktrees publication-acquire",
    ].join("\n"),
    "CHATGPT.md": [
      "MAIN-ONLY / MULTI-WRITER COORDONNÉ",
      "ChatGPT est limité à la lecture et à la revue de GitHub. Codex est responsable de l'intégration locale, des commits validés et de la publication fast-forward, conformément à AGENTS.md et scripts/AGENTS.md.",
      "Pour chaque exécution de travail qui produit un lot : validation → commit validé → push main → vérification de convergence",
      "La Commit Review privilégie le résultat publié et les régressions démontrées. La taille, le regroupement ou l'organisation des commits ne suffisent pas à demander un prompt correctif.",
      "Le mode de développement rapide ne supprime pas cette publication ; une interdiction explicite de l'utilisateur autorise un commit local sans push",
    ].join("\n"),
    "apps/web/AGENTS.md": "Next.js Server/Client Leaflet",
    "apps/web/src/app/api/AGENTS.md": "AuthN AuthZ contrat de réponse propre",
    "apps/web/supabase/AGENTS.md": "apps/web/supabase/migrations/ unique RLS",
    "apps/web/scripts/AGENTS.md": "dry-run --apply provenance",
    "apps/mobile/AGENTS.md": "ClerkProvider Third-Party Auth `sub` Clerk distance_m",
    "scripts/AGENTS.md": [
      "audit cleanup provenance MAIN-ONLY / MULTI-WRITER COORDONNÉ origin/main STAGED PUSH_CANDIDATE DYNAMIC_CANDIDATE pre-commit pre-push",
      "L'allowlist initiale est un cadrage d'attribution, pas un plafond immuable.",
      "Plusieurs chantiers ou writers peuvent être regroupés dans un nouveau commit si tous les changements sont identifiés, attribués, relus et validés sur le candidat final exact.",
      "Les commits déjà créés en avance sont publiés sans filtrage d'attribution, même s'ils dépassent le lot courant.",
      "Workflow hors mode rapide : validation du candidat final exact → commit validé → push main → vérification de convergence",
    ].join("\n"),
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

  it("requires the current rule to publish already-created commits without attribution filtering", () => {
    const fixture = createValidFixture();
    const agentsPath = path.join(fixture, "AGENTS.md");
    const current = fs.readFileSync(agentsPath, "utf8");
    fs.writeFileSync(
      agentsPath,
      current.replace(
        "tous les commits locaux en avance sur la branche distante cible sont publiés",
        "seuls les commits attribués au lot courant sont publiés",
      ),
    );
    try {
      const findings = validateAgentGovernance(fixture);
      assert.ok(findings.some((finding) => finding.includes("tous les commits locaux en avance")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("requires attribution and requalification when the final candidate differs from its initial scope", () => {
    const fixture = createValidFixture();
    const agentsPath = path.join(fixture, "AGENTS.md");
    const current = fs.readFileSync(agentsPath, "utf8");
    fs.writeFileSync(
      agentsPath,
      current.replace(
        "Plusieurs chantiers ou writers peuvent être regroupés dans un commit",
        "Un seul chantier doit être committé à la fois",
      ),
    );
    try {
      const findings = validateAgentGovernance(fixture);
      assert.ok(findings.some((finding) => finding.includes("Plusieurs chantiers ou writers peuvent être regroupés dans un commit")));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("requires Commit Review to focus on published outcomes and demonstrated regressions", () => {
    const fixture = createValidFixture();
    const chatgptPath = path.join(fixture, "CHATGPT.md");
    const current = fs.readFileSync(chatgptPath, "utf8");
    fs.writeFileSync(
      chatgptPath,
      current.replace(
        "La taille, le regroupement ou l'organisation des commits ne suffisent pas à demander un prompt correctif.",
        "Un prompt correctif peut demander de séparer les commits selon leur taille.",
      ),
    );
    try {
      const findings = validateAgentGovernance(fixture);
      assert.ok(findings.some((finding) => finding.includes("Commit Review must prioritize published outcomes and demonstrated regressions")));
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

  it("rejects contradictory CURRENT workflow wording", () => {
    const fixture = createValidFixture();
    const agentsPath = path.join(fixture, "AGENTS.md");
    const chatgptPath = path.join(fixture, "CHATGPT.md");
    fs.writeFileSync(
      agentsPath,
      fs.readFileSync(agentsPath, "utf8").replace(
        "main publié = référence versionnée ;",
        "l'état local est prioritaire sur l'etat github",
      ),
    );
    fs.writeFileSync(
      chatgptPath,
      fs.readFileSync(chatgptPath, "utf8").replace(
        "ChatGPT est limité à la lecture et à la revue de GitHub",
        "ChatGPT est autorisé à modifier GitHub, committer et pousser sur main",
      ),
    );
    try {
      const findings = validateAgentGovernance(fixture);
      assert.ok(findings.some((finding) => finding.includes("global local-over-GitHub priority")));
      assert.ok(findings.some((finding) => finding.includes("current policy must limit ChatGPT to GitHub reading and review")));
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
