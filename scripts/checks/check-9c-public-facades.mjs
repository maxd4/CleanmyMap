import path from "node:path";
import process from "node:process";
import { createRepositoryView, parseRepositoryRef } from "./repository-view.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

const paths = {
  sectionsRegistry: "apps/web/src/lib/sections-registry/index.ts",
  unifiedSource: "apps/web/src/lib/actions/unified-source.ts",
  unifiedSourceIndex: "apps/web/src/lib/actions/unified-source/index.ts",
};

const removedBarrels = [
  "apps/web/src/lib/events/index.ts",
  "apps/web/src/lib/rate-limit/index.ts",
  "apps/web/src/lib/environmental-impact-estimator/service.ts",
  "apps/web/src/lib/environmental-impact-estimator/services/index.ts",
  "apps/web/src/components/seo/structured-data/index.ts",
];

const sectionsRegistryApi = [
  "RUBRIQUE_CATEGORIES",
  "RUBRIQUE_REGISTRY",
  "LocalizedText",
  "LocalizedKeywords",
  "Rubrique",
  "SectionRubriqueDefinition",
  "VisibleFinalizedSectionId",
  "getVisibleRubriquesByCategory",
  "getSectionRubriqueById",
  "isSectionRouteEnabled",
  "getSectionRouteParams",
];

const unifiedSourceFacadeApi = [
  "UnifiedSourceHealth",
  "normalizeExternalActionImport",
  "toCanonicalSpotContract",
  "TrashSpotterSpotRow",
  "parseEntityTypesParam",
  "fetchUnifiedActionContracts",
];

const unifiedSourceIndexApi = [
  "UnifiedSourceHealth",
  "parseEntityTypesParam",
  "fetchUnifiedActionContracts",
];

const unifiedSourceFacades = [
  ["unified-source.ts", paths.unifiedSource, unifiedSourceFacadeApi],
  ["unified-source/index.ts", paths.unifiedSourceIndex, unifiedSourceIndexApi],
];

export function findPublicFacadeViolations(view) {
  const violations = [];

  for (const relativePath of removedBarrels) {
    if (view.exists(relativePath)) {
      violations.push(`removed barrel still exists: ${relativePath}`);
    }
  }

  for (const relativePath of Object.values(paths)) {
    const source = view.readText(relativePath);
    if (/\bexport\s+\*/.test(source)) {
      violations.push(`${relativePath} must not contain export *`);
    }
  }

  const sectionsSource = view.readText(paths.sectionsRegistry);
  for (const symbol of sectionsRegistryApi) {
    if (!new RegExp(`\\b${symbol}\\b`).test(sectionsSource)) {
      violations.push(`sections-registry public API is missing ${symbol}`);
    }
  }

  for (const [label, sourcePath, api] of unifiedSourceFacades) {
    const source = view.readText(sourcePath);
    for (const symbol of api) {
      if (!new RegExp(`\\b${symbol}\\b`).test(source)) {
        violations.push(`${label} public API is missing ${symbol}`);
      }
    }
  }

  return violations;
}

function main() {
  const ref = parseRepositoryRef();
  const view = createRepositoryView({ root: repositoryRoot, ref });
  const violations = findPublicFacadeViolations(view);
  if (violations.length > 0) {
  console.error("9C public facade boundary check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
    return;
  }
  console.log(`9C public facade boundary check passed${ref ? ` for ref ${ref}` : ""}: removed barrels are absent and kept APIs are explicit.`);
}

main();
