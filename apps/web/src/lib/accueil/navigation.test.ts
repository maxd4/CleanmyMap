import { describe, expect, it } from "vitest";
import { BLOCK_PREVIEW_PRIORITY, sortItemsForPreview } from "./navigation";

function item(id: string, label = id) {
  return {
    id,
    href: `/${id}`,
    label: { fr: label, en: label },
    description: { fr: label, en: label },
    routeId: id,
  };
}

describe("accueil navigation preview ordering", () => {
  it("keeps discussion first and open-data plus annuaire last in network", () => {
    expect(BLOCK_PREVIEW_PRIORITY.network).toMatchObject({
      community: 1,
      feedback: 2,
      messagerie: 3,
      "open-data": 7,
      annuaire: 8,
    });

    const sorted = sortItemsForPreview("network", [
      item("annuaire", "Annuaire"),
      item("open-data", "Données publiques"),
      item("messagerie", "Groupes de discussion"),
      item("community", "Communauté"),
      item("feedback", "Idées et problèmes"),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual([
      "community",
      "feedback",
      "messagerie",
      "open-data",
      "annuaire",
    ]);
  });
});
