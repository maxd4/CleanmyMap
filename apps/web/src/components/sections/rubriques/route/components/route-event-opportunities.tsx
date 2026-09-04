"use client";

import Link from "next/link";
import { CalendarDays, MapPin, TrendingUp } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmPill } from "@/components/ui/cmm-pill";
import type { RouteEventPressureContribution } from "@/lib/route/route-event-pressure";
import type { RouteResponse } from "../route-types";

export type RouteEventOpportunity = {
  contribution: RouteEventPressureContribution;
  stopLabel: string;
};

export function getRecentRouteEventOpportunities(
  data: RouteResponse,
): RouteEventOpportunity[] {
  const stopsById = new Map(data.stops.map((stop) => [stop.id, stop.label]));
  const opportunities = new Map<string, RouteEventOpportunity>();

  for (const selectedStop of data.trace.selectedStops) {
    for (const contribution of selectedStop.eventContributions) {
      if (contribution.ageDays < 1 || contribution.ageDays > 16) {
        continue;
      }

      const existing = opportunities.get(contribution.eventId);
      if (
        !existing ||
        contribution.distanceKm < existing.contribution.distanceKm
      ) {
        opportunities.set(contribution.eventId, {
          contribution,
          stopLabel: stopsById.get(selectedStop.id) ?? selectedStop.id,
        });
      }
    }
  }

  return [...opportunities.values()].sort((left, right) => {
    if (right.contribution.pressure !== left.contribution.pressure) {
      return right.contribution.pressure - left.contribution.pressure;
    }
    if (left.contribution.distanceKm !== right.contribution.distanceKm) {
      return left.contribution.distanceKm - right.contribution.distanceKm;
    }
    return left.contribution.eventId.localeCompare(right.contribution.eventId);
  });
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value);
}

type RouteEventOpportunitiesProps = {
  data: RouteResponse;
  fr: boolean;
};

export function RouteEventOpportunities({
  data,
  fr,
}: RouteEventOpportunitiesProps) {
  const opportunities = getRecentRouteEventOpportunities(data);
  const signal = data.trace.eventSignal;

  return (
    <CmmCard
      as="section"
      tone="amber"
      variant="glass"
      size="md"
      className="border border-amber-300/20 bg-slate-950/35"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-amber-200" aria-hidden="true" />
            <h2 className="cmm-text-h3 text-white">
              {fr ? "Événements récents" : "Recent events"}
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            {fr
              ? "Des événements terminés récemment et reliés à un stop de cet itinéraire. Le signal indique une opportunité prédite, pas un constat de déchets."
              : "Recently completed events linked to a stop on this route. The signal is a prediction, not an observed waste report."}
          </p>
        </div>
        <CmmPill tone="amber" size="sm">
          {fr ? "Signal prédictif" : "Predictive signal"}
        </CmmPill>
      </div>

      {!signal.sourceAvailable ? (
        <p role="status" className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {fr
            ? "Le signal événementiel n’est pas disponible pour ce calcul. Aucun événement n’est présenté comme une observation."
            : "The event signal is unavailable for this calculation. No event is presented as an observation."}
        </p>
      ) : opportunities.length === 0 ? (
        <div className="mt-5 space-y-2 rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-300">
          <p>
            {fr
              ? "Aucun événement récent géolocalisé n’est relié à cet itinéraire."
              : "No recent geolocated event is linked to this route."}
          </p>
          {signal.eventsWithoutCoordinates > 0 ? (
            <p className="text-xs text-slate-400">
              {fr
                ? `${signal.eventsWithoutCoordinates} événement(s) terminé(s) sans coordonnées restent affichables ailleurs, mais ne peuvent pas fournir une proximité précise.`
                : `${signal.eventsWithoutCoordinates} completed event(s) without coordinates remain displayable elsewhere but cannot provide precise proximity.`}
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="mt-5 grid gap-3" aria-label={fr ? "Opportunités événementielles récentes" : "Recent event opportunities"}>
          {opportunities.slice(0, 5).map(({ contribution, stopLabel }) => (
            <li
              key={contribution.eventId}
              className="flex flex-col gap-4 rounded-2xl border border-amber-200/15 bg-white/[0.04] p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-white">{contribution.title}</h3>
                  <span className="rounded-full bg-amber-300/12 px-2 py-0.5 text-[11px] font-bold text-amber-100">
                    {fr ? "Terminé" : "Completed"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={13} aria-hidden="true" />
                    {formatDate(contribution.eventDate)} · J+{Math.round(contribution.ageDays)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={13} aria-hidden="true" />
                    {contribution.locationLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {fr
                    ? `À ${formatNumber(contribution.distanceKm)} km du stop ${stopLabel}.`
                    : `${formatNumber(contribution.distanceKm)} km from stop ${stopLabel}.`}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
                <div className="text-xs text-amber-100" title="Contribution fournie par le moteur de recommandation">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <TrendingUp size={13} aria-hidden="true" />
                    {fr ? "Pression" : "Pressure"} {formatNumber(contribution.pressure * 100)} %
                  </span>
                  <span className="mt-1 block text-slate-400">
                    +{formatNumber(contribution.scoreContribution)} {fr ? "pts de priorité" : "priority pts"}
                  </span>
                </div>
                <Link
                  href={`/actions/new?fromEventId=${encodeURIComponent(contribution.eventId)}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-amber-300 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  data-route-event-action={contribution.eventId}
                >
                  {fr ? "Créer une action" : "Create an action"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </CmmCard>
  );
}
