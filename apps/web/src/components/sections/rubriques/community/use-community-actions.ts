import { useCallback, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import {
  createCommunityEvent,
  upsertCommunityRsvp,
  type CommunityRsvpStatus,
} from "@/lib/community/http";
import { AppError, defaultMessageForKind, isAppError, toAppError } from "@/lib/errors/app-errors";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { isValidCommunityEventCoordinatePair } from "@/lib/community/event-location";
import { parseOptionalInt, toRsvpLabel } from "./helpers";
import { redirectToCommunitySignIn } from "./mutation-auth";
import type { CreateCommunityEventForm } from "./types";

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
      setCommunitySuccessMessage("Evenement cree et partage avec la communaute.");
      await reloadEvents();
    } catch (error) {
      const appError = isAppError(error)
        ? error
        : toAppError(error, {
            kind: "server",
          message: "Creation evenement impossible.",
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
      setCommunitySuccessMessage(`RSVP enregistre: ${toRsvpLabel(status)}.`);
      await reloadEvents();
    } catch (error) {
      const appError = isAppError(error)
        ? error
        : toAppError(error, {
            kind: "server",
          message: "RSVP impossible.",
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

  return {
    createForm,
    updateCreateForm,
    isCreatingEvent,
    onCreateEvent,
    rsvpLoadingEventId,
    communitySuccessMessage,
    communityError,
    onRsvp,
  };
}
