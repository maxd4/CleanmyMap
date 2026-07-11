"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useUser } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { cn } from "@/lib/utils";
import type { QuestionnaireConfig } from "./questionnaire-config";

type SubmitState = "idle" | "submitting" | "success" | "error";

function formatQuestionnaireDescription(
  questionnaire: QuestionnaireConfig,
  values: Record<string, string>,
  pagePath: string,
  locale: "fr" | "en",
): string {
  const lines = [
    `Type: ${questionnaire.title[locale]}`,
    `Page: ${pagePath}`,
    "",
    ...questionnaire.fields.map((field) => {
      const value = values[field.key].trim();
      return `${field.label[locale]}: ${value}`;
    }),
  ];
  return lines.join("\n");
}

export function QuestionnaireCard({
  questionnaire,
  pagePath,
  source,
  initialValues,
}: {
  questionnaire: QuestionnaireConfig;
  pagePath: string;
  source: "feedback_section" | "feedback_discussion";
  initialValues?: Partial<Record<string, string>>;
}) {
  const { locale } = useSitePreferences();
  const { isLoaded, isSignedIn } = useUser();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      questionnaire.fields.map((field) => [field.key, initialValues?.[field.key] ?? ""]),
    ),
  );
  const [honeypot, setHoneypot] = useState("");
  const [formStartedAt, setFormStartedAt] = useState<number | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormStartedAt(Date.now());
  }, []);

  useEffect(() => {
    if (!initialValues) {
      return;
    }

    setValues((current) => {
      const hasUserInput = Object.values(current).some((value) => value.trim().length > 0);
      if (hasUserInput) {
        return current;
      }

      return Object.fromEntries(
        questionnaire.fields.map((field) => [
          field.key,
          initialValues[field.key] ?? "",
        ]),
      );
    });
  }, [initialValues, questionnaire.fields]);

  const canSubmit = questionnaire.fields.every((field) => {
    const value = values[field.key]?.trim() ?? "";
    return value.length >= (field.minLength ?? 1);
  }) && submitState !== "submitting";

  function updateField(fieldKey: string, value: string) {
    if (submitState !== "idle") {
      setSubmitState("idle");
      setErrorMessage(null);
    }
    setValues((current) => ({ ...current, [fieldKey]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setSubmitState("submitting");
    setErrorMessage(null);

    try {
      const questionnairePagePath = `${pagePath}#${questionnaire.id}`;
      const response = await fetch("/api/community/bug-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportType: questionnaire.id,
          title: values["subject"]?.trim() || questionnaire.title[locale],
          description: formatQuestionnaireDescription(
            questionnaire,
            values,
            questionnairePagePath,
            locale,
          ),
          pagePath: questionnairePagePath,
          source,
          honeypot,
          submittedAt: formStartedAt ?? Date.now(),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;
        throw new Error(
          body?.message ??
            body?.error ??
            (locale === "fr" ? "Impossible d'envoyer le questionnaire." : "Unable to send the questionnaire."),
        );
      }

      setSubmitState("success");
      setValues(
        Object.fromEntries(questionnaire.fields.map((field) => [field.key, ""])),
      );
    } catch (error) {
      setSubmitState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : locale === "fr"
            ? "Une erreur inattendue est survenue."
            : "An unexpected error occurred.",
      );
    }
  }

  const Icon = questionnaire.icon;
  const accentClasses = {
    rose: {
      border: "border-rose-300/30",
      bg: "bg-rose-500/10",
      title: "text-rose-100",
      icon: "text-rose-300",
      button:
        "border-rose-300/30 bg-rose-400/15 text-rose-50 hover:bg-rose-400/25 focus-visible:ring-rose-300/40",
    },
    amber: {
      border: "border-amber-300/30",
      bg: "bg-amber-500/10",
      title: "text-amber-50",
      icon: "text-amber-300",
      button:
        "border-amber-300/30 bg-amber-400/15 text-amber-50 hover:bg-amber-400/25 focus-visible:ring-amber-300/40",
    },
    emerald: {
      border: "border-emerald-300/30",
      bg: "bg-emerald-500/10",
      title: "text-emerald-50",
      icon: "text-emerald-300",
      button:
        "border-emerald-300/30 bg-emerald-400/15 text-emerald-50 hover:bg-emerald-400/25 focus-visible:ring-emerald-300/40",
    },
  }[questionnaire.accent];

  return (
    <CmmCard
      tone="slate"
      variant="glass"
      size="lg"
      className={cn("scroll-mt-28 rounded-[1.75rem]", accentClasses.border)}
      header={
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl border",
              accentClasses.border,
              accentClasses.bg,
            )}
          >
            <Icon className={cn("h-5 w-5", accentClasses.icon)} aria-hidden="true" />
          </div>
          <div>
            <p className="cmm-text-caption font-semibold uppercase tracking-[0.24em] text-white/55">
              {questionnaire.title[locale]}
            </p>
            <p className={cn("mt-1 text-sm leading-relaxed", accentClasses.title)}>
              {questionnaire.intro[locale]}
            </p>
          </div>
        </div>
      }
    >
      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden opacity-0" aria-hidden="true">
        <label htmlFor={`feedback-website-${questionnaire.id}`}>Website</label>
        <input
          id={`feedback-website-${questionnaire.id}`}
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>
      {isLoaded && !isSignedIn ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
          <p className="text-sm font-medium text-slate-100">
            {locale === "fr"
              ? "Connecte-toi pour envoyer ce questionnaire."
              : "Sign in to submit this questionnaire."}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            {locale === "fr"
              ? "Le retour est enregistré dans l'espace de feedback interne, avec un vrai suivi."
              : "The feedback is recorded in the internal feedback space with real follow-up."}
          </p>
          <CmmButton
            href="/sign-in"
            tone="secondary"
            variant="pill"
            className={cn(
              "mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2",
              accentClasses.button,
            )}
          >
            {locale === "fr" ? "Se connecter" : "Sign in"}
          </CmmButton>
        </div>
      ) : null}

      {isLoaded && isSignedIn ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3">
            {questionnaire.fields.map((field) => (
              <label key={field.key} className="block space-y-1.5">
                <span className="cmm-text-caption font-semibold uppercase tracking-[0.14em] text-slate-200">
                  {field.label[locale]}
                </span>
                <textarea
                  value={values[field.key] ?? ""}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  placeholder={field.placeholder[locale]}
                  rows={field.rows ?? 2}
                  maxLength={800}
                  className="min-h-[88px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white placeholder:text-slate-400 focus:border-cyan-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                />
                {field.helper ? (
                  <p className="cmm-text-caption text-slate-400">
                    {field.helper[locale]}
                  </p>
                ) : null}
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="cmm-text-caption text-slate-300">
              {locale === "fr"
                ? "Le retour part dans la file de suivi CleanMyMap."
                : "The feedback is sent into the CleanMyMap follow-up queue."}
            </p>
            <CmmButton
              type="submit"
              disabled={!canSubmit}
              tone="primary"
              variant="pill"
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-55",
                accentClasses.button,
              )}
            >
              {submitState === "submitting"
                ? locale === "fr"
                  ? "Envoi..."
                  : "Sending..."
                : locale === "fr"
                  ? "Envoyer"
                  : "Send"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </CmmButton>
          </div>

          {submitState === "success" ? (
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
              {questionnaire.success[locale]}
            </div>
          ) : null}

          {submitState === "error" ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-50">
              {errorMessage ?? (locale === "fr" ? "Impossible d'envoyer le questionnaire." : "Unable to send the questionnaire.")}
            </div>
          ) : null}
        </form>
      ) : null}
    </CmmCard>
  );
}
