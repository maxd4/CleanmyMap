import type { Locale } from "../feedback-section.shared";
import type { QuestionnaireConfig } from "./questionnaire-config";
import { uploadFeedbackScreenshot } from "./feedback-screenshot-client";

export type FeedbackSubmissionSource = "feedback_section" | "feedback_discussion";

export type FeedbackSubmissionResult = {
  requestId: string | null;
  screenshot: "not_requested" | "uploaded" | "failed";
  screenshotError: string | null;
};

export const FEEDBACK_DESCRIPTION_MAX_LENGTH = 3000;
const FEEDBACK_TITLE_MAX_LENGTH = 160;

const TITLE_SOURCE_KEYS: Record<
  QuestionnaireConfig["id"],
  readonly string[]
> = {
  bug: ["context", "steps"],
  idea: ["proposal"],
  improvement: ["friction", "proposal"],
  collaboration: ["organization", "purpose"],
};

export function isFeedbackDescriptionWithinLimit(description: string): boolean {
  return description.length <= FEEDBACK_DESCRIPTION_MAX_LENGTH;
}

export function buildSuggestedFeedbackTitle(
  questionnaire: QuestionnaireConfig,
  values: Record<string, string>,
  locale: Locale,
): string {
  const editedTitle = values.subject?.trim();
  if (editedTitle) {
    return editedTitle.slice(0, FEEDBACK_TITLE_MAX_LENGTH);
  }

  const source = TITLE_SOURCE_KEYS[questionnaire.id]
    .map((key) => values[key]?.trim())
    .find(Boolean)
    ?.replace(/\s+/g, " ");
  if (!source) {
    return questionnaire.title[locale];
  }

  return `${questionnaire.title[locale]} — ${source}`.slice(
    0,
    FEEDBACK_TITLE_MAX_LENGTH,
  );
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
  screenshotFile?: File | null;
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
      title: buildSuggestedFeedbackTitle(
        params.questionnaire,
        params.values,
        params.locale,
      ),
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

  const requestId = typeof body?.requestId === "string" ? body.requestId : null;
  if (params.questionnaire.id !== "bug" || !params.screenshotFile) {
    return { requestId, screenshot: "not_requested", screenshotError: null };
  }

  try {
    if (!requestId) {
      throw new Error("La référence du signalement est absente.");
    }
    await uploadFeedbackScreenshot(requestId, params.screenshotFile);
    return { requestId, screenshot: "uploaded", screenshotError: null };
  } catch (error) {
    return {
      requestId,
      screenshot: "failed",
      screenshotError:
        error instanceof Error
          ? error.message
          : "La capture n'a pas pu être jointe au signalement.",
    };
  }
}
