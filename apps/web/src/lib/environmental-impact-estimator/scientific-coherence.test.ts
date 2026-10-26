import { describe, expect, it } from "vitest";
import {
  buildElectricityEstimate,
  buildWaterEstimate,
  calculateElectricityCo2e,
  calculateIndirectElectricityWater,
  computeEnvironmentalImpactEstimate,
} from "./index";
import { buildEnvironmentalImpactSnapshot } from "./dashboard-capture";
import type { EnvironmentalImpactProjectSignals } from "./types";

function independentSignals(generatedAt: string): EnvironmentalImpactProjectSignals {
  return {
    generatedAt,
    launchedAt: null,
    accountCreatedAt: null,
    userId: null,
    periodDays: 30,
    recentWindowDays: 30,
    siteInput: {},
    userInput: {},
    infrastructureInput: {},
    codexUsage: null,
    highlights: [],
    notes: [],
  };
}

describe("scientific estimator coherence", () => {
  it("keeps explicit zero source signals distinct from absent reference values", () => {
    const model = computeEnvironmentalImpactEstimate({
      site: {
        pageViews: 0,
        apiRequests: 0,
        storageGbMonths: 0,
      },
    });

    expect(model.infrastructure.usage.monthlyPageViews).toBe(0);
    expect(model.infrastructure.usage.monthlyApiRequests).toBe(0);
    expect(model.infrastructure.usage.monthlyStorageGbMonths).toBe(0);
    expect(model.infrastructure.usage.provenance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "monthlyPageViews", value: 0, source: "derived" }),
        expect.objectContaining({ key: "monthlyApiRequests", value: 0, source: "derived" }),
        expect.objectContaining({ key: "monthlyStorageGbMonths", value: 0, source: "derived" }),
      ]),
    );
    expect(model.infrastructure.usage.provenance).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "monthlyPageViews", value: 60_000 }),
        expect.objectContaining({ key: "monthlyStorageGbMonths", value: 0.1 }),
      ]),
    );
  });

  it("preserves the one-way electricity conversion and measured zero", () => {
    expect(calculateElectricityCo2e(1_000, 0.35)).toBe(350);

    const zero = buildElectricityEstimate({ monthlyElectricityKwh: 0 }, 999);
    expect(zero).toMatchObject({
      calculation: "measured_kwh_to_co2e",
      kWh: 0,
      kgCo2e: 0,
      source: "input",
    });

    const proxy = buildElectricityEstimate({ monthlyElectricityKwh: null }, 3.5);
    expect(proxy).toMatchObject({
      calculation: "proxy_equivalent",
      kWh: null,
      kgCo2e: 3.5,
      source: "derived",
    });
  });

  it("keeps water units and absence semantics separate", () => {
    expect(calculateIndirectElectricityWater(1_000, 4.52)).toBe(4_520);

    expect(buildWaterEstimate({
      monthlyElectricityKwh: 0,
      monthlyDirectWaterConsumptionLiters: 0,
      monthlyEvaporatedWaterLiters: 0,
    })).toMatchObject({
      indirectElectricityWaterLiters: 0,
      totalWaterConsumptionLiters: 0,
      availability: "available",
    });

    expect(buildWaterEstimate({
      monthlyElectricityKwh: null,
      monthlyDirectWaterConsumptionLiters: null,
      monthlyEvaporatedWaterLiters: null,
    })).toMatchObject({
      indirectElectricityWaterLiters: null,
      totalWaterConsumptionLiters: null,
      availability: "missing",
      source: "missing",
    });
  });

  it("carries calculation, version, period date and provenance into a snapshot", () => {
    const generatedAt = "2026-10-26T23:30:00.000Z";
    const model = computeEnvironmentalImpactEstimate({
      generatedAt,
      infrastructure: { usage: { monthlyElectricityKwh: 10 } },
    });
    const signals = independentSignals(generatedAt);
    const snapshot = buildEnvironmentalImpactSnapshot({ model, signals });

    expect(snapshot).toMatchObject({
      snapshotKey: "cleanmymap-project",
      snapshotDate: "2026-10-26",
      generatedAt,
      version: model.version,
      model,
      signals,
    });
    expect(snapshot.model.methodology.electricity.calculation).toBe(
      "measured_kwh_to_co2e",
    );
    expect(snapshot.model.methodology.electricity.kWh).toBe(10);
    expect(snapshot.model.methodology.electricity.kgCo2e).toBe(3.5);
  });
});
