import type { PageFamilyDefinition } from "@/lib/ui/page-families/types";
import { ACCUEIL_PILOTAGE_CARD } from "@/lib/ui/page-families/card-presets";

/** Bloc 01 — orange + brun combinés (fond page + titres). */
export const ACCUEIL_PILOTAGE_FAMILY: PageFamilyDefinition = {
  id: "accueil-pilotage",
  label: "Accueil & Pilotage",
  backdropToneKey: "pilotage",
  hero: {
    eyebrow:
      "text-[11px] font-bold uppercase tracking-[0.3em] text-orange-950/85",
    title:
      "text-[clamp(3rem,6vw,5.5rem)] font-black leading-[0.92] tracking-[-0.05em] text-stone-950",
    titleCompact:
      "text-4xl font-black leading-none tracking-tighter text-stone-950 md:text-5xl",
    subtitle:
      "max-w-2xl text-base font-medium leading-relaxed text-stone-800/90 md:text-lg",
    badge:
      "inline-flex items-center gap-2 rounded-full border border-orange-200/35 bg-orange-50/70 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-stone-900",
    badgeMuted:
      "inline-flex items-center rounded-full border border-stone-300/40 bg-stone-100/60 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-stone-800/90",
    sectionGradient: "from-orange-500/18 via-amber-500/12 to-stone-600/10",
    iconWrap:
      "rounded-2xl border border-orange-200/35 bg-orange-50/70 p-3 shadow-sm",
    icon: "text-orange-800",
  },
  card: ACCUEIL_PILOTAGE_CARD,
};

/** @deprecated Utiliser `ACCUEIL_PILOTAGE_FAMILY.hero` ou `resolvePageFamily`. */
export const ACCUEIL_PILOTAGE_PAGE_HERO = ACCUEIL_PILOTAGE_FAMILY.hero;
