"use client";

import { computeEventStaffingPlan } from "@/lib/community/engagement";
import { formatFrDate } from "@/components/sections/rubriques/community/helpers";
import { Users, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type CommunityStaffingCardProps = {
  staffingPlan: ReturnType<typeof computeEventStaffingPlan>;
};

function CommunityStaffingCard(props: CommunityStaffingCardProps) {
  const { staffingPlan } = props;

  return (
    <div className="rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl p-8 shadow-2xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Users size={18} />
          </div>
          <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
            Capacité & Staffing Événement
          </h2>
        </div>
        <div className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Gap Global:{" "}
            <span className="text-amber-400">
              {staffingPlan.summary.totalStaffingGap}
            </span>{" "}
            / {staffingPlan.summary.totalRecommendedStaff}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-white/5 bg-white/5 p-5 group hover:bg-white/10 transition-colors">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
            Événements Analysés
          </p>
          <p className="text-3xl font-black text-white tracking-tighter">
            {staffingPlan.summary.eventsCount}
          </p>
        </article>
        <article className="rounded-2xl border border-white/5 bg-white/5 p-5 group hover:bg-white/10 transition-colors">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 text-amber-500/60">
            Événements à Risque
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-amber-400 tracking-tighter">
              {staffingPlan.summary.atRiskCount}
            </p>
            {staffingPlan.summary.atRiskCount > 0 && (
              <AlertTriangle size={14} className="text-amber-500 animate-pulse" />
            )}
          </div>
        </article>
        <article className="rounded-2xl border border-white/5 bg-white/5 p-5 group hover:bg-white/10 transition-colors">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 text-emerald-500/60">
            Référents Confirmés
          </p>
          <p className="text-3xl font-black text-emerald-400 tracking-tighter">
            {staffingPlan.summary.totalConfirmedStaff}
          </p>
        </article>
      </div>

      <ul className="space-y-4">
        {staffingPlan.rows.slice(0, 6).map((row) => (
          <li
            key={`staff-${row.eventId}`}
            className="rounded-[2rem] border border-white/5 bg-slate-950/20 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/10 transition-colors group"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                  row.riskLevel === "rouge" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                  row.riskLevel === "orange" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                )}>
                  RISQUE {row.riskLevel.toUpperCase()}
                </span>
                <p className="text-sm font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                  {row.title}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                <span>{formatFrDate(row.eventDate)}</span>
                <span className="opacity-20">•</span>
                <span>{row.locationLabel}</span>
                <span className="opacity-20">•</span>
                <span className="text-slate-400">{row.expectedParticipants} participants</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right space-y-1">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Staffing</p>
                <div className="flex items-center gap-2 text-sm font-black tracking-tighter">
                  <span className="text-emerald-400">{row.confirmedStaff}</span>
                  <span className="text-slate-700">/</span>
                  <span className="text-white">{row.recommendedStaff}</span>
                </div>
              </div>
              {row.staffingGap > 0 && (
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-xs">
                  -{row.staffingGap}
                </div>
              )}
            </div>
          </li>
        ))}
        {staffingPlan.rows.length === 0 && (
          <li className="rounded-[2rem] border border-dashed border-white/10 p-10 text-center">
            <div className="flex flex-col items-center gap-3 opacity-40">
              <ShieldCheck size={32} className="text-slate-500" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                Aucun événement à venir ne nécessite de renfort particulier.
              </p>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}

export { CommunityStaffingCard };
