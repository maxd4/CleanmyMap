import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { findBrokenCanonicalMarkdownLinks, loadCanonicalRouteDocs } from "./pages-site-route-drift-documents.mjs";

import {
  extractIndexEntries,
  extractRuntimeSurfaceAccess,
  hasExactCurrentScopePlaceholder,
  validateDocumentedAccessCoherence,
  validateRoutePackageLayout,
} from "./check-pages-site-route-drift.mjs";

function entry(route, readmePath, overrides = {}) {
  return {
    route,
    pageType: "public-visible",
    familyLabel: "agir",
    readmePath,
    isAliasOrRedirect: false,
    isAwaitingClassification: false,
    isGenericDynamicPattern: false,
    line: 1,
    ...overrides,
  };
}

test("INDEX conserve les doublons de route pour que le strict puisse les refuser", () => {
  const entries = extractIndexEntries(`
| Route | Fiche | Type |
|---|---|---|
| \`/same\` | [Une](./routes/01-a/page/page-README.md) | public |
| \`/same\` | [Deux](./routes/01-b/page/page-README.md) | public |
`);

  assert.equal(entries.filter((item) => item.route === "/same").length, 2);
});

test("le contrôle cible uniquement le placeholder Scope exact des fiches CURRENT", () => {
  assert.equal(
    hasExactCurrentScopePlaceholder("- **Scope** : à corriger"),
    true,
  );
  assert.equal(
    hasExactCurrentScopePlaceholder("- **Scope** : scope documenté\n- À corriger dans le plan"),
    false,
  );
  assert.equal(
    hasExactCurrentScopePlaceholder("- **Objectif** : à corriger"),
    false,
  );
});

test("les packages canoniques sont uniques, liés et dans la famille runtime", () => {
  const indexEntries = [entry("/canonical", "./routes/02-agir/canonical/canonical-README.md")];
  const result = validateRoutePackageLayout({
    indexEntries,
    routeDocs: [
      {
        route: "/canonical",
        readme: "documentation/pages_site/routes/02-agir/canonical/canonical-README.md",
        packageKey: "02-agir/canonical",
        isAlias: false,
        isGenericDynamicPattern: false,
      },
    ],
    packages: [
      {
        key: "02-agir/canonical",
        family: "02-agir",
        name: "canonical",
        path: "documentation/pages_site/routes/02-agir/canonical",
        canonicalReadmes: ["canonical-README.md"],
      },
    ],
    runtimeFamilyByRoute: new Map([["/canonical", "02-agir"]]),
    manifestDocKeys: new Set(["02-agir"]),
  });

  assert.deepEqual(result.orphanPagePackages, []);
  assert.deepEqual(result.canonicalRoutesWithWrongPackageFamily, []);
  assert.deepEqual(result.canonicalRoutesMissingPackage, []);
});

test("un package non lié, un alias ou le pattern générique sont des dérives strictes", () => {
  const indexEntries = [
    entry("/alias", "./routes/02-agir/alias/alias-README.md", {
      isAliasOrRedirect: true,
    }),
    entry("/sections/[sectionId]", "./routes/02-agir/section/section-README.md", {
      isGenericDynamicPattern: true,
    }),
  ];
  const result = validateRoutePackageLayout({
    indexEntries,
    routeDocs: [
      {
        route: "/alias",
        readme: "documentation/pages_site/routes/02-agir/alias/alias-README.md",
        packageKey: "02-agir/alias",
        isAlias: true,
        isGenericDynamicPattern: false,
      },
      {
        route: "/sections/[sectionId]",
        readme: "documentation/pages_site/routes/02-agir/section/section-README.md",
        packageKey: "02-agir/section",
        isAlias: false,
        isGenericDynamicPattern: true,
      },
    ],
    packages: [
      {
        key: "02-agir/alias",
        family: "02-agir",
        name: "alias",
        path: "documentation/pages_site/routes/02-agir/alias",
        canonicalReadmes: ["alias-README.md"],
      },
      {
        key: "02-agir/section",
        family: "02-agir",
        name: "section",
        path: "documentation/pages_site/routes/02-agir/section",
        canonicalReadmes: ["section-README.md"],
      },
      {
        key: "04-reseau-discussions/orphan",
        family: "04-reseau-discussions",
        name: "orphan",
        path: "documentation/pages_site/routes/04-reseau-discussions/orphan",
        canonicalReadmes: ["orphan-README.md"],
      },
    ],
    manifestDocKeys: new Set(["02-agir", "04-reseau-discussions"]),
  });

  assert.deepEqual(result.aliasesWithCanonicalPackages, [{ route: "/alias" }]);
  assert.deepEqual(result.genericPatternsWithCanonicalPackages, [
    { route: "/sections/[sectionId]" },
  ]);
  assert.deepEqual(result.orphanPagePackages, [
    {
      package: "documentation/pages_site/routes/04-reseau-discussions/orphan",
      reason: "aucune route canonique de INDEX.md ne pointe vers la fiche",
    },
  ]);
});

