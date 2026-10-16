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
import { ArrowRight, BadgeCheck, Mic, Square } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { cn } from "@/lib/utils";
import type { QuestionnaireConfig } from "./questionnaire-config";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";
import {
  FEEDBACK_DESCRIPTION_MAX_LENGTH,
  formatQuestionnaireDescription,
  buildSuggestedFeedbackTitle,
  submitFeedbackQuestionnaire,
} from "./feedback-submission";
import {
  fetchPersonalFeedbackPage,
} from "./feedback-history";
import type { PersonalFeedbackItem } from "@/lib/community/feedback-history-contract";
import { findPotentiallySimilarFeedback } from "@/lib/community/feedback-similarity";
import {
  FEEDBACK_SCREENSHOT_ACCEPT,
  validateFeedbackScreenshotFile,
} from "./feedback-screenshot-client";
import { useSpeechRecognition } from "./use-speech-recognition";

type SubmitState = "idle" | "submitting" | "success" | "error";

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
    () =>
      formatQuestionnaireDescription(
        questionnaire,
        values,
        questionnairePagePath,
        locale,
      ),
    [locale, questionnaire, questionnairePagePath, values],
  );
  const descriptionTooLong =
    serializedDescription.length > FEEDBACK_DESCRIPTION_MAX_LENGTH;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id || questionnaire.id === "collaboration") {
      return;
    }
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
    if (screenshotPreviewUrlRef.current) {
      URL.revokeObjectURL(screenshotPreviewUrlRef.current);
    }
  }, []);

  function replaceScreenshotFile(file: File | null) {
    if (screenshotPreviewUrlRef.current) {
      URL.revokeObjectURL(screenshotPreviewUrlRef.current);
    }
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
        [fieldKey]: existingValue
          ? `${existingValue} ${normalizedTranscript}`
          : normalizedTranscript,
      };
    });
  }

  const speech = useSpeechRecognition({
    locale,
    onFinalTranscript: appendSpeechTranscript,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

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
    if (typeof window === "undefined") {
      return `${pagePath}#${questionnaire.id}`;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("type", questionnaire.id);
    url.hash = questionnaire.id;
    return `${url.pathname}${url.search}${url.hash}`;
  })();
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
              ? "Après envoi, le retour est transmis à CleanMyMap pour examen."
              : "After submission, your feedback is sent to CleanMyMap for review."}
          </p>
          <CmmButton
            href={buildSignInRedirectHref(returnPath)}
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
          {questionnaire.id !== "collaboration" ? (
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-slate-700" role="note">
              <div className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    {locale === "fr" ? "Votre contribution peut être récompensée" : "Your contribution may be rewarded"}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">
                    {locale === "fr"
                      ? "Un bug ou une amélioration jugé pertinent par l'équipe CleanMyMap compte dans votre progression Amélioration du produit. Débloquez des badges et gagnez des XP en atteignant de nouveaux paliers."
                      : "A bug or improvement judged relevant by the CleanMyMap team counts toward your Product improvement progression. Unlock badges and earn XP by reaching new tiers."}
                  </p>
                  <CmmDisclosure
                    tone="amber"
                    size="sm"
                    className="mt-2"
                    summary={locale === "fr" ? "Conditions de reconnaissance" : "Recognition conditions"}
                  >
                    <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
                      <li>
                        {locale === "fr"
                          ? "Le retour doit être utile et suffisamment précis."
                          : "The feedback must be useful and sufficiently precise."}
                      </li>
                      <li>
                        {locale === "fr"
                          ? "La pertinence est validée par le compte autorisé max."
                          : "Relevance is reviewed by the authorized max account."}
                      </li>
                      <li>
                        {locale === "fr"
                          ? "Les doublons et les propositions non retenues ne comptent pas."
                          : "Duplicates and proposals that are not retained do not count."}
                      </li>
                      <li>
                        {locale === "fr"
                          ? "L'envoi seul ne garantit ni badge ni XP : les XP sont attribués aux paliers prévus par les règles actuelles."
                          : "Sending alone does not guarantee a badge or XP: XP is awarded at the tiers defined by the current rules."}
                      </li>
                    </ul>
                  </CmmDisclosure>
                  <CmmButton
                    href="/sections/gamification"
                    tone="secondary"
                    variant="pill"
                    className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl border border-amber-300/80 bg-white/70 px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                  >
                    {locale === "fr" ? "Découvrir les badges" : "Discover badges"}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </CmmButton>
                </div>
              </div>
            </div>
          ) : null}
          {questionnaire.id !== "collaboration" ? (
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-sm leading-relaxed text-slate-300">
                {locale === "fr"
                  ? "La dictée utilise la reconnaissance vocale du navigateur. Selon le navigateur, un fournisseur externe peut être utilisé ; aucun audio n'est enregistré par CleanMyMap."
                  : "Dictation uses your browser's speech recognition. Depending on the browser, an external provider may be used; CleanMyMap does not record audio."}
              </p>
              {speech.supportKnown && !speech.isSupported ? (
                <p className="text-sm text-amber-100" role="status">
                  {speech.unsupportedMessage}
                </p>
              ) : null}
              {speech.errorMessage ? (
                <p className="text-sm text-rose-100" role="alert">
                  {speech.errorMessage}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-3">
            {similarFeedback.length > 0 ? (
              <aside className="rounded-2xl border border-cyan-200/30 bg-cyan-500/10 px-4 py-3 text-slate-100" role="status">
                <p className="text-sm font-bold">
                  {locale === "fr"
                    ? "Des retours personnels semblent proches"
                    : "Some of your feedback looks similar"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  {locale === "fr"
                    ? "Vérifiez vos retours précédents avant d'envoyer. Cette suggestion ne bloque pas la soumission."
                    : "Check your previous feedback before sending. This suggestion does not block submission."}
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {similarFeedback.map((match) => (
                    <li key={match.id}>
                      <a
                        href={`/sections/feedback#mes-retours`}
                        className="font-semibold text-cyan-100 underline-offset-2 hover:underline"
                      >
                        {match.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}
            {questionnaire.fields.map((field) => {
              const fieldId = `feedback-${questionnaire.id}-${field.key}`;
              const canDictate = questionnaire.id !== "collaboration" && field.rows !== undefined;
              const fieldIsListening = speech.isListening && speech.activeFieldKey === field.key;

              return (
              <div key={field.key} className="block space-y-1.5">
                <label htmlFor={fieldId} className="block">
                <span className="cmm-text-caption font-semibold uppercase tracking-[0.14em] text-slate-200">
                  {field.label[locale]}
                </span>
                </label>
                <textarea
                  id={fieldId}
                  value={values[field.key] ?? ""}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  onFocus={() => speech.stopIfOtherField(field.key)}
                  placeholder={field.placeholder[locale]}
                  rows={field.rows ?? 2}
                  maxLength={800}
                  className="min-h-[88px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white placeholder:text-slate-400 focus:border-cyan-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                />
                {canDictate ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <CmmButton
                      type="button"
                      ariaLabel={fieldIsListening
                        ? locale === "fr" ? "Arrêter la dictée" : "Stop dictation"
                        : locale === "fr" ? "Dicter" : "Dictate"}
                      ariaControls={fieldId}
                      title={speech.supportKnown && !speech.isSupported ? speech.unsupportedMessage : undefined}
                      disabled={speech.isStopping || (speech.isListening
                        ? false
                        : !speech.supportKnown || !speech.isSupported || submitState === "submitting")}
                      onClick={() => {
                        if (fieldIsListening) {
                          speech.stop();
                        } else {
                          speech.start(field.key);
                        }
                      }}
                      tone="secondary"
                      variant="pill"
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {fieldIsListening ? <Square className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
                      {fieldIsListening
                        ? locale === "fr" ? "Arrêter" : "Stop"
                        : locale === "fr" ? "Dicter" : "Dictate"}
                    </CmmButton>
                    {fieldIsListening && speech.interimTranscript ? (
                      <p className="text-sm text-cyan-100" aria-live="polite">
                        {locale === "fr" ? "En cours : " : "In progress: "}
                        {speech.interimTranscript}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {field.helper ? (
                  <p className="cmm-text-caption text-slate-400">
                    {field.helper[locale]}
                  </p>
                ) : null}
              </div>
              );
            })}
          </div>

          {questionnaire.id === "bug" ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] text-slate-200">
                    Capture d&apos;écran (facultatif)
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    Ajoutez une image pour aider à comprendre le bug. JPEG, PNG ou WebP, 5 Mo maximum.
                  </p>
                </div>
                <label
                  htmlFor="feedback-bug-screenshot"
                  className="inline-flex min-h-10 cursor-pointer items-center rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-400/20 focus-within:outline-none focus-within:ring-2 focus-within:ring-rose-300/50"
                >
                  Choisir une image
                </label>
              </div>
              <input
                id="feedback-bug-screenshot"
                type="file"
                accept={FEEDBACK_SCREENSHOT_ACCEPT}
                onChange={(event) => handleScreenshotChange(event.target.files?.[0])}
                className="sr-only"
              />
              {screenshotFile && screenshotPreviewUrl ? (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/30 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshotPreviewUrl}
                    alt={`Aperçu de ${screenshotFile.name}`}
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">{screenshotFile.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {Math.ceil(screenshotFile.size / 1024)} Ko · aperçu local uniquement avant l&apos;envoi
                    </p>
                    <button
                      type="button"
                      className="mt-2 text-sm font-semibold text-rose-200 underline-offset-2 hover:underline"
                      onClick={() => {
                        replaceScreenshotFile(null);
                        setScreenshotError(null);
                      }}
                    >
                      Retirer la capture
                    </button>
                  </div>
                </div>
              ) : null}
              {screenshotError ? (
                <p className="mt-3 text-sm text-rose-100" role="alert">
                  {screenshotError}
                </p>
              ) : null}
            </div>
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
              {locale === "fr"
                ? "Le retour est transmis à CleanMyMap pour examen."
                : "Your feedback is sent to CleanMyMap for review."}
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
            <div
              className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50"
              role="status"
              aria-live="polite"
            >
              {questionnaire.success[locale]}
              {questionnaire.id !== "collaboration" ? (
                <span className="mt-1 block text-emerald-100/90">
                  {locale === "fr"
                    ? "Il sera examiné pour déterminer s'il peut être comptabilisé dans votre progression Amélioration du produit."
                    : "It will be reviewed to determine whether it can count toward your Product improvement progression."}
                </span>
              ) : null}
              {requestId ? (
                <span className="mt-1 block text-emerald-100/80">
                  {locale === "fr" ? "Référence" : "Reference"}: {requestId}
                </span>
              ) : null}
              <CmmButton
                href="/sections/feedback#mes-retours"
                tone="secondary"
                variant="pill"
                className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl border border-emerald-200/50 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-50 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60"
              >
                {locale === "fr" ? "Voir mes retours" : "View my feedback"}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </CmmButton>
              {screenshotError ? (
                <span className="mt-2 block text-amber-100" role="alert">
                  Le retour a été transmis, mais la capture n&apos;a pas pu être jointe : {screenshotError}
                </span>
              ) : null}
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
