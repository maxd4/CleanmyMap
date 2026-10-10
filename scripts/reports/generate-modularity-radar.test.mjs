import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildRadarMarkdown,
  compactSignalText,
  createCorrelationSignalsFromAuditResults,
  createRadarRows,
  extractHumanDecisions,
  loadQualityAuditArtifacts,
  parseHumanDecisions,
  parseDecisionSummary,
  resolveRadarRef,
} from "./generate-modularity-radar.mjs";

const currentRef = "a".repeat(40);

function row(file, kind = "runtime") {
  return {
    file,
    ref: currentRef,
    lines: 601,
    bytes: 20_000,
    kind,
    signals: {
      size: { state: "PRESENT", detail: "REVIEW" },
      complexity: { state: "PRESENT", detail: "1 finding" },
      cycle: { state: "NOT_MEASURED", detail: "not run" },
      deadCode: { state: "NONE", detail: "" },
      duplication: { state: "NOT_MEASURED", detail: "aggregate only" },
      testability: { state: "NOT_MEASURED", detail: "not attributed" },
    },
  };
}

test("human decisions are preserved and remain the only source of architecture decisions", () => {
  const human = `| PATH | DECISION | PRIORITY | SIGNALS | BLOCKER / NEXT_TRIGGER |\n| --- | --- | --- | --- | --- |\n| \`src/example.ts\` | COHESIVE_SINGLE_FILE | NONE | size: PRESENT | no natural boundary |\n\n#### \`src/example.ts\`\n\n| Champ | Valeur |\n| --- | --- |\n| REF | stale-ref |\n| LINES / BYTES / KIND | 999 / 999 / runtime |\n| RATIONALE | the file is cohesive |`;
  assert.deepEqual(parseDecisionSummary(human), [{
    file: "src/example.ts",
    decision: "COHESIVE_SINGLE_FILE",
    priority: "NONE",
    dependency: "no natural boundary",
    nextTrigger: "",
  }]);
  assert.deepEqual(parseHumanDecisions(human), [{
    file: "src/example.ts",
    ARCHITECTURE_DECISION: "COHESIVE_SINGLE_FILE",
    PRIORITY: "NONE",
    DEPENDENCY_OR_BLOCKER: "no natural boundary",
    NEXT_TRIGGER: "",
    RESPONSIBILITIES: "",
    PUBLIC_CONTRACTS: "",
    SIDE_EFFECTS: "",
    MAIN_CONSUMERS: "",
    TEST_BOUNDARY: "",
    COUPLING: "",
    NATURAL_EXTRACTION_BOUNDARY: "",
    RATIONALE: "the file is cohesive",
  }]);
  assert.equal(extractHumanDecisions(`before\n<!-- RADAR:HUMAN_DECISIONS:BEGIN -->\n${human}\n<!-- RADAR:HUMAN_DECISIONS:END -->`), human);
});

test("rendering reuses the policy by KIND and keeps correlation textual", () => {
  const candidate = row("apps/web/src/example.ts");
  const human = `| PATH | DECISION | PRIORITY | SIGNALS | BLOCKER / NEXT_TRIGGER |\n| --- | --- | --- | --- | --- |\n| \`${candidate.file}\` | COHESIVE_SINGLE_FILE | NONE | size: PRESENT | no natural boundary |`;
  const markdown = buildRadarMarkdown({
    report: {
      rows: [candidate],
      radarRows: [candidate],
      architectural: [candidate],
      tests: [],
      generated: [],
    },
    refInfo: {
      requested: "HEAD",
      resolved: currentRef,
      status: "CURRENT_AT_GENERATION",
    },
    humanBlock: human,
    generatedAt: "2026-01-01T00:00:00.000Z",
    top: 1,
  });

  assert.match(markdown, /runtime \| >500 lignes ou >40 KiB/);
  assert.match(markdown, /test \| >1000 lignes ou >50 KiB/);
  assert.match(markdown, /COHESIVE_SINGLE_FILE/);
  assert.match(markdown, /complexity: 1 finding/);
  assert.doesNotMatch(markdown, /score global|score numérique/);
});

