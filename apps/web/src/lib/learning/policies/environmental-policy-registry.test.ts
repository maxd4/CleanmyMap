import { describe, expect, it } from "vitest";
import { validateContentRecord } from "@/lib/content/content-validation";
import {
  ENVIRONMENTAL_POLICY_REGISTRY,
  filterEnvironmentalPolicies,
  formatPolicyDate,
  getInternationalEnvironmentalPolicies,
  getPublishedEnvironmentalPolicies,
} from "./environmental-policy-registry";

describe("environmental policy registry", () => {
  it("keeps the prepared corpus in one registry and records partial dates", () => {
    expect(ENVIRONMENTAL_POLICY_REGISTRY).toHaveLength(13);
    expect(getInternationalEnvironmentalPolicies()).toHaveLength(10);
    expect(ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id.includes("carbon-border"))?.decisionDate.precision).toBe("year");
    expect(ENVIRONMENTAL_POLICY_REGISTRY.filter((record) => record.territory.countryCode === "FR")).toHaveLength(3);
    expect(ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id === "eu-packaging-packaging-waste-regulation")?.territories[0].memberCount).toBe(27);
    expect(ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id === "un-bbnj-agreement")?.territories[0].membership).toBe("parties_only");
    expect(ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id === "eu-packaging-packaging-waste-regulation")?.milestones.some((milestone) => milestone.date.value === "2030")).toBe(true);
    expect(ENVIRONMENTAL_POLICY_REGISTRY.every((record) => record.lastConsultedAt === "2026-11-13" && record.lastVerifiedAt === null && record.versions.length === 0)).toBe(true);
  });

  it("does not expose records before human publication approval", () => {
    expect(getPublishedEnvironmentalPolicies()).toEqual([]);
    expect(ENVIRONMENTAL_POLICY_REGISTRY.every((record) => !validateContentRecord(record.validation).readyForPublication)).toBe(true);
  });

  it("filters a published view without duplicating records between world and France", () => {
    const published = ENVIRONMENTAL_POLICY_REGISTRY.map((record) => ({ ...record, validation: { ...record.validation, status: "published" as const, lastReviewedAt: "2026-11-13", reviewedBy: "Human editor" } }));
    const world = filterEnvironmentalPolicies(published, { view: "world", query: "", territory: "all", theme: "all", year: "all", legalStatus: "all" });
    const france = filterEnvironmentalPolicies(published, { view: "france", query: "", territory: "all", theme: "all", year: "all", legalStatus: "all" });

    expect(world).toHaveLength(10);
    expect(france).toHaveLength(3);
    expect(new Set(world.map((record) => record.id)).size).toBe(world.length);
    expect(world.every((record) => record.collection === "international")).toBe(true);
    expect(france.every((record) => record.collection === "france")).toBe(true);
  });

  it("combines search, territory, year and legal status filters", () => {
    const records = ENVIRONMENTAL_POLICY_REGISTRY.map((record) => ({ ...record, validation: { ...record.validation, status: "published" as const, lastReviewedAt: "2026-11-13", reviewedBy: "Human editor" } }));
    const result = filterEnvironmentalPolicies(records, { view: "france", query: "industrie", territory: "national", theme: "all", year: "2023", legalStatus: "in_force" });
    expect(result.map((record) => record.id)).toEqual(["fr-green-industry-law"]);
  });

  it("formats day, month and year precision without inventing a day", () => {
    expect(formatPolicyDate({ value: "2025-03", precision: "month" }, "fr")).toMatch(/mars 2025/i);
    expect(formatPolicyDate({ value: "2023", precision: "year" }, "fr")).toBe("2023");
    expect(formatPolicyDate(null, "fr")).toBe("Non précisée");
  });

  it("sorts by the recorded milestone without padding partial dates", () => {
    const records = getInternationalEnvironmentalPolicies().map((record) => ({ ...record, validation: { ...record.validation, status: "published" as const, lastReviewedAt: "2026-11-13", reviewedBy: "Human editor" } }));
    const sorted = filterEnvironmentalPolicies(records, { view: "world", query: "", territory: "all", theme: "all", year: "all", legalStatus: "all" });

    expect(sorted[0].id).toBe("china-national-carbon-market-expansion");
    expect(sorted.findIndex((record) => record.id === "eu-packaging-packaging-waste-regulation")).toBeLessThan(sorted.findIndex((record) => record.id === "un-bbnj-agreement"));
  });
});
