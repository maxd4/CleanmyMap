import { describe, expect, it } from "vitest";
import {
  ACCUEIL_PILOTAGE_CARD,
  ADMIN_CARD,
  AGIR_CARD,
  APPRENDRE_CARD,
  AUTH_CARD,
  CARTO_IMPACT_RED_CARD,
  CARTO_IMPACT_SKY_CARD,
  NEUTRAL_LIGHT_CARD,
  RESEAU_INDIGO_CARD,
  RESEAU_PINK_CARD,
} from "./card-presets";

const presets = [
  ACCUEIL_PILOTAGE_CARD,
  AGIR_CARD,
  CARTO_IMPACT_SKY_CARD,
  CARTO_IMPACT_RED_CARD,
  RESEAU_PINK_CARD,
  RESEAU_INDIGO_CARD,
  APPRENDRE_CARD,
  NEUTRAL_LIGHT_CARD,
  AUTH_CARD,
  ADMIN_CARD,
];

describe("page family surface presets", () => {
  it("expose only the canonical surface selectors", () => {
    for (const preset of presets) {
      expect(Object.keys(preset).sort()).toEqual(["rubriqueTheme", "surfaceKind"]);
      expect(["themed", "neutral"]).toContain(preset.surfaceKind);
    }
  });
});
