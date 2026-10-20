"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Link2, Users } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { getSpogomiBadgePresentation } from "@/lib/spogomi/collection";
import type { SpogomiLinkedTeam } from "@/lib/spogomi/identity-link-contract";

type Props = { eventId: string; signInHref: string };

type LinkResponse = {
  error?: string;
  linkStatus?: "linked" | "already_linked";
  attendanceStatus?: "unknown" | "present" | "absent";
  state?: IdentityState;
  participation?: { status: string; store: string | null };
  recognition?: SpogomiEventRecognition | null;
  team?: SpogomiLinkedTeam | null;
  assistance?: SpogomiAssistanceRequest | null;
  request?: SpogomiAssistanceRequest | null;
};

type SpogomiAssistanceRequest = {
  id: string;
  status: "pending" | "treated" | "rejected" | "cancelled";
  providedContext: string;
  createdAt: string;
};

type SpogomiEventRecognition = {
  status: "pending_certification" | "available" | "no_awards";
  awards: Array<{ id: string; badgeTypeId: string; eventYear: number; eventLocalDate: string; status: "active" | "revoked" | "replaced" }>;
};

type IdentityState =
  | "identity_unlinked"
  | "identity_verified"
  | "participation_unavailable"
  | "participation_pending"
  | "participation_confirmed"
  | "participation_cancelled";

type EventScopedState = {
  eventId: string;
  identityState: IdentityState | null;
  recognition: SpogomiEventRecognition | null;
  team: SpogomiLinkedTeam | null;
  assistanceRequest: SpogomiAssistanceRequest | null;
  message: string | null;
  error: string | null;
  isSubmitting: boolean;
  isLoadingState: boolean;
  code: string;
  assistanceMode: boolean;
  assistanceContext: string;
};

function emptyEventScopedState(eventId: string): EventScopedState {
  return {
    eventId,
    identityState: null,
    recognition: null,
    team: null,
    assistanceRequest: null,
    message: null,
    error: null,
    isSubmitting: false,
    isLoadingState: false,
    code: "",
    assistanceMode: false,
    assistanceContext: "",
  };
}

function stateMessage(state: IdentityState): string {
  switch (state) {
    case "identity_verified":
      return "Identité vérifiée. Votre liaison ne confirme pas votre présence ; vous pouvez maintenant demander votre participation CleanMyMap.";
    case "participation_unavailable":
      return "La participation CleanMyMap n’est pas disponible pour cette action ou cette phase.";
    case "participation_pending":
      return "Votre demande de participation CleanMyMap est en attente de validation par l’organisateur habilité.";
    case "participation_confirmed":
      return "Votre participation CleanMyMap est confirmée ; les mécanismes habituels du site s’appliquent.";
    case "participation_cancelled":
      return "Cette demande de participation a été refusée ou annulée. Elle n’est pas réactivée automatiquement.";
    default:
      return "Utilisez le code individuel remis par l’organisateur pour vérifier votre identité SPOGOMI.";
  }
}

function attendanceLabel(status: SpogomiLinkedTeam["attendanceStatus"]): string {
  if (status === "present") return "Présence attestée";
  if (status === "absent") return "Absence attestée";
  return "Présence non renseignée";
}

function participationLabel(status: SpogomiLinkedTeam["participationStatus"]): string {
  if (status === "pending") return "Demande en attente";
  if (status === "confirmed") return "Participation confirmée";
  if (status === "cancelled") return "Demande refusée ou annulée";
  if (status === "unavailable") return "Demande indisponible";
  return "Aucune demande envoyée";
}

