import { describe, expect, it } from "vitest";
import {
  buildGreaterParisNominatimSearchUrl,
  buildGreaterParisLeafletBounds,
  buildGreaterParisViewbox,
  isWithinGreaterParisBounds,
  parseNominatimCoordinates,
  ALL_DEPARTMENTS,
  ALL_ZONES,
  getZonesByAreaType,
  getZonesByDepartment,
  getDepartmentByCode,
  isGreaterParisZone,
  findZoneByName,
  extractZoneFromLabel,
  getAreaTypeLabel,
  getZonesForNotification,
} from "./greater-paris";

describe("greater paris geo helpers", () => {
  it("builds a bounded search url for paris plus nearby suburbs", () => {
    const url = buildGreaterParisNominatimSearchUrl("Boulogne-Billancourt");
    expect(url).toContain("https://nominatim.openstreetmap.org/search?");
    expect(url).toContain("bounded=1");
    expect(url).toContain("countrycodes=fr");
    expect(url).toContain("viewbox=2.12%2C48.98%2C2.55%2C48.74");
    expect(buildGreaterParisViewbox()).toBe("2.12,48.98,2.55,48.74");
  });

  it("parses coordinates and filters values outside the perimeter", () => {
    expect(parseNominatimCoordinates({ lat: "48.8566", lon: "2.3522" })).toEqual({
      latitude: 48.8566,
      longitude: 2.3522,
    });
    expect(isWithinGreaterParisBounds(48.8566, 2.3522)).toBe(true);
    expect(isWithinGreaterParisBounds(49.2, 2.3522)).toBe(false);
    expect(parseNominatimCoordinates({ lat: "NaN", lon: "2.3522" })).toBeNull();
  });

  it("builds leaflet bounds for a visible perimeter overlay", () => {
    expect(buildGreaterParisLeafletBounds()).toEqual([
      [48.74, 2.12],
      [48.98, 2.55],
    ]);
  });
});

describe("ALL_DEPARTMENTS", () => {
  it("should have 8 departments", () => {
    expect(ALL_DEPARTMENTS).toHaveLength(8);
  });

  it("should include Paris (75)", () => {
    const paris = ALL_DEPARTMENTS.find((d) => d.code === "75");
    expect(paris?.name).toBe("Paris");
    expect(paris?.areaType).toBe("paris");
  });

  it("should have correct area types", () => {
    expect(ALL_DEPARTMENTS.filter((d) => d.areaType === "paris")).toHaveLength(1);
    expect(ALL_DEPARTMENTS.filter((d) => d.areaType === "petite_couronne")).toHaveLength(3);
    expect(ALL_DEPARTMENTS.filter((d) => d.areaType === "grande_couronne")).toHaveLength(4);
  });
});

describe("ALL_ZONES", () => {
  it("should have zones for all departments", () => {
    const totalCommunes = ALL_DEPARTMENTS.reduce((sum, d) => sum + d.communes.length, 0);
    expect(ALL_ZONES).toHaveLength(totalCommunes);
  });

  it("should include Paris arrondissements", () => {
    const parisZones = getZonesByAreaType("paris");
    expect(parisZones.length).toBe(20);
  });
});

describe("getZonesByAreaType", () => {
  it("should return Paris zones", () => {
    const paris = getZonesByAreaType("paris");
    expect(paris.every((z) => z.areaType === "paris")).toBe(true);
  });

  it("should return petite couronne zones", () => {
    const petite = getZonesByAreaType("petite_couronne");
    expect(petite.every((z) => z.areaType === "petite_couronne")).toBe(true);
  });

  it("should return grande couronne zones", () => {
    const grande = getZonesByAreaType("grande_couronne");
    expect(grande.every((z) => z.areaType === "grande_couronne")).toBe(true);
  });
});

describe("getZonesByDepartment", () => {
  it("should return Paris zones", () => {
    const zones = getZonesByDepartment("75");
    expect(zones.length).toBe(20);
  });

  it("should return Hauts-de-Seine zones", () => {
    const zones = getZonesByDepartment("92");
    expect(zones.length).toBeGreaterThan(0);
    expect(zones[0].departmentName).toBe("Hauts-de-Seine");
  });

  it("should return empty for unknown department", () => {
    expect(getZonesByDepartment("99")).toHaveLength(0);
  });
});

describe("getDepartmentByCode", () => {
  it("should find department by code", () => {
    const dept = getDepartmentByCode("92");
    expect(dept?.name).toBe("Hauts-de-Seine");
  });

  it("should return undefined for unknown code", () => {
    expect(getDepartmentByCode("99")).toBeUndefined();
  });
});

describe("isGreaterParisZone", () => {
  it("should return true for Paris arrondissement", () => {
    expect(isGreaterParisZone("15e arrondissement")).toBe(true);
  });

  it("should return true for suburb commune", () => {
    expect(isGreaterParisZone("Boulogne-Billancourt")).toBe(true);
    expect(isGreaterParisZone("Montreuil")).toBe(true);
  });

  it("should return false for non-Greater Paris", () => {
    expect(isGreaterParisZone("Lyon")).toBe(false);
    expect(isGreaterParisZone("Marseille")).toBe(false);
  });
});

describe("findZoneByName", () => {
  it("should find Paris arrondissement", () => {
    const zone = findZoneByName("15e arrondissement");
    expect(zone?.department).toBe("75");
    expect(zone?.areaType).toBe("paris");
  });

  it("should find commune", () => {
    const zone = findZoneByName("Neuilly-sur-Seine");
    expect(zone?.department).toBe("92");
    expect(zone?.areaType).toBe("petite_couronne");
  });

  it("should return null for unknown zone", () => {
    expect(findZoneByName("Unknown City")).toBeNull();
  });
});

describe("extractZoneFromLabel", () => {
  it("should extract zone from label", () => {
    const zone = extractZoneFromLabel("Action à Montreuil - Rue de la Paix");
    expect(zone?.name).toBe("Montreuil");
  });

  it("should return null if no match", () => {
    expect(extractZoneFromLabel("Action à Tours")).toBeNull();
  });
});

describe("getAreaTypeLabel", () => {
  it("should return correct labels", () => {
    expect(getAreaTypeLabel("paris")).toBe("Paris intra-muros");
    expect(getAreaTypeLabel("petite_couronne")).toBe("Petite couronne (92, 93, 94)");
    expect(getAreaTypeLabel("grande_couronne")).toBe("Grande couronne (77, 78, 91, 95)");
  });
});

describe("getZonesForNotification", () => {
  it("should return all zones in same department", () => {
    const zones = getZonesForNotification("Montreuil");
    expect(zones.length).toBeGreaterThan(0);
    expect(zones).toContain("Montreuil");
  });

  it("should return empty for unknown zone", () => {
    expect(getZonesForNotification("Unknown")).toEqual([]);
  });
});