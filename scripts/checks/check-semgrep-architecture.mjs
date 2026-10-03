import { parseSemgrepJson, runSemgrep } from "../security/semgrep/run-semgrep.mjs";
import { resolveCandidateSha, writeQualityEvidence } from "./quality-evidence.mjs";

const result = runSemgrep(
  ["apps/web/src", "apps/mobile"],
  {
    errorOnFindings: true,
    excludes: ["*.test.ts", "*.test.tsx", "*.test.js", "*.test.mjs", "*.spec.ts", "*.spec.tsx", "*.spec.js", "*.spec.mjs"],
  },
);
const report = parseSemgrepJson(result.stdout);
const blockingFindings = Array.isArray(report?.results) ? report.results.length : null;
const status = result.error === "HOST_ENVIRONMENT"
  ? "NOT_RUN"
  : result.status === 0
    ? "PASS"
    : "FAIL";
try {
  writeQualityEvidence({
    repositoryRoot: process.cwd(),
    evidenceRoot: "artifacts/security-evidence",
    fileKey: "semgrep-architectural",
    gate: "semgrep-architectural",
    candidateSha: resolveCandidateSha(process.cwd()),
    candidateRef: process.env.CANDIDATE_SHA ?? "HEAD",
    status,
    findings: blockingFindings,
    metrics: { blockingFindings },
  });
} catch (error) {
  console.error(`Semgrep evidence unavailable: ${error instanceof Error ? error.constructor.name : "Error"}`);
  process.exit(2);
}

if (result.error === "HOST_ENVIRONMENT") {
  console.error(`HOST_ENVIRONMENT: ${result.stderr}`);
  process.exit(1);
}

if (result.status !== 0) {
  if (report?.results?.length) {
    for (const finding of report.results) {
      console.error(`${finding.path}:${finding.start?.line ?? "?"} ${finding.check_id}: ${finding.extra?.message ?? "finding"}`);
    }
  } else {
    console.error(result.stderr || result.stdout || `Semgrep a échoué (${result.status}).`);
  }
  process.exit(result.status ?? 1);
}

console.log("PASS: Semgrep architectural sans finding sur les surfaces web/mobile.");
