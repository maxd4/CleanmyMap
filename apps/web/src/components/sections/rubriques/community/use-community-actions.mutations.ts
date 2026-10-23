import { useCallback, useState } from "react";
import {
  updateCommunityEventOps,
  upsertCommunityRsvp,
  type CommunityEventItem,
  type CommunityRsvpStatus,
} from "@/lib/community/http";
import { AppError, defaultMessageForKind, isAppError, toAppError } from "@/lib/errors/app-errors";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { parseOptionalInt, toRsvpLabel } from "./helpers";
import { redirectToCommunitySignIn } from "./mutation-auth";
import type { OpsDraft } from "./types";

type CommunityActionMutationsProps = {
  isLoaded: boolean | undefined;
  isSignedIn: boolean | undefined;
  redirectToSignIn: () => void;
  reloadEvents: () => Promise<unknown>;
};

export function useCommunityActionMutations({ isLoaded, isSignedIn, redirectToSignIn, reloadEvents }: CommunityActionMutationsProps) {
  const [rsvpLoadingEventId, setRsvpLoadingEventId] = useState<string | null>(null);
  const [communitySuccessMessage, setCommunitySuccessMessage] = useState<string | null>(null);
  const [communityError, setCommunityError] = useState<AppError | null>(null);
  const [isUpdatingEventOpsId, setIsUpdatingEventOpsId] = useState<string | null>(null);
  const [opsDraftByEventId, setOpsDraftByEventId] = useState<Record<string, OpsDraft>>({});
  const redirectAnonymousToCommunity = useCallback(() => redirectToCommunitySignIn(redirectToSignIn), [redirectToSignIn]);
  const ensureAuthenticatedForMutation = useCallback(() => {
    if (isLoaded && isSignedIn) return true;
    redirectAnonymousToCommunity();
    return false;
  }, [isLoaded, isSignedIn, redirectAnonymousToCommunity]);

  async function onRsvp(eventId: string, status: CommunityRsvpStatus): Promise<void> {
    if (!ensureAuthenticatedForMutation()) return;
    setCommunityError(null);
    setCommunitySuccessMessage(null);
    setRsvpLoadingEventId(eventId);
    try {
      await upsertCommunityRsvp({ eventId, status });
      setCommunitySuccessMessage(`Inscription enregistrée : ${toRsvpLabel(status)}.`);
      await reloadEvents();
    } catch (error) {
      const appError = isAppError(error) ? error : toAppError(error, { kind: "server", message: "Inscription impossible." });
      if (appError.status === 401) {
        redirectAnonymousToCommunity();
        return;
      }
      if (appError.kind === "network") notifyNetworkToast({ message: appError.message || defaultMessageForKind("network"), onRetry: () => void onRsvp(eventId, status), onRefresh: () => window.location.reload() });
      setCommunityError(appError);
    } finally {
      setRsvpLoadingEventId(null);
    }
  }

  const updateOpsDraft = useCallback((event: CommunityEventItem, patch: Partial<OpsDraft>) => {
    setOpsDraftByEventId((previous) => ({ ...previous, [event.id]: { attendanceCount: previous[event.id]?.attendanceCount ?? (event.attendanceCount === null ? "" : String(event.attendanceCount)), postMortem: previous[event.id]?.postMortem ?? (event.postMortem ?? ""), ...patch } }));
  }, []);

  const getOpsDraft = useCallback((event: CommunityEventItem): OpsDraft => opsDraftByEventId[event.id] ?? { attendanceCount: event.attendanceCount === null ? "" : String(event.attendanceCount), postMortem: event.postMortem ?? "" }, [opsDraftByEventId]);

  async function onSaveEventOps(event: CommunityEventItem): Promise<void> {
    if (!ensureAuthenticatedForMutation()) return;
    const draft = getOpsDraft(event);
    const attendanceCount = parseOptionalInt(draft.attendanceCount);
    if (draft.attendanceCount.trim() && attendanceCount === null) {
      setCommunityError(toAppError("La présence doit être un entier compris entre 0 et 200000.", { kind: "validation", message: "La présence doit être un entier compris entre 0 et 200000." }));
      return;
    }
    setCommunityError(null);
    setCommunitySuccessMessage(null);
    setIsUpdatingEventOpsId(event.id);
    try {
      await updateCommunityEventOps({ eventId: event.id, attendanceCount, postMortem: draft.postMortem.trim() || null });
      setCommunitySuccessMessage("Suivi de la mission mis à jour.");
      try {
        await reloadEvents();
        setOpsDraftByEventId((previous) => {
          if (!(event.id in previous)) return previous;
          const next = { ...previous };
          delete next[event.id];
          return next;
        });
      } catch (refreshError) {
        const appError = isAppError(refreshError) ? refreshError : toAppError(refreshError, { kind: "server", message: "Actualisation des événements impossible." });
        setCommunitySuccessMessage("Suivi de la mission mis à jour. L’affichage n’a pas pu être actualisé.");
        notifyNetworkToast({ title: "Suivi enregistré", message: appError.message || "L’actualisation des événements a échoué.", retryLabel: "Réessayer l’actualisation", onRetry: () => { void reloadEvents().then(() => { setOpsDraftByEventId((previous) => { if (!(event.id in previous)) return previous; const next = { ...previous }; delete next[event.id]; return next; }); setCommunitySuccessMessage("Suivi de la mission mis à jour."); }).catch(() => undefined); } });
      }
    } catch (error) {
      const appError = isAppError(error) ? error : toAppError(error, { kind: "server", message: "Mise à jour de la mission impossible." });
      if (appError.status === 401) {
        redirectAnonymousToCommunity();
        return;
      }
      if (appError.kind === "network") notifyNetworkToast({ message: appError.message || defaultMessageForKind("network"), onRetry: () => void onSaveEventOps(event), onRefresh: () => window.location.reload() });
      setCommunityError(appError);
    } finally {
      setIsUpdatingEventOpsId(null);
    }
  }

  return { rsvpLoadingEventId, communitySuccessMessage, communityError, onRsvp, isUpdatingEventOpsId, getOpsDraft, updateOpsDraft, onSaveEventOps };
}
