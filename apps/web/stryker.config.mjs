/**
 * Mutation scope volontairement borné aux fonctions pures critiques.
 * formalities-workflow.ts et route-operational-budget.ts sont laissés hors
 * périmètre : Stryker 10.0.0 ne génère pas de code instrumenté fiable pour
 * leur syntaxe TypeScript 7 générique dans le runner Babel actuel.
 * Le gate de ratchet est porté par scripts/checks/check-mutation.mjs.
 */
const strykerConfig = {
  mutate: [
    "src/lib/actions/formalities-qualification.ts:349-425",
    "src/lib/actions/formalities-qualification.ts:438-458",
    "src/lib/actions/permissions.ts:22-104",
    "src/lib/actions/impact-calculators.ts:70-205",
    "src/lib/actions/action-update-status.ts:15-28",
  ],
  testFiles: [
    "src/lib/actions/formalities-qualification.test.ts",
    "src/lib/actions/permissions.test.ts",
    "src/lib/actions/impact-calculators.test.ts",
    "src/lib/actions/action-update-status.test.ts",
  ],
  testRunner: "vitest",
  vitest: {
    configFile: "vitest.config.ts",
    dir: ".",
    related: true,
  },
  coverageAnalysis: "perTest",
  concurrency: 2,
  timeoutMS: 30000,
  timeoutFactor: 2,
  thresholds: {
    high: 0,
    low: 0,
    break: 0,
  },
  reporters: ["clear-text", "json"],
  jsonReporter: {
    fileName: "../../artifacts/quality-hardening/mutation/stryker-report.json",
  },
};

export default strykerConfig;
