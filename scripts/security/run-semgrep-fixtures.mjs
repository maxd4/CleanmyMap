import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseSemgrepJson, REPOSITORY_ROOT, runSemgrep } from "./semgrep/run-semgrep.mjs";
import { resolveCandidateSha, writeQualityEvidence } from "../checks/quality-evidence.mjs";

const fixtureRoot = path.join(REPOSITORY_ROOT, "scripts", "security", "semgrep", "fixtures");

const cases = [
  { fixture: "client-service-role.tsx", target: "apps/web/src/.semgrep-client.tsx", rule: "cleanmymap-no-service-role-in-client-component", expected: true },
  { fixture: "server-service-role.ts", target: "apps/web/src/.semgrep-server.ts", rule: "cleanmymap-no-service-role-in-client-component", expected: false },
  { fixture: "mobile-service-role.ts", target: "apps/mobile/.semgrep-mobile-positive.ts", rule: "cleanmymap-no-service-role-in-mobile", expected: true },
  { fixture: "mobile-anon-key.ts", target: "apps/mobile/.semgrep-mobile-negative.ts", rule: "cleanmymap-no-service-role-in-mobile", expected: false },
  { fixture: "supabase-auth.ts", target: "apps/web/src/.semgrep-auth-positive.ts", rule: "cleanmymap-no-supabase-auth-identity", expected: true },
  { fixture: "supabase-clerk.ts", target: "apps/web/src/.semgrep-auth-negative.ts", rule: "cleanmymap-no-supabase-auth-identity", expected: false },
  { fixture: "unsafe-html.tsx", target: "apps/web/src/.semgrep-html-positive.tsx", rule: "cleanmymap-no-unauthorized-dangerously-set-inner-html", expected: true },
  { fixture: "safe-html.tsx", target: "apps/web/src/.semgrep-html-negative.tsx", rule: "cleanmymap-no-unauthorized-dangerously-set-inner-html", expected: false },
  { fixture: "unsafe-redirect.ts", target: "apps/web/src/.semgrep-redirect-positive.ts", rule: "cleanmymap-no-direct-user-controlled-redirect", expected: true },
  { fixture: "safe-redirect.ts", target: "apps/web/src/.semgrep-redirect-negative.ts", rule: "cleanmymap-no-direct-user-controlled-redirect", expected: false },
  { fixture: "client-server-import.tsx", target: "apps/web/src/.semgrep-boundary-positive.tsx", rule: "cleanmymap-no-client-server-only-import", expected: true },
  { fixture: "client-browser-import.tsx", target: "apps/web/src/.semgrep-boundary-negative.tsx", rule: "cleanmymap-no-client-server-only-import", expected: false },
];

const targets = [];
let result = null;
let failure = null;
try {
  for (const testCase of cases) {
    const target = path.join(REPOSITORY_ROOT, testCase.target);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, fs.readFileSync(path.join(fixtureRoot, testCase.fixture), "utf8"), "utf8");
    targets.push(testCase.target);
  }

  result = runSemgrep(targets);
  assert.equal(result.error, null, result.stderr);
  assert.equal(result.status, 0, `Semgrep a échoué (${result.status})\n${result.stderr}`);
  const report = parseSemgrepJson(result.stdout);
  assert.ok(report, "sortie JSON Semgrep invalide");
  for (const testCase of cases) {
    const found = report.results.some(
      (finding) => finding.path.replaceAll("\\", "/").endsWith(testCase.target) && finding.check_id.endsWith(testCase.rule),
    );
    assert.equal(found, testCase.expected, `${testCase.fixture}: règle ${testCase.rule}`);
  }
} catch (error) {
  failure = error;
} finally {
  for (const target of targets) {
    fs.rmSync(path.join(REPOSITORY_ROOT, target), { force: true });
  }
}

try {
  const status = result?.error === "HOST_ENVIRONMENT" ? "NOT_RUN" : failure ? "FAIL" : "PASS";
  writeQualityEvidence({
    repositoryRoot: REPOSITORY_ROOT,
    evidenceRoot: "artifacts/security-evidence",
    fileKey: "semgrep-fixtures",
    gate: "semgrep-fixtures",
    candidateSha: resolveCandidateSha(REPOSITORY_ROOT),
    candidateRef: process.env.CANDIDATE_SHA ?? "HEAD",
    status,
    findings: null,
    metrics: {
      fixturesTotal: cases.length,
      fixturesPassed: failure ? 0 : cases.length,
      fixtureFailures: failure ? 1 : 0,
    },
    details: failure ? { executionError: failure.constructor?.name ?? "Error" } : null,
  });
} catch (error) {
  console.error(`Semgrep fixture evidence unavailable: ${error instanceof Error ? error.constructor.name : "Error"}`);
  process.exit(2);
}

if (failure) throw failure;

console.log(`PASS: ${cases.length} fixtures Semgrep architectural testées.`);
