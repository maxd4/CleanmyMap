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
  MODULARITY_SCAN_ROOTS,
  parseHumanDecisions,
  parseDecisionSummary,
  readHumanDecisionsFromView,
  resolveRadarRef,
} from "./generate-modularity-radar.mjs";
import { TOP_HEAVY_SCAN_ROOTS } from "../checks/top-heavy-measurement.mjs";

const currentRef = "a".repeat(40);
const HUMAN_FIELDS = [
  "RESPONSIBILITIES",
  "PUBLIC_CONTRACTS",
  "SIDE_EFFECTS",
  "MAIN_CONSUMERS",
  "TEST_BOUNDARY",
  "COUPLING",
  "NATURAL_EXTRACTION_BOUNDARY",
  "ARCHITECTURE_DECISION",
  "RATIONALE",
  "PRIORITY",
  "DEPENDENCY_OR_BLOCKER",
  "NEXT_TRIGGER",
];

function canonicalRegistry({ file = "src/current.ts", decision = "COHESIVE_SINGLE_FILE", priority = "NONE", detailDecision = decision, detailPriority = priority, dependency = "aucun", nextTrigger = "nouveau contrat" } = {}) {
  const values = {
    RESPONSIBILITIES: "responsabilité",
    PUBLIC_CONTRACTS: "contrat public",
    SIDE_EFFECTS: "aucun",
    MAIN_CONSUMERS: "consommateurs",
    TEST_BOUNDARY: "tests ciblés",
    COUPLING: "couplage local",
    NATURAL_EXTRACTION_BOUNDARY: "aucune",
    ARCHITECTURE_DECISION: detailDecision,
    RATIONALE: "décision justifiée",
    PRIORITY: detailPriority,
    DEPENDENCY_OR_BLOCKER: dependency,
    NEXT_TRIGGER: nextTrigger,
  };
  const details = HUMAN_FIELDS.map((field) => "| " + field + " | " + values[field] + " |").join("\n");
  const tick = String.fromCharCode(96);
  return [
    "# Registre canonique",
    "<!-- RADAR:HUMAN_DECISIONS:BEGIN -->",
    "| PATH | ARCHITECTURE_DECISION | PRIORITY | DEPENDENCY_OR_BLOCKER | NEXT_TRIGGER |",
    "| --- | --- | --- | --- | --- |",
    "| " + tick + file + tick + " | " + decision + " | " + priority + " | " + dependency + " | " + nextTrigger + " |",
    "",
    "#### " + tick + file + tick,
    "",
    "| Champ | Valeur |",
    "| --- | --- |",
    details,
    "<!-- RADAR:HUMAN_DECISIONS:END -->",
  ].join("\n");
}

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

test("le radar mesure les roots Web et mobile du gate top-heavy", () => {
  assert.deepEqual(MODULARITY_SCAN_ROOTS, TOP_HEAVY_SCAN_ROOTS);
  assert.deepEqual(MODULARITY_SCAN_ROOTS, ["apps/web/src", "apps/mobile"]);
});

