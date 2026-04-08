"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ActionsHistoryList } from "@/components/actions/actions-history-list";
import { ActionsMapFeed } from "@/components/actions/actions-map-feed";
import { SystemStatusPanel } from "@/components/dashboard/system-status-panel";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { fetchActions, fetchMapActions } from "@/lib/actions/http";
import { getSectionRubriqueById, type FinalizedSectionId, type SectionId } from "@/lib/sections-registry";

type SectionRendererProps = {
  sectionId: SectionId;
};

type L10n = { fr: string; en: string };

function t(locale: "fr" | "en", value: L10n): string {
  return value[locale];
}

function SectionShell(props: {
  title: L10n;
  subtitle: L10n;
  children: React.ReactNode;
  links?: Array<{ href: string; label: L10n }>;
}) {
  const { locale } = useSitePreferences();
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {locale === "fr" ? "Rubrique active" : "Active section"}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t(locale, props.title)}</h1>
      <p className="mt-2 text-sm text-slate-600">{t(locale, props.subtitle)}</p>
      {props.links ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {props.links.map((link) => (
            <Link
              key={`${link.href}-${link.label.fr}`}
              href={link.href}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              {t(locale, link.label)}
            </Link>
          ))}
        </div>
      ) : null}
      <div className="mt-5">{props.children}</div>
    </section>
  );
}

function extractArrondissement(label: string): string {
  const normalized = label.toLowerCase();
  const matched = normalized.match(/\b([1-9]|1[0-9]|20)(?:e|eme|er)?\b/);
  if (!matched) {
    return "Hors arrondissement";
  }
  return `${matched[1]}e`;
}

function monthKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 7) || "n/a";
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

type AgendaEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  description: string;
  maxParticipants: number;
};

const AGENDA_EVENTS: AgendaEvent[] = [
  {
    id: "evt-canal-saint-martin",
    title: "Nettoyage Canal Saint-Martin",
    startsAt: "2026-04-13T09:30:00+02:00",
    endsAt: "2026-04-13T12:00:00+02:00",
    location: "Canal Saint-Martin, Paris 10e",
    description: "Collecte de dechets flottants et nettoyage des abords.",
    maxParticipants: 30,
  },
  {
    id: "evt-bois-vincennes",
    title: "Operation Bois de Vincennes",
    startsAt: "2026-04-20T10:00:00+02:00",
    endsAt: "2026-04-20T13:00:00+02:00",
    location: "Bois de Vincennes, Paris 12e",
    description: "Intervention zone verte, tri sur place et relevé geolocalise.",
    maxParticipants: 40,
  },
  {
    id: "evt-quais-seine",
    title: "Quais de Seine Propre",
    startsAt: "2026-04-27T14:00:00+02:00",
    endsAt: "2026-04-27T16:30:00+02:00",
    location: "Quais de Seine, Paris Centre",
    description: "Action rapide en equipe avec suivi megots et plastiques.",
    maxParticipants: 25,
  },
];

