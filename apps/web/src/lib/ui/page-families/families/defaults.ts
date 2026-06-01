import type { PageFamilyDefinition, PageFamilyHeroTokens } from "@/lib/ui/page-families/types";
import { ACCUEIL_PILOTAGE_FAMILY } from "@/lib/ui/page-families/families/01-accueil-pilotage";
import {
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

export const darkHero = (
  accent: "emerald" | "sky" | "red" | "pink" | "indigo" | "yellow",
): PageFamilyHeroTokens => {
  const map = {
    emerald: {
      gradient: "from-emerald-600/20 via-emerald-500/10 to-transparent",
      iconWrap: "rounded-2xl border border-emerald-200/35 bg-emerald-50/70 p-3",
      icon: "text-emerald-800",
      eyebrow: "text-emerald-900/85",
      title: "text-stone-950",
    },
    sky: {
      gradient: "from-sky-500/18 via-cyan-500/10 to-transparent",
      iconWrap: "rounded-2xl border border-sky-200/35 bg-sky-50/70 p-3",
      icon: "text-sky-900",
      eyebrow: "text-sky-950/85",
      title: "text-stone-950",
    },
    red: {
      gradient: "from-red-500/18 via-rose-500/10 to-transparent",
      iconWrap: "rounded-2xl border border-rose-200/35 bg-rose-50/70 p-3",
      icon: "text-rose-900",
      eyebrow: "text-rose-950/85",
      title: "text-stone-950",
    },
    pink: {
      gradient: "from-pink-500/18 via-fuchsia-500/10 to-transparent",
      iconWrap: "rounded-2xl border border-pink-200/35 bg-pink-50/70 p-3",
      icon: "text-pink-900",
      eyebrow: "text-pink-950/85",
      title: "text-stone-950",
    },
    indigo: {
      gradient: "from-indigo-500/18 via-violet-500/10 to-transparent",
      iconWrap: "rounded-2xl border border-indigo-200/35 bg-indigo-50/70 p-3",
      icon: "text-indigo-900",
      eyebrow: "text-indigo-950/85",
      title: "text-stone-950",
    },
    yellow: {
      gradient: "from-yellow-500/18 via-orange-500/12 to-transparent",
      iconWrap: "rounded-2xl border border-amber-200/35 bg-amber-50/70 p-3",
      icon: "text-amber-900",
      eyebrow: "text-amber-950/85",
      title: "text-stone-950",
    },
  } as const;
  const t = map[accent];
  return {
    eyebrow: `cmm-page-header-eyebrow ${t.eyebrow}`,
    title: `cmm-page-header-title ${t.title}`,
    titleCompact: `cmm-page-header-title ${t.title}`,
    subtitle: "cmm-page-header-subtitle text-stone-800/90",
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
  title: "cmm-page-header-title text-white",
  titleCompact: "cmm-page-header-title text-white",
  subtitle: "cmm-page-header-subtitle text-white/82",
  badge:
    "cmm-page-header-badge border-yellow-200/35 bg-yellow-50/50 text-yellow-950",
  badgeMuted:
    "cmm-page-header-badge-muted border-white/25 bg-white/15 text-white/90",
  sectionGradient: "from-yellow-400/22 via-amber-400/14 to-transparent",
  iconWrap: "rounded-2xl border border-yellow-200/30 bg-yellow-50/40 p-3",
  icon: "text-yellow-900",
};

export const PAGE_FAMILIES = {
  homepage: {
    id: "homepage",
    label: "Homepage",
    backdropToneKey: "home",
    hero: darkHero("emerald"),
    card: AGIR_CARD,
  },
  "accueil-pilotage": ACCUEIL_PILOTAGE_FAMILY,
  agir: {
    id: "agir",
    label: "Agir",
    backdropToneKey: "emerald",
    hero: darkHero("emerald"),
    card: AGIR_CARD,
  },
  "cartographie-impact": {
    id: "cartographie-impact",
    label: "Cartographie & Impact",
    backdropToneKey: "sky",
    hero: darkHero("sky"),
    card: CARTO_IMPACT_SKY_CARD,
  },
  "reseau-discussions": {
    id: "reseau-discussions",
    label: "Réseau & Discussions",
    backdropToneKey: "pink",
    hero: darkHero("pink"),
    card: RESEAU_PINK_CARD,
  },
  apprendre: {
    id: "apprendre",
    label: "Apprendre",
    backdropToneKey: "yellow",
    hero: darkHero("yellow"),
    card: APPRENDRE_CARD,
  },
  auth: {
    id: "auth",
    label: "Auth & Onboarding",
    backdropToneKey: "auth",
    hero: darkHero("indigo"),
    card: AUTH_CARD,
  },
  legal: {
    id: "legal",
    label: "Institutionnel & Légal",
    backdropToneKey: "legal",
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
  system: {
    id: "system",
    label: "Système & Utilitaires",
    backdropToneKey: "system",
    hero: darkHero("sky"),
    card: NEUTRAL_LIGHT_CARD,
  },
  admin: {
    id: "admin",
    label: "Admin & Super-admin",
    backdropToneKey: "admin",
    hero: ACCUEIL_PILOTAGE_FAMILY.hero,
    card: ADMIN_CARD,
  },
  print: {
    id: "print",
    label: "Print & Export",
    backdropToneKey: "print",
    hero: darkHero("sky"),
    card: NEUTRAL_LIGHT_CARD,
  },
  fallback: {
    id: "fallback",
    label: "Fallback",
    backdropToneKey: "slate",
    hero: darkHero("sky"),
    card: NEUTRAL_LIGHT_CARD,
  },
} as const satisfies Record<string, PageFamilyDefinition>;

/** Exception documentée : sommaire dans le bloc 01. */
export const EXPLORER_SOMMAIRE_FAMILY: PageFamilyDefinition = {
  id: "apprendre",
  label: "Sommaire (/explorer)",
  backdropToneKey: "yellow",
  hero: SOMMAIRE_EXPLORER_HERO,
  /** Cartes sommaire : voir `BLOCK_THEME` dans explorer/page.tsx (hors registre). */
  card: APPRENDRE_CARD,
};

/** Exception : méthodologie rouge d'impact. */
export const METHODOLOGIE_FAMILY: PageFamilyDefinition = {
  id: "cartographie-impact",
  label: "Méthodologie (impact)",
  backdropToneKey: "red",
  hero: darkHero("red"),
  card: CARTO_IMPACT_RED_CARD,
};

/** Partenaires — indigo (sous-famille réseau). */
export const PARTNERS_NETWORK_FAMILY: PageFamilyDefinition = {
  id: "reseau-discussions",
  label: "Partenaires",
  backdropToneKey: "indigo",
  hero: darkHero("indigo"),
  card: RESEAU_INDIGO_CARD,
};

/** Erreur quota 429. */
export const STATE_429_FAMILY: PageFamilyDefinition = {
  id: "system",
  label: "Erreur 429",
  backdropToneKey: "state429",
  hero: darkHero("yellow"),
  card: NEUTRAL_LIGHT_CARD,
};

/** Pages impact (rapports, gamification). */
export const IMPACT_REPORTS_FAMILY: PageFamilyDefinition = {
  id: "cartographie-impact",
  label: "Impact (rapports & gamification)",
  backdropToneKey: "red",
  hero: darkHero("red"),
  card: CARTO_IMPACT_RED_CARD,
};
