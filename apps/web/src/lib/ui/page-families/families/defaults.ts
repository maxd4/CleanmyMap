import type { PageFamilyDefinition, PageFamilyHeroTokens } from "@/lib/ui/page-families/types";
import { ACCUEIL_PILOTAGE_FAMILY } from "@/lib/ui/page-families/families/01-accueil-pilotage";
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
      gradient: "from-yellow-500/18 via-amber-500/12 to-transparent",
      iconWrap: "rounded-2xl border border-yellow-200/35 bg-yellow-50/70 p-3",
      icon: "text-yellow-900",
      eyebrow: "text-yellow-950/85",
      title: "text-stone-950",
    },
  } as const;
  const t = map[accent];
  return {
    eyebrow: `text-[11px] font-bold uppercase tracking-[0.3em] ${t.eyebrow}`,
    title: `text-[clamp(3rem,6vw,5.5rem)] font-black leading-[0.92] tracking-[-0.05em] ${t.title}`,
    titleCompact: `text-4xl font-black leading-none tracking-tighter ${t.title} md:text-5xl`,
    subtitle:
      "max-w-2xl text-base font-medium leading-relaxed text-stone-800/90 md:text-lg",
    badge:
      "inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-stone-900",
    badgeMuted:
      "inline-flex items-center rounded-full border border-stone-300/35 bg-white/40 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-stone-800/90",
    sectionGradient: t.gradient,
    iconWrap: t.iconWrap,
    icon: t.icon,
  };
};

/** Sommaire `/explorer` — fond jaune, hero clair (cartes = exception locale). */
const SOMMAIRE_EXPLORER_HERO: PageFamilyHeroTokens = {
  eyebrow: "text-[11px] font-bold uppercase tracking-[0.3em] text-yellow-950/85",
  title:
    "text-[clamp(3rem,6vw,5.5rem)] font-black leading-[0.92] tracking-[-0.05em] text-white",
  titleCompact: "text-4xl font-black leading-none tracking-tighter text-white md:text-5xl",
  subtitle: "max-w-xl text-base font-medium leading-relaxed text-white/82",
  badge:
    "inline-flex items-center gap-2 rounded-full border border-yellow-200/35 bg-yellow-50/50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-yellow-950",
  badgeMuted:
    "inline-flex items-center rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/90",
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
      eyebrow: "text-[11px] font-bold uppercase tracking-[0.3em] text-slate-600",
      title:
        "text-[clamp(2.5rem,5vw,4rem)] font-black leading-[0.95] tracking-tight text-slate-950",
      titleCompact: "text-3xl font-black tracking-tight text-slate-950 md:text-4xl",
      subtitle: "max-w-2xl text-base font-medium leading-relaxed text-slate-700",
      badge:
        "inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700",
      badgeMuted:
        "inline-flex items-center rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600",
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
