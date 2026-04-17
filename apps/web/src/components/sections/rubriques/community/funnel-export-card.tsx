"use client";

function CommunityFunnelExportCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Export coordination hebdo
        </h2>
        <a
          href="/api/community/funnel.csv?days=90&limit=600"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Export CSV funnel community
        </a>
      </div>
      <p className="mt-1 text-xs text-slate-600">
        Export par evenement: RSVP, presence, conversions et actions liees pour
        pilotage hebdomadaire.
      </p>
    </div>
  );
}

export { CommunityFunnelExportCard };
