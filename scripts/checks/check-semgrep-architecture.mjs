import { parseSemgrepJson, runSemgrep } from "../security/semgrep/run-semgrep.mjs";

const result = runSemgrep(
  ["apps/web/src", "apps/mobile"],
  {
    errorOnFindings: true,
    excludes: ["*.test.ts", "*.test.tsx", "*.test.js", "*.test.mjs", "*.spec.ts", "*.spec.tsx", "*.spec.js", "*.spec.mjs"],
  },
);

if (result.error === "HOST_ENVIRONMENT") {
  console.error(`HOST_ENVIRONMENT: ${result.stderr}`);
  process.exit(1);
}

if (result.status !== 0) {
  const report = parseSemgrepJson(result.stdout);
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