test("un package mal placé est comparé à resolvePageFamily via le contrat fourni", () => {
  const result = validateRoutePackageLayout({
    indexEntries: [entry("/profil/impact", "./routes/03-cartographie-impact/profil-impact/profil-impact-README.md")],
    routeDocs: [
      {
        route: "/profil/impact",
        readme: "documentation/pages_site/routes/03-cartographie-impact/profil-impact/profil-impact-README.md",
        packageKey: "03-cartographie-impact/profil-impact",
        isAlias: false,
        isGenericDynamicPattern: false,
      },
    ],
    packages: [
      {
        key: "03-cartographie-impact/profil-impact",
        family: "03-cartographie-impact",
        name: "profil-impact",
        path: "documentation/pages_site/routes/03-cartographie-impact/profil-impact",
        canonicalReadmes: ["profil-impact-README.md"],
      },
    ],
    runtimeFamilyByRoute: new Map([["/profil/impact", "01-accueil-pilotage"]]),
    manifestDocKeys: new Set(["01-accueil-pilotage", "03-cartographie-impact"]),
  });

  assert.deepEqual(result.canonicalRoutesWithWrongPackageFamily, [
    {
      route: "/profil/impact",
      package: "documentation/pages_site/routes/03-cartographie-impact/profil-impact",
      expectedFamily: "01-accueil-pilotage",
      actualFamily: "03-cartographie-impact",
    },
  ]);
});

function accessDoc(route, documentedAccessModes) {
  return {
    route,
    readme: `documentation/pages_site/routes/family/${route.slice(1).replaceAll("/", "-")}/${route.slice(1).replaceAll("/", "-")}-README.md`,
    isAlias: false,
    isGenericDynamicPattern: false,
    documentedAccessModes,
  };
}

test("une fiche et l'INDEX cohérents avec le runtime passent", () => {
  const indexEntries = [
    entry("/actions/map", "./routes/03-cartographie-impact/actions-map/actions-map-README.md"),
  ];
  const result = validateDocumentedAccessCoherence({
    indexEntries,
    routeDocs: [accessDoc("/actions/map", ["public-visible"])],
    runtimeAccessByRoute: new Map([["/actions/map", "public-visible"]]),
  });

  assert.deepEqual(result.documentedAccessContradictions, []);
  assert.deepEqual(result.runtimeAccessErrors, []);
});

test("une page publique documentée comme protégée est une dérive", () => {
  const indexEntries = [
    entry("/actions/map", "./routes/03-cartographie-impact/actions-map/actions-map-README.md", {
      pageType: "protected",
    }),
  ];
  const result = validateDocumentedAccessCoherence({
    indexEntries,
    routeDocs: [accessDoc("/actions/map", ["protected"])],
    runtimeAccessByRoute: new Map([["/actions/map", "public-visible"]]),
  });

  assert.equal(result.documentedAccessContradictions.length, 2);
});

test("une page protégée documentée comme publique est une dérive", () => {
  const indexEntries = [
    entry("/dashboard", "./routes/01-accueil-pilotage/dashboard/dashboard-README.md"),
  ];
  const result = validateDocumentedAccessCoherence({
    indexEntries,
    routeDocs: [accessDoc("/dashboard", ["public-visible"])],
    runtimeAccessByRoute: new Map([["/dashboard", "protected"]]),
  });

  assert.equal(result.documentedAccessContradictions.length, 2);
});

test("les sections utilisent leur présentation anonyme explicite sans fallback public", () => {
  const runtime = extractRuntimeSurfaceAccess({
    proxyContent: `
      export const PROTECTED_APP_PAGE_ROUTE_PREFIXES = ["/dashboard"] as const;
      export const CLERK_CONTEXT_ROUTE_PREFIXES = [] as const;
      export const config = { matcher: ["/dashboard(.*)"] };
    `,
    sectionRegistryContent: `
      { kind: "section", anonymousPresentation: "visible", route: "/sections/community" },
      { kind: "section", anonymousPresentation: "blur", route: "/sections/messagerie" },
      { kind: "section", anonymousPresentation: "disabled", route: "/sections/gamification" },
      { kind: "section", route: "/sections/missing" },
    `,
    routes: [
      "/sections/community",
      "/sections/messagerie",
      "/sections/gamification",
      "/sections/missing",
      "/dashboard",
    ],
  });

  assert.equal(runtime.accessByRoute.get("/sections/community"), "public-visible");
  assert.equal(runtime.accessByRoute.get("/sections/messagerie"), "auth-blur-gate");
  assert.equal(runtime.accessByRoute.get("/sections/gamification"), "auth-disabled-gate");
  assert.deepEqual(runtime.unclassifiedSectionRoutes, ["/sections/missing"]);
  assert.equal(runtime.accessByRoute.has("/sections/missing"), false);
});

