import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  findPublicDocumentationByApiSlug,
  findPublicDocumentationByDocsPath,
  PUBLIC_DOCUMENTATION,
} from "./public-documentation-registry";

function findRepositoryRoot(): string {
  let directory = process.cwd();

  for (let depth = 0; depth < 6; depth += 1) {
    if (existsSync(path.join(directory, "documentation", "plans"))) {
      return directory;
    }
    directory = path.dirname(directory);
  }

  throw new Error("Repository root not found for documentation registry checks");
}

describe("public documentation registry", () => {
  it("contains only existing canonical documentation files", () => {
    const root = findRepositoryRoot();

    for (const entry of PUBLIC_DOCUMENTATION) {
      expect(entry.canonicalPath).not.toMatch(/^\//);
      expect(entry.canonicalPath).not.toContain("..");
      expect(existsSync(path.join(root, "documentation", entry.canonicalPath))).toBe(true);
    }
  });

  it("keeps the product documentation URLs and API slugs explicit", () => {
    expect(
      PUBLIC_DOCUMENTATION.filter((entry) => entry.docsPath).map((entry) => entry.docsPath),
    ).toEqual([
      "plans/journal_impact_DU.md",
      "plans/rapport_impact/impact_carbone_methodologie.md",
      "plans/rapport_impact/impact_IA.md",
      "plans/rapport_impact/impact_IA/00-faq-questions-jury.md",
      "plans/rapport_impact/impact_IA/01-cadre-perimetre-methodologie.md",
      "plans/rapport_impact/impact_IA/02-empreinte-environnementale-materielle.md",
      "plans/rapport_impact/impact_IA/02a-empreinte-environnementale-cleanmymap.md",
      "plans/rapport_impact/impact_IA/02b-ia-data-centers-materiel-acv.md",
      "plans/rapport_impact/impact_IA/03-impacts-sociaux-humains-informationnels.md",
      "plans/rapport_impact/impact_IA/04-pouvoir-infrastructures-souverainete.md",
      "plans/rapport_impact/impact_IA/05-risques-techniques-securite-controle.md",
      "plans/rapport_impact/impact_IA/06-utilite-reelle-cleanmymap.md",
      "plans/rapport_impact/impact_IA/07-sobriete-fonctionnelle-iur.md",
      "plans/rapport_impact/impact_IA/08-dette-numerique-effets-rebond-durabilite.md",
      "plans/rapport_impact/impact_IA/09-plan-reduction-impacts.md",
      "plans/rapport_impact/impact_IA/10-sobriete-numerique-site.md",
      "plans/rapport_impact/impact_IA/11-audit-technique-sobriete.md",
      "plans/rapport_impact/impact_IA/12-apports-ia-enseignements-du.md",
      "plans/rapport_impact/impact_IA/13-conclusion-institutionnelle.md",
      "plans/rapport_impact/impact_IA/annexes/A-dependances-scenarios-rupture.md",
      "plans/rapport_impact/impact_IA/annexes/B-methodologie-calcul-incertitudes.md",
      "plans/rapport_impact/impact_IA/annexes/C-avancees-scientifiques-ia.md",
      "plans/rapport_impact/impact_IA/annexes/D-preuves-internes-suivi.md",
      "product/methodologie-carte-actions.md",
      "architecture/methodologie-creation-itineraire.md",
      "plans/rapport_impact/quotas_plans_methodologie.md",
    ]);

    expect(
      PUBLIC_DOCUMENTATION.flatMap((entry) => entry.apiRoutes?.map((route) => route.slug) ?? []),
    ).toEqual(["graphique-impact-co2e", "atelier_DU", "journal_DU", "journal_impact_DU"]);
  });

  it("resolves only the registered route identifiers", () => {
    expect(findPublicDocumentationByDocsPath("operations/platform-cost-governance.md")).toBeUndefined();
    expect(findPublicDocumentationByDocsPath("../plans/rapport_impact/impact_IA.md")).toBeUndefined();
    expect(findPublicDocumentationByApiSlug("unknown")).toBeUndefined();

    expect(findPublicDocumentationByApiSlug("journal_DU")?.filename).toBe("journal_DU.md");
    expect(findPublicDocumentationByApiSlug("journal_impact_DU")?.filename).toBe("journal_impact_DU.md");
  });
});
