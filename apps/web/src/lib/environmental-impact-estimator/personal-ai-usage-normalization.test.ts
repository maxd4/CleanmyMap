import { describe, expect, it } from "vitest";
import { estimatePersonalAiFootprint } from "./personal-ai-estimator";
import { normalizePersonalAiDeclaration, toPersonalAiEstimatorInput, type PersonalAiDeclarationDraft } from "./personal-ai-usage-normalization";
import { calculatePersonalAiDeclaration } from "./personal-ai-declaration-http";
import { getScientificFactor } from "./scientific-registry";

function declaration(overrides: Partial<PersonalAiDeclarationDraft> = {}): PersonalAiDeclarationDraft {
  return {
    provider: "MANUAL", source: "MANUAL", sourceVersion: null, provenance: "USER_DECLARED", granularity: "UNKNOWN",
    periodStartUtc: "2026-01-01T00:00:00.000Z", periodEndUtc: "2026-02-01T00:00:00.000Z",
    modelRaw: null, modelCanonical: null, operator: null, execution: "CLOUD", inferenceRegion: null, access: "API", requestCount: null,
    tokens: { inputTotal: null, inputUncached: null, cacheRead: null, cacheWrite: null, outputVisible: null, outputReasoning: null, outputTotal: null, reasoningRelation: "UNKNOWN" },
    modality: { images: null, audioMinutes: null, videoSeconds: null },
    energy: { kwh: null, boundary: null, evidence: null, averageWatts: null, durationSeconds: null, idleWatts: null },
    ...overrides,
  };
}

