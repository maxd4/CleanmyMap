import { describe, expect, it } from "vitest";
import { projectPublicEntity } from "@/lib/partners/public-entity-projection";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";
import { buildGeoNetworkEntities } from "./annuaire-geo-network.model";
import { matchesNetworkOnlyFilters } from "./annuaire-network-only-filters";

describe("public identity and map visibility convergence", () => {
  const entries = INITIAL_ANNUAIRE_ENTRIES.map(entry => ({ ...entry, distanceKm: null }));
  const entities = buildGeoNetworkEntities(entries, entries);
  it("preserves the same projection for DPE and the 5th district", () => {
    expect(projectPublicEntity({ institutionId: "dpe" })).toEqual(projectPublicEntity({ networkActorId: "evt-paris-nettoyages" }));
    expect(projectPublicEntity({ institutionId: "town-hall-05" })).toEqual(projectPublicEntity({ networkActorId: "mairie-paris-5" }));
  });
  it("can search for network-only actors without pretending they are directory entries", () => {
    const syctom = entities.find(entity => entity.id === "collectivite-syctom")!;
    expect(syctom.entry).toBeNull();
    const filters = { searchTerm: "syctom", filterKind: "all", filterContribution: "all", engagementDomain: "all", zoneFilter: "all", targetArrondissement: null } as const;
    expect(matchesNetworkOnlyFilters(syctom, filters)).toBe(true);
    expect(matchesNetworkOnlyFilters(syctom, { ...filters, searchTerm: "impossible" })).toBe(false);
  });
});
