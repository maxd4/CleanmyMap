"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { ActionsHistoryList } from "@/components/actions/actions-history-list";
import { fetchActions } from "@/lib/actions/http";
import {
  CommunityClientError,
  createCommunityEvent,
  fetchCommunityEvents,
  type CommunityEventItem,
  type CommunityRsvpStatus,
  updateCommunityEventOps,
  upsertCommunityRsvp,
} from "@/lib/community/http";
import {
  computeEventConversions,
  computeEventRelances,
  computeEventStaffingPlan,
} from "@/lib/community/engagement";
import { standardPostMortemTemplate } from "@/lib/community/event-ops";
import { swrRecentViewOptions } from "@/lib/swr-config";

type CreateCommunityEventForm = {
  title: string;
  eventDate: string;
  locationLabel: string;
  description: string;
  capacityTarget: string;
};

function toIcsTimestamp(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function buildDateAtHour(dateIso: string, hour: number, minute: number): Date {
  const [year, month, day] = dateIso.split("-").map((part) => Number(part));
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return new Date();
  }
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function buildIcsHref(event: CommunityEventItem): string {
  const startsAt = buildDateAtHour(event.eventDate, 9, 30);
  const endsAt = buildDateAtHour(event.eventDate, 12, 0);
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CleanMyMap//Agenda Terrain//FR",
    "BEGIN:VEVENT",
    `UID:${event.id}@cleanmymap`,
    `DTSTAMP:${toIcsTimestamp(new Date())}`,
    `DTSTART:${toIcsTimestamp(startsAt)}`,
    `DTEND:${toIcsTimestamp(endsAt)}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.locationLabel}`,
    `DESCRIPTION:${event.description ?? ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
}

function formatFrDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    parsed,
  );
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const asInt = Math.trunc(parsed);
  return asInt >= 0 ? asInt : null;
}

function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${value.toFixed(1)}%`;
}

function CommunitySection() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "mine" | "past">(
    "upcoming",
  );
  const [createForm, setCreateForm] = useState<CreateCommunityEventForm>(
    () => ({
      title: "",
      eventDate: new Date().toISOString().slice(0, 10),
      locationLabel: "",
      description: "",
      capacityTarget: "",
    }),
  );
  const [isCreatingEvent, setIsCreatingEvent] = useState<boolean>(false);
  const [isUpdatingEventOpsId, setIsUpdatingEventOpsId] = useState<
    string | null
  >(null);
  const [rsvpLoadingEventId, setRsvpLoadingEventId] = useState<string | null>(
    null,
  );
  const [communitySuccessMessage, setCommunitySuccessMessage] = useState<
    string | null
  >(null);
  const [communityErrorMessage, setCommunityErrorMessage] = useState<
    string | null
  >(null);
  const [opsDraftByEventId, setOpsDraftByEventId] = useState<
    Record<string, { attendanceCount: string; postMortem: string }>
  >({});

  const {
    data: eventsData,
    error: eventsError,
    isLoading: eventsLoading,
    isValidating: eventsValidating,
    mutate: reloadEvents,
  } = useSWR(
    ["section-community-events"],
    () => fetchCommunityEvents({ limit: 240 }),
    swrRecentViewOptions,
  );

  const {
    data: actionsData,
    isLoading: actionsLoading,
    error: actionsError,
  } = useSWR(
    ["section-community-feed"],
    () =>
      fetchActions({ status: "all", limit: 600, days: 365, types: "action" }),
    swrRecentViewOptions,
  );

  const allEvents = useMemo(() => eventsData?.items ?? [], [eventsData?.items]);
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const highlights = useMemo(() => {
    const items = actionsData?.items ?? [];
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
  }, [actionsData?.items]);

  const upcomingEvents = useMemo(
    () =>
      allEvents
        .filter((event) => event.eventDate >= todayIso)
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
    [allEvents, todayIso],
  );
  const pastEvents = useMemo(
    () =>
      allEvents
        .filter((event) => event.eventDate < todayIso)
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
    [allEvents, todayIso],
  );
  const myEvents = useMemo(
    () => allEvents.filter((event) => event.myRsvpStatus !== null),
    [allEvents],
  );
  const conversion = useMemo(
    () => computeEventConversions(allEvents, actionsData?.items ?? []),
    [allEvents, actionsData?.items],
  );
  const reminders = useMemo(
    () => computeEventRelances(upcomingEvents),
    [upcomingEvents],
  );
  const staffingPlan = useMemo(
    () => computeEventStaffingPlan(upcomingEvents),
    [upcomingEvents],
  );
  const remindersByEventId = useMemo(() => {
    const grouped = new Map<string, (typeof reminders)[number]>();
    for (const reminder of reminders) {
      grouped.set(reminder.eventId, reminder);
    }
    return grouped;
  }, [reminders]);
  const conversionByEventId = useMemo(() => {
    const grouped = new Map<string, (typeof conversion.rows)[number]>();
    for (const row of conversion.rows) {
      grouped.set(row.eventId, row);
    }
    return grouped;
  }, [conversion]);
  const staffingByEventId = useMemo(() => {
    const grouped = new Map<string, (typeof staffingPlan.rows)[number]>();
    for (const row of staffingPlan.rows) {
      grouped.set(row.eventId, row);
    }
    return grouped;
  }, [staffingPlan]);
  const postEventLoop = useMemo(() => {
    const rows = pastEvents.map((event) => {
      const conversionRow = conversionByEventId.get(event.id);
      const hasAttendance =
        event.attendanceCount !== null && event.attendanceCount >= 0;
      const hasPostMortem = Boolean(
        event.postMortem && event.postMortem.trim().length > 0,
      );
      const hasLinkedAction = (conversionRow?.linkedActions ?? 0) > 0;
      const closed = hasAttendance && hasPostMortem && hasLinkedAction;
      return {
        event,
        closed,
        hasAttendance,
        hasPostMortem,
        hasLinkedAction,
      };
    });
    const closedCount = rows.filter((row) => row.closed).length;
    const completionRate =
      rows.length > 0 ? (closedCount / rows.length) * 100 : 0;
    return {
      rows,
      closedCount,
      total: rows.length,
      completionRate,
      missing: rows.filter((row) => !row.closed).slice(0, 6),
    };
  }, [conversionByEventId, pastEvents]);

  function updateOpsDraft(
    eventId: string,
    patch: Partial<{ attendanceCount: string; postMortem: string }>,
  ): void {
    setOpsDraftByEventId((previous) => {
      const current = previous[eventId] ?? {
        attendanceCount: "",
        postMortem: standardPostMortemTemplate(),
      };
      return {
        ...previous,
        [eventId]: {
          ...current,
          ...patch,
        },
      };
    });
  }

  function getOpsDraft(event: CommunityEventItem): {
    attendanceCount: string;
    postMortem: string;
  } {
    const existing = opsDraftByEventId[event.id];
    if (existing) {
      return existing;
    }
    return {
      attendanceCount:
        event.attendanceCount === null ? "" : String(event.attendanceCount),
      postMortem: event.postMortem ?? standardPostMortemTemplate(),
    };
  }

  function toRsvpLabel(status: CommunityRsvpStatus): string {
    if (status === "yes") {
      return "Je participe";
    }
    if (status === "maybe") {
      return "Peut-etre";
    }
    return "Je ne participe pas";
  }

  async function onCreateEvent(): Promise<void> {
    setCommunityErrorMessage(null);
    setCommunitySuccessMessage(null);

    if (
      !createForm.title.trim() ||
      !createForm.eventDate.trim() ||
      !createForm.locationLabel.trim()
    ) {
      setCommunityErrorMessage(
        "Renseigne le titre, la date et le lieu de l'evenement.",
      );
      return;
    }
    const parsedCapacity = parseOptionalInt(createForm.capacityTarget);
    if (
      createForm.capacityTarget.trim().length > 0 &&
      (parsedCapacity === null || parsedCapacity < 1)
    ) {
      setCommunityErrorMessage(
        "La capacite cible doit etre un entier strictement positif.",
      );
      return;
    }

    setIsCreatingEvent(true);
    try {
      await createCommunityEvent({
        title: createForm.title.trim(),
        eventDate: createForm.eventDate.trim(),
        locationLabel: createForm.locationLabel.trim(),
        description: createForm.description.trim() || undefined,
        capacityTarget: parsedCapacity ?? undefined,
      });
      setCreateForm((previous) => ({
        ...previous,
        title: "",
        locationLabel: "",
        description: "",
        capacityTarget: "",
      }));
      setCommunitySuccessMessage(
        "Evenement cree et partage avec la communaute.",
      );
      await reloadEvents();
    } catch (error) {
      if (
        error instanceof CommunityClientError &&
        error.code === "permission_denied"
      ) {
        setCommunityErrorMessage("Connexion requise pour creer un evenement.");
      } else {
        setCommunityErrorMessage(
          error instanceof Error
            ? error.message
            : "Creation evenement impossible.",
        );
      }
    } finally {
      setIsCreatingEvent(false);
    }
  }

  async function onRsvp(
    eventId: string,
    status: CommunityRsvpStatus,
  ): Promise<void> {
    setCommunityErrorMessage(null);
    setCommunitySuccessMessage(null);
    setRsvpLoadingEventId(eventId);
    try {
      await upsertCommunityRsvp({ eventId, status });
      setCommunitySuccessMessage(`RSVP enregistre: ${toRsvpLabel(status)}.`);
      await reloadEvents();
    } catch (error) {
      if (
        error instanceof CommunityClientError &&
        error.code === "permission_denied"
      ) {
        setCommunityErrorMessage("Connexion requise pour enregistrer un RSVP.");
      } else {
        setCommunityErrorMessage(
          error instanceof Error ? error.message : "RSVP impossible.",
        );
      }
    } finally {
      setRsvpLoadingEventId(null);
    }
  }

  async function onSaveEventOps(event: CommunityEventItem): Promise<void> {
    setCommunityErrorMessage(null);
    setCommunitySuccessMessage(null);
    const draft = getOpsDraft(event);
    setIsUpdatingEventOpsId(event.id);
    try {
      await updateCommunityEventOps({
        eventId: event.id,
        attendanceCount: parseOptionalInt(draft.attendanceCount),
        postMortem: draft.postMortem.trim() ? draft.postMortem.trim() : null,
      });
      setCommunitySuccessMessage(
        "Suivi evenement mis a jour (presence + post-mortem).",
      );
      await reloadEvents();
    } catch (error) {
      if (
        error instanceof CommunityClientError &&
        error.code === "permission_denied"
      ) {
        setCommunityErrorMessage(
          "Acces refuse: droits organisateur/admin requis pour le suivi evenement.",
        );
      } else {
        setCommunityErrorMessage(
          error instanceof Error
            ? error.message
            : "Mise a jour evenement impossible.",
        );
      }
    } finally {
      setIsUpdatingEventOpsId(null);
    }
  }

  async function copyReminderMessage(message: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(message);
      setCommunitySuccessMessage(
        "Message de relance copie dans le presse-papiers.",
      );
    } catch {
      setCommunityErrorMessage(
        "Copie impossible: autoriser l'acces au presse-papiers.",
      );
    }
  }

  function updateCreateForm<K extends keyof CreateCommunityEventForm>(
    key: K,
    value: CreateCommunityEventForm[K],
  ): void {
    setCreateForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  const eventsLoadError =
    eventsError instanceof Error ? eventsError.message : null;
  const highlightsLoadError =
    actionsError instanceof Error ? actionsError.message : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Rassemblements and agenda: suivi de mobilisation, calendrier terrain et
        inscriptions partagees entre appareils.
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Creer un evenement communautaire
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Creation cote serveur via <code>/api/community/events</code>,
              visible ensuite sur tous les devices.
            </p>
          </div>
          <button
            onClick={() => void reloadEvents()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {eventsValidating ? "Actualisation..." : "Rafraichir agenda"}
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Titre
            <input
              value={createForm.title}
              onChange={(event) =>
                updateCreateForm("title", event.target.value)
              }
              placeholder="Nettoyage Canal Saint-Martin"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Date
            <input
              type="date"
              value={createForm.eventDate}
              onChange={(event) =>
                updateCreateForm("eventDate", event.target.value)
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Capacite cible
            <input
              type="number"
              min={1}
              value={createForm.capacityTarget}
              onChange={(event) =>
                updateCreateForm("capacityTarget", event.target.value)
              }
              placeholder="Ex: 40"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 md:col-span-2">
            Lieu
            <input
              value={createForm.locationLabel}
              onChange={(event) =>
                updateCreateForm("locationLabel", event.target.value)
              }
              placeholder="Canal Saint-Martin, Paris 10e"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 md:col-span-2">
            Description
            <textarea
              value={createForm.description}
              onChange={(event) =>
                updateCreateForm("description", event.target.value)
              }
              rows={3}
              placeholder="Collecte, zone ciblee, points logistiques."
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-500"
            />
          </label>
        </div>

        <div className="mt-3">
          <button
            onClick={() => void onCreateEvent()}
            disabled={isCreatingEvent}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isCreatingEvent ? "Creation..." : "Creer l'evenement"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Mobilisation recente
        </h2>
        {actionsLoading ? (
          <p className="mt-2 text-sm text-slate-500">
            Chargement des rendez-vous communautaires...
          </p>
        ) : null}
        {highlightsLoadError ? (
          <p className="mt-2 text-sm text-rose-700">{highlightsLoadError}</p>
        ) : null}
        {!actionsLoading && !highlightsLoadError ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {highlights.map((item) => (
              <li key={item.date}>
                {item.date}: {item.actions} action(s), {item.volunteers}{" "}
                benevole(s)
              </li>
            ))}
            {highlights.length === 0 ? (
              <li>Aucune action validee sur la periode.</li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Conversion RSVP -&gt; presence
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatPct(conversion.summary.rsvpToAttendanceRate)}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {conversion.summary.rsvpYesTotal} RSVP oui /{" "}
            {conversion.summary.attendanceTotalKnown} presences connues
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Conversion presence -&gt; action
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatPct(conversion.summary.attendanceToActionRate)}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {conversion.summary.linkedActionsTotal} actions liees a des
            evenements
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Conversion RSVP -&gt; action
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatPct(conversion.summary.rsvpToActionRate)}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {conversion.summary.eventsCount} evenement(s) suivis
          </p>
        </article>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Export coordination hebdo
          </h2>
          <a
            href="/api/community/funnel.csv?days=90&limit=600"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Export CSV funnel community
          </a>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Export par evenement: RSVP, presence, conversions et actions liees
          pour pilotage hebdomadaire.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Capacite & staffing evenement
          </h2>
          <p className="text-xs text-slate-600">
            Gap staffing:{" "}
            <span className="font-semibold">
              {staffingPlan.summary.totalStaffingGap}
            </span>{" "}
            sur {staffingPlan.summary.totalRecommendedStaff} referent(s)
            recommandes
          </p>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Evenements analyses
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {staffingPlan.summary.eventsCount}
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Evenements a risque
            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">
              {staffingPlan.summary.atRiskCount}
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Referents confirmes
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {staffingPlan.summary.totalConfirmedStaff}
            </p>
          </article>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {staffingPlan.rows.slice(0, 6).map((row) => (
            <li
              key={`staff-${row.eventId}`}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <p className="font-semibold">
                {row.title} - risque {row.riskLevel.toUpperCase()}
              </p>
              <p className="text-xs text-slate-600">
                {formatFrDate(row.eventDate)} - {row.locationLabel} |
                participants attendus {row.expectedParticipants}
              </p>
              <p className="text-xs text-slate-600">
                Staffing recommande {row.recommendedStaff}, confirme{" "}
                {row.confirmedStaff}, gap {row.staffingGap}.
              </p>
              <p className="text-xs text-slate-500">{row.reason}</p>
            </li>
          ))}
          {staffingPlan.rows.length === 0 ? (
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
              Aucun evenement a venir necessitant un dimensionnement staffing.
            </li>
          ) : null}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Relances prioritaires
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Relances preconisees pour ameliorer la capacite evenement et la
          conversion RSVP.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {reminders.map((reminder) => (
            <li
              key={reminder.eventId}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  Priorite {reminder.priority.toUpperCase()} - J-
                  {reminder.daysToEvent}
                </p>
                <button
                  onClick={() => void copyReminderMessage(reminder.message)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Copier message
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-600">{reminder.reason}</p>
              <p className="mt-2 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                {reminder.message}
              </p>
            </li>
          ))}
          {reminders.length === 0 ? (
            <li>Aucune relance urgente sur les 14 prochains jours.</li>
          ) : null}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Boucle post-evenement (retour d&apos;experience)
          </h2>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            {postEventLoop.closedCount}/{postEventLoop.total} boucle(s)
            fermee(s)
          </p>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Taux de fermeture:{" "}
          <span className="font-semibold">
            {postEventLoop.completionRate.toFixed(1)}%
          </span>{" "}
          (presence renseignee + post-mortem + action liee).
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {postEventLoop.missing.map((row) => (
            <li
              key={row.event.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <p className="font-semibold">{row.event.title}</p>
              <p className="text-xs text-slate-500">
                {formatFrDate(row.event.eventDate)} - {row.event.locationLabel}
              </p>
              <p className="mt-1 text-xs">
                Manques:{" "}
                {[
                  !row.hasAttendance ? "presence" : null,
                  !row.hasPostMortem ? "post-mortem" : null,
                  !row.hasLinkedAction ? "action post-evenement" : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </li>
          ))}
          {postEventLoop.missing.length === 0 ? (
            <li className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
              Toutes les boucles post-evenement sont completes.
            </li>
          ) : null}
        </ul>
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

        {eventsLoading ? (
          <p className="mt-3 text-sm text-slate-500">
            Chargement agenda communautaire...
          </p>
        ) : null}
        {eventsLoadError ? (
          <p className="mt-3 text-sm text-rose-700">{eventsLoadError}</p>
        ) : null}

        {!eventsLoading && !eventsLoadError && activeTab === "upcoming" ? (
          <div className="mt-4 space-y-3">
            {upcomingEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <h3 className="text-sm font-semibold text-slate-900">
                  {event.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  {formatFrDate(event.eventDate)}
                </p>
                <p className="text-xs text-slate-600">{event.locationLabel}</p>
                <p className="mt-2 text-sm text-slate-700">
                  {event.description || "Sans description."}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  RSVP: oui {event.rsvpCounts.yes} | peut-etre{" "}
                  {event.rsvpCounts.maybe} | non {event.rsvpCounts.no}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Capacite: {event.capacityTarget ?? "n/a"} | remplissage{" "}
                  {formatPct(
                    conversionByEventId.get(event.id)?.fillRate ?? null,
                  )}
                </p>
                {staffingByEventId.get(event.id) ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Staffing: {staffingByEventId.get(event.id)?.confirmedStaff}/
                    {staffingByEventId.get(event.id)?.recommendedStaff}{" "}
                    referent(s)
                    {staffingByEventId.get(event.id)?.staffingGap
                      ? ` | gap ${staffingByEventId.get(event.id)?.staffingGap}`
                      : ""}
                  </p>
                ) : null}
                {remindersByEventId.get(event.id) ? (
                  <p className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                    Relance{" "}
                    {remindersByEventId.get(event.id)?.priority.toUpperCase()}:{" "}
                    {remindersByEventId.get(event.id)?.reason}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => void onRsvp(event.id, "yes")}
                    disabled={rsvpLoadingEventId === event.id}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    Je participe
                  </button>
                  <button
                    onClick={() => void onRsvp(event.id, "maybe")}
                    disabled={rsvpLoadingEventId === event.id}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Peut-etre
                  </button>
                  <button
                    onClick={() => void onRsvp(event.id, "no")}
                    disabled={rsvpLoadingEventId === event.id}
                    className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:text-rose-300"
                  >
                    Je ne participe pas
                  </button>
                  <a
                    href={buildIcsHref(event)}
                    download={`${event.id}.ics`}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Ajouter a mon agenda
                  </a>
                </div>

                {event.myRsvpStatus ? (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    Mon statut: {toRsvpLabel(event.myRsvpStatus)}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    Aucun RSVP enregistre pour mon compte.
                  </p>
                )}
              </article>
            ))}
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-slate-600">
                Aucun evenement a venir pour le moment.
              </p>
            ) : null}
          </div>
        ) : null}

        {!eventsLoading && !eventsLoadError && activeTab === "mine" ? (
          <div className="mt-4 space-y-2">
            {myEvents.length === 0 ? (
              <p className="text-sm text-slate-600">
                Aucune inscription enregistree pour le moment.
              </p>
            ) : (
              myEvents.map((event) => (
                <article
                  key={event.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                >
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-xs">
                    {formatFrDate(event.eventDate)} - {event.locationLabel}
                  </p>
                  <p className="text-xs font-semibold text-emerald-700">
                    Statut:{" "}
                    {event.myRsvpStatus
                      ? toRsvpLabel(event.myRsvpStatus)
                      : "Aucun"}
                  </p>
                </article>
              ))
            )}
          </div>
        ) : null}

        {!eventsLoading && !eventsLoadError && activeTab === "past" ? (
          <div className="mt-4 space-y-3">
            {pastEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {event.title}
                </p>
                <p className="text-xs text-slate-600">
                  {formatFrDate(event.eventDate)} - {event.locationLabel}
                </p>
                <p className="text-xs text-slate-600">
                  RSVP total: {event.rsvpCounts.total}
                </p>
                <p className="text-xs text-slate-600">
                  Conversion evenement: RSVP-&gt;presence{" "}
                  {formatPct(
                    conversionByEventId.get(event.id)?.rsvpToAttendanceRate ??
                      null,
                  )}{" "}
                  | presence-&gt;action{" "}
                  {formatPct(
                    conversionByEventId.get(event.id)?.attendanceToActionRate ??
                      null,
                  )}
                </p>
                <Link
                  href={`/actions/new?fromEventId=${event.id}`}
                  className="mt-2 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Declarer une action post-evenement
                </Link>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Presence constatee
                    <input
                      type="number"
                      min={0}
                      value={getOpsDraft(event).attendanceCount}
                      onChange={(input) =>
                        updateOpsDraft(event.id, {
                          attendanceCount: input.target.value,
                        })
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-500"
                    />
                  </label>
                </div>
                <label className="mt-2 flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Post-mortem
                  <textarea
                    rows={4}
                    value={getOpsDraft(event).postMortem}
                    onChange={(input) =>
                      updateOpsDraft(event.id, {
                        postMortem: input.target.value,
                      })
                    }
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-800 outline-none transition focus:border-emerald-500"
                  />
                </label>
                <button
                  onClick={() => void onSaveEventOps(event)}
                  disabled={isUpdatingEventOpsId === event.id}
                  className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {isUpdatingEventOpsId === event.id
                    ? "Sauvegarde..."
                    : "Enregistrer suivi evenement"}
                </button>
              </article>
            ))}
            {pastEvents.length === 0 ? (
              <p className="text-sm text-slate-600">Aucun evenement passe.</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {communitySuccessMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {communitySuccessMessage}
        </p>
      ) : null}

      {communityErrorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {communityErrorMessage}
        </p>
      ) : null}

      <ActionsHistoryList />
    </div>
  );
}

export { CommunitySection };
