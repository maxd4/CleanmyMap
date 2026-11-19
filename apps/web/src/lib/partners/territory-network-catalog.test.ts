import { describe, expect, it } from "vitest";
import {
  DEFAULT_TERRITORY_ID,
  getTerritoryNetworkDataset,
} from "./territory-network-catalog";
import {
  FRENCH_COG_REGIONS,
  FRENCH_OVERSEAS_COLLECTIVITIES,
  OIF_AND_FRANCOPHONE_SUBDIVISIONS,
  TERRITORY_NETWORK_CATALOG,
} from "./territory-network-catalog.data";
import {
  rankTerritoriesByContext,
  resolveTerritoryFromLocationSelection,
  searchTerritories,
} from "./territory-network-ranking";

describe("territory-network-catalog & ranking", () => {
  it("contains all 18 COG regions, 8 overseas collectivities, OIF states/subdivisions with unique IDs", () => {
    expect(FRENCH_COG_REGIONS).toHaveLength(18);
    expect(FRENCH_OVERSEAS_COLLECTIVITIES).toHaveLength(8);
    expect(OIF_AND_FRANCOPHONE_SUBDIVISIONS.length).toBeGreaterThan(50);

    const ids = TERRITORY_NETWORK_CATALOG.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    const expectedCogCodes = [
      "01", "02", "03", "04", "06", "11", "24", "27", "28",
      "32", "44", "52", "53", "75", "76", "84", "93", "94",
    ];
    expect(FRENCH_COG_REGIONS.map((item) => item.code)).toEqual(expectedCogCodes);

    const expectedOutreMerCodes = ["975", "977", "978", "984", "986", "987", "988", "989"];
    expect(FRENCH_OVERSEAS_COLLECTIVITIES.map((item) => item.code)).toEqual(
      expectedOutreMerCodes,
    );

    // Uninhabited territories (984 TAAF, 989 Clipperton) excluded from proximity
    const byId = new Map(TERRITORY_NETWORK_CATALOG.map((item) => [item.id, item]));
    expect(byId.get("FR:COM:984")?.hasPermanentPopulation).toBe(false);
    expect(byId.get("FR:COM:989")?.hasPermanentPopulation).toBe(false);
    expect(byId.get("OIF:CA-QC")?.nameFr).toBe("Québec");
    expect(byId.get("SUB:BE-WAL")?.nameFr).toBe("Wallonie");
    expect(byId.get("SUB:BE-WAL")?.oifStatus).toBeUndefined();
    expect(byId.get("SUB:BE-BRU")?.oifStatus).toBeUndefined();
    expect(byId.get("SUB:CH-GE")?.oifStatus).toBeUndefined();
    // France is not duplicated in OIF
    expect(byId.get("OIF:FR")).toBeUndefined();
  });

  it("reconciles the 92 OIF entities (53 members, 5 associates, 34 observers) as of November 2026", () => {
    const byId = new Map(TERRITORY_NETWORK_CATALOG.map((item) => [item.id, item]));
    const oifTagged = TERRITORY_NETWORK_CATALOG.filter((item) => item.oifStatus !== undefined);
    const membersWithoutFrance = oifTagged.filter((item) => item.oifStatus === "membre");
    const associates = oifTagged.filter((item) => item.oifStatus === "associe");
    const observers = oifTagged.filter((item) => item.oifStatus === "observateur");

    // 52 external members + France (represented by FR:*) = 53 full members
    expect(membersWithoutFrance).toHaveLength(52);
    expect(associates).toHaveLength(5);
    expect(observers).toHaveLength(34);

    // 2025 withdrawals removed
    expect(byId.get("OIF:BF")).toBeUndefined();
    expect(byId.get("OIF:ML")).toBeUndefined();
    expect(byId.get("OIF:NE")).toBeUndefined();

    // Chypre & Ghana promoted to full members; Belgique & FWB distinct
    expect(byId.get("OIF:CY")?.oifStatus).toBe("membre");
    expect(byId.get("OIF:GH")?.oifStatus).toBe("membre");
    expect(byId.get("OIF:BE")?.nameFr).toBe("Belgique");
    expect(byId.get("OIF:BE-FWB")?.nameFr).toBe("Fédération Wallonie-Bruxelles");
    expect(byId.get("OIF:BE-FWB")?.oifStatus).toBe("membre");

    // French overseas territories carry OIF status without duplication
    expect(byId.get("FR:COM:988")?.oifStatus).toBe("associe");
    expect(byId.get("FR:COM:987")?.oifStatus).toBe("observateur");
    expect(byId.get("OIF:NC")).toBeUndefined();
    expect(OIF_AND_FRANCOPHONE_SUBDIVISIONS.some((item) => item.code === "988")).toBe(false);

    // Nov 2026 admissions & missing observers included
    for (const code of ["KN", "CA-MB", "AO", "CL", "GM", "MT", "US-LA", "CA-ON", "CA-NS", "DE-SL"]) {
      expect(byId.get(`OIF:${code}`)?.oifStatus).toBe("observateur");
    }
  });

  it("searches by accent-insensitive name, numeric code, and country", () => {
    const idfByAccentless = searchTerritories("ile-de-france");
    expect(idfByAccentless.some((item) => item.id === "FR:REG:11")).toBe(true);

    const idfByCode = searchTerritories("11");
    expect(idfByCode.some((item) => item.id === "FR:REG:11")).toBe(true);

    const quebec = searchTerritories("quebec");
    expect(quebec.some((item) => item.id === "OIF:CA-QC")).toBe(true);

    const spm = searchTerritories("975");
    expect(spm.some((item) => item.id === "FR:COM:975")).toBe(true);
  });

  it("ranks by GPS first, excludes uninhabited 984/989, and marks geodesic approximation", () => {
    // Near Paris (48.8566, 2.3522)
    const parisRanked = rankTerritoriesByContext({
      gpsCoords: [48.86, 2.35],
    });
    expect(parisRanked.rankingSource).toBe("gps");
    expect(parisRanked.isGeodesicApproximation).toBe(true);
    expect(parisRanked.suggestions[0].id).toBe("FR:REG:11");
    expect(parisRanked.suggestions[1].id).not.toBe("FR:REG:11");

    // Near Clipperton (10.3, -109.2) -> 989 must NEVER be suggested
    const pacificRanked = rankTerritoriesByContext({
      gpsCoords: [10.3, -109.2],
    });
    expect(pacificRanked.suggestions.map((s) => s.id)).not.toContain("FR:COM:989");
    expect(pacificRanked.suggestions.map((s) => s.id)).not.toContain("FR:COM:984");

    // Near Brussels (50.8503, 4.3517): BE, BE-FWB and SUB:BE-BRU share coordinates -> never monopolize both suggestions
    const brusselsRanked = rankTerritoriesByContext({
      gpsCoords: [50.8503, 4.3517],
    });
    const [first, second] = brusselsRanked.suggestions;
    expect(first.representativePoint).not.toEqual(second.representativePoint);
  });

  it("ranks by Clerk residence & work preferences with deduplication and foreign handling", () => {
    const prefsRanked = rankTerritoriesByContext({
      locationPreferences: {
        residence: {
          country: "FR",
          level: "arrondissement",
          label: "Paris 5e",
          subtitle: null,
          arrondissement: 5,
          arrondissementCity: "Paris",
        },
        work: {
          country: "CA",
          level: "region",
          label: "Québec",
          subtitle: "Canada",
          arrondissement: null,
          arrondissementCity: null,
          administrativeCode: "CA-QC",
        },
      },
    });
    expect(prefsRanked.rankingSource).toBe("account_preferences");
    expect(prefsRanked.suggestions.map((s) => s.id)).toEqual([
      "FR:REG:11",
      "OIF:CA-QC",
    ]);

    // Deduplicates identical residence & work and completes 2nd suggestion
    const dedupRanked = rankTerritoriesByContext({
      locationPreferences: {
        residence: {
          country: "FR",
          level: "region",
          label: "Bretagne",
          subtitle: null,
          arrondissement: null,
          arrondissementCity: null,
          administrativeCode: "53",
        },
        work: {
          country: "FR",
          level: "region",
          label: "Bretagne",
          subtitle: null,
          arrondissement: null,
          arrondissementCity: null,
          administrativeCode: "53",
        },
      },
    });
    expect(dedupRanked.suggestions[0].id).toBe("FR:REG:53");
    expect(dedupRanked.suggestions[1].id).not.toBe("FR:REG:53");

    // Foreign unmapped country never maps to a French region
    expect(
      resolveTerritoryFromLocationSelection({
        country: "JP",
        level: "country",
        label: "Tokyo",
        subtitle: null,
        arrondissement: null,
        arrondissementCity: null,
      }),
    ).toBeNull();
  });

  it("falls back to deterministic INSEE order when no GPS or account preferences exist", () => {
    const defaultRanked = rankTerritoriesByContext({});
    expect(defaultRanked.rankingSource).toBe("default_insee");
    expect(defaultRanked.suggestions.map((s) => s.code)).toEqual(["01", "02"]);
  });

  it("returns dataset only for Paris pilot FR:REG:11 and null for empty territories", () => {
    const paris = getTerritoryNetworkDataset(DEFAULT_TERRITORY_ID);
    expect(paris?.isPilot).toBe(true);
    expect(paris?.actors.length).toBe(26);
    expect(getTerritoryNetworkDataset("FR:REG:53")).toBeNull();
    expect(getTerritoryNetworkDataset("OIF:CA-QC")).toBeNull();
  });
});
