import {
  getMohsGradeInfo,
  MOHS_GRADES,
  type MohsImpactFamily,
} from "@/lib/gamification/mohs-progression";

type GradeColors = { text: string; border: string; bg: string; bar: string };

const GRADE_COLORS: Record<number, GradeColors> = {
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

export { getMohsGradeInfo } from "@/lib/gamification/mohs-progression";

interface MohsBadgeProps {
  family: MohsImpactFamily;
  value: number;
  locale: string;
  rawValue?: number;
  equivalentSecValue?: number;
  unknownConditionCount?: number;
  /** Show last N past grades as history */
  showHistory?: boolean;
}

function MohsWasteDetails({
  locale,
  rawValue,
  equivalentSecValue,
  unknownConditionCount,
}: Pick<MohsBadgeProps, "locale" | "rawValue" | "equivalentSecValue" | "unknownConditionCount">) {
  if (rawValue === undefined && !unknownConditionCount) return null;
  const unknownLabel = locale === "fr"
    ? `${unknownConditionCount} mesure${unknownConditionCount === 1 ? "" : "s"} sans condition d’humidité n’est pas reclassée en équivalent sec.`
    : `${unknownConditionCount} measurement${unknownConditionCount === 1 ? "" : "s"} without a moisture condition is not reclassified as dry equivalent.`;
  return (
    <>
      {rawValue !== undefined && (
        <p className="text-xs font-semibold text-slate-400">
          {locale === "fr" ? "Masse brute" : "Raw mass"}: {rawValue.toLocaleString(locale)} kg
          {equivalentSecValue !== undefined
            ? ` · ${locale === "fr" ? "équivalent sec" : "dry equivalent"}: ${equivalentSecValue.toLocaleString(locale)} kg`
            : ""}
        </p>
      )}
      <p className="text-xs leading-relaxed text-slate-300">
        {unknownConditionCount ? unknownLabel : (locale === "fr"
          ? "Mohs utilise l’équivalent sec versionné lorsqu’une condition est connue ; les quotes-parts sans condition restent identifiées comme masse collective brute."
          : "Mohs uses the versioned dry equivalent when a condition is known; quote-parts without a condition remain identified as raw collective mass.")}
      </p>
    </>
  );
}

function MohsProgress({
  family,
  locale,
  colors,
  grade,
}: Pick<MohsBadgeProps, "family" | "locale"> & {
  colors: GradeColors;
  grade: ReturnType<typeof getMohsGradeInfo>;
}) {
  const unit = family === "waste" ? "kg" : (locale === "fr" ? "mégots" : "butts");
  const nextLabel = grade.next
    ? (locale === "fr" ? `Vers ${grade.next.name}` : `Next: ${grade.next.name}`)
    : (locale === "fr" ? "Diamant atteint" : "Diamond reached");
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-500">
        <span>{nextLabel}</span><span className={colors.text}>{Math.round(grade.progressPct)} %</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-white/[0.04]"
        role="progressbar"
        aria-label={locale === "fr" ? `Progression Mohs ${family === "waste" ? "déchets" : "mégots"}` : `Mohs progress for ${family}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(grade.progressPct)}
      >
        <div className={`h-full rounded-full bg-gradient-to-r ${colors.bar}`} style={{ width: `${grade.progressPct}%` }} />
      </div>
      <p className="text-xs font-semibold text-slate-400">
        {grade.next
          ? `${grade.remainingForNext.toLocaleString(locale)} ${unit} ${locale === "fr" ? "restants · +" : "remaining · +"}${grade.nextXp} XP`
          : (locale === "fr" ? "Tous les grades franchis · +0 XP" : "All grades reached · +0 XP")}
      </p>
    </div>
  );
}

function MohsHistory({ value, stepPerGrade, locale, showHistory }: Pick<MohsBadgeProps, "value" | "locale" | "showHistory"> & { stepPerGrade: number }) {
  if (!showHistory) return null;
  const achievedGrades = MOHS_GRADES.slice(0, Math.min(9, Math.floor(value / stepPerGrade)));
  if (achievedGrades.length === 0) return null;
  return (
    <div className="pt-3 border-t border-white/5">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
        {locale === "fr" ? "Grades franchis" : "Past grades"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {achievedGrades.map((grade) => (
          <span key={grade.grade} className="text-xs font-black px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/5 text-slate-500 uppercase tracking-wider">
            {grade.emoji} {grade.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MohsBadge({ family, value, locale, rawValue, equivalentSecValue, unknownConditionCount = 0, showHistory = false }: MohsBadgeProps) {
  const grade = getMohsGradeInfo(value, family);
  const colors = GRADE_COLORS[grade.current.grade];
  const unit = family === "waste" ? "kg" : (locale === "fr" ? "mégots" : "butts");
  const label = family === "waste"
    ? (locale === "fr" ? "Impact déchets · progression Mohs" : "Waste impact · Mohs progression")
    : (locale === "fr" ? "Impact mégots · progression Mohs" : "Butt impact · Mohs progression");
  return (
    <div className={`rounded-[2rem] border ${colors.border} ${colors.bg} p-5 flex flex-col gap-4`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <span className={`text-xs font-black uppercase tracking-widest ${colors.text}`}>Grade {grade.current.grade} / 10</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{grade.current.emoji}</span>
        <div>
          <p className={`text-xl font-black tracking-tight ${colors.text}`}>{grade.current.name}</p>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{value.toLocaleString(locale)} {unit} attribués</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            {locale === "fr" ? "Impact secondaire · distinct des 7 axes comportementaux" : "Secondary impact · distinct from the 7 behavioural axes"}
          </p>
          {family === "waste" && <MohsWasteDetails locale={locale} rawValue={rawValue} equivalentSecValue={equivalentSecValue} unknownConditionCount={unknownConditionCount} />}
        </div>
      </div>
      <MohsProgress family={family} locale={locale} colors={colors} grade={grade} />
      <MohsHistory value={value} stepPerGrade={grade.stepPerGrade} locale={locale} showHistory={showHistory} />
    </div>
  );
}
