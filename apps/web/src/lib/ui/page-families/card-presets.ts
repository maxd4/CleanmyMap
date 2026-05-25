import type { PageFamilyCardTokens } from "@/lib/ui/page-families/types";
import type { RubriqueTheme } from "@/components/ui/rubrique-card";

type CardPresetInput = {
  rubriqueTheme: RubriqueTheme;
  border: string;
  gradient: string;
  shadow: string;
  hover?: string;
};

function buildDarkCardPreset(input: CardPresetInput): PageFamilyCardTokens {
  return {
    rubriqueTheme: input.rubriqueTheme,
    shell: [
      "rounded-[2.5rem] border backdrop-blur-xl relative overflow-hidden",
      input.border,
      input.gradient,
      input.shadow,
    ].join(" "),
    shellHover: input.hover ?? "hover:border-opacity-100",
    topBarAccent: input.rubriqueTheme,
    titleOnCard: "text-white",
    textOnCard: "text-white/90",
    textMutedOnCard: "text-white/72",
  };
}

/** Bloc 01 — cartes sombres teintées orange/brun sur fond clair. */
export const ACCUEIL_PILOTAGE_CARD: PageFamilyCardTokens = buildDarkCardPreset({
  rubriqueTheme: "amber",
  border: "border-orange-200/18",
  gradient:
    "bg-[linear-gradient(145deg,rgba(44,28,15,0.78)_0%,rgba(92,45,12,0.84)_56%,rgba(245,158,11,0.26)_100%)]",
  shadow: "shadow-[0_18px_42px_-26px_rgba(124,45,18,0.30)]",
});

export const AGIR_CARD: PageFamilyCardTokens = buildDarkCardPreset({
  rubriqueTheme: "emerald",
  border: "border-emerald-200/18",
  gradient:
    "bg-[linear-gradient(145deg,rgba(6,38,28,0.82)_0%,rgba(15,59,42,0.88)_56%,rgba(34,197,94,0.22)_100%)]",
  shadow: "shadow-[0_18px_42px_-26px_rgba(7,44,27,0.28)]",
});

export const CARTO_IMPACT_SKY_CARD: PageFamilyCardTokens = buildDarkCardPreset({
  rubriqueTheme: "sky",
  border: "border-sky-200/18",
  gradient:
    "bg-[linear-gradient(145deg,rgba(7,24,38,0.82)_0%,rgba(12,40,62,0.88)_56%,rgba(14,165,233,0.22)_100%)]",
  shadow: "shadow-[0_18px_42px_-26px_rgba(14,165,233,0.22)]",
});

export const CARTO_IMPACT_RED_CARD: PageFamilyCardTokens = buildDarkCardPreset({
  rubriqueTheme: "rose",
  border: "border-rose-200/18",
  gradient:
    "bg-[linear-gradient(145deg,rgba(42,0,14,0.82)_0%,rgba(82,10,28,0.88)_56%,rgba(244,63,94,0.22)_100%)]",
  shadow: "shadow-[0_18px_42px_-26px_rgba(244,63,94,0.22)]",
});

export const RESEAU_PINK_CARD: PageFamilyCardTokens = buildDarkCardPreset({
  rubriqueTheme: "rose",
  border: "border-pink-200/18",
  gradient:
    "bg-[linear-gradient(145deg,rgba(42,0,24,0.82)_0%,rgba(76,12,44,0.88)_56%,rgba(236,72,153,0.20)_100%)]",
  shadow: "shadow-[0_18px_42px_-26px_rgba(236,72,153,0.22)]",
});

export const RESEAU_INDIGO_CARD: PageFamilyCardTokens = buildDarkCardPreset({
  rubriqueTheme: "indigo",
  border: "border-indigo-200/18",
  gradient:
    "bg-[linear-gradient(145deg,rgba(15,8,40,0.82)_0%,rgba(30,20,70,0.88)_56%,rgba(99,102,241,0.20)_100%)]",
  shadow: "shadow-[0_18px_42px_-26px_rgba(99,102,241,0.22)]",
});

export const APPRENDRE_CARD: PageFamilyCardTokens = buildDarkCardPreset({
  rubriqueTheme: "amber",
  border: "border-yellow-200/18",
  gradient:
    "bg-[linear-gradient(145deg,rgba(36,28,0,0.82)_0%,rgba(74,48,8,0.88)_56%,rgba(234,179,8,0.20)_100%)]",
  shadow: "shadow-[0_18px_42px_-26px_rgba(234,179,8,0.22)]",
});

/** Cartes neutres (légal, système, fallback). */
export const NEUTRAL_LIGHT_CARD: PageFamilyCardTokens = {
  rubriqueTheme: "slate",
  shell:
    "rounded-[2.5rem] border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-lg relative overflow-hidden",
  shellHover: "hover:border-slate-300",
  topBarAccent: "slate",
  titleOnCard: "text-slate-950",
  textOnCard: "text-slate-800",
  textMutedOnCard: "text-slate-600",
};

export const AUTH_CARD: PageFamilyCardTokens = buildDarkCardPreset({
  rubriqueTheme: "indigo",
  border: "border-indigo-200/18",
  gradient:
    "bg-[linear-gradient(145deg,rgba(15,23,42,0.92)_0%,rgba(30,41,59,0.9)_48%,rgba(88,28,135,0.86)_100%)]",
  shadow: "shadow-[0_24px_70px_-42px_rgba(15,23,42,0.6)]",
});

export const ADMIN_CARD: PageFamilyCardTokens = buildDarkCardPreset({
  rubriqueTheme: "amber",
  border: "border-amber-200/20",
  gradient:
    "bg-[linear-gradient(145deg,rgba(25,22,33,0.94)_0%,rgba(63,41,20,0.90)_56%,rgba(180,83,9,0.24)_100%)]",
  shadow: "shadow-[0_24px_56px_-32px_rgba(69,45,28,0.22)]",
});
