import {
  DYNAMIC_ALIASES_HANDLED_INSIDE_ROUTE,
  extractDocumentedAccessModes,
} from "./pages-site-route-drift-routes.mjs";

function groupIndexEntriesByRoute(entries) {
  const grouped = new Map();

  for (const entry of entries) {
    const routeEntries = grouped.get(entry.route) ?? [];
    routeEntries.push(entry);
    grouped.set(entry.route, routeEntries);
  }

  return grouped;
}

function documentedModesFor(value, fallback = []) {
  if (Array.isArray(value?.documentedAccessModes)) {
    return value.documentedAccessModes;
  }

  return extractDocumentedAccessModes(value?.pageType ?? fallback);
}

function isCanonicalIndexEntry(entry) {
  return (
    !entry.isAliasOrRedirect &&
    !entry.isAwaitingClassification &&
    !entry.isGenericDynamicPattern &&
    !DYNAMIC_ALIASES_HANDLED_INSIDE_ROUTE.has(entry.route)
  );
}

function accessMismatch({ route, source, expected, modes }) {
  const conflicts = modes.filter((mode) => mode !== expected);
  if (modes.includes(expected) && conflicts.length === 0) {
    return null;
  }

  return {
    route,
    source,
    expected,
    documented: modes,
  };
}

export function validateDocumentedAccessCoherence({
  indexEntries,
  routeDocs,
  runtimeAccessByRoute,
  unclassifiedSectionRoutes = [],
  unresolvedRoutes = [],
}) {
  const documentedAccessContradictions = [];
  const canonicalEntries = indexEntries.filter(isCanonicalIndexEntry);

  for (const [route, expected] of runtimeAccessByRoute) {
    for (const entry of canonicalEntries.filter((item) => item.route === route)) {
      const mismatch = accessMismatch({
        route,
        source: "INDEX.md",
        expected,
        modes: documentedModesFor(entry),
      });
      if (mismatch) {
        documentedAccessContradictions.push({ ...mismatch, line: entry.line });
      }
    }

    for (const doc of routeDocs.filter(
      (item) => item.route === route && !item.isAlias && !item.isGenericDynamicPattern,
    )) {
      if (!Array.isArray(doc.documentedAccessModes) || doc.documentedAccessModes.length === 0) {
        // A fiche may omit an access assertion. This check detects an
        // explicit contradiction; it does not invent a public fallback.
        continue;
      }

      const mismatch = accessMismatch({
        route,
        source: doc.readme,
        expected,
        modes: doc.documentedAccessModes,
      });
      if (mismatch) {
        documentedAccessContradictions.push(mismatch);
      }
    }
  }

  const runtimeAccessErrors = [
    ...unclassifiedSectionRoutes.map(
      (route) => `${route} : anonymousPresentation absent du registre runtime`,
    ),
    ...unresolvedRoutes.map(
      ({ route, reason }) => `${route} : ${reason}`,
    ),
  ];

  return { documentedAccessContradictions, runtimeAccessErrors };
}

