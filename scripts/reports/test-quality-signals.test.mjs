import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeCampaignCompleteness,
  analyzeTestProofQuality,
  buildDomainTestDiagnostics,
} from "./test-quality-signals.mjs";

test("analyzeCampaignCompleteness reconciles inclusions, exclusions, dedicated runners, helpers, doc candidates, and markers", () => {
  const files = [
    "apps/web/src/lib/a.test.ts",
    "apps/web/src/__codex-wip.test.ts",
    "apps/web/src/lib/orphan.spec.ts",
    "apps/web/src/components/test-renderer-helpers.ts",
    "apps/web/src/lib/foo.test.harness.ts",
    "apps/web/src/lib/foo.test.edge-scenarios.ts",
    "apps/mobile/tests/support/helper.ts",
    "apps/mobile/tests/app.test.tsx",
    "apps/mobile/security/sec.test.mjs",
    "apps/mobile/tests/agent-device-preflight.test.mjs",
    "apps/mobile/tests/mobile-environment-metro.test.mjs",
    "documentation/specs/gamification-ui/gamification.test.ts",
    "e2e/smoke.test.ts",
    "scripts/checks/foo.test.mjs",
  ];
  const contents = {
    "apps/web/src/lib/a.test.ts": "it('ok', () => { expect(1).toBe(1); });\nit.skip('later', () => {});\n",
    "apps/web/src/__codex-wip.test.ts": "it.only('focused', () => { expect(1).toBe(1); });\n",
    "apps/web/src/lib/orphan.spec.ts": "it('orphan', () => { expect(1).toBe(1); });\n",
    "apps/web/src/components/test-renderer-helpers.ts": "export const renderHelper = () => null;\n",
    "apps/web/src/lib/foo.test.harness.ts": "export const harness = () => null;\n",
    "apps/web/src/lib/foo.test.edge-scenarios.ts": "export const scenarios = [];\n",
    "apps/mobile/tests/support/helper.ts": "export const helper = () => 1;\n",
    "apps/mobile/tests/app.test.tsx": "it.todo('todo case');\n",
    "apps/mobile/security/sec.test.mjs": "test('mobile sec', () => {});\n",
    "apps/mobile/tests/agent-device-preflight.test.mjs": "test('preflight', () => {});\n",
    "apps/mobile/tests/mobile-environment-metro.test.mjs": "test('metro', () => {});\n",
    "documentation/specs/gamification-ui/gamification.test.ts": "it('candidate', () => {});\n",
    "e2e/smoke.test.ts": "test('e2e', () => {});\n",
    "scripts/checks/foo.test.mjs": "test('node', () => {});\n",
  };

  const result = analyzeCampaignCompleteness(files, (f) => contents[f] ?? "");
  assert.equal(result.scopes.web_vitest.trackedFiles, 5);
  assert.equal(result.scopes.web_vitest.runnerIncludedFiles, 1);
  assert.equal(result.scopes.web_vitest.excludedFiles, 4);
  assert.equal(result.scopes.mobile_node_dedicated.trackedFiles, 3);
  assert.equal(result.scopes.mobile_node_dedicated.runnerIncludedFiles, 3);
  assert.equal(result.scopes.e2e_playwright.trackedFiles, 1);
  assert.equal(result.scopes.e2e_playwright.runnerIncludedFiles, 1);
  assert.equal(result.scopes.candidate_specs.trackedFiles, 1);
  assert.equal(result.exclusions.conditionalCount, 1);
  assert.equal(result.exclusions.unjustifiedOrOrphanCount, 1);
  assert.equal(result.exclusions.legitimateInfraCount, 3);
  assert.equal(result.exclusions.candidateSpecCount, 1);
  assert.equal(result.markers.totalSkips, 1);
  assert.equal(result.markers.totalTodos, 1);
  assert.equal(result.markers.totalOnlys, 1);
});

