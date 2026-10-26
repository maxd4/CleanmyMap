import type { ImpactTerrain2026LocalizedText } from "./impact-terrain-2026";

const text = (fr: string, en: string): ImpactTerrain2026LocalizedText => ({ fr, en });

export const IMPACT_TERRAIN_2026_SEMANTIC_LAYERS = [
  text("Donnée terrain mesurée ou déclarée", "Measured or declared field data"),
  text("Agrégat", "Aggregate"),
  text("Proxy d’impact", "Impact proxy"),
  text("Conversion pédagogique", "Pedagogical conversion"),
  text("Référence méthodologique", "Methodological reference"),
] as const;
