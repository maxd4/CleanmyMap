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
