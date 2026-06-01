import type { PageFamilyDefinition } from "@/lib/ui/page-families/types";
import { ACCUEIL_PILOTAGE_CARD } from "@/lib/ui/page-families/card-presets";

/** Bloc 01 — orange + brun combinés (fond page + titres). */
export const ACCUEIL_PILOTAGE_FAMILY: PageFamilyDefinition = {
  id: "accueil-pilotage",
  label: "Accueil & Pilotage",
  backdropToneKey: "pilotage",
  hero: {
    eyebrow: "cmm-page-header-eyebrow text-orange-950/85",
    title: "cmm-page-header-title text-stone-950",
    titleCompact: "cmm-page-header-title text-stone-950",
    subtitle: "cmm-page-header-subtitle text-stone-800/90",
    badge:
      "cmm-page-header-badge border-orange-200/35 bg-orange-50/70 text-stone-900",
    badgeMuted:
      "cmm-page-header-badge-muted border-stone-300/40 bg-stone-100/60 text-stone-800/90",
    sectionGradient: "from-orange-500/18 via-amber-500/12 to-stone-600/10",
    iconWrap:
      "rounded-2xl border border-orange-200/35 bg-orange-50/70 p-3 shadow-sm",
    icon: "text-orange-800",
  },
  card: ACCUEIL_PILOTAGE_CARD,
};

/** @deprecated Utiliser `ACCUEIL_PILOTAGE_FAMILY.hero` ou `resolvePageFamily`. */
export const ACCUEIL_PILOTAGE_PAGE_HERO = ACCUEIL_PILOTAGE_FAMILY.hero;
