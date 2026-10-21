"use client";

import Link from "next/link";
import { Link2, Users } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { getSpogomiBadgePresentation } from "@/lib/spogomi/collection";
import type { SpogomiLinkedTeam } from "@/lib/spogomi/identity-link-contract";

export type SpogomiAssistanceRequest = {
  id: string;
  status: "pending" | "treated" | "rejected" | "cancelled";
  providedContext: string;
  createdAt: string;
};

export type SpogomiEventRecognition = {
  status: "pending_certification" | "available" | "no_awards";
  awards: Array<{ id: string; badgeTypeId: string; eventYear: number; eventLocalDate: string; status: "active" | "revoked" | "replaced" }>;
};

export type IdentityState =
  | "identity_unlinked"
  | "identity_verified"
  | "participation_unavailable"
  | "participation_pending"
  | "participation_confirmed"
  | "participation_cancelled";

type Props = {
  signInHref: string;
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  isLoadingState: boolean;
  identityState: IdentityState | null;
  recognition: SpogomiEventRecognition | null;
  team: SpogomiLinkedTeam | null;
  assistanceRequest: SpogomiAssistanceRequest | null;
  message: string | null;
  error: string | null;
  isSubmitting: boolean;
  code: string;
  assistanceMode: boolean;
  assistanceContext: string;
  onLoadState: () => void;
  onSubmit: () => void;
  onRequestParticipation: () => void;
  onSubmitAssistance: () => void;
  onCancelAssistance: () => void;
  onCodeChange: (value: string) => void;
  onAssistanceModeChange: (value: boolean) => void;
  onAssistanceContextChange: (value: string) => void;
};

export function stateMessage(state: IdentityState): string {
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

function assistanceStatusLabel(status: SpogomiAssistanceRequest["status"]): string {
  if (status === "treated") return "Demande traitée : attendez la remise directe du code.";
  if (status === "rejected") return "Demande refusée par l’organisateur.";
  if (status === "cancelled") return "Demande annulée.";
  return "Demande en attente de vérification par l’organisateur.";
}

function Feedback({ message, error }: Pick<Props, "message" | "error">) {
  return <>{message ? <p role="status" className="text-sm font-semibold text-emerald-800">{message}</p> : null}{error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}</>;
}

function IdentityForms({
  assistanceMode,
  assistanceContext,
  code,
  isSubmitting,
  message,
  error,
  onSubmit,
  onSubmitAssistance,
  onCodeChange,
  onAssistanceModeChange,
  onAssistanceContextChange,
}: Pick<Props, "assistanceMode" | "assistanceContext" | "code" | "isSubmitting" | "message" | "error" | "onSubmit" | "onSubmitAssistance" | "onCodeChange" | "onAssistanceModeChange" | "onAssistanceContextChange">) {
  if (assistanceMode) {
    return <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); onSubmitAssistance(); }}>
      <p className="text-sm text-slate-700">L’organisateur recherchera votre entrée dans le roster et vérifiera votre situation par un moyen indépendant. Un nom, une adresse électronique ou un billet ne suffit jamais à valider une identité.</p>
      <label className="block text-sm font-bold text-slate-800" htmlFor="spogomi-identity-assistance-context">Élément utile à la recherche <span className="font-normal text-slate-500">(facultatif)</span></label>
      <textarea id="spogomi-identity-assistance-context" value={assistanceContext} onChange={(event) => onAssistanceContextChange(event.target.value)} maxLength={1200} rows={4} placeholder="Expliquez brièvement comment l’organisateur peut vous recontacter ou vérifier votre participation. Ne saisissez pas de code secret." className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500 focus:ring-2" />
      <div className="flex flex-wrap gap-2"><CmmButton type="submit" tone="primary" disabled={isSubmitting} loading={isSubmitting}>{isSubmitting ? "Transmission…" : "Envoyer la demande"}</CmmButton><CmmButton type="button" tone="secondary" disabled={isSubmitting} onClick={() => onAssistanceModeChange(false)}>J’ai retrouvé mon code</CmmButton></div>
      <Feedback message={message} error={error} />
    </form>;
  }

  return <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <label className="block text-sm font-bold text-slate-800" htmlFor="spogomi-identity-code">Code individuel</label>
    <input id="spogomi-identity-code" value={code} onChange={(event) => onCodeChange(event.target.value)} autoComplete="one-time-code" inputMode="text" placeholder="SPOGOMI-…" className="min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-slate-900 outline-none ring-emerald-500 focus:ring-2" maxLength={100} />
    <div className="flex flex-wrap gap-2"><CmmButton type="submit" tone="primary" disabled={isSubmitting || code.trim().length < 16} loading={isSubmitting}>{isSubmitting ? "Vérification…" : "Relier le compte"}</CmmButton><CmmButton type="button" tone="secondary" disabled={isSubmitting} onClick={() => onAssistanceModeChange(true)}>Je n’ai pas de code</CmmButton></div>
    <Feedback message={message} error={error} />
  </form>;
}

