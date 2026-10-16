import type { Locale } from "../feedback-section.shared";
import type { QuestionnaireConfig } from "./questionnaire-config";

export type FeedbackSubmissionSource = "feedback_section" | "feedback_discussion";

export type FeedbackSubmissionResult = {
  requestId: string | null;
};

export const FEEDBACK_DESCRIPTION_MAX_LENGTH = 3000;

export function isFeedbackDescriptionWithinLimit(description: string): boolean {
  return description.length <= FEEDBACK_DESCRIPTION_MAX_LENGTH;
}

export function formatQuestionnaireDescription(
  questionnaire: QuestionnaireConfig,
  values: Record<string, string>,
  pagePath: string,
  locale: Locale,
): string {
  const lines = [
    `Type: ${questionnaire.title[locale]}`,
    `Page: ${pagePath}`,
    "",
    ...questionnaire.fields.map((field) => {
      const value = values[field.key]?.trim() ?? "";
      return `${field.label[locale]}: ${value}`;
    }),
  ];

  return lines.join("\n");
}

export async function submitFeedbackQuestionnaire(params: {
  questionnaire: QuestionnaireConfig;
  values: Record<string, string>;
  pagePath: string;
  source: FeedbackSubmissionSource;
  locale: Locale;
  honeypot: string;
  submittedAt: number;
}): Promise<FeedbackSubmissionResult> {
  const questionnairePagePath = `${params.pagePath}#${params.questionnaire.id}`;
  const description = formatQuestionnaireDescription(
    params.questionnaire,
    params.values,
    questionnairePagePath,
    params.locale,
  );

  if (!isFeedbackDescriptionWithinLimit(description)) {
    throw new Error(
      params.locale === "fr"
        ? "Votre retour est trop long. Raccourcissez-le avant de l'envoyer."
        : "Your feedback is too long. Shorten it before sending.",
    );
  }

  const response = await fetch("/api/community/bug-reports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      reportType: params.questionnaire.id,
      title:
        params.values.subject?.trim() || params.questionnaire.title[params.locale],
      description,
      pagePath: questionnairePagePath,
      source: params.source,
      honeypot: params.honeypot,
      submittedAt: params.submittedAt,
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | { requestId?: unknown; error?: string; message?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      body?.message ??
        body?.error ??
        (params.locale === "fr"
          ? "Impossible d'envoyer le questionnaire."
          : "Unable to send the questionnaire."),
    );
  }

  return {
    requestId: typeof body?.requestId === "string" ? body.requestId : null,
  };
}
