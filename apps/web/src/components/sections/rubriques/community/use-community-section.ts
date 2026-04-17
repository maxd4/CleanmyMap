"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import {
  CommunityClientError,
  createCommunityEvent,
  fetchCommunityEvents,
  updateCommunityEventOps,
  upsertCommunityRsvp,
  type CommunityEventItem,
  type CommunityRsvpStatus,
} from "@/lib/community/http";
import {
  computeEventConversions,
  computeEventRelances,
  computeEventStaffingPlan,
  type EventConversionRow,
  type EventReminder,
  type EventStaffingRow,
} from "@/lib/community/engagement";
import { standardPostMortemTemplate } from "@/lib/community/event-ops";
import { swrRecentViewOptions } from "@/lib/swr-config";
import {
  parseOptionalInt,
  toRsvpLabel,
} from "@/components/sections/rubriques/community/helpers";
import type {
  CommunityHighlightItem,
  CommunityTab,
  CreateCommunityEventForm,
  OpsDraft,
  PostEventLoop,
} from "@/components/sections/rubriques/community/types";

type OpsDraftByEventId = Record<string, OpsDraft>;

type UseCommunitySectionModel = {
  activeTab: CommunityTab;
  setActiveTab: (tab: CommunityTab) => void;
  createForm: CreateCommunityEventForm;
  updateCreateForm: <K extends keyof CreateCommunityEventForm>(
    key: K,
    value: CreateCommunityEventForm[K],
  ) => void;
  isCreatingEvent: boolean;
  onCreateEvent: () => Promise<void>;
  isUpdatingEventOpsId: string | null;
  rsvpLoadingEventId: string | null;
  communitySuccessMessage: string | null;
  communityErrorMessage: string | null;
  eventsLoading: boolean;
  eventsValidating: boolean;
  eventsLoadError: string | null;
  highlightsLoadError: string | null;
  actionsLoading: boolean;
  reloadEvents: () => Promise<unknown>;
  highlights: CommunityHighlightItem[];
  upcomingEvents: CommunityEventItem[];
  pastEvents: CommunityEventItem[];
  myEvents: CommunityEventItem[];
  conversionSummary: ReturnType<typeof computeEventConversions>["summary"];
  conversionByEventId: Map<string, EventConversionRow>;
  reminders: EventReminder[];
  remindersByEventId: Map<string, EventReminder>;
  staffingPlan: ReturnType<typeof computeEventStaffingPlan>;
  staffingByEventId: Map<string, EventStaffingRow>;
  postEventLoop: PostEventLoop;
  onRsvp: (eventId: string, status: CommunityRsvpStatus) => Promise<void>;
  getOpsDraft: (event: CommunityEventItem) => OpsDraft;
  updateOpsDraft: (eventId: string, patch: Partial<OpsDraft>) => void;
  onSaveEventOps: (event: CommunityEventItem) => Promise<void>;
  copyReminderMessage: (message: string) => Promise<void>;
  toRsvpLabel: typeof toRsvpLabel;
};

function createDefaultForm(): CreateCommunityEventForm {
  return {
    title: "",
    eventDate: new Date().toISOString().slice(0, 10),
    locationLabel: "",
    description: "",
    capacityTarget: "",
  };
}

export function useCommunitySection(): UseCommunitySectionModel {
  const [activeTab, setActiveTab] = useState<CommunityTab>("upcoming");
  const [createForm, setCreateForm] = useState<CreateCommunityEventForm>(
    createDefaultForm,
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
  const [opsDraftByEventId, setOpsDraftByEventId] = useState<OpsDraftByEventId>(
    {},
  );

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

  const highlights = useMemo<CommunityHighlightItem[]>(() => {
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
    const grouped = new Map<string, EventReminder>();
    for (const reminder of reminders) {
      grouped.set(reminder.eventId, reminder);
    }
    return grouped;
  }, [reminders]);
  const conversionByEventId = useMemo(() => {
    const grouped = new Map<string, EventConversionRow>();
    for (const row of conversion.rows) {
      grouped.set(row.eventId, row);
    }
    return grouped;
  }, [conversion.rows]);
  const staffingByEventId = useMemo(() => {
    const grouped = new Map<string, EventStaffingRow>();
    for (const row of staffingPlan.rows) {
      grouped.set(row.eventId, row);
    }
    return grouped;
  }, [staffingPlan.rows]);

  const postEventLoop = useMemo<PostEventLoop>(() => {
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

  function updateCreateForm<K extends keyof CreateCommunityEventForm>(
    key: K,
    value: CreateCommunityEventForm[K],
  ): void {
    setCreateForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function updateOpsDraft(eventId: string, patch: Partial<OpsDraft>): void {
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

  function getOpsDraft(event: CommunityEventItem): OpsDraft {
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
      setCommunitySuccessMessage("Evenement cree et partage avec la communaute.");
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

  const eventsLoadError =
    eventsError instanceof Error ? eventsError.message : null;
  const highlightsLoadError =
    actionsError instanceof Error ? actionsError.message : null;

  return {
    activeTab,
    setActiveTab,
    createForm,
    updateCreateForm,
    isCreatingEvent,
    onCreateEvent,
    isUpdatingEventOpsId,
    rsvpLoadingEventId,
    communitySuccessMessage,
    communityErrorMessage,
    eventsLoading,
    eventsValidating,
    eventsLoadError,
    highlightsLoadError,
    actionsLoading,
    reloadEvents,
    highlights,
    upcomingEvents,
    pastEvents,
    myEvents,
    conversionSummary: conversion.summary,
    conversionByEventId,
    reminders,
    remindersByEventId,
    staffingPlan,
    staffingByEventId,
    postEventLoop,
    onRsvp,
    getOpsDraft,
    updateOpsDraft,
    onSaveEventOps,
    copyReminderMessage,
    toRsvpLabel,
  };
}

export type { UseCommunitySectionModel };
