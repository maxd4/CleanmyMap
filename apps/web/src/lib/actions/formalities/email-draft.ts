import type { ActionFormality } from "./qualification";

export type FormalitiesEmailActionData = {
  title?: string | null;
  description?: string | null;
  location?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  participantCount?: number | null;
  organizerName?: string | null;
  contactAreaMode?: "single_location" | "route_or_area" | "unknown";
  contactArrondissementCode?: string | null;
};

export type FormalitiesEmailPurpose = "participatory_cleaning" | "collaboration";

export type ReviewableFormalityEmailDraft = {
  to: string;
  subject: string;
  body: string;
  requiresReview: true;
  sent: false;
};

export type FormalitiesEmailActionFormInput = {
  actionTitle?: string | null;
  shortDescription?: string | null;
  locationLabel?: string | null;
  departureLocationLabel?: string | null;
  actionDate?: string | null;
  eventStartTime?: string | null;
  eventEndTime?: string | null;
  departureTime?: string | null;
  meetingTime?: string | null;
  volunteersCount?: string | null;
  organizerName?: string | null;
  associationName?: string | null;
  actorName?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  operationalRoute?: unknown;
  interventionMode?: { mode?: string } | null;
  formalitiesContext?: { territory?: { arrondissement?: { code?: string } | null } } | null;
};

function isMeaningful(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseOptionalCount(value: string | null | undefined): number | null {
  if (!isMeaningful(value)) return null;
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : null;
}

export function buildFormalitiesEmailActionDataFromForm(
  form: FormalitiesEmailActionFormInput,
): FormalitiesEmailActionData {
  const hasCoordinates = isMeaningful(form.latitude) && isMeaningful(form.longitude);
  const isRouteOrArea = Boolean(form.operationalRoute) || form.interventionMode?.mode === "itinerary";

  return {
    title: form.actionTitle ?? null,
    description: form.shortDescription ?? null,
    location: form.departureLocationLabel || form.locationLabel || null,
    date: form.actionDate ?? null,
    startTime: form.eventStartTime || form.departureTime || form.meetingTime || null,
    endTime: form.eventEndTime ?? null,
    participantCount: parseOptionalCount(form.volunteersCount),
    organizerName: form.organizerName || form.associationName || form.actorName || null,
    contactAreaMode: isRouteOrArea ? "route_or_area" : hasCoordinates ? "single_location" : "unknown",
    contactArrondissementCode: form.formalitiesContext?.territory?.arrondissement?.code ?? null,
  };
}

export function buildReviewableFormalityEmailDraft(params: {
  formality: ActionFormality;
  action: FormalitiesEmailActionData;
  purpose?: FormalitiesEmailPurpose;
  contactScope?: string;
  verifiedRecipientEmail?: string;
}): ReviewableFormalityEmailDraft | null {
  const channel = params.formality.officialChannel;
  const recipientEmail = params.verifiedRecipientEmail ??
    (channel?.kind === "official_email" ? channel.emailAddress : null);
  if (!isMeaningful(recipientEmail)) {
    return null;
  }

  const action = params.action;
  const lines = [
    "Bonjour,",
    "",
    params.purpose === "participatory_cleaning"
      ? "Je vous contacte au sujet du nettoyage participatif suivant :"
      : params.purpose === "collaboration"
        ? "Je vous propose d’échanger au sujet de l’action suivante :"
        : "Je souhaite vous soumettre une demande concernant l’action suivante :",
    isMeaningful(action.title) ? `Titre : ${action.title.trim()}` : null,
    isMeaningful(action.description) ? `Description : ${action.description.trim()}` : null,
    isMeaningful(action.location) ? `Lieu : ${action.location.trim()}` : null,
    isMeaningful(params.contactScope) ? `Secteur concerné par ce contact : ${params.contactScope.trim()}` : null,
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
    params.purpose === "participatory_cleaning"
      ? "Pourriez-vous nous indiquer si des gants et des sacs peuvent être fournis sur demande, ainsi que des cendriers de poche selon disponibilité, et confirmer la prise en charge des déchets ?"
      : params.purpose === "collaboration"
        ? "Seriez-vous intéressés par une coorganisation ou un relais de cette action, selon vos possibilités ? Si pertinent, pourriez-vous préciser si vous pouvez fournir du matériel ? Aucun engagement n’est présumé."
        : "Merci de m’indiquer la procédure et les pièces complémentaires éventuellement nécessaires.",
    ...(params.purpose === "participatory_cleaning" ? [
      "Matériel et quantités souhaités : [à préciser]",
      "Point de reprise souhaité : [à préciser, sous réserve de votre accord]",
      "Horaire de reprise souhaité : [à préciser, sous réserve de votre accord]",
      "Flux et volumes prévus : [à préciser]",
      "Merci de confirmer les flux acceptés, le tri, le conditionnement et le lieu et horaire de reprise autorisés.",
    ] : []),
    "",
    "Cordialement,",
  ].filter((line): line is string => line !== null);

  return {
    to: recipientEmail.trim(),
    subject: params.purpose === "participatory_cleaning"
      ? isMeaningful(action.title)
        ? `Nettoyage participatif — ${action.title.trim()}`
        : "Nettoyage participatif à Paris"
      : params.purpose === "collaboration"
        ? isMeaningful(action.title) ? `Proposition de collaboration : ${action.title.trim()}` : "Proposition de collaboration pour un nettoyage participatif"
      : isMeaningful(action.title)
        ? `Demande concernant ${action.title.trim()}`
        : "Demande concernant une action",
    body: lines.join("\n"),
    requiresReview: true,
    sent: false,
  };
}