function toIcsTimestamp(value: string): string {
  const date = new Date(value);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function buildIcsHref(event: AgendaEvent): string {
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CleanMyMap//Agenda Terrain//FR",
    "BEGIN:VEVENT",
    `UID:${event.id}@cleanmymap`,
    `DTSTAMP:${toIcsTimestamp(new Date().toISOString())}`,
    `DTSTART:${toIcsTimestamp(event.startsAt)}`,
    `DTEND:${toIcsTimestamp(event.endsAt)}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.location}`,
    `DESCRIPTION:${event.description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
}

function CommunitySection() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "mine" | "past">("upcoming");
  const [myRegistrations, setMyRegistrations] = useState<Record<string, "yes" | "maybe">>(() => {
    if (typeof window === "undefined") {
      return {};
    }
    try {
      const raw = window.localStorage.getItem("cleanmymap.community.registrations");
      if (!raw) {
        return {};
      }
      return JSON.parse(raw) as Record<string, "yes" | "maybe">;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("cleanmymap.community.registrations", JSON.stringify(myRegistrations));
    } catch {
      // Ignore storage write errors.
    }
  }, [myRegistrations]);

  const { data, isLoading, error } = useSWR(["section-community-feed"], () => fetchActions({ status: "approved", limit: 250 }));

  const highlights = useMemo(() => {
    const items = data?.items ?? [];
    const byDay = new Map<string, { actions: number; volunteers: number }>();
    for (const item of items) {
      const key = item.action_date;
      const previous = byDay.get(key) ?? { actions: 0, volunteers: 0 };
      byDay.set(key, {
        actions: previous.actions + 1,
        volunteers: previous.volunteers + Number(item.volunteers_count || 0),
      });
    }
    return [...byDay.entries()]
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 6);
  }, [data?.items]);

  const pastActions = useMemo(() => {
    const items = data?.items ?? [];
    return items.slice(0, 8);
  }, [data?.items]);

  function register(eventId: string, mode: "yes" | "maybe"): void {
    setMyRegistrations((prev) => ({ ...prev, [eventId]: mode }));
  }

  function unregister(eventId: string): void {
    setMyRegistrations((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Rassemblements & Agenda: suivi de mobilisation, calendrier des actions, inscriptions et passerelle post-action.
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Mobilisation recente</h2>
        {isLoading ? <p className="mt-2 text-sm text-slate-500">Chargement des rendez-vous communautaires...</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-700">Impossible de charger le flux communaute.</p> : null}
        {!isLoading && !error ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {highlights.map((item) => (
              <li key={item.date}>
                {item.date}: {item.actions} action(s), {item.volunteers} benevole(s)
              </li>
            ))}
            {highlights.length === 0 ? <li>Aucune action validee sur la periode.</li> : null}
          </ul>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              activeTab === "upcoming"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            A venir
          </button>
          <button
            onClick={() => setActiveTab("mine")}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              activeTab === "mine"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            Mes inscriptions
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              activeTab === "past"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            Passe
          </button>
        </div>

        {activeTab === "upcoming" ? (
          <div className="mt-4 space-y-3">
            {AGENDA_EVENTS.map((event) => {
              const registration = myRegistrations[event.id];
              return (
                <article key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">{event.title}</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    {new Date(event.startsAt).toLocaleString("fr-FR")} - {new Date(event.endsAt).toLocaleTimeString("fr-FR")}
                  </p>
                  <p className="text-xs text-slate-600">{event.location}</p>
                  <p className="mt-2 text-sm text-slate-700">{event.description}</p>
                  <p className="mt-1 text-xs text-slate-500">Capacite: {event.maxParticipants} participants</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => register(event.id, "yes")}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Je participe
                    </button>
                    <button
                      onClick={() => register(event.id, "maybe")}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Peut-etre
                    </button>
                    <a
                      href={buildIcsHref(event)}
                      download={`${event.id}.ics`}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Ajouter a mon agenda
                    </a>
                    {registration ? (
                      <button
                        onClick={() => unregister(event.id)}
                        className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        Annuler inscription
                      </button>
                    ) : null}
                  </div>

                  {registration ? (
                    <p className="mt-2 text-xs font-semibold text-emerald-700">
                      Inscription enregistree: {registration === "yes" ? "Je participe" : "Peut-etre"}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}

        {activeTab === "mine" ? (
          <div className="mt-4 space-y-2">
            {Object.keys(myRegistrations).length === 0 ? (
              <p className="text-sm text-slate-600">Aucune inscription enregistree pour le moment.</p>
            ) : (
              AGENDA_EVENTS.filter((event) => Boolean(myRegistrations[event.id])).map((event) => (
                <article key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-xs">{new Date(event.startsAt).toLocaleString("fr-FR")} - {event.location}</p>
                  <p className="text-xs font-semibold text-emerald-700">
                    Statut: {myRegistrations[event.id] === "yes" ? "Je participe" : "Peut-etre"}
                  </p>
                </article>
              ))
            )}
          </div>
        ) : null}

        {activeTab === "past" ? (
          <div className="mt-4 space-y-3">
            {pastActions.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{item.location_label}</p>
                <p className="text-xs text-slate-600">
                  {item.action_date} - {Number(item.waste_kg).toFixed(1)} kg - {item.cigarette_butts} megots
                </p>
                <Link
                  href={`/actions/new?fromActionId=${item.id}`}
                  className="mt-2 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Declarer une action post-evenement
                </Link>
              </article>
            ))}
            {pastActions.length === 0 ? <p className="text-sm text-slate-600">Aucun historique disponible.</p> : null}
          </div>
        ) : null}
      </div>

      <ActionsHistoryList />
    </div>
  );
}

function GamificationSection() {
  const { locale } = useSitePreferences();
  const { data, isLoading, error } = useSWR(["section-gamification", "approved"], () =>
    fetchActions({ status: "approved", limit: 200 }),
  );

  const leaderboard = useMemo(() => {
    const map = new Map<string, { actions: number; kg: number; butts: number }>();
    for (const item of data?.items ?? []) {
      const key = item.actor_name?.trim() || "Anonyme";
      const previous = map.get(key) ?? { actions: 0, kg: 0, butts: 0 };
      map.set(key, {
        actions: previous.actions + 1,
        kg: previous.kg + Number(item.waste_kg || 0),
        butts: previous.butts + Number(item.cigarette_butts || 0),
      });
    }
    return [...map.entries()]
      .map(([actor, stats]) => ({ actor, ...stats }))
      .sort((a, b) => b.actions - a.actions || b.kg - a.kg)
      .slice(0, 12);
  }, [data?.items]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">{locale === "fr" ? "Contributeurs" : "Contributors"}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{leaderboard.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">{locale === "fr" ? "Actions validees" : "Validated actions"}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{data?.count ?? 0}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">{locale === "fr" ? "Badge expert" : "Expert badge"}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{leaderboard.filter((item) => item.actions >= 10).length}</p>
        </article>
      </div>

      {isLoading ? <p className="text-sm text-slate-500">Chargement du classement...</p> : null}
      {error ? <p className="text-sm text-rose-700">Impossible de charger les donnees de classement.</p> : null}

      {!isLoading && !error ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Benevole</th>
                  <th className="px-3 py-2">Actions</th>
                  <th className="px-3 py-2">Kg</th>
                  <th className="px-3 py-2">Megots</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, index) => (
                  <tr key={`${row.actor}-${index}`} className="border-t border-slate-100 text-slate-700">
                    <td className="px-3 py-2 font-semibold">{index + 1}</td>
                    <td className="px-3 py-2">{row.actor}</td>
                    <td className="px-3 py-2">{row.actions}</td>
                    <td className="px-3 py-2">{row.kg.toFixed(1)}</td>
                    <td className="px-3 py-2">{row.butts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Niveaux de badges</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              <li>
                Debutant: <span className="font-semibold">{leaderboard.filter((item) => item.actions < 5).length}</span>
              </li>
              <li>
                Confirme: <span className="font-semibold">{leaderboard.filter((item) => item.actions >= 5 && item.actions < 10).length}</span>
              </li>
              <li>
                Expert: <span className="font-semibold">{leaderboard.filter((item) => item.actions >= 10).length}</span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">Regle actuelle: 5 actions = badge confirme, 10+ actions = badge expert.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActorsSection() {
  const { data } = useSWR(["section-actors-map"], () => fetchMapActions({ limit: 180, days: 365, status: "approved" }));
  const actions = useSWR(["section-actors-actions"], () => fetchActions({ status: "approved", limit: 250 }));
  const hotspots = useMemo(() => {
    const byArea = new Map<string, number>();
    for (const item of data?.items ?? []) {
      byArea.set(item.location_label, (byArea.get(item.location_label) ?? 0) + 1);
    }
    return [...byArea.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [data?.items]);
  const topActors = useMemo(() => {
    const mapByActor = new Map<string, number>();
    for (const item of actions.data?.items ?? []) {
      const actor = item.actor_name?.trim() || "Anonyme";
      mapByActor.set(actor, (mapByActor.get(actor) ?? 0) + 1);
    }
    return [...mapByActor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [actions.data?.items]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Associations</h2>
          <p className="mt-1 text-sm text-slate-600">Coordination locale, mobilisation, suivi terrain.</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Collectivites</h2>
          <p className="mt-1 text-sm text-slate-600">Priorisation des zones et appui operationnel.</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Commercants engages</h2>
          <p className="mt-1 text-sm text-slate-600">Relais de sensibilisation et micro-points de collecte.</p>
        </article>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Zones les plus signalees (12 mois)</h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {hotspots.map(([label, count]) => (
            <li key={label}>
              {label}: <span className="font-semibold">{count}</span>
            </li>
          ))}
          {hotspots.length === 0 ? <li>Aucune donnee map disponible pour le moment.</li> : null}
        </ul>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Contributeurs clefs</h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {topActors.map(([name, count]) => (
            <li key={name}>
              {name}: <span className="font-semibold">{count} action(s)</span>
            </li>
          ))}
          {topActors.length === 0 ? <li>Aucun contributeur reference sur la periode.</li> : null}
        </ul>
      </div>
    </div>
  );
}

function TrashSpotterSection() {
  const { data, isLoading, error } = useSWR(["section-trash-spotter"], () => fetchMapActions({ status: "all", days: 180, limit: 250 }));
  const quality = useMemo(() => {
    const items = data?.items ?? [];
    const pending = items.filter((item) => item.status === "pending").length;
    const approved = items.filter((item) => item.status === "approved").length;
    const withCoords = items.filter((item) => item.latitude !== null && item.longitude !== null).length;
    return { pending, approved, withCoords, total: items.length };
  }, [data?.items]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Le flux Trash Spotter est migre dans Next.js: lecture carte, filtrage et declaration rapide depuis l&apos;interface web.
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Signalements</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{quality.total}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">En attente</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{quality.pending}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Valides</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{quality.approved}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Geo-couverture</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {quality.total > 0 ? `${Math.round((quality.withCoords / quality.total) * 100)}%` : "n/a"}
          </p>
        </article>
      </div>
      {isLoading ? <p className="text-sm text-slate-500">Chargement des indicateurs Spotter...</p> : null}
      {error ? <p className="text-sm text-rose-700">Indicateurs Spotter indisponibles.</p> : null}
      <ActionsMapFeed />
    </div>
  );
}

function RouteSection() {
  const [stops, setStops] = useState<number>(5);
  const { data, isLoading, error } = useSWR(["section-route", stops], () => fetchMapActions({ status: "approved", days: 90, limit: 200 }));

  const picks = useMemo(() => {
    const scored = [...(data?.items ?? [])].sort((a, b) => {
      const scoreA = Number(a.waste_kg || 0) * 10 + Number(a.cigarette_butts || 0) * 0.05;
      const scoreB = Number(b.waste_kg || 0) * 10 + Number(b.cigarette_butts || 0) * 0.05;
      return scoreB - scoreA;
    });
    const base = scored.filter((item) => item.latitude !== null && item.longitude !== null).slice(0, Math.max(stops * 2, 8));
    if (base.length <= 1) {
      return base.slice(0, stops).map((item, index) => ({ ...item, routeIndex: index + 1, segmentKm: 0 }));
    }

    const unvisited = [...base];
    const route = [unvisited.shift()!];
    while (unvisited.length > 0 && route.length < stops) {
      const current = route[route.length - 1];
      const currentLat = Number(current.latitude);
      const currentLon = Number(current.longitude);
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < unvisited.length; i += 1) {
        const candidate = unvisited[i];
        const dLat = Number(candidate.latitude) - currentLat;
        const dLon = Number(candidate.longitude) - currentLon;
        const distance = Math.sqrt(dLat * dLat + dLon * dLon);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }
      route.push(unvisited.splice(nearestIndex, 1)[0]);
    }

    const withDistance = route.map((item, index) => {
      if (index === 0) {
        return { ...item, routeIndex: 1, segmentKm: 0 };
      }
      const prev = route[index - 1];
      const km =
        Math.sqrt(
          Math.pow(Number(item.latitude) - Number(prev.latitude), 2) +
            Math.pow(Number(item.longitude) - Number(prev.longitude), 2),
        ) * 111;
      return { ...item, routeIndex: index + 1, segmentKm: km };
    });
    return withDistance;
  }, [data?.items, stops]);
  const totalKm = useMemo(() => picks.reduce((acc, item) => acc + Number(item.segmentKm || 0), 0), [picks]);

  return (
    <div className="space-y-4">
      <label className="flex max-w-xs flex-col gap-2 text-sm text-slate-700">
        Nombre d&apos;etapes prioritaires
        <select
          value={String(stops)}
          onChange={(event) => setStops(Number(event.target.value))}
          className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
        >
          <option value="3">3</option>
          <option value="5">5</option>
          <option value="8">8</option>
          <option value="10">10</option>
        </select>
      </label>

      {isLoading ? <p className="text-sm text-slate-500">Calcul de l&apos;itineraire...</p> : null}
      {error ? <p className="text-sm text-rose-700">Impossible de calculer les points prioritaires.</p> : null}
      {!isLoading && !error && picks.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Distance estimee du circuit: <span className="font-semibold">{totalKm.toFixed(2)} km</span> sur {picks.length} etape(s).
        </div>
      ) : null}

      {!isLoading && !error ? (
        <ol className="space-y-2">
          {picks.map((item, index) => (
            <li key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold">
                Etape {index + 1}: {item.location_label}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {Number(item.waste_kg || 0).toFixed(1)} kg - {Number(item.cigarette_butts || 0)} megots - segment {Number(item.segmentKm || 0).toFixed(2)} km
              </p>
              {item.latitude !== null && item.longitude !== null ? (
                <a
                  className="mt-1 inline-block text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ouvrir dans Google Maps
                </a>
              ) : null}
            </li>
          ))}
          {picks.length === 0 ? <li className="text-sm text-slate-600">Aucun point disponible sur la periode.</li> : null}
        </ol>
      ) : null}
    </div>
  );
}

function RecyclingSection() {
  const actions = useSWR(["section-recycling-actions"], () => fetchActions({ status: "approved", limit: 350 }));
  const map = useSWR(["section-recycling-map"], () => fetchMapActions({ status: "approved", days: 365, limit: 300 }));

  const stats = useMemo(() => {
    const items = actions.data?.items ?? [];
    const totalKg = items.reduce((acc, item) => acc + Number(item.waste_kg || 0), 0);
    const totalButts = items.reduce((acc, item) => acc + Number(item.cigarette_butts || 0), 0);
    const avgKg = items.length > 0 ? totalKg / items.length : 0;
    const withTrace = (map.data?.items ?? []).filter((item) => Boolean(item.manual_drawing)).length;
    const mixedIndex = totalKg > 0 ? Math.max(0, 100 - Math.round((totalButts / Math.max(totalKg, 1)) * 0.8)) : 0;
    return { totalKg, totalButts, avgKg, withTrace, mixedIndex, count: items.length };
  }, [actions.data?.items, map.data?.items]);

  const isLoading = actions.isLoading || map.isLoading;
  const hasError = Boolean(actions.error || map.error);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Volume triable</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.totalKg.toFixed(1)} kg</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Megots</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.totalButts}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Traceabilite geo</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.withTrace}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Indice tri propre</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.mixedIndex}/100</p>
        </article>
      </div>

      {isLoading ? <p className="text-sm text-slate-500">Chargement des indicateurs de tri...</p> : null}
      {hasError ? <p className="text-sm text-rose-700">Donnees de tri indisponibles.</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Tri operationnel terrain</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            <li>Megots: contenant ferme, etiquette volume, stockage sec.</li>
            <li>Verre/metal: sacs distincts pour eviter contamination croisee.</li>
            <li>Plastique: prioriser PET/PEHD separables, limiter les melanges.</li>
            <li>Moyenne actuelle: {stats.avgKg.toFixed(1)} kg par intervention.</li>
          </ul>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Exploitation des donnees</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            <li>Associer categorie de dechet dans les commentaires.</li>
            <li>Documenter zone de collecte par trace/polygone.</li>
            <li>Exporter CSV/JSON pour partage collectivites.</li>
            <li>Verifier moderation avant analyse scientifique.</li>
          </ul>
        </article>
      </div>
    </div>
  );
}

function ClimateSection() {
  const { data, isLoading, error } = useSWR(["section-climate"], () => fetchActions({ status: "approved", limit: 320 }));

  const metrics = useMemo(() => {
    const items = data?.items ?? [];
    const totalKg = items.reduce((acc, item) => acc + Number(item.waste_kg || 0), 0);
    const totalVolunteers = items.reduce((acc, item) => acc + Number(item.volunteers_count || 0), 0);
    const totalMinutes = items.reduce((acc, item) => acc + Number(item.duration_minutes || 0), 0);
    const totalButts = items.reduce((acc, item) => acc + Number(item.cigarette_butts || 0), 0);
    const monthly = new Map<string, { kg: number; actions: number }>();
    for (const item of items) {
      const key = monthKey(item.action_date);
      const prev = monthly.get(key) ?? { kg: 0, actions: 0 };
      monthly.set(key, { kg: prev.kg + Number(item.waste_kg || 0), actions: prev.actions + 1 });
    }
    const monthlySeries = [...monthly.entries()]
      .map(([month, stats]) => ({ month, ...stats }))
      .sort((a, b) => (a.month > b.month ? 1 : -1))
      .slice(-6);
    const co2AvoidedKg = totalKg * 1.2;
    const plasticLeakageAvoidedKg = totalKg * 0.18 + totalButts * 0.002;
    return { totalKg, totalVolunteers, totalMinutes, totalButts, co2AvoidedKg, plasticLeakageAvoidedKg, monthlySeries };
  }, [data?.items]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Dechets retires</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics.totalKg.toFixed(1)} kg</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Heures benevoles</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{(metrics.totalMinutes / 60).toFixed(1)} h</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Participants</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics.totalVolunteers}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Megots retires</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics.totalButts}</p>
        </article>
      </div>
      {isLoading ? <p className="text-sm text-slate-500">Chargement des indicateurs...</p> : null}
      {error ? <p className="text-sm text-rose-700">Indicateurs indisponibles.</p> : null}
      {!isLoading && !error ? (
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Impacts estimes</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              <li>CO2 evite (proxy): {metrics.co2AvoidedKg.toFixed(1)} kg CO2e</li>
              <li>Fuite plastique evitee (proxy): {metrics.plasticLeakageAvoidedKg.toFixed(1)} kg</li>
              <li>Heures citoyennes: {(metrics.totalMinutes / 60).toFixed(1)} h</li>
            </ul>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Tendance 6 derniers mois</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {metrics.monthlySeries.map((row) => (
                <li key={row.month}>
                  {row.month}: {row.kg.toFixed(1)} kg / {row.actions} action(s)
                </li>
              ))}
              {metrics.monthlySeries.length === 0 ? <li>Pas assez de donnees.</li> : null}
            </ul>
          </article>
        </div>
      ) : null}
    </div>
  );
}

function WeatherSection() {
  const { data, isLoading, error } = useSWR("section-weather-paris", async () => {
    const response = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current=temperature_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FParis",
      { cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error("weather_unavailable");
    }
    return (await response.json()) as {
      current?: { temperature_2m?: number; precipitation?: number; wind_speed_10m?: number };
      daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_sum?: number[];
      };
    };
  });

  const advice = useMemo(() => {
    const temp = Number(data?.current?.temperature_2m ?? 0);
    const rain = Number(data?.current?.precipitation ?? 0);
    const wind = Number(data?.current?.wind_speed_10m ?? 0);
    if (rain >= 3 || wind >= 40) {
      return "Niveau meteo: prudent. Renforcer equipement et limiter la duree d'intervention.";
    }
    if (temp >= 28) {
      return "Niveau meteo: chaud. Prevoir eau, pauses et zones d'ombre.";
    }
    if (temp <= 3) {
      return "Niveau meteo: froid. Gants adaptes et cycles courts recommandes.";
    }
    return "Niveau meteo: favorable pour operation terrain standard.";
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        Brief meteo Paris pour adapter la securite terrain et le materiel des benevoles.
      </div>
      {isLoading ? <p className="text-sm text-slate-500">Chargement meteo...</p> : null}
      {error ? <p className="text-sm text-rose-700">Météo indisponible, vérifier avant sortie terrain.</p> : null}
      {!isLoading && !error ? (
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Temperature</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{data?.current?.temperature_2m ?? "-"} C</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Precipitations</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{data?.current?.precipitation ?? "-"} mm</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Vent</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{data?.current?.wind_speed_10m ?? "-"} km/h</p>
          </article>
        </div>
      ) : null}
      {!isLoading && !error ? (
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Recommandation operationnelle</h3>
          <p className="mt-2 text-sm text-slate-700">{advice}</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {(data?.daily?.time ?? []).slice(0, 3).map((day, index) => (
              <div key={day} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                <p className="font-semibold">{day}</p>
                <p>
                  {data?.daily?.temperature_2m_min?.[index] ?? "-"} / {data?.daily?.temperature_2m_max?.[index] ?? "-"} C
                </p>
                <p>Pluie: {data?.daily?.precipitation_sum?.[index] ?? "-"} mm</p>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </div>
  );
}

function CompareSection() {
  const { data, isLoading, error } = useSWR(["section-compare"], () => fetchMapActions({ status: "approved", days: 365, limit: 240 }));

  const compared = useMemo(() => {
    const grouped = new Map<string, { actions: number; kg: number; butts: number }>();
    for (const item of data?.items ?? []) {
      const area = extractArrondissement(item.location_label || "");
      const previous = grouped.get(area) ?? { actions: 0, kg: 0, butts: 0 };
      grouped.set(area, {
        actions: previous.actions + 1,
        kg: previous.kg + Number(item.waste_kg || 0),
        butts: previous.butts + Number(item.cigarette_butts || 0),
      });
    }
    return [...grouped.entries()]
      .map(([area, stats]) => ({ area, ...stats }))
      .sort((a, b) => b.actions - a.actions)
      .slice(0, 10);
  }, [data?.items]);

  const winners = useMemo(() => {
    if (compared.length === 0) {
      return null;
    }
    const byKg = [...compared].sort((a, b) => b.kg - a.kg)[0];
    const byActions = [...compared].sort((a, b) => b.actions - a.actions)[0];
    const byButts = [...compared].sort((a, b) => b.butts - a.butts)[0];
    return { byKg, byActions, byButts };
  }, [compared]);

  return (
    <div className="space-y-4">
      {isLoading ? <p className="text-sm text-slate-500">Comparaison des zones en cours...</p> : null}
      {error ? <p className="text-sm text-rose-700">Impossible de calculer la comparaison territoriale.</p> : null}
      {!isLoading && !error ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Zone</th>
                  <th className="px-3 py-2">Actions</th>
                  <th className="px-3 py-2">Kg</th>
                  <th className="px-3 py-2">Megots</th>
                  <th className="px-3 py-2">Kg/action</th>
                </tr>
              </thead>
              <tbody>
                {compared.map((row) => (
                  <tr key={row.area} className="border-t border-slate-100 text-slate-700">
                    <td className="px-3 py-2 font-semibold">{row.area}</td>
                    <td className="px-3 py-2">{row.actions}</td>
                    <td className="px-3 py-2">{row.kg.toFixed(1)}</td>
                    <td className="px-3 py-2">{row.butts}</td>
                    <td className="px-3 py-2">{row.actions > 0 ? (row.kg / row.actions).toFixed(2) : "0.00"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Classements rapides</h3>
            {winners ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                <li>
                  Zone la plus active: <span className="font-semibold">{winners.byActions.area}</span> ({winners.byActions.actions} actions)
                </li>
                <li>
                  Zone plus gros volume: <span className="font-semibold">{winners.byKg.area}</span> ({winners.byKg.kg.toFixed(1)} kg)
                </li>
                <li>
                  Zone la plus impactee megots: <span className="font-semibold">{winners.byButts.area}</span> ({winners.byButts.butts})
                </li>
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Aucune zone a comparer pour le moment.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GuideSection() {
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    const defaults = {
      briefing: false,
      declaration: false,
      tracing: false,
      moderation: false,
      export: false,
    };
    if (typeof window === "undefined") {
      return defaults;
    }
    try {
      const raw = window.localStorage.getItem("cleanmymap.guide.checklist");
      if (!raw) {
        return defaults;
      }
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("cleanmymap.guide.checklist", JSON.stringify(checks));
    } catch {
      // Ignore storage write errors.
    }
  }, [checks]);

  const progress = useMemo(() => {
    const values = Object.values(checks);
    const done = values.filter(Boolean).length;
    return values.length > 0 ? Math.round((done / values.length) * 100) : 0;
  }, [checks]);

  function toggleCheck(key: string): void {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-900">Mode operatoire benevole (web)</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Progression {progress}%</p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <ul className="space-y-2">
        <li className="flex items-start gap-2">
          <input type="checkbox" checked={checks.briefing} onChange={() => toggleCheck("briefing")} className="mt-1" />
          <span>Briefing equipe, meteo et securite valides.</span>
        </li>
        <li className="flex items-start gap-2">
          <input type="checkbox" checked={checks.declaration} onChange={() => toggleCheck("declaration")} className="mt-1" />
          <span>Declaration creee avec lieu, date, quantites.</span>
        </li>
        <li className="flex items-start gap-2">
          <input type="checkbox" checked={checks.tracing} onChange={() => toggleCheck("tracing")} className="mt-1" />
          <span>Trace ou polygone captures pour la zone nettoyee.</span>
        </li>
        <li className="flex items-start gap-2">
          <input type="checkbox" checked={checks.moderation} onChange={() => toggleCheck("moderation")} className="mt-1" />
          <span>Moderation suivie pour fiabiliser la donnee.</span>
        </li>
        <li className="flex items-start gap-2">
          <input type="checkbox" checked={checks.export} onChange={() => toggleCheck("export")} className="mt-1" />
          <span>Export CSV/JSON realise pour exploitation terrain/collectivites.</span>
        </li>
      </ul>
    </div>
  );
}

function KitSection() {
  const [packType, setPackType] = useState<"solo" | "team" | "school">("team");

  const packItems = useMemo(() => {
    if (packType === "solo") {
      return ["1 paire de gants", "2 sacs differencies", "1 pince", "1 bouteille d'eau", "telephone charge"];
    }
    if (packType === "school") {
      return ["20 paires de gants", "40 sacs differencies", "6 pinces", "kit signaletique", "briefing securite imprime"];
    }
    return ["10 paires de gants", "20 sacs differencies", "4 pinces", "2 contenants megots", "gilet haute visibilite x5"];
  }, [packType]);

  function copyPack(): void {
    const text = `Kit ${packType}\n- ${packItems.join("\n- ")}`;
    void navigator.clipboard?.writeText(text);
  }

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Type de kit
          <select
            value={packType}
            onChange={(event) => setPackType(event.target.value as "solo" | "team" | "school")}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="solo">Solo</option>
            <option value="team">Equipe</option>
            <option value="school">Scolaire</option>
          </select>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Materiel recommande</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {packItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button
            onClick={copyPack}
            className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Copier la checklist
          </button>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Checklist avant depart</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li>Verifier meteo et parcours.</li>
            <li>Confirmer l&apos;heure, la zone, les roles.</li>
            <li>Preparer la declaration action dans le site.</li>
            <li>Activer trace/polygone si besoin terrain.</li>
          </ol>
        </article>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/actions/new"
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
        >
          Demarrer une action
        </Link>
        <Link
          href="/actions/map"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Ouvrir la carte
        </Link>
      </div>
    </div>
  );
}

function SandboxSection() {
  const { data, error, isLoading, isValidating, mutate } = useSWR("section-sandbox-health", async () => {
    const response = await fetch("/api/health", { method: "GET", cache: "no-store" });
    if (!response.ok) {
      throw new Error("health_unavailable");
    }
    return (await response.json()) as { status?: string; service?: string; timestamp?: string };
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Bac a sable technique</h2>
            <p className="mt-1 text-sm text-slate-600">Validation rapide des endpoints et de l&apos;etat des integrations.</p>
          </div>
          <button
            onClick={() => void mutate()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {isValidating ? "Actualisation..." : "Recharger"}
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Health</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {isLoading ? "Chargement..." : error ? "Indisponible" : data?.status ?? "n/a"}
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Service</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{data?.service ?? "cleanmymap-web"}</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Horodatage</p>
            <p className="mt-1 text-xs font-mono text-slate-700">{data?.timestamp ?? "-"}</p>
          </article>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Tests API rapides</h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            <li>
              <a className="font-semibold text-emerald-700 hover:text-emerald-800" href="/api/health" target="_blank" rel="noreferrer">
                GET /api/health
              </a>
            </li>
            <li>
              <a className="font-semibold text-emerald-700 hover:text-emerald-800" href="/api/actions?limit=5" target="_blank" rel="noreferrer">
                GET /api/actions?limit=5
              </a>
            </li>
            <li>
              <a className="font-semibold text-emerald-700 hover:text-emerald-800" href="/api/actions/map?days=7&limit=20" target="_blank" rel="noreferrer">
                GET /api/actions/map?days=7&limit=20
              </a>
            </li>
          </ul>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Validation front rapide</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li>Declarer une action test avec coordonnees.</li>
            <li>Verifier apparition dans carte et historique.</li>
            <li>Verifier export CSV/JSON sur role admin.</li>
            <li>Verifier trace/polygone sur carte et export.</li>
          </ol>
        </article>
      </div>

      <SystemStatusPanel />
    </div>
  );
}

function ElusSection() {
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [referenceNowMs] = useState<number>(() => Date.now());
  const { data, isLoading, error } = useSWR(["section-elus", String(periodDays)], () =>
    fetchMapActions({ status: "approved", days: periodDays * 2, limit: 300 }),
  );

  const synthesis = useMemo(() => {
    const all = data?.items ?? [];
    const now = referenceNowMs;
    const currentFloor = now - periodDays * 24 * 60 * 60 * 1000;
    const previousFloor = now - periodDays * 2 * 24 * 60 * 60 * 1000;

    const current = all.filter((item) => {
      const t = new Date(item.action_date).getTime();
      return Number.isFinite(t) && t >= currentFloor;
    });
    const previous = all.filter((item) => {
      const t = new Date(item.action_date).getTime();
      return Number.isFinite(t) && t >= previousFloor && t < currentFloor;
    });

    const currentKg = current.reduce((acc, item) => acc + Number(item.waste_kg || 0), 0);
    const previousKg = previous.reduce((acc, item) => acc + Number(item.waste_kg || 0), 0);
    const uniqueAreas = new Set(current.map((item) => extractArrondissement(item.location_label || "")));

    const byArea = new Map<string, { actions: number; kg: number; butts: number; uniqueSpots: Set<string> }>();
    for (const item of current) {
      const area = extractArrondissement(item.location_label || "");
      const prev = byArea.get(area) ?? { actions: 0, kg: 0, butts: 0, uniqueSpots: new Set<string>() };
      prev.actions += 1;
      prev.kg += Number(item.waste_kg || 0);
      prev.butts += Number(item.cigarette_butts || 0);
      prev.uniqueSpots.add((item.location_label || "").trim().toLowerCase());
      byArea.set(area, prev);
    }

    const priorities = [...byArea.entries()]
      .map(([area, stats]) => {
        const recurrence = Math.max(0, stats.actions - stats.uniqueSpots.size);
        const score = stats.kg * 1.4 + stats.actions * 2 + stats.butts * 0.01 + recurrence * 5;
        return {
          area,
          actions: stats.actions,
          kg: stats.kg,
          butts: stats.butts,
          recurrence,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const kgTrend = previousKg > 0 ? ((currentKg - previousKg) / previousKg) * 100 : currentKg > 0 ? 100 : 0;

    return {
      points: current.length,
      zones: uniqueAreas.size,
      currentKg,
      previousKg,
      kgTrend,
      priorities,
    };
  }, [data?.items, periodDays, referenceNowMs]);

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Fenetre d&apos;observation
          <select
            value={String(periodDays)}
            onChange={(event) => setPeriodDays(Number(event.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
            <option value="180">180 jours</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Actions validees</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{synthesis.points}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Zones couvertes</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{synthesis.zones}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Volume collecte</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{synthesis.currentKg.toFixed(1)} kg</p>
        </article>
      </div>
      <p className="text-sm text-slate-600">
        Observatoire municipal: priorisation territoriale sur fenetre glissante avec lecture tendance vs periode precedente.
      </p>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Tendance volume</h3>
        <p className="mt-2 text-sm text-slate-700">
          Periode courante: <span className="font-semibold">{synthesis.currentKg.toFixed(1)} kg</span> | Periode precedente:{" "}
          <span className="font-semibold">{synthesis.previousKg.toFixed(1)} kg</span> | Evolution:{" "}
          <span className={`font-semibold ${synthesis.kgTrend >= 0 ? "text-rose-700" : "text-emerald-700"}`}>
            {synthesis.kgTrend >= 0 ? "+" : ""}
            {synthesis.kgTrend.toFixed(1)}%
          </span>
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">Rang</th>
              <th className="px-3 py-2">Zone</th>
              <th className="px-3 py-2">Actions</th>
              <th className="px-3 py-2">Kg</th>
              <th className="px-3 py-2">Recurrence</th>
              <th className="px-3 py-2">Score priorite</th>
            </tr>
          </thead>
          <tbody>
            {synthesis.priorities.map((row, index) => (
              <tr key={row.area} className="border-t border-slate-100 text-slate-700">
                <td className="px-3 py-2 font-semibold">{index + 1}</td>
                <td className="px-3 py-2 font-semibold">{row.area}</td>
                <td className="px-3 py-2">{row.actions}</td>
                <td className="px-3 py-2">{row.kg.toFixed(1)}</td>
                <td className="px-3 py-2">{row.recurrence}</td>
                <td className="px-3 py-2">{row.score.toFixed(1)}</td>
              </tr>
            ))}
            {!isLoading && !error && synthesis.priorities.length === 0 ? (
              <tr className="border-t border-slate-100 text-slate-600">
                <td className="px-3 py-3" colSpan={6}>
                  Aucune zone prioritaire detectee sur la fenetre choisie.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {isLoading ? <p className="text-sm text-slate-500">Chargement des KPI...</p> : null}
      {error ? <p className="text-sm text-rose-700">KPI indisponibles.</p> : null}
    </div>
  );
}

function NotFoundSection() {
  const { locale } = useSitePreferences();
  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
      <h1 className="text-xl font-semibold text-rose-800">{locale === "fr" ? "Rubrique introuvable" : "Section not found"}</h1>
      <p className="mt-2 text-sm text-rose-700">
        {locale === "fr"
          ? "La rubrique demandee n'est pas definie dans la navigation Next.js."
          : "The requested section is not defined in Next.js navigation."}
      </p>
    </section>
  );
}

function PendingSection(props: { label: L10n; note?: L10n }) {
  const { locale } = useSitePreferences();
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <h1 className="text-xl font-semibold text-amber-900">
        {locale === "fr" ? `Rubrique en attente: ${props.label.fr}` : `Section in progress: ${props.label.en}`}
      </h1>
      <p className="mt-2 text-sm text-amber-800">
        {props.note
          ? t(locale, props.note)
          : locale === "fr"
            ? "La route est active, mais le contenu final n'est pas encore livre."
            : "The route is active, but the final content is not delivered yet."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/dashboard"
          className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          {locale === "fr" ? "Retour dashboard" : "Back to dashboard"}
        </Link>
        <Link
          href="/reports"
          className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          {locale === "fr" ? "Ouvrir reporting" : "Open reporting"}
        </Link>
      </div>
    </section>
  );
}

export function SectionRenderer({ sectionId }: SectionRendererProps) {
  const sectionDefinition = getSectionRubriqueById(sectionId) as
    | {
        id: string;
        implementation: "finalized" | "pending";
        label: L10n;
        pendingNote?: L10n;
      }
    | undefined;
  if (!sectionDefinition) {
    return <NotFoundSection />;
  }

  if (sectionDefinition.implementation === "pending") {
    return <PendingSection label={sectionDefinition.label} note={sectionDefinition.pendingNote} />;
  }

  const finalizedSectionId = sectionDefinition.id as FinalizedSectionId;

  switch (finalizedSectionId) {
    case "community":
      return (
        <SectionShell
          title={{ fr: "Rassemblements & Agenda", en: "Meetups & Agenda" }}
          subtitle={{ fr: "Coordination des actions collectives, calendrier et inscriptions.", en: "Collective actions coordination, calendar and sign-ups." }}
          links={[{ href: "/actions/new", label: { fr: "Nouvelle action", en: "New action" } }]}
        >
          <CommunitySection />
        </SectionShell>
      );
    case "gamification":
      return (
        <SectionShell
          title={{ fr: "Classement", en: "Leaderboard" }}
          subtitle={{ fr: "Classement benevole base sur les actions validees.", en: "Volunteer ranking based on validated actions." }}
          links={[{ href: "/actions/history", label: { fr: "Voir historique", en: "Open history" } }]}
        >
          <GamificationSection />
        </SectionShell>
      );
    case "actors":
      return (
        <SectionShell
          title={{ fr: "Partenaires", en: "Partners" }}
          subtitle={{ fr: "Vue du reseau local et des zones prioritaires.", en: "Local partner network and priority areas." }}
          links={[{ href: "/sections/elus", label: { fr: "Vue collectivites", en: "Authorities view" } }]}
        >
          <ActorsSection />
        </SectionShell>
      );
    case "trash-spotter":
      return (
        <SectionShell
          title={{ fr: "Trash Spotter", en: "Trash Spotter" }}
          subtitle={{ fr: "Signalement, visualisation et priorisation géolocalisée.", en: "Reporting, visualization and geospatial prioritization." }}
          links={[
            { href: "/actions/new", label: { fr: "Declarer une action", en: "Declare action" } },
            { href: "/actions/map", label: { fr: "Carte complete", en: "Full map" } },
          ]}
        >
          <TrashSpotterSection />
        </SectionShell>
      );
    case "route":
      return (
        <SectionShell
          title={{ fr: "Itineraire IA", en: "AI routing" }}
          subtitle={{ fr: "Preparation d'un plan de passage priorise par impact.", en: "Prepare an impact-prioritized route." }}
          links={[{ href: "/actions/map", label: { fr: "Verifier sur la carte", en: "Check on map" } }]}
        >
          <RouteSection />
        </SectionShell>
      );
    case "recycling":
      return (
        <SectionShell
          title={{ fr: "Seconde vie", en: "Recycling" }}
          subtitle={{ fr: "Consignes de tri et valorisation terrain.", en: "Field sorting and reuse guidance." }}
          links={[{ href: "/reports", label: { fr: "Exporter les donnees", en: "Export data" } }]}
        >
          <RecyclingSection />
        </SectionShell>
      );
    case "climate":
      return (
        <SectionShell
          title={{ fr: "Climat", en: "Climate" }}
          subtitle={{ fr: "Indicateurs derives des actions validees.", en: "Indicators derived from validated actions." }}
          links={[{ href: "/reports", label: { fr: "Reporting", en: "Reporting" } }]}
        >
          <ClimateSection />
        </SectionShell>
      );
    case "weather":
      return (
        <SectionShell
          title={{ fr: "Météo", en: "Weather" }}
          subtitle={{ fr: "Conditions courantes pour securiser les operations.", en: "Current conditions to secure field operations." }}
          links={[{ href: "/actions/new", label: { fr: "Planifier une action", en: "Plan action" } }]}
        >
          <WeatherSection />
        </SectionShell>
      );
    case "compare":
      return (
        <SectionShell
          title={{ fr: "Comparaison", en: "Comparison" }}
          subtitle={{ fr: "Comparaison des zones selon les actions geolocalisees.", en: "Area comparison from geolocated actions." }}
          links={[{ href: "/actions/map", label: { fr: "Carte", en: "Map" } }]}
        >
          <CompareSection />
        </SectionShell>
      );
    case "guide":
      return (
        <SectionShell
          title={{ fr: "Guide pratique", en: "Practical guide" }}
          subtitle={{ fr: "Workflow web conseille pour une collecte fiable.", en: "Recommended workflow for reliable data collection." }}
          links={[
            { href: "/actions/new", label: { fr: "Commencer", en: "Start" } },
            { href: "/actions/history", label: { fr: "Verifier", en: "Review" } },
          ]}
        >
          <GuideSection />
        </SectionShell>
      );
    case "kit":
      return (
        <SectionShell
          title={{ fr: "Kit terrain", en: "Field kit" }}
          subtitle={{ fr: "Preparation materiel et checklist operationnelle benevole.", en: "Volunteer equipment and operational checklist." }}
          links={[{ href: "/sections/guide", label: { fr: "Voir le guide", en: "Open guide" } }]}
        >
          <KitSection />
        </SectionShell>
      );
    case "sandbox":
      return (
        <SectionShell
          title={{ fr: "Sandbox", en: "Sandbox" }}
          subtitle={{ fr: "Zone de verification technique et supervision instantanee.", en: "Technical verification and supervision workspace." }}
          links={[{ href: "/dashboard", label: { fr: "Retour dashboard", en: "Back to dashboard" } }]}
        >
          <SandboxSection />
        </SectionShell>
      );
    case "elus":
      return (
        <SectionShell
          title={{ fr: "Collectivites", en: "Local authorities" }}
          subtitle={{ fr: "Observatoire municipal: KPI territoriaux et priorisation des zones.", en: "Municipal observatory: territorial KPIs and area prioritization." }}
          links={[{ href: "/reports", label: { fr: "Accès reporting", en: "Open reporting" } }]}
        >
          <ElusSection />
        </SectionShell>
      );
    default: {
      const exhaustiveCheck: never = finalizedSectionId;
      return <NotFoundSection key={exhaustiveCheck} />;
    }
  }
}
