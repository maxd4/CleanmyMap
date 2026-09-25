#!/usr/bin/env node

// Compatibilité historique : le rapport canonique est analyze-heavy-files.mjs.
// Aucun seuil global ne doit survivre ici.
import { analyzeRepository } from "./analyze-heavy-files.mjs";

const report = analyzeRepository();
const unexpected = report.baselineFindings.filter((finding) =>
  /^(?:NEW_HARD|GROWTH|NEW_REVIEW|REVIEW_GROWTH|STALE|STALE_REVIEW|MISSING_REVIEW|INVALID)/.test(finding),
);

console.log(`[top-heavy] RADAR_ARCHITECTURAL=${report.architectural.length}`);
console.log(`[top-heavy] TESTS_VOLUMINEUX=${report.tests.length}`);
console.log(`[top-heavy] GENERATED=${report.generated.length}`);
if (unexpected.length > 0) {
  console.error(`[top-heavy] ${unexpected.length} finding(s):`);
  for (const finding of unexpected) console.error(` - ${finding}`);
  process.exitCode = 1;
} else {
  console.log("[top-heavy] PASS: ratchets par KIND respectés.");
}
