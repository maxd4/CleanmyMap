import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDocumentationNotMeasured,
  buildDocumentationMaintainabilityReport,
  DOCUMENTATION_THRESHOLDS,
  formatDocumentationAuditSummary,
} from "./documentation-maintainability.mjs";

function viewFrom(entries) {
  const contents = new Map(Object.entries(entries).map(([file, content]) => [file, Buffer.from(content)]));
  return {
    listFiles: () => [...contents.keys()],
    readBinary: (file) => contents.get(file),
  };
}

function run(entries) {
  return buildDocumentationMaintainabilityReport({
    auditedSha: "a".repeat(40),
    runId: "documentation-test",
    repositoryViewFactory: () => viewFrom(entries),
  });
}

test("mesure un document court, ignore les blocs de code et valide les liens relatifs", () => {
  const before = {
    "README.md": "# Intro\n\n[Guide](./guide.md#target)\n[Absent](./missing.md)\n\n## Exemple\n\n```md\n# faux titre\n[ignoré](./missing-in-code.md)\n```\n",
    "guide.md": "# Target\n\nContenu.\n",
  };
  const report = run(before);
  const document = report.documents.find((entry) => entry.path === "README.md");

  assert.equal(report.status, "PASS");
  assert.equal(document.lines, 12);
  assert.equal(document.headingCount, 2);
  assert.equal(document.maxHeadingDepth, 2);
  assert.equal(document.internalLinks.count, 2);
  assert.equal(document.internalLinks.invalid.length, 1);
  assert.equal(document.internalLinks.invalid[0].reason, "TARGET_NOT_FOUND");
  assert.equal(document.level, "NONE");
  assert.deepEqual(before["README.md"], "# Intro\n\n[Guide](./guide.md#target)\n[Absent](./missing.md)\n\n## Exemple\n\n```md\n# faux titre\n[ignoré](./missing-in-code.md)\n```\n");
});

