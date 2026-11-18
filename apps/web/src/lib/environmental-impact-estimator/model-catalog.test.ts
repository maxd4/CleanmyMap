import { describe, expect, it } from "vitest";
import {
  AI_MODEL_CATALOG,
  findAiModel,
  listAiModels,
  requireAiModel,
  resolveHosterForModel,
  STANDARD_HOSTERS,
  type AiModelRecord,
} from "./model-catalog";

describe("model-catalog", () => {
  it("contient un catalogue de modèles variés avec identifiants uniques", () => {
    expect(AI_MODEL_CATALOG.length).toBeGreaterThanOrEqual(15);
    expect(STANDARD_HOSTERS.OPENAI_DIRECT.id).toBe("openai");

    const ids = new Set<string>();
    for (const model of AI_MODEL_CATALOG) {
      expect(ids.has(model.id)).toBe(false);
      ids.add(model.id);

      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(model.version).toBeTruthy();
      expect(model.publisher).toBeTruthy();
      expect(model.supportedModalities.length).toBeGreaterThan(0);
      expect(["open_source", "open_weights", "proprietary"]).toContain(
        model.weightsAvailability,
      );
      expect(model.license).toBeTruthy();
      expect(["dense", "moe", "unreleased_proprietary"]).toContain(
        model.architecture.type,
      );
      expect(model.possibleHosters.length).toBeGreaterThan(0);
      expect(model.verifiableSources.length).toBeGreaterThan(0);
    }
  });

  it("sépare rigoureusement l'éditeur et l'hébergeur (Invariant 1)", () => {
    const llama70b = requireAiModel("meta-llama/llama-3.1-70b-instruct");
    expect(llama70b.publisher).toBe("Meta");

    // Meta n'est PAS un hébergeur d'API directe pour ce modèle
    const hosterIds = llama70b.possibleHosters.map((h) => h.id);
    expect(hosterIds).not.toContain("meta");
    expect(hosterIds).toContain("aws_bedrock");
    expect(hosterIds).toContain("together_ai");
    expect(hosterIds).toContain("local_self_hosted");

    // Si aucun hébergeur n'est déclaré, l'opérateur effectif reste unknown_operator
    const resolvedHoster = resolveHosterForModel(llama70b, null);
    expect(resolvedHoster.id).toBe("unknown_operator");
    expect(resolvedHoster.name).toContain("non déclaré");

    // Ne déduit JAMAIS l'hébergeur de l'éditeur
    expect(resolvedHoster.id).not.toBe("meta");
  });

  it("résout les hébergeurs déclarés du modèle ou les hébergeurs standards", () => {
    const claude = requireAiModel("anthropic/claude-3-5-sonnet-20241022");
    expect(claude.publisher).toBe("Anthropic");

    const bedrockHoster = resolveHosterForModel(claude, "aws_bedrock");
    expect(bedrockHoster.id).toBe("aws_bedrock");
    expect(bedrockHoster.name).toBe("AWS Bedrock");

    const anthropicHoster = resolveHosterForModel(claude, "anthropic");
    expect(anthropicHoster.id).toBe("anthropic");

    const customHoster = resolveHosterForModel(claude, "Mon Datacenter Privé");
    expect(customHoster.id).toBe("mon datacenter privé");
  });

  it("distingue les modèles de raisonnement (reasoning models)", () => {
    const o1 = requireAiModel("openai/o1");
    expect(o1.architecture.isReasoningModel).toBe(true);

    const o3Mini = requireAiModel("openai/o3-mini");
    expect(o3Mini.architecture.isReasoningModel).toBe(true);

    const deepseekR1 = requireAiModel("deepseek-ai/deepseek-r1");
    expect(deepseekR1.architecture.isReasoningModel).toBe(true);
    expect(deepseekR1.weightsAvailability).toBe("open_weights");
    expect(deepseekR1.license).toBe("MIT");

    const gpt4o = requireAiModel("openai/gpt-4o");
    expect(gpt4o.architecture.isReasoningModel).toBe(false);
  });

  it("documente l'architecture des modèles ouverts (dense et MoE)", () => {
    const mistralLarge = requireAiModel("mistralai/mistral-large-2407");
    expect(mistralLarge.architecture.type).toBe("dense");
    expect(mistralLarge.architecture.activeParametersBillion).toBe(123);
    expect(mistralLarge.architecture.totalParametersBillion).toBe(123);

    const mixtral = requireAiModel("mistralai/mixtral-8x22b-instruct");
    expect(mixtral.architecture.type).toBe("moe");
    expect(mixtral.architecture.totalParametersBillion).toBe(141);
    expect(mixtral.architecture.activeParametersBillion).toBe(39);

    const deepseekV3 = requireAiModel("deepseek-ai/deepseek-v3");
    expect(deepseekV3.architecture.type).toBe("moe");
    expect(deepseekV3.architecture.totalParametersBillion).toBe(671);
    expect(deepseekV3.architecture.activeParametersBillion).toBe(37);
  });

  it("gère les recherches flexibles via findAiModel et les erreurs via requireAiModel", () => {
    expect(findAiModel("gpt-4o")?.id).toBe("openai/gpt-4o");
    expect(findAiModel("GPT-4o")?.id).toBe("openai/gpt-4o");
    expect(findAiModel("deepseek-r1")?.id).toBe("deepseek-ai/deepseek-r1");
    expect(findAiModel("modele-imaginaire")).toBeUndefined();
    expect(findAiModel(null)).toBeUndefined();

    expect(() => requireAiModel("modele-inconnu")).toThrow(
      /Modèle d'IA introuvable dans le catalogue canonique/,
    );
  });

  it("filtre les modèles selon des critères précis via listAiModels", () => {
    const mistralModels = listAiModels({ publisher: "Mistral AI" });
    expect(mistralModels.length).toBeGreaterThanOrEqual(3);
    expect(mistralModels.every((m: AiModelRecord) => m.publisher === "Mistral AI")).toBe(true);

    const openModels = listAiModels({ weightsAvailability: "open_weights" });
    expect(openModels.length).toBeGreaterThanOrEqual(8);
    expect(openModels.every((m: AiModelRecord) => m.weightsAvailability === "open_weights")).toBe(
      true,
    );

    const reasoningModels = listAiModels({ isReasoningModel: true });
    expect(reasoningModels.length).toBeGreaterThanOrEqual(3);
    expect(reasoningModels.every((m: AiModelRecord) => m.architecture.isReasoningModel)).toBe(
      true,
    );
  });
});
