import { BADGE_MAX_COUNTER } from "@/config/gamification.config";

export type BadgeFamily = "dechets" | "megots" | "lieux" | "actions";

export function clampBadgeCounter(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(BADGE_MAX_COUNTER, value));
}

export function formatCompactNumber(value: number, locale: string): string {
  const safe = clampBadgeCounter(value);
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(safe);
}

export function computeLevel(total: number, step: number): number {
  const safeTotal = clampBadgeCounter(total);
  if (!Number.isFinite(step) || step <= 0) return 0;
  return Math.floor(safeTotal / step);
}

export function nextThreshold(level: number, step: number): number {
  if (!Number.isFinite(level) || level < 0) return step;
  if (!Number.isFinite(step) || step <= 0) return 0;
  return (level + 1) * step;
}

export type BadgeTier = "wood" | "bronze" | "silver" | "gold" | "diamond" | "cosmic";

export type BadgeRank = {
  grade: string;
  subGrade: string;
  tier: BadgeTier;
};

const RANKS: BadgeRank[] = [
  { grade: "Talc", subGrade: "brut", tier: "wood" },           // 0
  { grade: "Talc", subGrade: "compact", tier: "wood" },        // 1
  { grade: "Gypse", subGrade: "sédimenté", tier: "wood" },     // 2
  { grade: "Gypse", subGrade: "cristallisé", tier: "wood" },   // 3
  
  { grade: "Calcite", subGrade: "stabilisé", tier: "bronze" }, // 4
  { grade: "Calcite", subGrade: "veiné", tier: "bronze" },     // 5
  { grade: "Fluorite", subGrade: "prismatique", tier: "bronze" }, // 6
  { grade: "Fluorite", subGrade: "luminescent", tier: "bronze" }, // 7
  { grade: "Fluorite", subGrade: "purifié", tier: "bronze" },     // 8
  
  { grade: "Apatite", subGrade: "dense", tier: "silver" },        // 9
  { grade: "Apatite", subGrade: "ionisé", tier: "silver" },       // 10
  { grade: "Apatite", subGrade: "phosphorescent", tier: "silver" }, // 11
  { grade: "Orthose", subGrade: "stratifié", tier: "silver" },    // 12
  { grade: "Orthose", subGrade: "tectonique", tier: "silver" },   // 13
  { grade: "Orthose", subGrade: "magmatique", tier: "silver" },   // 14
  
  { grade: "Quartz", subGrade: "translucide", tier: "gold" },     // 15
  { grade: "Quartz", subGrade: "cristallin", tier: "gold" },      // 16
  { grade: "Quartz", subGrade: "résonant", tier: "gold" },        // 17
  { grade: "Topaze", subGrade: "taillé", tier: "gold" },          // 18
  { grade: "Topaze", subGrade: "radiant", tier: "gold" },         // 19
  { grade: "Topaze", subGrade: "impérial", tier: "gold" },        // 20
  
  { grade: "Corindon", subGrade: "poli", tier: "diamond" },       // 21
  { grade: "Corindon", subGrade: "saturé", tier: "diamond" },     // 22
  { grade: "Corindon", subGrade: "alpha", tier: "diamond" },      // 23
  
  { grade: "Diamant", subGrade: "brut", tier: "diamond" },        // 24
  { grade: "Diamant", subGrade: "facetté", tier: "diamond" },     // 25
  { grade: "Diamant", subGrade: "synthétique", tier: "diamond" }, // 26
  { grade: "Diamant", subGrade: "monocristallin", tier: "diamond" }, // 27
  { grade: "Diamant", subGrade: "parfait", tier: "cosmic" },      // 28
  
  { grade: "Lonsdaléite", subGrade: "hexagonale", tier: "cosmic" } // 29+
];

export function computeBadgeRank(level: number): BadgeRank {
  if (level < 0) return RANKS[0];
  if (level >= RANKS.length) return { grade: "Lonsdaléite", subGrade: "absolue", tier: "cosmic" };
  return RANKS[level];
}

