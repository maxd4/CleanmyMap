import { describe, expect, it } from "vitest";
import { getWastePedagogicalProjection, findWasteCategorySlug } from "@/lib/waste";
import { buildAnswer } from "./assistant-utils";

function answerText(question: string): string {
  const answer = buildAnswer(question, "fr");
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
});
