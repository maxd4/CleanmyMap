import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import { toReportsExportRow } from "./page-data";

describe("reports export impact fields", () => {
  it("keeps declared mass separate from the canonical impact estimate", () => {
    const contract = buildActionDataContract({
      id: "export-butts-only",
      type: "action",
      status: "approved",
      source: "test",
      observedAt: "2026-08-25",
      locationLabel: "Lieu de test",
      latitude: 48.85,
      longitude: 2.35,
      wasteKg: null,
      cigaretteButts: 13_875,
      volunteersCount: 3,
    });

    const row = toReportsExportRow(contract);

    expect(row.Masse_Kg).toBeNull();
    expect(row.Masse_Kg_Declaree).toBeNull();
    expect(row.Masse_Kg_Impact).toBeNull();
    expect(row.Origine_Masse).toBe("none");
    expect(row.CO2e_Proxy_Kg).toBeNull();
    expect(row.Eau_Proxy_L).toBe(6_937_500);
    expect(row.Economie_Voirie_Proxy_EUR).toBeNull();
    expect(row.Bénévoles).toBe(3);
  });
});