test("analyzeTestProofQuality separates heuristic candidates, static suites, catalogs, and Stryker summary", () => {
  const files = [
    "apps/web/src/app/api/health/route.ts",
    "apps/web/src/app/api/health/route.test.ts",
    "apps/web/src/app/api/untested/route.ts",
    "apps/web/src/lib/auth/session.ts",
    "apps/web/src/lib/auth/session.behavior.test.ts",
    "apps/web/supabase/migrations/001.sql",
    "apps/web/supabase/tests/rls.test.sql",
  ];
  const contents = {
    "apps/web/src/app/api/health/route.test.ts": [
      "vi.mock('a'); vi.mock('b'); vi.spyOn(x, 'y'); vi.spyOn(x, 'z'); vi.mock('c');",
      "it('no assert', () => {});",
    ].join("\n"),
    "apps/web/src/lib/auth/session.behavior.test.ts": "it('checks auth', () => { expect(true).toBe(true); });\n",
  };
  const mutationBaseline = {
    sourceCommit: "a".repeat(40),
    summary: { total: 10, counts: { Killed: 9, Survived: 1, NoCoverage: 0 }, score: 90, allMutantsKillRate: 90 },
    files: { "src/lib/actions/permissions.ts": { counts: { Killed: 9, Survived: 1, NoCoverage: 0 }, score: 90, allMutantsKillRate: 90 } },
  };

  const quality = analyzeTestProofQuality(files, (f) => contents[f] ?? "", { mutationBaseline });
  assert.equal(quality.heuristics.assertionLessCandidateCount, 1);
  assert.equal(quality.heuristics.mockHeavyCandidateCount, 1);
  assert.equal(quality.heuristics.assertionLessCandidates[0].signalType, "HEURISTIC_SIGNAL");
  assert.equal(quality.catalogs.apiRoutes.total, 2);
  assert.equal(quality.catalogs.apiRoutes.byProofLevel.ABSENT, 1);
  assert.equal(quality.catalogs.apiRoutes.byProofLevel.MOCK_HEAVY_CANDIDATE, 1);
  assert.equal(quality.catalogs.permissionsAndAuth.byProofLevel.STATIC_BEHAVIOR_SUITE, 1);
  assert.equal(quality.catalogs.sqlMigrationsAndPgTap.migrationFiles, 1);
  assert.equal(quality.catalogs.sqlMigrationsAndPgTap.pgTapFiles, 1);
  assert.equal(quality.stryker.status, "BASELINE_ONLY");
  assert.equal(quality.stryker.sourceCommit, "a".repeat(40));
  assert.ok(quality.stryker.criticalDomainsNotEvaluatedByStryker.includes("auth-authz"));

  const unattestedDiagnostics = buildDomainTestDiagnostics({
    domains: { "auth-authz": { runtimeFilesWithoutDirectTest: 1, coverage: { status: "UNAVAILABLE", metrics: { branches: { pct: 75 } } } } },
    campaignCompleteness: { provenance: "git", markers: { totalOnlys: 0 }, exclusions: { unjustifiedOrOrphanCount: 0 } },
    proofQuality: quality,
  });
  assert.ok(!unattestedDiagnostics.some((d) => d.classification === "DEMONSTRATED_DEFECT" && d.evidenceLevel === "EXECUTED_BEHAVIOR"));
  assert.ok(unattestedDiagnostics.some((d) => d.classification === "HEURISTIC_SIGNAL" && d.evidenceLevel === "PRESENT_NOT_ATTESTED"));

  const attestedDiagnostics = buildDomainTestDiagnostics({
    domains: { "auth-authz": { runtimeFilesWithoutDirectTest: 1, coverage: { status: "AVAILABLE", metrics: { branches: { pct: 75 } } } } },
    campaignCompleteness: { provenance: "git", markers: { totalOnlys: 1 }, exclusions: { unjustifiedOrOrphanCount: 1 } },
    proofQuality: quality,
  });
  assert.ok(attestedDiagnostics.some((d) => d.classification === "DEMONSTRATED_DEFECT" && d.priority === "P0"));
  assert.ok(attestedDiagnostics.some((d) => d.classification === "UNAVAILABLE_MEASUREMENT"));
  assert.ok(attestedDiagnostics.some((d) => d.classification === "HEURISTIC_SIGNAL"));
});
