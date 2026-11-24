import { describe, expect, it } from "vitest";
import {
  filterPublicCleanlinessNodes,
  PARIS_PUBLIC_CLEANLINESS_DATASET,
  PARIS_PUBLIC_CLEANLINESS_NODES,
  PARIS_PUBLIC_CLEANLINESS_RELATIONS,
  PUBLIC_CLEANLINESS_CITY_DATASETS,
  PUBLIC_CLEANLINESS_SOURCES,
  type PublicCleanlinessCityDataset,
  validatePublicCleanlinessOrganization,
} from "./public-cleanliness-organization";

const lyonDataset: PublicCleanlinessCityDataset = {
  city: "Lyon",
  territoryIds: Array.from({ length: 9 }, (_, index) => `Lyon:${index + 1}`),
  sources: [{ id: "lyon-source", label: "Fiche officielle fictive de Lyon", url: "https://example.test/lyon", verifiedAt: "2026-11-25", evidence: "official_current" }],
  nodes: [
    { id: "lyon-city", name: "Ville de Lyon", kind: "city", territoryIds: Array.from({ length: 9 }, (_, index) => `Lyon:${index + 1}`), service: "governance", assignment: "confirmed", description: "Ville synthétique de test.", sourceIds: ["lyon-source"] },
    { id: "lyon-cleaning", name: "Service de propreté", kind: "service", legalEmployerId: "lyon-city", unitId: "lyon-city", territoryIds: ["Lyon:1"], service: "cleaning", assignment: "confirmed", description: "Service synthétique de test.", sourceIds: ["lyon-source"] },
  ],
  relations: [{ id: "lyon-hierarchy", from: "lyon-city", to: "lyon-cleaning", kind: "hierarchy", status: "confirmed", sourceIds: ["lyon-source"] }],
};

