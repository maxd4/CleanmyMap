import { useCallback, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import {
  updateCommunityEventOps,
  upsertCommunityRsvp,
  type CommunityRsvpStatus,
  type CommunityEventItem,
} from "@/lib/community/http";
import { AppError, defaultMessageForKind, isAppError, toAppError } from "@/lib/errors/app-errors";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { standardPostMortemTemplate } from "@/lib/community/event-ops";
import { parseOptionalInt, toRsvpLabel } from "./helpers";
import { redirectToCommunitySignIn } from "./mutation-auth";
import type { OpsDraft } from "./types";

export function useCommunityActions(reloadEvents: () => Promise<unknown>) {
  const { isLoaded, isSignedIn } = useAuth();
  const { redirectToSignIn } = useClerk();
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
