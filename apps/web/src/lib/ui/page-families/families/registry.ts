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
      eyebrow: "text-emerald-900/85",
      title: "text-emerald-900",
      subtitle: "text-emerald-900/78",
    },
    sky: {
      gradient: "from-sky-500/18 via-cyan-500/10 to-transparent",
      iconWrap: "rounded-2xl border border-sky-200/35 bg-sky-50/70 p-3",
      icon: "text-sky-900",
      eyebrow: "text-sky-950/85",
      title: "text-sky-900",
      subtitle: "text-sky-900/78",
    },
    red: {
      gradient: "from-red-500/18 via-rose-500/10 to-transparent",
      iconWrap: "rounded-2xl border border-rose-200/35 bg-rose-50/70 p-3",
      icon: "text-rose-900",
      eyebrow: "text-rose-950/85",
      title: "text-rose-900",
      subtitle: "text-rose-900/78",
    },
    pink: {
      gradient: "from-pink-500/18 via-fuchsia-500/10 to-transparent",
      iconWrap: "rounded-2xl border border-pink-200/35 bg-pink-50/70 p-3",
      icon: "text-pink-900",
      eyebrow: "text-pink-950/85",
      title: "text-pink-900",
      subtitle: "text-pink-900/78",
    },
    indigo: {
      gradient: "from-indigo-500/18 via-violet-500/10 to-transparent",
      iconWrap: "rounded-2xl border border-indigo-200/35 bg-indigo-50/70 p-3",
      icon: "text-indigo-900",
      eyebrow: "text-indigo-950/85",
      title: "text-indigo-900",
      subtitle: "text-indigo-900/78",
    },
    yellow: {
      gradient: "from-yellow-500/18 via-orange-500/12 to-transparent",
      iconWrap: "rounded-2xl border border-amber-200/35 bg-amber-50/70 p-3",
      icon: "text-amber-900",
      eyebrow: "text-amber-950/85",
      title: "text-amber-950",
      subtitle: "text-amber-950/78",
    },
  } as const;
  const t = map[accent];
  return {
    eyebrow: `cmm-page-header-eyebrow ${t.eyebrow}`,
    title: `cmm-page-header-title ${t.title}`,
    titleCompact: `cmm-page-header-title ${t.title}`,
    subtitle: `cmm-page-header-subtitle ${t.subtitle}`,
    badge:
      `cmm-page-header-badge border-white/20 bg-white/50 text-stone-900`,
    badgeMuted:
      "cmm-page-header-badge-muted border-stone-300/35 bg-white/40 text-stone-800/90",
    sectionGradient: t.gradient,
    iconWrap: t.iconWrap,
    icon: t.icon,
  };
};

/** Sommaire `/explorer` — fond jaune, hero clair (cartes = exception locale). */
const SOMMAIRE_EXPLORER_HERO: PageFamilyHeroTokens = {
  eyebrow: "cmm-page-header-eyebrow text-yellow-950/85",
  title: "cmm-page-header-title text-amber-950",
  titleCompact: "cmm-page-header-title text-amber-950",
  subtitle: "cmm-page-header-subtitle text-amber-950/78",
  badge:
    "cmm-page-header-badge border-yellow-200/35 bg-yellow-50/50 text-yellow-950",
  badgeMuted:
    "cmm-page-header-badge-muted border-white/25 bg-white/15 text-white/90",
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
    eyebrow: "cmm-page-header-eyebrow text-orange-950/85",
    title: "cmm-page-header-title text-orange-950",
    titleCompact: "cmm-page-header-title text-orange-950",
    subtitle: "cmm-page-header-subtitle text-orange-950/78",
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
      eyebrow: "cmm-page-header-eyebrow text-slate-600",
      title: "cmm-page-header-title text-slate-950",
      titleCompact: "cmm-page-header-title text-slate-950",
      subtitle: "cmm-page-header-subtitle text-slate-700",
      badge:
        "cmm-page-header-badge border-slate-200 bg-slate-50 text-slate-700",
      badgeMuted:
        "cmm-page-header-badge-muted border-slate-200/80 bg-white text-slate-600",
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
  backdropToneKey: "sky",
  hero: darkHero("sky"),
  card: CARTO_IMPACT_SKY_CARD,
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
    eyebrow: "cmm-page-header-eyebrow text-slate-700",
    title: "cmm-page-header-title text-slate-950",
    titleCompact: "cmm-page-header-title text-slate-950",
    subtitle: "cmm-page-header-subtitle text-slate-800",
    badge: "cmm-page-header-badge border-slate-200 bg-white text-slate-700",
    badgeMuted:
      "cmm-page-header-badge-muted border-slate-200 bg-white text-slate-600",
    sectionGradient: "from-slate-300/30 via-transparent to-transparent",
    iconWrap: "rounded-2xl border border-slate-200 bg-white p-3",
    icon: "text-slate-700",
  },
  card: NEUTRAL_LIGHT_CARD,
};
