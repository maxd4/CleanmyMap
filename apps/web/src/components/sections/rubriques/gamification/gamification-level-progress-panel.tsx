import { CheckCircle2, Flag, LockKeyhole, TrendingUp } from "lucide-react";
import { SectionLabel } from "./gamification-shell";
import { getLevelProgressPercent } from "./gamification-level-progress.model";
import {
  GamificationPanelSkeleton,
  GamificationPanelShell,
  type GamificationPanelProps,
} from "./gamification-panel-state";
import { formatProgressionRequirement } from "./progression-requirement-copy";

function formatXp(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
}

type Progression = NonNullable<GamificationPanelProps["progression"]>;

function LevelSummaryCards({ progression, fr }: { progression: Progression; fr: boolean }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <article className="rounded-[1.65rem] border border-[#f1d9d3] bg-[#fff7f5] p-5">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#b53a33]">{fr ? "Niveau actuel" : "Current level"}</p>
        <p className="mt-2 text-4xl font-black tracking-[-0.06em] text-[#281413]">{progression.currentLevel}</p>
      </article>
      <article className="rounded-[1.65rem] border border-[#eadfd9] bg-white p-5">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8b7069]">{fr ? "Niveau potentiel" : "Potential level"}</p>
        <p className="mt-2 text-4xl font-black tracking-[-0.06em] text-[#281413]">{progression.potentialLevel}</p>
        {progression.potentialLevel > progression.currentLevel ? (
          <p className="mt-1 text-xs font-semibold text-[#b53a33]">{fr ? "Potentiel supérieur, prérequis à compléter" : "Higher potential, requirements to complete"}</p>
        ) : null}
      </article>
    </div>
  );
}

function LevelXpCards({ progression, fr }: { progression: Progression; fr: boolean }) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="rounded-[1.5rem] border border-[#f0e3de] bg-white p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8b7069]">{fr ? "XP validée" : "Validated XP"}</p>
        <p className="mt-2 text-2xl font-black text-[#c51f1f]">{formatXp(progression.xpValidated)} XP</p>
        <p className="mt-1 text-xs text-[#7a625d]">{fr ? "Comptée dans le niveau actuel." : "Counted in the current level."}</p>
      </div>
      <div className="rounded-[1.5rem] border border-[#f0e3de] bg-[#fffaf9] p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8b7069]">{fr ? "XP en attente" : "Pending XP"}</p>
        <p className="mt-2 text-2xl font-black text-[#8c716b]">{formatXp(progression.xpPending)} XP</p>
        <p className="mt-1 text-xs font-semibold text-[#8c716b]">{fr ? "Non comptée tant qu'elle n'est pas validée." : "Not counted until validated."}</p>
      </div>
    </div>
  );
}

function NextLevelCard({ progression, fr, locale }: { progression: Progression; fr: boolean; locale: string }) {
  const progressPercent = getLevelProgressPercent(progression.xpValidated, progression.nextLevel.xpRequired);

  return (
    <div className="mt-5 rounded-[1.75rem] border border-[#efc7c1] bg-[#fff7f5] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c63b35]">{fr ? "Prochain niveau" : "Next level"}</p>
          <p className="mt-2 text-xl font-black text-[#281413]">{progression.nextLevel.level}</p>
        </div>
        <p className="text-sm font-bold text-[#7d625d]">{formatXp(progression.xpValidated)} / {formatXp(progression.nextLevel.xpRequired)} XP</p>
      </div>
      <div
        className="mt-4 h-3 overflow-hidden rounded-full border border-[#efd2cc] bg-white"
        role="progressbar"
        aria-label={fr ? "Progression vers le prochain niveau" : "Progress toward the next level"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
      >
        <div className="h-full rounded-full bg-[#c51f1f] transition-[width]" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7d625d]">
        <span>{progressPercent}%</span>
        <span>{formatXp(progression.nextLevel.xpRemaining)} XP {fr ? "restantes" : "remaining"}</span>
      </div>
      {progression.nextLevel.frozen ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#efc7c1] bg-white p-3 text-sm text-[#8c3d36]">
          <LockKeyhole className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
          <span>{fr ? "Niveau bloqué par des prérequis de contribution." : "Level blocked by contribution requirements."}</span>
        </div>
      ) : null}
      {progression.nextLevel.requirements.missing.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#a84a41]">{fr ? "Prérequis encore manquants" : "Requirements still missing"}</p>
          {progression.nextLevel.requirements.missing.map((condition) => (
            <p key={condition.id} className="flex items-center gap-2 rounded-xl border border-[#f0e0dc] bg-white px-3 py-2 text-sm text-[#6e5550]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c51f1f]" aria-hidden="true" />
              {formatProgressionRequirement(condition, locale)}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#287348]"><CheckCircle2 size={17} aria-hidden="true" />{fr ? "Tous les prérequis sont remplis." : "All requirements are met."}</p>
      )}
    </div>
  );
}

function MonthlyMilestoneCard({ milestone, fr }: { milestone: NonNullable<Progression["monthlyMilestone"]>; fr: boolean }) {
  return (
    <div className="mt-5 rounded-[1.65rem] border border-[#f0dfd9] bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff0ee] text-[#c51f1f]"><Flag size={18} aria-hidden="true" /></div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b53a33]">{fr ? "Milestone mensuel" : "Monthly milestone"}</p>
          <p className="mt-1 text-sm font-bold text-[#281413]">{milestone.description}</p>
          <p className="mt-2 text-xs text-[#7d625d]">{formatXp(milestone.currentKg)} kg / {formatXp(milestone.targetKg)} kg{milestone.isCompleted ? (fr ? " · Atteint" : " · Completed") : ""}</p>
        </div>
      </div>
    </div>
  );
}

function LevelContent({ progression, fr, locale }: { progression: Progression; fr: boolean; locale: string }) {
  return (
    <GamificationPanelShell id="gamification-level-progress" tabIndex={-1}>
      <SectionLabel
        icon={TrendingUp}
        title={fr ? "Niveau global" : "Global level"}
        subtitle={fr ? "Une progression personnelle fondée sur les contributions vérifiées." : "Personal progress based on verified contributions."}
      />
      <LevelSummaryCards progression={progression} fr={fr} />
      <LevelXpCards progression={progression} fr={fr} />
      <NextLevelCard progression={progression} fr={fr} locale={locale} />
      {progression.monthlyMilestone ? <MonthlyMilestoneCard milestone={progression.monthlyMilestone} fr={fr} /> : null}
    </GamificationPanelShell>
  );
}

export function GamificationLevelProgressPanel({
  progression,
  loading,
  error,
  locale,
}: GamificationPanelProps) {
  const fr = locale === "fr";

  if (loading) {
    return <GamificationPanelSkeleton ariaLabel={fr ? "Chargement du niveau global" : "Loading global level"} blocks={2} />;
  }

  if (error || !progression) {
    return (
      <GamificationPanelShell>
        <SectionLabel
          icon={TrendingUp}
          title={fr ? "Niveau global" : "Global level"}
          subtitle={fr ? "Votre niveau personnel est temporairement indisponible." : "Your personal level is temporarily unavailable."}
        />
      </GamificationPanelShell>
    );
  }

  return <LevelContent progression={progression} fr={fr} locale={locale} />;
}
