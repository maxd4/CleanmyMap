"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { ArrowRight, Bug, Handshake, Lightbulb, ShieldAlert } from "lucide-react";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { cn } from "@/lib/utils";

type L10n = { fr: string; en: string };
type FeedbackType = "bug" | "improvement" | "collaboration";
type SubmitState = "idle" | "submitting" | "success" | "error";

type FeedbackField = {
  key: string;
  label: L10n;
  placeholder: L10n;
  helper?: L10n;
  rows?: number;
  minLength?: number;
};

type QuestionnaireConfig = {
  id: FeedbackType;
  title: L10n;
  intro: L10n;
  success: L10n;
  icon: typeof Bug;
  accent: "rose" | "amber" | "emerald";
  fields: FeedbackField[];
};

type FeedbackSectionProps = {
  pagePath?: string;
  source?: "feedback_section" | "feedback_discussion";
};

const QUESTIONNAIRES = [
  {
    id: "bug",
    title: { fr: "Bug", en: "Bug" },
    intro: {
      fr: "Décris précisément ce qui casse pour qu'on puisse reproduire et corriger vite.",
      en: "Describe what breaks so we can reproduce it and fix it quickly.",
    },
    success: {
      fr: "Merci. Le signalement bug a bien été transmis.",
      en: "Thanks. The bug report has been sent.",
    },
    icon: Bug,
    accent: "rose",
    fields: [
      {
        key: "subject",
        label: { fr: "Sujet", en: "Subject" },
        placeholder: {
          fr: "Ex: La carte se fige sur mobile",
          en: "E.g. The map freezes on mobile",
        },
        minLength: 4,
      },
      {
        key: "context",
        label: { fr: "Contexte", en: "Context" },
        placeholder: {
          fr: "Page, profil, appareil ou navigateur concerné",
          en: "Page, profile, device or browser involved",
        },
        minLength: 4,
      },
      {
        key: "steps",
        label: { fr: "Étapes pour reproduire", en: "Steps to reproduce" },
        placeholder: {
          fr: "1. ... 2. ... 3. ...",
          en: "1. ... 2. ... 3. ...",
        },
        rows: 4,
        minLength: 10,
      },
      {
        key: "expected",
        label: { fr: "Résultat attendu", en: "Expected result" },
        placeholder: {
          fr: "Ce qui devrait se passer normalement",
          en: "What should happen normally",
        },
        rows: 3,
        minLength: 10,
      },
    ],
  },
  {
    id: "improvement",
    title: { fr: "Amélioration", en: "Improvement" },
    intro: {
      fr: "Partage une idée concrète pour simplifier une action ou augmenter l'impact.",
      en: "Share a concrete idea to simplify an action or increase impact.",
    },
    success: {
      fr: "Merci. La proposition d'amélioration a été envoyée.",
      en: "Thanks. The improvement proposal has been sent.",
    },
    icon: Lightbulb,
    accent: "amber",
    fields: [
      {
        key: "subject",
        label: { fr: "Sujet de l'idée", en: "Idea subject" },
        placeholder: {
          fr: "Ex: Raccourcir le formulaire de déclaration",
          en: "E.g. Shorten the declaration form",
        },
        minLength: 4,
      },
      {
        key: "friction",
        label: { fr: "Ce qui bloque aujourd'hui", en: "Current friction" },
        placeholder: {
          fr: "Ce qui prend trop de temps ou crée de la confusion",
          en: "What takes too long or creates confusion",
        },
        rows: 3,
        minLength: 10,
      },
      {
        key: "proposal",
        label: { fr: "Amélioration proposée", en: "Proposed improvement" },
        placeholder: {
          fr: "Décris le changement que tu veux voir",
          en: "Describe the change you want to see",
        },
        rows: 4,
        minLength: 10,
      },
      {
        key: "impact",
        label: { fr: "Impact attendu", en: "Expected impact" },
        placeholder: {
          fr: "Ce que cela améliorerait pour le terrain ou l'équipe",
          en: "What it would improve for the field or the team",
        },
        rows: 3,
        minLength: 10,
      },
    ],
  },
  {
    id: "collaboration",
    title: { fr: "Collaboration", en: "Collaboration" },
    intro: {
      fr: "Propose un partenariat, une mise en lien ou un échange terrain.",
      en: "Propose a partnership, introduction or field exchange.",
    },
    success: {
      fr: "Merci. La demande de collaboration a été transmise.",
      en: "Thanks. The collaboration request has been sent.",
    },
    icon: Handshake,
    accent: "emerald",
    fields: [
      {
        key: "organization",
        label: { fr: "Structure ou personne", en: "Organization or person" },
        placeholder: {
          fr: "Nom de l'association, collectivité, école ou collectif",
          en: "Association, city, school or collective name",
        },
        minLength: 4,
      },
      {
        key: "purpose",
        label: { fr: "Objet de la collaboration", en: "Collaboration purpose" },
        placeholder: {
          fr: "Ex: sensibilisation, logistique, contenu, événement",
          en: "E.g. awareness, logistics, content, event",
        },
        rows: 3,
        minLength: 10,
      },
      {
        key: "contribution",
        label: { fr: "Ce que vous apportez", en: "What you bring" },
        placeholder: {
          fr: "Ressource, lieu, réseau, compétence, soutien",
          en: "Resource, venue, network, skill or support",
        },
        rows: 4,
        minLength: 10,
      },
      {
        key: "nextStep",
        label: { fr: "Prochaine étape souhaitée", en: "Desired next step" },
        placeholder: {
          fr: "Appel, rendez-vous, échange mail, mise en lien",
          en: "Call, meeting, email exchange, warm introduction",
        },
        rows: 3,
        minLength: 10,
      },
    ],
  },
] as const satisfies readonly QuestionnaireConfig[];

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