test("la zone préventive expose la distance REVIEW sans créer une décision de split", () => {
  const candidate = {
    ...row("apps/web/src/preventive.ts"),
    lines: 350,
    bytes: 10_000,
    signals: {
      size: { state: "NONE", detail: "" },
      complexity: { state: "NONE", detail: "" },
      cycle: { state: "NONE", detail: "" },
      deadCode: { state: "NONE", detail: "" },
      duplication: { state: "NONE", detail: "" },
      testability: { state: "NOT_MEASURED", detail: "not attributed" },
    },
  };
  const markdown = buildRadarMarkdown({
    report: {
      rows: [candidate],
      radarRows: [candidate],
      preventive: [candidate],
      architectural: [],
      tests: [],
      generated: [],
    },
    refInfo: { requested: "HEAD", resolved: currentRef, status: "CURRENT_AT_GENERATION" },
    humanBlock: "_Aucune décision humaine enregistrée._",
    generatedAt: "2026-01-01T00:00:00.000Z",
    top: 1,
  });
  assert.match(markdown, /Surveillance préventive informative \(runtime\/tests\) \| 1/);
  assert.match(markdown, /preventive\.ts.*runtime.*350.*9\.8 KiB.*150 lignes \/ 30\.2 KiB/);
  assert.match(markdown, /NONE_RECORDED/);
  assert.match(markdown, /PROACTIVE_SPLIT établi \| 0/);
});

