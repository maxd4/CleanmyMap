"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpogomiLinkedTeam } from "@/lib/spogomi/identity-link-contract";
import { stateMessage, type IdentityState, type SpogomiAssistanceRequest, type SpogomiEventRecognition } from "./spogomi-identity-link-card-view";

type LinkResponse = { error?: string; state?: IdentityState; recognition?: SpogomiEventRecognition | null; team?: SpogomiLinkedTeam | null; assistance?: SpogomiAssistanceRequest | null; request?: SpogomiAssistanceRequest | null };
type EventScopedState = { eventId: string; identityState: IdentityState | null; recognition: SpogomiEventRecognition | null; team: SpogomiLinkedTeam | null; assistanceRequest: SpogomiAssistanceRequest | null; message: string | null; error: string | null; isSubmitting: boolean; isLoadingState: boolean; code: string; assistanceMode: boolean; assistanceContext: string };
type Props = { eventId: string; isLoaded: boolean; isSignedIn: boolean | undefined };

function emptyEventScopedState(eventId: string): EventScopedState {
  return { eventId, identityState: null, recognition: null, team: null, assistanceRequest: null, message: null, error: null, isSubmitting: false, isLoadingState: false, code: "", assistanceMode: false, assistanceContext: "" };
}

export function useSpogomiIdentityLinkActions({ eventId, isLoaded, isSignedIn }: Props) {
  const [eventStates, setEventStates] = useState<Record<string, EventScopedState>>({});
  const stateRequestId = useRef(0);
  const current = eventStates[eventId] ?? emptyEventScopedState(eventId);
  const updateEventState = useCallback((targetEventId: string, update: Partial<Omit<EventScopedState, "eventId">>) => {
    setEventStates((states) => { const state = states[targetEventId] ?? emptyEventScopedState(targetEventId); return { ...states, [targetEventId]: { ...state, ...update } }; });
  }, []);
  const loadState = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    const requestId = ++stateRequestId.current;
    updateEventState(eventId, { isLoadingState: true });
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-link`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as LinkResponse;
      if (!response.ok) throw new Error(payload.error ?? "L’état de la liaison n’a pas pu être chargé.");
      if (requestId !== stateRequestId.current) return;
      updateEventState(eventId, { identityState: payload.state ?? "identity_unlinked", recognition: payload.recognition ?? null, team: payload.team ?? null, assistanceRequest: payload.assistance ?? null });
    } catch (reason) {
      if (requestId === stateRequestId.current) updateEventState(eventId, { error: reason instanceof Error ? reason.message : "L’état de la liaison n’a pas pu être chargé." });
    } finally {
      if (requestId === stateRequestId.current) updateEventState(eventId, { isLoadingState: false });
    }
  }, [eventId, isLoaded, isSignedIn, updateEventState]);
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const timer = window.setTimeout(() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ loadState().catch(() => undefined); }, 0);
    return () => { window.clearTimeout(timer); stateRequestId.current += 1; };
  }, [isLoaded, isSignedIn, loadState]);
  const submitRequest = useCallback(async (body: Record<string, unknown>, fallback: string, update: (payload: LinkResponse) => Partial<Omit<EventScopedState, "eventId">>) => {
    const requestId = ++stateRequestId.current;
    updateEventState(eventId, { isSubmitting: true, error: null, message: null });
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = (await response.json().catch(() => ({}))) as LinkResponse;
      if (!response.ok) throw new Error(payload.error ?? fallback);
      if (requestId !== stateRequestId.current) return;
      updateEventState(eventId, update(payload));
    } catch (reason) {
      if (requestId === stateRequestId.current) updateEventState(eventId, { error: reason instanceof Error ? reason.message : fallback });
    } finally {
      if (requestId === stateRequestId.current) updateEventState(eventId, { isSubmitting: false });
    }
  }, [eventId, updateEventState]);
  const submit = useCallback(() => submitRequest({ code: current.code }, "La liaison n’a pas pu être vérifiée.", (payload) => ({ identityState: payload.state ?? "identity_verified", recognition: payload.recognition ?? null, team: payload.team ?? null, message: "Compte lié. La demande de participation reste une étape séparée.", code: "" })), [current.code, submitRequest]);
  const requestParticipation = useCallback(() => submitRequest({}, "La demande de participation n’a pas pu être envoyée.", (payload) => ({ identityState: payload.state ?? "participation_unavailable", recognition: payload.recognition ?? null, team: payload.team ?? null, message: payload.state ? stateMessage(payload.state) : "La demande de participation a été traitée." })), [submitRequest]);
  const submitAssistance = useCallback(() => submitRequest({ assistance: true, context: current.assistanceContext }, "La demande d’assistance n’a pas pu être envoyée.", (payload) => ({ assistanceRequest: payload.assistance ?? null, assistanceMode: false, assistanceContext: "", message: "Demande transmise. L’organisateur doit vérifier votre situation avant de remettre un nouveau code." })), [current.assistanceContext, submitRequest]);
  const cancelAssistance = useCallback(async () => {
    const requestId = ++stateRequestId.current;
    updateEventState(eventId, { isSubmitting: true, error: null });
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-assistance`, { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as LinkResponse;
      if (!response.ok) throw new Error(payload.error ?? "La demande n’a pas pu être annulée.");
      if (requestId !== stateRequestId.current) return;
      updateEventState(eventId, { assistanceRequest: payload.request ?? null, message: "Demande annulée." });
    } catch (reason) {
      if (requestId === stateRequestId.current) updateEventState(eventId, { error: reason instanceof Error ? reason.message : "La demande n’a pas pu être annulée." });
    } finally {
      if (requestId === stateRequestId.current) updateEventState(eventId, { isSubmitting: false });
    }
  }, [eventId, updateEventState]);
  return { ...current, loadState, submit, requestParticipation, submitAssistance, cancelAssistance, updateEventState };
}
