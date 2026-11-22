import { estimatePersonalAiFootprint, type EnergyScenario, type PersonalAiFootprintEstimate } from "./personal-ai-estimator";
import { getScientificFactor } from "./scientific-registry";
import { normalizePersonalAiDeclaration, toPersonalAiEstimatorInput, type PersonalAiDeclarationDraft, type PersonalAiQuickScenario } from "./personal-ai-usage-normalization";

export type QuickChatScenarioInput = Omit<PersonalAiQuickScenario, "version" | "sourceKind"> & {
  periodStart: string | null;
  periodEnd: string | null;
  hypotheticalRegion: "UNKNOWN" | "FR" | "US";
};

export type QuickChatScenarioResult = {
  declaration: ReturnType<typeof normalizePersonalAiDeclaration>;
  personalEstimate: PersonalAiFootprintEstimate;
  referenceSimulation: {
    region: "UNKNOWN" | "FR" | "US";
    scenarios: Array<{ scenario: EnergyScenario; factorId: string; factorVersion: string; estimate: PersonalAiFootprintEstimate }>;
  };
};

const PROVIDER_BY_CHATBOT: Record<PersonalAiQuickScenario["chatbot"], PersonalAiDeclarationDraft["provider"]> = {
  CHATGPT: "OPENAI", CLAUDE: "ANTHROPIC", GEMINI: "GOOGLE", MISTRAL: "MISTRAL",
  COPILOT: "OTHER", PERPLEXITY: "OTHER", OTHER: "OTHER", UNKNOWN: "OTHER",
};

function asUtcBoundary(day: string | null): string | null {
  if (day === null) return null;
  const date = new Date(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) throw new Error("La période doit contenir des dates valides.");
  return date.toISOString();
}

function scenarioFactorId(scenario: EnergyScenario): string {
  return `ai-inference-energy-scenario-${scenario}-v1`;
}

export function estimateQuickChatScenario(input: QuickChatScenarioInput, generatedAt?: string): QuickChatScenarioResult {
  const periodStartUtc = asUtcBoundary(input.periodStart);
  const periodEndUtc = asUtcBoundary(input.periodEnd);
  if ((periodStartUtc === null) !== (periodEndUtc === null)) throw new Error("Renseignez les deux bornes de période ou aucune.");
  const quickScenario = {
    chatbot: input.chatbot, chatbotLabel: input.chatbotLabel, accessMode: input.accessMode, frequency: input.frequency,
    exchanges: input.exchanges, questionCharacters: input.questionCharacters, answerCharacters: input.answerCharacters,
    imageUse: input.imageUse, audioUse: input.audioUse,
  };
  const draft: PersonalAiDeclarationDraft = {
    provider: PROVIDER_BY_CHATBOT[input.chatbot], source: "MANUAL", sourceVersion: null, provenance: "USER_DECLARED",
    granularity: "UNKNOWN", periodStartUtc, periodEndUtc, modelRaw: null, modelCanonical: null, operator: null,
    execution: "CLOUD", inferenceRegion: null, access: "UNKNOWN", requestCount: null,
    tokens: { inputTotal: null, inputUncached: null, cacheRead: null, cacheWrite: null, outputVisible: null, outputReasoning: null, outputTotal: null, reasoningRelation: "UNKNOWN" },
    modality: { images: null, audioMinutes: null, videoSeconds: null },
    energy: { kwh: null, boundary: null, evidence: null, averageWatts: null, durationSeconds: null, idleWatts: null },
    quickScenario: { ...quickScenario, version: "personal-ai-chat-usage-v1", sourceKind: "SELF_REPORTED_CHAT_USAGE" },
  };
  const declaration = normalizePersonalAiDeclaration(draft);
  const basePersonalEstimate = estimatePersonalAiFootprint(toPersonalAiEstimatorInput(declaration), generatedAt);
  const nonCalculableDeclaredModalities = [
    ...(input.imageUse === true ? ["image" as const] : []),
    ...(input.audioUse === true ? ["audio" as const] : []),
  ];
  const hasUnknownModality = input.imageUse === null || input.audioUse === null;
  const personalEstimate: PersonalAiFootprintEstimate = {
    ...basePersonalEstimate,
    dataQuality: nonCalculableDeclaredModalities.length > 0 ? "NOT_CALCULABLE" : basePersonalEstimate.dataQuality,
    modalityCoverage: {
      ...basePersonalEstimate.modalityCoverage,
      status: nonCalculableDeclaredModalities.length > 0 ? "NONE" : basePersonalEstimate.modalityCoverage.status,
      nonCalculableDeclaredModalities,
      coversAllDeclaredActivity: nonCalculableDeclaredModalities.length === 0 && !hasUnknownModality,
    },
    methodologyNotes: [
      ...basePersonalEstimate.methodologyNotes,
      ...(nonCalculableDeclaredModalities.length > 0
        ? [`Modalités déclarées (${nonCalculableDeclaredModalities.join(", ")}) : présence déclarée, quantité et impacts physiques non calculables.`]
        : []),
    ],
  };

  const region = input.hypotheticalRegion;
  const scenarios: EnergyScenario[] = ["low", "central", "high"];
  return {
    declaration,
    personalEstimate,
    referenceSimulation: {
      region,
      scenarios: scenarios.map((scenario) => {
        const factor = getScientificFactor(scenarioFactorId(scenario));
        return {
          scenario, factorId: factor.id, factorVersion: factor.version,
          estimate: estimatePersonalAiFootprint({
            textUsage: { totalTokens: 1_000_000, granularity: "UNKNOWN" },
            executionEnvironment: "cloud_api", region, energyScenario: scenario,
          }, generatedAt),
        };
      }),
    },
  };
}