function IdentityStatePanel({ identityState, isSubmitting, message, error, onLoadState, onRequestParticipation }: Pick<Props, "identityState" | "isSubmitting" | "message" | "error" | "onLoadState" | "onRequestParticipation">) {
  return <div className="space-y-3">
    <p className="text-sm font-semibold text-slate-800">{stateMessage(identityState!)}</p>
    {identityState === "identity_verified" ? <CmmButton type="button" tone="primary" disabled={isSubmitting} loading={isSubmitting} onClick={onRequestParticipation}>{isSubmitting ? "Demande en cours…" : "Demander ma participation"}</CmmButton> : null}
    {identityState === "participation_unavailable" ? <CmmButton type="button" tone="secondary" disabled={isSubmitting} onClick={onLoadState}>Vérifier à nouveau</CmmButton> : null}
    <Feedback message={message} error={error} />
  </div>;
}

function AssistancePanel({ assistanceRequest, isSubmitting, message, error, onCancelAssistance }: Pick<Props, "assistanceRequest" | "isSubmitting" | "message" | "error" | "onCancelAssistance">) {
  if (!assistanceRequest) return null;
  return <div className="space-y-2 rounded-xl border border-emerald-200 bg-white/75 p-3">
    <p className="text-sm font-bold text-emerald-900">{assistanceStatusLabel(assistanceRequest.status)}</p>
    {assistanceRequest.status === "pending" ? <CmmButton type="button" size="sm" tone="secondary" disabled={isSubmitting} onClick={onCancelAssistance}>Annuler la demande</CmmButton> : null}
    <Feedback message={message} error={error} />
  </div>;
}

function LinkedTeam({ team }: Pick<Props, "team">) {
  return <section className="border-t border-emerald-200/40 pt-4" aria-labelledby="spogomi-linked-team-title">
    <div className="flex items-start gap-3"><Users className="mt-1 text-emerald-700" size={18} aria-hidden="true" /><div className="min-w-0 flex-1"><h3 id="spogomi-linked-team-title" className="font-black text-emerald-950">Mon équipe SPOGOMI</h3>
      {team ? <div className="mt-2 space-y-1 text-sm text-slate-800"><p className="font-bold">{team.publicName} · Équipe {team.teamNumber}</p>{team.divisionType ? <p>{team.divisionType === "world_cup" ? "Division World Cup" : "Division Casual"}</p> : null}<p>{attendanceLabel(team.attendanceStatus)} · {participationLabel(team.participationStatus)}</p>{team.publishedResults ? <div className="mt-3 space-y-1 rounded-xl border border-emerald-100 bg-white/75 p-3"><p className="text-xs font-black uppercase tracking-wide text-emerald-800">Résultats publiés</p>{team.publishedResults.sport ? <p>Classement sportif : {team.publishedResults.sport.rank ? `#${team.publishedResults.sport.rank}` : "rang non publié"}{team.publishedResults.sport.score !== null ? ` · ${team.publishedResults.sport.score} points` : ""} · {team.publishedResults.sport.status === "certified" ? "certifié" : "provisoire"}</p> : null}{team.publishedResults.butts ? <p>Classement mégots/participant : {team.publishedResults.butts.rank ? `#${team.publishedResults.butts.rank}` : "rang non publié"}{team.publishedResults.butts.ratio !== null ? ` · ${team.publishedResults.butts.ratio}` : ""} · {team.publishedResults.butts.status === "certified" ? "certifié" : "provisoire"}</p> : null}</div> : <p className="mt-2 text-sm text-slate-600">Aucun résultat publié pour votre équipe.</p>}</div> : <p className="mt-2 text-sm text-slate-700">Équipe non renseignée.</p>}
    </div></div>
  </section>;
}