export function computeBadgeTier(level: number): BadgeTier {
  return computeBadgeRank(level).tier;
}

// ─── Badge LIEUX (Explorateur) — max ~50 zones → 10 paliers × 5 ───
export type PlacesBadgeRank = BadgeRank & { icon: string; title: string };

const PLACES_RANKS: PlacesBadgeRank[] = [
  // wood (0-9 lieux)
  { grade: "Promeneur", subGrade: "local",      tier: "wood",    icon: "footprints", title: "Promeneur Local" },   // niv 0 : 0-4
  { grade: "Promeneur", subGrade: "assidu",     tier: "wood",    icon: "footprints", title: "Promeneur Assidu" }, // niv 1 : 5-9
  // bronze (10-19 lieux)
  { grade: "Arpenteur", subGrade: "de quartier",tier: "bronze",  icon: "compass",    title: "Arpenteur de Quartier" }, // niv 2 : 10-14
  { grade: "Arpenteur", subGrade: "de ville",   tier: "bronze",  icon: "compass",    title: "Arpenteur de Ville" },    // niv 3 : 15-19
  // silver (20-29 lieux)
  { grade: "Éclaireur", subGrade: "urbain",     tier: "silver",  icon: "binoculars", title: "Éclaireur Urbain" },   // niv 4 : 20-24
  { grade: "Éclaireur", subGrade: "régional",   tier: "silver",  icon: "binoculars", title: "Éclaireur Régional" }, // niv 5 : 25-29
  // gold (30-39 lieux)
  { grade: "Cartographe", subGrade: "actif",    tier: "gold",    icon: "map",        title: "Cartographe Actif" },  // niv 6 : 30-34
  { grade: "Cartographe", subGrade: "expert",   tier: "gold",    icon: "map",        title: "Cartographe Expert" }, // niv 7 : 35-39
  // diamond (40-49 lieux)
  { grade: "Pionnier",  subGrade: "de zone",    tier: "diamond", icon: "telescope",  title: "Pionnier de Zone" },   // niv 8 : 40-44
  { grade: "Pionnier",  subGrade: "absolu",     tier: "diamond", icon: "telescope",  title: "Pionnier Absolu" },    // niv 9 : 45-49
  // cosmic (50+ lieux)
  { grade: "Maître", subGrade: "des Cartes",    tier: "cosmic",  icon: "star",       title: "Maître des Cartes" },  // niv 10+
];

export function computePlacesRank(level: number): PlacesBadgeRank {
  if (level <= 0) return PLACES_RANKS[0];
  if (level >= PLACES_RANKS.length) return PLACES_RANKS[PLACES_RANKS.length - 1];
  return PLACES_RANKS[level];
}

export type ActionCreationBadgeRank = BadgeRank & { icon: string; title: string };

const ACTION_CREATION_RANKS: ActionCreationBadgeRank[] = [
  { grade: "Observateur", subGrade: "", tier: "wood", icon: "users", title: "Observateur" },
  { grade: "Promeneur", subGrade: "Local", tier: "wood", icon: "users", title: "Promeneur Local" },
  { grade: "Arpenteur", subGrade: "", tier: "bronze", icon: "users", title: "Arpenteur" },
  { grade: "Éclaireur", subGrade: "", tier: "bronze", icon: "users", title: "Éclaireur" },
  { grade: "Patrouilleur", subGrade: "", tier: "bronze", icon: "users", title: "Patrouilleur" },
  { grade: "Repéreur", subGrade: "", tier: "silver", icon: "users", title: "Repéreur" },
  { grade: "Cartographe", subGrade: "", tier: "gold", icon: "users", title: "Cartographe" },
  { grade: "Coordinateur", subGrade: "", tier: "gold", icon: "users", title: "Coordinateur" },
  { grade: "Sentinelle", subGrade: "", tier: "diamond", icon: "users", title: "Sentinelle" },
  { grade: "Régulateur", subGrade: "", tier: "diamond", icon: "users", title: "Régulateur" },
  { grade: "Conservateur", subGrade: "", tier: "diamond", icon: "users", title: "Conservateur" },
  { grade: "Gardien", subGrade: "", tier: "cosmic", icon: "users", title: "Gardien" },
  { grade: "Maître des Cartes", subGrade: "", tier: "cosmic", icon: "users", title: "Maître des Cartes" },
];

