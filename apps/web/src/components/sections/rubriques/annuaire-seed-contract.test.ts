import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./annuaire/seed-index";

const seedFiles = [
  "./annuaire/seed-associations.ts",
  "./annuaire/seed-entreprises.ts",
  "./annuaire/seed-evenements.ts",
];

const forbiddenSeedKeys =
  /\b(?:verificationStatus|qualificationStatus|recentActivityAt|impactHistory|structureStatus)\s*:/;

describe("annuaire editorial seed contract", () => {
  it("keeps validation, activity and measured-impact keys out of seed sources", () => {
    for (const relativePath of seedFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
      expect(source, relativePath).not.toMatch(forbiddenSeedKeys);
    }
  });

  it("keeps removed qualitative seed records out of the source contract", () => {
    const source = readFileSync(
      new URL("./annuaire/seed-associations.ts", import.meta.url),
      "utf8",
    );
    const enterpriseSource = readFileSync(
      new URL("./annuaire/seed-entreprises.ts", import.meta.url),
      "utf8",
    );
    const eventSource = readFileSync(
      new URL("./annuaire/seed-evenements.ts", import.meta.url),
      "utf8",
    );
    const combinedSource = `${source}\n${enterpriseSource}\n${eventSource}`;

    expect(combinedSource).not.toContain("ASSOCIATION_PROFILES");
    expect(combinedSource).not.toContain("associationProfile");
    expect(combinedSource).not.toContain("Fiche partenaire");
    expect(combinedSource).not.toContain("Partenaire clé");
    expect(combinedSource).not.toContain("Leader");
    expect(combinedSource).not.toContain("Official");
    expect(combinedSource).not.toContain("Action terrain exemplaire");
    expect(combinedSource).not.toContain("Cercle de parole - Eco-anxiété");
  });

  it("keeps one neutral editorial entry for each canonical cigarette-butt operator", () => {
    const entries = INITIAL_ANNUAIRE_ENTRIES;

    expect(entries.filter((entry) => entry.name === "ALCOME")).toHaveLength(1);
    expect(entries.filter((entry) => entry.name === "TchaoMegot")).toHaveLength(1);
    expect(entries.filter((entry) => entry.name === "Cy-Clope")).toHaveLength(1);
    expect(entries.map((entry) => entry.id)).not.toEqual(
      expect.arrayContaining([
        "asso-featured-3",
        "asso-featured-4",
        "asso-featured-5",
      ]),
    );
  });

  it("keeps public operator links and identities factual", () => {
    const getEntry = (id: string) => {
      const entry = INITIAL_ANNUAIRE_ENTRIES.find((item) => item.id === id);
      if (!entry) {
        throw new Error(`Missing seed entry: ${id}`);
      }
      return entry;
    };

    const paris = getEntry("evt-paris-nettoyages");
    expect(paris.legalIdentity).toBe(
      "Ville de Paris — Direction de la Propreté et de l’Eau",
    );
    expect(paris.description).toContain("coordination avec les services de propreté");
    expect(paris.description).not.toContain("autorisation");
    expect(paris.tags).not.toContain("Official");

    const jagis = getEntry("evt-j-agis-nature");
    expect(jagis.websiteUrl).toBe("https://www.jagispourlanature.org/");
    expect(jagis.legalIdentity).toBe(
      "Fondation pour la Nature et l’Homme — projet J’agis pour la nature",
    );
    expect(jagis.legalIdentity).not.toContain("Structures partenaires");

    const pepite = getEntry("asso-pepite");
    expect(pepite.name).toBe("Pépite Sorbonne Université");
    expect(pepite.websiteUrl).toBe("https://pepite.sorbonne-universite.fr/");
    expect(pepite.primaryChannel?.url).toBe("https://pepite.sorbonne-universite.fr/");

    const jeVeuxAider = getEntry("evt-je-veux-aider");
    expect(jeVeuxAider.legalIdentity).toBe(
      "Réserve Civique — JeVeuxAider.gouv.fr",
    );
    expect(jeVeuxAider.description).toContain("associations, collectivités");
    expect(jeVeuxAider.description).not.toContain("Croix-Rouge");

    const alcome = getEntry("asso-megots-alcome");
    expect(alcome.scope).toBe("national");
    expect(alcome.coveredArrondissements).toEqual([]);

    expect(getEntry("asso-megots-cyclope").coveredArrondissements).toEqual([]);
    expect(getEntry("asso-megots-tchaomegot").coveredArrondissements).toEqual([]);

    expect(
      INITIAL_ANNUAIRE_ENTRIES.some(
        (entry) => entry.name === "Cercle de parole - Eco-anxiété",
      ),
    ).toBe(false);
  });
});
