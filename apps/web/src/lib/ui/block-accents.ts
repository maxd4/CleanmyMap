/**
 * Système d'accents par bloc - CleanMyMap
 *
 * Charte officielle des blocs visibles:
 * - Accueil & Pilotage (home)       : amber/orange
 * - Agir               (act)        : emerald
 * - Cartographie & Impact (visualize): sky
 * - Réseau & Discussions (network + discussion)   : indigo / pink
 * - Apprendre           (learn)      : yellow / amber
 *
 * Les blocs "impact" et "connect" (discussion) restent présents comme accents
 * techniques/compatibilité, mais ils ne sont plus exposés comme blocs visibles
 * de navigation principale.
 */

export type BlockAccent =
  | "slate"
  | "amber"
  | "sky"
  | "emerald"
  | "red"
  | "yellow"
  | "indigo"
  | "pink";

export type BlockId =
  | "home"
  | "act"
  | "visualize"
  | "impact"
  | "network"
  | "connect"
  | "learn";

/**
 * Mapping bloc -> accent (source de vérité des tokens visuels)
 */
export const BLOCK_ACCENT_MAP: Record<BlockId, BlockAccent> = {
  home: "amber",      // Accueil  → Orange
  act: "emerald",     // Agir     → Vert
  visualize: "sky",   // Visualiser → Bleu ciel
  impact: "red",      // Impact   → Rouge
  network: "indigo",  // Réseau → Indigo
  connect: "pink",    // Discussion → Rose
  learn: "yellow",    // Apprendre → Jaune solaire / soleil doux
};

/**
 * Tokens CSS pour chaque accent
 * Utilisés par tous les modes d'affichage
 */
export const ACCENT_TOKENS: Record<
  BlockAccent,
  {
    light: string;
    DEFAULT: string;
    dark: string;
    bgPage?: string;        // fond page inline-style (linear-gradient)
    bgSurface?: string;     // surface principale rgba
    bgSurfaceMuted?: string;// surface atténuée rgba
    bgSurfaceDeep?: string; // cards internes rgba
    surface: string;
    surfaceMuted: string;
    border: string;
    borderStrong: string;
    text: string;
    textMuted: string;
    shadow: string;
    glow: string;
    ring: string;
    dot: string;
    gradient: string;
    gradientDeep: string;
  }
