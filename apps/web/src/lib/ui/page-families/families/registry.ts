import type {
  PageFamilyDefinition,
  PageFamilyHeroTokens,
  PageFamilyId,
} from "@/lib/ui/page-families/types";
import pageFamiliesManifest from "@/lib/ui/page-families/page-families.manifest.json";
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
} from "@/lib/ui/page-families/card-presets";

type PageFamilyManifestEntry = {
  docKey: string;
  runtimeId: PageFamilyId;
  label: string;
  scope: "bloc" | "hors bloc";
  legacyFolder: string;
  description: string;
  backdropToneKey: PageFamilyDefinition["backdropToneKey"];
};

const FAMILY_MANIFEST = pageFamiliesManifest as PageFamilyManifestEntry[];
const FAMILY_META = Object.fromEntries(
  FAMILY_MANIFEST.map((entry) => [entry.runtimeId, entry]),
) as Record<PageFamilyId, PageFamilyManifestEntry>;

export const darkHero = (
  accent: "emerald" | "sky" | "red" | "pink" | "indigo" | "yellow",
): PageFamilyHeroTokens => {
  const map = {
    emerald: {
      gradient: "from-emerald-600/20 via-emerald-500/10 to-transparent",
      iconWrap: "rounded-2xl border border-emerald-200/35 bg-emerald-50/70 p-3",
      icon: "text-emerald-800",
      titleColor: "text-emerald-900",
      subtitleColor: "text-emerald-900",
    },
    sky: {
      gradient: "from-sky-500/18 via-cyan-500/10 to-transparent",
      iconWrap: "rounded-2xl border border-sky-200/35 bg-sky-50/70 p-3",
      icon: "text-sky-900",
      titleColor: "text-sky-900",
      subtitleColor: "text-sky-900",
    },
    red: {
      gradient: "from-red-500/18 via-rose-500/10 to-transparent",
      iconWrap: "rounded-2xl border border-rose-200/35 bg-rose-50/70 p-3",
      icon: "text-rose-900",
      titleColor: "text-rose-900",
      subtitleColor: "text-rose-900",
    },
    pink: {
      gradient: "from-pink-500/18 via-fuchsia-500/10 to-transparent",
      iconWrap: "rounded-2xl border border-pink-200/35 bg-pink-50/70 p-3",
      icon: "text-pink-900",
      titleColor: "text-pink-900",
      subtitleColor: "text-pink-900",
    },
    indigo: {
      gradient: "from-indigo-500/18 via-violet-500/10 to-transparent",
      iconWrap: "rounded-2xl border border-indigo-200/35 bg-indigo-50/70 p-3",
      icon: "text-indigo-900",
      titleColor: "text-indigo-900",
      subtitleColor: "text-indigo-900",
    },
    yellow: {
      gradient: "from-yellow-500/18 via-orange-500/12 to-transparent",
      iconWrap: "rounded-2xl border border-amber-200/35 bg-amber-50/70 p-3",
      icon: "text-amber-900",
      titleColor: "text-amber-950",
      subtitleColor: "text-amber-950",
    },
  } as const;
  const t = map[accent];
  return {
    titleColor: t.titleColor,
    subtitleColor: t.subtitleColor,
    sectionGradient: t.gradient,
    iconWrap: t.iconWrap,
    icon: t.icon,
  };
};

/** Sommaire `/explorer` — fond jaune, hero clair (cartes = exception locale). */
const SOMMAIRE_EXPLORER_HERO: PageFamilyHeroTokens = {
  titleColor: "text-amber-950",
  subtitleColor: "text-amber-950",
  sectionGradient: "from-yellow-400/22 via-amber-400/14 to-transparent",
  iconWrap: "rounded-2xl border border-yellow-200/30 bg-yellow-50/40 p-3",
  icon: "text-yellow-900",
};

/** Bloc 01 — orange + brun combinés (fond page + titres). */
export const ACCUEIL_PILOTAGE_FAMILY: PageFamilyDefinition = {
  id: "accueil-pilotage",
  label: FAMILY_META["accueil-pilotage"].label,
  backdropToneKey: FAMILY_META["accueil-pilotage"].backdropToneKey,
  hero: {
    titleColor: "text-orange-950",
    subtitleColor: "text-orange-950",
    sectionGradient: "from-orange-500/18 via-amber-500/12 to-stone-600/10",
    iconWrap:
      "rounded-2xl border border-orange-200/35 bg-orange-50/70 p-3 shadow-sm",
    icon: "text-orange-800",
  },
  card: ACCUEIL_PILOTAGE_CARD,
};

/** @deprecated Utiliser `ACCUEIL_PILOTAGE_FAMILY.hero` ou `resolvePageFamily`. */
export const ACCUEIL_PILOTAGE_PAGE_HERO = ACCUEIL_PILOTAGE_FAMILY.hero;

