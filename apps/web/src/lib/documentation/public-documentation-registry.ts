export type PublicDocumentationKind = "markdown" | "image" | "text";

export type PublicDocumentationEntry = {
  name: string;
  canonicalPath: string;
  docsPath?: string;
  apiRoutes?: readonly {
    slug: string;
    filename: string;
  }[];
  filename: string;
  kind: PublicDocumentationKind;
};

/**
 * The only documentation files that product routes are allowed to expose.
 * Paths are relative to the repository's documentation/ directory.
 */
export const PUBLIC_DOCUMENTATION: readonly PublicDocumentationEntry[] = [
  {
    name: "Graphique d'impact CO2e",
    canonicalPath: "plans/rapport_impact/graphique_impact_CO2e.md",
    apiRoutes: [{ slug: "graphique-impact-co2e", filename: "graphique_impact_CO2e.md" }],
    filename: "graphique_impact_CO2e.md",
    kind: "markdown",
  },
  {
    name: "Ateliers DU",
    canonicalPath: "plans/ateliers_DU.md",
    apiRoutes: [{ slug: "atelier_DU", filename: "atelier_DU.md" }],
    filename: "atelier_DU.md",
    kind: "markdown",
  },
  {
    name: "Journal DU",
    canonicalPath: "plans/journal_impact_DU.md",
    docsPath: "plans/journal_impact_DU.md",
    apiRoutes: [
      { slug: "journal_DU", filename: "journal_DU.md" },
      { slug: "journal_impact_DU", filename: "journal_impact_DU.md" },
    ],
    filename: "journal_impact_DU.md",
    kind: "markdown",
  },
  {
    name: "Méthodologie ACV numérique",
    canonicalPath: "plans/rapport_impact/impact_carbone_methodologie.md",
    docsPath: "plans/rapport_impact/impact_carbone_methodologie.md",
    filename: "impact_carbone_methodologie.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA",
    canonicalPath: "plans/rapport_impact/impact_IA.md",
    docsPath: "plans/rapport_impact/impact_IA.md",
    filename: "impact_IA.md",
    kind: "markdown",
  },
  {
    name: "Méthodologie de la carte d'actions",
    canonicalPath: "product/methodologie-carte-actions.md",
    docsPath: "product/methodologie-carte-actions.md",
    filename: "methodologie-carte-actions.md",
    kind: "markdown",
  },
  {
    name: "Méthodologie de création d'itinéraire",
    canonicalPath: "architecture/methodologie-creation-itineraire.md",
    docsPath: "architecture/methodologie-creation-itineraire.md",
    filename: "methodologie-creation-itineraire.md",
    kind: "markdown",
  },
  {
    name: "Méthodologie des quotas par plan",
    canonicalPath: "plans/rapport_impact/quotas_plans_methodologie.md",
    docsPath: "plans/rapport_impact/quotas_plans_methodologie.md",
    filename: "quotas_plans_methodologie.md",
    kind: "markdown",
  },
];

export const PUBLIC_DOCUMENTATION_TRACE_FILES = {
  docs: PUBLIC_DOCUMENTATION.filter((entry) => entry.docsPath).map(
    (entry) => `../../documentation/${entry.canonicalPath}`,
  ),
  api: PUBLIC_DOCUMENTATION.filter((entry) => entry.apiRoutes?.length).map(
    (entry) => `../../documentation/${entry.canonicalPath}`,
  ),
};

export function findPublicDocumentationByDocsPath(docsPath: string) {
  return PUBLIC_DOCUMENTATION.find((entry) => entry.docsPath === docsPath);
}

export function findPublicDocumentationByApiSlug(slug: string) {
  const entry = PUBLIC_DOCUMENTATION.find((candidate) =>
    candidate.apiRoutes?.some((route) => route.slug === slug),
  );
  const apiRoute = entry?.apiRoutes?.find((route) => route.slug === slug);

  return entry && apiRoute ? { ...entry, filename: apiRoute.filename } : undefined;
}
