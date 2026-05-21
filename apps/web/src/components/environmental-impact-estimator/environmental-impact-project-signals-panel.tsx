"use client";

import type { EnvironmentalImpactProjectSignals } from "@/lib/environmental-impact-estimator/types";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value);
}

type EnvironmentalImpactProjectSignalsPanelProps = {
  signals: EnvironmentalImpactProjectSignals["signalBreakdown"];
};

export function EnvironmentalImpactProjectSignalsPanel({
  signals,
}: EnvironmentalImpactProjectSignalsPanelProps) {
  if (!signals) {
    return null;
  }

  return (
    <article className="rounded-3xl border border-white/5 bg-white/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
            Signaux projet détaillés
          </p>
          <p className="mt-1 text-sm text-white/55">
            Même découpage que le PDF mensuel pour garder la fiche admin et le
            rapport sur la même lecture.
          </p>
        </div>
        <div className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
          {formatNumber(signals.traffic.distinctRoutes)} routes distinctes
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className="rounded-3xl border border-white/5 bg-slate-950/40 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
            Trafic
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-black/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                page_view
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {formatNumber(signals.traffic.pageViewEvents)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                vues héritées
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {formatNumber(signals.traffic.legacyPageViewEvents)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                routes distinctes
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {formatNumber(signals.traffic.distinctRoutes)}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">
              Routes les plus vues
            </p>
            {signals.traffic.topRoutes.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {signals.traffic.topRoutes.map((route) => (
                  <li
                    key={route.path}
                    className="rounded-2xl border border-white/5 bg-black/10 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-white">
                        {route.path}
                      </p>
                      <p className="shrink-0 text-sm font-black text-white">
                        {formatNumber(route.count)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-white/35">
                Aucune route détaillée disponible.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/5 bg-slate-950/40 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
            Communauté
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-black/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                événements
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {formatNumber(signals.community.events)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                RSVP
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {formatNumber(signals.community.rsvps)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                notifications
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {formatNumber(signals.community.notifications)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                non lues
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {formatNumber(signals.community.unreadNotifications)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/5 bg-slate-950/40 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
            Communications
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-black/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                emails envoyés
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {formatNumber(signals.communication.emailsSent)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                exports PDF
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {formatNumber(signals.communication.pdfExports)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-white/45">
            Le découpage reprend la structure de gouvernance du PDF mensuel:
            trafic fin, communauté, notifications et communications.
          </p>
        </section>
      </div>
    </article>
  );
}
