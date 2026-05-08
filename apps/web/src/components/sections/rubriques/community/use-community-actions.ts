import { useState } from "react";
import {
  createCommunityEvent,
  updateCommunityEventOps,
  upsertCommunityRsvp,
  type CommunityEventItem,
  type CommunityRsvpStatus,
} from "@/lib/community/http";
import { AppError, defaultMessageForKind, isAppError, toAppError } from "@/lib/errors/app-errors";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { standardPostMortemTemplate } from "@/lib/community/event-ops";
import { parseOptionalInt, toRsvpLabel } from "./helpers";
import type { CreateCommunityEventForm, OpsDraft } from "./types";

type OpsDraftByEventId = Record<string, OpsDraft>;

function createDefaultForm(): CreateCommunityEventForm {
  return {
    title: "",
    eventDate: new Date().toISOString().slice(0, 10),
    locationLabel: "",
    description: "",
    capacityTarget: "",
    cleanupObjective: "",
    cleanupZone: "",
    cleanupLogisticsNeeds: "",
    cleanupSupportLevel: "moyen",
    cleanupWasteTypesExpected: ["megots", "plastique"],
  };
}

export function useCommunityActions(reloadEvents: () => Promise<unknown>) {
  const [createForm, setCreateForm] = useState<CreateCommunityEventForm>(createDefaultForm);
  const [isCreatingEvent, setIsCreatingEvent] = useState<boolean>(false);
  const [isUpdatingEventOpsId, setIsUpdatingEventOpsId] = useState<string | null>(null);
  const [rsvpLoadingEventId, setRsvpLoadingEventId] = useState<string | null>(null);
  const [communitySuccessMessage, setCommunitySuccessMessage] = useState<string | null>(null);
  const [communityError, setCommunityError] = useState<AppError | null>(null);
  const [opsDraftByEventId, setOpsDraftByEventId] = useState<OpsDraftByEventId>({});

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
      attendanceCount: event.attendanceCount === null ? "" : String(event.attendanceCount),
      postMortem: event.postMortem ?? standardPostMortemTemplate(),
    };
  }

  async function onCreateEvent(): Promise<void> {
    setCommunityError(null);
    setCommunitySuccessMessage(null);

    if (
      !createForm.title.trim() ||
      !createForm.eventDate.trim() ||
      !createForm.locationLabel.trim() ||
      !createForm.cleanupObjective.trim() ||
      !createForm.cleanupZone.trim() ||
      createForm.cleanupWasteTypesExpected.length === 0
    ) {
      setCommunityError(
        toAppError("Renseigne le titre, la date, le lieu et le cadrage cleanup.", {
          kind: "validation",
          message: "Renseigne le titre, la date, le lieu et le cadrage cleanup.",
        }),
      );
      return;
    }
    const parsedCapacity = parseOptionalInt(createForm.capacityTarget);
    if (
      createForm.capacityTarget.trim().length > 0 &&
      (parsedCapacity === null || parsedCapacity < 1)
    ) {
      setCommunityError(
        toAppError("La capacite cible doit etre un entier strictement positif.", {
          kind: "validation",
          message: "La capacite cible doit etre un entier strictement positif.",
        }),
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
        cleanupObjective: createForm.cleanupObjective.trim(),
        cleanupZone: createForm.cleanupZone.trim(),
        cleanupLogisticsNeeds: createForm.cleanupLogisticsNeeds.trim() || undefined,
        cleanupSupportLevel: createForm.cleanupSupportLevel,
        cleanupWasteTypesExpected: createForm.cleanupWasteTypesExpected,
      });
      setCreateForm((previous) => ({
        ...previous,
        title: "",
        locationLabel: "",
        description: "",
        capacityTarget: "",
        cleanupObjective: "",
        cleanupZone: "",
        cleanupLogisticsNeeds: "",
        cleanupSupportLevel: "moyen",
        cleanupWasteTypesExpected: ["megots", "plastique"],
      }));
      setCommunitySuccessMessage("Evenement cree et partage avec la communaute.");
      await reloadEvents();
    } catch (error) {
      const appError = isAppError(error)
        ? error
        : toAppError(error, {
            kind: "server",
            message: "Creation evenement impossible.",
          });
      if (appError.kind === "network") {
        notifyNetworkToast({
          message: appError.message || defaultMessageForKind("network"),
          onRetry: () => void onCreateEvent(),
          onRefresh: () => window.location.reload(),
        });
      }
      setCommunityError(appError);
    } finally {
      setIsCreatingEvent(false);
    }
  }

  async function onRsvp(
    eventId: string,
    status: CommunityRsvpStatus,
  ): Promise<void> {
    setCommunityError(null);
    setCommunitySuccessMessage(null);
    setRsvpLoadingEventId(eventId);
    try {
      await upsertCommunityRsvp({ eventId, status });
      setCommunitySuccessMessage(`RSVP enregistre: ${toRsvpLabel(status)}.`);
      await reloadEvents();
    } catch (error) {
      const appError = isAppError(error)
        ? error
        : toAppError(error, {
            kind: "server",
            message: "RSVP impossible.",
          });
      if (appError.kind === "network") {
        notifyNetworkToast({
          message: appError.message || defaultMessageForKind("network"),
          onRetry: () => void onRsvp(eventId, status),
          onRefresh: () => window.location.reload(),
        });
      }
      setCommunityError(appError);
    } finally {
      setRsvpLoadingEventId(null);
    }
  }

  async function onSaveEventOps(event: CommunityEventItem): Promise<void> {
    setCommunityError(null);
    setCommunitySuccessMessage(null);
    const draft = getOpsDraft(event);
    setIsUpdatingEventOpsId(event.id);
    try {
      await updateCommunityEventOps({
        eventId: event.id,
        attendanceCount: parseOptionalInt(draft.attendanceCount),
        postMortem: draft.postMortem.trim() ? draft.postMortem.trim() : null,
      });
      setCommunitySuccessMessage("Suivi evenement mis a jour (presence + post-mortem).");
      await reloadEvents();
    } catch (error) {
      const appError = isAppError(error)
        ? error
        : toAppError(error, {
            kind: "server",
            message: "Mise a jour evenement impossible.",
          });
      if (appError.kind === "network") {
        notifyNetworkToast({
          message: appError.message || defaultMessageForKind("network"),
          onRetry: () => void onSaveEventOps(event),
          onRefresh: () => window.location.reload(),
        });
      }
      setCommunityError(appError);
    } finally {
      setIsUpdatingEventOpsId(null);
    }
  }

  async function copyReminderMessage(message: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(message);
      setCommunitySuccessMessage("Message de relance copie dans le presse-papiers.");
    } catch {
      setCommunityError(
        toAppError("Copie impossible: autoriser l'acces au presse-papiers.", {
          kind: "permission",
          message: "Copie impossible: autoriser l'acces au presse-papiers.",
        }),
      );
    }
  }

  return {
    createForm,
    updateCreateForm,
    isCreatingEvent,
    onCreateEvent,
    isUpdatingEventOpsId,
    rsvpLoadingEventId,
    communitySuccessMessage,
    communityError,
    onRsvp,
    getOpsDraft,
    updateOpsDraft,
    onSaveEventOps,
    copyReminderMessage,
  };
}
