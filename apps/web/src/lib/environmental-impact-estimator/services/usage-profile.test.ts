import { describe, expect, it } from "vitest";
import type {
  EnvironmentalImpactInfrastructureInput,
  EnvironmentalImpactScopeInput,
  EnvironmentalImpactUsageProfileEstimate,
  EnvironmentalImpactUsageProfileInput,
} from "../types";
import { buildUsageProfileEstimate } from "./usage-profile";

type UsageKey = keyof EnvironmentalImpactUsageProfileEstimate;

const invalidValues = [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

function buildUsage(
  siteInput: EnvironmentalImpactScopeInput | null = null,
  userInput: EnvironmentalImpactScopeInput | null = null,
  usage: EnvironmentalImpactUsageProfileInput | null = null,
) {
  const infrastructureInput: EnvironmentalImpactInfrastructureInput | null = usage
    ? { usage }
    : null;
  return buildUsageProfileEstimate(infrastructureInput, siteInput, userInput);
}

function getProvenance(usage: EnvironmentalImpactUsageProfileEstimate, key: UsageKey) {
  const item = usage.provenance.find((entry) => entry.key === key);
  expect(item, `provenance for ${key}`).toBeDefined();
  return item!;
}

describe("usage profile numeric presence and provenance", () => {
  it.each(invalidValues)(
    "does not treat invalid site pageViews %s as a traffic signal",
    (value) => {
      const usage = buildUsage({ pageViews: value }, { pageViews: 12 });

      expect(usage.monthlyPageViews).toBe(12);
      expect(getProvenance(usage, "monthlyPageViews")).toMatchObject({
        value: 12,
        source: "derived",
      });
    },
  );

  it.each(invalidValues)(
    "falls back to the reference for an invalid-only pageViews signal %s",
    (value) => {
      const usage = buildUsage({ pageViews: value });

      expect(usage.monthlyPageViews).toBe(60_000);
      expect(getProvenance(usage, "monthlyPageViews")).toMatchObject({
        value: 60_000,
        source: "reference",
      });
      expect(usage.derivedFrom).not.toContain("site.pageViews");
    },
  );

  it.each(invalidValues)(
    "does not let invalid site apiRequests %s replace the derived API formula",
    (value) => {
      const usage = buildUsage({ apiRequests: value, pageViews: 100 });

      expect(usage.monthlyApiRequests).toBeGreaterThan(0);
      expect(getProvenance(usage, "monthlyApiRequests")).toMatchObject({
        source: "derived",
      });
      expect(usage.derivedFrom).not.toContain("site.apiRequests");
    },
  );

  it.each(invalidValues)(
    "does not let invalid site storageGbMonths %s erase a valid user storage signal",
    (value) => {
      const usage = buildUsage({ storageGbMonths: value }, { storageGbMonths: 2 });

      expect(usage.monthlyStorageGbMonths).toBe(0.7);
      expect(getProvenance(usage, "monthlyStorageGbMonths")).toMatchObject({
        value: 0.7,
        source: "derived",
      });
    },
  );

  it.each([
    ["pageViews", "monthlyPageViews", 0],
    ["apiRequests", "monthlyApiRequests", 0],
    ["storageGbMonths", "monthlyStorageGbMonths", 0],
] as const)("preserves an explicit zero for %s", (inputKey, outputKey, expected) => {
    const usage = buildUsage({ [inputKey]: 0 });

    expect(usage[outputKey]).toBe(expected);
    expect(getProvenance(usage, outputKey)).toMatchObject({
      value: expected,
      source: "derived",
    });
  });

  it("uses a valid direct API signal exactly once, even with page views present", () => {
    const usage = buildUsage({ apiRequests: 10, pageViews: 100 });

    expect(usage.monthlyApiRequests).toBe(10);
    expect(getProvenance(usage, "monthlyApiRequests")).toMatchObject({
      value: 10,
      source: "derived",
    });
  });

  it("keeps null and undefined absent while retaining reference defaults", () => {
    const absent = buildUsage({});
    const explicitNull = buildUsage({ pageViews: null, apiRequests: null, storageGbMonths: null });

    for (const usage of [absent, explicitNull]) {
      expect(usage.monthlyPageViews).toBe(60_000);
      expect(usage.monthlyStorageGbMonths).toBe(0.1);
      expect(getProvenance(usage, "monthlyPageViews").source).toBe("reference");
      expect(getProvenance(usage, "monthlyStorageGbMonths").source).toBe("reference");
      expect(usage.derivedFrom).not.toContain("site.pageViews");
      expect(usage.derivedFrom).not.toContain("site.storageGbMonths");
    }
  });

  it("does not let invalid scope fields contribute to source metadata", () => {
    const usage = buildUsage({
      pageViews: 0,
      apiRequests: Number.NaN,
      storageGbMonths: Number.POSITIVE_INFINITY,
      storedImages: 3,
    });

    expect(usage.source).toBe("input");
    expect(usage.derivedFrom).toEqual([]);
    expect(getProvenance(usage, "monthlyPageViews")).toMatchObject({ value: 0, source: "derived" });
    expect(getProvenance(usage, "monthlyStorageGbMonths")).toMatchObject({ value: 0.0075, source: "derived" });
  });

  it("uses valid infrastructure usage as input provenance", () => {
    const usage = buildUsage(null, null, {
      monthlyPageViews: 17,
      monthlyApiRequests: 23,
      monthlyStorageGbMonths: 4.5,
    });

    expect(usage).toMatchObject({
      monthlyPageViews: 17,
      monthlyApiRequests: 23,
      monthlyStorageGbMonths: 4.5,
      source: "input",
    });
    expect(getProvenance(usage, "monthlyPageViews")).toMatchObject({ source: "input", value: 17 });
    expect(getProvenance(usage, "monthlyApiRequests")).toMatchObject({ source: "input", value: 23 });
    expect(getProvenance(usage, "monthlyStorageGbMonths")).toMatchObject({ source: "input", value: 4.5 });
  });

  it.each(invalidValues)(
    "does not label invalid direct monthlyPageViews %s as input",
    (value) => {
      const usage = buildUsage(null, null, { monthlyPageViews: value });

      expect(usage.monthlyPageViews).toBe(60_000);
      expect(getProvenance(usage, "monthlyPageViews")).toMatchObject({
        value: 60_000,
        source: "reference",
      });
    },
  );

  it("prefers another valid source when a direct infrastructure value is invalid", () => {
    const usage = buildUsage({ pageViews: 0, apiRequests: 0, storageGbMonths: 0 }, null, {
      monthlyPageViews: Number.NaN,
      monthlyApiRequests: Number.POSITIVE_INFINITY,
      monthlyStorageGbMonths: -1,
    });

    expect(usage).toMatchObject({
      monthlyPageViews: 0,
      monthlyApiRequests: 0,
      monthlyStorageGbMonths: 0,
    });
    expect(getProvenance(usage, "monthlyPageViews").source).toBe("derived");
    expect(getProvenance(usage, "monthlyApiRequests").source).toBe("derived");
    expect(getProvenance(usage, "monthlyStorageGbMonths").source).toBe("derived");
  });

  it("does not turn invalid direct ChatGPT, Codex, or water inputs into zero", () => {
    const usage = buildUsage(null, null, {
      monthlyChatgptConversationHours: Number.NaN,
      monthlyCodexSessions: -1,
      monthlyDirectWaterConsumptionLiters: Number.POSITIVE_INFINITY,
      monthlyEvaporatedWaterLiters: Number.NEGATIVE_INFINITY,
    });

    expect(usage.monthlyChatgptConversationHours).toBeNull();
    expect(usage.monthlyCodexSessions).toBeNull();
    expect(usage.monthlyDirectWaterConsumptionLiters).toBeNull();
    expect(usage.monthlyEvaporatedWaterLiters).toBeNull();
    expect(usage.provenance).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "monthlyChatgptConversationHours", source: "input" }),
        expect.objectContaining({ key: "monthlyCodexSessions", source: "input" }),
      ]),
    );
  });

  it("keeps the final profile finite and non-negative for invalid numeric inputs", () => {
    const usage = buildUsage(
      {
        pageViews: Number.NaN,
        apiRequests: Number.POSITIVE_INFINITY,
        pdfExports: -1,
        maps: Number.NEGATIVE_INFINITY,
        storageGbMonths: Number.POSITIVE_INFINITY,
        storedImages: Number.NaN,
        aiCalls: Number.POSITIVE_INFINITY,
      },
      { pageViews: 0, storageGbMonths: 0 },
      {
        monthlyPageViews: Number.NaN,
        monthlyApiRequests: Number.NEGATIVE_INFINITY,
        monthlyStorageGbMonths: Number.POSITIVE_INFINITY,
      },
    );

    for (const [key, value] of Object.entries(usage)) {
      if (typeof value === "number") {
        expect(Number.isFinite(value), key).toBe(true);
        expect(value, key).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
