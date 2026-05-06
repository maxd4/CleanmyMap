"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { InlineFieldError } from "@/components/ui/inline-field-error";
import { ErrorMessage } from "@/components/ui/error-message";
import { PermissionErrorState } from "@/components/ui/permission-error-state";
import { toAppError, isAppError, defaultMessageForKind } from "@/lib/errors/app-errors";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import type { AppError } from "@/lib/errors/app-errors";
import type { AppProfile } from "@/lib/profiles";

type SubmitState = "idle" | "submitting" | "success" | "error";

type PromotionRequestFormProps = {
  currentRole: AppProfile;
};

const REQUESTABLE_ROLES: Record<
  AppProfile,
  { requestedRole: "elu" | "admin"; label: string }[]
> = {
  benevole: [
    { requestedRole: "elu", label: "Demander le rôle élu" },
    { requestedRole: "admin", label: "Demander le rôle admin" },
  ],
  coordinateur: [
    { requestedRole: "elu", label: "Demander le rôle élu" },
    { requestedRole: "admin", label: "Demander le rôle admin" },
  ],
  scientifique: [
    { requestedRole: "elu", label: "Demander le rôle élu" },
    { requestedRole: "admin", label: "Demander le rôle admin" },
  ],
  elu: [{ requestedRole: "admin", label: "Demander le rôle admin" }],
  admin: [],
  max: [],
};

export function PromotionRequestForm({ currentRole }: PromotionRequestFormProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const options = REQUESTABLE_ROLES[currentRole];
  const [requestedRole, setRequestedRole] = useState<"elu" | "admin">(
    options[0]?.requestedRole ?? "elu",
  );
  const [motivation, setMotivation] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [error, setError] = useState<AppError | null>(null);
  const [motivationTouched, setMotivationTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const motivationError =
    (motivationTouched || submitAttempted) && motivation.trim().length < 10
      ? (fr
          ? "La motivation doit contenir au moins 10 caractères."
          : "The motivation must contain at least 10 characters.")
      : null;
  const canSubmit = useMemo(
    () => options.length > 0 && !motivationError && submitState !== "submitting",
    [motivationError, options.length, submitState],
  );

  async function submitRequest() {

    setSubmitState("submitting");
    setError(null);

    try {
      const response = await fetch("/api/community/promotion-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestedRole,
          motivation: motivation.trim(),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string; kind?: string }
          | null;
        throw toAppError(
          new Error(body?.error ?? "Impossible d'envoyer la demande."),
          {
            kind:
              body?.kind === "validation"
                ? "validation"
                : body?.kind === "permission"
                  ? "permission"
                  : "server",
            message: body?.error ?? "Impossible d'envoyer la demande.",
          },
        );
      }

      setSubmitState("success");
      setMotivation("");
      setMotivationTouched(false);
      setSubmitAttempted(false);
      setError(null);
    } catch (error) {
      const appError = isAppError(error)
        ? error
        : toAppError(error, {
            kind: "server",
            message: fr
              ? "Une erreur inattendue est survenue. Réessayez."
              : "An unexpected error occurred. Please try again.",
          });
      if (appError.kind === "network") {
        notifyNetworkToast({
          message: appError.message || defaultMessageForKind("network"),
          onRetry: () => void submitRequest(),
          onRefresh: () => window.location.reload(),
        });
        setSubmitState("idle");
        return;
      }
      setSubmitState("error");
      setError(appError);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);
    if (!canSubmit) {
      return;
    }
    await submitRequest();
  }

  if (options.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
          {fr ? "Promotion" : "Promotion"}
        </p>
        <h2 className="mt-2 text-base font-semibold cmm-text-primary">
          {fr
            ? "Vous avez déjà un niveau de supervision élevé."
            : "You already have a high supervision level."}
        </h2>
        <p className="mt-2 cmm-text-small cmm-text-secondary">
          {fr
            ? "Le formulaire de promotion est réservé aux profils de terrain et de coordination."
            : "The promotion form is reserved for field and coordination profiles."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] text-emerald-700">
        {fr ? "Demande de promotion" : "Promotion request"}
      </p>
      <h2 className="mt-2 text-base font-semibold text-emerald-950">
        {fr
          ? "Envoyer une demande vers IMU pour validation"
          : "Send a request to IMU for review"}
      </h2>
      <p className="mt-2 cmm-text-small text-emerald-900/80">
        {fr
          ? "La demande arrive uniquement dans l'inbox propriétaire et, si elle est acceptée, le rôle est écrit dans Clerk et Supabase."
          : "The request goes only to the owner inbox and, if approved, the role is written to Clerk and Supabase."}
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <label className="block space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">
            {fr ? "Rôle demandé" : "Requested role"}
          </span>
          <select
            value={requestedRole}
            onChange={(event) => setRequestedRole(event.target.value as "elu" | "admin")}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
          >
            {options.map((option) => (
              <option key={option.requestedRole} value={option.requestedRole}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">
            {fr ? "Motivation" : "Motivation"}
          </span>
          <textarea
            value={motivation}
            onChange={(event) => {
              setMotivationTouched(true);
              setMotivation(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            placeholder={
              fr
                ? "Explique brièvement pourquoi ce niveau est justifié."
                : "Briefly explain why this level is justified."
            }
            className="min-h-[120px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
            maxLength={1200}
          />
          {motivationError ? <InlineFieldError message={motivationError} /> : null}
        </label>

        <div className="flex items-center justify-between gap-3">
          <p className="cmm-text-caption text-emerald-900/80">
            {fr
              ? "Traitement réservé à IMU."
              : "Review reserved for IMU."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/sections/feedback#collaboration"
              className="rounded-lg border border-emerald-200 bg-white px-4 py-2 cmm-text-caption font-semibold text-emerald-900 hover:bg-emerald-50"
            >
              {fr ? "Voir le feedback" : "Open feedback"}
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-emerald-600 px-4 py-2 cmm-text-caption font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitState === "submitting"
                ? fr
                  ? "Envoi..."
                  : "Sending..."
                : fr
                  ? "Demander la promotion"
                  : "Request promotion"}
            </button>
          </div>
        </div>

        {submitState === "success" ? (
          <p className="cmm-text-caption font-medium text-emerald-700">
            {fr
              ? "Merci, la demande a été envoyée à IMU."
              : "Thanks, the request has been sent to IMU."}
          </p>
        ) : null}
        {error ? (
          error.kind === "permission" ? (
            <PermissionErrorState
              className="mt-2"
              title={fr ? "Connexion requise" : "Sign-in required"}
              message={error.message}
            />
          ) : (
            <ErrorMessage
              className="mt-2"
              kind={error.kind}
              title={fr ? "La demande n'a pas pu partir" : "The request could not be sent"}
              message={error.message}
              actions={
                <button
                  type="button"
                  onClick={() => void submitRequest()}
                  className="rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700"
                >
                  {fr ? "Réessayer" : "Retry"}
                </button>
              }
            />
          )
        ) : null}
      </form>
    </section>
  );
}
