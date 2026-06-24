import { useMemo } from "react";
import useSWR from "swr";
import { fetchCommunityEvents } from "@/lib/community/http";
import type { ActionListItem } from "@/lib/actions/types";
import { swrLiveFeedOptions } from "@/lib/swr-config";
import { isAppError, toAppError } from "@/lib/errors/app-errors";
import {
  computeEventConversions,
  computeEventRelances,
  computeEventStaffingPlan,
  type EventConversionRow,
  type EventReminder,
  type EventStaffingRow,
} from "@/lib/community/engagement";
import { extractEventRefFromAction } from "@/lib/community/engagement.helpers";
import type { PostEventLoop } from "./types";

export function useCommunityEvents(actionItems: ActionListItem[]) {
  const {
    data: eventsData,
    error: eventsError,
    isLoading: eventsLoading,
    isValidating: eventsValidating,
    mutate: reloadEvents,
  } = useSWR(
    ["section-community-events"],
    () => fetchCommunityEvents({ limit: 240 }),
    swrLiveFeedOptions,
  );

  const allEvents = useMemo(() => eventsData?.items ?? [], [eventsData?.items]);
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

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
    () => computeEventConversions(allEvents, actionItems),
    [allEvents, actionItems],
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
      const hasWasteCharacterization = actionItems.some((item) => {
        if (!item.waste_breakdown) {
          return false;
        }
        return extractEventRefFromAction(item) === event.id;
      });
      const hasAttendance =
        event.attendanceCount !== null && event.attendanceCount >= 0;
      const hasPostMortem = Boolean(
        event.postMortem && event.postMortem.trim().length > 0,
      );
      const hasLinkedAction = (conversionRow?.linkedActions ?? 0) > 0;
      const closed =
        hasAttendance && hasPostMortem && hasLinkedAction && hasWasteCharacterization;
      return {
        event,
        closed,
        hasAttendance,
        hasPostMortem,
        hasLinkedAction,
        hasWasteCharacterization,
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
  }, [actionItems, conversionByEventId, pastEvents]);

  const eventsLoadError = isAppError(eventsError)
    ? eventsError
    : eventsError instanceof Error
      ? toAppError(eventsError, {
          kind: "server",
          message: "Chargement agenda communautaire impossible.",
        })
      : null;

  return {
    eventsLoading,
    eventsValidating,
    eventsLoadError,
    reloadEvents,
    allEvents,
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
  };
}
