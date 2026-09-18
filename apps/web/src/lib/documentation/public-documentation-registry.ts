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
    name: "Rapport d'impact IA — FAQ",
    canonicalPath: "plans/rapport_impact/impact_IA/00-faq-questions-jury.md",
    docsPath: "plans/rapport_impact/impact_IA/00-faq-questions-jury.md",
    filename: "00-faq-questions-jury.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Partie I",
    canonicalPath: "plans/rapport_impact/impact_IA/01-cadre-perimetre-methodologie.md",
    docsPath: "plans/rapport_impact/impact_IA/01-cadre-perimetre-methodologie.md",
    filename: "01-cadre-perimetre-methodologie.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Partie II",
    canonicalPath: "plans/rapport_impact/impact_IA/02-empreinte-environnementale-materielle.md",
    docsPath: "plans/rapport_impact/impact_IA/02-empreinte-environnementale-materielle.md",
    filename: "02-empreinte-environnementale-materielle.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Partie II-A",
    canonicalPath: "plans/rapport_impact/impact_IA/02a-empreinte-environnementale-cleanmymap.md",
    docsPath: "plans/rapport_impact/impact_IA/02a-empreinte-environnementale-cleanmymap.md",
    filename: "02a-empreinte-environnementale-cleanmymap.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Partie II-B",
    canonicalPath: "plans/rapport_impact/impact_IA/02b-ia-data-centers-materiel-acv.md",
    docsPath: "plans/rapport_impact/impact_IA/02b-ia-data-centers-materiel-acv.md",
    filename: "02b-ia-data-centers-materiel-acv.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Partie III",
    canonicalPath: "plans/rapport_impact/impact_IA/03-impacts-sociaux-humains-informationnels.md",
    docsPath: "plans/rapport_impact/impact_IA/03-impacts-sociaux-humains-informationnels.md",
    filename: "03-impacts-sociaux-humains-informationnels.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Partie IV",
    canonicalPath: "plans/rapport_impact/impact_IA/04-pouvoir-infrastructures-souverainete.md",
    docsPath: "plans/rapport_impact/impact_IA/04-pouvoir-infrastructures-souverainete.md",
    filename: "04-pouvoir-infrastructures-souverainete.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Partie V",
    canonicalPath: "plans/rapport_impact/impact_IA/05-risques-techniques-securite-controle.md",
    docsPath: "plans/rapport_impact/impact_IA/05-risques-techniques-securite-controle.md",
    filename: "05-risques-techniques-securite-controle.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Partie VI",
    canonicalPath: "plans/rapport_impact/impact_IA/06-utilite-reelle-cleanmymap.md",
    docsPath: "plans/rapport_impact/impact_IA/06-utilite-reelle-cleanmymap.md",
    filename: "06-utilite-reelle-cleanmymap.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Partie VII",
    canonicalPath: "plans/rapport_impact/impact_IA/07-sobriete-fonctionnelle-iur.md",
    docsPath: "plans/rapport_impact/impact_IA/07-sobriete-fonctionnelle-iur.md",
    filename: "07-sobriete-fonctionnelle-iur.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Partie VIII",
    canonicalPath: "plans/rapport_impact/impact_IA/08-dette-numerique-effets-rebond-durabilite.md",
    docsPath: "plans/rapport_impact/impact_IA/08-dette-numerique-effets-rebond-durabilite.md",
    filename: "08-dette-numerique-effets-rebond-durabilite.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Partie IX",
    canonicalPath: "plans/rapport_impact/impact_IA/09-plan-reduction-impacts.md",
    docsPath: "plans/rapport_impact/impact_IA/09-plan-reduction-impacts.md",
    filename: "09-plan-reduction-impacts.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Partie X",
    canonicalPath: "plans/rapport_impact/impact_IA/10-sobriete-numerique-site.md",
    docsPath: "plans/rapport_impact/impact_IA/10-sobriete-numerique-site.md",
    filename: "10-sobriete-numerique-site.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Partie XI",
    canonicalPath: "plans/rapport_impact/impact_IA/11-audit-technique-sobriete.md",
    docsPath: "plans/rapport_impact/impact_IA/11-audit-technique-sobriete.md",
    filename: "11-audit-technique-sobriete.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Partie XII",
    canonicalPath: "plans/rapport_impact/impact_IA/12-apports-ia-enseignements-du.md",
    docsPath: "plans/rapport_impact/impact_IA/12-apports-ia-enseignements-du.md",
    filename: "12-apports-ia-enseignements-du.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Partie XIII",
    canonicalPath: "plans/rapport_impact/impact_IA/13-conclusion-institutionnelle.md",
    docsPath: "plans/rapport_impact/impact_IA/13-conclusion-institutionnelle.md",
    filename: "13-conclusion-institutionnelle.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Annexe A",
    canonicalPath: "plans/rapport_impact/impact_IA/annexes/A-dependances-scenarios-rupture.md",
    docsPath: "plans/rapport_impact/impact_IA/annexes/A-dependances-scenarios-rupture.md",
    filename: "A-dependances-scenarios-rupture.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Annexe B",
    canonicalPath: "plans/rapport_impact/impact_IA/annexes/B-methodologie-calcul-incertitudes.md",
    docsPath: "plans/rapport_impact/impact_IA/annexes/B-methodologie-calcul-incertitudes.md",
    filename: "B-methodologie-calcul-incertitudes.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Annexe C",
    canonicalPath: "plans/rapport_impact/impact_IA/annexes/C-avancees-scientifiques-ia.md",
    docsPath: "plans/rapport_impact/impact_IA/annexes/C-avancees-scientifiques-ia.md",
    filename: "C-avancees-scientifiques-ia.md",
    kind: "markdown",
  },
  {
    name: "Rapport d'impact IA — Annexe D",
    canonicalPath: "plans/rapport_impact/impact_IA/annexes/D-preuves-internes-suivi.md",
    docsPath: "plans/rapport_impact/impact_IA/annexes/D-preuves-internes-suivi.md",
    filename: "D-preuves-internes-suivi.md",
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
