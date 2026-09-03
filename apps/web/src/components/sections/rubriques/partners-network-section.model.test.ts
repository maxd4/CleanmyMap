import { describe, expect, it } from "vitest";
import type {
  EditorialAnnuaireEntry,
  PublishedAnnuaireEntry,
} from "@/lib/partners/annuaire-types";
import {
  buildPartnersNetworkEntriesModel,
  getKindLabel,
  getTerritoryBucket,
  isInstitution,
  matchesQuery,
  type TerritoryFilter,
} from "./partners-network-section.model";

function editorialEntry(
  overrides: Partial<EditorialAnnuaireEntry> = {},
): EditorialAnnuaireEntry {
  return {
    id: "editorial-entry",
    name: "Partenaire éditorial",
    legalIdentity: "Partenaire éditorial",
    kind: "association",
    scope: "local",
    types: ["environnemental"],
    description: "Une structure locale utile.",
    location: "Paris",
    lat: 48.8566,
    lng: 2.3522,
    coveredArrondissements: [],
    contributionTypes: ["communication"],
    provenance: "editorial_seed",
    verificationStatus: "en_cours",
    qualificationStatus: "contact_non_qualifie",
    ...overrides,
  };
}

function publishedEntry(
  overrides: Partial<PublishedAnnuaireEntry> = {},
): PublishedAnnuaireEntry {
  return {
    id: "published-entry",
    name: "Partenaire publié",
    legalIdentity: "Partenaire publié",
    kind: "association",
    scope: "local",
    types: ["environnemental"],
    description: "Une structure publiée.",
    location: "Paris",
    lat: 48.8566,
    lng: 2.3522,
    coveredArrondissements: [],
    contributionTypes: ["communication"],
    provenance: "published_partner",
    verificationStatus: "verifie",
    qualificationStatus: "partenaire_actif",
    availability: "Chaque semaine",
    lastUpdatedAt: "2026-09-01T00:00:00.000Z",
    recentActivityAt: "2026-09-01T00:00:00.000Z",
    websiteUrl: "https://example.test",
    ...overrides,
  };
}

const allFilters = {
  query: "",
  kindFilter: "all" as const,
  domainFilter: "all" as const,
  territoryFilter: "all" as const,
};

describe("partners-network-section model", () => {
  it("recherche sans tenir compte des accents ni de la casse", () => {
    const entry = editorialEntry({
      name: "Énergie Solidaire",
      description: "Une équipe engagée à côté de la mairie.",
      tags: ["Économie circulaire"],
    });

    expect(matchesQuery(entry, "energie MAIRIE")).toBe(true);
    expect(matchesQuery(entry, "ECONOMIE")).toBe(true);
    expect(matchesQuery(entry, "océan")).toBe(false);
  });

  it("classe les institutions avant les catégories de leur kind", () => {
    const institution = editorialEntry({ name: "Ville de Paris" });
    const company = editorialEntry({ kind: "entreprise" });
    const collective = editorialEntry({ kind: "groupe_parole" });

    expect(isInstitution(institution)).toBe(true);
    expect(getKindLabel(institution, true)).toBe("Institution");
    expect(getKindLabel(company, false)).toBe("Company");
    expect(getKindLabel(collective, true)).toBe("Collectif");
  });

  it("conserve les buckets territoriaux actuels", () => {
    const cases: Array<[TerritoryFilter, EditorialAnnuaireEntry]> = [
      ["france", editorialEntry({ scope: "national" })],
      ["region", editorialEntry({ name: "Région Bretagne" })],
      ["departement", editorialEntry({ coveredArrondissements: [1] })],
      ["ville", editorialEntry({ name: "Maison de quartier" })],
    ];

    for (const [expected, entry] of cases) {
      expect(getTerritoryBucket(entry)).toBe(expected);
    }
  });

  it("combine recherche, type, domaine et territoire", () => {
    const target = editorialEntry({
      id: "target",
      name: "Éco Paris",
      kind: "association",
      types: ["environnemental"],
      location: "Paris",
      coveredArrondissements: [5],
    });
    const wrongDomain = editorialEntry({
      id: "wrong-domain",
      name: "Éco Social",
      types: ["social"],
      coveredArrondissements: [5],
    });
    const wrongKind = editorialEntry({
      id: "wrong-kind",
      name: "Éco Entreprise",
      kind: "entreprise",
      coveredArrondissements: [5],
    });
    const wrongTerritory = editorialEntry({
      id: "wrong-territory",
      name: "Éco National",
      scope: "national",
    });

    const model = buildPartnersNetworkEntriesModel({
      entries: [target, wrongDomain, wrongKind, wrongTerritory],
      query: "ECO",
      kindFilter: "association",
      domainFilter: "environnemental",
      territoryFilter: "departement",
    });

    expect(model.filteredEntries.map((entry) => entry.id)).toEqual(["target"]);
    expect(model.visibleEntries.map((entry) => entry.id)).toEqual(["target"]);
  });

  it("priorise featured puis trusted avant le départage alphabétique", () => {
    const source = [
      editorialEntry({ id: "plain", name: "Zêta" }),
      publishedEntry({ id: "trusted", name: "Alpha" }),
      editorialEntry({ id: "featured", name: "Beta", isFeatured: true }),
    ];
    const sourceIds = source.map((entry) => entry.id);

    const model = buildPartnersNetworkEntriesModel({ entries: source, ...allFilters });

    expect(model.sortedEntries.map((entry) => entry.id)).toEqual([
      "featured",
      "trusted",
      "plain",
    ]);
    expect(source.map((entry) => entry.id)).toEqual(sourceIds);
  });

  it("limite les entrées visibles à six sans tronquer les entrées filtrées", () => {
    const entries = Array.from({ length: 7 }, (_, index) =>
      editorialEntry({ id: `entry-${index}`, name: `Partenaire ${index}` }),
    );

    const model = buildPartnersNetworkEntriesModel({ entries, ...allFilters });

    expect(model.filteredEntries).toHaveLength(7);
    expect(model.visibleEntries).toHaveLength(6);
  });
});
