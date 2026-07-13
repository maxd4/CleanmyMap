import React from "react";
import { BadgeShowcase } from "@/components/gamification/badge-showcase";
import { IdentityBadge } from "@/components/ui/identity-badge";
import { getGamificationBadgeIconName } from "@/components/gamification/badge-icon";
import { AnimatedCounter } from "@/components/gamification/animated-counter";
import { GamificationImpactMethodologyCard } from "@/components/sections/rubriques/gamification-impact-methodology-card";
import { ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { MohsBadge } from "@/components/gamification/mohs-badge";
import type { MeResponse } from "./gamification-types";

type ProgressionType = MeResponse["progression"];

interface PersonalProgressProps {
  progression: ProgressionType | undefined;
  progressToNext: number;
  loading: boolean;
  error: unknown;
  locale: string;
  badgeTotals?: { wasteKg: number; butts: number };
  badgeTotalsLoading?: boolean;
  badgeTotalsError?: unknown;
}



export function PersonalProgress({
  progression,
  progressToNext,
  loading,
  error,
  locale,
  badgeTotals,
  badgeTotalsLoading,
  badgeTotalsError,
}: PersonalProgressProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Abstract background highlight */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 blur-[100px] pointer-events-none" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <h3 className="text-[11px] font-black cmm-text-primary uppercase tracking-[0.3em]">
            {locale === "fr" ? "Statut Opérationnel" : "Operational Status"}
          </h3>
          {!loading && progression && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Actif</span>
            </div>
          )}
        </div>
        
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="grid gap-4 grid-cols-2">
              <div className="h-28 rounded-3xl bg-white/[0.03] border border-white/5"></div>
              <div className="h-28 rounded-3xl bg-white/[0.03] border border-white/5"></div>
            </div>
            <div className="h-32 rounded-3xl bg-white/[0.03] border border-white/5"></div>
            <div className="h-40 rounded-3xl bg-white/[0.03] border border-white/5"></div>
          </div>
        )}
        
        {Boolean(error) && !loading && (
          <div className="py-12 flex flex-col items-center gap-4 text-red-400 opacity-60">
            <ShieldCheck size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Moteur de progression hors-ligne</p>
          </div>
        )}
        
        {!loading && progression && (
          <div className="space-y-6 relative z-10">
            <div className="grid gap-4 grid-cols-2">
              <article className="rounded-[2rem] border border-white/5 bg-slate-950/40 p-6 group hover:border-red-500/20 transition-all">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 group-hover:text-red-500 transition-colors">Niveau actuel</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white tracking-tighter">
                    {progression.currentLevel}
                  </span>
                  {progression.potentialLevel > progression.currentLevel ? (
                    <span className="text-[10px] font-bold text-red-500/80 italic animate-pulse">
                      Potentiel {progression.potentialLevel}
                    </span>
                  ) : null}
                </div>
              </article>
              <article className="rounded-[2rem] border border-white/5 bg-slate-950/40 p-6 group hover:border-red-500/20 transition-all">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 group-hover:text-red-500 transition-colors">Ranking Global</p>
                <div className="flex flex-col">
                  <span className="text-4xl font-black text-white tracking-tighter">
                    {progression.dynamicRanking.rank ? `#${progression.dynamicRanking.rank}` : "—"}
                  </span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                    {progression.dynamicRanking.percentile
                      ? `Top ${progression.dynamicRanking.percentile}%`
                      : "Calcul en cours"}
                  </span>
                </div>
              </article>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <article className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.02] p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Sparkles size={40} className="text-red-500" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500/60 mb-2">
                  {locale === "fr" ? "XP de progression (validés)" : "Progress XP (validated)"}
                </p>
                <p className="text-3xl font-black text-red-400 tracking-tighter">
                  <AnimatedCounter value={progression.xpValidated} direction="up" />
                </p>
              </article>
              <article className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.02] p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ShieldCheck size={40} className="text-red-500" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500/60 mb-2">
                  {locale === "fr" ? "XP en attente (non comptés)" : "Pending XP (not counted)"}
                </p>
                <p className="text-3xl font-black text-red-400 tracking-tighter">
                  <AnimatedCounter value={progression.xpPending} direction="up" />
                </p>
                <p className="mt-1 text-[8px] font-black text-red-500/40 uppercase tracking-widest">
                  {locale === "fr" ? "Vérification manuelle" : "Manual review"}
                </p>
              </article>
            </div>

            {badgeTotals && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <MohsBadge
                  family="waste"
                  value={badgeTotals.wasteKg}
                  locale={locale}
                  showHistory
                />
                <MohsBadge
                  family="butts"
                  value={badgeTotals.butts}
                  locale={locale}
                  showHistory
                />
              </div>
            )}
            {progression?.yearToDateImpact && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <article className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.02] p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500/60 mb-2">
                    {locale === "fr" ? "Bilan année en cours" : "Year-to-date balance"}
                  </p>
                  <p className="text-3xl font-black text-red-400 tracking-tighter">
                    <AnimatedCounter value={progression.yearToDateImpact.validatedActions} direction="up" />
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-500">
                    {locale === "fr" ? "actions validées" : "validated actions"}
                  </p>
                </article>
                <article className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.02] p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500/60 mb-2">
                    {locale === "fr" ? "Masse YTD" : "YTD waste"}
                  </p>
                  <p className="text-3xl font-black text-red-400 tracking-tighter">
                    <AnimatedCounter value={progression.yearToDateImpact.wasteKg} direction="up" />
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-500">
                    kg
                  </p>
                </article>
              </div>
            )}

            {progression.annualRecognition.currentContributor && (
              <div className="rounded-[2rem] border border-amber-500/15 bg-amber-500/[0.04] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">
                    {locale === "fr" ? "Contributeur de l'année" : "Contributor of the year"}
                  </p>
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-amber-300">
                    YTD
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold text-white">
                  {progression.annualRecognition.currentContributor.highlight}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  {progression.annualRecognition.currentContributor.thanksMessage}
                </p>
              </div>
            )}
            {!badgeTotals && !badgeTotalsLoading && !badgeTotalsError && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="rounded-[2rem] border border-white/5 bg-slate-950/40 p-5 h-32 animate-pulse" />
                <div className="rounded-[2rem] border border-white/5 bg-slate-950/40 p-5 h-32 animate-pulse" />
              </div>
            )}

            {progression.monthlyMilestone && (
              <div className="rounded-[2rem] border border-white/5 bg-slate-950/60 p-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                    Objectif Mensuel
                  </p>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {progression.monthlyMilestone.label}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.03] border border-white/5 p-0.5">
                  <div
                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-1000 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                    style={{ width: `${progression.monthlyMilestone.progressPercent}%` }}
                  />
                </div>
                <div className="mt-4 flex justify-between items-end">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-white tracking-tighter">
                      <AnimatedCounter value={progression.monthlyMilestone.currentValue} />
                    </span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {progression.monthlyMilestone.unit}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                    Target: {progression.monthlyMilestone.targetValue}
                  </span>
                </div>
              </div>
            )}

            <div className="rounded-[2rem] border border-white/5 bg-slate-950/40 p-6">
              <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Vers le niveau {progression.nextLevel.level}
                </p>
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">
                  {progressToNext}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.03] border border-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
              <p className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                <span>{locale === "fr" ? "XP restantes" : "XP remaining"}</span>
                <span className="text-white tracking-tighter text-sm">
                  {progression.nextLevel.xpRemaining} XP
                </span>
              </p>
              
              {progression.nextLevel.frozen && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center gap-3">
                  <ShieldCheck size={14} className="text-red-500 shrink-0" />
                  <p className="text-[9px] font-black text-red-500 uppercase tracking-widest leading-relaxed">
                    Accès restreint : des prérequis bloquent le passage au grade supérieur.
                  </p>
                </div>
              )}

              {progression.nextLevel.requirements.missing.length > 0 && (
                <div className="mt-4 space-y-2">
                  {progression.nextLevel.requirements.missing.map((missing) => (
                    <div key={missing} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="w-1 h-1 rounded-full bg-red-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{missing}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <article className="rounded-[2rem] border border-white/5 bg-slate-950/40 p-6">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Distinctions Honorifiques</p>
              <BadgeShowcase badges={progression.badges} />
            </article>

            {progression.recognition.currentContributor && (
            <article className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.03] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">
                    Reconnaissance utile
                  </p>
                  <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-red-400">
                    Contributions vérifiées
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Profil utile
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white leading-relaxed">
                      {progression.recognition.currentContributor.highlight}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Statut
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white leading-relaxed">
                      {progression.recognition.currentContributor.mentorEligible
                        ? "Mentor local activable"
                        : progression.recognition.currentContributor.regularityLabel}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {progression.recognition.currentContributor.badges.map((badge) => (
                    <IdentityBadge
                      key={badge}
                      icon={getGamificationBadgeIconName(badge)}
                      label={badge}
                      tone="gamification"
                    />
                  ))}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Zone
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {progression.recognition.currentContributor.topZone}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Actions vérifiées
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {progression.recognition.currentContributor.verifiedContributions}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Régularité
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {progression.recognition.currentContributor.regularityLabel}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs font-medium leading-relaxed text-red-100/80">
                  {progression.recognition.currentContributor.thanksMessage}
                </p>
              </article>
            )}

            <details className="group rounded-[2rem] border border-white/5 bg-slate-950/40 transition-all overflow-hidden">
              <summary className="cursor-pointer p-6 list-none flex items-center justify-between group-hover:bg-white/[0.02] transition-colors">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                  Méthodologie d&apos;impact
                </span>
                <span className="text-xs text-slate-600 transition-transform group-open:rotate-180">
                  <Trophy size={14} />
                </span>
              </summary>
              <div className="px-6 pb-6 pt-2">
                <GamificationImpactMethodologyCard
                  methodology={progression.impactMethodology}
                />
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