test("les liens CURRENT sont contrôlés sans scanner PLAN ni les URLs de navigation", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "cmm-pages-links-"));
  const routesRoot = path.join(root, "documentation", "pages_site", "routes");
  const page = path.join(routesRoot, "02-agir", "demo");
  try {
    await mkdir(page, { recursive: true });
    await writeFile(path.join(page, "demo-README.md"), [
      "# Démo",
      "[Présentation](./demo-presentation-detaillee.md)",
      "[Navigation](/signalement)",
      "[Externe](https://cleanmymap.fr)",
      "[Supprimé](./ancien.md)",
    ].join("\n"), "utf8");
    await writeFile(path.join(page, "demo-presentation-detaillee.md"), "# Présentation\n", "utf8");
    await writeFile(path.join(page, "demo-liste-propositions-a-traiter.md"), "[PLAN](./absent-plan.md)\n", "utf8");
    assert.deepEqual(
      await findBrokenCanonicalMarkdownLinks({ repoRoot: root, routesRoot }),
      [{ file: "documentation/pages_site/routes/02-agir/demo/demo-README.md", line: 5, target: "./ancien.md" }],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test("les fichiers compagnons d'une route sont facultatifs, les liens restent contrôlés", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "cmm-route-optional-"));
  const routesRoot = path.join(root, "documentation", "pages_site", "routes");
  const folder = path.join(routesRoot, "02-agir", "demo");
  const indexPath = path.join(root, "documentation", "pages_site", "INDEX.md");
  const indexEntries = [entry("/demo", "./routes/02-agir/demo/demo-README.md")];
  try {
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, "demo-README.md"), "# Demo\n", "utf8");
    const onlyReadme = await loadCanonicalRouteDocs({ indexEntries, indexPath, repoRoot: root, routesRoot });
    assert.equal(onlyReadme.routeDocs.length, 1);
    assert.deepEqual(onlyReadme.incompleteNuclei, []);

    await writeFile(path.join(folder, "demo-presentation-detaillee.md"), "# Complement utile\n", "utf8");
    const optionalPresentation = await loadCanonicalRouteDocs({ indexEntries, indexPath, repoRoot: root, routesRoot });
    assert.deepEqual(optionalPresentation.incompleteNuclei, []);
    assert.deepEqual(await findBrokenCanonicalMarkdownLinks({ repoRoot: root, routesRoot }), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("les liens Markdown valides, images, ancres et titres restent reconnus", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "cmm-pages-markdown-valid-"));
  const routesRoot = path.join(root, "documentation", "pages_site", "routes");
  const folder = path.join(routesRoot, "02-agir", "demo");
  try {
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, "demo-README.md"), [
      "# Demo",
      "[Guide](./guide.md \"title\") ![Image](<./image.svg> \"preview\") [Ancre](#demo)",
      "[Malformé](a [Guide](./guide.md))",
    ].join("\n"), "utf8");
    await writeFile(path.join(folder, "guide.md"), "# Guide\n", "utf8");
    await writeFile(path.join(folder, "image.svg"), "<svg />", "utf8");

    assert.deepEqual(await findBrokenCanonicalMarkdownLinks({ repoRoot: root, routesRoot }), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("les ouvertures Markdown malformées adversariales ne provoquent pas de rescans quadratiques", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "cmm-pages-markdown-adversarial-"));
  const routesRoot = path.join(root, "documentation", "pages_site", "routes");
  const folder = path.join(routesRoot, "02-agir", "demo");
  try {
    await mkdir(folder, { recursive: true });
    const malformed = "[x](a ".repeat(4_000);
    const longDestination = `[long](${"a".repeat(4_000)}`;
    await writeFile(path.join(folder, "demo-README.md"), `${malformed}\n${longDestination}\n`, "utf8");

    assert.deepEqual(await findBrokenCanonicalMarkdownLinks({ repoRoot: root, routesRoot }), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
