import { describe, expect, it } from "vitest";
import { getWastePedagogicalProjection, findWasteCategorySlug } from "@/lib/waste";
import { buildAnswer } from "./assistant-utils";

function answerText(question: string, locale: "fr" | "en" = "fr"): string {
  const answer = buildAnswer(question, locale);
  return [answer.badge, answer.title, answer.summary, ...answer.bullets, answer.nextStep]
    .join(" ")
    .toLowerCase();
}

describe("recycling assistant waste convergence", () => {
  it.each([
    ["snus usagé", "nicotine_pouch"],
    ["un mégot", "cigarette_butt"],
    ["une pile bouton", "battery"],
    ["un médicament périmé", "medicine"],
    ["une seringue trouvée", "sharps"],
    ["une bouteille en verre", "glass"],
    ["du verre cassé", "broken_glass"],
    ["un matelas", "bulky_furniture"],
    ["une palette en bois", "wood"],
    ["un petit électroménager", "electrical_equipment"],
    ["un gros électroménager", "electrical_equipment"],
    ["une lame", "other"],
  ] as const)("resolves %s through the canonical category %s", (question, slug) => {
    expect(findWasteCategorySlug(question)).toBe(slug);
    const projection = getWastePedagogicalProjection(slug, "fr");
    const response = answerText(question);

    expect(response).toContain(projection.pickupLabel.toLowerCase());
    expect(response).toContain(projection.disposalLabel.toLowerCase());
    expect(response).toContain(projection.instructions[0].toLowerCase());
    expect(response).toContain(projection.prohibitions[0].toLowerCase());
  });

  it("keeps broken glass out of the ordinary glass-container answer", () => {
    const response = answerText("verre cassé dans la rue");

    expect(response).toContain("ramassage réservé à une équipe équipée et formée");
    expect(response).toContain("ne pas ramasser à mains nues");
    expect(response).not.toContain("borne ou filière verre locale");
  });

  it("preserves useful pedagogical complements that have no canonical category yet", () => {
    expect(answerText("déchets alimentaires / compost")).toContain("compost");
    expect(answerText("carton gras de pizza")).toContain("carton gras");
    expect(answerText("ampoule usagée")).toContain("ampoules");
    expect(answerText("cartouche d'encre vide")).toContain("cartouches");
    expect(answerText("chaussures usées")).toContain("chaussures");
  });

  it.each([
    ["carton gras de pizza", "fr"],
    ["boîte à pizza très sale", "fr"],
    ["carton souillé de sauce", "fr"],
    ["greasy pizza box", "en"],
    ["dirty cardboard", "en"],
  ] as const)("keeps the contaminated-cardboard guidance for %s", (question, locale) => {
    const response = answerText(question, locale);

    expect(response).toContain(locale === "fr" ? "ne va pas au tri papier-carton" : "does not belong in paper recycling");
    expect(response).toContain(locale === "fr" ? "résiduel" : "residual waste");
  });

  it("keeps clean cardboard on the canonical paper-cardboard route", () => {
    expect(findWasteCategorySlug("carton propre")).toBe("paper_cardboard");

    const response = answerText("carton propre");

    expect(response).toContain("papier et carton");
    expect(response).not.toContain("carton gras");
  });

  it.each([
    ["un médicament périmé", "pharmacie"],
    ["une seringue trouvée", "ne pas ramasser"],
    ["du verre cassé", "ne pas ramasser à mains nues"],
    ["une pile usagée", "piles/batteries"],
  ] as const)("keeps the canonical safety priority for %s", (question, expectedGuidance) => {
    expect(answerText(question)).toContain(expectedGuidance);
  });
});
