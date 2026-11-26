// Canonical E2E project catalog shared by select-e2e-sql-plan.mjs and
// e2e/run-github-actions-persistent.mjs.

export const CI_EXECUTABLE_PROJECTS = Object.freeze([
  {
    name: "local public",
    requiresAuth: false,
    specPatterns: [
      /^e2e\/(?:smoke-public|reports-public|spogomi-navigation|ui-consistency-geometry|footer-responsive-public|navigation-ribbon-variants|network-demand-public|public-first-campaign|public-interactions-campaign-3a|public-locale-explorer-campaign-3a1|public-campaign-3b|security-boundaries|accessibility-lighthouse-controls|personal-ai-public|annuaire-public-cleanliness|page-layout-fluid)\.(?:spec|test)\.ts$/,
    ],
    dependencyPrefixes: [
      "apps/web/src/lib/partners/",
      "apps/web/src/components/sections/rubriques/annuaire/",
      "apps/web/src/components/spogomi/",
      "apps/web/src/app/(app)/spogomi/",
    ],
  },
  {
    name: "action sharing",
    requiresAuth: true,
    specPatterns: [
      /^e2e\/(?:action-sharing|action-finalization|action-route-reference-images|route-reference-action-sharing)\.spec\.ts$/,
    ],
    dependencyPrefixes: [
      "apps/web/src/lib/actions/",
      "apps/web/src/app/api/actions/",
    ],
  },
  {
    name: "authenticated campaign",
    requiresAuth: true,
    specPatterns: [
      /^e2e\/authenticated-(?:campaign|spogomi)\.(?:spec|test)\.ts$/,
    ],
    dependencyPrefixes: [
      "apps/web/src/lib/spogomi/",
      "apps/web/src/app/api/spogomi/",
      "apps/web/src/app/api/gamification/spogomi/",
      "apps/web/src/components/spogomi/",
      "apps/web/src/app/(app)/spogomi/",
      "apps/web/src/app/(app)/dashboard/spogomi/",
    ],
  },
  {
    name: "signalement campaign 2",
    requiresAuth: true,
    specPatterns: [
      /^e2e\/signalement-campaign-2\.spec\.ts$/,
    ],
    dependencyPrefixes: [
      "apps/web/src/lib/reports/",
      "apps/web/src/app/api/reports/",
      "apps/web/src/lib/signalements/",
      "apps/web/src/app/api/signalements/",
    ],
  },
  {
    name: "personal AI authenticated",
    requiresAuth: true,
    specPatterns: [
      /^e2e\/personal-ai-authenticated\.spec\.ts$/,
    ],
    dependencyPrefixes: [
      "apps/web/src/lib/personal-ai/",
      "apps/web/src/app/api/personal-ai/",
    ],
  },
  {
    name: "settings authenticated",
    requiresAuth: true,
    specPatterns: [
      /^e2e\/settings-canonical\.spec\.ts$/,
    ],
    dependencyPrefixes: [],
  },
  {
    name: "homepage chromium",
    requiresAuth: false,
    specPatterns: [
      /^e2e\/homepage-reveal\.spec\.ts$/,
    ],
    dependencyPrefixes: [],
  },
]);

// Explicitly reserved for local/manual validation runs (not part of the
// ephemeral CI persistent lane).
export const LOCAL_ONLY_E2E_SPECS = Object.freeze([
  /^e2e\/local-authenticated\.spec\.ts$/,
  /^e2e\/dashboard-clerk-validation\.(?:spec|test)\.ts$/,
  /^e2e\/messagerie-information-architecture\.spec\.ts$/,
  /^e2e\/onboarding-progressive\.spec\.ts$/,
  /^e2e\/pdf-export-browser-report\.(?:spec|test)\.ts$/,
  /^e2e\/route-additionality\.spec\.ts$/,
  /^e2e\/route-campaign-3c\.spec\.ts$/,
  /^e2e\/soft-gate-authentication\.spec\.ts$/,
]);

export const ALL_CI_E2E_PROJECTS = Object.freeze(
  CI_EXECUTABLE_PROJECTS.map((project) => project.name),
);

export function matchCiProjectsForFile(filePath) {
  const matched = [];
  for (const project of CI_EXECUTABLE_PROJECTS) {
    const matchesSpec = project.specPatterns.some((pattern) => pattern.test(filePath));
    const matchesDep = project.dependencyPrefixes.some((prefix) => filePath.startsWith(prefix));
    if (matchesSpec || matchesDep) {
      matched.push(project.name);
    }
  }
  return matched;
}

export function isLocalOnlyE2eSpec(filePath) {
  return LOCAL_ONLY_E2E_SPECS.some((pattern) => pattern.test(filePath));
}
