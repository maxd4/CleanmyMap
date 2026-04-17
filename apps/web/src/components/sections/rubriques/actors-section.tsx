"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetchActions, fetchMapActions } from "@/lib/actions/http";
import { buildPartnerCards } from "@/lib/community/engagement";

function extractArea(label: string): string {
  const normalized = label.toLowerCase();
  const matched = normalized.match(/\b([1-9]|1[0-9]|20)(?:e|eme|er)?\b/);
  if (!matched) {
    return "Hors arrondissement";
  }
  return `${matched[1]}e`;
}

export function ActorsSection() {
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
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">
           Pression territoriale (12 mois)
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {hotspots.map(([area, count]) => (
             <li key={area}>
              {area}: <span className="font-semibold">{count}</span> signalement(s)
            </li>
          ))}
          {hotspots.length === 0 ? (
             <li>Aucune donnee map disponible pour le moment.</li>
          ) : null}
        </ul>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {partnerCards.map((card) => (
           <article
            key={card.actor}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                   {card.actor}
                </h3>
                <p className="text-xs text-slate-500">{card.role}</p>
              </div>
              {hotspotSet.has(card.zone) ? (
                 <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                  Zone prioritaire
                </span>
              ) : null}
            </div>
            <dl className="mt-3 space-y-1 text-sm text-slate-700">
               <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Zone principale</dt>
                <dd className="font-semibold">{card.zone}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Contact</dt>
                <dd className="font-semibold">{card.contact}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Capacite</dt>
                <dd className="font-semibold">{card.capacity}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Actions annuelles</dt>
                <dd className="font-semibold">{card.actions}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Qualite moyenne</dt>
                <dd className="font-semibold">{card.avgQuality}/100</dd>
              </div>
            </dl>
            <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
               Prochaine action: {card.nextAction}
            </p>
          </article>
        ))}
        {partnerCards.length === 0 ? (
           <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Aucune fiche partenaire disponible pour le moment.
          </p>
        ) : null}
      </div>
    </div>
  );
}
