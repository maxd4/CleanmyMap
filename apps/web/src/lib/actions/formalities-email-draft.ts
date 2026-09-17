import type { ActionFormality } from "./formalities-qualification";

export type FormalitiesEmailActionData = {
  title?: string | null;
  description?: string | null;
  location?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  participantCount?: number | null;
  organizerName?: string | null;
};

export type ReviewableFormalityEmailDraft = {
  to: string;
  subject: string;
  body: string;
  requiresReview: true;
  sent: false;
};

function isMeaningful(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function buildReviewableFormalityEmailDraft(params: {
  formality: ActionFormality;
  action: FormalitiesEmailActionData;
}): ReviewableFormalityEmailDraft | null {
  const channel = params.formality.officialChannel;
  if (channel?.kind !== "official_email" || !isMeaningful(channel.emailAddress)) {
    return null;
  }

  const action = params.action;
  const lines = [
    "Bonjour,",
    "",
    "Je souhaite vous soumettre une demande concernant l’action suivante :",
    isMeaningful(action.title) ? `Titre : ${action.title.trim()}` : null,
    isMeaningful(action.description) ? `Description : ${action.description.trim()}` : null,
    isMeaningful(action.location) ? `Lieu : ${action.location.trim()}` : null,
    isMeaningful(action.date) ? `Date : ${action.date.trim()}` : null,
    isMeaningful(action.startTime) ? `Début : ${action.startTime.trim()}` : null,
    isMeaningful(action.endTime) ? `Fin : ${action.endTime.trim()}` : null,
    typeof action.participantCount === "number" && Number.isFinite(action.participantCount)
      ? `Participants prévus : ${action.participantCount}`
      : null,
    isMeaningful(action.organizerName)
      ? `Organisateur : ${action.organizerName.trim()}`
      : null,
    "",
    "Merci de m’indiquer la procédure et les pièces complémentaires éventuellement nécessaires.",
    "",
    "Cordialement,",
  ].filter((line): line is string => line !== null);

  return {
    to: channel.emailAddress.trim(),
    subject: isMeaningful(action.title)
      ? `Demande concernant ${action.title.trim()}`
      : "Demande concernant une action",
    body: lines.join("\n"),
    requiresReview: true,
    sent: false,
  };
}
