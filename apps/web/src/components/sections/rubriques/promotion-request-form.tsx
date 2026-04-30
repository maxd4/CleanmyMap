"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => options.length > 0 && motivation.trim().length >= 10 && submitState !== "submitting",
    [motivation, options.length, submitState],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setSubmitState("submitting");
    setErrorMessage(null);

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
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Impossible d'envoyer la demande.");
      }

      setSubmitState("success");
      setMotivation("");
    } catch (error) {
      setSubmitState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : fr
            ? "Une erreur inattendue est survenue."
            : "An unexpected error occurred.",
      );
    }
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
            onChange={(event) => setMotivation(event.target.value)}
            placeholder={
              fr
                ? "Explique brièvement pourquoi ce niveau est justifié."
                : "Briefly explain why this level is justified."
            }
            className="min-h-[120px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
            maxLength={1200}
          />
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
        {submitState === "error" ? (
          <p className="cmm-text-caption font-medium text-rose-700">
            {errorMessage ?? (fr ? "Impossible d'envoyer la demande." : "Unable to send the request.")}
          </p>
        ) : null}
      </form>
    </section>
  );
}