export const PAGE_FAMILIES = {
  homepage: {
    id: "homepage",
    label: FAMILY_META.homepage.label,
    backdropToneKey: FAMILY_META.homepage.backdropToneKey,
    hero: darkHero("emerald"),
    card: AGIR_CARD,
  },
  "accueil-pilotage": ACCUEIL_PILOTAGE_FAMILY,
  agir: {
    id: "agir",
    label: FAMILY_META.agir.label,
    backdropToneKey: FAMILY_META.agir.backdropToneKey,
    hero: darkHero("emerald"),
    card: AGIR_CARD,
  },
  "cartographie-impact": {
    id: "cartographie-impact",
    label: FAMILY_META["cartographie-impact"].label,
    backdropToneKey: FAMILY_META["cartographie-impact"].backdropToneKey,
    hero: darkHero("sky"),
    card: CARTO_IMPACT_SKY_CARD,
  },
  "reseau-discussions": {
    id: "reseau-discussions",
    label: FAMILY_META["reseau-discussions"].label,
    backdropToneKey: FAMILY_META["reseau-discussions"].backdropToneKey,
    hero: darkHero("pink"),
    card: RESEAU_PINK_CARD,
  },
  apprendre: {
    id: "apprendre",
    label: FAMILY_META.apprendre.label,
    backdropToneKey: FAMILY_META.apprendre.backdropToneKey,
    hero: darkHero("yellow"),
    card: APPRENDRE_CARD,
  },
  authentification: {
    id: "authentification",
    label: FAMILY_META.authentification.label,
    backdropToneKey: FAMILY_META.authentification.backdropToneKey,
    hero: darkHero("indigo"),
    card: AUTH_CARD,
  },
  juridique: {
    id: "juridique",
    label: FAMILY_META.juridique.label,
    backdropToneKey: FAMILY_META.juridique.backdropToneKey,
    hero: {
      titleColor: "text-slate-950",
      subtitleColor: "text-slate-700",
      sectionGradient: "from-slate-200/40 via-transparent to-transparent",
      iconWrap: "rounded-2xl border border-slate-200 bg-white p-3",
      icon: "text-slate-700",
    },
    card: NEUTRAL_LIGHT_CARD,
  },
  systeme: {
    id: "systeme",
    label: FAMILY_META.systeme.label,
    backdropToneKey: FAMILY_META.systeme.backdropToneKey,
    hero: darkHero("sky"),
    card: NEUTRAL_LIGHT_CARD,
  },
  administration: {
    id: "administration",
    label: FAMILY_META.administration.label,
    backdropToneKey: FAMILY_META.administration.backdropToneKey,
    hero: ACCUEIL_PILOTAGE_FAMILY.hero,
    card: ADMIN_CARD,
  },
  impression: {
    id: "impression",
    label: FAMILY_META.impression.label,
    backdropToneKey: FAMILY_META.impression.backdropToneKey,
    hero: darkHero("sky"),
    card: NEUTRAL_LIGHT_CARD,
  },
  secours: {
    id: "secours",
    label: "Fallback",
    backdropToneKey: "slate",
    hero: darkHero("sky"),
    card: NEUTRAL_LIGHT_CARD,
  },
} as const satisfies Record<PageFamilyId, PageFamilyDefinition>;

/** Exception documentée : sommaire dans le bloc 01. */
export const EXPLORER_SOMMAIRE_FAMILY: PageFamilyDefinition = {
  id: "apprendre",
  label: "Sommaire (/explorer)",
  backdropToneKey: "yellow",
  hero: SOMMAIRE_EXPLORER_HERO,
  card: APPRENDRE_CARD,
};

/** Exception documentée : méthodologie Impact centrée dans le bloc 03. */
export const METHODOLOGIE_FAMILY: PageFamilyDefinition = {
  id: "cartographie-impact",
  label: "Méthodologie Impact",
  backdropToneKey: "red",
  hero: darkHero("red"),
  card: CARTO_IMPACT_RED_CARD,
};

/** Exception documentée : pages rapports/impact gardées dans le bloc 03. */
export const IMPACT_REPORTS_FAMILY: PageFamilyDefinition = {
  id: "cartographie-impact",
  label: "Rapports & Impact",
  backdropToneKey: "red",
  hero: darkHero("red"),
  card: CARTO_IMPACT_RED_CARD,
};

/** Exception documentée : réseau externe / partenaires dans le bloc 04. */
export const PARTNERS_NETWORK_FAMILY: PageFamilyDefinition = {
  id: "reseau-discussions",
  label: "Partenaires & Réseau",
  backdropToneKey: "pink",
  hero: darkHero("pink"),
  card: RESEAU_INDIGO_CARD,
};

/** Exception documentée : page de secours 429 (dégradé neutre). */
export const STATE_429_FAMILY: PageFamilyDefinition = {
  id: "systeme",
  label: "Trop de requêtes",
  backdropToneKey: "system",
  hero: {
    titleColor: "text-slate-950",
    subtitleColor: "text-slate-800",
    sectionGradient: "from-slate-300/30 via-transparent to-transparent",
    iconWrap: "rounded-2xl border border-slate-200 bg-white p-3",
    icon: "text-slate-700",
  },
  card: NEUTRAL_LIGHT_CARD,
};
