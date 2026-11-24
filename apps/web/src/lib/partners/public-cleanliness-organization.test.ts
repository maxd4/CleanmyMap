import { describe, expect, it } from "vitest";
import {
  filterPublicCleanlinessNodes,
  PARIS_PUBLIC_CLEANLINESS_NODES,
  PARIS_PUBLIC_CLEANLINESS_RELATIONS,
  PUBLIC_CLEANLINESS_SOURCES,
  validatePublicCleanlinessOrganization,
} from "./public-cleanliness-organization";

describe("public cleanliness organization contract", () => {
  it("has unique sourced nodes, valid relation endpoints and no hierarchy cycle", () => {
    expect(validatePublicCleanlinessOrganization()).toEqual([]);
    expect(new Set(PARIS_PUBLIC_CLEANLINESS_NODES.map((node) => node.id)).size).toBe(PARIS_PUBLIC_CLEANLINESS_NODES.length);
    expect(PUBLIC_CLEANLINESS_SOURCES.every((source) => source.verifiedAt === "2026-11-24")).toBe(true);
  });

  it("represents each shared territorial division once and lists its full coverage", () => {
    const divisions = PARIS_PUBLIC_CLEANLINESS_NODES.filter((node) => /^division-\d{2}(?:-\d{2})?$/.test(node.id));
    expect(divisions).toHaveLength(14);
    expect(divisions.find((node) => node.id === "division-01-04")?.territoryIds).toEqual(["Paris:1", "Paris:2", "Paris:3", "Paris:4"]);
    expect(divisions.find((node) => node.id === "division-09-10")?.territoryIds).toEqual(["Paris:9", "Paris:10"]);
    expect(divisions.find((node) => node.id === "division-17")?.territoryIds).toEqual(["Paris:17"]);
    expect(PARIS_PUBLIC_CLEANLINESS_RELATIONS.filter((edge) => edge.to === "division-01-04" && edge.kind === "hierarchy")).toHaveLength(1);
  });

  it("keeps hierarchy, functional coordination and provision as distinct relations", () => {
    expect(PARIS_PUBLIC_CLEANLINESS_RELATIONS.find((edge) => edge.id === "dpe-stpp")?.kind).toBe("hierarchy");
    expect(PARIS_PUBLIC_CLEANLINESS_RELATIONS.find((edge) => edge.id === "req-dpe-coordination")?.kind).toBe("coordination");
    expect(PARIS_PUBLIC_CLEANLINESS_RELATIONS.find((edge) => edge.id === "city-private-collectors")?.kind).toBe("service");
    expect(PARIS_PUBLIC_CLEANLINESS_NODES.find((node) => node.id === "req")?.assignment).toBe("unknown");
    expect(PARIS_PUBLIC_CLEANLINESS_NODES.find((node) => node.id === "tson-position")?.assignment).toBe("historical");
    expect(PARIS_PUBLIC_CLEANLINESS_NODES.find((node) => node.id === "dpe")?.directoryId).toBe("evt-paris-nettoyages");
    expect(PARIS_PUBLIC_CLEANLINESS_NODES.find((node) => node.id === "syctom")?.directoryId).toBe("collectivite-syctom");
  });

  it("filters by arrondissement and service without fabricating other city data", () => {
    const paris17 = filterPublicCleanlinessNodes({ city: "Paris", arrondissement: 17, service: "cleaning", query: "" });
    expect(paris17.some((node) => node.id === "division-17")).toBe(true);
    expect(paris17.some((node) => node.id === "division-09-10")).toBe(false);
    expect(filterPublicCleanlinessNodes({ city: "Lyon", arrondissement: null, service: "all", query: "" })).toEqual([]);
    expect(filterPublicCleanlinessNodes({ city: "Paris", arrondissement: null, service: "all", query: "REQ" }).map((node) => node.id)).toContain("req");
  });

  it("detects duplicate IDs, broken references, cycles and duplicated coverage", () => {
    const node = PARIS_PUBLIC_CLEANLINESS_NODES.find((entry) => entry.id === "req")!;
    const cycle = { id: "bad-cycle", from: "ddct", to: "city-paris", kind: "hierarchy" as const, status: "unknown" as const, sourceIds: ["req-20-recruitment"] };
    const duplicatedDivision = PARIS_PUBLIC_CLEANLINESS_NODES.map((entry) => entry.id === "division-18" ? { ...entry, territoryIds: ["Paris:18", "Paris:17"] } : entry);
    expect(validatePublicCleanlinessOrganization([...PARIS_PUBLIC_CLEANLINESS_NODES, node], [...PARIS_PUBLIC_CLEANLINESS_RELATIONS, cycle, { ...cycle, id: "bad-endpoint", from: "missing" }])).toEqual(expect.arrayContaining([
      "duplicate-node:req", "hierarchy-cycle:city-paris", "missing-endpoint:bad-endpoint",
    ]));
    expect(validatePublicCleanlinessOrganization(duplicatedDivision)).toContain("duplicated-division-territory:division-18");
  });
});
