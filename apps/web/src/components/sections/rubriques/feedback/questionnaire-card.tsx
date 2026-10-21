"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type SetStateAction,
} from "react";
import { useUser } from "@clerk/nextjs";
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
import {
  createFeedbackScreenshotPreview,
  revokeFeedbackScreenshotPreview,
  validateFeedbackScreenshotFile,
  type FeedbackScreenshotPreview,
} from "@/lib/community/feedback-screenshot-client";
import { findPotentiallySimilarFeedback } from "@/lib/community/feedback-similarity";
import { useSpeechRecognition } from "./use-speech-recognition";
import { QuestionnaireCardForm } from "./questionnaire-card-form";

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
  const submissionInFlightRef = useRef(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<FeedbackScreenshotPreview | null>(null);
  const screenshotPreviewRef = useRef<FeedbackScreenshotPreview | null>(null);
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
    revokeFeedbackScreenshotPreview(screenshotPreviewRef.current);
  }, []);

  function replaceScreenshotFile(file: File | null) {
    const nextPreview = file ? createFeedbackScreenshotPreview(file) : null;
    revokeFeedbackScreenshotPreview(screenshotPreviewRef.current);
    screenshotPreviewRef.current = nextPreview;
    setScreenshotPreview(nextPreview);
    setScreenshotFile(nextPreview ? file : null);
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
    if (!canSubmit || submissionInFlightRef.current) return;
    submissionInFlightRef.current = true;
    setSubmitState("submitting");
    setErrorMessage(null);
    speech.cancel();
    try {
      await submitQuestionnaireForm({ questionnaire, values, pagePath, source, locale, honeypot, submittedAt: formStartedAt.current ?? Date.now(), screenshotFile: questionnaire.id === "bug" ? screenshotFile : null, setSubmitState, setErrorMessage, setRequestId, setScreenshotError, setValues });
    } finally {
      submissionInFlightRef.current = false;
    }
  }

  function handleScreenshotChange(event: ChangeEvent<HTMLInputElement>) {
    handleScreenshotFileChange(event, setScreenshotError, replaceScreenshotFile);
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

  return <QuestionnaireCardView questionnaire={questionnaire} locale={locale} accentClasses={accentClasses} Icon={Icon} isLoaded={isLoaded} isSignedIn={isSignedIn} returnPath={returnPath} honeypot={honeypot} setHoneypot={setHoneypot} values={values} submitState={submitState} speech={speech} similarFeedback={similarFeedback} screenshotFile={screenshotFile} screenshotPreview={screenshotPreview} screenshotError={screenshotError} serializedDescription={serializedDescription} descriptionTooLong={descriptionTooLong} requestId={requestId} errorMessage={errorMessage} handleSubmit={handleSubmit} updateField={updateField} handleScreenshotChange={handleScreenshotChange} removeScreenshot={() => { replaceScreenshotFile(null); setScreenshotError(null); }} />;
}

function handleScreenshotFileChange(event: ChangeEvent<HTMLInputElement>, setScreenshotError: (message: string | null) => void, replaceScreenshotFile: (file: File | null) => void) {
  setScreenshotError(null);
  const file = event.target.files?.[0];
  if (!file) return replaceScreenshotFile(null);
  const validationError = validateFeedbackScreenshotFile(file);
  if (validationError) {
    replaceScreenshotFile(null);
    return setScreenshotError(validationError);
  }
  replaceScreenshotFile(file);
}

async function submitQuestionnaireForm({ questionnaire, values, pagePath, source, locale, honeypot, submittedAt, screenshotFile, setSubmitState, setErrorMessage, setRequestId, setScreenshotError, setValues }: {
  questionnaire: QuestionnaireConfig;
  values: Record<string, string>;
  pagePath: string;
  source: "feedback_section" | "feedback_discussion";
  locale: "fr" | "en";
  honeypot: string;
  submittedAt: number;
  screenshotFile: File | null;
  setSubmitState: (state: SubmitState) => void;
  setErrorMessage: (message: string | null) => void;
  setRequestId: (id: string | null) => void;
  setScreenshotError: (message: string | null) => void;
  setValues: (values: Record<string, string>) => void;
}) {
  try {
    const result = await submitFeedbackQuestionnaire({ questionnaire, values, pagePath, source, locale, honeypot, submittedAt, screenshotFile });
    setSubmitState("success");
    setRequestId(result.requestId);
    setScreenshotError(result.screenshotError);
    setValues(Object.fromEntries(questionnaire.fields.map((field) => [field.key, ""])));
  } catch (error) {
    setSubmitState("error");
    setErrorMessage(error instanceof Error ? error.message : locale === "fr" ? "Une erreur inattendue est survenue." : "An unexpected error occurred.");
  }
}

