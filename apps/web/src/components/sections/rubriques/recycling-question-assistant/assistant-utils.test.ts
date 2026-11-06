import { describe, expect, it, vi } from "vitest";
import { getWastePedagogicalProjection, findWasteCategorySlug } from "@/lib/waste";
import { buildAnswer } from "./assistant-utils";

function answerText(question: string, locale: "fr" | "en" = "fr"): string {
  const answer = buildAnswer(question, locale);
  return [answer.badge, answer.title, answer.summary, ...answer.bullets, answer.nextStep]
    .join(" ")
    .toLowerCase();
}

describe("recycling assistant waste convergence", () => {
  it("does not log the user's question while building an answer", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      buildAnswer("carton de pizza propre", "fr");

      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
    }
  });

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
    expect(answerText("carton gras de pizza")).toContain("emballage en carton");
    expect(answerText("ampoule usagée")).toContain("ampoules");
    expect(answerText("cartouche d'encre vide")).toContain("cartouches");
    expect(answerText("chaussures usées")).toContain("chaussures");
  });

  it.each([
    ["carton gras de pizza", "fr"],
    ["boîte à pizza grasse mais vide", "fr"],
    ["boîte à pizza présentant de la sauce", "fr"],
    ["greasy pizza box", "en"],
    ["greasy but empty pizza box", "en"],
  ] as const)("sorts empty or grease-marked cardboard packaging for %s", (question, locale) => {
    const response = answerText(question, locale);

    expect(response).toContain(locale === "fr" ? "se trie" : "belongs in recycling");
    expect(response).toContain(locale === "fr" ? "traces de graisse" : "grease marks");
    expect(response).not.toContain(locale === "fr" ? "déchets résiduels" : "residual waste");
  });

  it.each([
    ["boîte à pizza contenant encore des aliments", "fr"],
    ["pizza box containing food", "en"],
  ] as const)("asks to remove food leftovers before sorting %s", (question, locale) => {
    const response = answerText(question, locale);

    expect(response).toContain(locale === "fr" ? "retire les restes alimentaires" : "remove the food leftovers");
    expect(response).toContain(locale === "fr" ? "se trie" : "belongs in the paper-and-cardboard stream");
    expect(response).not.toContain(locale === "fr" ? "déchets résiduels" : "residual waste");
  });

  it.each([
    ["carton gras", "fr"],
    ["dirty cardboard", "en"],
    ["carton humide", "fr"],
    ["carton non alimentaire", "fr"],
    ["carton composite", "fr"],
    ["composite cardboard", "en"],
  ] as const)("does not infer a packaging route from uncertain cardboard: %s", (question, locale) => {
    const answer = buildAnswer(question, locale);
    const response = answerText(question, locale);

    expect(answer.kind).toBe("unknown");
    expect(answer.title).not.toMatch(/recycl|trie|recycling|sort/i);
    expect(answer.summary).not.toMatch(/se trie|recycl|recycling/i);
    expect(answer.nextStep).toMatch(/nature|item|specify|précise/i);
    expect(answer.bullets.join(" ")).toMatch(/matière|objet|material|item|contamination/i);
    expect(response).toMatch(locale === "fr" ? /matière|contamination/ : /material|contamination/);
  });

  it.each([
    ["carton gras imbibé de peinture", "fr"],
    ["cardboard contaminated with paint", "en"],
    ["boîte en carton avec du solvant", "fr"],
    ["cardboard box with solvent", "en"],
  ] as const)("does not route chemically contaminated cardboard to ordinary recycling: %s", (question, locale) => {
    const answer = buildAnswer(question, locale);

    expect(answer.kind).toBe("decheterie");
    expect(answer.title).toMatch(/filière vérifiée|verified route/i);
    expect(answer.summary).not.toMatch(/papier-carton|paper-and-cardboard stream|ordinary recycling/i);
    expect(answer.bullets.join(" ")).toMatch(/peinture|solvants|produits chimiques|paint|solvents|chemicals/i);
    expect(answer.bullets.join(" ")).not.toMatch(/papier-carton|paper-and-cardboard stream/i);
    expect(answer.nextStep).toMatch(/filière|déchèterie|route|recycling center/i);
  });

  it.each([
    ["carton de pizza propre", "fr"],
    ["boîte à pizza propre", "fr"],
    ["clean pizza box", "en"],
  ] as const)("keeps explicitly clean cardboard on the canonical route for %s", (question, locale) => {
    const response = answerText(question, locale);

    expect(response).toContain(locale === "fr" ? "papier et carton" : "paper and cardboard");
    expect(response).not.toContain("carton gras");
    expect(response).not.toContain("residual waste");
  });

  it.each([
    ["carton propre", "fr"],
    ["clean cardboard", "en"],
  ] as const)("asks for the object when only cardboard material is named: %s", (question, locale) => {
    const answer = buildAnswer(question, locale);

    expect(answer.kind).toBe("unknown");
    expect(answer.title).not.toMatch(/papier|paper|recycl/i);
    expect(answer.nextStep).toMatch(/nature|item|specify|précise/i);
  });

  it.each([
    ["carton de pizza", "fr"],
    ["boîte à pizza", "fr"],
    ["pizza box", "en"],
  ] as const)("asks for the condition when a pizza box has no stated condition: %s", (question, locale) => {
    const response = answerText(question, locale);

    expect(response).toContain(locale === "fr" ? "boîte à pizza vide se trie" : "empty pizza box belongs in recycling");
    expect(response).toContain(locale === "fr" ? "retire les restes alimentaires" : "remove food leftovers");
    expect(response).toContain(locale === "fr" ? "traces de graisse" : "grease marks");
    expect(response).not.toContain(locale === "fr" ? "déchets résiduels" : "residual waste");
  });

  it.each([
    ["carton de pizza vide", "fr"],
    ["boîte à pizza propre", "fr"],
    ["empty pizza box", "en"],
  ] as const)("keeps an explicitly empty or clean package on the canonical route for %s", (question, locale) => {
    const response = answerText(question, locale);

    expect(response).toContain(locale === "fr" ? "papier et carton" : "paper and cardboard");
    expect(response).not.toContain(locale === "fr" ? "déchets résiduels" : "residual waste");
  });

  it.each([
    ["un médicament périmé", "pharmacie", "fr"],
    ["une seringue trouvée", "ne pas ramasser", "fr"],
    ["du verre cassé", "ne pas ramasser à mains nues", "fr"],
    ["une pile usagée", "piles/batteries", "fr"],
    ["expired medicine", "pharmacy", "en"],
    ["a found syringe", "do not pick up", "en"],
    ["broken glass", "do not pick up with bare hands", "en"],
    ["a used battery", "battery drop-off", "en"],
  ] as const)("keeps the canonical safety priority for %s", (question, expectedGuidance, locale) => {
    expect(answerText(question, locale)).toContain(expectedGuidance);
  });

  it.each([
    ["carton contenant une seringue", "sharps", "fr"],
    ["cardboard box with a battery", "battery", "en"],
  ] as const)("keeps a dangerous canonical category ahead of cardboard wording for %s", (question, slug, locale) => {
    const answer = buildAnswer(question, locale);
    const projection = getWastePedagogicalProjection(slug, locale);

    expect(findWasteCategorySlug(question)).toBe(slug);
    expect(answer.kind).not.toBe("packaging");
    expect(answerText(question, locale)).toContain(projection.instructions[0].toLowerCase());
  });

  it.each([
    ["seringue et lame", "sharps", "fr"],
    ["syringe and blade", "sharps", "en"],
  ] as const)("returns the complete critical-category response for %s", (question, slug, locale) => {
    const answer = buildAnswer(question, locale);
    const response = answerText(question, locale);
    const projection = getWastePedagogicalProjection(slug, locale);

    expect(findWasteCategorySlug(question)).toBe(slug);
    expect(answer.kind).toBe("specific");
    expect(answer.badge).toBe(projection.label);
    expect(answer.title).toMatch(/seringue|aiguille|syringe|needle/i);
    expect(answer.summary).toContain(projection.disposalLabel);
    expect(answer.bullets.join(" ")).toContain(projection.instructions[0]);
    expect(answer.nextStep).toContain(projection.disposalLabel);
    expect(response).not.toMatch(/autre déchet|other waste/i);
  });

  it.each([
    ["carton de pizza avec une trace d'huile d'olive", "fr"],
    ["pizza box with a trace of olive oil", "en"],
  ] as const)("keeps confirmed food oil on the cardboard route for %s", (question, locale) => {
    const answer = buildAnswer(question, locale);
    const response = answerText(question, locale);

    expect(answer.kind).toBe("packaging");
    expect(answer.title).toMatch(/carton|cardboard/i);
    expect(answer.summary).toMatch(/graisse|grease|carton|cardboard/i);
    expect(answer.bullets.join(" ")).toMatch(/papier-carton|paper-and-cardboard stream/i);
    expect(answer.nextStep).toMatch(/carton|cardboard/i);
    expect(response).not.toMatch(/déchets dangereux|hazardous waste|déchets chimiques|chemical/i);
  });

  it.each([
    ["une lame en métal", "fr"],
    ["metal blade", "en"],
    ["sharp object", "en"],
  ] as const)("keeps generic cutting objects out of ordinary collection: %s", (question, locale) => {
    const answer = buildAnswer(question, locale);
    const response = answerText(question, locale);

    expect(findWasteCategorySlug(question)).toBe("other");
    expect(answer.kind).toBe("specific");
    expect(response).toMatch(locale === "fr" ? /ne pas ramasser|signaler|consigne locale/ : /do not pick up|report|local guidance/);
    expect(response).not.toMatch(locale === "fr" ? /collecte possible avec EPI de base/ : /collection is possible with basic PPE/);
  });

  it.each([
    ["carton avec de l'huile moteur", "fr"],
    ["cardboard with motor oil", "en"],
  ] as const)("keeps confirmed chemical contamination out of ordinary recycling for %s", (question, locale) => {
    const answer = buildAnswer(question, locale);
    const response = answerText(question, locale);

    expect(answer.kind).toBe("decheterie");
    expect(answer.title).toMatch(/produit|product|filière|route/i);
    expect(answer.summary).not.toMatch(/papier-carton|paper-and-cardboard stream|ordinary recycling/i);
    expect(answer.bullets.join(" ")).toMatch(/huiles|chemicals|chemical/i);
    expect(answer.nextStep).toMatch(/déchets dangereux|hazardous waste|recycling center|déchèterie/i);
    expect(response).not.toMatch(/papier-carton.*trie|paper-and-cardboard.*recycl/i);
  });

  it.each([
    ["emballage en carton avec des restes de colle", "fr"],
    ["cardboard packaging with glue leftovers", "en"],
  ] as const)("does not treat unspecified leftovers as food contamination for %s", (question, locale) => {
    const answer = buildAnswer(question, locale);
    const response = answerText(question, locale);

    expect(findWasteCategorySlug(question)).toBe("paper_cardboard");
    expect(answer.kind).toBe("unknown");
    expect(answer.title).toMatch(/nature|contamination|item|carton/i);
    expect(answer.summary).not.toMatch(/se trie|recycl|sorting|recycling/i);
    expect(answer.bullets.join(" ")).toMatch(/nature|contamination|item|material/i);
    expect(answer.nextStep).toMatch(/précise|specify|identify/i);
    expect(response).not.toMatch(/papier-carton.*filière|paper-and-cardboard stream.*belongs/i);
  });

  it.each([
    ["emballage en carton avec des restes", "fr"],
    ["cardboard packaging with leftovers", "en"],
  ] as const)("treats unqualified leftovers as unknown contamination: %s", (question, locale) => {
    const answer = buildAnswer(question, locale);
    const response = answerText(question, locale);

    expect(answer.kind).toBe("unknown");
    expect(answer.title).toMatch(/contamination/i);
    expect(answer.summary).not.toMatch(/se trie|recycl|sorting|recycling/i);
    expect(answer.nextStep).toMatch(/précise|specify|identify/i);
    expect(response).not.toMatch(/papier-carton.*filière|paper-and-cardboard stream.*belongs/i);
  });

  it.each([
    ["carton de pizza avec des huiles alimentaires", "fr", "packaging"],
    ["pizza box with cooking oils", "en", "packaging"],
    ["carton avec des huiles minérales", "fr", "decheterie"],
    ["cardboard with motor oils", "en", "decheterie"],
  ] as const)("keeps plural oil contamination on its distinct route: %s", (question, locale, kind) => {
    const answer = buildAnswer(question, locale);
    const response = answerText(question, locale);

    expect(answer.kind).toBe(kind);
    if (kind === "packaging") {
      expect(response).toMatch(/papier-carton|paper-and-cardboard stream/);
      expect(response).not.toMatch(/chemical|chimique|hazardous|dangereux/);
    } else {
      expect(response).not.toMatch(/papier-carton.*trie|paper-and-cardboard.*recycl/);
    }
  });
});
