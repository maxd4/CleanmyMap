import { ArrowRight } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";
import type { FeedbackScreenshotPreview } from "@/lib/community/feedback-screenshot-client";
import type { Locale } from "../feedback-section.shared";
import type { QuestionnaireConfig } from "./questionnaire-config";
import { FEEDBACK_DESCRIPTION_MAX_LENGTH } from "./feedback-submission";
import { QuestionnaireFields, QuestionnaireSpeechNotice, type QuestionnaireSpeechState } from "./questionnaire-card-fields";
import { QuestionnaireRecognitionNotice } from "./questionnaire-card-notices";
import { QuestionnaireScreenshotField } from "./questionnaire-card-screenshot";
import { QuestionnaireSubmissionStatus } from "./questionnaire-card-status";

type SubmitState = "idle" | "submitting" | "success" | "error";

type QuestionnaireCardFormProps = {
  questionnaire: QuestionnaireConfig;
  locale: Locale;
  values: Record<string, string>;
  submitState: SubmitState;
  speech: QuestionnaireSpeechState;
  similarFeedback: ReadonlyArray<{ id: string; title: string }>;
  screenshotFile: File | null;
  screenshotPreview: FeedbackScreenshotPreview | null;
  screenshotError: string | null;
  serializedDescription: string;
  descriptionTooLong: boolean;
  requestId: string | null;
  errorMessage: string | null;
  accentButtonClassName: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateField: (fieldKey: string, value: string) => void;
  onScreenshotChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveScreenshot: () => void;
};

export function QuestionnaireCardForm({
  questionnaire,
  locale,
  values,
  submitState,
  speech,
  similarFeedback,
  screenshotFile,
  screenshotPreview,
  screenshotError,
  serializedDescription,
  descriptionTooLong,
  requestId,
  errorMessage,
  accentButtonClassName,
  onSubmit,
  onUpdateField,
  onScreenshotChange,
  onRemoveScreenshot,
}: QuestionnaireCardFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {questionnaire.id !== "collaboration" ? <QuestionnaireRecognitionNotice locale={locale} /> : null}
      {questionnaire.id !== "collaboration" ? <QuestionnaireSpeechNotice locale={locale} speech={speech} /> : null}
      <div className="grid gap-3">
        {similarFeedback.length > 0 ? <SimilarFeedbackNotice locale={locale} similarFeedback={similarFeedback} /> : null}
        <QuestionnaireFields
          questionnaire={questionnaire}
          locale={locale}
          values={values}
          submitState={submitState}
          speech={speech}
          onUpdateField={onUpdateField}
        />
      </div>
      {questionnaire.id === "bug" ? (
        <QuestionnaireScreenshotField
          file={screenshotFile}
          preview={screenshotPreview}
          error={screenshotError}
          onChange={onScreenshotChange}
          onRemove={onRemoveScreenshot}
        />
      ) : null}
      {descriptionTooLong ? <DescriptionTooLongNotice locale={locale} length={serializedDescription.length} /> : null}
      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="cmm-text-caption text-slate-300">
          {locale === "fr" ? "Le retour est transmis à CleanMyMap pour examen." : "Your feedback is sent to CleanMyMap for review."}
        </p>
        <CmmButton
          type="submit"
          disabled={!canSubmitQuestionnaire(questionnaire, values, serializedDescription, submitState)}
          tone="primary"
          variant="pill"
          className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-55", accentButtonClassName)}
        >
          {submitState === "submitting" ? locale === "fr" ? "Envoi..." : "Sending..." : locale === "fr" ? "Envoyer" : "Send"}
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
  );
}

function SimilarFeedbackNotice({
  locale,
  similarFeedback,
}: {
  locale: Locale;
  similarFeedback: ReadonlyArray<{ id: string; title: string }>;
}) {
  return (
    <aside className="rounded-2xl border border-cyan-200/30 bg-cyan-500/10 px-4 py-3 text-slate-100" role="status">
      <p className="text-sm font-bold">{locale === "fr" ? "Des retours personnels semblent proches" : "Some of your feedback looks similar"}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-300">
        {locale === "fr" ? "Vérifiez vos retours précédents avant d'envoyer. Cette suggestion ne bloque pas la soumission." : "Check your previous feedback before sending. This suggestion does not block submission."}
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {similarFeedback.map((match) => <li key={match.id}><a href="/sections/feedback#mes-retours" className="font-semibold text-cyan-100 underline-offset-2 hover:underline">{match.title}</a></li>)}
      </ul>
    </aside>
  );
}

function DescriptionTooLongNotice({ locale, length }: { locale: Locale; length: number }) {
  return (
    <p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
      {locale === "fr"
        ? `Votre retour dépasse la limite de ${FEEDBACK_DESCRIPTION_MAX_LENGTH} caractères (${length}). Raccourcissez-le pour pouvoir l'envoyer.`
        : `Your feedback exceeds the ${FEEDBACK_DESCRIPTION_MAX_LENGTH}-character limit (${length}). Shorten it before sending.`}
    </p>
  );
}

function canSubmitQuestionnaire(
  questionnaire: QuestionnaireConfig,
  values: Record<string, string>,
  serializedDescription: string,
  submitState: SubmitState,
): boolean {
  return questionnaire.fields.every((field) => (values[field.key]?.trim() ?? "").length >= (field.minLength ?? 1)) &&
    serializedDescription.length <= FEEDBACK_DESCRIPTION_MAX_LENGTH &&
    submitState !== "submitting";
}
