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
  it("keeps the canonical three destinations in network order", () => {
    expect(BLOCK_PREVIEW_PRIORITY.network).toMatchObject({
      messagerie: 1,
      annuaire: 2,
      "open-data": 3,
    });

    const sorted = sortItemsForPreview("network", [
      item("annuaire", "Annuaire"),
      item("open-data", "Données publiques"),
      item("messagerie", "Groupes de discussion"),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual([
      "messagerie",
      "annuaire",
      "open-data",
    ]);
  });
});