test("fresh measurements replace stale machine fields while human rationale survives", () => {
  const candidate = {
    ...row("apps/web/src/app/learn/ressources/learn-ressources-client.data.ts", "data/config"),
    lines: 677,
    bytes: 27_122,
    signals: {
      size: { state: "NONE", detail: "" },
      complexity: { state: "NOT_MEASURED", detail: "historical" },
      cycle: { state: "NOT_MEASURED", detail: "not run" },
      deadCode: { state: "NOT_MEASURED", detail: "historical" },
      duplication: { state: "NOT_MEASURED", detail: "not run" },
      testability: { state: "NOT_MEASURED", detail: "not run" },
    },
  };
  const staleHuman = `| PATH | DECISION | PRIORITY | SIGNALS | BLOCKER / NEXT_TRIGGER |\n| --- | --- | --- | --- | --- |\n| \`${candidate.file}\` | COHESIVE_SINGLE_FILE | NONE | size: PRESENT | no split trigger |\n\n#### \`${candidate.file}\`\n\n| Champ | Valeur |\n| --- | --- |\n| REF | old-ref |\n| LINES / BYTES / KIND | 999 / 999 / runtime |\n| SIGNALS | size PRESENT |\n| RATIONALE | catalogue cohésif |`;
  const markdown = buildRadarMarkdown({
    report: { rows: [candidate], radarRows: [candidate], architectural: [], tests: [], generated: [] },
    refInfo: { requested: "HEAD", resolved: currentRef, status: "CURRENT_AT_GENERATION" },
    humanBlock: staleHuman,
    generatedAt: "2026-01-01T00:00:00.000Z",
    top: 1,
  });
  const preserved = markdown.slice(markdown.indexOf("RADAR:HUMAN_DECISIONS:BEGIN"), markdown.indexOf("RADAR:HUMAN_DECISIONS:END"));
  assert.match(markdown, /COHESIVE_SINGLE_FILE établi/);
  assert.match(markdown, /\| `apps\/web\/src\/app\/learn\/ressources\/learn-ressources-client\.data\.ts` \| COHESIVE_SINGLE_FILE \| NONE \|/);
  assert.match(preserved, /catalogue cohésif/);
  assert.doesNotMatch(preserved, /old-ref|999 \/ 999 \/ runtime|\| SIGNALS \|/);
  assert.doesNotMatch(markdown, /learn-ressources-client\.data\.ts` \| 677 \| 27122 \| data\/config \| PRESENT/);
});

test("historical baseline entries never become current PRESENT signals", () => {
  const candidate = row("apps/web/src/example.ts");
  const [result] = createRadarRows([candidate], {
    measured: false,
    detail: "preuve absente",
    complexityByFile: new Map([[candidate.file, 1]]),
    deadCodeByFile: new Map([[candidate.file, 2]]),
    cycleByFile: new Map(),
    duplicationByFile: new Map(),
  });
  assert.equal(result.signals.complexity.state, "NOT_MEASURED");
  assert.equal(result.signals.deadCode.state, "NOT_MEASURED");
});

function auditResults(overrides = {}) {
  return {
    "top-heavy": { rows: [] },
    complexity: { metrics: [], result: { failures: [], reviews: [], improvements: [], stale: [] } },
    "dead-code": { comparison: { newFindings: [], historicalActionableFindings: [], keepJustifiedFindings: [] } },
    duplication: { results: [], justificationReport: { classifications: { KEEP_INTENTIONAL: [], NO_ACTION_NOISE: [] } } },
    cycles: { cycleObjects: [] },
    ...overrides,
  };
}

test("size alone remains PRESENT while complementary measured gates remain NONE", () => {
  const [result] = createRadarRows([row("apps/web/src/example.ts")], createCorrelationSignalsFromAuditResults(auditResults()));
  assert.equal(result.signals.size.state, "PRESENT");
  assert.equal(result.signals.complexity.state, "NONE");
  assert.equal(result.signals.deadCode.state, "NONE");
  assert.equal(result.signals.duplication.state, "NONE");
  assert.equal(result.signals.cycle.state, "NONE");
});

test("legacy complexity above the canonical target is correlated with a size REVIEW", () => {
  const candidate = row("apps/web/src/example.ts");
  const correlations = createCorrelationSignalsFromAuditResults(auditResults({
    complexity: {
      metrics: [{ metric: "complexity", path: candidate.file, category: "React/JSX", value: 23 }],
      result: { failures: [], reviews: [], improvements: [], stale: [] },
    },
  }));
  const [result] = createRadarRows([candidate], correlations);
  assert.equal(result.signals.size.state, "PRESENT");
  assert.equal(result.signals.complexity.state, "PRESENT");
});

test("dead-code excludes KEEP_JUSTIFIED and attributes current actionable findings", () => {
  const file = "apps/web/src/actionable.ts";
  const kept = { file: "apps/web/src/kept.ts" };
  const correlations = createCorrelationSignalsFromAuditResults(auditResults({
    "dead-code": { comparison: { newFindings: [{ file }], historicalActionableFindings: [], keepJustifiedFindings: [kept] } },
  }));
  assert.equal(correlations.deadCodeByFile.has(file), true);
  assert.equal(correlations.deadCodeByFile.has(kept.file), false);
});

test("duplication excludes qualified fingerprints and attributes new occurrences", () => {
  const qualified = { scope: "runtime", fingerprint: "aaaaaaaaaaaaaaaa", occurrenceA: { path: "apps/web/src/kept.ts" }, occurrenceB: { path: "apps/web/src/other.ts" } };
  const fresh = { scope: "runtime", fingerprint: "bbbbbbbbbbbbbbbb", occurrenceA: { path: "apps/web/src/new.ts" }, occurrenceB: { path: "apps/web/src/other.ts" } };
  const correlations = createCorrelationSignalsFromAuditResults(auditResults({
    duplication: {
      results: [{ scopeName: "runtime", occurrences: [qualified, fresh] }],
      justificationReport: { classifications: { KEEP_INTENTIONAL: ["runtime:aaaaaaaaaaaaaaaa"], NO_ACTION_NOISE: [] } },
    },
  }));
  assert.equal(correlations.duplicationByFile.has("apps/web/src/kept.ts"), false);
  assert.equal(correlations.duplicationByFile.has("apps/web/src/new.ts"), true);
});

test("cycles are attributed to every current participant", () => {
  const correlations = createCorrelationSignalsFromAuditResults(auditResults({
    cycles: { cycleObjects: [{ files: ["apps/web/src/a.ts", "apps/web/src/b.ts", "apps/web/src/a.ts"] }] },
  }));
  assert.equal(correlations.cycleByFile.has("apps/web/src/a.ts"), true);
  assert.equal(correlations.cycleByFile.has("apps/web/src/b.ts"), true);
});

test("missing or other-SHA artifact proof remains NOT_MEASURED", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-radar-proof-"));
  try {
    const missing = loadQualityAuditArtifacts({ root, auditedSha: currentRef });
    assert.equal(missing.measured, false);
    assert.equal(createRadarRows([row("apps/web/src/example.ts")], missing)[0].signals.complexity.state, "NOT_MEASURED");

    const otherRef = "b".repeat(40);
    const base = path.join(root, "artifacts", "quality-audits", otherRef);
    for (const audit of ["dead-code", "duplication", "top-heavy", "complexity", "cycles"]) {
      const target = path.join(base, audit);
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(path.join(target, "manifest.json"), JSON.stringify({ schemaVersion: 1, audit, auditedHead: otherRef, originMain: otherRef, baselineStable: true, worktreeClean: true }));
      fs.writeFileSync(path.join(target, "report.json"), JSON.stringify(auditResults()[audit]));
    }
    const rejected = loadQualityAuditArtifacts({ root, auditedSha: currentRef });
    assert.equal(rejected.measured, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("NONE and NOT_MEASURED stay distinct and only PRESENT signals count", () => {
  const none = row("apps/web/src/none.ts");
  none.signals = {
    size: { state: "NONE", detail: "" },
    complexity: { state: "NONE", detail: "no current finding" },
    cycle: { state: "NOT_MEASURED", detail: "not run" },
    deadCode: { state: "NONE", detail: "no current finding" },
    duplication: { state: "NOT_MEASURED", detail: "not run" },
    testability: { state: "NOT_MEASURED", detail: "not run" },
  };
  assert.equal(compactSignalText(none.signals), "signaux complémentaires non mesurés");

  const onePresent = row("apps/web/src/one.ts");
  onePresent.signals.complexity = { state: "NONE", detail: "no current finding" };
  onePresent.signals.deadCode = { state: "NOT_MEASURED", detail: "historical only" };
  const twoPresent = row("apps/web/src/two.ts");
  twoPresent.signals.deadCode = { state: "PRESENT", detail: "current finding" };
  const markdown = buildRadarMarkdown({
    report: {
      rows: [none, onePresent, twoPresent],
      radarRows: [none, onePresent, twoPresent],
      architectural: [none, onePresent, twoPresent],
      tests: [],
      generated: [],
    },
    refInfo: { requested: "HEAD", resolved: currentRef, status: "CURRENT_AT_GENERATION" },
    humanBlock: "_Aucune décision humaine enregistrée._",
    generatedAt: "2026-01-01T00:00:00.000Z",
    top: 3,
  });
  assert.match(markdown, /Candidats avec plusieurs signaux structurels attribués \| 1/);
  assert.doesNotMatch(markdown, /aucun finding attribué/);
});

test("an immutable historical ref is never classified as current", () => {
  const current = resolveRadarRef("HEAD");
  assert.equal(current.status, "CURRENT_AT_GENERATION");

  const historical = resolveRadarRef("HEAD~1");
  assert.equal(historical.status, "HISTORICAL_SNAPSHOT");
  assert.notEqual(historical.resolved, historical.head);
});