export function validateRoutePackageLayout({
  indexEntries,
  routeDocs,
  packages,
  runtimeFamilyByRoute = new Map(),
  manifestDocKeys = new Set(),
}) {
  const indexEntriesByRoute = groupIndexEntriesByRoute(indexEntries);
  const routeDocsByRoute = new Map();
  const canonicalEntries = indexEntries.filter(isCanonicalIndexEntry);
  const packageReferences = new Map();
  const packageRoutes = new Map();
  const duplicateIndexRoutes = [];
  const canonicalRoutesWithMultipleDocs = [];
  const canonicalRoutesMissingPackage = [];
  const aliasesWithCanonicalPackages = [];
  const genericPatternsWithCanonicalPackages = [];
  const orphanPagePackages = [];
  const packagesWithMultipleCanonicalRoutes = [];
  const packagesWithInvalidCanonicalReadmes = [];
  const packageIdentityMismatches = [];
  const canonicalRoutesWithWrongPackageFamily = [];
  const invalidCanonicalReadmeLocations = [];

  for (const [route, entries] of indexEntriesByRoute) {
    if (entries.length > 1) {
      duplicateIndexRoutes.push({ route, lines: entries.map((entry) => entry.line) });
    }
  }

  for (const doc of routeDocs) {
    const docs = routeDocsByRoute.get(doc.route) ?? [];
    docs.push(doc);
    routeDocsByRoute.set(doc.route, docs);

    if (doc.packageKey) {
      const references = packageReferences.get(doc.packageKey) ?? [];
      references.push(doc.route);
      packageReferences.set(doc.packageKey, references);
    }
  }

  for (const entry of canonicalEntries) {
    const docs = routeDocsByRoute.get(entry.route) ?? [];
    const canonicalDocs = docs.filter(
      (doc) => !doc.isAlias && !doc.isGenericDynamicPattern,
    );

    if (canonicalDocs.length === 0) {
      canonicalRoutesMissingPackage.push({ route: entry.route });
      continue;
    }

    if (canonicalDocs.length > 1) {
      canonicalRoutesWithMultipleDocs.push({
        route: entry.route,
        readmes: canonicalDocs.map((doc) => doc.readme),
      });
    }

    for (const doc of canonicalDocs) {
      if (!doc.packageKey) {
        invalidCanonicalReadmeLocations.push({ route: entry.route, readme: doc.readme });
        continue;
      }

      const packageRoutesForDoc = packageRoutes.get(doc.packageKey) ?? [];
      packageRoutesForDoc.push(entry.route);
      packageRoutes.set(doc.packageKey, packageRoutesForDoc);
    }
  }

  for (const entry of indexEntries) {
    if (!entry.readmePath) {
      continue;
    }

    const docs = routeDocsByRoute.get(entry.route) ?? [];
    const hasPackage = docs.some((doc) => Boolean(doc.packageKey));
    if (entry.isAliasOrRedirect && hasPackage) {
      aliasesWithCanonicalPackages.push({ route: entry.route });
    }
    if (entry.isGenericDynamicPattern && hasPackage) {
      genericPatternsWithCanonicalPackages.push({ route: entry.route });
    }
  }

  for (const packageEntry of packages) {
    const linkedRoutes = [...new Set(packageReferences.get(packageEntry.key) ?? [])];
    const canonicalRoutes = [...new Set(packageRoutes.get(packageEntry.key) ?? [])];
    const readmes = packageEntry.canonicalReadmes;

    if (readmes.length !== 1) {
      packagesWithInvalidCanonicalReadmes.push({
        package: packageEntry.path,
        canonicalReadmes: readmes,
      });
    }

    if (readmes.length === 1 && readmes[0] !== `${packageEntry.name}-README.md`) {
      packageIdentityMismatches.push({
        package: packageEntry.path,
        expected: `${packageEntry.name}-README.md`,
        actual: readmes[0],
      });
    }

    if (linkedRoutes.length === 0) {
      orphanPagePackages.push({
        package: packageEntry.path,
        reason:
          readmes.length === 0
            ? "aucune fiche *-README.md canonique"
            : "aucune route canonique de INDEX.md ne pointe vers la fiche",
      });
      continue;
    }

    if (canonicalRoutes.length > 1) {
      packagesWithMultipleCanonicalRoutes.push({
        package: packageEntry.path,
        routes: canonicalRoutes,
      });
    }

    for (const route of canonicalRoutes) {
      const expectedFamily = runtimeFamilyByRoute.get(route);
      if (expectedFamily && packageEntry.family !== expectedFamily) {
        canonicalRoutesWithWrongPackageFamily.push({
          route,
          package: packageEntry.path,
          expectedFamily,
          actualFamily: packageEntry.family,
        });
      }
    }
  }

  const unknownPackageFamilies = packages
    .filter((entry) => !manifestDocKeys.has(entry.family))
    .map((entry) => entry.path);

  return {
    duplicateIndexRoutes,
    canonicalRoutesWithMultipleDocs,
    canonicalRoutesMissingPackage,
    aliasesWithCanonicalPackages,
    genericPatternsWithCanonicalPackages,
    orphanPagePackages,
    packagesWithMultipleCanonicalRoutes,
    packagesWithInvalidCanonicalReadmes,
    packageIdentityMismatches,
    canonicalRoutesWithWrongPackageFamily,
    invalidCanonicalReadmeLocations,
    unknownPackageFamilies,
  };
}

function toMarkdownList(items, emptyLabel = "Aucun.") {
  if (items.length === 0) {
    return emptyLabel;
  }

  return items.map((item) => `- \`${item}\``).join("\n");
}

function toMarkdownJsonList(items, emptyLabel = "Aucun.") {
  if (items.length === 0) {
    return emptyLabel;
  }

  return items.map((item) => `- \`${JSON.stringify(item)}\``).join("\n");
}

