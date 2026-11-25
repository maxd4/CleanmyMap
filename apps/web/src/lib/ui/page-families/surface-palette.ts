import { resolvePageFamily } from "./resolve-page-family";
import type { BackdropToneKey } from "@/lib/ui/backdrop-types";

export type SurfacePalette = {
  primary: string;
  deep: string;
  soft: string;
  tint: string;
  accent: string;
  dark: string;
};

/** Decorative family colors only. Semantic actions and data colors remain independent. */
export const SURFACE_PALETTES = {
  pilotage: { primary: "#9A3412", deep: "#431407", soft: "#FFF1E6", tint: "#FED7AA", accent: "#B88736", dark: "#382016" },
  agir: { primary: "#047857", deep: "#115E59", soft: "#ECFDF5", tint: "#D1FAE5", accent: "#0E7490", dark: "#102D29" },
  cartographie: { primary: "#075985", deep: "#1E3A8A", soft: "#F0F9FF", tint: "#DBEAFE", accent: "#0E7490", dark: "#142843" },
  impact: { primary: "#9F1239", deep: "#701A75", soft: "#FFF1F2", tint: "#FFE4E6", accent: "#B45309", dark: "#371D2D" },
  reseau: { primary: "#9D174D", deep: "#581C87", soft: "#FCE7F3", tint: "#F9D5E9", accent: "#B88628", dark: "#321B31" },
  apprendre: { primary: "#92400E", deep: "#713F12", soft: "#FFFBEB", tint: "#FEF3C7", accent: "#0F766E", dark: "#35291C" },
  auth: { primary: "#4338CA", deep: "#312E81", soft: "#EEF2FF", tint: "#E0E7FF", accent: "#B88628", dark: "#222342" },
  legal: { primary: "#334155", deep: "#1E293B", soft: "#F8FAFC", tint: "#E2E8F0", accent: "#475569", dark: "#1E293B" },
  systeme: { primary: "#155E75", deep: "#334155", soft: "#F0F9FF", tint: "#E0F2FE", accent: "#0369A1", dark: "#1E293B" },
  admin: { primary: "#1E3A5F", deep: "#172033", soft: "#F1F5F9", tint: "#DCE6F0", accent: "#B88736", dark: "#182436" },
} as const satisfies Record<string, SurfacePalette>;

export type SurfacePaletteId = keyof typeof SURFACE_PALETTES;

const PALETTE_BY_TONE: Record<BackdropToneKey, SurfacePaletteId | null> = {
  home: null,
  pilotage: "pilotage",
  amber: "pilotage",
  emerald: "agir",
  sky: "cartographie",
  indigo: "auth",
  red: "impact",
  rose: "reseau",
  pink: "reseau",
  slate: "legal",
  yellow: "apprendre",
  auth: "auth",
  legal: "legal",
  system: "systeme",
  state429: "systeme",
  admin: "admin",
  print: null,
};

export function resolvePageSurfacePalette(pathname: string | null | undefined): SurfacePaletteId | null {
  if (!pathname) return null;
  const family = resolvePageFamily(pathname);
  // Independent compositions and print keep their existing surface owners.
  if (family.id === "homepage" || family.id === "impression" || family.exceptionId === "explorer-sommaire") return null;
  if (/^\/(?:sign-in|sign-up)(?:\/|$)/.test(pathname) || /^\/accueil(?:\/|$)/.test(pathname)) return null;
  return PALETTE_BY_TONE[family.backdropToneKey];
}

export function getSurfacePaletteCssVariables(id: SurfacePaletteId): Record<string, string> {
  const palette = SURFACE_PALETTES[id];
  return {
    "--cmm-family-primary": palette.primary,
    "--cmm-family-deep": palette.deep,
    "--cmm-family-soft": palette.soft,
    "--cmm-family-tint": palette.tint,
    "--cmm-family-accent": palette.accent,
    "--cmm-family-dark": palette.dark,
  };
}