function QuestionnaireCard({
  questionnaire,
  pagePath,
  source,
}: {
  questionnaire: QuestionnaireConfig;
  pagePath: string;
  source: "feedback_section" | "feedback_discussion";
}) {
  const { locale } = useSitePreferences();
  const { isLoaded, isSignedIn } = useUser();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(questionnaire.fields.map((field) => [field.key, ""])),
  );
  const [honeypot, setHoneypot] = useState("");
  const [formStartedAt, setFormStartedAt] = useState<number | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormStartedAt(Date.now());
  }, []);

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
          title: values.subject?.trim() || questionnaire.title[locale],
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
          <SignInButton mode="modal">
            <button
              type="button"
              className={cn(
                "mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2",
                accentClasses.button,
              )}
            >
              {locale === "fr" ? "Se connecter" : "Sign in"}
            </button>
          </SignInButton>
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
            <button
              type="submit"
              disabled={!canSubmit}
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
            </button>
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

export function FeedbackSection({
  pagePath: pagePathOverride,
  source = "feedback_section",
}: FeedbackSectionProps = {}) {
  const { locale } = useSitePreferences();
  const pagePath = useMemo(() => {
    if (pagePathOverride) {
      return pagePathOverride;
    }
    if (typeof window === "undefined") {
      return "/sections/feedback";
    }
    return window.location.pathname;
  }, [pagePathOverride]);

  return (
    <section className="space-y-6">
      <CmmCard
        tone="sky"
        variant="glass"
        size="lg"
        className="rounded-[2rem] border-cyan-300/20 bg-slate-950/35"
      >
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-slate-100">
              <ShieldAlert className="h-4 w-4 text-cyan-300" aria-hidden="true" />
              <span className="cmm-text-caption font-semibold uppercase tracking-[0.22em]">
                {locale === "fr" ? "Rubrique feedback" : "Feedback section"}
              </span>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                {locale === "fr"
                  ? "Un canal unique pour corriger, améliorer et collaborer."
                  : "A single channel to fix, improve and collaborate."}
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-slate-300">
                {locale === "fr"
                  ? "Choisis le questionnaire adapté: bug, amélioration ou collaboration. Chaque réponse est enregistrée dans le suivi CleanMyMap avec un vrai contexte."
                  : "Choose the right questionnaire: bug, improvement or collaboration. Each answer is recorded in the CleanMyMap follow-up with real context."}
              </p>
            </div>

            <CmmButtonGroup>
              <CmmButton href="#bug" tone="primary" variant="pill">
                {locale === "fr" ? "Signalement bug" : "Bug report"}
              </CmmButton>
              <CmmButton href="#improvement" tone="secondary" variant="pill">
                {locale === "fr" ? "Amélioration" : "Improvement"}
              </CmmButton>
              <CmmButton href="#collaboration" tone="secondary" variant="pill">
                {locale === "fr" ? "Collaboration" : "Collaboration"}
              </CmmButton>
            </CmmButtonGroup>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              {
                label: locale === "fr" ? "Bugs" : "Bugs",
                value: locale === "fr" ? "Réparation priorisée" : "Priority fix",
              },
              {
                label: locale === "fr" ? "Améliorations" : "Improvements",
                value: locale === "fr" ? "Itérations utiles" : "Useful iterations",
              },
              {
                label: locale === "fr" ? "Collaborations" : "Collaborations",
                value: locale === "fr" ? "Mise en lien" : "Warm introduction",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p className="cmm-text-caption font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-medium text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </CmmCard>

      <div className="grid gap-4 xl:grid-cols-3">
        {QUESTIONNAIRES.map((questionnaire) => (
          <div key={questionnaire.id} id={questionnaire.id}>
            <QuestionnaireCard
              questionnaire={questionnaire}
              pagePath={pagePath}
              source={source}
            />
          </div>
        ))}
      </div>

      <CmmCard
        tone="slate"
        variant="outlined"
        size="md"
        className="rounded-[1.5rem] border-white/10 bg-slate-950/20"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="cmm-text-caption font-semibold uppercase tracking-[0.18em] text-slate-400">
              {locale === "fr" ? "Besoin d'un contact direct ?" : "Need a direct contact?"}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {locale === "fr"
                ? "Le mail reste disponible si le retour doit sortir du formulaire."
                : "Email remains available if the reply has to go outside the form."}
            </p>
          </div>
          <a
            href="mailto:maxence.drm@gmail.com"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/10"
          >
            {locale === "fr" ? "Écrire un mail" : "Write an email"}
          </a>
        </div>
      </CmmCard>
    </section>
  );
}
