import { describe, it, expect } from "vitest";
import {
  PARIS_DISTRICTS,
  getBorderDistricts,
  getSuburbsForDistrict,
  isBorderDistrict,
  getAllSuburbs,
  findDistrictByName,
  isParisDistrict,
  isSuburb,
  ALL_NEIGHBORHOODS,
  getNeighbors,
  findZoneWithNeighbors,
  getZonesInSameDepartment,
  getZonesByType,
  isGreaterParisZone,
  getAreaTypeForZone,
  getDepartmentForZone,
} from "./paris-neighborhood";

describe("PARIS_DISTRICTS", () => {
  it("should have 20 districts", () => {
    expect(PARIS_DISTRICTS).toHaveLength(20);
  });

  it("should have correct district numbers", () => {
    expect(PARIS_DISTRICTS[0].number).toBe(1);
    expect(PARIS_DISTRICTS[19].number).toBe(20);
  });
});

describe("getBorderDistricts", () => {
  it("should return districts with adjacent suburbs", () => {
    const borderDistricts = getBorderDistricts();
    expect(borderDistricts.length).toBeGreaterThan(0);
    borderDistricts.forEach((d) => {
      expect(d.adjacentSuburbs.length).toBeGreaterThan(0);
    });
  });
});

describe("getSuburbsForDistrict", () => {
  it("should return suburbs for district 1", () => {
    const suburbs = getSuburbsForDistrict(1);
    expect(suburbs).toContain("Neuilly-sur-Seine");
    expect(suburbs).toContain("Levallois-Perret");
  });

  it("should return empty array for unknown district", () => {
    expect(getSuburbsForDistrict(99)).toEqual([]);
  });
});

describe("isBorderDistrict", () => {
  it("should return true for border districts", () => {
    expect(isBorderDistrict(1)).toBe(true);
    expect(isBorderDistrict(20)).toBe(true);
  });

  it("should return false for non-border districts", () => {
    const nonBorder = PARIS_DISTRICTS.filter((d) => d.adjacentSuburbs.length === 0);
    if (nonBorder.length > 0) {
      expect(isBorderDistrict(nonBorder[0].number)).toBe(false);
    }
  });
});

describe("getAllSuburbs", () => {
  it("should return sorted unique suburbs", () => {
    const suburbs = getAllSuburbs();
    expect(suburbs.length).toBeGreaterThan(0);
    expect(suburbs).toEqual([...suburbs].sort());
  });
});

describe("findDistrictByName", () => {
  it("should find district by number", () => {
    expect(findDistrictByName("1")?.number).toBe(1);
    expect(findDistrictByName("15")?.number).toBe(15);
  });

  it("should find district by name", () => {
    expect(findDistrictByName("15e arrondissement")?.number).toBe(15);
    expect(findDistrictByName("20ème arrondissement")?.number).toBe(20);
  });

  it("should return null for unknown name", () => {
    expect(findDistrictByName("invalid")).toBeNull();
  });
});

describe("isParisDistrict", () => {
  it("should return true for paris districts", () => {
    expect(isParisDistrict("15")).toBe(true);
    expect(isParisDistrict("15e arrondissement")).toBe(true);
  });

  it("should return false for non-district names", () => {
    expect(isParisDistrict("Boulogne-Billancourt")).toBe(false);
  });
});

describe("isSuburb", () => {
  it("should return true for suburbs", () => {
    expect(isSuburb("Neuilly-sur-Seine")).toBe(true);
    expect(isSuburb("Courbevoie")).toBe(true);
  });

  it("should return false for non-suburbs", () => {
    expect(isSuburb("Paris")).toBe(false);
    expect(isSuburb("15e arrondissement")).toBe(false);
  });
});

describe("ALL_NEIGHBORHOODS - Greater Paris", () => {
  it("should have all Greater Paris zones", () => {
    expect(ALL_NEIGHBORHOODS.length).toBeGreaterThan(20);
  });

  it("should include Paris arrondissements", () => {
    const parisZones = ALL_NEIGHBORHOODS.filter((z) => z.areaType === "paris");
    expect(parisZones.length).toBe(20);
  });

  it("should include petite couronne zones", () => {
    const petiteZones = ALL_NEIGHBORHOODS.filter((z) => z.areaType === "petite_couronne");
    expect(petiteZones.length).toBeGreaterThan(0);
  });

  it("should include grande couronne zones", () => {
    const grandeZones = ALL_NEIGHBORHOODS.filter((z) => z.areaType === "grande_couronne");
    expect(grandeZones.length).toBeGreaterThan(0);
  });
});

