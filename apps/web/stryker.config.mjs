/**
 * Mutation scope volontairement borné aux fonctions pures critiques.
 * formalities-workflow.ts et route-operational-budget.ts sont laissés hors
 * périmètre : les modules à syntaxe TypeScript 7 générique restent hors
 * périmètre tant que leur instrumentation fiable n'est pas démontrée pour
 * leur syntaxe TypeScript 7 générique dans le runner Babel actuel.
 * Le gate de ratchet est porté par scripts/checks/check-mutation.mjs.
 */
const strykerConfig = {
  mutate: [
    "src/lib/actions/formalities/qualification.ts:353-455",
    "src/lib/actions/permissions.ts:22-128",
    "src/lib/actions/impact-calculators.ts:114-243",
    "src/lib/actions/action-update-status.ts:15-28",
  ],
  testFiles: [
    "src/lib/actions/formalities/qualification.test.ts",
    "src/lib/actions/permissions.test.ts",
    "src/lib/actions/impact-calculators.test.ts",
    "src/lib/actions/impact-calculators.mass-provenance.test.ts",
    "src/lib/actions/action-update-status.test.ts",
  ],
  testRunner: "vitest",
  vitest: {
    configFile: "vitest.config.mts",
    dir: ".",
    related: true,
  },
  coverageAnalysis: "perTest",
  // Vercel project files are not test inputs and cannot be copied from a linked candidate.
  ignorePatterns: [".vercel"],
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
