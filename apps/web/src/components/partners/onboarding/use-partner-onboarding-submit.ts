import { useCallback, type Dispatch, type SetStateAction } from "react";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import {
  normalizePublicWebUrl,
  type ContributionType,
  type OrganizationType,
  type PartnerAvailabilitySlot,
  type PartnerCoverage,
  type PartnerScope,
} from "@/lib/partners/onboarding-types";
type SubmissionProps = {
  organizationName: string;
  organizationType: OrganizationType;
  partnerScope: PartnerScope;
  legalIdentity: string;
  coverage: PartnerCoverage;
  contributionTypes: ContributionType[];
  relayActions: string;
  availabilitySlots: PartnerAvailabilitySlot[];
  availabilityNote: string;
  contactName: string;
  contactChannel: string;
  contactDetails: string;
  motivation: string;
  publicWebsiteUrl: string;
  publicWebsiteConsent: boolean;
  honeypot: string;
  getFormStartedAt: () => number | null;
  markSubmissionSucceeded: (submittedAt: number) => void;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setContributionError: Dispatch<SetStateAction<string | null>>;
};

function validatePartnerOnboardingSubmission({
  partnerScope,
  coverage,
  availabilitySlots,
  contributionTypes,
  publicWebsiteUrl,
  publicWebsiteConsent,
}: Pick<SubmissionProps, "partnerScope" | "coverage" | "availabilitySlots" | "contributionTypes" | "publicWebsiteUrl" | "publicWebsiteConsent">) {
  const normalizedPublicWebsiteUrl = publicWebsiteUrl.trim();
  if (partnerScope === "local" && coverage.arrondissements.length === 0) {
    return { normalizedPublicWebsiteUrl, errorMessage: "Sélectionne au moins un arrondissement.", contributionError: null };
  }
  if (availabilitySlots.length === 0) {
    return { normalizedPublicWebsiteUrl, errorMessage: "Ajoute au moins un créneau de disponibilité.", contributionError: null };
  }
  if (availabilitySlots.some((slot) => slot.start >= slot.end)) {
    return { normalizedPublicWebsiteUrl, errorMessage: "Chaque créneau doit avoir une heure de début avant l'heure de fin.", contributionError: null };
  }
  if (contributionTypes.length === 0) {
    return { normalizedPublicWebsiteUrl, errorMessage: null, contributionError: "Sélectionnez au moins un type de contribution." };
  }
  if (normalizedPublicWebsiteUrl && !publicWebsiteConsent) {
    return { normalizedPublicWebsiteUrl, errorMessage: "Autorisez la publication du site web public pour continuer.", contributionError: null };
  }
  if (!normalizedPublicWebsiteUrl && publicWebsiteConsent) {
    return { normalizedPublicWebsiteUrl, errorMessage: "Renseignez un site web public avant d'autoriser sa publication.", contributionError: null };
  }
  if (normalizedPublicWebsiteUrl && !normalizePublicWebUrl(normalizedPublicWebsiteUrl)) {
    return { normalizedPublicWebsiteUrl, errorMessage: "Le site web doit être une URL HTTP(S) publique valide.", contributionError: null };
  }
  return { normalizedPublicWebsiteUrl, errorMessage: null, contributionError: null };
}

export function usePartnerOnboardingSubmit({
  organizationName,
  organizationType,
  partnerScope,
  legalIdentity,
  coverage,
  contributionTypes,
  relayActions,
  availabilitySlots,
  availabilityNote,
  contactName,
  contactChannel,
  contactDetails,
  motivation,
  publicWebsiteUrl,
  publicWebsiteConsent,
  honeypot,
  getFormStartedAt,
  markSubmissionSucceeded,
  setIsSubmitting,
  setMessage,
  setErrorMessage,
  setContributionError,
}: SubmissionProps) {
  const { acquire, release } = useSubmissionLock();

  return useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setMessage(null);
    if (!acquire()) {
      setErrorMessage("Une demande est déjà en cours. Réessayez dans un instant.");
      return;
    }

    const validation = validatePartnerOnboardingSubmission({
      partnerScope,
      coverage,
      availabilitySlots,
      contributionTypes,
      publicWebsiteUrl,
      publicWebsiteConsent,
    });
    if (validation.errorMessage || validation.contributionError) {
      if (validation.errorMessage) setErrorMessage(validation.errorMessage);
      if (validation.contributionError) setContributionError(validation.contributionError);
      release();
      return;
    }
    const { normalizedPublicWebsiteUrl } = validation;

    setContributionError(null);
    setIsSubmitting(true);

    try {
      const submittedAt = getFormStartedAt() ?? Date.now();
      const response = await fetch("/api/partners/onboarding-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName,
          organizationType,
          partnerScope,
          legalIdentity,
          coverage,
          contributionTypes,
          relayActions,
          availability: {
            slots: availabilitySlots,
            note: availabilityNote.trim() || undefined,
          },
          contactName,
          contactChannel,
          contactDetails,
          motivation,
          publicWebsiteUrl: normalizedPublicWebsiteUrl || undefined,
          publicWebsiteConsent,
          honeypot,
          submittedAt,
        }),
      });
      const payload = (await response.json()) as { requestId?: string; error?: string; message?: string };
      if (!response.ok) {
        setErrorMessage(payload.message ?? payload.error ?? "Impossible d'envoyer votre demande pour le moment. Veuillez vérifier vos informations ou réessayer plus tard.");
        return;
      }
      markSubmissionSucceeded(submittedAt);
      setMessage(`Demande envoyée à l'administration (ID ${payload.requestId ?? "n/a"}). Délai cible: 72h ouvrées.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Une erreur inattendue est survenue lors de l'envoi de votre formulaire. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
      release();
    }
  }, [acquire, availabilityNote, availabilitySlots, contactChannel, contactDetails, contactName, contributionTypes, coverage, getFormStartedAt, honeypot, legalIdentity, markSubmissionSucceeded, motivation, organizationName, organizationType, partnerScope, publicWebsiteConsent, publicWebsiteUrl, relayActions, release, setContributionError, setErrorMessage, setIsSubmitting, setMessage]);
}
