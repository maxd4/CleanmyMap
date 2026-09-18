import test from "node:test";
import assert from "node:assert/strict";

import {
  aggregateContributions,
  classifyAndAggregate,
  classifySession,
} from "./attribute-codex-usage.mjs";

const CANONICAL_ROOT = "C:\\Users\\sophi\\Desktop\\MAXENCE\\business\\CleanmyMap-main";
const CANONICAL_ORIGIN = "https://github.com/maxd4/CleanmyMap.git";
const START = Date.parse("2026-07-01T00:00:00.000Z");
const END = Date.parse("2026-07-31T23:59:59.999Z");

function session(overrides = {}) {
  const values = {
    input_tokens: 100,
    cached_input_tokens: 80,
    uncached_input_tokens: 20,
    cache_write_input_tokens: 0,
    output_tokens: 10,
    reasoning_output_tokens: 3,
    total_tokens: 110,
  };
  const contributions = Object.fromEntries(Object.entries(values).map(([field, value]) => [field, [{ timestamp: "2026-07-15T12:00:00.000Z", value }]]));
  return {
    session_id: "session-1",
    start: "2026-07-15T11:00:00.000Z",
    end: "2026-07-15T12:00:01.000Z",
    cwd: "C:\\Users\\sophi\\Desktop\\MAXENCE\\business\\CleanmyMap-main",
    models: ["gpt-5.6-luna"],
    git: { repository_url: CANONICAL_ORIGIN, branch: "main" },
    tokenReconstruction: {
      values,
      contributions,
      quality: { status: "DERIVED_FROM_CUMULATIVE_COUNTER" },
    },
    ...overrides,
  };
}

test("classifies CleanMyMap from repository origin", () => {
  const result = classifySession(session(), { canonicalRoot: CANONICAL_ROOT, canonicalOrigin: CANONICAL_ORIGIN });
  assert.equal(result.classification, "CLEANMYMAP");
  assert.equal(result.proof, "repository_origin");
});

test("recognizes a CleanMyMap path alias from the Git root", () => {
  const result = classifySession(session({ cwd: "C:\\Users\\sophi\\Desktop\\MAXENCE\\business\\CleanmyMap-alias", git_root: CANONICAL_ROOT, git: { branch: "codex/test", commit_hash: "abc" } }), {
    canonicalRoot: CANONICAL_ROOT,
    canonicalOrigin: CANONICAL_ORIGIN,
  });
  assert.equal(result.classification, "CLEANMYMAP");
  assert.equal(result.proof, "git_root");
});

test("classifies a different repository as OTHER_PROJECT", () => {
  const result = classifySession(session({
    cwd: "C:\\Users\\sophi\\Desktop\\MAXENCE\\business\\proteo codex",
    git: { repository_url: "https://github.com/maxd4/proteo-codex-20260727.git", branch: "main" },
  }), { canonicalRoot: CANONICAL_ROOT, canonicalOrigin: CANONICAL_ORIGIN });
  assert.equal(result.classification, "OTHER_PROJECT");
  assert.equal(result.proof, "repository_origin");
});

test("keeps missing or conflicting evidence AMBIGUOUS", () => {
  const missing = classifySession(session({ cwd: "C:\\Users\\sophi\\Documents\\Codex\\standalone", git: {} }), {
    canonicalRoot: CANONICAL_ROOT,
    canonicalOrigin: CANONICAL_ORIGIN,
  });
  const conflict = classifySession(session({
    cwd: CANONICAL_ROOT,
    git: { repository_url: "https://github.com/maxd4/other.git", branch: "main" },
  }), { canonicalRoot: CANONICAL_ROOT, canonicalOrigin: CANONICAL_ORIGIN });
  assert.equal(missing.classification, "AMBIGUOUS");
  assert.equal(conflict.classification, "AMBIGUOUS");
});

test("aggregates normalized contributions without reading conversation content", () => {
  const artifacts = {
    "normalized-sessions.json": { sessions: [session()] },
    "schema-audit.json": { tokenFields: [], observedTokenSources: [] },
    "telemetry-summary.json": {
      firstAvailableTrace: "2026-07-15T11:00:00.000Z",
      lastAvailableTrace: "2026-07-15T12:00:01.000Z",
      sixMonthWindowCoverage: { status: "PARTIAL" },
      deduplication: { uniqueSessions: 1 },
    },
  };
  const report = classifyAndAggregate(artifacts, {
    inputDir: "artifacts/codex-usage/test",
    canonicalRoot: CANONICAL_ROOT,
    canonicalOrigin: CANONICAL_ORIGIN,
    externalTool: "fixture",
    externalVersion: "1.0.0",
    externalStatus: "NOT_AVAILABLE",
    externalNote: "test",
  });
  assert.equal(report.classificationCounts.CLEANMYMAP, 1);
  assert.equal(report.cleanmymap.REFERENCE_6_MONTH_WINDOW.total_tokens, 110);
  assert.equal(report.cleanmymap.REFERENCE_6_MONTH_WINDOW.cached_input_tokens, 80);
  assert.equal(report.cleanmymapCacheShare.value, 80 / 100);
  assert.equal(report.cacheShare.value, 80 / 100);
  assert.equal(report.totalsByPeriod.FULL_LOCAL_HISTORY.CLEANMYMAP_TOTAL.total_tokens, 110);
  assert.equal(report.totalsByPeriod.REFERENCE_6_MONTH_WINDOW.CLEANMYMAP_TOTAL.total_tokens, 110);
  assert.equal(report.attribution[0].prompt, undefined);
  assert.equal(report.attribution[0].response, undefined);
  assert.equal(JSON.stringify(report).includes("secret prompt"), false);
});

test("handles sessions without usable counters as missing, not zero", () => {
  const incomplete = session({
    session_id: "session-2",
    tokenReconstruction: { values: { input_tokens: "NA" }, contributions: {}, quality: { status: "UNUSABLE" } },
  });
  const aggregate = aggregateContributions([incomplete], START, END);
  assert.equal(aggregate.fields.input_tokens.value, "NA");
  assert.equal(aggregate.fields.input_tokens.status, "NA");
  assert.equal(aggregate.fields.total_tokens.value, "NA");
});