function toRomanNumeral(value: number): string {
  if (!Number.isFinite(value) || value < 1) {
    return "II";
  }

  const numerals: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  let remaining = Math.max(1, Math.trunc(value));
  let result = "";
  for (const [threshold, glyph] of numerals) {
    while (remaining >= threshold) {
      result += glyph;
      remaining -= threshold;
    }
  }
  return result || "I";
}

export function computeActionCreationRank(level: number): ActionCreationBadgeRank {
  if (level <= 0) return ACTION_CREATION_RANKS[0];
  if (level < ACTION_CREATION_RANKS.length) {
    return ACTION_CREATION_RANKS[level];
  }

  const infiniteIndex = level - ACTION_CREATION_RANKS.length + 2;
  const numeral = toRomanNumeral(infiniteIndex);
  return {
    grade: "Pilier",
    subGrade: numeral,
    tier: "cosmic",
    icon: "users",
    title: `Pilier ${numeral}`,
  };
}

export const BADGE_TIER_STYLES: Record<BadgeTier, {
  container: string;
  glow: string;
  progress: string;
  text: string;
  ornament: string;
  modalContainer: string;
  modalStatCard: string;
  modalIconContainer: string;
  closeButton: string;
  primaryButton: string;
}> = {
  wood: {
    container: "border-[#4A3219]/30 bg-[#2D1B0A]/80 backdrop-blur-md shadow-inner",
    glow: "bg-[#8B5A2B]/10",
    progress: "bg-[#8B5A2B]/90",
    text: "text-amber-100",
    ornament: "border-[#8B5A2B]/10",
    modalContainer: "border-[#4A3219]/40 bg-[#1A1006]/95 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(45,27,10,0.6)]",
    modalStatCard: "border-[#4A3219]/50 bg-[#2D1B0A]/50",
    modalIconContainer: "border-[#8B5A2B] bg-[#2D1B0A] text-amber-500",
    closeButton: "bg-[#2D1B0A] text-amber-500 hover:bg-[#4A3219] hover:text-amber-400",
    primaryButton: "bg-[#8B5A2B] text-amber-50 hover:bg-[#A06A3B]",
  },
  bronze: {
    container: "border-orange-500/30 bg-orange-950/70 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_20px_rgba(154,52,18,0.2)]",
    glow: "bg-orange-600/15",
    progress: "bg-gradient-to-r from-orange-600 to-amber-500",
    text: "text-orange-50",
    ornament: "border-orange-500/20",
    modalContainer: "border-orange-900/60 bg-gradient-to-b from-orange-950 to-neutral-950 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(154,52,18,0.4)]",
    modalStatCard: "border-orange-900/50 bg-orange-950/40",
    modalIconContainer: "border-orange-500/80 bg-gradient-to-br from-orange-800 to-orange-950 text-orange-200",
    closeButton: "bg-orange-950 text-orange-400 hover:bg-orange-900 hover:text-orange-300",
    primaryButton: "bg-gradient-to-r from-orange-600 to-amber-600 text-orange-50 hover:from-orange-500 hover:to-amber-500",
  },
  silver: {
    container: "border-slate-300/40 bg-slate-800/70 backdrop-blur-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_25px_rgba(15,23,42,0.5)]",
    glow: "bg-slate-300/20",
    progress: "bg-gradient-to-r from-slate-400 to-slate-200",
    text: "text-white",
    ornament: "border-slate-300/20",
    modalContainer: "border-slate-600/50 bg-gradient-to-b from-slate-800 to-slate-950 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(148,163,184,0.3)]",
    modalStatCard: "border-slate-600/50 bg-slate-800/40",
    modalIconContainer: "border-slate-300 bg-gradient-to-br from-slate-500 to-slate-700 text-white",
    closeButton: "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white",
    primaryButton: "bg-slate-200 text-slate-900 hover:bg-white",
  },
  gold: {
    container: "border-yellow-400/50 bg-yellow-900/70 backdrop-blur-xl shadow-[inset_0_1px_2px_rgba(253,224,71,0.5),0_10px_30px_rgba(161,98,7,0.3)]",
    glow: "bg-yellow-400/25",
    progress: "bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-500",
    text: "text-yellow-50",
    ornament: "border-yellow-400/30",
    modalContainer: "border-yellow-600/50 bg-gradient-to-b from-yellow-900 to-neutral-950 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(234,179,8,0.3)]",
    modalStatCard: "border-yellow-700/50 bg-yellow-950/40",
    modalIconContainer: "border-yellow-400 bg-gradient-to-br from-yellow-600 to-yellow-800 text-yellow-100",
    closeButton: "bg-yellow-950/80 text-yellow-500 hover:bg-yellow-900 hover:text-yellow-400",
    primaryButton: "bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 hover:from-yellow-400 hover:to-amber-400",
  },
  diamond: {
    container: "border-cyan-300/60 bg-cyan-950/70 backdrop-blur-xl shadow-[inset_0_1px_3px_rgba(103,232,249,0.8),0_0_20px_rgba(6,182,212,0.3)]",
    glow: "bg-cyan-400/30",
    progress: "bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]",
    text: "text-cyan-50",
    ornament: "border-cyan-300/40",
    modalContainer: "border-cyan-500/50 bg-gradient-to-b from-cyan-950 to-slate-950 backdrop-blur-2xl shadow-[0_0_60px_-15px_rgba(6,182,212,0.4)]",
    modalStatCard: "border-cyan-800/50 bg-cyan-950/40",
    modalIconContainer: "border-cyan-300 bg-gradient-to-br from-cyan-600 to-teal-800 text-cyan-50",
    closeButton: "bg-cyan-950/80 text-cyan-400 hover:bg-cyan-900 hover:text-cyan-300",
    primaryButton: "bg-gradient-to-r from-cyan-500 to-teal-500 text-cyan-50 hover:from-cyan-400 hover:to-teal-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]",
  },
  cosmic: {
    container: "border-fuchsia-400/70 bg-indigo-950/80 backdrop-blur-2xl shadow-[inset_0_1px_4px_rgba(232,121,249,0.9),0_0_30px_rgba(192,38,211,0.4)]",
    glow: "bg-gradient-to-r from-fuchsia-500/20 via-violet-500/20 to-fuchsia-500/20 animate-pulse",
    progress: "bg-gradient-to-r from-fuchsia-400 via-indigo-400 to-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.8)]",
    text: "text-fuchsia-50",
    ornament: "border-fuchsia-400/50 border-dashed animate-[spin_10s_linear_infinite]",
    modalContainer: "border-fuchsia-500/50 bg-gradient-to-b from-indigo-950 via-purple-950 to-neutral-950 backdrop-blur-2xl shadow-[0_0_80px_-15px_rgba(217,70,239,0.5)]",
    modalStatCard: "border-fuchsia-800/50 bg-indigo-950/40",
    modalIconContainer: "border-fuchsia-400 bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-900 text-fuchsia-50",
    closeButton: "bg-indigo-950/80 text-fuchsia-400 hover:bg-purple-900 hover:text-fuchsia-300",
    primaryButton: "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 text-white hover:from-fuchsia-500 hover:via-purple-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(192,38,211,0.5)]",
  }
};
