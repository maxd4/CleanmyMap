import { describe, expect, it } from "vitest";
import {
  canAccessChatChannel,
  getVisibleChatChannelTypes,
  isChatChannelType,
  getTerritoryFilter,
  extractZoneContextFromMetadata,
  getZoneLabel,
} from "./channels";

describe("chat channels", () => {
  it("recognizes the supported channel types", () => {
    expect(isChatChannelType("community")).toBe(true);
    expect(isChatChannelType("dm")).toBe(true);
    expect(isChatChannelType("admin_elu")).toBe(true);
    expect(isChatChannelType("territory")).toBe(true);
    expect(isChatChannelType("bug_report")).toBe(true);
    expect(isChatChannelType("neighborhood")).toBe(false);
  });

  it("limits the admin channel to admin or elected profiles", () => {
    expect(
      canAccessChatChannel("admin_elu", {
        roleLabel: "benevole",
        hasArrondissement: true,
        hasGreaterParisZone: false,
        zoneContext: null,
      }),
    ).toBe(false);
    expect(
      canAccessChatChannel("admin_elu", {
        roleLabel: "elu",
        hasArrondissement: true,
        hasGreaterParisZone: false,
        zoneContext: null,
      }),
    ).toBe(true);
    expect(
      canAccessChatChannel("admin_elu", {
        roleLabel: "admin",
        hasArrondissement: true,
        hasGreaterParisZone: false,
        zoneContext: null,
      }),
    ).toBe(true);
    expect(
      canAccessChatChannel("admin_elu", {
        roleLabel: "max",
        hasArrondissement: true,
        hasGreaterParisZone: false,
        zoneContext: null,
      }),
    ).toBe(true);
  });

  it("keeps territory hidden until a zone exists", () => {
    expect(
      canAccessChatChannel("territory", {
        roleLabel: "benevole",
        hasArrondissement: false,
        hasGreaterParisZone: false,
        zoneContext: null,
      }),
    ).toBe(false);
    expect(
      getVisibleChatChannelTypes({
        roleLabel: "benevole",
        hasArrondissement: false,
        hasGreaterParisZone: false,
        zoneContext: null,
      }),
    ).toEqual(["community", "dm", "bug_report"]);
  });

  it("allows territory with arrondissement", () => {
    expect(
      canAccessChatChannel("territory", {
        roleLabel: "benevole",
        hasArrondissement: true,
        hasGreaterParisZone: false,
        zoneContext: { zoneName: null, arrondissementId: 15 },
      }),
    ).toBe(true);
  });

  it("allows territory with Greater Paris zone", () => {
    expect(
      canAccessChatChannel("territory", {
        roleLabel: "benevole",
        hasArrondissement: false,
        hasGreaterParisZone: true,
        zoneContext: { zoneName: "Boulogne-Billancourt", arrondissementId: null },
      }),
    ).toBe(true);
  });
});

describe("getTerritoryFilter", () => {
  it("returns arrondissement IDs for Paris arrondissement", () => {
    const filter = getTerritoryFilter({
      zoneName: null,
      arrondissementId: 15,
    });
    expect(filter.arrondissementIds).toEqual([15, 6, 7, 14, 16]);
    expect(filter.zoneNames).toEqual(
      expect.arrayContaining([
        "Issy-les-Moulineaux",
        "Vanves",
        "Malakoff",
        "Boulogne-Billancourt",
      ]),
    );
  });

  it("returns arrondissement neighbors when the zone name is a Paris district label", () => {
    const filter = getTerritoryFilter({
      zoneName: "15e arrondissement",
      arrondissementId: null,
    });
    expect(filter.arrondissementIds).toEqual([15, 6, 7, 14, 16]);
    expect(filter.zoneNames).toEqual(
      expect.arrayContaining([
        "Issy-les-Moulineaux",
        "Vanves",
        "Malakoff",
        "Boulogne-Billancourt",
      ]),
    );
  });

  it("returns zone names for Greater Paris zone", () => {
    const filter = getTerritoryFilter({
      zoneName: "Montreuil",
      arrondissementId: null,
    });
    expect(filter.zoneNames).not.toBeNull();
    expect(filter.zoneNames).toContain("Montreuil");
  });

  it("returns null for no zone", () => {
    const filter = getTerritoryFilter(null);
    expect(filter.arrondissementIds).toBeNull();
    expect(filter.zoneNames).toBeNull();
  });
});

describe("extractZoneContextFromMetadata", () => {
  it("extracts arrondissement from metadata", () => {
    const ctx = extractZoneContextFromMetadata({ parisArrondissement: 11 });
    expect(ctx.arrondissementId).toBe(11);
    expect(ctx.zoneName).toBeNull();
  });

  it("extracts zone name from metadata", () => {
    const ctx = extractZoneContextFromMetadata({ zoneName: "Boulogne-Billancourt" });
    expect(ctx.zoneName).toBe("Boulogne-Billancourt");
    expect(ctx.arrondissementId).toBeNull();
  });

  it("returns null for empty metadata", () => {
    const ctx = extractZoneContextFromMetadata(null);
    expect(ctx.zoneName).toBeNull();
    expect(ctx.arrondissementId).toBeNull();
  });
});

describe("getZoneLabel", () => {
  it("returns arrondissement label", () => {
    expect(getZoneLabel({ zoneName: null, arrondissementId: 15 })).toBe("15e arrondissement");
  });

  it("returns zone name label", () => {
    expect(getZoneLabel({ zoneName: "Montreuil", arrondissementId: null })).toBe("Montreuil");
  });

  it("returns default for null", () => {
    expect(getZoneLabel(null)).toBe("Aucune zone définie");
  });
});
