import { afterEach, describe, expect, it, vi } from "vitest";

const IMPACT_PROXY_ENV_KEYS = [
  "IMPACT_PROXY_VERSION",
  "IMPACT_PROXY_WATER_LITERS_PER_CIGARETTE_BUTT",
  "IMPACT_PROXY_CO2_KG_PER_WASTE_KG",
  "IMPACT_PROXY_SURFACE_M2_PER_WASTE_KG",
  "IMPACT_PROXY_SURFACE_M2_PER_VOLUNTEER_MINUTE",
] as const;

const originalEnvironment = Object.fromEntries(
  IMPACT_PROXY_ENV_KEYS.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  for (const key of IMPACT_PROXY_ENV_KEYS) {
    const value = originalEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.resetModules();
});

describe("impact proxy configuration", () => {
  it("applies finite custom factors and trims the version used by consumers", async () => {
    process.env.IMPACT_PROXY_VERSION = "  impact-proxy-test-v9  ";
    process.env.IMPACT_PROXY_WATER_LITERS_PER_CIGARETTE_BUTT = "600";
    process.env.IMPACT_PROXY_CO2_KG_PER_WASTE_KG = "1.5";
    process.env.IMPACT_PROXY_SURFACE_M2_PER_WASTE_KG = "3";
    process.env.IMPACT_PROXY_SURFACE_M2_PER_VOLUNTEER_MINUTE = "0.2";
    vi.resetModules();

    const { IMPACT_PROXY_CONFIG } = await import("./impact-proxy-config");

    expect(IMPACT_PROXY_CONFIG.version).toBe("impact-proxy-test-v9");
    expect(IMPACT_PROXY_CONFIG.factors).toMatchObject({
      waterLitersPerCigaretteButt: 600,
      co2KgPerWasteKg: 1.5,
      surfaceM2PerWasteKg: 3,
      surfaceM2PerVolunteerMinute: 0.2,
    });
  });

  it("falls back per factor for malformed, negative or over-limit custom values", async () => {
    process.env.IMPACT_PROXY_VERSION = "   ";
    process.env.IMPACT_PROXY_WATER_LITERS_PER_CIGARETTE_BUTT = "not-a-number";
    process.env.IMPACT_PROXY_CO2_KG_PER_WASTE_KG = "-1";
    process.env.IMPACT_PROXY_SURFACE_M2_PER_WASTE_KG = "1000001";
    process.env.IMPACT_PROXY_SURFACE_M2_PER_VOLUNTEER_MINUTE = "0";
    vi.resetModules();

    const { IMPACT_PROXY_CONFIG } = await import("./impact-proxy-config");

    expect(IMPACT_PROXY_CONFIG.version).toBe("impact-proxy-2026.04-v1");
    expect(IMPACT_PROXY_CONFIG.factors).toMatchObject({
      waterLitersPerCigaretteButt: 500,
      co2KgPerWasteKg: 1.2,
      surfaceM2PerWasteKg: 2.5,
      surfaceM2PerVolunteerMinute: 0,
    });
  });
});
