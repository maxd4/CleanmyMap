"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [identityState, setIdentityState] = useState<IdentityState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [recognition, setRecognition] = useState<SpogomiEventRecognition | null>(null);
  const [team, setTeam] = useState<SpogomiLinkedTeam | null>(null);

  const loadState = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setIsLoadingState(true);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-link`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as LinkResponse;
      if (!response.ok) throw new Error(payload.error ?? "L’état de la liaison n’a pas pu être chargé.");
      setIdentityState(payload.state ?? "identity_unlinked");
      setRecognition(payload.recognition ?? null);
      setTeam(payload.team ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "L’état de la liaison n’a pas pu être chargé.");
    } finally {
      setIsLoadingState(false);
    }
  }, [eventId, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      return;
    }
    const timer = window.setTimeout(() => { void loadState(); }, 0);
    return () => window.clearTimeout(timer);
  }, [isLoaded, isSignedIn, loadState]);

  async function submit() {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json().catch(() => ({}))) as LinkResponse;
      if (!response.ok) throw new Error(payload.error ?? "La liaison n’a pas pu être vérifiée.");
      setIdentityState(payload.state ?? "identity_verified");
      setRecognition(payload.recognition ?? null);
      setTeam(payload.team ?? null);
      setMessage("Compte lié. La demande de participation reste une étape séparée.");
      setCode("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "La liaison n’a pas pu être vérifiée.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function requestParticipation() {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json().catch(() => ({}))) as LinkResponse;
      if (!response.ok) throw new Error(payload.error ?? "La demande de participation n’a pas pu être envoyée.");
      setIdentityState(payload.state ?? "participation_unavailable");
      setRecognition(payload.recognition ?? null);
      setTeam(payload.team ?? null);
      setMessage(payload.state ? stateMessage(payload.state) : "La demande de participation a été traitée.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "La demande de participation n’a pas pu être envoyée.");
    } finally {
      setIsSubmitting(false);
    }
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
        </div>
      ) : (
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <label className="block text-sm font-bold text-slate-800" htmlFor="spogomi-identity-code">Code individuel</label>
          <input
            id="spogomi-identity-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="one-time-code"
            inputMode="text"
            placeholder="SPOGOMI-…"
            className="min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-slate-900 outline-none ring-emerald-500 focus:ring-2"
            maxLength={100}
          />
          <CmmButton type="submit" tone="primary" disabled={isSubmitting || code.trim().length < 16} loading={isSubmitting}>
            {isSubmitting ? "Vérification…" : "Relier le compte"}
          </CmmButton>
          {message ? <p role="status" className="text-sm font-semibold text-emerald-800">{message}</p> : null}
          {error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}
        </form>
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
