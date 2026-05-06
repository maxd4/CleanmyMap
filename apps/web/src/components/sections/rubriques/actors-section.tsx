"use client";

import { useMemo } from"react";
import useSWR from"swr";
import { fetchActions, fetchMapActions } from"@/lib/actions/http";
import { buildPartnerCards } from"@/lib/community/engagement";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";

function extractArea(label: string): string {
  const normalized = label.toLowerCase();
  const matched = normalized.match(/\b([1-9]|1[0-9]|20)(?:eme|er|e)?\b/);
  if (!matched) {
  return"Hors arrondissement";
  }
  return `${matched[1]}e`;
}

export function ActorsSection() {
  const { locale } = useSitePreferences();
  const fr = locale ==="fr";
  const { data: mapData, isLoading: mapLoading } = useSWR(["section-actors-map"], () =>
  fetchMapActions({ limit: 220, days: 365, status:"approved" }),
  );
  const { data: actionsData, isLoading: actionsLoading } = useSWR(["section-actors-actions"], () =>
  fetchActions({ status:"approved", limit: 250 }),
  );

  const hotspots = useMemo(() => {
    const byArea = new Map<string, number>();
    for (const item of mapData?.items ?? []) {
      const area = extractArea(item.location_label ?? "");
      byArea.set(area, (byArea.get(area) ?? 0) + 1);
    }
    return [...byArea.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [mapData?.items]);

  const hotspotSet = useMemo(
    () => new Set(hotspots.slice(0, 3).map(([area]) => area)),
    [hotspots],
  );

  const partnerCards = useMemo(() => {
    return buildPartnerCards(actionsData?.items ?? []);
  }, [actionsData?.items]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">
      {/* GAUCHE : Pression territoriale */}
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="cmm-text-small font-semibold cmm-text-primary">{fr ?"Pression territoriale (12 mois)" :"Territorial pressure (12 months)"}</h3>
        
        {mapLoading ? (
          <div className="mt-3 space-y-2">
            {[...Array(6)].map((_, i) => (
              <CmmSkeleton key={i} variant="rectangular" className="h-12 rounded-lg" />
            ))}
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {hotspots.map(([area, count], index) => (
            <li key={area} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 cmm-text-caption font-bold text-emerald-700">{index + 1}</span>
                <span className="font-medium cmm-text-primary">{area}</span>
              </div>
              <span className="cmm-text-small font-bold cmm-text-secondary">{count} {fr ? `signalement${count > 1 ?"s" :""}` : `report${count > 1 ?"s" :""}`}</span>
            </li>
            ))}
             {hotspots.length === 0 ? (
              <li className="cmm-text-small cmm-text-muted italic">{fr ?"Aucun signalement n'a été enregistré sur cette période." :"No reports were recorded for this period."}</li>
            ) : null}
          </ul>
        )}
      </article>

      {/* DROITE : Fiches partenaires */}
      <div className="grid gap-3 md:grid-cols-2">
        {actionsLoading ? (
          [...Array(6)].map((_, i) => (
            <CmmSkeleton key={i} variant="rectangular" className="h-48 rounded-xl" />
          ))
        ) : (
          <>
            {partnerCards.map((card) => (
            <article key={card.actor} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="cmm-text-small font-semibold cmm-text-primary">{card.actor}</h3>
                  <p className="cmm-text-caption cmm-text-muted">{card.role}</p>
                </div>
                {hotspotSet.has(card.zone) ? (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 cmm-text-caption font-semibold uppercase text-amber-700">{fr ?"Zone prioritaire" :"Priority zone"}</span>
                ) : null}
              </div>
              <dl className="mt-3 space-y-1 cmm-text-small divide-y divide-slate-100">
                <div className="flex justify-between gap-2 py-1">
                  <dt className="cmm-text-muted">{fr ?"Zone principale" :"Primary zone"}</dt>
                  <dd className="font-semibold">{card.zone}</dd>
                </div>
                <div className="flex justify-between gap-2 py-1">
                  <dt className="cmm-text-muted">{fr ?"Capacité" :"Capacity"}</dt>
                  <dd className="font-semibold">{card.capacity}</dd>
                </div>
                <div className="flex justify-between gap-2 py-1">
                  <dt className="cmm-text-muted">{fr ?"Actions annuelles" :"Annual actions"}</dt>
                  <dd className="font-semibold">{card.actions}</dd>
                </div>
                <div className="flex justify-between gap-2 py-1">
                  <dt className="cmm-text-muted">{fr ?"Qualité moy." :"Avg. quality"}</dt>
                  <dd className="font-semibold">{card.avgQuality}/100</dd>
                </div>
              </dl>
              <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2 cmm-text-caption cmm-text-secondary">
                {fr ?"Prochaine action" :"Next action"}: {card.nextAction}
              </p>
            </article>
            ))}
             {partnerCards.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 cmm-text-small cmm-text-secondary italic text-center">
                {fr ?"Aucun profil partenaire n'est encore relié à vos actions récentes." :"No partner profile is linked to your recent actions yet."}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}