describe("public cleanliness organization contract", () => {
  it("validates sourced Paris data, canonical Annuaire identifiers and unique shared divisions", () => {
    expect(validatePublicCleanlinessOrganization(PARIS_PUBLIC_CLEANLINESS_DATASET)).toEqual([]);
    expect(new Set(PARIS_PUBLIC_CLEANLINESS_NODES.map((node) => node.id)).size).toBe(PARIS_PUBLIC_CLEANLINESS_NODES.length);
    expect(PUBLIC_CLEANLINESS_SOURCES.every((source) => source.verifiedAt === "2026-11-24")).toBe(true);
    expect(PARIS_PUBLIC_CLEANLINESS_NODES.find((node) => node.id === "dpe")).toMatchObject({ legalEmployerId: "city-paris", unitId: "city-paris", directoryId: "evt-paris-nettoyages" });
    expect(PARIS_PUBLIC_CLEANLINESS_NODES.find((node) => node.id === "stpp")).toMatchObject({ legalEmployerId: "city-paris", unitId: "dpe" });
    expect(PARIS_PUBLIC_CLEANLINESS_NODES.find((node) => node.id === "syctom")?.directoryId).toBeUndefined();
  });

  it("represents each shared Paris division once with full canonical coverage", () => {
    const divisions = PARIS_PUBLIC_CLEANLINESS_NODES.filter((node) => /^division-\d{2}(?:-\d{2})?$/.test(node.id));
    expect(divisions).toHaveLength(14);
    expect(divisions.find((node) => node.id === "division-01-04")?.territoryIds).toEqual(["Paris:1", "Paris:2", "Paris:3", "Paris:4"]);
    expect(divisions.find((node) => node.id === "division-09-10")?.territoryIds).toEqual(["Paris:9", "Paris:10"]);
    expect(divisions.find((node) => node.id === "division-17")?.territoryIds).toEqual(["Paris:17"]);
    expect(PARIS_PUBLIC_CLEANLINESS_RELATIONS.filter((edge) => edge.to === "division-01-04" && edge.kind === "hierarchy")).toHaveLength(1);
  });

  it("keeps hierarchy, functional coordination, provision and assignment evidence distinct", () => {
    expect(PARIS_PUBLIC_CLEANLINESS_RELATIONS.find((edge) => edge.id === "dpe-stpp")?.kind).toBe("hierarchy");
    expect(PARIS_PUBLIC_CLEANLINESS_RELATIONS.find((edge) => edge.id === "req-dpe-coordination")?.kind).toBe("coordination");
    expect(PARIS_PUBLIC_CLEANLINESS_RELATIONS.find((edge) => edge.id === "city-private-collectors")?.kind).toBe("service");
    expect(PARIS_PUBLIC_CLEANLINESS_NODES.find((node) => node.id === "req")?.assignment).toBe("unknown");
    expect(PARIS_PUBLIC_CLEANLINESS_NODES.find((node) => node.id === "tson-position")?.assignment).toBe("historical");
  });

  it("validates and filters a synthetic non-Paris city through the same engine", () => {
    const datasets = { ...PUBLIC_CLEANLINESS_CITY_DATASETS, Lyon: lyonDataset };
    expect(validatePublicCleanlinessOrganization(lyonDataset)).toEqual([]);
    expect(filterPublicCleanlinessNodes({ city: "Lyon", arrondissement: 1, service: "cleaning", query: "" }, datasets).map((node) => node.id)).toEqual(["lyon-cleaning"]);
    expect(filterPublicCleanlinessNodes({ city: "Paris", arrondissement: null, service: "all", query: "REQ" }).map((node) => node.id)).toContain("req");
    expect(filterPublicCleanlinessNodes({ city: "Lyon", arrondissement: null, service: "all", query: "" }, PUBLIC_CLEANLINESS_CITY_DATASETS)).toEqual([]);
  });

  it("rejects invalid sources, territories, Annuaire IDs and employer/unit references", () => {
    const invalid = {
      ...lyonDataset,
      territoryIds: [...lyonDataset.territoryIds, "Paris:1"],
      nodes: lyonDataset.nodes.map((node) => node.id === "lyon-cleaning" ? { ...node, territoryIds: ["Lyon:10"], legalEmployerId: "missing-employer", unitId: "missing-unit", directoryId: "unknown-directory-id", sourceIds: ["missing-source"] } : node),
    };
    expect(validatePublicCleanlinessOrganization(invalid)).toEqual(expect.arrayContaining([
      "invalid-dataset-territory:Paris:1",
      "invalid-territory:lyon-cleaning:Lyon:10",
      "invalid-source:lyon-cleaning",
      "unknown-directory-id:lyon-cleaning:unknown-directory-id",
      "missing-employer:lyon-cleaning:missing-employer",
      "missing-unit:lyon-cleaning:missing-unit",
      "unit-hierarchy-mismatch:lyon-cleaning:missing-unit",
    ]));
  });

  it("rejects missing coverage, fabricated assignments and recruitment contacts", () => {
    const data = PARIS_PUBLIC_CLEANLINESS_DATASET;
    const edge = { id: "invalid-assignment", from: "dpe", to: "req", kind: "assignment" as const, status: "confirmed" as const, sourceIds: ["req-20-recruitment"] };
    const invalid: PublicCleanlinessCityDataset = {
      ...data,
      nodes: data.nodes.map(node => node.id === "division-20" ? { ...node, territoryIds: [] } : node.id === "dpe" ? { ...node, publicContact: { label: "Contact de recrutement", url: "https://travaillerpourparis.offres.paris.fr/13375", kind: "functional_contact" as const, sourceIds: ["req-20-recruitment"] } } : node),
      relations: [...data.relations, edge],
    };
    expect(validatePublicCleanlinessOrganization(invalid)).toEqual(expect.arrayContaining([
      "missing-coverage-territory:stpp-divisions:Paris:20",
      "invalid-assignment:invalid-assignment",
      "unproven-current-assignment:invalid-assignment",
      "invalid-public-contact:dpe",
      "invalid-public-contact-url:dpe",
      "unproven-functional-contact:dpe",
    ]));
  });

  it("detects duplicate IDs, broken endpoints, multiple parents, hierarchy cycles and overlapping coverage groups", () => {
    const node = PARIS_PUBLIC_CLEANLINESS_NODES.find((entry) => entry.id === "req")!;
    const cycle = { id: "bad-cycle", from: "ddct", to: "city-paris", kind: "hierarchy" as const, status: "unknown" as const, sourceIds: ["req-20-recruitment"] };
    const duplicateCoverage = {
      ...PARIS_PUBLIC_CLEANLINESS_DATASET,
      nodes: PARIS_PUBLIC_CLEANLINESS_NODES.map((entry) => entry.id === "division-18" ? { ...entry, territoryIds: ["Paris:18", "Paris:17"] } : entry),
      relations: [...PARIS_PUBLIC_CLEANLINESS_RELATIONS, { id: "second-parent", from: "borough-mayors", to: "dpe", kind: "hierarchy" as const, status: "unknown" as const, sourceIds: ["paris-org-chart"] }, cycle, { ...cycle, id: "bad-endpoint", from: "missing" }],
    };
    expect(validatePublicCleanlinessOrganization({ ...PARIS_PUBLIC_CLEANLINESS_DATASET, nodes: [...PARIS_PUBLIC_CLEANLINESS_NODES, node], relations: duplicateCoverage.relations })).toEqual(expect.arrayContaining([
      "duplicate-node:req", "hierarchy-cycle:city-paris", "missing-endpoint:bad-endpoint", "multiple-hierarchy-parents:dpe",
    ]));
    expect(validatePublicCleanlinessOrganization(duplicateCoverage)).toContain("duplicated-division-territory:division-18");
  });
});
