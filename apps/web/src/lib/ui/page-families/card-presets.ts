import type { PageFamilyCardTokens } from "@/lib/ui/page-families/types";

type CardPresetInput = PageFamilyCardTokens;

function buildCardPreset(input: CardPresetInput): PageFamilyCardTokens {
  return input;
}

/** Bloc 01 — cartes liées à la famille orange/brun. */
export const ACCUEIL_PILOTAGE_CARD = buildCardPreset({
  rubriqueTheme: "amber",
  surfaceKind: "themed",
});

export const AGIR_CARD = buildCardPreset({
  rubriqueTheme: "emerald",
  surfaceKind: "themed",
});

export const CARTO_IMPACT_SKY_CARD = buildCardPreset({
  rubriqueTheme: "sky",
  surfaceKind: "themed",
});

export const CARTO_IMPACT_RED_CARD = buildCardPreset({
  rubriqueTheme: "rose",
  surfaceKind: "themed",
});

export const RESEAU_PINK_CARD = buildCardPreset({
  rubriqueTheme: "rose",
  surfaceKind: "themed",
});

export const RESEAU_INDIGO_CARD = buildCardPreset({
  rubriqueTheme: "indigo",
  surfaceKind: "themed",
});

export const APPRENDRE_CARD = buildCardPreset({
  rubriqueTheme: "amber",
  surfaceKind: "themed",
});

/** Cartes neutres : juridique, système, impression et secours. */
export const NEUTRAL_LIGHT_CARD = buildCardPreset({
  rubriqueTheme: "slate",
  surfaceKind: "neutral",
});

/** Authentification et administration conservent leur identité thématique. */
export const AUTH_CARD = buildCardPreset({
  rubriqueTheme: "indigo",
  surfaceKind: "themed",
});

export const ADMIN_CARD = buildCardPreset({
  rubriqueTheme: "amber",
  surfaceKind: "themed",
});
