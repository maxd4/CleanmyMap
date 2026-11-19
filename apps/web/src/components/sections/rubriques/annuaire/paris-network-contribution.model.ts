import { isSafeHttpUrl } from "@/lib/partners/paris-cleanwalk-network.channels";

export const PARIS_NETWORK_CONTRIBUTION_PREFIX = "Réseau cleanwalks Paris";
export const PARIS_NETWORK_CONTRIBUTION_PAGE_PATH =
  "/sections/annuaire#reseau-cleanwalks";
export const CONTRIBUTION_DESCRIPTION_MIN_LENGTH = 10;
export const CONTRIBUTION_PAYLOAD_MAX_LENGTH = 3000;
export const CONTRIBUTION_TITLE_MAX_LENGTH = 160;

export type ContributionInfoType =
  | ""
  | "structure"
  | "collaboration"
  | "action_commune"
  | "contact_public"
  | "materiel";

export const CONTRIBUTION_INFO_TYPE_LABELS: Record<
  Exclude<ContributionInfoType, "">,
  string
> = {
  structure: "Structure ou collectif",
  collaboration: "Collaboration ou partenariat",
  action_commune: "Action commune",
  contact_public: "Contact professionnel public",
  materiel: "Disponibilité de matériel",
};

export interface ContributionPayload {
  reportType: "idea";
  source: "feedback_section";
  title: string;
  description: string;
  pagePath: typeof PARIS_NETWORK_CONTRIBUTION_PAGE_PATH;
  honeypot: string;
  submittedAt: number;
}

export function validateAndBuildContributionPayload(input: {
  message: string;
  infoType: ContributionInfoType;
  proofUrl: string;
  honeypot: string;
  submittedAt: number;
  fr: boolean;
}): { ok: true; payload: ContributionPayload } | { ok: false; error: string } {
  const trimmedMessage = input.message.trim();
  if (trimmedMessage.length < CONTRIBUTION_DESCRIPTION_MIN_LENGTH) {
    return {
      ok: false,
      error: input.fr
        ? `Merci de décrire votre proposition en au moins ${CONTRIBUTION_DESCRIPTION_MIN_LENGTH} caractères.`
        : `Please describe your suggestion in at least ${CONTRIBUTION_DESCRIPTION_MIN_LENGTH} characters.`,
    };
  }

  const trimmedUrl = input.proofUrl.trim();
  if (trimmedUrl.length > 0 && !isSafeHttpUrl(trimmedUrl)) {
    return {
      ok: false,
      error: input.fr
        ? "L'URL justificative doit commencer par https:// ou http://."
        : "The supporting URL must start with https:// or http://.",
    };
  }

  const typeLabel = input.infoType
    ? CONTRIBUTION_INFO_TYPE_LABELS[input.infoType]
    : null;

  const title = (
    typeLabel
      ? `${PARIS_NETWORK_CONTRIBUTION_PREFIX} — ${typeLabel}`
      : `${PARIS_NETWORK_CONTRIBUTION_PREFIX} — Proposition citoyenne`
  ).slice(0, CONTRIBUTION_TITLE_MAX_LENGTH);

  const lines = [
    typeLabel ? `Type d'information : ${typeLabel}` : "Type d'information : Non précisé",
    trimmedUrl ? `URL justificative : ${trimmedUrl}` : "URL justificative : Non fournie",
    "",
    trimmedMessage,
  ];
  const description = lines.join("\n");

  if (description.length > CONTRIBUTION_PAYLOAD_MAX_LENGTH) {
    return {
      ok: false,
      error: input.fr
        ? "Votre proposition dépasse la taille maximale autorisée (3 000 caractères)."
        : "Your suggestion exceeds the maximum allowed length (3,000 characters).",
    };
  }

  return {
    ok: true,
    payload: {
      reportType: "idea",
      source: "feedback_section",
      title,
      description,
      pagePath: PARIS_NETWORK_CONTRIBUTION_PAGE_PATH,
      honeypot: input.honeypot,
      submittedAt: input.submittedAt,
    },
  };
}

export async function submitParisNetworkContribution(
  payload: ContributionPayload,
  fr: boolean,
): Promise<{ requestId: string | null }> {
  const response = await fetch("/api/community/bug-reports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as
    | { requestId?: unknown; error?: string; message?: string }
    | null;

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        fr
          ? "Connexion requise pour envoyer une contribution."
          : "Sign in required to submit a contribution.",
      );
    }
    throw new Error(
      body?.message ??
        body?.error ??
        (fr
          ? "Impossible d'enregistrer votre proposition pour le moment."
          : "Unable to save your suggestion right now."),
    );
  }

  return {
    requestId: typeof body?.requestId === "string" ? body.requestId : null,
  };
}