function QuestionnaireCardView({ questionnaire, locale, accentClasses, Icon, isLoaded, isSignedIn, returnPath, honeypot, setHoneypot, values, submitState, speech, similarFeedback, screenshotFile, screenshotPreview, screenshotError, serializedDescription, descriptionTooLong, requestId, errorMessage, handleSubmit, updateField, handleScreenshotChange, removeScreenshot }: {
  questionnaire: QuestionnaireConfig;
  locale: "fr" | "en";
  accentClasses: (typeof ACCENT_CLASSES)[QuestionnaireConfig["accent"]];
  Icon: QuestionnaireConfig["icon"];
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  returnPath: string;
  honeypot: string;
  setHoneypot: (value: string) => void;
  values: Record<string, string>;
  submitState: SubmitState;
  speech: ReturnType<typeof useSpeechRecognition>;
  similarFeedback: ReturnType<typeof findPotentiallySimilarFeedback>;
  screenshotFile: File | null;
  screenshotPreview: FeedbackScreenshotPreview | null;
  screenshotError: string | null;
  serializedDescription: string;
  descriptionTooLong: boolean;
  requestId: string | null;
  errorMessage: string | null;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  updateField: (fieldKey: string, value: string) => void;
  handleScreenshotChange: (event: ChangeEvent<HTMLInputElement>) => void;
  removeScreenshot: () => void;
}) {
  return <CmmCard tone="slate" variant="glass" size="lg" className={cn("scroll-mt-28 rounded-[1.75rem]", accentClasses.border)} header={<div className="flex items-center gap-3"><div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", accentClasses.border, accentClasses.bg)}><Icon className={cn("h-5 w-5", accentClasses.icon)} aria-hidden="true" /></div><div><p className="cmm-text-small font-semibold uppercase tracking-[0.2em] text-slate-100">{questionnaire.title[locale]}</p><p className={cn("mt-1 text-sm leading-relaxed", accentClasses.title)}>{questionnaire.intro[locale]}</p></div></div>}>
    <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden opacity-0" aria-hidden="true"><label htmlFor={`feedback-website-${questionnaire.id}`}>Website</label><input id={`feedback-website-${questionnaire.id}`} name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} /></div>
    {isLoaded && !isSignedIn ? <QuestionnaireSignInPrompt locale={locale} returnPath={returnPath} buttonClassName={accentClasses.button} /> : null}
    {isLoaded && isSignedIn ? <QuestionnaireCardForm questionnaire={questionnaire} locale={locale} values={values} submitState={submitState} speech={speech} similarFeedback={similarFeedback} screenshotFile={screenshotFile} screenshotPreview={screenshotPreview} screenshotError={screenshotError} serializedDescription={serializedDescription} descriptionTooLong={descriptionTooLong} requestId={requestId} errorMessage={errorMessage} accentButtonClassName={accentClasses.button} onSubmit={handleSubmit} onUpdateField={updateField} onScreenshotChange={handleScreenshotChange} onRemoveScreenshot={removeScreenshot} /> : null}
  </CmmCard>;
}

function QuestionnaireSignInPrompt({ locale, returnPath, buttonClassName }: { locale: "fr" | "en"; returnPath: string; buttonClassName: string }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
    <p className="text-sm font-medium text-slate-100">{locale === "fr" ? "Connecte-toi pour envoyer ce questionnaire." : "Sign in to submit this questionnaire."}</p>
    <p className="mt-1 text-sm leading-relaxed text-slate-300">{locale === "fr" ? "Après envoi, le retour est transmis à CleanMyMap pour examen." : "After submission, your feedback is sent to CleanMyMap for review."}</p>
    <CmmButton href={buildSignInRedirectHref(returnPath)} tone="secondary" variant="pill" className={cn("mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2", buttonClassName)}>
      {locale === "fr" ? "Se connecter" : "Sign in"}
    </CmmButton>
  </div>;
}