function Recognition({ recognition }: Pick<Props, "recognition">) {
  if (!recognition) return null;
  return <div className="border-t border-emerald-200/40 pt-4" aria-live="polite"><h3 className="font-black text-emerald-950">Mes distinctions pour cette compétition</h3>{recognition.status === "pending_certification" ? <p className="mt-2 text-sm text-slate-700">Votre liaison est enregistrée. Les badges apparaîtront après certification de l’événement et réconciliation des preuves.</p> : recognition.status === "no_awards" ? <p className="mt-2 text-sm text-slate-700">Aucune distinction certifiée n’est actuellement attribuée pour cette compétition.</p> : <ul className="mt-3 space-y-2">{recognition.awards.map((award) => { const presentation = getSpogomiBadgePresentation(award.badgeTypeId); return <li key={award.id} className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-sm font-bold text-slate-900"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" aria-hidden="true" />{presentation.label}<span className="ml-auto text-xs font-semibold text-slate-500">{presentation.roleOrRank}</span></li>; })}</ul>}<Link href="/sections/gamification#spogomi-collection" className="mt-3 inline-flex min-h-11 items-center text-sm font-black text-emerald-800 underline underline-offset-2">Ouvrir ma collection SPOGOMI</Link></div>;
}

function IdentityIntro() {
  return <div className="flex items-start gap-3">
    <Link2 className="mt-1 text-emerald-700" size={20} aria-hidden="true" />
    <div>
      <h2 className="text-xl font-black text-emerald-950">J’ai participé à cet événement</h2>
      <p className="cmm-text-body mt-1 text-slate-950">Créez ou ouvrez votre compte, puis utilisez le code individuel remis par l’organisateur pour retrouver votre participation historique. Le code ne révèle pas le roster et ne confirme pas à lui seul votre présence.</p>
    </div>
  </div>;
}

export function SpogomiIdentityLinkCardView({ signInHref, isLoaded, isSignedIn, isLoadingState, identityState, recognition, team, assistanceRequest, message, error, isSubmitting, code, assistanceMode, assistanceContext, onLoadState, onSubmit, onRequestParticipation, onSubmitAssistance, onCancelAssistance, onCodeChange, onAssistanceModeChange, onAssistanceContextChange }: Props) {
  const authenticatedContent = identityState && identityState !== "identity_unlinked" ? <IdentityStatePanel identityState={identityState} isSubmitting={isSubmitting} message={message} error={error} onLoadState={onLoadState} onRequestParticipation={onRequestParticipation} /> : <div className="space-y-3"><AssistancePanel assistanceRequest={assistanceRequest} isSubmitting={isSubmitting} message={message} error={error} onCancelAssistance={onCancelAssistance} />{!assistanceRequest || assistanceRequest.status === "cancelled" || assistanceRequest.status === "rejected" ? <IdentityForms assistanceMode={assistanceMode} assistanceContext={assistanceContext} code={code} isSubmitting={isSubmitting} message={message} error={error} onSubmit={onSubmit} onSubmitAssistance={onSubmitAssistance} onCodeChange={onCodeChange} onAssistanceModeChange={onAssistanceModeChange} onAssistanceContextChange={onAssistanceContextChange} /> : null}</div>;
  return <CmmCard tone="emerald" variant="glass" className="space-y-3 p-5"><IdentityIntro />{!isLoaded ? <p className="text-sm text-slate-600">Vérification de la session…</p> : !isSignedIn ? <div className="space-y-2"><p className="text-sm text-slate-700">Connectez-vous avec Clerk pour saisir votre code.</p><CmmButton href={signInHref} tone="primary">Se connecter</CmmButton><p className="text-sm text-slate-700">Je n’ai pas de code ? Connectez-vous puis demandez une assistance à l’organisateur.</p></div> : isLoadingState && !identityState ? <p className="text-sm text-slate-600">Vérification de votre liaison…</p> : authenticatedContent}{identityState && identityState !== "identity_unlinked" ? <LinkedTeam team={team} /> : null}{identityState && identityState !== "identity_unlinked" ? <Recognition recognition={recognition} /> : null}<p className="text-xs text-slate-600">Une personne sans compte CleanMyMap reste comptée dans le bilan environnemental de l’action, mais ne reçoit pas de crédit personnel.</p><Link href="/politique-confidentialite" className="text-xs font-bold text-emerald-800 underline underline-offset-2">En savoir plus sur la confidentialité</Link></CmmCard>;
}
