import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRadarMarkdown,
  extractHumanDecisions,
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
  const human = `| PATH | DECISION | PRIORITY | SIGNALS | BLOCKER / NEXT_TRIGGER |\n| --- | --- | --- | --- | --- |\n| \`src/example.ts\` | COHESIVE_SINGLE_FILE | NONE | size: PRESENT | no natural boundary |`;
  assert.deepEqual(parseDecisionSummary(human), [{
    file: "src/example.ts",
    decision: "COHESIVE_SINGLE_FILE",
    priority: "NONE",
    signals: "size: PRESENT",
    dependency: "no natural boundary",
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

test("an immutable historical ref is never classified as current", () => {
  const current = resolveRadarRef("HEAD");
  assert.equal(current.status, "CURRENT_AT_GENERATION");

  const historical = resolveRadarRef("HEAD~1");
  assert.equal(historical.status, "HISTORICAL_SNAPSHOT");
  assert.notEqual(historical.resolved, historical.head);
});
