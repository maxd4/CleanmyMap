"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type SetStateAction,
} from "react";
import { useUser } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { cn } from "@/lib/utils";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";
import type { PersonalFeedbackItem } from "@/lib/community/feedback-history-contract";
import type { QuestionnaireConfig } from "./questionnaire-config";
import {
  FEEDBACK_DESCRIPTION_MAX_LENGTH,
  formatQuestionnaireDescription,
  buildSuggestedFeedbackTitle,
  submitFeedbackQuestionnaire,
} from "./feedback-submission";
import { fetchPersonalFeedbackPage } from "./feedback-history-loader";
import { validateFeedbackScreenshotFile } from "./feedback-screenshot-client";
import { findPotentiallySimilarFeedback } from "@/lib/community/feedback-similarity";
import { useSpeechRecognition } from "./use-speech-recognition";
import {
  QuestionnaireFields,
  QuestionnaireSpeechNotice,
} from "./questionnaire-card-fields";
import { QuestionnaireRecognitionNotice } from "./questionnaire-card-notices";
import { QuestionnaireScreenshotField } from "./questionnaire-card-screenshot";
import { QuestionnaireSubmissionStatus } from "./questionnaire-card-status";

type SubmitState = "idle" | "submitting" | "success" | "error";

const ACCENT_CLASSES = {
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
} as const;

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
  const { isLoaded, isSignedIn, user } = useUser();
  const initialQuestionnaireValues = useMemo(
    () =>
      Object.fromEntries(
        questionnaire.fields.map((field) => [field.key, initialValues?.[field.key] ?? ""]),
      ),
    [initialValues, questionnaire.fields],
  );
  const [valuesOverride, setValuesOverride] = useState<Record<string, string>>();
  const values = valuesOverride ?? initialQuestionnaireValues;
  const setValues = (nextValue: SetStateAction<Record<string, string>>) => {
    setValuesOverride((current) => {
      const currentValues = current ?? initialQuestionnaireValues;
      return typeof nextValue === "function" ? nextValue(currentValues) : nextValue;
    });
  };
  const [honeypot, setHoneypot] = useState("");
  const formStartedAt = useRef<number | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null);
  const screenshotPreviewUrlRef = useRef<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [personalFeedback, setPersonalFeedback] = useState<PersonalFeedbackItem[]>([]);
  const [personalFeedbackOwnerId, setPersonalFeedbackOwnerId] = useState<string | null>(null);
  const questionnairePagePath = `${pagePath}#${questionnaire.id}`;
  const serializedDescription = useMemo(
    () => formatQuestionnaireDescription(questionnaire, values, questionnairePagePath, locale),
    [locale, questionnaire, questionnairePagePath, values],
  );
  const descriptionTooLong = serializedDescription.length > FEEDBACK_DESCRIPTION_MAX_LENGTH;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id || questionnaire.id === "collaboration") return;
    let active = true;
    void fetchPersonalFeedbackPage(null)
      .then((page) => {
        if (active) {
          setPersonalFeedback(page.items);
          setPersonalFeedbackOwnerId(user.id);
        }
      })
      .catch(() => {
        if (active) setPersonalFeedback([]);
      });
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, questionnaire.id, user?.id]);

  const similarFeedback = useMemo(
    () =>
      findPotentiallySimilarFeedback(
        {
          id: "current-draft",
          title: buildSuggestedFeedbackTitle(questionnaire, values, locale),
          text: serializedDescription,
        },
        (personalFeedbackOwnerId === user?.id ? personalFeedback : []).map((item) => ({
          id: item.id,
          title: item.title,
          text: item.description,
        })),
      ),
    [locale, personalFeedback, personalFeedbackOwnerId, questionnaire, serializedDescription, user?.id, values],
  );

  useEffect(() => {
    formStartedAt.current = Date.now();
  }, []);

  useEffect(() => () => {
    if (screenshotPreviewUrlRef.current) URL.revokeObjectURL(screenshotPreviewUrlRef.current);
  }, []);

  function replaceScreenshotFile(file: File | null) {
    if (screenshotPreviewUrlRef.current) URL.revokeObjectURL(screenshotPreviewUrlRef.current);
    const previewUrl = file ? URL.createObjectURL(file) : null;
    screenshotPreviewUrlRef.current = previewUrl;
    setScreenshotPreviewUrl(previewUrl);
    setScreenshotFile(file);
  }

  const canSubmit = questionnaire.fields.every((field) => {
    const value = values[field.key]?.trim() ?? "";
    return value.length >= (field.minLength ?? 1);
  }) && !descriptionTooLong && submitState !== "submitting";

  function updateField(fieldKey: string, value: string) {
    if (submitState !== "idle") {
      setSubmitState("idle");
      setErrorMessage(null);
      setRequestId(null);
    }
    setValues((current) => ({ ...current, [fieldKey]: value }));
  }

  function appendSpeechTranscript(fieldKey: string, transcript: string) {
    const normalizedTranscript = transcript.trim().replace(/\s+/g, " ");
    if (!normalizedTranscript) return;
    if (submitState !== "idle") {
      setSubmitState("idle");
      setErrorMessage(null);
      setRequestId(null);
    }
    setValues((current) => {
      const existingValue = current[fieldKey]?.trimEnd() ?? "";
      return {
        ...current,
        [fieldKey]: existingValue ? `${existingValue} ${normalizedTranscript}` : normalizedTranscript,
      };
    });
  }

  const speech = useSpeechRecognition({ locale, onFinalTranscript: appendSpeechTranscript });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    speech.cancel();
    setSubmitState("submitting");
    setErrorMessage(null);

    try {
      const result = await submitFeedbackQuestionnaire({
        questionnaire,
        values,
        pagePath,
        source,
        locale,
        honeypot,
        submittedAt: formStartedAt.current ?? Date.now(),
        screenshotFile: questionnaire.id === "bug" ? screenshotFile : null,
      });

      setSubmitState("success");
      setRequestId(result.requestId);
      setScreenshotError(result.screenshotError);
      setValues(Object.fromEntries(questionnaire.fields.map((field) => [field.key, ""])));
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

  function handleScreenshotChange(file: File | undefined) {
    setScreenshotError(null);
    if (!file) {
      replaceScreenshotFile(null);
      return;
    }
    const validationError = validateFeedbackScreenshotFile(file);
    if (validationError) {
      replaceScreenshotFile(null);
      setScreenshotError(validationError);
      return;
    }
    replaceScreenshotFile(file);
  }

  const Icon = questionnaire.icon;
  const returnPath = (() => {
    if (typeof window === "undefined") return `${pagePath}#${questionnaire.id}`;
    const url = new URL(window.location.href);
    url.searchParams.set("type", questionnaire.id);
    url.hash = questionnaire.id;
    return `${url.pathname}${url.search}${url.hash}`;
  })();
  const accentClasses = ACCENT_CLASSES[questionnaire.accent];

  return (
    <CmmCard
      tone="slate"
      variant="glass"
      size="lg"
      className={cn("scroll-mt-28 rounded-[1.75rem]", accentClasses.border)}
      header={
        <div className="flex items-center gap-3">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", accentClasses.border, accentClasses.bg)}>
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
            {locale === "fr" ? "Connecte-toi pour envoyer ce questionnaire." : "Sign in to submit this questionnaire."}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            {locale === "fr" ? "Après envoi, le retour est transmis à CleanMyMap pour examen." : "After submission, your feedback is sent to CleanMyMap for review."}
          </p>
          <CmmButton
            href={buildSignInRedirectHref(returnPath)}
            tone="secondary"
            variant="pill"
            className={cn("mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2", accentClasses.button)}
          >
            {locale === "fr" ? "Se connecter" : "Sign in"}
          </CmmButton>
        </div>
      ) : null}

      {isLoaded && isSignedIn ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {questionnaire.id !== "collaboration" ? <QuestionnaireRecognitionNotice locale={locale} /> : null}
          {questionnaire.id !== "collaboration" ? <QuestionnaireSpeechNotice locale={locale} speech={speech} /> : null}
          <div className="grid gap-3">
            {similarFeedback.length > 0 ? (
              <aside className="rounded-2xl border border-cyan-200/30 bg-cyan-500/10 px-4 py-3 text-slate-100" role="status">
                <p className="text-sm font-bold">
                  {locale === "fr" ? "Des retours personnels semblent proches" : "Some of your feedback looks similar"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  {locale === "fr" ? "Vérifiez vos retours précédents avant d'envoyer. Cette suggestion ne bloque pas la soumission." : "Check your previous feedback before sending. This suggestion does not block submission."}
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {similarFeedback.map((match) => (
                    <li key={match.id}>
                      <a href="/sections/feedback#mes-retours" className="font-semibold text-cyan-100 underline-offset-2 hover:underline">
                        {match.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}
            <QuestionnaireFields
              questionnaire={questionnaire}
              locale={locale}
              values={values}
              submitState={submitState}
              speech={speech}
              onUpdateField={updateField}
            />
          </div>

          {questionnaire.id === "bug" ? (
            <QuestionnaireScreenshotField
              file={screenshotFile}
              previewUrl={screenshotPreviewUrl}
              error={screenshotError}
              onChange={handleScreenshotChange}
              onRemove={() => {
                replaceScreenshotFile(null);
                setScreenshotError(null);
              }}
            />
          ) : null}

          {descriptionTooLong ? (
            <p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {locale === "fr"
                ? `Votre retour dépasse la limite de ${FEEDBACK_DESCRIPTION_MAX_LENGTH} caractères (${serializedDescription.length}). Raccourcissez-le pour pouvoir l'envoyer.`
                : `Your feedback exceeds the ${FEEDBACK_DESCRIPTION_MAX_LENGTH}-character limit (${serializedDescription.length}). Shorten it before sending.`}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="cmm-text-caption text-slate-300">
              {locale === "fr" ? "Le retour est transmis à CleanMyMap pour examen." : "Your feedback is sent to CleanMyMap for review."}
            </p>
            <CmmButton
              type="submit"
              disabled={!canSubmit}
              tone="primary"
              variant="pill"
              className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-55", accentClasses.button)}
            >
              {submitState === "submitting"
                ? locale === "fr" ? "Envoi..." : "Sending..."
                : locale === "fr" ? "Envoyer" : "Send"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </CmmButton>
          </div>

          <QuestionnaireSubmissionStatus
            locale={locale}
            questionnaire={questionnaire}
            state={submitState}
            requestId={requestId}
            screenshotError={screenshotError}
            errorMessage={errorMessage}
          />
        </form>
      ) : null}
    </CmmCard>
  );
}
