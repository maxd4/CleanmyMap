"use client";

function CommunityFunnelExportCard() {
 return (
 <div className="rounded-xl border border-slate-200 bg-white p-4">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <h2 className="cmm-text-small font-semibold cmm-text-primary">
 Export coordination hebdo
 </h2>
 <a
 href="/api/community/funnel.csv?days=90&limit=600"
 target="_blank"
 rel="noreferrer"
 className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary transition hover:bg-slate-100"
 >
 Export CSV funnel community
 </a>
 </div>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 Export par evenement: RSVP, presence, conversions et actions liees pour
 pilotage hebdomadaire.
 </p>
 </div>
 );
}

export { CommunityFunnelExportCard };
