"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useUser } from "@clerk/nextjs";
import { CheckCircle2, LogIn, MessageSquarePlus, Send } from "lucide-react";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import {
  CONTRIBUTION_INFO_TYPE_LABELS,
  PARIS_NETWORK_CONTRIBUTION_PAGE_PATH,
  submitParisNetworkContribution,
  validateAndBuildContributionPayload,
  type ContributionInfoType,
} from "./paris-network-contribution.model";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function ParisNetworkContributionCard({
  fr = true,
  territoryId = "FR:REG:11",
}: {
  fr?: boolean;
  territoryId?: string;
}) {
  const { isLoaded, isSignedIn } = useUser();
  const [message, setMessage] = useState("");
  const [infoType, setInfoType] = useState<ContributionInfoType>("");
  const [proofUrl, setProofUrl] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [savedRequestId, setSavedRequestId] = useState<string | null>(null);
  const openedAtRef = useRef<number>(0);

  useEffect(() => {
    if (openedAtRef.current === 0) {
      openedAtRef.current = Date.now();
    }
  }, []);

  const ensureOpenedTimestamp = () => {
    if (openedAtRef.current === 0) {
      openedAtRef.current = Date.now();
    }
    return openedAtRef.current;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSignedIn || submitState === "submitting") return;

    const built = validateAndBuildContributionPayload({
      message,
      infoType,
      proofUrl,
      honeypot,
      submittedAt: ensureOpenedTimestamp(),
      fr,
    });

    if (!built.ok) {
      setSubmitState("error");
      setFeedbackMessage(built.error);
      return;
    }

    setSubmitState("submitting");
    setFeedbackMessage(null);
    setSavedRequestId(null);

    try {
      const result = await submitParisNetworkContribution(built.payload, fr);
      setSubmitState("success");
      setSavedRequestId(result.requestId);
      setFeedbackMessage(
        fr
          ? "Proposition enregistrée dans la file de vérification éditoriale. Elle n'est pas publiée automatiquement sur le graphe."
          : "Suggestion saved to the editorial review queue. It is not automatically published on the graph.",
      );
      setMessage("");
      setInfoType("");
      setProofUrl("");
    } catch (error) {
      setSubmitState("error");
      setFeedbackMessage(
        error instanceof Error
          ? error.message
          : fr
            ? "Une erreur réseau est survenue lors de l'envoi."
            : "A network error occurred during submission.",
      );
    }
  };

  const signInHref = buildSignInRedirectHref(PARIS_NETWORK_CONTRIBUTION_PAGE_PATH);

  if (territoryId !== "FR:REG:11") {
    return (
      <section
        id="reseau-cleanwalks"
        aria-labelledby="paris-network-contribution-heading"
        className="rounded-[var(--radius-lg)] border border-violet-300/18 bg-slate-900/50 p-6 md:p-8"
      >
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3.5 py-1 text-xs font-black uppercase tracking-[0.2em] text-violet-300">
            <MessageSquarePlus size={13} aria-hidden="true" />
            {fr ? "Contribution citoyenne modérée" : "Moderated citizen contribution"}
          </div>
          <h3
            id="paris-network-contribution-heading"
            className="text-2xl font-black tracking-tight text-white md:text-3xl"
          >
            {fr
              ? "Aidez-nous à compléter ce réseau"
              : "Help us complete this network"}
          </h3>
          <p role="status" className="text-sm leading-relaxed text-slate-300">
            {fr
              ? "Ce formulaire de contribution est actuellement réservé au pilote Paris intramuros (FR:REG:11). Sélectionnez l'Île-de-France / Paris intramuros pour proposer un acteur parisien."
              : "This contribution form is currently reserved for the Paris intramuros pilot (FR:REG:11). Select Île-de-France / Paris intramuros to submit a Paris actor."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="reseau-cleanwalks"
      aria-labelledby="paris-network-contribution-heading"
      className="rounded-[var(--radius-lg)] border border-violet-300/18 bg-slate-900/50 p-6 md:p-8"
    >
      <div className="max-w-3xl space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3.5 py-1 text-xs font-black uppercase tracking-[0.2em] text-violet-300">
          <MessageSquarePlus size={13} aria-hidden="true" />
          {fr ? "Contribution citoyenne modérée" : "Moderated citizen contribution"}
        </div>
        <h3
          id="paris-network-contribution-heading"
          className="text-2xl font-black tracking-tight text-white md:text-3xl"
        >
          {fr
            ? "Aidez-nous à compléter ce réseau"
            : "Help us complete this network"}
        </h3>
        <p className="text-sm leading-relaxed text-slate-300">
          {fr
            ? "Signalez une structure, une collaboration, une action commune, un contact professionnel public ou une disponibilité de matériel. Toute proposition est relue avant intégration : rien n'est publié automatiquement."
            : "Suggest an organization, collaboration, joint action, public professional contact or equipment availability. Every submission is reviewed before integration: nothing is published automatically."}
        </p>
      </div>

      {isLoaded && !isSignedIn ? (
        <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-violet-300/20 bg-slate-950/70 p-5 sm:flex-row sm:items-center">
          <p className="text-sm font-medium text-slate-200">
            {fr
              ? "La consultation du réseau est publique. Connectez-vous avec votre compte pour envoyer une proposition vérifiable."
              : "Exploring the network is public. Sign in to submit a verifiable suggestion."}
          </p>
          <CmmButton
            href={signInHref}
            tone="important"
            variant="pill"
            ariaLabel={fr ? "Se connecter pour proposer une information" : "Sign in to submit an update"}
            className="inline-flex shrink-0 items-center gap-2"
          >
            <LogIn size={15} aria-hidden="true" />
            <span>{fr ? "Se connecter pour contribuer" : "Sign in to contribute"}</span>
          </CmmButton>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div className="hidden" aria-hidden="true">
            <label>
              Ne pas remplir
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-violet-200">
                {fr ? "Type d'information (facultatif)" : "Information type (optional)"}
              </span>
              <select
                aria-label={fr ? "Type d'information" : "Information type"}
                value={infoType}
                onChange={(e) => setInfoType(e.target.value as ContributionInfoType)}
                className="h-11 rounded-xl border border-violet-300/20 bg-slate-950/70 px-3 text-sm font-semibold text-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
              >
                <option value="">
                  {fr ? "Non précisé (facultatif)" : "Unspecified (optional)"}
                </option>
                {(
                  Object.entries(CONTRIBUTION_INFO_TYPE_LABELS) as [
                    Exclude<ContributionInfoType, "">,
                    string,
                  ][]
                ).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-violet-200">
                {fr ? "URL justificative (facultatif)" : "Supporting URL (optional)"}
              </span>
              <input
                type="url"
                inputMode="url"
                aria-label={fr ? "URL justificative" : "Supporting URL"}
                placeholder="https://..."
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                className="h-11 rounded-xl border border-violet-300/20 bg-slate-950/70 px-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-violet-200">
              {fr
                ? "Description détaillée (structure, collaboration, contact public ou matériel)"
                : "Detailed description"}
            </span>
            <textarea
              rows={5}
              required
              aria-label={fr ? "Description de la proposition" : "Suggestion description"}
              placeholder={
                fr
                  ? "Décrivez l'information constatée, les structures concernées et la source publique permettant de la vérifier..."
                  : "Describe the observed information, organizations involved and public source..."
              }
              value={message}
              onFocus={ensureOpenedTimestamp}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-2xl border border-violet-300/20 bg-slate-950/70 p-4 text-sm leading-relaxed cmm-text-inverse placeholder:opacity-60 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
            />
          </label>

          {submitState === "success" && feedbackMessage ? (
            <CmmFeedback
              tone="success"
              title={
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {fr ? "Contribution enregistrée" : "Contribution saved"}
                </span>
              }
            >
              {feedbackMessage}
              {savedRequestId ? (
                <span className="mt-1 block text-xs opacity-80">
                  {fr ? "Référence" : "Reference"} : {savedRequestId}
                </span>
              ) : null}
            </CmmFeedback>
          ) : null}

          {submitState === "error" && feedbackMessage ? (
            <CmmFeedback
              tone="error"
              title={fr ? "Envoi impossible" : "Submission failed"}
            >
              {feedbackMessage}
            </CmmFeedback>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {fr
                ? "Aucune donnée personnelle privée n'est publiée."
                : "No private personal data is ever published."}
            </p>
            <CmmButton
              type="submit"
              tone="important"
              variant="pill"
              loading={submitState === "submitting"}
              disabled={!isLoaded || submitState === "submitting"}
              ariaLabel={fr ? "Envoyer la proposition au réseau" : "Submit suggestion"}
              className="inline-flex items-center gap-2"
            >
              <Send size={14} aria-hidden="true" />
              <span>
                {submitState === "submitting"
                  ? fr
                    ? "Envoi en cours..."
                    : "Sending..."
                  : fr
                    ? "Envoyer pour vérification"
                    : "Submit for review"}
              </span>
            </CmmButton>
          </div>
        </form>
      )}
    </section>
  );
}