describe("getNeighbors", () => {
  it("should return neighbors for Paris arrondissement", () => {
    const neighbors = getNeighbors("15e arrondissement");
    expect(neighbors.length).toBeGreaterThan(0);
  });

  it("should return neighbors for suburb commune", () => {
    const neighbors = getNeighbors("Neuilly-sur-Seine");
    expect(neighbors.length).toBeGreaterThan(0);
  });

  it("should return empty for unknown zone", () => {
    expect(getNeighbors("Unknown Zone")).toEqual([]);
  });
});

describe("findZoneWithNeighbors", () => {
  it("should find Paris arrondissement", () => {
    const zone = findZoneWithNeighbors("15e arrondissement");
    expect(zone?.department).toBe("75");
    expect(zone?.areaType).toBe("paris");
    expect(zone?.adjacentZones.length).toBeGreaterThan(0);
  });

  it("should find commune in petite couronne", () => {
    const zone = findZoneWithNeighbors("Boulogne-Billancourt");
    expect(zone?.department).toBe("92");
    expect(zone?.areaType).toBe("petite_couronne");
  });

  it("should find commune in grande couronne", () => {
    const zone = findZoneWithNeighbors("Melun");
    expect(zone?.department).toBe("77");
    expect(zone?.areaType).toBe("grande_couronne");
  });

  it("should return null for unknown zone", () => {
    expect(findZoneWithNeighbors("Unknown City")).toBeNull();
  });
});

describe("getZonesInSameDepartment", () => {
  it("should return all zones in same department", () => {
    const zones = getZonesInSameDepartment("Montreuil");
    expect(zones.length).toBeGreaterThan(1);
    expect(zones).toContain("Montreuil");
  });

  it("should return empty for unknown zone", () => {
    expect(getZonesInSameDepartment("Unknown")).toEqual([]);
  });
});

describe("getZonesByType", () => {
  it("should return Paris zones", () => {
    const zones = getZonesByType("paris");
    expect(zones.length).toBe(20);
    expect(zones.every((z) => z.areaType === "paris")).toBe(true);
  });

  it("should return petite couronne zones", () => {
    const zones = getZonesByType("petite_couronne");
    expect(zones.every((z) => z.areaType === "petite_couronne")).toBe(true);
  });

  it("should return grande couronne zones", () => {
    const zones = getZonesByType("grande_couronne");
    expect(zones.every((z) => z.areaType === "grande_couronne")).toBe(true);
  });
});

describe("isGreaterParisZone", () => {
  it("should return true for Paris arrondissement", () => {
    expect(isGreaterParisZone("15e arrondissement")).toBe(true);
  });

  it("should return true for petite couronne commune", () => {
    expect(isGreaterParisZone("Boulogne-Billancourt")).toBe(true);
    expect(isGreaterParisZone("Montreuil")).toBe(true);
  });

  it("should return true for grande couronne commune", () => {
    expect(isGreaterParisZone("Melun")).toBe(true);
    expect(isGreaterParisZone("Versailles")).toBe(true);
  });

  it("should return false for non-Greater Paris", () => {
    expect(isGreaterParisZone("Lyon")).toBe(false);
    expect(isGreaterParisZone("Marseille")).toBe(false);
  });
});

describe("getAreaTypeForZone", () => {
  it("should return paris for arrondissement", () => {
    expect(getAreaTypeForZone("15e arrondissement")).toBe("paris");
  });

  it("should return petite_couronne for suburb", () => {
    expect(getAreaTypeForZone("Boulogne-Billancourt")).toBe("petite_couronne");
  });

  it("should return grande_couronne for outer commune", () => {
    expect(getAreaTypeForZone("Melun")).toBe("grande_couronne");
  });

  it("should return null for unknown zone", () => {
    expect(getAreaTypeForZone("Unknown")).toBeNull();
  });
});

describe("getDepartmentForZone", () => {
  it("should return department code for Paris", () => {
    expect(getDepartmentForZone("15e arrondissement")).toBe("75");
  });

  it("should return department code for suburb", () => {
    expect(getDepartmentForZone("Boulogne-Billancourt")).toBe("92");
  });

  it("should return null for unknown zone", () => {
    expect(getDepartmentForZone("Unknown")).toBeNull();
  });
});