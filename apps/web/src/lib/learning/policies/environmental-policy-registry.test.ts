import { describe, expect, it } from "vitest";
import { validateContentRecord } from "@/lib/content/content-validation";
import {
  ENVIRONMENTAL_POLICY_REGISTRY,
  filterEnvironmentalPolicies,
  formatPolicyDate,
  getEnvironmentalPolicyThemeOptions,
  getInternationalEnvironmentalPolicies,
  getPolicyTimeline,
  getPublishedEnvironmentalPolicies,
} from "./environmental-policy-registry";

const reviewed = (record: (typeof ENVIRONMENTAL_POLICY_REGISTRY)[number]) => ({
  ...record,
  reviewStatus: "verified" as const,
  lastVerifiedAt: "2026-11-13",
  validation: { ...record.validation, status: "published" as const, lastReviewedAt: "2026-11-13", reviewedBy: "Human editor" },
  milestones: record.milestones.map((milestone) => ({ ...milestone, verificationStatus: milestone.verificationStatus === "needs_review" ? "verified" as const : milestone.verificationStatus })),
});

const filters = (view: "world" | "france") => ({ view, query: "", territory: "all" as const, theme: "all", year: "all", legalStatus: "all" as const });

describe("environmental policy registry", () => {
  it("keeps stable event IDs, versions, source links and explicit partial dates", () => {
    expect(ENVIRONMENTAL_POLICY_REGISTRY).toHaveLength(16);
    expect(getInternationalEnvironmentalPolicies()).toHaveLength(11);
    expect(ENVIRONMENTAL_POLICY_REGISTRY.filter((record) => record.territory.countryCode === "FR")).toHaveLength(5);

    const packaging = ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id === "eu-packaging-packaging-waste-regulation");
    expect(packaging?.territories[0].memberCount).toBe(27);
    expect(packaging?.milestones.map((milestone) => milestone.id)).toEqual(expect.arrayContaining([
      "eu-packaging-packaging-waste-regulation-decision",
      "eu-packaging-packaging-waste-regulation-entry",
      "eu-packaging-packaging-waste-regulation-application",
      "eu-packaging-packaging-waste-regulation-2030",
    ]));
    expect(packaging?.milestones.find((milestone) => milestone.category === "entry_into_force")?.date).toEqual({ value: "2025-02-11", precision: "day" });
    expect(packaging?.milestones.find((milestone) => milestone.id.endsWith("-2030"))?.date).toEqual({ value: "2030", precision: "year" });
    expect(packaging?.versions.every((version) => version.sourceIds.length > 0)).toBe(true);

    const brazil = ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id === "brazil-regulated-carbon-market");
    expect(brazil?.milestones.find((milestone) => milestone.category === "entry_into_force")?.date.value).toBe("2024-12-12");
    expect(brazil?.milestones.find((milestone) => milestone.id.endsWith("-operation"))?.date).toEqual({ value: null, precision: "unknown" });

    const india = ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id === "india-pm-e-drive");
    expect(india?.milestones.find((milestone) => milestone.category === "amendment")?.verificationStatus).toBe("needs_review");
    expect(india?.milestones.find((milestone) => milestone.category === "amendment")?.versionId).toBe("india-pm-e-drive-august-2026-pending");
    expect(india?.versions.find((version) => version.id === "india-pm-e-drive-august-2026-pending")?.sourceIds).toContain("india-pm-e-drive-source-notifications-2026");

    const chinaQuotas = ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id === "china-ets-quotas-2026-pending");
    expect(chinaQuotas?.reviewStatus).toBe("needs_review");
    expect(chinaQuotas?.milestones.some((milestone) => milestone.category === "entry_into_force")).toBe(false);
    expect(chinaQuotas?.milestones.find((milestone) => milestone.category === "publication")?.date.value).toBe("2026-09-03");
    expect(ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id === "un-bbnj-agreement")?.territories[0].membership).toBe("parties_only");
    expect(ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id === "fr-biodechets-source-separation")?.decisionDate).toEqual({ value: null, precision: "unknown" });
    expect(ENVIRONMENTAL_POLICY_REGISTRY.every((record) => record.lastConsultedAt === "2026-11-13" && record.lastVerifiedAt === null && record.versions.length > 0)).toBe(true);
  });

  it("does not expose records before human publication approval or when a source is removed", () => {
    expect(getPublishedEnvironmentalPolicies()).toEqual([]);
    expect(ENVIRONMENTAL_POLICY_REGISTRY.every((record) => !validateContentRecord(record.validation).readyForPublication)).toBe(true);

    const packaging = ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id === "eu-packaging-packaging-waste-regulation")!;
    expect(getPublishedEnvironmentalPolicies([reviewed(packaging)])).toHaveLength(1);
    const sourceRemoved = { ...reviewed(packaging), officialSources: packaging.officialSources.map((source) => ({ ...source, url: "" })) };
    expect(getPublishedEnvironmentalPolicies([sourceRemoved])).toEqual([]);
    expect(getPublishedEnvironmentalPolicies([{ ...reviewed(packaging), reviewStatus: "needs_review", validation: { ...packaging.validation, status: "in_review" } }])).toEqual([]);
  });

  it("keeps the past and sorts a chronology with same-day stages without deduplication", () => {
    const packaging = ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id === "eu-packaging-packaging-waste-regulation")!;
    const before = getPolicyTimeline(packaging).map((milestone) => milestone.id);
    const sameDay = { ...packaging, milestones: [...packaging.milestones, { ...packaging.milestones[0], id: "eu-packaging-same-day-publication", kind: "publication" as const, category: "publication" as const }] };
    const timeline = getPolicyTimeline(sameDay);
    expect(timeline.filter((milestone) => milestone.date.value === "2024-12-19")).toHaveLength(2);
    expect(getPolicyTimeline(packaging).map((milestone) => milestone.id)).toEqual(before);
    expect(packaging.previousLastVerifiedAt).toBeNull();
  });

  it("filters a published view without duplicating records between world and France", () => {
    const published = ENVIRONMENTAL_POLICY_REGISTRY.map(reviewed);
    const world = filterEnvironmentalPolicies(published, filters("world"));
    const france = filterEnvironmentalPolicies(published, filters("france"));

    expect(world).toHaveLength(11);
    expect(france).toHaveLength(5);
    expect(new Set(world.map((record) => record.id)).size).toBe(world.length);
    expect(world.every((record) => record.collection === "international")).toBe(true);
    expect(france.every((record) => record.collection === "france" && record.territory.countryCode === "FR")).toBe(true);
    expect(france.every((record) => !record.id.startsWith("eu-"))).toBe(true);
  });

  it("combines search, territory, year and legal status filters", () => {
    const result = filterEnvironmentalPolicies(ENVIRONMENTAL_POLICY_REGISTRY.map(reviewed), { ...filters("france"), query: "industrie", territory: "national", year: "2023", legalStatus: "in_force" });
    expect(result.map((record) => record.id)).toEqual(["fr-green-industry-law"]);
  });

  it("matches a policy when any dated milestone falls in the selected year", () => {
    const publishedPackaging = reviewed(ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id === "eu-packaging-packaging-waste-regulation")!);
    const publishedBrazil = reviewed(ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id === "brazil-regulated-carbon-market")!);

    expect(filterEnvironmentalPolicies([publishedPackaging], { ...filters("world"), year: "2030" }).map((record) => record.id)).toEqual(["eu-packaging-packaging-waste-regulation"]);
    expect(filterEnvironmentalPolicies([publishedPackaging], { ...filters("world"), year: "2026" }).map((record) => record.id)).toEqual(["eu-packaging-packaging-waste-regulation"]);
    expect(filterEnvironmentalPolicies([publishedBrazil], { ...filters("world"), year: "2025" })).toEqual([]);
    expect(filterEnvironmentalPolicies([publishedBrazil], { ...filters("world"), year: "2024" }).map((record) => record.id)).toEqual(["brazil-regulated-carbon-market"]);
  });

  it("keeps theme filter values stable while labels change with locale", () => {
    const published = ENVIRONMENTAL_POLICY_REGISTRY.map(reviewed);
    const frenchOptions = getEnvironmentalPolicyThemeOptions(published, "fr");
    const englishOptions = getEnvironmentalPolicyThemeOptions(published, "en");
    const frenchTheme = frenchOptions.find((option) => option.label === "Déchets et économie circulaire")!;
    const englishTheme = englishOptions.find((option) => option.value === frenchTheme.value)!;

    expect(englishTheme.value).toBe(frenchTheme.value);
    expect(englishTheme.label).toBe("Waste and circular economy");
    expect(filterEnvironmentalPolicies(published, { ...filters("world"), theme: frenchTheme.value }).map((record) => record.id)).toContain("eu-packaging-packaging-waste-regulation");
  });

  it("formats day, month and year precision without inventing a day", () => {
    expect(formatPolicyDate({ value: "2025-03", precision: "month" }, "fr")).toMatch(/mars 2025/i);
    expect(formatPolicyDate({ value: "2023", precision: "year" }, "fr")).toBe("2023");
    expect(formatPolicyDate(null, "fr")).toBe("Non précisée");
  });

  it("uses a documented milestone for an unknown decision and an explicit stable tie-breaker", () => {
    const records = [
      reviewed(ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id === "fr-biodechets-source-separation")!),
      reviewed(ENVIRONMENTAL_POLICY_REGISTRY.find((record) => record.id === "fr-green-industry-law")!),
    ];
    expect(filterEnvironmentalPolicies(records, filters("france"))[0].id).toBe("fr-biodechets-source-separation");

    const sameDate = records.map((record) => ({ ...record, milestones: record.milestones.map((milestone) => ({ ...milestone, date: { value: "2023-01-01", precision: "day" as const } })) }));
    expect(filterEnvironmentalPolicies(sameDate.reverse(), filters("france")).map((record) => record.id)).toEqual(["fr-biodechets-source-separation", "fr-green-industry-law"]);
  });
});