describe("personal AI declaration normalization", () => {
  it.each([null, "UNKNOWN", "FR", "DE"] as const)("accepts inference region %s", (inferenceRegion) => {
    expect(normalizePersonalAiDeclaration(declaration({ inferenceRegion })).inferenceRegion).toBe(inferenceRegion);
  });

  it.each(["ZZ", "fr", "FRA", "Europe"])("rejects invalid ISO inference region %s", (inferenceRegion) => {
    expect(() => normalizePersonalAiDeclaration(declaration({ inferenceRegion }))).toThrow(/ISO 3166-1 alpha-2/);
  });

  it("persists actual factor IDs and versions separately from methodology version", () => {
    const payload = normalizePersonalAiDeclaration(declaration({
      inferenceRegion: "FR",
      tokens: { ...declaration().tokens, inputTotal: 42_000, outputTotal: 5_000 },
    }));
    const calculation = calculatePersonalAiDeclaration(payload);
    const factorTrace = JSON.parse(calculation.factorVersion) as { applied: string[]; unavailable: string[] };
    const expectedFactors = [
      "ai-inference-energy-scenario-central-v1",
      "electricity-fr-rte-2024",
      "ai-partial-lca-overhead-v1",
    ].map((id) => {
      const factor = getScientificFactor(id);
      return `${factor.id}@${factor.version}`;
    });

    expect(factorTrace.applied).toEqual(expect.arrayContaining(expectedFactors));
    expect(calculation.methodologyVersion).toBe(calculation.snapshot.version);
    expect(calculation.factorVersion).not.toBe(calculation.methodologyVersion);
    expect(calculation.factorVersion).not.toContain(calculation.methodologyVersion);
  });

  it("records an explicit unavailable electricity factor for unknown physical regions", () => {
    const payload = normalizePersonalAiDeclaration(declaration({
      inferenceRegion: "DE",
      tokens: { ...declaration().tokens, inputTotal: 1_000, outputTotal: 100 },
    }));
    const calculation = calculatePersonalAiDeclaration(payload);
    const factorTrace = JSON.parse(calculation.factorVersion) as { applied: string[]; unavailable: string[] };

    expect(factorTrace.applied).toContain(`${getScientificFactor("ai-inference-energy-scenario-central-v1").id}@${getScientificFactor("ai-inference-energy-scenario-central-v1").version}`);
    expect(factorTrace.applied.some((factor) => factor.startsWith("electricity-"))).toBe(false);
    expect(factorTrace.unavailable.join(" ")).toContain("location-based electricity: no compatible regional factor for DE");
  });

  it("does not report the token scenario factor for an explicitly zero-token calculation", () => {
    const payload = normalizePersonalAiDeclaration(declaration({
      inferenceRegion: "FR",
      tokens: { ...declaration().tokens, inputTotal: 0, outputTotal: 0 },
    }));
    const calculation = calculatePersonalAiDeclaration(payload);
    const factorTrace = JSON.parse(calculation.factorVersion) as { applied: string[] };

    expect(factorTrace.applied.some((factor) => factor.startsWith("ai-inference-energy-scenario-"))).toBe(false);
  });

  it("preserves unknown values separately from explicit zeros", () => {
    const unknown = normalizePersonalAiDeclaration(declaration());
    const zero = normalizePersonalAiDeclaration(declaration({ tokens: { ...declaration().tokens, inputTotal: 0, outputTotal: 0 } }));
    expect(unknown.tokens.inputTotal).toBeNull();
    expect(unknown.tokens.logicalTotal).toBeNull();
    expect(zero.tokens.inputTotal).toBe(0);
    expect(zero.tokens.logicalTotal).toBe(0);
  });

  it("keeps an absent import period unknown and rejects a one-sided period", () => {
    const imported = normalizePersonalAiDeclaration(declaration({ periodStartUtc: null, periodEndUtc: null, access: "UNKNOWN" }));
    expect(imported.periodStartUtc).toBeNull();
    expect(imported.periodEndUtc).toBeNull();
    expect(() => normalizePersonalAiDeclaration(declaration({ periodStartUtc: null }))).toThrow(/présentes ensemble/);
  });

  it.each([
    ["invalid UTC date", { periodStartUtc: "2026-02-30T00:00:00.000Z" }],
    ["reversed period", { periodStartUtc: "2026-02-01T00:00:00.000Z", periodEndUtc: "2026-01-01T00:00:00.000Z" }],
    ["date without explicit UTC zone", { periodStartUtc: "2026-01-01T00:00:00+01:00" }],
  ] as const)("rejects %s", (_label, overrides) => {
    expect(() => normalizePersonalAiDeclaration(declaration(overrides))).toThrow();
  });

  it("derives input total only from a complete disjoint cache and uncached split", () => {
    const result = normalizePersonalAiDeclaration(declaration({
      tokens: { inputTotal: null, inputUncached: 80, cacheRead: 15, cacheWrite: 5, outputVisible: null, outputReasoning: null, outputTotal: null, reasoningRelation: "UNKNOWN" },
    }));
    expect(result.tokens.inputTotal).toBe(100);
    expect(result.tokens.logicalTotal).toBeNull();
  });

  it("rejects inconsistent input/cache and output reasoning units", () => {
    expect(() => normalizePersonalAiDeclaration(declaration({
      tokens: { inputTotal: 10, inputUncached: 7, cacheRead: 2, cacheWrite: 2, outputVisible: null, outputReasoning: null, outputTotal: null, reasoningRelation: "UNKNOWN" },
    }))).toThrow(/ventilation entrée/);
    expect(() => normalizePersonalAiDeclaration(declaration({
      tokens: { inputTotal: null, inputUncached: null, cacheRead: null, cacheWrite: null, outputVisible: 5, outputReasoning: 4, outputTotal: 8, reasoningRelation: "ADDITIONAL" },
    }))).toThrow(/ventilation de sortie/);
  });

  it("rejects unsafe counts, negative measurements, and partial energy boundaries", () => {
    expect(() => normalizePersonalAiDeclaration(declaration({ requestCount: Number.MAX_SAFE_INTEGER + 1 }))).toThrow(/entier sûr/);
    expect(() => normalizePersonalAiDeclaration(declaration({ energy: { ...declaration().energy, kwh: -0.1 } }))).toThrow(/kwh/);
    expect(() => normalizePersonalAiDeclaration(declaration({ energy: { ...declaration().energy, boundary: "FACILITY" } }))).toThrow(/frontière et preuve/);
  });

  it("rejects free-form strings and account-like identifiers in model and operator labels", () => {
    expect(() => normalizePersonalAiDeclaration(declaration({ modelRaw: "https://provider.example/account" }))).toThrow(/libellé court/);
    expect(() => normalizePersonalAiDeclaration(declaration({ operator: "bad:operator" }))).toThrow(/libellé court/);
    expect(() => normalizePersonalAiDeclaration(declaration({ operator: "sk-proj-1234567890abcdef" }))).toThrow(/libellé court/);
    expect(() => normalizePersonalAiDeclaration(declaration({ modelRaw: "1234567890123456" }))).toThrow(/libellé court/);
  });

  it("enforces local wall and cloud facility boundaries without conflating them", () => {
    expect(() => normalizePersonalAiDeclaration(declaration({ execution: "LOCAL", access: "LOCAL_OWNED", energy: { ...declaration().energy, kwh: 0.4, boundary: "FACILITY", evidence: "MEASURED" } }))).toThrow(/LOCAL_WALL/);
    const local = normalizePersonalAiDeclaration(declaration({
      execution: "LOCAL", access: "LOCAL_OWNED", energy: { ...declaration().energy, averageWatts: 60, durationSeconds: 3600 },
    }));
    expect(toPersonalAiEstimatorInput(local).executionEnvironment).toBe("local_device");
    expect(toPersonalAiEstimatorInput(local).localPower).toEqual({ watts: 60, durationSeconds: 3600 });
    const cloud = normalizePersonalAiDeclaration(declaration({ energy: { ...declaration().energy, kwh: 0.4, boundary: "FACILITY", evidence: "MEASURED" } }));
    expect(toPersonalAiEstimatorInput(cloud).energyMeasurement).toEqual({ kwh: 0.4, boundary: "FACILITY", evidence: "MEASURED" });
  });

  it("does not infer a factor region from a declared region outside supported factors", () => {
    const normalized = normalizePersonalAiDeclaration(declaration({ inferenceRegion: "DE", tokens: { ...declaration().tokens, inputTotal: 1000, outputTotal: 100 } }));
    const estimate = estimatePersonalAiFootprint(toPersonalAiEstimatorInput(normalized));
    expect(estimate.region).toBe("UNKNOWN");
    expect(estimate.physicalTotals.operationalKgCo2e).toBeNull();
  });

  it("keeps multi-request provider totals as proxy data instead of EcoLogits per-request compliance", () => {
    const normalized = normalizePersonalAiDeclaration(declaration({
      provider: "OTHER", source: "PROVIDER_EXPORT", provenance: "PROVIDER_REPORTED", granularity: "AGGREGATE",
      modelCanonical: "meta-llama/llama-3.1-70b-instruct", operator: "aws_bedrock", inferenceRegion: "US", requestCount: 12,
      tokens: { inputTotal: 50_000, inputUncached: null, cacheRead: null, cacheWrite: null, outputVisible: 10_000, outputReasoning: null, outputTotal: 10_000, reasoningRelation: "UNKNOWN" },
    }));
    const estimate = estimatePersonalAiFootprint(toPersonalAiEstimatorInput(normalized));
    expect(estimate.dataQuality).toBe("PROXY_SCENARIO");
    expect(estimate.methodologyNotes.join(" ")).toContain("EcoLogits par requête non appliqué");
  });

  it("qualifies explicit single-request data for the existing EcoLogits owner", () => {
    const normalized = normalizePersonalAiDeclaration(declaration({
      granularity: "PER_REQUEST", modelCanonical: "meta-llama/llama-3.1-70b-instruct", operator: "aws_bedrock", inferenceRegion: "US", requestCount: 1,
      tokens: { inputTotal: 50_000, inputUncached: null, cacheRead: 20_000, cacheWrite: 0, outputVisible: 10_000, outputReasoning: null, outputTotal: 10_000, reasoningRelation: "UNKNOWN" },
    }));
    const estimate = estimatePersonalAiFootprint(toPersonalAiEstimatorInput(normalized));
    expect(estimate.dataQuality).toBe("DOCUMENTED_MODEL");
    expect(estimate.physicalTotals.itEnergyKwh).toBeGreaterThan(0);
  });
});
