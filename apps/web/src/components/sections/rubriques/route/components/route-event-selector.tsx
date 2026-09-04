"use client";

import { useState } from "react";
import useSWR from "swr";
import { CalendarDays, MapPin, Route as RouteIcon } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmPill } from "@/components/ui/cmm-pill";
import {
  fetchCommunityEvents,
  type CommunityEventItem,
} from "@/lib/community/http";
import {
  hasPreciseCommunityEventLocation,
} from "@/lib/community/event-location";
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

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function eventLabel(event: CommunityEventItem, fr: boolean): string {
  const status = routeEventStatusLabel(getRouteEventStatus(event), fr);
  return `${event.title} · ${formatEventDate(event.eventDate)} · ${status}`;
}

function EventSummary({
  event,
  fr,
}: {
  event: CommunityEventItem;
  fr: boolean;
}) {
  const precise = hasPreciseCommunityEventLocation(event.location);
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h4 className="font-bold text-white">{event.title}</h4>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-200">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} aria-hidden="true" />
              {formatEventDate(event.eventDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} aria-hidden="true" />
              {event.locationLabel}
            </span>
          </div>
        </div>
        <CmmPill tone="amber" size="sm">
          {routeEventStatusLabel(getRouteEventStatus(event), fr)}
        </CmmPill>
      </div>
      <p className="mt-3 text-xs text-slate-300">
        {precise
          ? fr
            ? "Localisation précise disponible pour l’ancrage."
            : "Precise location available for anchoring."
          : fr
            ? "Localisation indisponible : un itinéraire précis autour de cet événement est impossible."
            : "Location unavailable: a precise route around this event is impossible."}
      </p>
    </div>
  );
}

export function RouteEventSelector({
  planningMode,
  setPlanningMode,
  fr,
}: RouteEventSelectorProps) {
  const [dateFilter, setDateFilter] = useState<RouteEventDateFilter>("all");
  const [showChooser, setShowChooser] = useState(
    planningMode.type === "event-centered",
  );
  const { data, error, isLoading } = useSWR(
    "route-event-selector",
    () => fetchCommunityEvents({ limit: 300 }),
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );
  const events = data?.items ?? [];
  const selectedEvent =
    planningMode.type === "event-centered"
      ? events.find((event) => event.id === planningMode.eventId) ?? null
      : null;
  const filteredEvents = filterRouteEventsByDate(events, dateFilter);
  const visibleEvents = selectedEvent && !filteredEvents.some((event) => event.id === selectedEvent.id)
    ? [selectedEvent, ...filteredEvents]
    : filteredEvents;

  return (
    <CmmCard
      as="section"
      tone="emerald"
      variant="glass"
      size="md"
      className="border border-emerald-300/18 bg-[rgba(11,39,30,0.88)]"
    >
      <div className="flex items-start gap-3">
        <RouteIcon className="mt-0.5 text-emerald-200" size={18} aria-hidden="true" />
        <div>
          <h3 className="text-base font-black text-white">
            {fr ? "Mode d’itinéraire" : "Route mode"}
          </h3>
          <p className="mt-1 text-xs leading-5 text-emerald-50/70">
            {fr
              ? "Le mode libre reste le choix par défaut. Sélectionnez un événement uniquement pour orienter explicitement le calcul autour de son emplacement."
              : "Free mode is the default. Select an event only to explicitly orient the calculation around its location."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2" role="group" aria-label={fr ? "Mode de calcul" : "Calculation mode"}>
        <CmmButton
          type="button"
          tone={planningMode.type === "free" ? "primary" : "tertiary"}
          variant="pill"
          ariaLabel={fr ? "Utiliser un itinéraire libre" : "Use a free route"}
          onClick={() => {
            setPlanningMode({ type: "free" });
            setShowChooser(false);
          }}
          className="justify-center"
        >
          {fr ? "Itinéraire libre" : "Free route"}
        </CmmButton>
        <CmmButton
          type="button"
          tone={planningMode.type === "event-centered" ? "primary" : "tertiary"}
          variant="pill"
          disabled={isLoading || Boolean(error) || events.length === 0}
          ariaLabel={fr ? "Utiliser un itinéraire autour d’un événement" : "Use an event-centered route"}
          onClick={() => {
            setShowChooser(true);
            if (planningMode.type !== "event-centered" && events[0]) {
              setPlanningMode({ type: "event-centered", eventId: events[0].id });
            }
          }}
          className="justify-center"
        >
          {fr ? "Itinéraire autour d’un événement" : "Event-centered route"}
        </CmmButton>
      </div>

      {planningMode.type === "event-centered" ? (
        <div className="mt-4 space-y-3">
          {selectedEvent ? <EventSummary event={selectedEvent} fr={fr} /> : null}
          <CmmButton
            type="button"
            tone="tertiary"
            variant="ghost"
            onClick={() => setShowChooser((current) => !current)}
            className="px-0 text-xs text-emerald-100 underline underline-offset-4"
          >
            {showChooser
              ? fr
                ? "Masquer les événements"
                : "Hide events"
              : fr
                ? "Changer d’événement"
                : "Change event"}
          </CmmButton>

          {showChooser ? (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/20 p-4">
              <label className="flex flex-col gap-2 text-xs font-semibold text-emerald-50/90">
                {fr ? "Filtrer par date" : "Filter by date"}
                <select
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value as RouteEventDateFilter)}
                  className="min-h-11 rounded-xl border border-emerald-200/14 bg-[rgba(11,34,25,0.92)] px-3 py-2 text-sm text-white outline-none focus:border-emerald-300/45"
                >
                  <option value="all">{fr ? "Toutes les dates" : "All dates"}</option>
                  <option value="past">{fr ? "Événements passés" : "Past events"}</option>
                  <option value="today">{fr ? "Aujourd’hui" : "Today"}</option>
                  <option value="upcoming">{fr ? "À venir" : "Upcoming"}</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold text-emerald-50/90">
                {fr ? "Événement" : "Event"}
                <select
                  value={selectedEvent?.id ?? ""}
                  onChange={(event) => {
                    if (event.target.value) {
                      setPlanningMode({ type: "event-centered", eventId: event.target.value });
                    }
                  }}
                  disabled={isLoading || visibleEvents.length === 0}
                  className="min-h-11 rounded-xl border border-emerald-200/14 bg-[rgba(11,34,25,0.92)] px-3 py-2 text-sm text-white outline-none focus:border-emerald-300/45 disabled:opacity-60"
                >
                  <option value="">
                    {isLoading
                      ? fr
                        ? "Chargement des événements…"
                        : "Loading events…"
                      : fr
                        ? "Sélectionner un événement"
                        : "Select an event"}
                  </option>
                  {visibleEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {eventLabel(event, fr)} · {event.locationLabel}
                    </option>
                  ))}
                </select>
              </label>
              {error ? (
                <p role="status" className="text-xs text-amber-100">
                  {fr
                    ? "Les événements ne sont pas disponibles. Vous pouvez revenir au mode libre."
                    : "Events are unavailable. You can return to free mode."}
                </p>
              ) : null}
              {!isLoading && !error && visibleEvents.length === 0 ? (
                <p role="status" className="text-xs text-slate-300">
                  {fr ? "Aucun événement pour ce filtre." : "No event matches this filter."}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </CmmCard>
  );
}
