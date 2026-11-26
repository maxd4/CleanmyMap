import { describe, expect, it } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";
import { buildGeoNetworkEntities, getAllGeoRelations, getIncidentGeoRelations } from "./annuaire-geo-network.model";
import { getNetworkLogoDiameter } from "./annuaire-geo-network.visuals";
import { buildNamedMarkerIconHtml } from "./annuaire-map-icon";

describe("geographic network visual contract", () => {
  const entries = INITIAL_ANNUAIRE_ENTRIES.map(entry => ({ ...entry, distanceKm: null }));
  const entities = buildGeoNetworkEntities(entries, entries);
  it("exposes all canonical edges exactly once and preserves incident selection", () => {
    const all = getAllGeoRelations(entities);
    expect(all.length).toBeGreaterThan(0);
    expect(new Set(all.map(item => item.relation.id)).size).toBe(all.length);
    expect(getIncidentGeoRelations("operator-ckfd", entities).map(item => item.relation.id)).toEqual(all.filter(item => item.relation.sourceId === "operator-ckfd" || item.relation.targetId === "operator-ckfd").map(item => item.relation.id));
    expect(all.some(item => !item.hasPlottableLine)).toBe(true);
  });
  it("does not invent a geocode from a verified address", () => {
    const syctom = entities.find(item => item.id === "collectivite-syctom");
    expect(syctom?.publicAddressLabel).toBe("86 rue Regnault, 75013 Paris");
    expect(syctom?.coords).toBeNull();
    expect(syctom?.addressStatus).toBe("verified");
  });
  it("scales the area, bounds marker size and uses an exact pin", () => {
    expect(getNetworkLogoDiameter(0)).toBe(32);
    expect(getNetworkLogoDiameter(10)).toBeGreaterThan(getNetworkLogoDiameter(1));
    expect(getNetworkLogoDiameter(10000)).toBe(92);
    expect(getNetworkLogoDiameter(NaN)).toBe(32);
    const marker = buildNamedMarkerIconHtml({ name: "CleanMyMap", logoPath: "/brand/logo-court.png", neighbours: 8 });
    expect(marker).toContain('src="/brand/logo-court.png"');
    expect(marker).toContain("M9 24");
    expect(buildNamedMarkerIconHtml({ name: "X", logoPath: "https://example.org/track.png" })).not.toContain("https://example.org");
  });
});
