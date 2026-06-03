import React from "react";

// Échelle Mohs héritée : 10 minéraux = 10 grades
const MOHS_GRADES = [
  { grade: 1, name: "Talc",      emoji: "🪨" },
  { grade: 2, name: "Gypse",     emoji: "🪨" },
  { grade: 3, name: "Calcite",   emoji: "🪨" },
  { grade: 4, name: "Fluorite",  emoji: "💎" },
  { grade: 5, name: "Apatite",   emoji: "💎" },
  { grade: 6, name: "Orthose",   emoji: "💎" },
  { grade: 7, name: "Quartz",    emoji: "🔷" },
  { grade: 8, name: "Topaze",    emoji: "🔷" },
  { grade: 9, name: "Corindon",  emoji: "✨" },
  { grade: 10, name: "Diamant",  emoji: "💠" },
] as const;

const GRADE_COLORS: Record<number, { text: string; border: string; bg: string; bar: string }> = {
  1:  { text: "text-slate-400",   border: "border-slate-600/30",  bg: "bg-slate-500/5",  bar: "from-slate-600 to-slate-500" },
  2:  { text: "text-slate-300",   border: "border-slate-500/30",  bg: "bg-slate-500/5",  bar: "from-slate-500 to-slate-400" },
  3:  { text: "text-stone-300",   border: "border-stone-500/30",  bg: "bg-stone-500/5",  bar: "from-stone-600 to-stone-400" },
  4:  { text: "text-violet-400",  border: "border-violet-500/30", bg: "bg-violet-500/5", bar: "from-violet-600 to-violet-400" },
  5:  { text: "text-teal-400",    border: "border-teal-500/30",   bg: "bg-teal-500/5",   bar: "from-teal-600 to-teal-400" },
  6:  { text: "text-amber-400",   border: "border-amber-500/30",  bg: "bg-amber-500/5",  bar: "from-amber-600 to-amber-400" },
  7:  { text: "text-rose-400",    border: "border-rose-500/30",   bg: "bg-rose-500/5",   bar: "from-rose-600 to-rose-400" },
  8:  { text: "text-pink-400",    border: "border-pink-500/30",   bg: "bg-pink-500/5",   bar: "from-pink-500 to-pink-300" },
  9:  { text: "text-red-400",     border: "border-red-500/30",    bg: "bg-red-500/5",    bar: "from-red-600 to-red-400" },
  10: { text: "text-sky-300",     border: "border-sky-400/40",    bg: "bg-sky-400/10",   bar: "from-sky-400 to-cyan-300" },
};

// Paliers : chaque grade correspond à un seuil cumulatif
// Déchets : 1 grade tous les 20 kg → grade 1 < 20kg, grade 2 = 20–39, …, grade 10 ≥ 180kg
// Mégots  : 1 grade tous les 2 000 → grade 1 < 2000, …, grade 10 ≥ 18000

export function getMohsGradeInfo(value: number, stepPerGrade: number) {
  const gradeIndex = Math.min(9, Math.floor(value / stepPerGrade)); // 0-based
  const current = MOHS_GRADES[gradeIndex];
  const next = gradeIndex < 9 ? MOHS_GRADES[gradeIndex + 1] : null;

  const currentThreshold = gradeIndex * stepPerGrade;
  const nextThreshold = (gradeIndex + 1) * stepPerGrade;
  const progressInGrade = value - currentThreshold;
  const neededForNext = next ? stepPerGrade : 0;
  const remainingForNext = next ? nextThreshold - value : 0;
  const progressPct = next ? Math.min(100, (progressInGrade / neededForNext) * 100) : 100;

  return { current, next, progressPct, remainingForNext, currentThreshold, nextThreshold };
}

interface MohsBadgeProps {
  family: "waste" | "butts";
  value: number;
  locale: string;
  /** Show last N past grades as history */
  showHistory?: boolean;
}

export function MohsBadge({ family, value, locale, showHistory = false }: MohsBadgeProps) {
  const stepPerGrade = family === "waste" ? 20 : 2000;
  const { current, next, progressPct, remainingForNext } = getMohsGradeInfo(value, stepPerGrade);
  const colors = GRADE_COLORS[current.grade];

  const unit = family === "waste" ? "kg" : (locale === "fr" ? "mégots" : "butts");
  const label = family === "waste"
    ? (locale === "fr" ? "Badge Déchets - Échelle Mohs héritée" : "Waste Badge - inherited Mohs scale")
    : (locale === "fr" ? "Badge Mégots - Échelle Mohs héritée" : "Butts Badge - inherited Mohs scale");

  // Grades franchis (pour l'historique)
  const achievedGradeIndex = Math.min(9, Math.floor(value / stepPerGrade));
  const achievedGrades = MOHS_GRADES.slice(0, achievedGradeIndex); // tous sauf le courant

  return (
    <div className={`rounded-[2rem] border ${colors.border} ${colors.bg} p-5 flex flex-col gap-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <span className={`text-[9px] font-black uppercase tracking-widest ${colors.text}`}>
          Grade {current.grade} / 10
        </span>
      </div>

      {/* Grade actuel */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">{current.emoji}</span>
        <div>
          <p className={`text-xl font-black tracking-tight ${colors.text}`}>{current.name}</p>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            {value.toLocaleString(locale)} {unit} collectés
          </p>
          <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
            Échelle minérale héritée distincte de la gemme
          </p>
        </div>
      </div>

      {/* Barre de progression vers le grade suivant */}
      {next ? (
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              {locale === "fr" ? "Vers" : "Towards"} {next.name}
            </span>
            <span className={`text-[9px] font-black uppercase tracking-widest ${colors.text}`}>
              {Math.round(progressPct)}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${colors.bar} transition-all duration-700 shadow-sm`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className={`mt-2 text-[9px] font-black uppercase tracking-widest ${colors.text} opacity-80`}>
            {remainingForNext.toLocaleString(locale)} {unit} avant {next.name} {next.emoji}
          </p>
        </div>
      ) : (
        <p className={`text-[9px] font-black uppercase tracking-widest ${colors.text}`}>
          ✦ Grade maximum atteint
        </p>
      )}

      {/* Historique des grades franchis */}
      {showHistory && achievedGrades.length > 0 && (
        <div className="pt-3 border-t border-white/5">
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-2">
            {locale === "fr" ? "Grades franchis" : "Past grades"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {achievedGrades.map((g) => (
              <span
                key={g.grade}
                className="text-[8px] font-black px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/5 text-slate-500 uppercase tracking-wider"
              >
                {g.emoji} {g.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
