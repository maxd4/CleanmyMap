import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

const paths = {
  sectionsRegistry: path.join(
    repositoryRoot,
    "apps/web/src/lib/sections-registry/index.ts",
  ),
  unifiedSource: path.join(
    repositoryRoot,
    "apps/web/src/lib/actions/unified-source.ts",
  ),
  unifiedSourceIndex: path.join(
    repositoryRoot,
    "apps/web/src/lib/actions/unified-source/index.ts",
  ),
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
  "RubriqueAvailability",
  "RubriqueCategory",
  "RubriqueDefinition",
  "RubriqueImplementation",
  "RubriqueKind",
  "RubriqueSpaceId",
  "Rubrique",
  "SectionRubrique",
  "SectionRubriqueDefinition",
  "SectionId",
  "FinalizedSectionId",
  "VisibleFinalizedSectionId",
  "isRubriqueVisible",
  "getVisibleRubriquesByCategory",
  "getVisibleRubriquesBySpace",
  "normalizeSectionId",
  "getSectionRubriqueById",
  "isSectionRouteEnabled",
  "getSectionRouteParams",
  "getPendingSectionRubriques",
];

const unifiedSourceApi = [
  "UnifiedActionContractsParams",
  "UnifiedSourceHealth",
  "TrashSpotterSpotRow",
  "UnifiedActionSourceLoadResult",
  "UnifiedContractOrigin",
  "UnifiedContractCandidate",
  "normalizeExternalActionImport",
  "mapActionStatusToSpotStatuses",
  "toActionContract",
  "toCanonicalSpotContract",
  "parseEntityTypesParam",
  "fetchUnifiedActionContracts",
  "buildUnifiedActionContracts",
  "filterContractsByViewport",
];

const violations = [];

for (const relativePath of removedBarrels) {
  if (fs.existsSync(path.join(repositoryRoot, relativePath))) {
    violations.push(`removed barrel still exists: ${relativePath}`);
  }
}

for (const relativePath of [
  "apps/web/src/lib/sections-registry/index.ts",
  "apps/web/src/lib/actions/unified-source.ts",
  "apps/web/src/lib/actions/unified-source/index.ts",
]) {
  const source = fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
  if (/\bexport\s+\*/.test(source)) {
    violations.push(`${relativePath} must not contain export *`);
  }
}

const sectionsSource = fs.readFileSync(paths.sectionsRegistry, "utf8");
for (const symbol of sectionsRegistryApi) {
  if (!new RegExp(`\\b${symbol}\\b`).test(sectionsSource)) {
    violations.push(`sections-registry public API is missing ${symbol}`);
  }
}

for (const [label, sourcePath] of [
  ["unified-source.ts", paths.unifiedSource],
  ["unified-source/index.ts", paths.unifiedSourceIndex],
]) {
  const source = fs.readFileSync(sourcePath, "utf8");
  for (const symbol of unifiedSourceApi) {
    if (!new RegExp(`\\b${symbol}\\b`).test(source)) {
      violations.push(`${label} public API is missing ${symbol}`);
    }
  }
}

if (violations.length > 0) {
  console.error("9C public facade boundary check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    "9C public facade boundary check passed: removed barrels are absent and kept APIs are explicit.",
  );
}
