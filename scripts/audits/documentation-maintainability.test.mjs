import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDocumentationMaintainabilityReport,
  DOCUMENTATION_THRESHOLDS,
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
