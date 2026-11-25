import { CheckCircle2, Flag, LockKeyhole, Shield, Trophy } from "lucide-react";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { getLevelProgressPercent } from "./gamification-level-progress.model";
import { GamificationPanelSkeleton, type GamificationPanelProps } from "./gamification-panel-state";
import { formatProgressionRequirement } from "./progression-requirement-copy";

type Progression = NonNullable<GamificationPanelProps["progression"]>;

function LevelContent({ progression, locale }: { progression: Progression; locale: string }) {
  const fr = locale === "fr";
  const format = (value: number) => new Intl.NumberFormat(fr ? "fr-FR" : "en-US", { maximumFractionDigits: 2 }).format(value);
  const percent = getLevelProgressPercent(progression.xpValidated, progression.nextLevel.xpRequired);
  const next = progression.nextLevel;
  const monthly = progression.monthlyMilestone;
  return (
    <section id="gamification-level-progress" tabIndex={-1} className="scroll-mt-24 rounded-3xl border border-rose-200 bg-gradient-to-br from-white via-rose-50 to-amber-50 p-4 sm:p-6 space-y-4 focus-visible:ring-2 focus-visible:ring-rose-700">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative grid h-24 w-24 shrink-0 place-items-center">
            <Shield size={94} strokeWidth={1.3} className="absolute text-rose-600 fill-rose-100" aria-hidden="true" />
            <div className="relative z-10 text-center"><span className="block text-[10px] font-bold uppercase text-rose-900">{fr ? "Niv." : "Lv."}</span><span className="text-3xl font-black tabular-nums text-rose-950">{progression.currentLevel}</span></div>
          </div>
          <div className="min-w-0"><h2 className="text-lg font-bold cmm-text-primary">{fr ? "Niveau global" : "Global level"}</h2><p className="cmm-text-small cmm-text-secondary">{fr ? "Niveau actuel" : "Current level"} · {progression.currentLevel}</p><p className="mt-1 font-semibold text-rose-900">{fr ? "Niveau potentiel" : "Potential level"} · {progression.potentialLevel}</p>{progression.potentialLevel > progression.currentLevel ? <p className="text-xs text-rose-800">{fr ? "Potentiel supérieur, prérequis à compléter" : "Higher potential, requirements to complete"}</p> : null}</div>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:gap-8">
          <div><dt className="text-xs font-semibold cmm-text-secondary">{fr ? "XP validée" : "Validated XP"}</dt><dd className="text-2xl font-black text-rose-900 tabular-nums">{format(progression.xpValidated)} XP</dd></div>
          <div><dt className="text-xs font-semibold cmm-text-secondary">{fr ? "XP en attente" : "Pending XP"}</dt><dd className="text-2xl font-black cmm-text-primary tabular-nums">{format(progression.xpPending)} XP</dd><dd className="sr-only">{fr ? "Non comptée tant qu'elle n'est pas validée." : "Not counted until validated."}</dd></div>
        </dl>
      </div>
      <div className="rounded-2xl border border-rose-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-bold cmm-text-primary">{fr ? "Prochain niveau" : "Next level"} · {next.level}</p><p className="text-sm font-semibold tabular-nums text-rose-900">{format(progression.xpValidated)} / {format(next.xpRequired)} XP</p></div>
        <div role="progressbar" aria-label={fr ? "Progression vers le prochain niveau" : "Progress toward the next level"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-4 rounded-full bg-rose-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-rose-600 to-amber-500 motion-safe:transition-[width]" style={{ width: `${percent}%` }} /></div>
        <div className="flex justify-between gap-2 text-xs font-semibold cmm-text-secondary"><span>{percent}%</span><span>{format(next.xpRemaining)} XP {fr ? "restantes" : "remaining"}</span></div>
        {next.frozen ? <p className="flex items-center gap-2 text-sm font-bold text-rose-800"><LockKeyhole size={16} aria-hidden="true" />{fr ? "Niveau bloqué par des prérequis" : "Level blocked by requirements"}</p> : null}
        {next.requirements.missing.length ? <CmmDisclosure summary={fr ? `Prérequis encore manquants (${next.requirements.missing.length})` : `Requirements still missing (${next.requirements.missing.length})`} tone="rose" size="sm"><ul className="space-y-2">{next.requirements.missing.map((condition) => <li className="text-sm cmm-text-secondary" key={condition.id}>{formatProgressionRequirement(condition, locale)}</li>)}</ul></CmmDisclosure> : <p className="flex items-center gap-2 text-xs font-semibold text-emerald-800"><CheckCircle2 size={16} aria-hidden="true" />{fr ? "Tous les prérequis sont remplis." : "All requirements are met."}</p>}
      </div>
      {monthly ? <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-white p-3">
        {monthly.isCompleted ? <Trophy className="text-amber-700" size={20} aria-hidden="true" /> : <Flag className="text-rose-800" size={20} aria-hidden="true" />}
        <div className="flex-1 min-w-0"><p className="font-bold text-sm cmm-text-primary">{fr ? "Milestone mensuel" : "Monthly milestone"}</p><p className="text-xs cmm-text-secondary">{monthly.description}</p></div>
        <p className="text-sm font-bold tabular-nums">{format(monthly.currentKg)} kg / {format(monthly.targetKg)} kg{monthly.isCompleted ? (fr ? " · Atteint" : " · Completed") : ""}</p>
      </div> : null}
    </section>
  );
}

export function GamificationLevelProgressPanel({ progression, loading, error, locale }: GamificationPanelProps) {
  const fr = locale === "fr";
  if (loading) return <GamificationPanelSkeleton ariaLabel={fr ? "Chargement du niveau global" : "Loading global level"} blocks={2} />;
  if (error || !progression) return <section id="gamification-level-progress" tabIndex={-1} className="rounded-2xl border border-slate-200 p-4"><h2 className="font-bold">{fr ? "Niveau global" : "Global level"}</h2><p role="status" className="cmm-text-secondary">{fr ? "Votre niveau personnel est temporairement indisponible." : "Your personal level is temporarily unavailable."}</p></section>;
  return <LevelContent progression={progression} locale={locale} />;
}
