"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetchCommunityEvents, type CommunityEventItem, type CommunityEventsResponse } from "@/lib/community/http";
import {
  createDefaultRouteTerritorialGuidedMode,
  type RoutePlanningMode,
} from "@/lib/route/route-planning-mode";
import {
  filterRouteEventsByDate,
  getRouteEventStatus,
  routeEventStatusLabel,
  type RouteEventDateFilter,
} from "./route-event-selector.model";
import { CmmCard } from "@/components/ui/cmm-card";

type RouteEventSelectorProps = {
  planningMode: RoutePlanningMode;
  setPlanningMode: (mode: RoutePlanningMode) => void;
  volunteers: number;
  groupCount: number;
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
  volunteers,
  groupCount,
  fr,
}: RouteEventSelectorProps) {
  const [dateFilter, setDateFilter] = useState<RouteEventDateFilter>("all");
  const { data, error, isLoading } = useSWR<CommunityEventsResponse, unknown>(
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
    <CmmCard as="section" tone="emerald" variant="outlined" size="sm" className="space-y-3">
      <h3 className="text-sm font-black text-emerald-950">
        {fr ? "Mode d’itinéraire" : "Route mode"}
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
          <button
          type="button"
          className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold text-emerald-950 transition hover:border-emerald-400 ${planningMode.type === "free" ? "border-emerald-500 bg-emerald-100" : "border-emerald-200/70 bg-white/70"}`}
          aria-pressed={planningMode.type === "free"}
          onClick={() => setPlanningMode({ type: "free" })}
        >
          {fr ? "Itinéraire libre" : "Free route"}
        </button>
        <button
          type="button"
          className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold text-emerald-950 transition hover:border-emerald-400 ${planningMode.type === "event-centered" ? "border-emerald-500 bg-emerald-100" : "border-emerald-200/70 bg-white/70"}`}
          aria-pressed={planningMode.type === "event-centered"}
          disabled={isLoading || Boolean(error) || events.length === 0}
          onClick={() => {
            if (events[0]) setPlanningMode({ type: "event-centered", eventId: events[0].id });
          }}
        >
          {fr ? "Autour d’un événement" : "Event-centered route"}
        </button>
        <button
          type="button"
          className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold text-emerald-950 transition hover:border-emerald-400 sm:col-span-2 ${planningMode.type === "territorial-guided" ? "border-emerald-500 bg-emerald-100" : "border-emerald-200/70 bg-white/70"}`}
          aria-pressed={planningMode.type === "territorial-guided"}
          onClick={() => setPlanningMode(createDefaultRouteTerritorialGuidedMode(volunteers, groupCount))}
        >
          {fr ? "Planification territoriale guidée" : "Guided territorial planning"}
        </button>
      </div>
      {planningMode.type === "event-centered" ? (
        <div className="space-y-2">
          {selectedEvent ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-950">
              {selectedEvent.title} · {selectedEvent.locationLabel}
            </p>
          ) : null}
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-emerald-950">
            {fr ? "Événement" : "Event"}
            <select
              value={selectedEvent?.id ?? ""}
              onChange={(event) => {
                if (event.target.value) {
                  setPlanningMode({ type: "event-centered", eventId: event.target.value });
                }
              }}
              className="min-h-11 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-950"
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
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-emerald-950">
            {fr ? "Filtrer par date" : "Filter by date"}
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as RouteEventDateFilter)}
              className="min-h-11 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-950"
            >
              <option value="all">{fr ? "Toutes les dates" : "All dates"}</option>
              <option value="past">{fr ? "Passés" : "Past"}</option>
              <option value="today">{fr ? "Aujourd’hui" : "Today"}</option>
              <option value="upcoming">{fr ? "À venir" : "Upcoming"}</option>
            </select>
          </label>
        </div>
     ) : null}
    </CmmCard>
 );
}
