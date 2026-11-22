import { describe, expect, it } from "vitest";
import { estimateQuickChatScenario, type QuickChatScenarioInput } from "./personal-ai-quick-scenario";

const scenario = (overrides: Partial<QuickChatScenarioInput> = {}): QuickChatScenarioInput => ({
  chatbot: "CHATGPT", chatbotLabel: null, accessMode: "FREE", frequency: "WEEKLY", exchanges: 8,
  questionCharacters: 240, answerCharacters: 900, imageUse: null, audioUse: null,
  periodStart: "2026-11-01", periodEnd: "2026-11-08", hypotheticalRegion: "UNKNOWN", ...overrides,
});

describe("estimateQuickChatScenario", () => {
  it("keeps personal energy and impacts unknown without measured or calibrated tokens", () => {
    const result = estimateQuickChatScenario(scenario(), "2026-11-22T12:00:00.000Z");
    expect(result.declaration.quickScenario?.sourceKind).toBe("SELF_REPORTED_CHAT_USAGE");
    expect(result.declaration.tokens.logicalTotal).toBeNull();
    expect(result.declaration.requestCount).toBeNull();
    expect(result.personalEstimate.physicalTotals.facilityEnergyKwh).toBeNull();
    expect(result.personalEstimate.physicalTotals.operationalKgCo2e).toBeNull();
    expect(result.personalEstimate.physicalTotals.totalWaterLiters).toBeNull();
    expect(result.referenceSimulation.region).toBe("UNKNOWN");
    expect(result.referenceSimulation.scenarios.map((item) => item.estimate.physicalTotals.itEnergyKwh)).toEqual([0.06, 0.3, 0.6]);
    expect(result.referenceSimulation.scenarios.every((item) => item.estimate.physicalTotals.operationalKgCo2e === null)).toBe(true);
  });

  it("retains zero exchanges separately from unknown lengths and modalities", () => {
    const result = estimateQuickChatScenario(scenario({ exchanges: 0, questionCharacters: null, answerCharacters: null }));
    expect(result.declaration.quickScenario?.exchanges).toBe(0);
    expect(result.declaration.quickScenario?.questionCharacters).toBeNull();
    expect(result.declaration.quickScenario?.imageUse).toBeNull();
    expect(result.personalEstimate.physicalTotals.facilityEnergyKwh).toBeNull();
  });

  it("creates explicit low, central and high registry-backed regional simulations independent of activity", () => {
    const result = estimateQuickChatScenario(scenario({ hypotheticalRegion: "FR" }));
    expect(result.referenceSimulation?.scenarios.map((item) => item.scenario)).toEqual(["low", "central", "high"]);
    expect(result.referenceSimulation?.scenarios.map((item) => item.factorId)).toEqual([
      "ai-inference-energy-scenario-low-v1", "ai-inference-energy-scenario-central-v1", "ai-inference-energy-scenario-high-v1",
    ]);
    expect(result.referenceSimulation?.scenarios.map((item) => item.estimate.physicalTotals.itEnergyKwh)).toEqual([0.06, 0.3, 0.6]);
    expect(result.referenceSimulation?.scenarios.every((item) => item.estimate.modalities.text.qualityDiagnostic === "PROXY_SCENARIO")).toBe(true);
    expect(result.personalEstimate.physicalTotals.facilityEnergyKwh).toBeNull();
  });

  it("does not change energy scenarios for a free offer versus a subscription", () => {
    const free = estimateQuickChatScenario(scenario({ accessMode: "FREE", hypotheticalRegion: "US" }));
    const subscription = estimateQuickChatScenario(scenario({ accessMode: "SUBSCRIPTION", hypotheticalRegion: "US" }));
    expect(subscription.referenceSimulation?.scenarios.map((item) => item.estimate.physicalTotals.facilityEnergyKwh))
      .toEqual(free.referenceSimulation?.scenarios.map((item) => item.estimate.physicalTotals.facilityEnergyKwh));
  });

  it("keeps unknown personal region separate from an opt-in regional simulation", () => {
    const result = estimateQuickChatScenario(scenario({ hypotheticalRegion: "US", imageUse: true, audioUse: true }));
    expect(result.declaration.inferenceRegion).toBeNull();
    expect(result.personalEstimate.physicalTotals.operationalKgCo2e).toBeNull();
    expect(result.referenceSimulation?.scenarios[1].estimate.physicalTotals.operationalKgCo2e).not.toBeNull();
    expect(result.personalEstimate.modalityCoverage.nonCalculableDeclaredModalities).toContain("image");
  });

  it("rejects missing, malformed and inverted periods", () => {
    expect(() => estimateQuickChatScenario(scenario({ periodStart: null, periodEnd: "2026-11-08" }))).toThrow("deux bornes");
    expect(() => estimateQuickChatScenario(scenario({ periodStart: "2026-11-10", periodEnd: "2026-11-08" }))).toThrow("respecter");
    expect(estimateQuickChatScenario(scenario({ periodStart: null, periodEnd: null })).personalEstimate.physicalTotals.facilityEnergyKwh).toBeNull();
  });

  it("accepts the documented maximum visible length and rejects larger values", () => {
    expect(() => estimateQuickChatScenario(scenario({ questionCharacters: 1_000_000 }))).not.toThrow();
    expect(() => estimateQuickChatScenario(scenario({ answerCharacters: 1_000_001 }))).toThrow("limite");
  });

  it("requires a safe short label only for an unlisted chatbot", () => {
    expect(() => estimateQuickChatScenario(scenario({ chatbot: "OTHER", chatbotLabel: null }))).toThrow("requis uniquement");
    expect(() => estimateQuickChatScenario(scenario({ chatbot: "OTHER", chatbotLabel: "Mon service" }))).not.toThrow();
  });
});