export function SpogomiIdentityLinkCard({ eventId, signInHref }: Props) {
  const { isLoaded, isSignedIn } = useAuth();
  const [eventStates, setEventStates] = useState<Record<string, EventScopedState>>({});
  const stateRequestId = useRef(0);
  const currentEventState = eventStates[eventId] ?? emptyEventScopedState(eventId);
  const { identityState, recognition, team, assistanceRequest, message, error, isSubmitting, isLoadingState, code, assistanceMode, assistanceContext } = currentEventState;

  function updateEventState(targetEventId: string, update: Partial<Omit<EventScopedState, "eventId">>) {
    setEventStates((states) => {
      const current = states[targetEventId] ?? emptyEventScopedState(targetEventId);
      return { ...states, [targetEventId]: { ...current, ...update } };
    });
  }

  const loadState = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    const requestId = ++stateRequestId.current;
    updateEventState(eventId, { isLoadingState: true });
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-link`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as LinkResponse;
      if (!response.ok) throw new Error(payload.error ?? "L’état de la liaison n’a pas pu être chargé.");
      if (requestId !== stateRequestId.current) return;
      updateEventState(eventId, {
        identityState: payload.state ?? "identity_unlinked",
        recognition: payload.recognition ?? null,
        team: payload.team ?? null,
        assistanceRequest: payload.assistance ?? null,
      });
    } catch (loadError) {
      if (requestId !== stateRequestId.current) return;
      updateEventState(eventId, { error: loadError instanceof Error ? loadError.message : "L’état de la liaison n’a pas pu être chargé." });
    } finally {
      if (requestId === stateRequestId.current) updateEventState(eventId, { isLoadingState: false });
    }
  }, [eventId, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      return;
    }
    const timer = window.setTimeout(() => { void loadState(); }, 0);
    return () => {
      window.clearTimeout(timer);
      stateRequestId.current += 1;
    };
  }, [isLoaded, isSignedIn, loadState]);

  async function submit() {
    const requestId = ++stateRequestId.current;
    updateEventState(eventId, { isSubmitting: true, error: null, message: null });
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json().catch(() => ({}))) as LinkResponse;
      if (!response.ok) throw new Error(payload.error ?? "La liaison n’a pas pu être vérifiée.");
      if (requestId !== stateRequestId.current) return;
      updateEventState(eventId, {
        identityState: payload.state ?? "identity_verified",
        recognition: payload.recognition ?? null,
        team: payload.team ?? null,
        message: "Compte lié. La demande de participation reste une étape séparée.",
        code: "",
      });
    } catch (submitError) {
      if (requestId === stateRequestId.current) updateEventState(eventId, { error: submitError instanceof Error ? submitError.message : "La liaison n’a pas pu être vérifiée." });
    } finally {
      if (requestId === stateRequestId.current) updateEventState(eventId, { isSubmitting: false });
    }
  }

  async function requestParticipation() {
    const requestId = ++stateRequestId.current;
    updateEventState(eventId, { isSubmitting: true, error: null, message: null });
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json().catch(() => ({}))) as LinkResponse;
      if (!response.ok) throw new Error(payload.error ?? "La demande de participation n’a pas pu être envoyée.");
      if (requestId !== stateRequestId.current) return;
      updateEventState(eventId, {
        identityState: payload.state ?? "participation_unavailable",
        recognition: payload.recognition ?? null,
        team: payload.team ?? null,
        message: payload.state ? stateMessage(payload.state) : "La demande de participation a été traitée.",
      });
    } catch (requestError) {
      if (requestId === stateRequestId.current) updateEventState(eventId, { error: requestError instanceof Error ? requestError.message : "La demande de participation n’a pas pu être envoyée." });
    } finally {
      if (requestId === stateRequestId.current) updateEventState(eventId, { isSubmitting: false });
    }
  }

  async function submitAssistance() {
    const requestId = ++stateRequestId.current;
    updateEventState(eventId, { isSubmitting: true, error: null, message: null });
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assistance: true, context: assistanceContext }),
      });
      const payload = (await response.json().catch(() => ({}))) as LinkResponse;
      if (!response.ok) throw new Error(payload.error ?? "La demande d’assistance n’a pas pu être envoyée.");
      if (requestId !== stateRequestId.current) return;
      updateEventState(eventId, {
        assistanceRequest: payload.assistance ?? null,
        assistanceMode: false,
        assistanceContext: "",
        message: "Demande transmise. L’organisateur doit vérifier votre situation avant de remettre un nouveau code.",
      });
    } catch (submitError) {
      if (requestId === stateRequestId.current) updateEventState(eventId, { error: submitError instanceof Error ? submitError.message : "La demande d’assistance n’a pas pu être envoyée." });
    } finally {
      if (requestId === stateRequestId.current) updateEventState(eventId, { isSubmitting: false });
    }
  }

  async function cancelAssistance() {
    const requestId = ++stateRequestId.current;
    updateEventState(eventId, { isSubmitting: true, error: null });
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-assistance`, { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as LinkResponse;
      if (!response.ok) throw new Error(payload.error ?? "La demande n’a pas pu être annulée.");
      if (requestId !== stateRequestId.current) return;
      updateEventState(eventId, { assistanceRequest: payload.request ?? null, message: "Demande annulée." });
    } catch (cancelError) {
      if (requestId === stateRequestId.current) updateEventState(eventId, { error: cancelError instanceof Error ? cancelError.message : "La demande n’a pas pu être annulée." });
    } finally {
      if (requestId === stateRequestId.current) updateEventState(eventId, { isSubmitting: false });
    }
  }

  function assistanceStatusLabel(status: SpogomiAssistanceRequest["status"]): string {
    if (status === "treated") return "Demande traitée : attendez la remise directe du code.";
    if (status === "rejected") return "Demande refusée par l’organisateur.";
    if (status === "cancelled") return "Demande annulée.";
    return "Demande en attente de vérification par l’organisateur.";
  }

  return (
    <CmmCard tone="emerald" variant="glass" className="space-y-3 p-5">
      <div className="flex items-start gap-3">
        <Link2 className="mt-1 text-emerald-700" size={20} aria-hidden="true" />
        <div>
          <h2 className="text-xl font-black text-emerald-950">J’ai participé à cet événement</h2>
          <p className="cmm-text-body mt-1 text-slate-900">
            Créez ou ouvrez votre compte, puis utilisez le code individuel remis par l’organisateur pour retrouver votre participation historique. Le code ne révèle pas le roster et ne confirme pas à lui seul votre présence.
          </p>
        </div>
      </div>
      {!isLoaded ? <p className="text-sm text-slate-600">Vérification de la session…</p> : !isSignedIn ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-700">Connectez-vous avec Clerk pour saisir votre code.</p>
          <CmmButton href={signInHref} tone="primary">Se connecter</CmmButton>
          <p className="text-sm text-slate-700">Je n’ai pas de code ? Connectez-vous puis demandez une assistance à l’organisateur.</p>
        </div>
      ) : isLoadingState && !identityState ? (
        <p className="text-sm text-slate-600">Vérification de votre liaison…</p>
      ) : identityState && identityState !== "identity_unlinked" ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-800">{stateMessage(identityState)}</p>
          {identityState === "identity_verified" ? (
            <CmmButton type="button" tone="primary" disabled={isSubmitting} loading={isSubmitting} onClick={() => void requestParticipation()}>
              {isSubmitting ? "Demande en cours…" : "Demander ma participation"}
            </CmmButton>
          ) : null}
          {identityState === "participation_unavailable" ? <CmmButton type="button" tone="secondary" disabled={isSubmitting} onClick={() => void loadState()}>Vérifier à nouveau</CmmButton> : null}
          {message ? <p role="status" className="text-sm font-semibold text-emerald-800">{message}</p> : null}
          {error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}
        </div>
      ) : (
        <div className="space-y-3">
          {assistanceRequest ? (
            <div className="space-y-2 rounded-xl border border-emerald-200 bg-white/75 p-3">
              <p className="text-sm font-bold text-emerald-900">{assistanceStatusLabel(assistanceRequest.status)}</p>
              {assistanceRequest.status === "pending" ? <CmmButton type="button" size="sm" tone="secondary" disabled={isSubmitting} onClick={() => void cancelAssistance()}>Annuler la demande</CmmButton> : null}
              {message ? <p role="status" className="text-sm font-semibold text-emerald-800">{message}</p> : null}
              {error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}
            </div>
          ) : null}
          {!assistanceRequest || assistanceRequest.status === "cancelled" || assistanceRequest.status === "rejected" ? (
            assistanceMode ? (
              <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void submitAssistance(); }}>
                <p className="text-sm text-slate-700">L’organisateur recherchera votre entrée dans le roster et vérifiera votre situation par un moyen indépendant. Un nom, une adresse électronique ou un billet ne suffit jamais à valider une identité.</p>
                <label className="block text-sm font-bold text-slate-800" htmlFor="spogomi-identity-assistance-context">Élément utile à la recherche <span className="font-normal text-slate-500">(facultatif)</span></label>
                <textarea id="spogomi-identity-assistance-context" value={assistanceContext} onChange={(event) => updateEventState(eventId, { assistanceContext: event.target.value })} maxLength={1200} rows={4} placeholder="Expliquez brièvement comment l’organisateur peut vous recontacter ou vérifier votre participation. Ne saisissez pas de code secret." className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500 focus:ring-2" />
                <div className="flex flex-wrap gap-2"><CmmButton type="submit" tone="primary" disabled={isSubmitting} loading={isSubmitting}>{isSubmitting ? "Transmission…" : "Envoyer la demande"}</CmmButton><CmmButton type="button" tone="secondary" disabled={isSubmitting} onClick={() => updateEventState(eventId, { assistanceMode: false })}>J’ai retrouvé mon code</CmmButton></div>
                {message ? <p role="status" className="text-sm font-semibold text-emerald-800">{message}</p> : null}
                {error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}
              </form>
            ) : (
              <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
                <label className="block text-sm font-bold text-slate-800" htmlFor="spogomi-identity-code">Code individuel</label>
                <input id="spogomi-identity-code" value={code} onChange={(event) => updateEventState(eventId, { code: event.target.value })} autoComplete="one-time-code" inputMode="text" placeholder="SPOGOMI-…" className="min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-slate-900 outline-none ring-emerald-500 focus:ring-2" maxLength={100} />
                <div className="flex flex-wrap gap-2"><CmmButton type="submit" tone="primary" disabled={isSubmitting || code.trim().length < 16} loading={isSubmitting}>{isSubmitting ? "Vérification…" : "Relier le compte"}</CmmButton><CmmButton type="button" tone="secondary" disabled={isSubmitting} onClick={() => updateEventState(eventId, { assistanceMode: true })}>Je n’ai pas de code</CmmButton></div>
                {message ? <p role="status" className="text-sm font-semibold text-emerald-800">{message}</p> : null}
                {error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}
              </form>
            )
          ) : null}
        </div>
      )}
      {identityState && identityState !== "identity_unlinked" ? (
        <section className="border-t border-emerald-200/40 pt-4" aria-labelledby="spogomi-linked-team-title">
          <div className="flex items-start gap-3">
            <Users className="mt-1 text-emerald-700" size={18} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 id="spogomi-linked-team-title" className="font-black text-emerald-950">Mon équipe SPOGOMI</h3>
              {team ? (
                <div className="mt-2 space-y-1 text-sm text-slate-800">
                  <p className="font-bold">{team.publicName} · Équipe {team.teamNumber}</p>
                  {team.divisionType ? <p>{team.divisionType === "world_cup" ? "Division World Cup" : "Division Casual"}</p> : null}
                  <p>{attendanceLabel(team.attendanceStatus)} · {participationLabel(team.participationStatus)}</p>
                  {team.publishedResults ? (
                    <div className="mt-3 space-y-1 rounded-xl border border-emerald-100 bg-white/75 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-emerald-800">Résultats publiés</p>
                      {team.publishedResults.sport ? <p>Classement sportif : {team.publishedResults.sport.rank ? `#${team.publishedResults.sport.rank}` : "rang non publié"}{team.publishedResults.sport.score !== null ? ` · ${team.publishedResults.sport.score} points` : ""} · {team.publishedResults.sport.status === "certified" ? "certifié" : "provisoire"}</p> : null}
                      {team.publishedResults.butts ? <p>Classement mégots/participant : {team.publishedResults.butts.rank ? `#${team.publishedResults.butts.rank}` : "rang non publié"}{team.publishedResults.butts.ratio !== null ? ` · ${team.publishedResults.butts.ratio}` : ""} · {team.publishedResults.butts.status === "certified" ? "certifié" : "provisoire"}</p> : null}
                    </div>
                  ) : <p className="mt-2 text-sm text-slate-600">Aucun résultat publié pour votre équipe.</p>}
                </div>
              ) : <p className="mt-2 text-sm text-slate-700">Équipe non renseignée.</p>}
            </div>
          </div>
        </section>
      ) : null}
      {identityState && identityState !== "identity_unlinked" && recognition ? (
        <div className="border-t border-emerald-200/40 pt-4" aria-live="polite">
          <h3 className="font-black text-emerald-950">Mes distinctions pour cette compétition</h3>
          {recognition.status === "pending_certification" ? <p className="mt-2 text-sm text-slate-700">Votre liaison est enregistrée. Les badges apparaîtront après certification de l’événement et réconciliation des preuves.</p> : recognition.status === "no_awards" ? <p className="mt-2 text-sm text-slate-700">Aucune distinction certifiée n’est actuellement attribuée pour cette compétition.</p> : <ul className="mt-3 space-y-2">{recognition.awards.map((award) => { const presentation = getSpogomiBadgePresentation(award.badgeTypeId); return <li key={award.id} className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-sm font-bold text-slate-900"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" aria-hidden="true" />{presentation.label}<span className="ml-auto text-xs font-semibold text-slate-500">{presentation.roleOrRank}</span></li>; })}</ul>}
          <Link href="/sections/gamification#spogomi-collection" className="mt-3 inline-flex min-h-11 items-center text-sm font-black text-emerald-800 underline underline-offset-2">Ouvrir ma collection SPOGOMI</Link>
        </div>
      ) : null}
      <p className="text-xs text-slate-600">Une personne sans compte CleanMyMap reste comptée dans le bilan environnemental de l’action, mais ne reçoit pas de crédit personnel.</p>
      <Link href="/politique-confidentialite" className="text-xs font-bold text-emerald-800 underline underline-offset-2">En savoir plus sur la confidentialité</Link>
    </CmmCard>
  );
}