> = {
  slate: {
    light: "#f1f5f9",
    DEFAULT: "#64748b",
    dark: "#1e293b",
    // 60% slate-950 | 30% slate-900 | 10% slate-700
    surface: "bg-[rgba(15,23,42,0.72)] backdrop-blur-xl border-slate-700/10",
    surfaceMuted: "bg-[rgba(15,23,42,0.45)] backdrop-blur-md",
    border: "border-slate-700/25",
    borderStrong: "border-slate-600/50",
    text: "text-slate-100",
    textMuted: "text-slate-400/90",
    shadow: "shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6),0_8px_16px_-8px_rgba(0,0,0,0.4)]",
    glow: "shadow-[0_0_40px_-12px_rgba(100,116,139,0.25),0_0_80px_-24px_rgba(100,116,139,0.12)]",
    ring: "ring-slate-500/30",
    dot: "bg-slate-400",
    gradient: "from-slate-400 via-slate-500 to-slate-700",
    gradientDeep: "from-slate-950 via-[#0d1424] to-[#0a1020]",
  },
  amber: {
    // Accueil — Fond amber chaud avec profondeur, textes noirs
    // bgPage : amber-100 → amber-150 → amber-200 — chaleur visible, profondeur réelle
    // surfaces : blanc pur pour contraste maximal sur fond coloré
    light: "#fef3c7",
    DEFAULT: "#f59e0b",
    dark: "#92400e",
    bgPage: "#fff7ed",
    bgSurface: "rgba(255,237,213,0.80)",
    bgSurfaceMuted: "rgba(254,215,170,0.60)",
    bgSurfaceDeep: "rgba(251,191,36,0.15)",
    surface: "bg-white/95",
    surfaceMuted: "bg-amber-50",
    border: "border-amber-200/70",
    borderStrong: "border-amber-300",
    text: "text-slate-900",
    textMuted: "text-amber-800/70",
    shadow: "shadow-[0_1px_3px_0_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.05)]",
    glow: "shadow-[0_0_0_1px_rgba(251,191,36,0.15)]",
    ring: "ring-amber-300",
    dot: "bg-amber-500",
    gradient: "from-amber-300 via-orange-400 to-amber-500",
    gradientDeep: "from-[#fef3c7] via-[#fde68a] to-[#fcd34d]",
  },
  sky: {
    // Visualiser — Bleu ciel / Cyan technologique
    // 60% #00080f | 30% rgba(0,40,70,0.60) | 10% sky-400/cyan-400
    light: "#e0f2fe",
    DEFAULT: "#0ea5e9",
    dark: "#075985",
    surface: "bg-[rgba(0,18,32,0.78)] backdrop-blur-xl",
    surfaceMuted: "bg-[rgba(0,12,22,0.55)] backdrop-blur-md",
    border: "border-sky-400/18",
    borderStrong: "border-sky-400/38",
    text: "text-sky-50",
    textMuted: "text-sky-300/70",
    shadow: "shadow-[0_32px_72px_-16px_rgba(14,165,233,0.22),0_8px_24px_-8px_rgba(0,0,0,0.55)]",
    glow: "shadow-[0_0_48px_-12px_rgba(14,165,233,0.38),0_0_96px_-32px_rgba(56,189,248,0.18)]",
    ring: "ring-sky-400/35",
    dot: "bg-sky-400",
    gradient: "from-sky-300 via-cyan-400 to-blue-500",
    gradientDeep: "from-[#00080f] via-[#001422] to-[#001e32]",
  },
  emerald: {
    // Agir — Vert sauge / mint respirant
    // 60% #eef8f0 | 30% rgba(236,248,240,0.72) | 10% emerald-500/teal-500
    light: "#dcfce7",
    DEFAULT: "#22c55e",
    dark: "#14532d",
    surface: "bg-[rgba(243,251,246,0.94)] backdrop-blur-xl",
    surfaceMuted: "bg-[rgba(236,248,240,0.84)] backdrop-blur-md",
    border: "border-emerald-200/70",
    borderStrong: "border-emerald-300/80",
    text: "text-emerald-950",
    textMuted: "text-emerald-900/70",
    shadow: "shadow-[0_20px_40px_-24px_rgba(34,197,94,0.18),0_8px_18px_-12px_rgba(15,23,42,0.08)]",
    glow: "shadow-[0_0_42px_-14px_rgba(34,197,94,0.16),0_0_80px_-28px_rgba(16,185,129,0.08)]",
    ring: "ring-emerald-300/30",
    dot: "bg-emerald-400",
    gradient: "from-emerald-300 via-emerald-400 to-teal-500",
    gradientDeep: "from-[#eef9f0] via-[#e4f5e8] to-[#d9f0de]",
  },
  red: {
    // Impact — Rose-Rouge intense
    // 60% #0f0004 | 30% rgba(80,0,20,0.60) | 10% rose-400/red-400
    light: "#fee2e2",
    DEFAULT: "#f43f5e",
    dark: "#881337",
    surface: "bg-[rgba(22,0,8,0.78)] backdrop-blur-xl",
    surfaceMuted: "bg-[rgba(14,0,5,0.55)] backdrop-blur-md",
    border: "border-rose-400/18",
    borderStrong: "border-rose-400/38",
    text: "text-rose-50",
    textMuted: "text-rose-300/70",
    shadow: "shadow-[0_32px_72px_-16px_rgba(244,63,94,0.22),0_8px_24px_-8px_rgba(0,0,0,0.55)]",
    glow: "shadow-[0_0_48px_-12px_rgba(244,63,94,0.38),0_0_96px_-32px_rgba(251,113,133,0.18)]",
    ring: "ring-rose-400/35",
    dot: "bg-rose-400",
    gradient: "from-rose-300 via-red-400 to-rose-500",
    gradientDeep: "from-[#0f0004] via-[#1c0008] to-[#2a000e]",
  },
  yellow: {
    // Apprendre — jaune clair, bulles et cartes en ambre/orange solaire
    light: "#fef9c3",
    DEFAULT: "#f59e0b",
    dark: "#92400e",
    surface: "bg-[rgba(255,249,217,0.94)] backdrop-blur-xl",
    surfaceMuted: "bg-[rgba(255,238,188,0.84)] backdrop-blur-md",
    border: "border-amber-200/70",
    borderStrong: "border-amber-300",
    text: "text-stone-900",
    textMuted: "text-amber-900/72",
    shadow: "shadow-[0_20px_40px_-24px_rgba(245,158,11,0.18),0_8px_18px_-12px_rgba(15,23,42,0.08)]",
    glow: "shadow-[0_0_0_1px_rgba(249,115,22,0.14)]",
    ring: "ring-amber-300/30",
    dot: "bg-amber-500",
    gradient: "from-yellow-200 via-amber-300 to-orange-300",
    gradientDeep: "from-[#fff8d8] via-[#fde68a] to-[#fdba74]",
  },
  indigo: {
    // Réseau — Violet profond
    // 60% #060210 | 30% rgba(36,12,84,0.60) | 10% violet-400/fuchsia-400
    light: "#ede9fe",
    DEFAULT: "#8b5cf6",
    dark: "#5b21b6",
    surface: "bg-[rgba(10,4,28,0.78)] backdrop-blur-xl",
    surfaceMuted: "bg-[rgba(7,2,20,0.55)] backdrop-blur-md",
    border: "border-violet-400/18",
    borderStrong: "border-violet-400/38",
    text: "text-violet-50",
    textMuted: "text-violet-300/70",
    shadow: "shadow-[0_32px_72px_-16px_rgba(139,92,246,0.22),0_8px_24px_-8px_rgba(0,0,0,0.55)]",
    glow: "shadow-[0_0_48px_-12px_rgba(139,92,246,0.38),0_0_96px_-32px_rgba(168,85,247,0.18)]",
    ring: "ring-violet-400/35",
    dot: "bg-violet-400",
    gradient: "from-violet-300 via-purple-400 to-fuchsia-500",
    gradientDeep: "from-[#060210] via-[#10062a] to-[#18073a]",
  },
  pink: {
    // Discussion — Pink/Fuchsia vibrant
    // 60% #0f0008 | 30% rgba(72,0,46,0.60) | 10% pink-400/fuchsia-400
    light: "#fce7f3",
    DEFAULT: "#f472b6",
    dark: "#be185d",
    surface: "bg-[rgba(24,0,16,0.78)] backdrop-blur-xl",
    surfaceMuted: "bg-[rgba(16,0,10,0.55)] backdrop-blur-md",
    border: "border-pink-400/18",
    borderStrong: "border-pink-400/38",
    text: "text-pink-50",
    textMuted: "text-pink-300/70",
    shadow: "shadow-[0_32px_72px_-16px_rgba(244,114,182,0.22),0_8px_24px_-8px_rgba(0,0,0,0.55)]",
    glow: "shadow-[0_0_48px_-12px_rgba(244,114,182,0.38),0_0_96px_-32px_rgba(232,121,249,0.18)]",
    ring: "ring-pink-400/35",
    dot: "bg-pink-400",
    gradient: "from-pink-300 via-fuchsia-400 to-pink-500",
    gradientDeep: "from-[#0f0008] via-[#210014] to-[#33001f]",
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
    glow: tokens.glow,
    ring: tokens.ring,
    dot: tokens.dot,
    gradient: tokens.gradient,
    gradientDeep: tokens.gradientDeep,
  };
}

/**
 * Génère les classes CSS pour un bloc donné
 */
export function getBlockClasses(blockId: BlockId) {
  return getAccentClasses(BLOCK_ACCENT_MAP[blockId]);
}
