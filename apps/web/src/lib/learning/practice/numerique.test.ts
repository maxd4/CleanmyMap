import { describe, expect, it } from "vitest";
import { validateContentRecord } from "@/lib/content/content-validation";
import {
  NUMERIQUE_CO2_FACTORS,
  NUMERIQUE_CONTENT_VALIDATION_RECORDS,
  NUMERIQUE_GMAIL_SUBSCRIPTIONS_SHORTCUT,
  NUMERIQUE_ORDER_OF_MAGNITUDE,
  calculateAvoidedUnreadSpam,
  calculateCloudStorageImpact,
} from "./numerique";

describe("numerique learning content", () => {
  it("centralizes the factors and derives both orders of magnitude", () => {
    expect(NUMERIQUE_CO2_FACTORS).toEqual({
      unreadSpamGramsPerEmail: 3.74,
      cloudStorageGramsPerGbYear: 0.24,
      averagePetrolCarGramsPerKm: 170,
    });

    expect(calculateAvoidedUnreadSpam(1_000)).toEqual({
      co2eGrams: 3_740,
      equivalentCarKm: 3_740 / 170,
    });
    expect(calculateCloudStorageImpact(100)).toEqual({
      co2eGrams: 24,
      equivalentCarKm: 24 / 170,
    });
    expect(NUMERIQUE_ORDER_OF_MAGNITUDE.futureSpam.equivalentCarKm).toBeCloseTo(22, 0);
    expect(NUMERIQUE_ORDER_OF_MAGNITUDE.cloudStorage.equivalentCarKm).toBeCloseTo(0.14, 2);
  });

  it("keeps the shortcut optional and the fallback explicit", () => {
    expect(NUMERIQUE_GMAIL_SUBSCRIPTIONS_SHORTCUT).toContain("/#sub");
  });

  it("keeps every new source record publishable and claim types separated", () => {
    expect(NUMERIQUE_CONTENT_VALIDATION_RECORDS).toHaveLength(8);
    expect(NUMERIQUE_CONTENT_VALIDATION_RECORDS.every((record) => record.status === "published")).toBe(true);
    expect(NUMERIQUE_CONTENT_VALIDATION_RECORDS.every((record) => validateContentRecord(record).readyForPublication)).toBe(true);
    expect(NUMERIQUE_CONTENT_VALIDATION_RECORDS.every((record) => record.source.url.startsWith("https://"))).toBe(true);

    for (const record of NUMERIQUE_CONTENT_VALIDATION_RECORDS) {
      expect(record.claims.fact.every((claim) => claim.type === "fact")).toBe(true);
      expect(record.claims.estimate.every((claim) => claim.type === "estimate")).toBe(true);
      expect(record.claims.recommendation.every((claim) => claim.type === "recommendation")).toBe(true);
    }

    expect(
      NUMERIQUE_CONTENT_VALIDATION_RECORDS.flatMap((record) => record.claims.estimate),
    ).toHaveLength(2);
  });
});
