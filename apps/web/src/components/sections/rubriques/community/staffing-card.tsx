"use client";

import { computeEventStaffingPlan } from "@/lib/community/engagement";
import { formatFrDate } from "@/components/sections/rubriques/community/helpers";

type CommunityStaffingCardProps = {
  staffingPlan: ReturnType<typeof computeEventStaffingPlan>;
};

function CommunityStaffingCard(props: CommunityStaffingCardProps) {
  const { staffingPlan } = props;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Capacite & staffing evenement
        </h2>
        <p className="text-xs text-slate-600">
          Gap staffing:{" "}
          <span className="font-semibold">
            {staffingPlan.summary.totalStaffingGap}
          </span>{" "}
          sur {staffingPlan.summary.totalRecommendedStaff} referent(s)
          recommandes
        </p>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Evenements analyses
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {staffingPlan.summary.eventsCount}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Evenements a risque
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {staffingPlan.summary.atRiskCount}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Referents confirmes
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {staffingPlan.summary.totalConfirmedStaff}
          </p>
        </article>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {staffingPlan.rows.slice(0, 6).map((row) => (
          <li
            key={`staff-${row.eventId}`}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <p className="font-semibold">
              {row.title} - risque {row.riskLevel.toUpperCase()}
            </p>
            <p className="text-xs text-slate-600">
              {formatFrDate(row.eventDate)} - {row.locationLabel} |
              participants attendus {row.expectedParticipants}
            </p>
            <p className="text-xs text-slate-600">
              Staffing recommande {row.recommendedStaff}, confirme{" "}
              {row.confirmedStaff}, gap {row.staffingGap}.
            </p>
            <p className="text-xs text-slate-500">{row.reason}</p>
          </li>
        ))}
        {staffingPlan.rows.length === 0 ? (
          <li className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
            Aucun evenement a venir necessitant un dimensionnement staffing.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export { CommunityStaffingCard };
