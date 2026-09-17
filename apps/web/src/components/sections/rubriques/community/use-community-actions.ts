import { useCallback, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import {
  createCommunityEvent,
  updateCommunityEventOps,
  upsertCommunityRsvp,
  type CommunityRsvpStatus,
  type CommunityEventItem,
} from "@/lib/community/http";
import { AppError, defaultMessageForKind, isAppError, toAppError } from "@/lib/errors/app-errors";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { isValidCommunityEventCoordinatePair } from "@/lib/community/event-location";
import { standardPostMortemTemplate } from "@/lib/community/event-ops";
import { parseOptionalInt, toRsvpLabel } from "./helpers";
import { redirectToCommunitySignIn } from "./mutation-auth";
import type { CreateCommunityEventForm, OpsDraft } from "./types";

function createDefaultForm(): CreateCommunityEventForm {
  return {
    title: "",
    eventDate: new Date().toISOString().slice(0, 10),
    locationLabel: "",
    latitude: "",
    longitude: "",
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
  const { isLoaded, isSignedIn } = useAuth();
  const { redirectToSignIn } = useClerk();
  const [createForm, setCreateForm] = useState<CreateCommunityEventForm>(createDefaultForm);
  const [isCreatingEvent, setIsCreatingEvent] = useState<boolean>(false);
  const [rsvpLoadingEventId, setRsvpLoadingEventId] = useState<string | null>(null);
  const [communitySuccessMessage, setCommunitySuccessMessage] = useState<string | null>(null);
  const [communityError, setCommunityError] = useState<AppError | null>(null);
  const [isUpdatingEventOpsId, setIsUpdatingEventOpsId] = useState<string | null>(null);
  const [opsDraftByEventId, setOpsDraftByEventId] = useState<Record<string, OpsDraft>>({});

  const redirectAnonymousToCommunity = useCallback(() => {
    redirectToCommunitySignIn(redirectToSignIn);
  }, [redirectToSignIn]);

  const ensureAuthenticatedForMutation = useCallback((): boolean => {
    if (isLoaded && isSignedIn) {
      return true;
    }

    redirectAnonymousToCommunity();
    return false;
  }, [isLoaded, isSignedIn, redirectAnonymousToCommunity]);

  function updateCreateForm<K extends keyof CreateCommunityEventForm>(
    key: K,
    value: CreateCommunityEventForm[K],
  ): void {
    setCreateForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function onCreateEvent(): Promise<void> {
    if (!ensureAuthenticatedForMutation()) {
      return;
    }

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
        toAppError("Renseignez le titre, la date, le lieu et l’objectif de la mission.", {
          kind: "validation",
          message: "Renseignez le titre, la date, le lieu et l’objectif de la mission.",
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
        toAppError("La capacité cible doit être un entier strictement positif.", {
          kind: "validation",
          message: "La capacité cible doit être un entier strictement positif.",
        }),
      );
      return;
    }

    const latitude = createForm.latitude.trim() === "" ? null : Number(createForm.latitude);
    const longitude = createForm.longitude.trim() === "" ? null : Number(createForm.longitude);
    if (
      (latitude === null) !== (longitude === null) ||
      (latitude !== null &&
        longitude !== null &&
        !isValidCommunityEventCoordinatePair(latitude, longitude))
    ) {
      setCommunityError(
        toAppError("Les deux coordonnées doivent être renseignées et valides.", {
          kind: "validation",
          message: "Les deux coordonnées doivent être renseignées et valides.",
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
        ...(latitude !== null && longitude !== null
          ? { location: { latitude, longitude, source: "manual" as const } }
          : {}),
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
        latitude: "",
        longitude: "",
        description: "",
        capacityTarget: "",
        cleanupObjective: "",
        cleanupZone: "",
        cleanupLogisticsNeeds: "",
        cleanupSupportLevel: "moyen",
        cleanupWasteTypesExpected: ["megots", "plastique"],
      }));
      setCommunitySuccessMessage("Mission créée et partagée avec la communauté.");
      await reloadEvents();
    } catch (error) {
      const appError = isAppError(error)
        ? error
        : toAppError(error, {
            kind: "server",
          message: "Création de la mission impossible.",
          });
      if (appError.status === 401) {
        redirectAnonymousToCommunity();
        return;
      }
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
    if (!ensureAuthenticatedForMutation()) {
      return;
    }

    setCommunityError(null);
    setCommunitySuccessMessage(null);
    setRsvpLoadingEventId(eventId);
    try {
      await upsertCommunityRsvp({ eventId, status });
      setCommunitySuccessMessage(`Inscription enregistrée : ${toRsvpLabel(status)}.`);
      await reloadEvents();
    } catch (error) {
      const appError = isAppError(error)
        ? error
        : toAppError(error, {
            kind: "server",
          message: "Inscription impossible.",
          });
      if (appError.status === 401) {
        redirectAnonymousToCommunity();
        return;
      }
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

  const updateOpsDraft = useCallback((eventId: string, patch: Partial<OpsDraft>) => {
    setOpsDraftByEventId((previous) => ({
      ...previous,
      [eventId]: {
        attendanceCount: previous[eventId]?.attendanceCount ?? "",
        postMortem: previous[eventId]?.postMortem ?? "",
        ...patch,
      },
    }));
  }, []);

  const getOpsDraft = useCallback((event: CommunityEventItem): OpsDraft => {
    return opsDraftByEventId[event.id] ?? {
      attendanceCount: event.attendanceCount === null ? "" : String(event.attendanceCount),
      postMortem: event.postMortem ?? standardPostMortemTemplate(),
    };
  }, [opsDraftByEventId]);

  async function onSaveEventOps(event: CommunityEventItem): Promise<void> {
    if (!ensureAuthenticatedForMutation()) {
      return;
    }

    const draft = getOpsDraft(event);
    const attendanceCount = parseOptionalInt(draft.attendanceCount);
    if (draft.attendanceCount.trim() && (attendanceCount === null || attendanceCount < 0)) {
      setCommunityError(toAppError("La présence doit être un entier positif ou nul.", {
        kind: "validation",
        message: "La présence doit être un entier positif ou nul.",
      }));
      return;
    }

    setCommunityError(null);
    setCommunitySuccessMessage(null);
    setIsUpdatingEventOpsId(event.id);
    try {
      await updateCommunityEventOps({
        eventId: event.id,
        attendanceCount,
        postMortem: draft.postMortem.trim() || null,
      });
      setCommunitySuccessMessage("Suivi de la mission mis à jour.");
      await reloadEvents();
    } catch (error) {
      const appError = isAppError(error)
        ? error
        : toAppError(error, { kind: "server", message: "Mise à jour de la mission impossible." });
      if (appError.status === 401) {
        redirectAnonymousToCommunity();
        return;
      }
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

  return {
    createForm,
    updateCreateForm,
    isCreatingEvent,
    onCreateEvent,
    rsvpLoadingEventId,
    communitySuccessMessage,
    communityError,
    onRsvp,
    isUpdatingEventOpsId,
    getOpsDraft,
    updateOpsDraft,
    onSaveEventOps,
  };
}
