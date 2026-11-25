import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTimingMarkdown,
  parsePlaywrightJsonReport,
  sanitizeTimingLabel,
  summarizeTimings,
} from "./ci-timing-report.mjs";

test("sanitizeTimingLabel redacts forbidden public artifact terms", () => {
  const sanitized = sanitizeTimingLabel("security-02-two-sessions session_token bearer");
  assert.equal(sanitized.includes("session_token"), false);
  assert.equal(sanitized.includes("bearer"), false);
});

test("summarizeTimings identifies slowest items and regressions", () => {
  const summary = summarizeTimings(
    [
      { name: "fast.sql", outcome: "PASS", durationMs: 500 },
      { name: "medium.sql", outcome: "PASS", durationMs: 12000 },
      { name: "slow.sql", outcome: "PASS", durationMs: 42000 },
    ],
    {
      slowThresholdMs: 30_000,
      baselineDurationsMs: { "medium.sql": 5000 },
    },
  );

  assert.equal(summary.count, 3);
  assert.equal(summary.totalDurationMs, 54500);
  assert.equal(summary.slowest[0].name, "slow.sql");
  assert.equal(summary.regressions.length, 2);
  assert.equal(summary.regressions[0].reason, "exceeded-threshold");
  assert.equal(summary.regressions[1].reason, "exceeded-baseline");
});

test("parsePlaywrightJsonReport extracts durations and formats markdown", () => {
  const entries = parsePlaywrightJsonReport({
    suites: [
      {
        suites: [
          {
            projectName: "action sharing",
            specs: [
              {
                title: "creates and shares action",
                tests: [{ results: [{ status: "passed", duration: 1234 }] }],
              },
            ],
          },
        ],
      },
    ],
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0].durationMs, 1234);
  const md = formatTimingMarkdown("E2E", summarizeTimings(entries));
  assert.match(md, /\[action sharing\] creates and shares action/);
});