test("résume contrats, documents longs, provenance des liens et références non vérifiables", () => {
  const report = run({
    "documentation/current.md": "Statut : CURRENT\n# Contrat\n\n[Absent](./missing.md)\n[Route](./unresolved)\n",
    "documentation/history.md": "Statut : HISTORY\n# Ancien\n\n[Archive absente](./missing-history.md)\n",
    "vendor/reference.md": "Statut : CURRENT\n# Vendor\n\n[Vendor absent](./missing-vendor.md)\n",
    "documentation/long.md": `Statut : CURRENT\n# Long\n${Array.from({ length: DOCUMENTATION_THRESHOLDS.reviewRequired }, () => "ligne de preuve").join("\n")}`,
  });
  report.contractReviews.push({
    path: "apps/web/src/lib/example.ts",
    symbol: "example",
    status: "REVIEW_REQUIRED",
    reasons: ["MISSING_PERMISSIONS"],
    documentsExamined: [{ path: "documentation/current.md", attributions: [{ line: 3 }] }],
  });
  const before = JSON.stringify(report);
  const summary = formatDocumentationAuditSummary(report, { maxDetails: 3 });

  assert.match(summary, /Liens actifs invalides: 1 \| historiques: 1 \| vendor: 1/);
  assert.match(summary, /non vérifiables: 1/);
  assert.match(summary, /Nature des références: fichiers absents 3 \| liens vers dossiers 0 \| routes applicatives reconnues 0 \| cibles non vérifiables 1/);
  assert.match(summary, /documentation\/long\.md/);
  assert.match(summary, /apps\/web\/src\/lib\/example\.ts#example.*MISSING_PERMISSIONS/);
  assert.match(summary, /documentation\/current\.md:L4.*TARGET_NOT_FOUND/);
  assert.equal(JSON.stringify(report), before);
});

test("rend un statut documentaire non mesuré sans déguiser le rapport en résultat vide", () => {
  const report = buildDocumentationNotMeasured({ auditedHead: "b".repeat(40), runId: "documentation-unavailable", reason: "SOURCE_UNAVAILABLE" });
  const summary = formatDocumentationAuditSummary(report);

  assert.match(summary, /status|statut/i);
  assert.match(summary, /NOT_MEASURED/);
  assert.match(summary, /SOURCE_UNAVAILABLE/);
});

test("priorise les revues AuthZ/RLS, puis scientifiques, sans changer leur classement", () => {
  const report = {
    auditedHead: "c".repeat(40), runId: "priority", status: "PASS", attentionRequired: true,
    summary: { trackedDocuments: 0, criticalContracts: 3, documentedContracts: 0, reviewRequiredContracts: 3, notMeasuredContracts: 0 },
    documents: [],
    contractReviews: [
      { path: "z/other.ts", kind: "SHARED_SERVICE", status: "REVIEW_REQUIRED", reasons: ["MISSING_TESTS"] },
      { path: "b/science.ts", kind: "SCIENTIFIC_CALCULATION", status: "REVIEW_REQUIRED", reasons: ["MISSING_UNITS"] },
      { path: "a/auth.ts", kind: "AUTHORIZATION", status: "REVIEW_REQUIRED", reasons: ["MISSING_RLS"] },
    ],
  };
  const summary = formatDocumentationAuditSummary(report, { maxDetails: 3 });
  const authIndex = summary.indexOf("a/auth.ts");
  const scienceIndex = summary.indexOf("b/science.ts");
  const otherIndex = summary.indexOf("z/other.ts");

  assert.ok(authIndex < scienceIndex && scienceIndex < otherIndex);
  assert.deepEqual(report.contractReviews.map((review) => review.status), ["REVIEW_REQUIRED", "REVIEW_REQUIRED", "REVIEW_REQUIRED"]);
});

test("le dry-run CLI documentaire ne crée ni ne modifie de fichier", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "documentation-maintainability-dry-run-"));
  const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "documentation-maintainability.mjs");
  try {
    fs.mkdirSync(path.join(root, "documentation"), { recursive: true });
    fs.writeFileSync(path.join(root, "documentation", "README.md"), "# Documentation fixture\n", "utf8");
    childProcess.execFileSync("git", ["init", "-q"], { cwd: root });
    childProcess.execFileSync("git", ["add", "--", "documentation/README.md"], { cwd: root });
    childProcess.execFileSync("git", ["-c", "user.name=Codex test", "-c", "user.email=codex-test", "commit", "-qm", "fixture"], { cwd: root });
    const before = childProcess.execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
    const output = childProcess.execFileSync(process.execPath, [script, "--root", root, "--dry-run"], { cwd: root, encoding: "utf8" });
    const after = childProcess.execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });

    assert.match(output, /DOCUMENTATION_AUDIT_MODE: DRY_RUN/);
    assert.match(output, /écriture: aucune/);
    assert.equal(after, before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("classe les liens locaux, externes et les chemins relatifs sans fallback racine", () => {
  const report = run({
    "docs/index.md": "# Index\n\n[Guide](guide.md)\n[Guide relative](./guide.md#section)\n[Encodé](./guide%2Emd)\n[Absent](missing.md)\n[Externe](https://example.com/guide.md)\n",
    "docs/guide.md": "# Section\n\nTexte\n",
    "docs/section/other.md": "# Other\n\n[Homonyme racine](./guide.md)\n",
    "guide.md": "# Root guide\n",
  });
  const index = report.documents.find((document) => document.path === "docs/index.md");
  const other = report.documents.find((document) => document.path === "docs/section/other.md");

  assert.equal(index.internalLinks.count, 4);
  assert.equal(index.internalLinks.invalid.length, 1);
  assert.equal(index.internalLinks.invalid[0].reason, "TARGET_NOT_FOUND");
  assert.equal(index.internalLinks.invalid[0].resolvedPath, "docs/missing.md");
  assert.equal(index.internalLinks.items.some((link) => link.target.startsWith("https://")), false);
  assert.equal(other.internalLinks.invalid.length, 1);
  assert.equal(other.internalLinks.unverified.length, 0);
  assert.equal(other.internalLinks.items[0].target, "./guide.md");
  assert.equal(other.internalLinks.items[0].line, 3);
  assert.equal(other.internalLinks.invalid[0].resolvedPath, "docs/section/guide.md");
});

test("signale séparément les références dont la syntaxe ne permet pas une vérification certaine", () => {
  const report = run({ "docs/index.md": "# Index\n\n[Route](guide)\n" });
  const document = report.documents[0];

  assert.equal(document.internalLinks.count, 1);
  assert.deepEqual(document.internalLinks.invalid, []);
  assert.equal(document.internalLinks.unverified[0].reason, "UNVERIFIED_REFERENCE");
  assert.equal(report.summary.invalidReferences, 0);
  assert.equal(report.summary.unverifiedReferences, 1);
});

test("respecte la longueur des fences, ignore le code inline et mesure le Setext initial", () => {
  const report = run({
    "docs/code.md": "Title\n=====\n\n````text\n# faux titre\n[fausse](missing.md)\n```\n# toujours dans le code\n````\n\n`[inline](missing-inline.md)`\n\n# Réel\n",
  });
  const document = report.documents[0];

  assert.equal(document.headingCount, 2);
  assert.deepEqual(document.sections.map((section) => ({ title: section.title, startLine: section.startLine })), [
    { title: "Title", startLine: 1 },
    { title: "Réel", startLine: 13 },
  ]);
  assert.equal(document.internalLinks.count, 0);
  assert.deepEqual(document.internalLinks.invalid, []);
});

test("ne ferme une fence qu'avec le même délimiteur sans texte résiduel", () => {
  const report = run({
    "docs/fences.md": "# Avant\n\n```md\n```js\n# faux\n[fausse](missing-in-code.md)\n```\n# Réel\n[Absent](missing.md)\n",
  });
  const document = report.documents[0];

  assert.deepEqual(document.sections.map((section) => ({ title: section.title, startLine: section.startLine })), [
    { title: "Avant", startLine: 1 },
    { title: "Réel", startLine: 8 },
  ]);
  assert.deepEqual(document.internalLinks.items.map((link) => link.target), ["missing.md"]);
  assert.equal(document.internalLinks.invalid[0].reason, "TARGET_NOT_FOUND");
});

test("applique les mêmes règles aux fences tilde et aux délimiteurs de types différents", () => {
  const report = run({
    "docs/fences.md": "~~~md\n# faux tilde\n~~~js\n[fausse](missing-tilde.md)\n~~~\n```\n# faux type\n[encore fausse](missing-type.md)\n~~~\n# encore dans le code\n```\n# Réel\n[Absent](missing.md)\n",
  });
  const document = report.documents[0];

  assert.deepEqual(document.sections.map((section) => ({ title: section.title, startLine: section.startLine })), [
    { title: "Réel", startLine: 12 },
  ]);
  assert.deepEqual(document.internalLinks.items.map((link) => link.target), ["missing.md"]);
});

test("traite un backtick inline non apparié comme du texte et conserve les liens actifs", () => {
  const report = run({
    "docs/inline.md": "Texte avec ` non apparié [Guide](missing.md)\n",
  });
  const document = report.documents[0];

  assert.equal(document.internalLinks.count, 1);
  assert.equal(document.internalLinks.invalid[0].target, "missing.md");
  assert.equal(document.internalLinks.invalid[0].reason, "TARGET_NOT_FOUND");
});

test("retire les balises HTML des titres sans laisser leur syntaxe dans le rapport", () => {
  const report = run({
    "docs/markup.md": "# <span>Rapport</span> <script>alert(1)</script>\n",
  });

  assert.equal(report.documents[0].sections[0].title, "Rapport alert(1)");
});

test("ne crée des plages inline que pour des longueurs appariées", () => {
  const report = run({
    "docs/inline.md": "[Avant](missing-before.md) ``[Actif](missing-active.md)` [Après](missing-after.md)\n",
  });
  const document = report.documents[0];

  assert.deepEqual(document.internalLinks.items.map((link) => link.target), [
    "missing-before.md",
    "missing-active.md",
    "missing-after.md",
  ]);
  assert.equal(document.internalLinks.invalid.length, 3);
});

test("scanne les liens Markdown valides et récupère après une ouverture malformée", () => {
  const report = run({
    "docs/index.md": [
      "# Section",
      "[Guide](./guide.md#target \"title\") [Dossier](./guide) ![Image](<./image.svg> \"preview\") [Ancre](#section)",
      "[Malformé](a [Guide](./guide.md#target)",
    ].join("\n"),
    "docs/guide.md": "# Target\n",
    "docs/image.svg": "<svg />\n",
  });
  const document = report.documents.find((entry) => entry.path === "docs/index.md");

  assert.deepEqual(document.internalLinks.items.map((link) => link.target), [
    "./guide.md#target",
    "./guide",
    "./image.svg",
    "#section",
    "./guide.md#target",
  ]);
});

test("les ouvertures Markdown malformées sont parcourues sans rescanner leur suffixe", () => {
  const malformed = "[x](a ".repeat(4_000);
  const longDestination = `[long](${"a".repeat(4_000)}`;
  const document = run({ "docs/adversarial.md": `${malformed}\n${longDestination}\n` }).documents[0];

  assert.deepEqual(document.internalLinks.items, []);
  assert.deepEqual(document.internalLinks.invalid, []);
  assert.deepEqual(document.internalLinks.unverified, []);
});

test("classe un document de 2 000 lignes en ARCHITECTURE_REVIEW", () => {
  const content = ["# Long document", ...Array.from({ length: 1_999 }, (_, index) => `line ${index + 1}`)].join("\n");
  const document = run({ "documentation/long.md": content }).documents[0];

  assert.equal(document.lines, 2_000);
  assert.equal(document.level, "ARCHITECTURE_REVIEW");
  assert.equal(document.largestSection.lines, 2_000);
  assert.equal(document.largestSection.startLine, 1);
  assert.equal(reportThresholds().architectureReview, DOCUMENTATION_THRESHOLDS.architectureReview);
});

test("expose la section la plus longue dans un document de surveillance", () => {
  const content = ["# Cohésion", ...Array.from({ length: 700 }, () => "paragraph")].join("\n");
  const document = run({ "documentation/development/long-section.md": content }).documents[0];

  assert.equal(document.level, "SURVEILLANCE");
  assert.equal(document.largestSection.title, "Cohésion");
  assert.equal(document.largestSection.startLine, 1);
  assert.equal(document.largestSection.lines, 701);
});

test("conserve l'absence de statut et reconnaît les statuts canoniques explicites", () => {
  const report = run({
    "documentation/sessions/history/old.md": "# Old\n",
    "documentation/architecture/adr/ADR-001.md": "# Decision\n",
    "documentation/current.md": "> **Statut documentaire : CURRENT.**\n\n# Current\n",
    "generated.md": "<!-- GENERATED: do not edit -->\n# Generated\n",
  });
  const byPath = Object.fromEntries(report.documents.map((document) => [document.path, document]));

  assert.deepEqual(byPath["documentation/sessions/history/old.md"].lifecycle, { statuses: ["HISTORY"], source: "CANONICAL_PATH" });
  assert.deepEqual(byPath["documentation/architecture/adr/ADR-001.md"].lifecycle, { statuses: ["ADR"], source: "CANONICAL_PATH" });
  assert.deepEqual(byPath["documentation/current.md"].lifecycle, { statuses: ["CURRENT"], source: "EXPLICIT_MARKER" });
  assert.deepEqual(byPath["generated.md"].lifecycle, { statuses: ["GENERATED"], source: "EXPLICIT_MARKER" });
  assert.deepEqual(byPath["documentation/sessions/history/old.md"].internalLinks.invalid, []);
});

test("les listes de statuts du README et des skills ne déclarent pas le cycle de vie du document", () => {
  const report = run({
    "documentation/README.md": "# Documentation\n\nLes statuts possibles sont CURRENT, PLAN, AUDIT, HISTORY, SNAPSHOT, ADR et GENERATED.\n",
    ".agents/skills/cleanmymap-documentation/SKILL.md": "# Skill\n\nUtiliser les statuts CURRENT, PLAN, AUDIT, HISTORY, SNAPSHOT, ADR ou GENERATED.\n",
    "documentation/declared.md": "> **Statut documentaire : `CURRENT`.**\n\n# Contrat\n",
    "documentation/conflicting.md": "Statut : CURRENT / PLAN\n",
    "documentation/example.md": "```md\nStatut : CURRENT\n```\n# Exemple\n",
  });
  const byPath = Object.fromEntries(report.documents.map((document) => [document.path, document.lifecycle]));

  assert.deepEqual(byPath["documentation/README.md"], { statuses: [], source: "NOT_STATED" });
  assert.deepEqual(byPath[".agents/skills/cleanmymap-documentation/SKILL.md"], { statuses: [], source: "NOT_STATED" });
  assert.deepEqual(byPath["documentation/declared.md"], { statuses: ["CURRENT"], source: "EXPLICIT_MARKER" });
  assert.deepEqual(byPath["documentation/conflicting.md"], { statuses: ["CURRENT", "PLAN"], source: "EXPLICIT_MARKER" });
  assert.deepEqual(byPath["documentation/example.md"], { statuses: [], source: "NOT_STATED" });
});

test("reconnaît les déclarations AUDIT avec tiret sans inférer depuis une simple occurrence", () => {
  const report = run({
    "documentation/operations/audit.md": "Statut documentaire — AUDIT historique\n\n# Preuve\n",
    "documentation/operations/audit-en-dash.md": "> **Statut documentaire – AUDIT.**\n\n# Preuve\n",
    "documentation/README.md": "# Statuts\n\nLes statuts documentaires possibles sont CURRENT, PLAN, AUDIT, HISTORY, SNAPSHOT, ADR et GENERATED.\n",
    ".agents/skills/example/SKILL.md": "# Cycle\n\nListe des statuts : CURRENT / PLAN / AUDIT / HISTORY.\n",
  });
  const byPath = Object.fromEntries(report.documents.map((document) => [document.path, document.lifecycle]));

  assert.deepEqual(byPath["documentation/operations/audit.md"], { statuses: ["AUDIT"], source: "EXPLICIT_MARKER" });
  assert.deepEqual(byPath["documentation/operations/audit-en-dash.md"], { statuses: ["AUDIT"], source: "EXPLICIT_MARKER" });
  assert.deepEqual(byPath["documentation/README.md"], { statuses: [], source: "NOT_STATED" });
  assert.deepEqual(byPath[".agents/skills/example/SKILL.md"], { statuses: [], source: "NOT_STATED" });
});

test("parse les destinations Markdown aux parenthèses équilibrées et distingue routes et dossiers", () => {
  const report = run({
    "documentation/index.md": [
      "# Index",
      "[Rapports](../apps/web/src/app/(app)/reports/page.tsx)",
      "[Historique imbriqué](../apps/web/src/app/(app)/reports/[id]/history/(detail)/page.tsx)",
      "[Route](/reports/42)",
      "[Dossier](../apps/web/src/app/(app)/reports/)",
      "[Fichier absent](../apps/web/src/app/(app)/reports/missing.tsx)",
      "[Référence opaque](../unresolved-target)",
    ].join("\n"),
    "apps/web/src/app/(app)/reports/page.tsx": "export default function Page() {}\n",
    "apps/web/src/app/(app)/reports/[id]/history/(detail)/page.tsx": "export default function Page() {}\n",
    "apps/web/src/app/(app)/reports/[id]/page.tsx": "export default function Page() {}\n",
  });
  const document = report.documents.find((entry) => entry.path === "documentation/index.md");

  assert.deepEqual(document.internalLinks.items.map((link) => link.target), [
    "../apps/web/src/app/(app)/reports/page.tsx",
    "../apps/web/src/app/(app)/reports/[id]/history/(detail)/page.tsx",
    "/reports/42",
    "../apps/web/src/app/(app)/reports/",
    "../apps/web/src/app/(app)/reports/missing.tsx",
    "../unresolved-target",
  ]);
  assert.deepEqual(document.internalLinks.items.map((link) => link.targetKind), ["FILE", "FILE", "APPLICATION_ROUTE", "DIRECTORY", "FILE_MISSING", "UNVERIFIABLE_REFERENCE"]);
  assert.equal(document.internalLinks.invalid.length, 1);
  assert.equal(document.internalLinks.invalid[0].reason, "TARGET_NOT_FOUND");
  assert.equal(document.internalLinks.unverified.length, 1);
  assert.equal(document.internalLinks.unverified[0].reason, "UNVERIFIED_REFERENCE");
});

test("les ancres valides et invalides restent attribuées au fichier sans modifier les entrées", () => {
  const entries = {
    "docs/index.md": "# Index\n\n[Valide](./guide.md#section)\n[Ancre absente](./guide.md#absente)\n",
    "docs/guide.md": "# Section\n\nTexte\n",
  };
  const before = Object.fromEntries(Object.entries(entries).map(([file, content]) => [file, content]));
  const report = run(entries);
  const index = report.documents.find((document) => document.path === "docs/index.md");

  assert.equal(index.internalLinks.count, 2);
  assert.equal(index.internalLinks.invalid.length, 1);
  assert.equal(index.internalLinks.invalid[0].reason, "ANCHOR_NOT_FOUND");
  assert.deepEqual(entries, before);
});

function reportThresholds() {
  return DOCUMENTATION_THRESHOLDS;
}

const privilegedRpc = (name) => `create or replace function public.${name}(input jsonb)
returns jsonb
language sql
security definer
as $$ select input $$;
grant execute on function public.${name}(jsonb) to service_role;
`;

function completeRpcDocumentation(path, lifecycle = "CURRENT", extra = "") {
  return `> **Statut documentaire : ${lifecycle}.**

# Contrat RPC ${path}

Code : ${path}

Responsabilité / owner : RPC privilégiée et source canonique du contrat.
Acteurs : le requester authentifié et le service propriétaire.
Permissions : service_role uniquement.
Entrées / sorties : le paramètre JSON est validé et la fonction retourne le résultat.
Erreurs : refus, exception et erreur sont documentés.
Tests : scénario de régression et test pgTAP associés.
${extra}
`;
}

test("classe les contrats critiques selon la preuve CURRENT, PLAN, contradiction et référence", () => {
  const entries = {
    "apps/web/supabase/migrations/001_documented.sql": privilegedRpc("documented_rpc"),
    "apps/web/supabase/migrations/002_contradictory.sql": privilegedRpc("contradictory_rpc"),
    "apps/web/supabase/migrations/003_plan.sql": privilegedRpc("plan_rpc"),
    "apps/web/supabase/migrations/004_missing-reference.sql": privilegedRpc("missing_rpc"),
    "apps/web/supabase/migrations/005_unreferenced.sql": privilegedRpc("unreferenced_rpc"),
    "apps/web/src/lib/trivial.ts": "function localOnly() { return 1; }\n",
    "documentation/rpc/documented.md": completeRpcDocumentation("apps/web/supabase/migrations/001_documented.sql"),
    "documentation/rpc/contradictory.md": completeRpcDocumentation("apps/web/supabase/migrations/002_contradictory.sql", "CURRENT", "Permissions : public."),
    "documentation/rpc/plan.md": completeRpcDocumentation("apps/web/supabase/migrations/003_plan.sql", "PLAN"),
    "documentation/rpc/missing.md": completeRpcDocumentation("apps/web/supabase/migrations/004_missing-reference.sql", "CURRENT", "[Contrat connexe](missing-contract.md)"),
  };
  const report = run(entries);
  const byPath = Object.fromEntries(report.contractReviews.map((review) => [review.path, review]));

  assert.equal(byPath["apps/web/supabase/migrations/001_documented.sql"].status, "DOCUMENTED");
  assert.equal(byPath["apps/web/supabase/migrations/001_documented.sql"].documentsExamined[0].lifecycle.statuses[0], "CURRENT");
  assert.equal(byPath["apps/web/supabase/migrations/002_contradictory.sql"].status, "REVIEW_REQUIRED");
  assert.ok(byPath["apps/web/supabase/migrations/002_contradictory.sql"].reasons.some((reason) => reason.startsWith("CONTRADICTORY_PRIVILEGE_CLAIM:documentation/rpc/contradictory.md:")));
  assert.equal(byPath["apps/web/supabase/migrations/003_plan.sql"].status, "REVIEW_REQUIRED");
  assert.ok(byPath["apps/web/supabase/migrations/003_plan.sql"].reasons.includes("PLAN_IS_NOT_CURRENT_CONTRACT:documentation/rpc/plan.md"));
  assert.equal(byPath["apps/web/supabase/migrations/004_missing-reference.sql"].status, "REVIEW_REQUIRED");
  assert.ok(byPath["apps/web/supabase/migrations/004_missing-reference.sql"].reasons.some((reason) => reason.startsWith("INVALID_DOCUMENT_REFERENCE:documentation/rpc/missing.md:")));
  assert.equal(byPath["apps/web/supabase/migrations/005_unreferenced.sql"].status, "NOT_MEASURED");
  assert.equal(report.contractReviews.some((review) => review.path.endsWith("trivial.ts")), false);
  assert.deepEqual(run(entries).contractReviews, report.contractReviews);
  assert.deepEqual(run(entries).summary, report.summary);
  assert.deepEqual(report.summary, {
    trackedDocuments: 4,
    surveillance: 0,
    reviewRequired: 0,
    architectureReview: 0,
    invalidReferences: 1,
    unverifiedReferences: 0,
    criticalContracts: 5,
    documentedContracts: 1,
    reviewRequiredContracts: 3,
    notMeasuredContracts: 1,
  });
});
