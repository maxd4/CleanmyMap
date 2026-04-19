import { describe, expect, it } from "vitest";
import { IMPACT_PROXY_CONFIG } from "./impact-proxy-config";
import {
  buildPersonalImpactMethodology,
  computePersonalImpactMetrics,
} from "./progression-impact";
import type { ActionRow } from "./progression-types";

function actionRow(input: Partial<ActionRow>): ActionRow {
  return {
    id: input.id ?? "action_1",
    created_at: input.created_at ?? "2026-04-18T10:00:00.000Z",
    created_by_clerk_id: input.created_by_clerk_id ?? "user_1",
    actor_name: input.actor_name ?? "Alex",
    action_date: input.action_date ?? "2026-04-18",
    location_label: input.location_label ?? "Paris",
    latitude: input.latitude ?? 48.85,
    longitude: input.longitude ?? 2.35,
    waste_kg: input.waste_kg ?? 0,
    cigarette_butts: input.cigarette_butts ?? 0,
    volunteers_count: input.volunteers_count ?? 1,
    duration_minutes: input.duration_minutes ?? 0,
    status: input.status ?? "approved",
    notes: input.notes ?? null,
    manual_drawing: input.manual_drawing ?? null,
  };
}

describe("computePersonalImpactMetrics", () => {
  it("uses only approved actions and computes proxies", () => {
    const metrics = computePersonalImpactMetrics([
      actionRow({
        waste_kg: 10,
        cigarette_butts: 100,
        duration_minutes: 60,
        volunteers_count: 2,
      }),
      actionRow({
        id: "action_2",
        waste_kg: 4,
        cigarette_butts: 30,
        duration_minutes: 30,
        volunteers_count: 1,
      }),
      actionRow({
        id: "action_3",
        status: "pending",
        waste_kg: 99,
        cigarette_butts: 999,
      }),
    ]);

    const factors = IMPACT_PROXY_CONFIG.factors;
    const approvedButts = 100 + 30;
    const approvedWasteKg = 10 + 4;
    const approvedVolunteerMinutes = 60 * 2 + 30 * 1;

    expect(metrics.waterSavedLiters).toBe(
      Math.round(approvedButts * factors.waterLitersPerCigaretteButt),
    );
    expect(metrics.co2AvoidedKg).toBe(
      Math.round(approvedWasteKg * factors.co2KgPerWasteKg * 10) / 10,
    );
    expect(metrics.surfaceCleanedM2).toBe(
      Math.round(
        (approvedWasteKg * factors.surfaceM2PerWasteKg +
          approvedVolunteerMinutes * factors.surfaceM2PerVolunteerMinute) *
          10,
      ) / 10,
    );
  });

  it("exposes versioned methodology with formulas, assumptions and uncertainty", () => {
    const methodology = buildPersonalImpactMethodology(78.46);
    const factors = IMPACT_PROXY_CONFIG.factors;

    expect(methodology.proxyVersion).toBe(IMPACT_PROXY_CONFIG.version);
    expect(methodology.pollutionScoreAverage).toBe(78.5);
    expect(methodology.formulas).toHaveLength(4);
    expect(methodology.formulas.find((item) => item.id === "water_saved")?.formula).toContain(
      String(factors.waterLitersPerCigaretteButt),
    );
    expect(methodology.formulas.find((item) => item.id === "co2_avoided")?.formula).toContain(
      String(factors.co2KgPerWasteKg),
    );
    expect(methodology.hypotheses.length).toBeGreaterThan(0);
    expect(methodology.approximations.length).toBeGreaterThan(0);
    expect(methodology.errorMargins.waterSavedLitersPct).toBeGreaterThan(0);
  });
});
