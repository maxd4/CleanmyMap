import path from "node:path";

const TEST_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);

function normalize(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function isTrackedTestCandidate(file) {
  const normalized = normalize(file);
  if (/(?:^|\/)(?:node_modules|\.next|dist|build|coverage|vendor|android)(?:\/|$)/.test(normalized)) return false;
  if (TEST_EXTENSIONS.has(path.posix.extname(normalized))) {
    return /\.(?:test|spec)(?:\.[^.]+)*\.[^.]+$/i.test(normalized)
      || /(?:^|\/)(?:__tests__|tests)(?:\/|$)/i.test(normalized);
  }
  if (/^maintenance\/python\/tests\/.*test_.*\.py$|^maintenance\/python\/.*_test\.py$/i.test(normalized)) return true;
  if (/^apps\/web\/supabase\/tests\/.*\.sql$/i.test(normalized)) return true;
  return false;
}

function classifyScopeAndInclusion(file) {
  const normalized = normalize(file);
  if (normalized.startsWith("documentation/specs/")) {
    return { scope: "candidate_specs", included: false, exclusionKind: "CANDIDATE_SPEC_NON_INTEGRATED", reason: "unintegrated spec candidate under documentation/specs/" };
  }
  if (normalized.startsWith("apps/web/src/")) {
    if (/^apps\/web\/src\/.*\/__codex-[^/]*\.test\.ts$/i.test(normalized) || /^apps\/web\/src\/__codex-[^/]*\.test\.ts$/i.test(normalized)) {
      return { scope: "web_vitest", included: false, exclusionKind: "CONDITIONAL_POLICY", reason: "excluded by apps/web/vitest.config.mts (__codex-*.test.ts)" };
    }
    if (/\.test\.(?:harness|.*-scenarios?)\.tsx?$/i.test(normalized)) {
      return { scope: "web_vitest", included: false, exclusionKind: "LEGITIMATE_INFRA", reason: "test harness or scenario helper consumed by test suites" };
    }
    if (/^apps\/web\/src\/.+\.test\.tsx?$/i.test(normalized)) {
      return { scope: "web_vitest", included: true, exclusionKind: null, reason: null };
    }
    if (/\/(?:__tests__|tests)\//.test(normalized) && !/\.(?:test|spec)\./i.test(normalized)) {
      return { scope: "web_vitest", included: false, exclusionKind: "LEGITIMATE_INFRA", reason: "test helper/fixture under __tests__ or tests without .test. suffix" };
    }
    return { scope: "web_vitest", included: false, exclusionKind: "UNJUSTIFIED_OR_ORPHAN", reason: "does not match apps/web/vitest.config.mts include (src/**/*.test.{ts,tsx})" };
  }
  if (normalized.startsWith("apps/mobile/")) {
    if (/^apps\/mobile\/(?:security\/.*\.test\.mjs|tests\/(?:agent-device-preflight|mobile-environment-metro)\.test\.mjs)$/i.test(normalized)) {
      return { scope: "mobile_node_dedicated", included: true, exclusionKind: null, reason: null };
    }
    if (/^apps\/mobile\/tests\/.+\.test\.tsx?$/i.test(normalized)) {
      return { scope: "mobile_vitest", included: true, exclusionKind: null, reason: null };
    }
    if (/^apps\/mobile\/tests\/(?:support\/|test-renderer-helpers\.ts$)/i.test(normalized)) {
      return { scope: "mobile_vitest", included: false, exclusionKind: "LEGITIMATE_INFRA", reason: "mobile test support helper" };
    }
    return { scope: "mobile_vitest", included: false, exclusionKind: "UNJUSTIFIED_OR_ORPHAN", reason: "does not match apps/mobile/vitest.config.ts include (tests/**/*.test.{ts,tsx})" };
  }
  if (normalized.startsWith("scripts/") || normalized.startsWith("apps/web/scripts/")) {
    if (/\.test\.(?:mjs|js)$/i.test(normalized)) {
      return { scope: "node_scripts", included: true, exclusionKind: null, reason: null };
    }
    if (/\/(?:tests|fixtures)\//.test(normalized) && !/\.(?:test|spec)\./i.test(normalized)) {
      return { scope: "node_scripts", included: false, exclusionKind: "LEGITIMATE_INFRA", reason: "script test fixture or helper" };
    }
    return { scope: "node_scripts", included: false, exclusionKind: "UNJUSTIFIED_OR_ORPHAN", reason: "does not match run-script-tests.mjs (*.test.{mjs,js})" };
  }
  if (normalized.startsWith("maintenance/python/")) {
    return { scope: "python_pytest", included: true, exclusionKind: null, reason: null };
  }
  if (normalized.startsWith("e2e/")) {
    if (/\.(?:spec|test)\.(?:ts|tsx|js|mjs)$/i.test(normalized)) {
      return { scope: "e2e_playwright", included: true, exclusionKind: null, reason: null };
    }
    return { scope: "e2e_playwright", included: false, exclusionKind: "LEGITIMATE_INFRA", reason: "e2e helper or setup file" };
  }
  if (normalized.startsWith("apps/web/supabase/tests/")) {
    return { scope: "pgtap_sql", included: true, exclusionKind: null, reason: null };
  }
  return { scope: "other", included: false, exclusionKind: "UNJUSTIFIED_OR_ORPHAN", reason: "outside known test runner roots" };
}

const CI_WIRING = Object.freeze({
  web_vitest: { ciWorkflow: ".github/workflows/ci.yml", ciJob: "web-tests", wired: true },
  mobile_vitest: { ciWorkflow: ".github/workflows/ci.yml", ciJob: "mobile-quality", wired: true },
  mobile_node_dedicated: { ciWorkflow: ".github/workflows/ci.yml", ciJob: "mobile-quality (mobile:security / metro-env / ui:preflight)", wired: true },
  node_scripts: { ciWorkflow: ".github/workflows/ci.yml", ciJob: "node-coverage", wired: true },
  python_pytest: { ciWorkflow: ".github/workflows/ci.yml", ciJob: "python-coverage", wired: true },
  e2e_playwright: { ciWorkflow: ".github/workflows/ci.yml", ciJob: "e2e-public (conditional/manual)", wired: true },
  pgtap_sql: { ciWorkflow: ".github/workflows/e2e-supabase-ephemeral.yml", ciJob: "ephemeral-supabase (manual/conditional)", wired: false },
  candidate_specs: { ciWorkflow: null, ciJob: null, wired: false },
  other: { ciWorkflow: null, ciJob: null, wired: false },
});

function countStaticMarkers(content, scope) {
  if (scope === "pgtap_sql") {
    const assertions = (content.match(/\b(?:is|ok|isn_t|throws_ok|lives_ok|results_eq|bag_eq|set_eq|performs_ok|pass|fail)\s*\(/gi) ?? []).length;
    return { testCases: assertions, assertions, skips: 0, todos: 0, onlys: 0, mocks: 0 };
  }
  if (scope === "python_pytest") {
    const testCases = (content.match(/^\s*(?:async\s+)?def\s+test_/gm) ?? []).length;
    const assertions = (content.match(/\bassert\b|pytest\.raises\b/g) ?? []).length;
    const skips = (content.match(/@pytest\.mark\.skip\b|pytest\.skip\(/g) ?? []).length;
    const mocks = (content.match(/\b(?:monkeypatch|MagicMock|AsyncMock|patch)\b/g) ?? []).length;
    return { testCases, assertions, skips, todos: 0, onlys: 0, mocks };
  }
  const testCases = (content.match(/(?:^|\s)(?:it|test)(?:\.(?:only|skip|todo|each))?\s*\(/gm) ?? []).length;
  const assertions = (content.match(/\b(?:expect|assert)\s*(?:\(|\.)/g) ?? []).length;
  const skips = (content.match(/\b(?:it|test|describe)\.skip\s*\(/g) ?? []).length;
  const todos = (content.match(/\b(?:it|test|describe)\.todo\s*\(/g) ?? []).length;
  const onlys = (content.match(/\b(?:it|test|describe)\.only\s*\(/g) ?? []).length;
  const mocks = (content.match(/\b(?:vi\.mock|vi\.spyOn|jest\.mock|mockImplementation|mockReturnValue|mockResolvedValue|mockRejectedValue)\b/g) ?? []).length;
  return { testCases, assertions, skips, todos, onlys, mocks };
}

/**
 * Reconcile tracked test files on the audited Git tree against runner discovery,
 * exclusions, static skip/todo/only markers, and CI wiring.
 */
export function analyzeCampaignCompleteness(allTrackedFiles, readText) {
  const scopes = {};
  const orphansAndUnjustified = [];
  const conditionalExclusions = [];
  const legitimateExclusions = [];
  const candidateSpecs = [];
  const skipTodoOnlyFiles = [];

  for (const rawFile of allTrackedFiles) {
    const file = normalize(rawFile);
    if (!isTrackedTestCandidate(file)) continue;
    const info = classifyScopeAndInclusion(file);
    const bucket = scopes[info.scope] ?? {
      scope: info.scope,
      trackedFiles: 0,
      runnerIncludedFiles: 0,
      excludedFiles: 0,
      staticTestCases: 0,
      skips: 0,
      todos: 0,
      onlys: 0,
      ciWiring: CI_WIRING[info.scope] ?? CI_WIRING.other,
    };
    bucket.trackedFiles += 1;
    if (info.included) {
      bucket.runnerIncludedFiles += 1;
    } else {
      bucket.excludedFiles += 1;
      const entry = { path: file, scope: info.scope, exclusionKind: info.exclusionKind, reason: info.reason };
      if (info.exclusionKind === "UNJUSTIFIED_OR_ORPHAN") orphansAndUnjustified.push(entry);
      else if (info.exclusionKind === "CONDITIONAL_POLICY") conditionalExclusions.push(entry);
      else if (info.exclusionKind === "CANDIDATE_SPEC_NON_INTEGRATED") candidateSpecs.push(entry);
      else legitimateExclusions.push(entry);
    }

    const content = readText(file);
    const markers = countStaticMarkers(content, info.scope);
    bucket.staticTestCases += markers.testCases;
    bucket.skips += markers.skips;
    bucket.todos += markers.todos;
    bucket.onlys += markers.onlys;
    if (markers.skips > 0 || markers.todos > 0 || markers.onlys > 0) {
      skipTodoOnlyFiles.push({
        path: file,
        scope: info.scope,
        skips: markers.skips,
        todos: markers.todos,
        onlys: markers.onlys,
        classification: markers.onlys > 0 ? "DEMONSTRATED_DEFECT" : "HEURISTIC_SIGNAL",
      });
    }
    scopes[info.scope] = bucket;
  }

  return {
    provenance: "git-tracked-tree-static",
    scopes,
    exclusions: {
      unjustifiedOrOrphanCount: orphansAndUnjustified.length,
      conditionalCount: conditionalExclusions.length,
      candidateSpecCount: candidateSpecs.length,
      legitimateInfraCount: legitimateExclusions.length,
      unjustifiedOrOrphanExamples: orphansAndUnjustified.slice(0, 30),
      conditionalExamples: conditionalExclusions.slice(0, 30),
      candidateSpecExamples: candidateSpecs.slice(0, 30),
    },
    markers: {
      totalSkips: Object.values(scopes).reduce((sum, s) => sum + s.skips, 0),
      totalTodos: Object.values(scopes).reduce((sum, s) => sum + s.todos, 0),
      totalOnlys: Object.values(scopes).reduce((sum, s) => sum + s.onlys, 0),
      filesWithMarkers: skipTodoOnlyFiles.slice(0, 50),
    },
  };
}

function summarizeMutationEvidence(mutationBaseline, mutationReport) {
  const source = mutationReport?.summary ? mutationReport : (mutationBaseline ?? mutationReport ?? null);
  if (!source) {
    return { status: "NOT_MEASURED", reason: "no Stryker baseline or report found" };
  }
  const files = Object.entries(source.files ?? {}).map(([file, entry]) => ({
    file,
    score: typeof entry.score === "number" ? Number(entry.score.toFixed(2)) : null,
    allMutantsKillRate: typeof entry.allMutantsKillRate === "number" ? Number(entry.allMutantsKillRate.toFixed(2)) : null,
    survived: entry.counts?.Survived ?? 0,
    noCoverage: entry.counts?.NoCoverage ?? 0,
    killed: entry.counts?.Killed ?? 0,
  }));
  return {
    status: mutationReport ? "MEASURED" : "BASELINE_ONLY",
    provenance: mutationReport?.provenance ?? "scripts/checks/mutation-baseline.json",
    sourceCommit: mutationReport?.sourceSha ?? mutationBaseline?.sourceCommit ?? null,
    summary: source.summary ?? null,
    files,
    criticalDomainsNotEvaluatedByStryker: ["auth-authz", "api", "account", "payments", "spogomi", "import-export", "learning", "supabase-sql"],
  };
}

function classifyCatalogProof(runtimeFile, testFiles, mockHeavySet) {
  if (testFiles.length === 0) return "ABSENT";
  if (testFiles.some((f) => f.startsWith("e2e/") || /\.integration\.test\./i.test(f))) {
    return "STATIC_INTEGRATION_SUITE";
  }
  if (testFiles.some((f) => /\.behavior\.test\./i.test(f))) {
    return "STATIC_BEHAVIOR_SUITE";
  }
  if (testFiles.every((f) => mockHeavySet.has(f))) return "MOCK_HEAVY_CANDIDATE";
  return "STATIC_OR_UNIT_TEST";
}

/**
 * Analyze static test proof quality (assertion-less candidates, mock-heavy candidates),
 * critical catalog cross-references (API, permissions, business transitions, SQL/RPC),
 * and existing Stryker mutation evidence.
 */
export function analyzeTestProofQuality(allTrackedFiles, readText, { mutationBaseline = null, mutationReport = null } = {}) {
  const assertionLessCandidates = [];
  const mockHeavyCandidates = [];
  const mockHeavySet = new Set();
  const testFilesByStem = new Map();

  for (const rawFile of allTrackedFiles) {
    const file = normalize(rawFile);
    if (!isTrackedTestCandidate(file)) continue;
    const info = classifyScopeAndInclusion(file);
    if (!info.included || info.scope === "pgtap_sql") continue;
    const content = readText(file);
    const markers = countStaticMarkers(content, info.scope);

    if (markers.testCases > 0 && markers.assertions === 0) {
      assertionLessCandidates.push({
        path: file,
        scope: info.scope,
        testCases: markers.testCases,
        assertions: markers.assertions,
        signalType: "HEURISTIC_SIGNAL",
        note: "Candidate to review: no standard expect/assert call matched statically; helpers or custom assertions may exist.",
      });
    }
    if (markers.mocks >= 5 && markers.mocks >= markers.assertions) {
      mockHeavySet.add(file);
      mockHeavyCandidates.push({
        path: file,
        scope: info.scope,
        mocks: markers.mocks,
        assertions: markers.assertions,
        signalType: "HEURISTIC_SIGNAL",
        note: "Candidate to review: high mock/spy density relative to static assertions.",
      });
    }

    const stem = file.replace(/(?:\.(?:behavior|integration))?\.(?:test|spec)\.[^.]+$/i, "");
    const existing = testFilesByStem.get(stem) ?? [];
    existing.push(file);
    testFilesByStem.set(stem, existing);
  }

  const catalogs = {
    apiRoutes: { total: 0, byProofLevel: { STATIC_INTEGRATION_SUITE: 0, STATIC_BEHAVIOR_SUITE: 0, STATIC_OR_UNIT_TEST: 0, MOCK_HEAVY_CANDIDATE: 0, ABSENT: 0 }, unprovedExamples: [] },
    permissionsAndAuth: { total: 0, byProofLevel: { STATIC_INTEGRATION_SUITE: 0, STATIC_BEHAVIOR_SUITE: 0, STATIC_OR_UNIT_TEST: 0, MOCK_HEAVY_CANDIDATE: 0, ABSENT: 0 }, unprovedExamples: [] },
    businessTransitions: { total: 0, byProofLevel: { STATIC_INTEGRATION_SUITE: 0, STATIC_BEHAVIOR_SUITE: 0, STATIC_OR_UNIT_TEST: 0, MOCK_HEAVY_CANDIDATE: 0, ABSENT: 0 }, unprovedExamples: [] },
    sqlMigrationsAndPgTap: { migrationFiles: 0, pgTapFiles: 0, note: "PostgreSQL/RLS/RPC invariants require pgTAP execution (DB_SEMANTICS_NOT_EXECUTED locally)." },
  };

  for (const rawFile of allTrackedFiles) {
    const file = normalize(rawFile);
    if (file.startsWith("apps/web/supabase/migrations/") && /\.sql$/i.test(file)) {
      catalogs.sqlMigrationsAndPgTap.migrationFiles += 1;
      continue;
    }
    if (file.startsWith("apps/web/supabase/tests/") && /\.sql$/i.test(file)) {
      catalogs.sqlMigrationsAndPgTap.pgTapFiles += 1;
      continue;
    }
    if (!file.startsWith("apps/web/src/") || !/\.(?:ts|tsx|js|mjs)$/i.test(file) || isTrackedTestCandidate(file)) continue;
    const stem = file.replace(/\.[^.]+$/, "");
    const directTests = testFilesByStem.get(stem) ?? [];
    const proof = classifyCatalogProof(file, directTests, mockHeavySet);

    if (/^apps\/web\/src\/app\/api\/.*\/route\.ts$/i.test(file)) {
      catalogs.apiRoutes.total += 1;
      catalogs.apiRoutes.byProofLevel[proof] += 1;
      if (proof === "ABSENT" && catalogs.apiRoutes.unprovedExamples.length < 25) catalogs.apiRoutes.unprovedExamples.push(file);
    } else if (/^apps\/web\/src\/(?:lib\/auth|lib\/authz|proxy\.ts|lib\/actions\/permissions\.ts)/i.test(file)) {
      catalogs.permissionsAndAuth.total += 1;
      catalogs.permissionsAndAuth.byProofLevel[proof] += 1;
      if (proof === "ABSENT" && catalogs.permissionsAndAuth.unprovedExamples.length < 25) catalogs.permissionsAndAuth.unprovedExamples.push(file);
    } else if (/^apps\/web\/src\/lib\/actions\/.*(?:transition|status|workflow|moderation)/i.test(file)) {
      catalogs.businessTransitions.total += 1;
      catalogs.businessTransitions.byProofLevel[proof] += 1;
      if (proof === "ABSENT" && catalogs.businessTransitions.unprovedExamples.length < 25) catalogs.businessTransitions.unprovedExamples.push(file);
    }
  }

  return {
    provenance: "git-tracked-tree-static + mutation-artifacts",
    heuristics: {
      assertionLessCandidateCount: assertionLessCandidates.length,
      assertionLessCandidates: assertionLessCandidates.slice(0, 30),
      mockHeavyCandidateCount: mockHeavyCandidates.length,
      mockHeavyCandidates: mockHeavyCandidates.slice(0, 30),
    },
    catalogs,
    stryker: summarizeMutationEvidence(mutationBaseline, mutationReport),
  };
}

/**
 * Build domain-level actionable diagnostics separating demonstrated defects,
 * heuristic signals, and unavailable measurements.
 */
export function buildDomainTestDiagnostics({ domains, campaignCompleteness, proofQuality }) {
  const diagnostics = [];
  const highRisk = new Set(["auth-authz", "api", "account", "actions", "payments", "spogomi", "mobile/services"]);

  if (campaignCompleteness.markers.totalOnlys > 0) {
    diagnostics.push({
      domain: "monorepo",
      priority: "P0",
      classification: "DEMONSTRATED_DEFECT",
      evidenceLevel: "STATIC_CONTRACT",
      provenance: campaignCompleteness.provenance,
      detail: `${campaignCompleteness.markers.totalOnlys} occurrence(s) de .only détectée(s) dans les tests.`,
      recommendedAction: "Supprimer les .only pour éviter l'exécution partielle silencieuse.",
    });
  }
  if (campaignCompleteness.exclusions.unjustifiedOrOrphanCount > 0) {
    diagnostics.push({
      domain: "monorepo",
      priority: "P1",
      classification: "DEMONSTRATED_DEFECT",
      evidenceLevel: "STATIC_CONTRACT",
      provenance: campaignCompleteness.provenance,
      detail: `${campaignCompleteness.exclusions.unjustifiedOrOrphanCount} fichier(s) de test non inclus par leur runner.`,
      recommendedAction: "Raccorder ces fichiers aux globs Vitest/Node ou les reclasser en helpers.",
    });
  }
  if (proofQuality.catalogs.sqlMigrationsAndPgTap.migrationFiles > 0) {
    diagnostics.push({
      domain: "database/supabase",
      priority: "P0",
      classification: "UNAVAILABLE_MEASUREMENT",
      evidenceLevel: "DB_SEMANTICS_NOT_EXECUTED",
      provenance: "apps/web/supabase",
      detail: `${proofQuality.catalogs.sqlMigrationsAndPgTap.migrationFiles} migrations et ${proofQuality.catalogs.sqlMigrationsAndPgTap.pgTapFiles} suites pgTAP non exécutées localement.`,
      recommendedAction: "Exécuter le workflow e2e-supabase-ephemeral sur candidat exact.",
    });
  }

  for (const [domain, stats] of Object.entries(domains ?? {})) {
    const priority = highRisk.has(domain) ? "P0" : "P2";
    const missingDirect = stats.runtimeFilesWithoutDirectTest ?? 0;
    const branchPct = stats.coverage?.metrics?.branches?.pct ?? null;
    if (branchPct !== null && branchPct < 80 && highRisk.has(domain)) {
      const attested = stats.coverage?.status === "AVAILABLE";
      diagnostics.push({
        domain,
        priority: "P1",
        classification: attested ? "DEMONSTRATED_DEFECT" : "HEURISTIC_SIGNAL",
        evidenceLevel: attested ? "EXECUTED_BEHAVIOR" : "PRESENT_NOT_ATTESTED",
        provenance: "coverage-summary.json",
        detail: `Couverture branches ${branchPct}% (< 80%) sur un domaine prioritaire (${attested ? "attestée" : "observation non attestée"}).`,
        recommendedAction: "Ajouter des tests comportementaux ciblant les branches non couvertes.",
      });
    } else if (missingDirect > 0 && highRisk.has(domain)) {
      diagnostics.push({
        domain,
        priority,
        classification: "HEURISTIC_SIGNAL",
        evidenceLevel: "STATIC_CONTRACT",
        provenance: "git-tracked-tree-static",
        detail: `${missingDirect} module(s) runtime sans test directement associé.`,
        recommendedAction: "Vérifier la couverture indirecte ou ajouter un test propriétaire ciblé.",
      });
    }
  }

  if (proofQuality.heuristics.assertionLessCandidateCount > 0 || proofQuality.heuristics.mockHeavyCandidateCount > 0) {
    diagnostics.push({
      domain: "test-suite-hygiene",
      priority: "P2",
      classification: "HEURISTIC_SIGNAL",
      evidenceLevel: "STATIC_CONTRACT",
      provenance: proofQuality.provenance,
      detail: `${proofQuality.heuristics.assertionLessCandidateCount} candidat(s) sans assertion standard et ${proofQuality.heuristics.mockHeavyCandidateCount} candidat(s) fortement mockés.`,
      recommendedAction: "Examiner manuellement ces candidats sans les traiter comme défauts automatiques.",
    });
  }

  return diagnostics.sort((a, b) => a.priority.localeCompare(b.priority) || a.domain.localeCompare(b.domain));
}
