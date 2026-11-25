import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";

const seedFiles = [
  "./seed-associations.ts",
  "./seed-entreprises.ts",
  "./seed-evenements.ts",
  "./seed-schools.ts",
];

const forbiddenSeedKeys =
  /\b(?:verificationStatus|qualificationStatus|recentActivityAt|impactHistory|structureStatus|availability|lastUpdatedAt|internalAdminContact)\s*:/;

describe("annuaire editorial seed contract", () => {
  it("preserves sourced public establishment addresses separately from coverage and geocoding", () => {
    const expected = [["asso-3","Paris","75018"],["asso-4","Paris","75004"],["asso-shakirail","Paris","75018"],["com-1","Paris","75010"],["asso-megots-alcome","Paris","75008"],["operator-ckfd","Gennevilliers","92230"],["operator-mego","Saint-Divy","29800"],["operator-carton-plein-cyclo","Paris","75011"],["com-2","Montreuil","93100"],["asso-megots-tchaomegot","Bresles","60510"],["evt-1","Paris","75018"]] as const;
    for (const [id, municipality, postalCode] of expected) {
      const entry = INITIAL_ANNUAIRE_ENTRIES.find(item => item.id === id)!;
      expect(entry.publicAddress).toMatchObject({ municipality, postalCode, country: "FR", checkedAt: "2026-11-25" });
      expect(entry.publicAddress?.sourceUrl).toMatch(/^https:\/\//);
      expect(entry.publicAddress?.label).toContain(postalCode);
    }
    expect(INITIAL_ANNUAIRE_ENTRIES.find(item => item.id === "operator-mego")).toMatchObject({ lat: null, lng: null, coordinatesSource: "unknown", scope: "national" });
  });

  it("references documented waste-chain and plogging resources once, without asserting partner or drop-off status", () => {
    for (const id of ["operator-ckfd", "operator-mego", "operator-carton-plein-cyclo", "asso-runners-laveurs"]) {
      const entries = INITIAL_ANNUAIRE_ENTRIES.filter(entry => entry.id === id);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ provenance: "editorial_seed", qualificationStatus: "contact_non_qualifie", lat: null, lng: null, coveredArrondissements: [] });
    }
    expect(INITIAL_ANNUAIRE_ENTRIES.find(entry => entry.id === "asso-3")?.name).toBe("Carton Plein");
  });
  it("keeps validation, activity and measured-impact keys out of seed sources", () => {
    for (const relativePath of seedFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
      expect(source, relativePath).not.toMatch(forbiddenSeedKeys);
    }
  });

  it("keeps administrative contacts out of the client editorial projection", () => {
    for (const entry of INITIAL_ANNUAIRE_ENTRIES) {
      expect(entry).not.toHaveProperty("internalAdminContact");
    }
  });

  it("keeps removed qualitative seed records out of the source contract", () => {
    const source = readFileSync(
      new URL("./seed-associations.ts", import.meta.url),
      "utf8",
    );
    const enterpriseSource = readFileSync(
      new URL("./seed-entreprises.ts", import.meta.url),
      "utf8",
    );
    const eventSource = readFileSync(
      new URL("./seed-evenements.ts", import.meta.url),
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
    const tchaoMegot = getEntry("asso-megots-tchaomegot");
    expect(tchaoMegot.scope).toBe("national");
    expect(tchaoMegot.coveredArrondissements).toEqual([]);

    for (const id of ["asso-megots-ecomegot", "evt-j-agis-nature", "evt-je-veux-aider"]) {
      expect(getEntry(id).scope, id).toBe("national");
    }

    expect(
      INITIAL_ANNUAIRE_ENTRIES.some(
        (entry) => entry.name === "Cercle de parole - Eco-anxiété",
      ),
    ).toBe(false);
  });
});
