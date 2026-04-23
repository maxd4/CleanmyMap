"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetchActions, fetchMapActions } from "@/lib/actions/http";
import { buildPartnerCards } from "@/lib/community/engagement";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

function extractArea(label: string): string {
  const normalized = label.toLowerCase();
  const matched = normalized.match(/\b([1-9]|1[0-9]|20)(?:e|eme|er)?\b/);
  if (!matched) {
    return "Hors arrondissement";
  }
  return `${matched[1]}e`;
}

export function ActorsSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const { data } = useSWR(["section-actors-map"], () =>
    fetchMapActions({ limit: 220, days: 365, status: "approved" }),
  );
  const actions = useSWR(["section-actors-actions"], () =>
    fetchActions({ status: "approved", limit: 250 }),
  );

  const hotspots = useMemo(() => {
    const byArea = new Map<string, number>();
    for (const item of data?.items ?? []) {
      const area = extractArea(item.location_label ?? "");
      byArea.set(area, (byArea.get(area) ?? 0) + 1);
    }
    return [...byArea.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [data?.items]);

  const hotspotSet = useMemo(
    () => new Set(hotspots.slice(0, 3).map(([area]) => area)),
    [hotspots],
  );

  const partnerCards = useMemo(() => {
    return buildPartnerCards(actions.data?.items ?? []);
  }, [actions.data?.items]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">
      {/* GAUCHE : Pression territoriale */}
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">{fr ? "Pression territoriale (12 mois)" : "Territorial pressure (12 months)"}</h3>
        <ul className="mt-3 space-y-2">
          {hotspots.map(([area, count], index) => (
            <li key={area} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">{index + 1}</span>
                <span className="font-medium text-slate-800">{area}</span>
              </div>
              <span className="text-sm font-bold text-slate-700">{count} {fr ? `signalement${count > 1 ? "s" : ""}` : `report${count > 1 ? "s" : ""}`}</span>
            </li>
          ))}
          {hotspots.length === 0 ? (
            <li className="text-sm text-slate-500 italic">{fr ? "Aucune donnée disponible." : "No data available."}</li>
          ) : null}
        </ul>
      </article>

      {/* DROITE : Fiches partenaires */}
      <div className="grid gap-3 md:grid-cols-2">
        {partnerCards.map((card) => (
          <article key={card.actor} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{card.actor}</h3>
                <p className="text-xs text-slate-500">{card.role}</p>
              </div>
              {hotspotSet.has(card.zone) ? (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">{fr ? "Zone prioritaire" : "Priority zone"}</span>
              ) : null}
            </div>
            <dl className="mt-3 space-y-1 text-sm divide-y divide-slate-100">
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-slate-500">{fr ? "Zone principale" : "Primary zone"}</dt>
                <dd className="font-semibold">{card.zone}</dd>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-slate-500">{fr ? "Capacité" : "Capacity"}</dt>
                <dd className="font-semibold">{card.capacity}</dd>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-slate-500">{fr ? "Actions annuelles" : "Annual actions"}</dt>
                <dd className="font-semibold">{card.actions}</dd>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-slate-500">{fr ? "Qualité moy." : "Avg. quality"}</dt>
                <dd className="font-semibold">{card.avgQuality}/100</dd>
              </div>
            </dl>
            <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
              {fr ? "Prochaine action" : "Next action"}: {card.nextAction}
            </p>
          </article>
        ))}
        {partnerCards.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {fr ? "Aucune fiche partenaire disponible." : "No partner profile available."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
