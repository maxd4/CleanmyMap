"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetchCommunityEvents, type CommunityEventItem } from "@/lib/community/http";
import type { RoutePlanningMode } from "@/lib/route/route-planning-mode";
import {
  filterRouteEventsByDate,
  getRouteEventStatus,
  routeEventStatusLabel,
  type RouteEventDateFilter,
} from "./route-event-selector.model";

type RouteEventSelectorProps = {
  planningMode: RoutePlanningMode;
  setPlanningMode: (mode: RoutePlanningMode) => void;
  fr: boolean;
};

function eventLabel(event: CommunityEventItem, fr: boolean): string {
  const date = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${event.eventDate}T00:00:00.000Z`));
  return `${event.title} · ${date} · ${routeEventStatusLabel(getRouteEventStatus(event), fr)}`;
}
export function RouteEventSelector({
  planningMode,
  setPlanningMode,
  fr,
}: RouteEventSelectorProps) {
  const [dateFilter, setDateFilter] = useState<RouteEventDateFilter>("all");
  const { data, error, isLoading } = useSWR(
    "route-event-selector",
    () => fetchCommunityEvents({ limit: 300 }),
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );
  const events = data?.items ?? [];
  const visibleEvents = filterRouteEventsByDate(events, dateFilter);
  const selectedEvent =
    planningMode.type === "event-centered"
      ? events.find((event) => event.id === planningMode.eventId)
      : undefined;

  return (
    <section className="rounded-[1.75rem] border border-emerald-300/18 bg-[rgba(11,39,30,0.88)] p-5">
      <h3 className="text-base font-black text-white">
        {fr ? "Mode d’itinéraire" : "Route mode"}
      </h3>
      <p className="mt-1 text-xs leading-5 text-emerald-50/70">
        {fr
          ? "Le mode libre reste le choix par défaut. Un événement peut devenir une ancre explicite du calcul."
          : "Free mode is the default. An event can be used as an explicit route anchor."}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="min-h-11 rounded-xl border border-emerald-200/20 px-3 py-2 text-sm font-bold text-white"
          aria-pressed={planningMode.type === "free"}
          onClick={() => setPlanningMode({ type: "free" })}
        >
          {fr ? "Itinéraire libre" : "Free route"}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-xl border border-emerald-200/20 px-3 py-2 text-sm font-bold text-white"
          aria-pressed={planningMode.type === "event-centered"}
          disabled={isLoading || Boolean(error) || events.length === 0}
          onClick={() => {
            if (events[0]) setPlanningMode({ type: "event-centered", eventId: events[0].id });
          }}
        >
          {fr ? "Autour d’un événement" : "Event-centered route"}
        </button>
      </div>
      {planningMode.type === "event-centered" ? (
        <div className="mt-4 space-y-3">
          {selectedEvent ? (
            <p className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-xs text-amber-50">
              {selectedEvent.title} · {selectedEvent.locationLabel}
            </p>
          ) : null}
          <label className="flex flex-col gap-2 text-xs font-semibold text-emerald-50/90">
            {fr ? "Événement" : "Event"}
            <select
              value={selectedEvent?.id ?? ""}
              onChange={(event) => {
                if (event.target.value) {
                  setPlanningMode({ type: "event-centered", eventId: event.target.value });
                }
              }}
              className="min-h-11 rounded-xl border border-emerald-200/14 bg-[rgba(11,34,25,0.92)] px-3 py-2 text-sm text-white"
            >
              <option value="">
                {isLoading ? (fr ? "Chargement…" : "Loading…") : fr ? "Sélectionner" : "Select"}
              </option>
              {visibleEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {eventLabel(event, fr)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-emerald-50/90">
            {fr ? "Filtrer par date" : "Filter by date"}
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as RouteEventDateFilter)}
              className="min-h-11 rounded-xl border border-emerald-200/14 bg-[rgba(11,34,25,0.92)] px-3 py-2 text-sm text-white"
            >
              <option value="all">{fr ? "Toutes les dates" : "All dates"}</option>
              <option value="past">{fr ? "Passés" : "Past"}</option>
              <option value="today">{fr ? "Aujourd’hui" : "Today"}</option>
              <option value="upcoming">{fr ? "À venir" : "Upcoming"}</option>
            </select>
          </label>
        </div>
     ) : null}
   </section>
 );
}