export function hasPagesSiteRouteDrift(report) {
  return [
    report.codeRoutesMissingFromIndex,
    report.sectionRoutesMissingFromIndex,
    report.indexRoutesMissingFromRuntime,
    report.indexRoutesMissingCanonicalDoc,
    report.incompleteNuclei,
    report.indexReadmeTargetsMissing,
    report.indexReadmeTargetsOutsideRoutes,
    report.pageFamilyContractErrors,
    report.runtimeFamilyErrors,
    report.duplicateIndexRoutes,
    report.canonicalRoutesWithMultipleDocs,
    report.canonicalRoutesMissingPackage,
    report.aliasesWithCanonicalPackages,
    report.genericPatternsWithCanonicalPackages,
    report.orphanPagePackages,
    report.packagesWithMultipleCanonicalRoutes,
    report.packagesWithInvalidCanonicalReadmes,
    report.packageIdentityMismatches,
    report.canonicalRoutesWithWrongPackageFamily,
    report.invalidCanonicalReadmeLocations,
    report.unknownPackageFamilies,
    report.unexpectedFamilyDirectories,
    report.documentedAccessContradictions,
    report.runtimeAccessErrors,
    report.canonicalReadmesWithScopePlaceholder,
  ].some((items) => items.length > 0);
}

export function renderPagesSiteRouteDriftMarkdown(report) {
  const incompleteNuclei =
    report.incompleteNuclei.length === 0
      ? "Aucun."
      : report.incompleteNuclei
          .map(
            (entry) =>
              `- \`${entry.route}\` — \`${entry.readme}\`\n` +
              entry.missing.map((name) => `  - manque \`${name}\``).join("\n"),
          )
          .join("\n");

  return `# Audit de dérive \`pages_site\`

Généré : \`${report.generatedAt}\`

## Comptes

- routes \`page.tsx\` : ${report.counts.codeRoutes}
- routes de sections dans le registre : ${report.counts.sectionRoutes}
- routes inventoriées dans \`INDEX.md\` : ${report.counts.indexRoutes}
- fiches canoniques : ${report.counts.canonicalRouteDocs}
- packages de pages détectés : ${report.counts.pagePackages}

## Routes code absentes de l'index

${toMarkdownList(report.codeRoutesMissingFromIndex)}

## Routes de sections absentes de l'index

${toMarkdownList(report.sectionRoutesMissingFromIndex)}

## Routes d'index sans route runtime correspondante

${toMarkdownList(report.indexRoutesMissingFromRuntime)}

## Routes d'index sans fiche canonique dédiée

${toMarkdownList(report.indexRoutesMissingCanonicalDoc)}

## Duplications de routes ou fiches

${toMarkdownJsonList(report.duplicateIndexRoutes)}

${toMarkdownJsonList(report.canonicalRoutesWithMultipleDocs)}

## Packages invalides ou orphelins

${toMarkdownJsonList(report.canonicalRoutesMissingPackage)}

${toMarkdownJsonList(report.orphanPagePackages)}

${toMarkdownJsonList(report.packagesWithInvalidCanonicalReadmes)}

${toMarkdownJsonList(report.packageIdentityMismatches)}

## Familles

### Routes dans une mauvaise famille runtime

${toMarkdownJsonList(report.canonicalRoutesWithWrongPackageFamily)}

### Familles de packages inconnues

${toMarkdownList(report.unknownPackageFamilies)}

### Dossiers de familles inconnus

${toMarkdownList(report.unexpectedFamilyDirectories)}

### Contrat manifeste / documentation

${toMarkdownList(report.pageFamilyContractErrors)}

### Resolver runtime

${toMarkdownList(report.runtimeFamilyErrors)}

## Accès documentaire vs runtime

### Contradictions documentées

${toMarkdownJsonList(report.documentedAccessContradictions)}

### Contrat runtime indéterminé ou incomplet

${toMarkdownList(report.runtimeAccessErrors)}

## Placeholders de métadonnées CURRENT

${toMarkdownJsonList(report.canonicalReadmesWithScopePlaceholder)}

## Packages autonomes interdits

### Alias avec package canonique

${toMarkdownJsonList(report.aliasesWithCanonicalPackages)}

### Pattern dynamique générique avec package canonique

${toMarkdownJsonList(report.genericPatternsWithCanonicalPackages)}

### Un package pour plusieurs routes canoniques

${toMarkdownJsonList(report.packagesWithMultipleCanonicalRoutes)}

### Fiche canonique hors package

${toMarkdownJsonList(report.invalidCanonicalReadmeLocations)}

## Liens INDEX invalides

### Fiche absente

${toMarkdownJsonList(report.indexReadmeTargetsMissing)}

### Fiche hors de routes/

${toMarkdownJsonList(report.indexReadmeTargetsOutsideRoutes)}

## Noyaux documentaires incomplets

${incompleteNuclei}
`;
}