test("the migrated registry preserves every human decision and manual field", () => {
  const registry = fs.readFileSync(path.join(process.cwd(), "documentation", "architecture", "modularity-decisions.md"), "utf8");
  const decisions = parseHumanDecisions(extractHumanDecisions(registry));
  const expectedKeys = [
    "ARCHITECTURE_DECISION",
    "COUPLING",
    "DEPENDENCY_OR_BLOCKER",
    "MAIN_CONSUMERS",
    "NATURAL_EXTRACTION_BOUNDARY",
    "NEXT_TRIGGER",
    "PRIORITY",
    "PUBLIC_CONTRACTS",
    "RATIONALE",
    "RESPONSIBILITIES",
    "SIDE_EFFECTS",
    "TEST_BOUNDARY",
    "file",
  ].sort();
  assert.equal(decisions.length, 51);
  assert.ok(decisions.every((entry) => JSON.stringify(Object.keys(entry).sort()) === JSON.stringify(expectedKeys)));
  assert.ok(decisions.every((entry) => entry.file && entry.ARCHITECTURE_DECISION && entry.PRIORITY));
  const view = {
    isFile: (file) => file === "documentation/architecture/modularity-decisions.md",
    readText: () => registry,
  };
  const result = readHumanDecisionsFromView(view, { requireRegistry: true });
  assert.equal(result.legacy, false);
  assert.equal(result.decisions.length, 51);
  const summaryRows = extractHumanDecisions(registry)
    .split(/\r?\n/)
    .filter((line) => /^\| `[^`]+` \|/.test(line));
  assert.equal(summaryRows.length, 51);
  const decisionsByFile = new Map(result.decisions.map((entry) => [entry.file, entry]));
  for (const row of summaryRows) {
    const [fileCell, architectureDecision, priority, dependency, nextTrigger] = row
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    const file = fileCell.slice(1, -1);
    const decision = decisionsByFile.get(file);
    assert.ok(decision, `decision absente pour ${file}`);
    assert.equal(decision.ARCHITECTURE_DECISION, architectureDecision, file);
    assert.equal(decision.PRIORITY, priority, file);
    assert.equal(decision.DEPENDENCY_OR_BLOCKER, dependency, file);
    assert.equal(decision.NEXT_TRIGGER, nextTrigger, file);
  }
});

test("a compact registry preserves all twelve resolved decision fields", () => {
  const expanded = canonicalRegistry();
  const compact = expanded.replace(/^\| (?:ARCHITECTURE_DECISION|PRIORITY|DEPENDENCY_OR_BLOCKER|NEXT_TRIGGER) \|[^\n]*\n/gm, "");
  assert.deepEqual(parseHumanDecisions(extractHumanDecisions(compact)), parseHumanDecisions(extractHumanDecisions(expanded)));
  const view = {
    isFile: (file) => file === "documentation/architecture/modularity-decisions.md",
    readText: () => compact,
  };
  assert.deepEqual(readHumanDecisionsFromView(view, { requireRegistry: true }).decisions, parseHumanDecisions(extractHumanDecisions(expanded)));
  const invalid = compact.replace("| RATIONALE | décision justifiée |", "");
  assert.throws(() => readHumanDecisionsFromView({ ...view, readText: () => invalid }, { requireRegistry: true }), /Registre canonique des décisions illisible/);
  const duplicate = compact.replace("| RESPONSIBILITIES | responsabilité |", "| RESPONSIBILITIES | responsabilité |\n| RESPONSIBILITIES | responsabilité |");
  assert.throws(() => readHumanDecisionsFromView({ ...view, readText: () => duplicate }, { requireRegistry: true }), /Registre canonique des décisions illisible/);
});

test("the current registry validates its markers and structure without a fixed decision count", () => {
  const registry = canonicalRegistry({ file: "src/current.ts" });
  const view = {
    isFile: (file) => file === "documentation/architecture/modularity-decisions.md",
    readText: () => registry,
  };
  const result = readHumanDecisionsFromView(view, { requireRegistry: true });
  assert.equal(result.legacy, false);
  assert.deepEqual(result.decisions.map((entry) => entry.file), ["src/current.ts"]);
});

test("the current registry rejects empty, truncated, duplicate and inconsistent data", () => {
  const valid = canonicalRegistry();
  const cases = [
    ["empty", "<!-- RADAR:HUMAN_DECISIONS:BEGIN -->\n<!-- RADAR:HUMAN_DECISIONS:END -->"],
    ["missing begin", valid.replace("<!-- RADAR:HUMAN_DECISIONS:BEGIN -->\n", "")],
    ["missing end", valid.replace("\n<!-- RADAR:HUMAN_DECISIONS:END -->", "")],
    ["truncated detail", valid.replace("| RATIONALE | décision justifiée |", "")],
    ["duplicate path", valid.replace("| `src/current.ts` | COHESIVE_SINGLE_FILE | NONE | aucun | nouveau contrat |", "| `src/current.ts` | COHESIVE_SINGLE_FILE | NONE | aucun | nouveau contrat |\\n| `src/current.ts` | COHESIVE_SINGLE_FILE | NONE | aucun | nouveau contrat |")],
    ["summary/detail mismatch", canonicalRegistry({ detailDecision: "DEFERRED_SPLIT" })],
  ];
  for (const [label, markdown] of cases) {
    const view = {
      isFile: (file) => file === "documentation/architecture/modularity-decisions.md",
      readText: () => markdown,
    };
    assert.throws(() => readHumanDecisionsFromView(view, { requireRegistry: true }), /Registre canonique des décisions illisible/, label);
  }
});

test("the current contract requires the separate registry while legacy snapshots remain readable", () => {
  const currentView = {
    isFile: (file) => file === "documentation/architecture/monolith-split-plan.md",
    readText: () => "[modularity-decisions.md](./modularity-decisions.md)",
  };
  assert.throws(() => readHumanDecisionsFromView(currentView, { requireRegistry: true }), /Registre canonique/);

  const legacy = "<!-- RADAR:HUMAN_DECISIONS:BEGIN -->\n| PATH | DECISION | PRIORITY | SIGNALS | BLOCKER / NEXT_TRIGGER |\n| --- | --- | --- | --- | --- |\n| `src/legacy.ts` | DEFERRED_SPLIT | LATER | — | wait |\n<!-- RADAR:HUMAN_DECISIONS:END -->";
  const legacyView = {
    isFile: (file) => file === "documentation/architecture/monolith-split-plan.md",
    readText: () => legacy,
  };
  const result = readHumanDecisionsFromView(legacyView);
  assert.equal(result.legacy, true);
  assert.equal(result.decisions[0].file, "src/legacy.ts");
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
  assert.match(markdown, /COHESIVE_SINGLE_FILE établi/);
  assert.match(markdown, /\| `apps\/web\/src\/app\/learn\/ressources\/learn-ressources-client\.data\.ts` \| COHESIVE_SINGLE_FILE \| NONE \|/);
  assert.match(markdown, /modularity-decisions\.md/);
  assert.doesNotMatch(markdown, /<!-- RADAR:HUMAN_DECISIONS:BEGIN -->/);
  assert.doesNotMatch(markdown, /catalogue cohésif|old-ref|999 \/ 999 \/ runtime/);
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

test("cycles SKIPPED_BY_POLICY reste NOT_MEASURED sans masquer les autres mesures", () => {
  const candidate = row("apps/web/src/example.ts");
  const correlations = createCorrelationSignalsFromAuditResults(auditResults({
    complexity: { metrics: [{ metric: "complexity", category: "runtime/services/orchestration", path: candidate.file, value: 22 }], result: { failures: [], reviews: [], improvements: [], stale: [] } },
    cycles: { status: "SKIPPED_BY_POLICY", cycleObjects: [] },
  }));
  const [result] = createRadarRows([candidate], correlations);
  assert.equal(correlations.measured, true);
  assert.equal(result.signals.complexity.state, "PRESENT");
  assert.equal(result.signals.cycle.state, "NOT_MEASURED");
});

test("radar rejects a coherent-looking run whose report status contradicts its manifest", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-radar-status-"));
  try {
    const auditedSha = "d".repeat(40);
    const runId = "status-mismatch";
    const shaRoot = path.join(root, "artifacts", "quality-audits", auditedSha);
    fs.mkdirSync(shaRoot, { recursive: true });
    for (const audit of ["dead-code", "duplication", "top-heavy", "complexity", "cycles"]) {
      const prefix = `${audit}--${runId}`;
      fs.writeFileSync(path.join(shaRoot, `${prefix}--manifest.json`), JSON.stringify({ schemaVersion: 1, audit, runId, auditedHead: auditedSha, status: "PASS", generatedAt: "2026-10-24T00:00:00.000Z" }));
      fs.writeFileSync(path.join(shaRoot, `${prefix}--report.json`), JSON.stringify(audit === "cycles" ? { status: "SKIPPED_BY_POLICY", gateStatus: "SKIPPED_BY_POLICY", cycleObjects: [] } : { status: "PASS" }));
    }
    const signals = loadQualityAuditArtifacts({ root, auditedSha, runId });
    assert.equal(signals.measured, false);
    assert.match(signals.detail, /preuve quality incomplète|non stable/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

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

test("loads a coherent quality run from its isolated runId directory", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-radar-run-"));
  const auditedSha = "c".repeat(40);
  const runId = "run-isolated";
  try {
    const base = path.join(root, "artifacts", "quality-audits", auditedSha, runId);
    for (const audit of ["dead-code", "duplication", "top-heavy", "complexity", "cycles"]) {
      const target = path.join(base, audit);
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(path.join(target, "manifest.json"), JSON.stringify({
        schemaVersion: 1,
        audit,
        runId,
        auditedHead: auditedSha,
        originMain: auditedSha,
        baselineStable: true,
        worktreeClean: true,
        reproducible: true,
        resultClass: "REPRODUCIBLE",
      }));
      fs.writeFileSync(path.join(target, "report.json"), JSON.stringify(auditResults()[audit]));
    }
    const loaded = loadQualityAuditArtifacts({ root, auditedSha });
    assert.equal(loaded.measured, true);
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

test("rejects a missing or unknown Git ref and accepts an explicit valid ref", () => {
  assert.throws(() => resolveRadarRef(), /REF Git obligatoire/);
  assert.throws(() => resolveRadarRef("ref-that-does-not-exist"));
  const resolved = resolveRadarRef(currentRef === "a".repeat(40) ? "HEAD" : currentRef);
  assert.match(resolved.resolved, /^[0-9a-f]{40}$/i);
  assert.match(resolved.head, /^[0-9a-f]{40}$/i);
});

function writeQualityRun(root, auditedSha, runId, overrides = {}) {
  const audits = ["dead-code", "duplication", "top-heavy", "complexity", "cycles"];
  for (const audit of audits) {
    const target = path.join(root, "artifacts", "quality-audits", auditedSha, runId, audit);
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, "manifest.json"), JSON.stringify({
      schemaVersion: 1,
      audit,
      runId,
      auditedHead: auditedSha,
      originMain: auditedSha,
      baselineStable: true,
      worktreeClean: true,
      reproducible: true,
      resultClass: "REPRODUCIBLE",
      ...(overrides.manifest?.[audit] ?? {}),
    }));
    fs.writeFileSync(path.join(target, "report.json"), JSON.stringify(overrides.report?.[audit] ?? auditResults()[audit]));
  }
}

function writeFlatQualityRun(root, auditedSha, runId, overrides = {}) {
  const target = path.join(root, "artifacts", "quality-audits", auditedSha);
  fs.mkdirSync(target, { recursive: true });
  for (const audit of ["dead-code", "duplication", "top-heavy", "complexity", "cycles"]) {
    const manifest = {
      schemaVersion: 1,
      audit,
      runId,
      auditedHead: auditedSha,
      originMain: auditedSha,
      baselineStable: true,
      worktreeClean: true,
      reproducible: true,
      resultClass: "REPRODUCIBLE",
      generatedAt: overrides.generatedAt ?? "2026-10-10T00:00:00.000Z",
    };
    const prefix = `${audit}--${runId}`;
    fs.writeFileSync(path.join(target, `${prefix}--manifest.json`), JSON.stringify(manifest));
    fs.writeFileSync(path.join(target, `${prefix}--report.json`), JSON.stringify(overrides.report?.[audit] ?? auditResults()[audit]));
    fs.writeFileSync(path.join(target, `${prefix}--summary.md`), "# summary\n");
  }
}

test("loads the latest complete flat run without mixing runIds", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-radar-flat-"));
  const auditedSha = "f".repeat(40);
  try {
    writeFlatQualityRun(root, auditedSha, "run-flat", { generatedAt: "2026-10-12T00:00:00.000Z" });
    const loaded = loadQualityAuditArtifacts({ root, auditedSha });
    assert.equal(loaded.measured, true);
    assert.equal(loaded.complexityByFile instanceof Map, true);

    const mixed = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-radar-mixed-"));
    try {
      writeFlatQualityRun(mixed, auditedSha, "run-flat", { generatedAt: "2026-10-12T00:00:00.000Z" });
      const mixedRoot = path.join(mixed, "artifacts", "quality-audits", auditedSha);
      fs.unlinkSync(path.join(mixedRoot, "cycles--run-flat--report.json"));
      fs.writeFileSync(path.join(mixedRoot, "cycles--run-other--report.json"), JSON.stringify(auditResults().cycles));
      assert.equal(loadQualityAuditArtifacts({ root: mixed, auditedSha }).measured, false);
    } finally {
      fs.rmSync(mixed, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("rejects absent, incorrect, unreadable and incomplete quality provenance", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-radar-invalid-proof-"));
  const auditedSha = "d".repeat(40);
  try {
    assert.equal(loadQualityAuditArtifacts({ root, auditedSha, runId: "missing-run" }).measured, false);
    writeQualityRun(root, auditedSha, "valid-run");
    assert.equal(loadQualityAuditArtifacts({ root, auditedSha, runId: "wrong-run" }).measured, false);

    fs.writeFileSync(path.join(root, "artifacts", "quality-audits", auditedSha, "valid-run", "cycles", "report.json"), "{broken");
    assert.equal(loadQualityAuditArtifacts({ root, auditedSha, runId: "valid-run" }).measured, false);

    writeQualityRun(root, auditedSha, "incomplete-run", {
      report: { duplication: { results: null } },
    });
    const incomplete = loadQualityAuditArtifacts({ root, auditedSha, runId: "incomplete-run" });
    assert.equal(incomplete.measured, false);

    writeQualityRun(root, auditedSha, "incoherent-run", {
      manifest: { complexity: { auditedHead: "e".repeat(40) } },
    });
    assert.equal(loadQualityAuditArtifacts({ root, auditedSha, runId: "incoherent-run" }).measured, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("selects a complete historical run despite origin/main divergence and removed metadata", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-radar-historical-"));
  const auditedSha = "9".repeat(40);
  const runId = "historical-run";
  try {
    writeFlatQualityRun(root, auditedSha, runId);
    const shaRoot = path.join(root, "artifacts", "quality-audits", auditedSha);
    const removed = ["reproducible", "baselineStable", "worktreeChanged", "worktreeClean", "initialWorktreeClean"];
    for (const audit of ["dead-code", "duplication", "top-heavy", "complexity", "cycles"]) {
      const manifestPath = path.join(shaRoot, `${audit}--${runId}--manifest.json`);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      manifest.originMain = "8".repeat(40);
      for (const field of removed) delete manifest[field];
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    }
    assert.equal(loadQualityAuditArtifacts({ root, auditedSha, runId }).measured, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("uses only current complexity findings strictly above the policy target", () => {
  const atTarget = "apps/web/src/at-target.ts";
  const aboveTarget = "apps/web/src/above-target.ts";
  const correlations = createCorrelationSignalsFromAuditResults(auditResults({
    complexity: {
      metrics: [
        { metric: "complexity", path: "src/at-target.ts", category: "React/JSX", value: 20 },
        { metric: "complexity", path: aboveTarget, category: "React/JSX", value: 21 },
        { metric: "complexity", path: "src/data.ts", category: "data/config", value: 999 },
      ],
      result: { failures: [], reviews: [], improvements: [], stale: [] },
    },
  }));
  assert.equal(correlations.complexityByFile.has(atTarget), false);
  assert.equal(correlations.complexityByFile.has(aboveTarget), true);
  assert.equal(correlations.complexityByFile.has("apps/web/src/data.ts"), false);
});

test("accepts qualified duplication identities only when they match the current result", () => {
  const correlations = createCorrelationSignalsFromAuditResults(auditResults({
    duplication: {
      results: [{
        scopeName: "runtime",
        occurrences: [
          { fingerprint: "keep", occurrenceA: { path: "src/keep.ts" }, occurrenceB: { path: "src/other.ts" } },
          { fingerprint: "noise", occurrenceA: { path: "src/noise.ts" }, occurrenceB: { path: "src/other.ts" } },
          { fingerprint: "current", occurrenceA: { path: "src/current.ts" }, occurrenceB: { path: "./src/other.ts" } },
        ],
      }],
      justificationReport: { classifications: { KEEP_INTENTIONAL: ["runtime:keep"], NO_ACTION_NOISE: ["runtime:noise"] } },
    },
  }));
  assert.equal(correlations.duplicationByFile.has("apps/web/src/keep.ts"), false);
  assert.equal(correlations.duplicationByFile.has("apps/web/src/noise.ts"), false);
  assert.equal(correlations.duplicationByFile.get("apps/web/src/current.ts"), 1);
  assert.equal(correlations.duplicationByFile.get("apps/web/src/other.ts"), 1);
});

test("rejects inverted and duplicated canonical markers, summary tables and detail sheets", () => {
  const valid = canonicalRegistry();
  const cases = [
    ["inverted markers", valid.replace("<!-- RADAR:HUMAN_DECISIONS:BEGIN -->", "<!-- RADAR:HUMAN_DECISIONS:SWAP -->").replace("<!-- RADAR:HUMAN_DECISIONS:END -->", "<!-- RADAR:HUMAN_DECISIONS:BEGIN -->").replace("<!-- RADAR:HUMAN_DECISIONS:SWAP -->", "<!-- RADAR:HUMAN_DECISIONS:END -->")],
    ["duplicate begin", valid.replace("<!-- RADAR:HUMAN_DECISIONS:BEGIN -->", "<!-- RADAR:HUMAN_DECISIONS:BEGIN -->\n<!-- RADAR:HUMAN_DECISIONS:BEGIN -->")],
    ["duplicate summary header", valid.replace("| PATH | ARCHITECTURE_DECISION | PRIORITY | DEPENDENCY_OR_BLOCKER | NEXT_TRIGGER |", "| PATH | ARCHITECTURE_DECISION | PRIORITY | DEPENDENCY_OR_BLOCKER | NEXT_TRIGGER |\n| PATH | ARCHITECTURE_DECISION | PRIORITY | DEPENDENCY_OR_BLOCKER | NEXT_TRIGGER |")],
    ["missing detail sheet", valid.replace("#### `src/current.ts`", "#### `src/other.ts`")],
    ["duplicate detail sheet", valid.replace("#### `src/current.ts`", "#### `src/current.ts`\n\n#### `src/current.ts`")],
  ];
  for (const [label, markdown] of cases) {
    const view = { isFile: (file) => file === "documentation/architecture/modularity-decisions.md", readText: () => markdown };
    assert.throws(() => readHumanDecisionsFromView(view, { requireRegistry: true }), /Registre canonique des décisions illisible/, label);
  }
});

test("generates deterministic radar markdown from a temporary synthetic report", () => {
  const candidate = row("apps/web/src/deterministic.ts");
  const input = {
    report: { rows: [candidate], radarRows: [candidate], preventive: [], architectural: [candidate], tests: [], generated: [] },
    refInfo: { requested: "HEAD", resolved: currentRef, status: "CURRENT_AT_GENERATION" },
    humanBlock: canonicalRegistry({ file: candidate.file }),
    humanDecisions: parseHumanDecisions(extractHumanDecisions(canonicalRegistry({ file: candidate.file }))),
    top: 1,
    generatedAt: "2026-01-01T00:00:00.000Z",
  };
  const first = buildRadarMarkdown(input);
  const second = buildRadarMarkdown(input);
  assert.equal(first, second);
  assert.match(first, /RADAR_REF=aaaaaaaa/);
  assert.match(first, /COHESIVE_SINGLE_FILE/);
  assert.doesNotMatch(first, /999 \/ 999/);
});
