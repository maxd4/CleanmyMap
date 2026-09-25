import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRadarMarkdown,
  compactSignalText,
  createRadarRows,
  extractHumanDecisions,
  loadCorrelationSignals,
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
    complexityByFile: new Map([[candidate.file, 1]]),
    deadCodeByFile: new Map([[candidate.file, 2]]),
  });
  assert.equal(result.signals.complexity.state, "NOT_MEASURED");
  assert.match(result.signals.complexity.detail, /baseline historique: 1 entrée/);
  assert.equal(result.signals.deadCode.state, "NOT_MEASURED");
  assert.match(result.signals.deadCode.detail, /baseline historique: 2 entrée/);
});

test("an IMPROVED complexity baseline entry is still only historical context", () => {
  const view = {
    isFile: () => true,
    readText(file) {
      if (file.includes("complexity-baseline")) {
        return JSON.stringify({ entries: [{ path: "src/example.ts", status: "IMPROVED" }] });
      }
      return JSON.stringify({ findings: [] });
    },
  };
  const correlations = loadCorrelationSignals(view);
  const [result] = createRadarRows([row("apps/web/src/example.ts")], correlations);
  assert.equal(result.signals.complexity.state, "NOT_MEASURED");
  assert.doesNotMatch(result.signals.complexity.detail, /PRESENT|finding/);
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
