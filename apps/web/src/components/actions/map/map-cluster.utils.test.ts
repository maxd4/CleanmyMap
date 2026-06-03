import { describe, expect, it } from "vitest";
import {
  formatClusterCount,
  resolveClusterAriaLabel,
  resolveClusterDensityTier,
  resolveClusterIconSize,
  resolveClusterRadius,
} from "./map-cluster.utils";

describe("map-cluster utils", () => {
  it("keeps dense zones clustered more aggressively at low zoom", () => {
    expect(resolveClusterRadius(11)).toBe(84);
    expect(resolveClusterRadius(13)).toBe(66);
    expect(resolveClusterRadius(15)).toBe(48);
    expect(resolveClusterRadius(17)).toBe(34);
  });

  it("tiers clusters by density", () => {
    expect(resolveClusterDensityTier(4)).toBe("low");
    expect(resolveClusterDensityTier(8)).toBe("medium");
    expect(resolveClusterDensityTier(20)).toBe("high");
    expect(resolveClusterDensityTier(40)).toBe("dense");
  });

  it("scales cluster icon size with density", () => {
    expect(resolveClusterIconSize(4)).toBe(42);
    expect(resolveClusterIconSize(8)).toBe(48);
    expect(resolveClusterIconSize(20)).toBe(56);
    expect(resolveClusterIconSize(40)).toBe(64);
  });

  it("formats cluster count for readability", () => {
    expect(formatClusterCount(7)).toBe("7");
    expect(formatClusterCount(99)).toBe("99");
    expect(formatClusterCount(100)).toBe("99+");
  });

  it("describes the cluster for assistive tech", () => {
    expect(resolveClusterAriaLabel(1)).toBe("1 action regroupée");
    expect(resolveClusterAriaLabel(5)).toBe("5 actions regroupées");
  });
});
