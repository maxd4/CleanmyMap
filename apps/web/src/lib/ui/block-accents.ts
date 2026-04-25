/**
 * Système d'accents par bloc - CleanMyMap
 *
 * Charte des blocs:
 * - Accueil: slate
 * - Agir: amber
 * - Visualiser: sky
 * - Impact: emerald
 * - Réseau: violet
 * - Apprendre: rose
 * - Piloter: indigo
 */

export type BlockAccent =
  | "slate"
  | "amber"
  | "sky"
  | "emerald"
  | "violet"
  | "rose"
  | "indigo";

export type BlockId =
  | "home"
  | "act"
  | "visualize"
  | "impact"
  | "network"
  | "learn"
  | "pilot";

/**
 * Mapping bloc -> accent
 */
export const BLOCK_ACCENT_MAP: Record<BlockId, BlockAccent> = {
  home: "slate",
  act: "amber",
  visualize: "sky",
  impact: "emerald",
  network: "violet",
  learn: "rose",
  pilot: "indigo",
};

/**
 * Tokens CSS pour chaque accent
 * Utilisés par tous les modes d'affichage
 */
export const ACCENT_TOKENS: Record<
  BlockAccent,
  {
    // Couleurs de base
    light: string;
    DEFAULT: string;
    dark: string;
    // Surfaces
    surface: string;
    surfaceMuted: string;
    // Bordures
    border: string;
    borderStrong: string;
    // Texte
    text: string;
    textMuted: string;
    // Ombres
    shadow: string;
    // Anneaux/Dots
    ring: string;
    dot: string;
  }
> = {
  slate: {
    light: "#f1f5f9",
    DEFAULT: "#64748b",
    dark: "#334155",
    surface: "bg-slate-50/80",
    surfaceMuted: "bg-slate-100/60",
    border: "border-slate-200/80",
    borderStrong: "border-slate-300",
    text: "text-slate-700",
    textMuted: "text-slate-500",
    shadow: "shadow-slate-200/30",
    ring: "ring-slate-200",
    dot: "bg-slate-400",
  },
  amber: {
    light: "#fffbeb",
    DEFAULT: "#f59e0b",
    dark: "#b45309",
    surface: "bg-amber-50/80",
    surfaceMuted: "bg-amber-100/60",
    border: "border-amber-200/80",
    borderStrong: "border-amber-300",
    text: "text-amber-800",
    textMuted: "text-amber-600",
    shadow: "shadow-amber-100/40",
    ring: "ring-amber-200",
    dot: "bg-amber-400",
  },
  sky: {
    light: "#f0f9ff",
    DEFAULT: "#0ea5e9",
    dark: "#0369a1",
    surface: "bg-sky-50/80",
    surfaceMuted: "bg-sky-100/60",
    border: "border-sky-200/80",
    borderStrong: "border-sky-300",
    text: "text-sky-800",
    textMuted: "text-sky-600",
    shadow: "shadow-sky-100/40",
    ring: "ring-sky-200",
    dot: "bg-sky-400",
  },
  emerald: {
    light: "#ecfdf5",
    DEFAULT: "#10b981",
    dark: "#047857",
    surface: "bg-emerald-50/80",
    surfaceMuted: "bg-emerald-100/60",
    border: "border-emerald-200/80",
    borderStrong: "border-emerald-300",
    text: "text-emerald-800",
    textMuted: "text-emerald-600",
    shadow: "shadow-emerald-100/40",
    ring: "ring-emerald-200",
    dot: "bg-emerald-400",
  },
  violet: {
    light: "#f5f3ff",
    DEFAULT: "#8b5cf6",
    dark: "#6d28d9",
    surface: "bg-violet-50/80",
    surfaceMuted: "bg-violet-100/60",
    border: "border-violet-200/80",
    borderStrong: "border-violet-300",
    text: "text-violet-800",
    textMuted: "text-violet-600",
    shadow: "shadow-violet-100/40",
    ring: "ring-violet-200",
    dot: "bg-violet-400",
  },
  rose: {
    light: "#fff1f2",
    DEFAULT: "#f43f5e",
    dark: "#be123c",
    surface: "bg-rose-50/80",
    surfaceMuted: "bg-rose-100/60",
    border: "border-rose-200/80",
    borderStrong: "border-rose-300",
    text: "text-rose-800",
    textMuted: "text-rose-600",
    shadow: "shadow-rose-100/40",
    ring: "ring-rose-200",
    dot: "bg-rose-400",
  },
  indigo: {
    light: "#eef2ff",
    DEFAULT: "#6366f1",
    dark: "#4338ca",
    surface: "bg-indigo-50/80",
    surfaceMuted: "bg-indigo-100/60",
    border: "border-indigo-200/80",
    borderStrong: "border-indigo-300",
    text: "text-indigo-800",
    textMuted: "text-indigo-600",
    shadow: "shadow-indigo-100/40",
    ring: "ring-indigo-200",
    dot: "bg-indigo-400",
  },
};

/**
 * Récupère l'accent pour un bloc donné
 */
export function getBlockAccent(blockId: BlockId): BlockAccent {
  return BLOCK_ACCENT_MAP[blockId];
}

/**
 * Récupère tous les tokens pour un accent
 */
export function getAccentTokens(accent: BlockAccent) {
  return ACCENT_TOKENS[accent];
}

/**
 * Récupère les tokens pour un bloc donné
 */
export function getBlockTokens(blockId: BlockId) {
  return ACCENT_TOKENS[BLOCK_ACCENT_MAP[blockId]];
}

/**
 * Génère les classes CSS pour un accent donné
 * Usage: cn(getAccentClasses("emerald").surface, getAccentClasses("emerald").border)
 */
export function getAccentClasses(accent: BlockAccent) {
  const tokens = ACCENT_TOKENS[accent];
  return {
    surface: tokens.surface,
    surfaceMuted: tokens.surfaceMuted,
    border: tokens.border,
    borderStrong: tokens.borderStrong,
    text: tokens.text,
    textMuted: tokens.textMuted,
    shadow: tokens.shadow,
    ring: tokens.ring,
    dot: tokens.dot,
  };
}

/**
 * Génère les classes CSS pour un bloc donné
 */
export function getBlockClasses(blockId: BlockId) {
  return getAccentClasses(BLOCK_ACCENT_MAP[blockId]);
}
